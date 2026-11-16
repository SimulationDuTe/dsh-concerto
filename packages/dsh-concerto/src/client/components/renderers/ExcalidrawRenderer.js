import React from 'react'
import { h, API, styles, saveViewObjectUserLayout, useHostTheme, readCanvasViewport, writeCanvasViewport } from '../../api.js'
import { approxLineWidth, layoutDiagram, layoutMindmapTree, parseMarkdownToMindmap, objectToExcalidrawScene, STATUS_TOKENS } from '../../../../lib/domain/view_layout.mjs'
import { downloadTextFile, exportSvgElement, exportPngFromSvgElement } from './exportUtils.js'

let cachedRoughPromise = null
function loadRoughModule() {
  if (!cachedRoughPromise) {
    cachedRoughPromise = import(/* webpackIgnore: true */ API + '/assets/rough.js')
      .then((mod) => mod?.default || mod?.rough || mod)
      .catch(() => null)
  }
  return cachedRoughPromise
}

function buildSketchySvgBox(x, y, w, hBox) {
  return `M ${x + 3} ${y + 1} C ${x + w * 0.35} ${y - 1}, ${x + w * 0.7} ${y + 2}, ${x + w - 2} ${y + 1} ` +
    `C ${x + w + 1} ${y + hBox * 0.4}, ${x + w - 1} ${y + hBox * 0.7}, ${x + w - 2} ${y + hBox - 1} ` +
    `C ${x + w * 0.65} ${y + hBox + 1}, ${x + w * 0.3} ${y + hBox - 1}, ${x + 2} ${y + hBox} ` +
    `C ${x - 1} ${y + hBox * 0.65}, ${x + 1} ${y + hBox * 0.3}, ${x + 3} ${y + 1}`
}

function resolvedStatusColor(status, theme) {
  switch (status) {
    case 'done':
    case 'completed': return theme.done
    case 'running':
    case 'in_progress': return theme.accent
    case 'attention':
    case 'waiting_approval':
    case 'waiting_input':
    case 'cancelling': return theme.warn
    case 'review': return theme.review
    case 'blocked':
    case 'failed': return theme.error
    case 'unknown': return theme.textSecondary
    default: return theme.borderStrong
  }
}

function statusCssVar(status) {
  switch (status) {
    case 'done':
    case 'completed': return 'var(--cc-state-done)'
    case 'running':
    case 'in_progress': return 'var(--cc-state-running)'
    case 'attention':
    case 'waiting_approval':
    case 'waiting_input':
    case 'cancelling': return 'var(--cc-state-attention)'
    case 'review': return 'var(--cc-state-review)'
    case 'blocked':
    case 'failed': return 'var(--cc-state-blocked)'
    case 'unknown': return 'var(--cc-state-unknown)'
    default: return 'var(--cc-border-strong)'
  }
}

function edgeAppearance(semantic) {
  if (semantic === 'blocked') return { stroke: 'var(--cc-state-blocked)', width: 1.8, dash: '6 4', markerSuffix: '-blocked' }
  if (semantic === 'unknown') return { stroke: 'var(--cc-state-unknown)', width: 1.8, dash: '6 4', markerSuffix: '-unknown' }
  if (semantic === 'critical') return { stroke: 'var(--cc-accent)', width: 2.2, dash: undefined, markerSuffix: '-crit' }
  return { stroke: 'var(--cc-border-strong)', width: 1.5, dash: undefined, markerSuffix: '' }
}

const EXCALIDRAW_SYNC_EVENT = 'concerto:excalidraw-user-layout'

