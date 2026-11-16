import React from 'react'
import { h, API, styles, useHostTheme, readCanvasViewport, writeCanvasViewport } from '../../api.js'
import {
  parseMarkdownToMindmap,
  normalizeMindmapTree,
  countMindmapNodes,
  defaultPreviewCollapsedIds,
  layoutMindmapTree,
} from '../../../../lib/domain/view_layout.mjs'
import { exportSvgElement, exportPngFromSvgElement } from './exportUtils.js'

let cachedMarkmapChunk = null
let cachedMarkmapPromise = null

async function loadMarkmapChunk() {
  if (cachedMarkmapChunk) return cachedMarkmapChunk
  if (!cachedMarkmapPromise) {
    cachedMarkmapPromise = import(/* webpackIgnore: true */ API + '/assets/markmap.js')
      .then((mod) => {
        if (typeof mod?.renderInteractiveMarkmap === 'function') {
          cachedMarkmapChunk = mod
          return mod
        }
        return null
      })
      .catch(() => null)
  }
  return cachedMarkmapPromise
}

function branchStrokeVar(branchIndex = 0) {
  const idx = ((Number(branchIndex) || 0) % 4 + 4) % 4 + 1
  return `var(--cc-branch-${idx})`
}

function nodeStrokeColor(node) {
  if (node.status === 'blocked' || node.status === 'failed') return 'var(--cc-state-blocked)'
  if (node.status === 'unknown') return 'var(--cc-state-unknown)'
  if (node.depth === 0) return 'var(--cc-branch-1)'
  return branchStrokeVar(node.branchIndex)
}

function nodeFillOpacity(depth) {
  if (depth <= 1) return 0.16
  if (depth === 2) return 0.11
  return 0.07
}

export function MarkmapRenderer({ object, sessionId = '', inModal = false, onExpand }) {
  const hostTheme = useHostTheme()
  const dataSig = React.useMemo(() => JSON.stringify(object?.data || null), [object?.data])
  const root = React.useMemo(() => {
    const raw = object?.data?.root
      ? object.data.root
      : (object?.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null)
    return raw ? normalizeMindmapTree(raw) : null
  }, [dataSig, object?.title])

  const totalNodes = React.useMemo(() => (root ? countMindmapNodes(root) : 0), [root])
  const initialVp = React.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id])

  const [collapsed, setCollapsed] = React.useState(() => {
    if (Array.isArray(initialVp.collapsedIds)) return new Set(initialVp.collapsedIds)
    return root ? new Set(defaultPreviewCollapsedIds(root, 8, 1)) : new Set()
  })
  const [zoom, setZoom] = React.useState(() => initialVp.scale || 1)
  const [pan, setPan] = React.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }))
  const [libState, setLibState] = React.useState({ mode: 'svg', error: '' })
  const dragging = React.useRef(null)
  const svgRef = React.useRef(null)
  const libMountRef = React.useRef(null)
  const mmControllerRef = React.useRef(null)
  const collapsedRef = React.useRef(collapsed)
  collapsedRef.current = collapsed
  const rootRef = React.useRef(root)
  rootRef.current = root
  const mountedSigRef = React.useRef('')

  React.useEffect(() => {
    const vp = readCanvasViewport(sessionId, object?.id)
    setCollapsed(Array.isArray(vp.collapsedIds)
      ? new Set(vp.collapsedIds)
      : (rootRef.current ? new Set(defaultPreviewCollapsedIds(rootRef.current, 8, 1)) : new Set()))
    setZoom(vp.scale || 1)
    setPan({ x: vp.panX || 0, y: vp.panY || 0 })
  }, [sessionId, object?.id])

  const updateCollapsed = React.useCallback((nextSet) => {
    setCollapsed(nextSet)
    writeCanvasViewport(sessionId, object?.id, { collapsedIds: [...nextSet] })
    mmControllerRef.current?.setCollapsedIds?.(nextSet)
  }, [sessionId, object?.id])

  const updateViewport = React.useCallback((nextZoom, nextPan) => {
    setZoom(nextZoom)
    setPan(nextPan)
    writeCanvasViewport(sessionId, object?.id, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y })
  }, [sessionId, object?.id])

  // Mount fullscreen interactive Markmap ONCE per modal open / object.id — polling does NOT tear it down (§5.2)
  React.useEffect(() => {
    if (!inModal || typeof document === 'undefined' || !rootRef.current) return
    let cancelled = false
    let rafId = 0
    mountedSigRef.current = dataSig
    setLibState({ mode: 'loading', error: '' })
    loadMarkmapChunk().then((mod) => {
      if (cancelled) return
      if (!mod || !libMountRef.current) {
        setLibState({ mode: 'svg', error: '' })
        return
      }
      rafId = requestAnimationFrame(() => {
        if (cancelled || !libMountRef.current || !rootRef.current) return
        try {
          mmControllerRef.current?.destroy?.()
          const savedVp = readCanvasViewport(sessionId, object?.id)
          mmControllerRef.current = mod.renderInteractiveMarkmap(libMountRef.current, rootRef.current, {
            collapsedIds: collapsedRef.current,
            initialExpandLevel: -1,
            initialTransform: savedVp?.modalTransform || null,
            onFoldChange: (foldedIds) => {
              const next = new Set(foldedIds)
              setCollapsed(next)
              writeCanvasViewport(sessionId, object?.id, { collapsedIds: foldedIds })
            },
            onTransformChange: (modalTransform) => {
              writeCanvasViewport(sessionId, object?.id, { modalTransform })
            },
          })
          setLibState({ mode: 'markmap-view', error: '' })
        } catch (err) {
          setLibState({ mode: 'svg', error: err?.message || '' })
        }
      })
    })
    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (mmControllerRef.current?.getTransform) {
        try {
          const cur = mmControllerRef.current.getTransform()
          if (cur && Number.isFinite(cur.k) && cur.k > 0) {
            writeCanvasViewport(sessionId, object?.id, { modalTransform: { k: cur.k, x: cur.x, y: cur.y } })
          }
        } catch { /* ignore */ }
      }
      mmControllerRef.current?.destroy?.()
      mmControllerRef.current = null
    }
  }, [inModal, object?.id, sessionId])

  // Incrementally sync mindmap content ONLY when actual data payload changes, keeping current pan/zoom untouched
  React.useEffect(() => {
    if (!inModal || !mmControllerRef.current || !root) return
    if (mountedSigRef.current === dataSig) return
    mountedSigRef.current = dataSig
    mmControllerRef.current.updateData?.(root, collapsedRef.current)
  }, [inModal, dataSig, root])

  const layout = React.useMemo(
    () => (root ? layoutMindmapTree(root, collapsed, { fontSize: Math.max(12, hostTheme.fontSize - 1) }) : { nodes: [], edges: [], width: 0, height: 0, hiddenDescendantTotal: 0 }),
    [root, collapsed, hostTheme.fontSize]
  )

  if (!root) return h('p', { style: styles.muted }, '思维导图内容为空。')

  function toggleNode(id, e) {
    e.stopPropagation()
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateCollapsed(next)
  }

  function resetView() {
    if (inModal && libState.mode !== 'svg' && mmControllerRef.current?.fit) {
      mmControllerRef.current.fit()
      return
    }
    updateViewport(1, { x: 0, y: 0 })
  }

  const useRealMarkmap = inModal && libState.mode !== 'svg'
  const hiddenCount = layout.hiddenDescendantTotal || 0
  const canFoldMore = totalNodes > 8 && collapsed.size === 0
  const summaryText = `共 ${totalNodes} 节点` + (hiddenCount > 0 ? ` · 当前展示 ${layout.nodes.length} 项（已折叠 ${hiddenCount} 项）` : ' · 已展开全部')

  const zoomOutBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '缩小',
    title: '缩小',
    onClick: () => (useRealMarkmap
      ? mmControllerRef.current?.rescale?.(0.83)
      : updateViewport(Math.max(0.5, Number((zoom - 0.15).toFixed(2))), pan)),
  }, iconOnly ? '−' : '缩小')

  const zoomInBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '放大',
    title: '放大',
    onClick: () => (useRealMarkmap
      ? mmControllerRef.current?.rescale?.(1.2)
      : updateViewport(Math.min(2.4, Number((zoom + 0.15).toFixed(2))), pan)),
  }, iconOnly ? '+' : '放大')

  const fitBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '适应窗口',
    title: '适应窗口',
    onClick: resetView,
  }, iconOnly ? '⊡' : '适应窗口')

  return h('div', {
    'data-concerto-renderer-root': 'markmap',
    style: inModal ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined,
  },
  inModal && h('div', { className: 'concerto-canvas-bar' },
    h('span', { className: 'concerto-num' }, summaryText),
    h('div', { className: 'concerto-canvas-btns' },
      hiddenCount > 0 && h('button', {
        type: 'button',
        className: 'concerto-btn',
        'data-concerto-mm-expand-all': 'true',
        onClick: () => updateCollapsed(new Set()),
      }, '展开全部'),
      canFoldMore && h('button', {
        type: 'button',
        className: 'concerto-btn',
        onClick: () => updateCollapsed(new Set(defaultPreviewCollapsedIds(root, 8, 1))),
      }, '收起深层'),
      zoomOutBtn(false),
      zoomInBtn(false),
      fitBtn(false),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportSvgElement(useRealMarkmap ? libMountRef.current : svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, '导出 SVG'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportPngFromSvgElement(useRealMarkmap ? libMountRef.current : svgRef.current, `${object.id}.png`, layout.width, layout.height) }, '导出 PNG'))),

  h('div', {
    className: 'concerto-canvas-stage',
    style: { height: inModal ? '100%' : Math.min(280, Math.max(185, layout.height + 24)), minHeight: inModal ? 420 : undefined },
    onMouseDown: (e) => { if (!useRealMarkmap) dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y } },
    onMouseMove: (e) => {
      if (!useRealMarkmap && dragging.current) {
        updateViewport(zoom, { x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
      }
    },
    onMouseUp: () => { dragging.current = null },
    onMouseLeave: () => { dragging.current = null },
  },
  !inModal && h('div', { className: 'concerto-stage-tools', onMouseDown: (e) => e.stopPropagation() },
    zoomOutBtn(true),
    zoomInBtn(true),
    fitBtn(true)),
  inModal && h('svg', {
    ref: libMountRef,
    width: '100%',
    height: '100%',
    style: { display: useRealMarkmap ? 'block' : 'none', width: '100%', height: '100%', minHeight: 420, fontFamily: 'var(--cc-font-sans)' },
  }),
  !useRealMarkmap && h('svg', {
    ref: svgRef,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: '100%',
    height: '100%',
    style: { display: 'block', minHeight: 180, fontFamily: 'var(--cc-font-sans)' },
  },
  h('g', { transform: `translate(${pan.x}, ${pan.y}) scale(${zoom})` },
    layout.edges.map((e, i) => {
      const cx1 = e.x1 + (e.x2 - e.x1) * 0.5
      const d = `M ${e.x1} ${e.y1} C ${cx1} ${e.y1}, ${cx1} ${e.y2}, ${e.x2} ${e.y2}`
      const isErr = e.status === 'blocked' || e.status === 'failed'
      const isUnk = e.status === 'unknown'
      const stroke = isErr
        ? 'var(--cc-state-blocked)'
        : (isUnk ? 'var(--cc-state-unknown)' : branchStrokeVar(e.branchIndex ?? Math.max(0, e.depth - 1)))
      return h('path', {
        key: i,
        d,
        fill: 'none',
        stroke,
        strokeDasharray: (isErr || isUnk) ? '5 4' : undefined,
        strokeOpacity: Math.max(0.55, 0.95 - (e.depth - 1) * 0.12),
        strokeWidth: e.depth <= 1 ? 2 : 1.5,
      })
    }),
    layout.nodes.map((n) => {
      const stroke = nodeStrokeColor(n)
      const isRoot = n.depth === 0
      const fs = Math.max(12, (layout.fontSize || 12.5) - (isRoot ? 0 : 0.5))
      const lh = layout.lineHeight || Math.round(fs * 1.4)
      return h('g', {
        key: n.id,
        'data-concerto-mm-node': n.id,
        transform: `translate(${n.x}, ${n.y})`,
      },
      h('title', null, n.fullLabel || n.label),
      h('rect', {
        x: 0,
        y: 0,
        width: n.width,
        height: n.height,
        rx: 8,
        fill: isRoot ? 'var(--cc-card-nested-bg)' : stroke,
        fillOpacity: isRoot ? 1 : nodeFillOpacity(n.depth),
        stroke: isRoot ? 'var(--cc-branch-1)' : stroke,
        strokeWidth: isRoot ? 2 : 1.5,
      }),
      n.lines.map((line, li) => h('text', {
        key: li,
        x: 12,
        y: Math.round(fs + 6 + li * lh),
        fill: 'var(--cc-text-primary)',
        fontSize: fs,
        fontWeight: isRoot ? 600 : 500,
      }, line)),
      n.collapsed && n.hiddenCount > 0 && h('text', {
        x: n.width - 14,
        y: Math.round(n.height / 2 + 4),
        textAnchor: 'end',
        fill: isRoot ? 'var(--cc-accent-text)' : 'var(--cc-text-primary)',
        fontSize: Math.max(11, Math.round(fs - 0.5)),
        fontWeight: 700,
      }, `+${n.hiddenCount}`),
      n.hasChildren && h('g', {
        'data-concerto-mm-toggle': n.id,
        transform: `translate(${n.width}, ${n.height / 2})`,
        style: { cursor: 'pointer' },
        onClick: (e) => toggleNode(n.id, e),
      },
      h('circle', {
        cx: 0,
        cy: 0,
        r: 7.5,
        fill: 'var(--cc-card-nested-bg)',
        stroke,
        strokeWidth: 1.5,
      }),
      h('text', {
        x: 0,
        y: 3.5,
        textAnchor: 'middle',
        fill: 'var(--cc-text-primary)',
        fontSize: Math.max(10, Math.round(fs - 1)),
        fontWeight: 700,
      }, n.collapsed ? '+' : '−')))
    })))),

  !inModal && h('div', { className: 'concerto-canvas-foot' },
    h('span', { className: 'concerto-num' }, summaryText),
    h('span', { style: { display: 'inline-flex', gap: 10, alignItems: 'center' } },
      hiddenCount > 0 && h('button', {
        type: 'button',
        className: 'concerto-link',
        'data-concerto-mm-expand-all': 'true',
        onClick: () => updateCollapsed(new Set()),
      }, '展开全部'),
      canFoldMore && h('button', {
        type: 'button',
        className: 'concerto-link',
        onClick: () => updateCollapsed(new Set(defaultPreviewCollapsedIds(root, 8, 1))),
      }, '收起深层'))))
}