export function ExcalidrawRenderer({ object, sessionId, inModal = false }) {
  const hostTheme = useHostTheme()
  const persistedOffsets = object?.userLayout?.offsets || {}
  const persistedLabels = object?.userLayout?.labelOverrides || {}
  const persistedNotes = Array.isArray(object?.userLayout?.annotations) ? object.userLayout.annotations : []
  const initialVp = React.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id])

  const [userOffsets, setUserOffsets] = React.useState(() => persistedOffsets)
  const [labelOverrides, setLabelOverrides] = React.useState(() => persistedLabels)
  const [annotations, setAnnotations] = React.useState(() => persistedNotes)
  const [userLayoutVer, setUserLayoutVer] = React.useState(() => object?.userLayout?.version ?? 0)
  const [editingNodeId, setEditingNodeId] = React.useState('')
  const [editingDraft, setEditingDraft] = React.useState('')
  const [addingNote, setAddingNote] = React.useState(false)
  const [noteDraft, setNoteDraft] = React.useState('')
  const [pendingMergeObj, setPendingMergeObj] = React.useState(null)
  const [appliedObj, setAppliedObj] = React.useState(object)
  const [zoom, setZoom] = React.useState(() => initialVp.scale || 1)
  const [pan, setPan] = React.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }))
  const [roughApi, setRoughApi] = React.useState(null)
  const [saveNote, setSaveNote] = React.useState('')

  const activeDragRef = React.useRef(null)
  const svgRef = React.useRef(null)
  const roughOverlayRef = React.useRef(null)
  const instanceIdRef = React.useRef(Math.random().toString(36).slice(2))
  const isActivelyEditing = Boolean(editingNodeId) || addingNote || inModal

  const broadcastUserLayer = React.useCallback((nextOffsets, nextLabels, nextNotes, version, viewport) => {
    if (typeof window === 'undefined' || !object?.id) return
    try {
      window.dispatchEvent(new CustomEvent(EXCALIDRAW_SYNC_EVENT, {
        detail: {
          source: instanceIdRef.current,
          sessionId: sessionId || '',
          objectId: object.id,
          offsets: nextOffsets,
          labelOverrides: nextLabels,
          annotations: nextNotes,
          version,
          viewport,
        },
      }))
    } catch {}
  }, [sessionId, object?.id])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !object?.id) return
    const onSync = (ev) => {
      const d = ev?.detail
      if (!d || d.source === instanceIdRef.current) return
      if (d.sessionId !== (sessionId || '') || d.objectId !== object.id) return
      if (d.offsets) setUserOffsets(d.offsets)
      if (d.labelOverrides) setLabelOverrides(d.labelOverrides)
      if (Array.isArray(d.annotations)) setAnnotations(d.annotations)
      if (typeof d.version === 'number') setUserLayoutVer(d.version)
      if (d.viewport) {
        setZoom(d.viewport.scale || 1)
        setPan({ x: d.viewport.panX || 0, y: d.viewport.panY || 0 })
      }
    }
    window.addEventListener(EXCALIDRAW_SYNC_EVENT, onSync)
    return () => window.removeEventListener(EXCALIDRAW_SYNC_EVENT, onSync)
  }, [sessionId, object?.id])

  React.useEffect(() => {
    const vp = readCanvasViewport(sessionId, object?.id)
    setZoom(vp.scale || 1)
    setPan({ x: vp.panX || 0, y: vp.panY || 0 })
  }, [sessionId, object?.id])

  const updateViewport = React.useCallback((nextZoom, nextPan) => {
    setZoom(nextZoom)
    setPan(nextPan)
    writeCanvasViewport(sessionId, object?.id, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y })
  }, [sessionId, object?.id])

  React.useEffect(() => {
    if (!object) return
    if (object.id !== appliedObj?.id) {
      setAppliedObj(object)
      setPendingMergeObj(null)
      setUserOffsets(object.userLayout?.offsets || {})
      setLabelOverrides(object.userLayout?.labelOverrides || {})
      setAnnotations(Array.isArray(object.userLayout?.annotations) ? object.userLayout.annotations : [])
      setUserLayoutVer(object.userLayout?.version ?? 0)
      return
    }
    if (object.version !== appliedObj?.version) {
      if (isActivelyEditing) {
        setPendingMergeObj(object)
      } else {
        setAppliedObj(object)
      }
    }
    const serverUserVer = object.userLayout?.version ?? 0
    if (serverUserVer > userLayoutVer && !isActivelyEditing) {
      setUserOffsets(object.userLayout?.offsets || {})
      setLabelOverrides(object.userLayout?.labelOverrides || {})
      setAnnotations(Array.isArray(object.userLayout?.annotations) ? object.userLayout.annotations : [])
      setUserLayoutVer(serverUserVer)
    }
  }, [object?.id, object?.version, object?.userLayout?.version, isActivelyEditing])

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    let cancelled = false
    loadRoughModule().then((mod) => { if (!cancelled && mod?.svg) setRoughApi(mod) })
    return () => { cancelled = true }
  }, [])

  const currentObj = appliedObj || object
  const sceneElements = currentObj?.data?.excalidrawScene?.elements
  const layout = React.useMemo(() => {
    const fontSize = Math.max(12, hostTheme.fontSize - 1)
    if (Array.isArray(sceneElements)) {
      const visible = sceneElements.filter((el) => el && !el.isDeleted)
      const rects = visible.filter((el) => el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond')
      const texts = visible.filter((el) => el.type === 'text')
      const arrows = visible.filter((el) => el.type === 'arrow' || el.type === 'line')
      const supportedTypes = new Set(['rectangle', 'ellipse', 'diamond', 'text', 'arrow', 'line'])
      const omittedTypes = visible.filter((el) => !supportedTypes.has(el.type)).map((el) => String(el.type || 'unknown'))
      const nodes = rects.map((r, idx) => {
        const boundText = texts.find((t) => t.containerId === r.id)
        const baseLabel = boundText?.text || r.customData?.label || r.id
        const off = userOffsets[r.id] || { dx: 0, dy: 0 }
        return {
          id: r.id,
          shape: r.type,
          label: labelOverrides[r.id] || baseLabel,
          lines: [labelOverrides[r.id] || baseLabel],
          x: Math.round((r.x || 40 * (idx + 1)) + (off.dx || 0)),
          y: Math.round((r.y || 40) + (off.dy || 0)),
          width: Math.max(84, Math.round(r.width || 136)),
          height: Math.max(38, Math.round(r.height || 52)),
          status: r.customData?.status,
          critical: Boolean(r.customData?.critical),
        }
      })
      const freeTexts = texts
        .filter((t) => !t.containerId && typeof t.text === 'string' && t.text.trim())
        .map((t, idx) => ({
          id: t.id || 'ft-' + idx,
          x: Math.round(t.x || 24),
          y: Math.round((t.y || 24) + 14),
          text: t.text,
        }))
      const edges = arrows.map((a) => {
        const fromNode = nodes.find((n) => n.id === a.startBinding?.elementId)
        const toNode = nodes.find((n) => n.id === a.endBinding?.elementId)
        const pts = Array.isArray(a.points) && a.points.length >= 2 ? a.points : [[0, 0], [80, 0]]
        const x1 = fromNode ? fromNode.x + fromNode.width : Math.round((a.x || 0) + pts[0][0])
        const y1 = fromNode ? fromNode.y + fromNode.height / 2 : Math.round((a.y || 0) + pts[0][1])
        const x2 = toNode ? toNode.x : Math.round((a.x || 0) + pts[pts.length - 1][0])
        const y2 = toNode ? toNode.y + toNode.height / 2 : Math.round((a.y || 0) + pts[pts.length - 1][1])
        const isErr = a.customData?.kind === 'error' || toNode?.status === 'blocked' || toNode?.status === 'failed'
        const isUnk = a.customData?.kind === 'unknown' || toNode?.status === 'unknown'
        const semantic = isErr ? 'blocked' : (isUnk ? 'unknown' : (a.customData?.critical || toNode?.critical ? 'critical' : 'default'))
        return { x1, y1, x2, y2, midX: Math.round((x1 + x2) / 2), midY: Math.round((y1 + y2) / 2), label: a.customData?.label, semantic }
      })
      const width = Math.max(360, ...nodes.map((n) => n.x + n.width + 40), ...freeTexts.map((t) => t.x + 120))
      const height = Math.max(200, ...nodes.map((n) => n.y + n.height + 40), ...freeTexts.map((t) => t.y + 40))
      return { nodes, edges, freeTexts, omittedTypes, width, height }
    }
    if (currentObj?.type === 'mindmap') {
      const mm = layoutMindmapTree(currentObj.data?.root || parseMarkdownToMindmap(currentObj.data?.markdown), new Set(), { fontSize })
      return {
        nodes: mm.nodes.map((n) => {
          const off = userOffsets[n.id] || { dx: 0, dy: 0 }
          return { ...n, label: labelOverrides[n.id] || n.label, x: n.x + (off.dx || 0), y: n.y + (off.dy || 0) }
        }),
        edges: mm.edges.map((e) => ({ ...e, semantic: e.status === 'blocked' || e.status === 'failed' ? 'blocked' : (e.status === 'unknown' ? 'unknown' : 'default') })),
        freeTexts: [],
        omittedTypes: [],
        width: mm.width,
        height: mm.height,
      }
    }
    const base = layoutDiagram(currentObj?.data, { fontSize })
    const positioned = new Map()
    const nodes = base.nodes.map((n) => {
      const off = userOffsets[n.id] || { dx: 0, dy: 0 }
      const item = { ...n, label: labelOverrides[n.id] || n.label, x: n.x + (off.dx || 0), y: n.y + (off.dy || 0) }
      positioned.set(item.id, item)
      return item
    })
    const edges = base.edges.map((e) => {
      const from = positioned.get(e.from)
      const to = positioned.get(e.to)
      if (!from || !to) return e
      const x1 = from.x + from.width
      const y1 = from.y + from.height / 2
      const x2 = to.x
      const y2 = to.y + to.height / 2
      return { ...e, x1, y1, x2, y2, midX: Math.round((x1 + x2) / 2), midY: Math.round((y1 + y2) / 2) }
    })
    return {
      nodes,
      edges,
      freeTexts: [],
      omittedTypes: [],
      width: Math.max(340, ...nodes.map((n) => n.x + n.width + 40)),
      height: Math.max(190, ...nodes.map((n) => n.y + n.height + 40)),
    }
  }, [currentObj, sceneElements, userOffsets, labelOverrides, hostTheme.fontSize])

  // Re-draw rough.js strokes with resolved host theme colors whenever nodes or hostTheme change
  React.useEffect(() => {
    const group = roughOverlayRef.current
    const svg = svgRef.current
    if (!group || !svg || !roughApi?.svg) return
    while (group.firstChild) group.removeChild(group.firstChild)
    const rc = roughApi.svg(svg)
    for (const n of layout.nodes) {
      const strokeColor = n.critical ? hostTheme.accent : resolvedStatusColor(n.status, hostTheme)
      const opts = {
        roughness: 1.05,
        stroke: strokeColor,
        strokeWidth: n.critical ? 2 : 1.5,
        fill: hostTheme.bgLayer2,
        fillStyle: 'solid',
        seed: (String(n.id).length * 17 + 7) % 997,
      }
      let sketchShape
      if (n.shape === 'ellipse') {
        sketchShape = rc.ellipse(n.x + n.width / 2, n.y + n.height / 2, n.width, n.height, opts)
      } else if (n.shape === 'diamond') {
        sketchShape = rc.polygon([
          [n.x + n.width / 2, n.y],
          [n.x + n.width, n.y + n.height / 2],
          [n.x + n.width / 2, n.y + n.height],
          [n.x, n.y + n.height / 2],
        ], opts)
      } else {
        sketchShape = rc.rectangle(n.x, n.y, n.width, n.height, opts)
      }
      group.appendChild(sketchShape)
    }
  }, [roughApi, layout.nodes, hostTheme])

  async function persistUserLayer(nextOffsets, nextLabels, nextNotes, reset = false, nextViewport = null) {
    broadcastUserLayer(nextOffsets, nextLabels, nextNotes, undefined, nextViewport)
    if (!sessionId || !currentObj?.id) return
    try {
      const res = await saveViewObjectUserLayout(sessionId, {
        id: currentObj.id,
        expectedUserVersion: userLayoutVer,
        offsets: nextOffsets,
        labelOverrides: nextLabels,
        annotations: nextNotes,
        reset,
      })
      if (res?.ok && res.userLayout) {
        setUserLayoutVer(res.userLayout.version)
        setSaveNote('已保存布局 v' + res.userLayout.version)
        broadcastUserLayer(nextOffsets, nextLabels, nextNotes, res.userLayout.version, nextViewport)
      }
    } catch {
      // Static mock harness without /view-objects/user-layout stays local
    }
  }

  function startNodeDrag(node, e) {
    e.stopPropagation()
    const baseOff = userOffsets[node.id] || { dx: 0, dy: 0 }
    activeDragRef.current = { kind: 'node', id: node.id, startX: e.clientX, startY: e.clientY, dx0: baseOff.dx, dy0: baseOff.dy }
  }

  function startPanDrag(e) {
    activeDragRef.current = { kind: 'pan', x0: e.clientX - pan.x, y0: e.clientY - pan.y }
  }

  function onMouseMove(e) {
    const drag = activeDragRef.current
    if (!drag) return
    if (drag.kind === 'node') {
      const dx = drag.dx0 + Math.round((e.clientX - drag.startX) / zoom)
      const dy = drag.dy0 + Math.round((e.clientY - drag.startY) / zoom)
      setUserOffsets((prev) => ({ ...prev, [drag.id]: { dx, dy } }))
    } else if (drag.kind === 'pan') {
      updateViewport(zoom, { x: e.clientX - drag.x0, y: e.clientY - drag.y0 })
    }
  }

  function onMouseUp() {
    const drag = activeDragRef.current
    activeDragRef.current = null
    if (drag?.kind === 'node') {
      persistUserLayer(userOffsets, labelOverrides, annotations)
    }
  }

  function fitView() {
    updateViewport(1, { x: 0, y: 0 })
  }

  function resetLayout() {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('将清除你拖动的位置、改字和批注，确定重置？')) return
    }
    setUserOffsets({})
    setLabelOverrides({})
    setAnnotations([])
    updateViewport(1, { x: 0, y: 0 })
    persistUserLayer({}, {}, [], true, { scale: 1, panX: 0, panY: 0 })
  }

  function commitNodeLabel() {
    if (!editingNodeId) return
    const trimmed = editingDraft.trim()
    const nextLabels = trimmed
      ? { ...labelOverrides, [editingNodeId]: trimmed }
      : labelOverrides
    setLabelOverrides(nextLabels)
    setEditingNodeId('')
    persistUserLayer(userOffsets, nextLabels, annotations)
  }

  function commitAnnotation() {
    const text = noteDraft.trim()
    if (!text) return
    const nextNotes = [...annotations, { id: 'note-' + Date.now(), x: 24 + (annotations.length * 30) % 160, y: Math.max(20, layout.height - 56), text }]
    setAnnotations(nextNotes)
    setAddingNote(false)
    setNoteDraft('')
    persistUserLayer(userOffsets, labelOverrides, nextNotes)
  }

  function exportExcalidraw() {
    const exported = objectToExcalidrawScene(currentObj, { userOffsets })
    downloadTextFile(`${currentObj.id || 'whiteboard'}.excalidraw`, JSON.stringify(exported, null, 2), 'application/json')
  }

  const markerId = 'excalidraw-arrow-' + String(currentObj.id || 'board').replace(/[^a-zA-Z0-9_-]/g, '') + (inModal ? '-m' : '')
  const nodeCount = layout.nodes.length
  const omittedUnique = [...new Set(layout.omittedTypes || [])]
  const summaryText = `${nodeCount} 元素 · ${layout.edges.length} 连线` + (saveNote ? ' · ' + saveNote : '')

  const zoomOutBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '缩小',
    title: '缩小',
    onClick: () => updateViewport(Math.max(0.5, Number((zoom - 0.15).toFixed(2))), pan),
  }, iconOnly ? '−' : '缩小')

  const zoomInBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '放大',
    title: '放大',
    onClick: () => updateViewport(Math.min(2.4, Number((zoom + 0.15).toFixed(2))), pan),
  }, iconOnly ? '+' : '放大')

  const fitBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '适应窗口',
    title: '适应窗口',
    onClick: fitView,
  }, iconOnly ? '⊡' : '适应窗口')

  return h('div', {
    'data-concerto-renderer-root': 'excalidraw',
    style: inModal ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined,
  },
  inModal && h('div', { className: 'concerto-canvas-bar' },
    h('span', { className: 'concerto-num' }, summaryText),
    h('div', { className: 'concerto-canvas-btns' },
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => { setAddingNote(true); setNoteDraft('待确认边界') } }, '添加批注'),
      zoomOutBtn(false),
      zoomInBtn(false),
      fitBtn(false),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: resetLayout }, '重置布局'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: exportExcalidraw }, '导出 .excalidraw'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportSvgElement(svgRef.current, `${currentObj.id}.svg`, layout.width, layout.height) }, '导出 SVG'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportPngFromSvgElement(svgRef.current, `${currentObj.id}.png`, layout.width, layout.height) }, '导出 PNG'))),

  omittedUnique.length > 0 && h('div', {
    role: 'status',
    'data-concerto-excalidraw-omitted': String(layout.omittedTypes.length),
    style: { marginBottom: 8, padding: '6px 10px', borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-state-attention-bg)', fontSize: 'var(--cc-fs-caption)' },
  }, `提示：导入场景含 ${layout.omittedTypes.length} 个未支持图元（${omittedUnique.join(', ')}），已渲染基础图形、连线与文本子集。`),

  pendingMergeObj && h('div', { role: 'status', style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '6px 10px', borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-state-attention-bg)', fontSize: 'var(--cc-fs-caption)' } },
    h('span', null, '后台语义内容已更新至 v' + pendingMergeObj.version + '（编辑期间已暂停覆盖）'),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', onClick: () => { setAppliedObj(pendingMergeObj); setPendingMergeObj(null) } }, '合并保留我的位置'),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => setPendingMergeObj(null) }, '忽略')),

  editingNodeId && h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
    h('input', { value: editingDraft, onChange: (e) => setEditingDraft(e.target.value), placeholder: '修改节点文字', style: { ...styles.input, flex: 1 } }),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', onClick: commitNodeLabel }, '确定'),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => setEditingNodeId('') }, '取消')),

  addingNote && h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
    h('input', { value: noteDraft, onChange: (e) => setNoteDraft(e.target.value), placeholder: '输入白板批注', style: { ...styles.input, flex: 1 } }),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: !noteDraft.trim(), onClick: commitAnnotation }, '添加'),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => { setAddingNote(false); setNoteDraft('') } }, '取消')),

  h('div', {
    className: 'concerto-canvas-stage',
    style: { height: inModal ? '100%' : Math.min(280, Math.max(185, layout.height + 24)) },
    onMouseDown: startPanDrag,
    onMouseMove,
    onMouseUp,
    onMouseLeave: onMouseUp,
  },
  !inModal && h('div', { className: 'concerto-stage-tools', onMouseDown: (e) => e.stopPropagation() },
    zoomOutBtn(true),
    zoomInBtn(true),
    fitBtn(true)),
  h('svg', {
    ref: svgRef,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: '100%',
    height: '100%',
    style: { display: 'block', minHeight: 180 },
  },
  h('defs', null,
    h('marker', { id: markerId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-border-strong)' })),
    h('marker', { id: markerId + '-crit', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-accent)' })),
    h('marker', { id: markerId + '-blocked', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-state-blocked)' })),
    h('marker', { id: markerId + '-unknown', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-state-unknown)' }))),
  h('g', { transform: `translate(${pan.x}, ${pan.y}) scale(${zoom})` },
    layout.edges.map((e, i) => {
      const app = edgeAppearance(e.semantic)
      const labelW = e.label ? Math.max(40, Math.round(approxLineWidth(e.label, 12) + 16)) : 0
      return h('g', { key: i, 'data-concerto-edge-semantic': e.semantic || 'default' },
        h('line', {
          x1: e.x1,
          y1: e.y1,
          x2: e.x2,
          y2: e.y2,
          stroke: app.stroke,
          strokeWidth: app.width,
          strokeDasharray: app.dash,
          markerEnd: `url(#${markerId + app.markerSuffix})`,
        }),
        e.label && h('g', null,
          h('rect', {
            x: e.midX - Math.round(labelW / 2),
            y: e.midY - 12,
            width: labelW,
            height: 18,
            rx: 6,
            fill: 'var(--cc-canvas-bg)',
            stroke: 'var(--cc-border-subtle)',
          }),
          h('text', {
            x: e.midX,
            y: e.midY + 1,
            textAnchor: 'middle',
            fill: e.semantic === 'default' ? 'var(--cc-text-secondary)' : app.stroke,
            fontSize: Math.max(11, hostTheme.secondaryFontSize - 1),
            fontWeight: 500,
          }, e.label)))
    }),
    layout.nodes.map((n) => {
      if (n.shape === 'ellipse') {
        return h('ellipse', {
          key: 'bg-' + n.id,
          cx: n.x + n.width / 2,
          cy: n.y + n.height / 2,
          rx: n.width / 2,
          ry: n.height / 2,
          fill: 'var(--cc-card-nested-bg)',
        })
      }
      if (n.shape === 'diamond') {
        return h('polygon', {
          key: 'bg-' + n.id,
          points: `${n.x + n.width / 2},${n.y} ${n.x + n.width},${n.y + n.height / 2} ${n.x + n.width / 2},${n.y + n.height} ${n.x},${n.y + n.height / 2}`,
          fill: 'var(--cc-card-nested-bg)',
        })
      }
      return h('rect', {
        key: 'bg-' + n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rx: 8,
        fill: 'var(--cc-card-nested-bg)',
      })
    }),
    roughApi && h('g', { ref: roughOverlayRef, 'data-concerto-rough-layer': 'true' }),
    layout.nodes.map((n) => {
      const stroke = n.critical ? 'var(--cc-accent)' : statusCssVar(n.status)
      const stInfo = STATUS_TOKENS[n.status]
      return h('g', {
        key: n.id,
        'data-concerto-excalidraw-node': n.id,
        'data-x': n.x,
        'data-y': n.y,
        style: { cursor: 'move' },
        onMouseDown: (e) => startNodeDrag(n, e),
        onDoubleClick: (e) => { e.stopPropagation(); setEditingNodeId(n.id); setEditingDraft(n.label) },
      },
      h('title', null, `${n.label}${stInfo ? ' · ' + stInfo.label : ''}（拖拽移动，双击改字）`),
      !roughApi && (n.shape === 'ellipse'
        ? h('ellipse', {
            cx: n.x + n.width / 2,
            cy: n.y + n.height / 2,
            rx: n.width / 2,
            ry: n.height / 2,
            fill: 'var(--cc-card-nested-bg)',
            stroke,
            strokeWidth: n.critical ? 2 : 1.5,
          })
        : n.shape === 'diamond'
          ? h('polygon', {
              points: `${n.x + n.width / 2},${n.y} ${n.x + n.width},${n.y + n.height / 2} ${n.x + n.width / 2},${n.y + n.height} ${n.x},${n.y + n.height / 2}`,
              fill: 'var(--cc-card-nested-bg)',
              stroke,
              strokeWidth: n.critical ? 2 : 1.5,
            })
          : h('path', {
              d: buildSketchySvgBox(n.x, n.y, n.width, n.height),
              fill: 'var(--cc-card-nested-bg)',
              stroke,
              strokeWidth: n.critical ? 2 : 1.5,
            })),
      roughApi && h('rect', {
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        rx: 8,
        fill: 'transparent',
      }),
      n.status && n.shape !== 'ellipse' && n.shape !== 'diamond' && h('rect', {
        x: n.x,
        y: n.y,
        width: 4,
        height: n.height,
        rx: 2,
        fill: stroke,
      }),
      h('text', {
        x: n.x + n.width / 2,
        y: n.y + n.height / 2 + 4,
        textAnchor: 'middle',
        fill: 'var(--cc-text-primary)',
        fontSize: Math.max(12, hostTheme.fontSize - 1),
        fontFamily: 'var(--cc-font-sans)',
        fontWeight: 600,
      }, n.label))
    }),
    (layout.freeTexts || []).map((t) => h('text', {
      key: t.id,
      x: t.x,
      y: t.y,
      fill: 'var(--cc-text-secondary)',
      fontSize: Math.max(12, hostTheme.fontSize - 1),
      fontFamily: 'var(--cc-font-sans)',
    }, t.text)),
    annotations.map((note) => h('g', { key: note.id, transform: `translate(${note.x}, ${note.y})` },
      h('rect', { x: 0, y: 0, width: 164, height: 28, rx: 6, fill: 'var(--cc-state-attention-bg)', stroke: 'var(--cc-state-attention)', strokeWidth: 1.2 }),
      h('text', { x: 8, y: 18, fill: 'var(--cc-text-primary)', fontSize: Math.max(11, hostTheme.secondaryFontSize - 1) }, '批注：' + note.text)))))),

  !inModal && h('div', { className: 'concerto-canvas-foot' },
    h('span', { className: 'concerto-num' }, summaryText)))
}
