import React from 'react'
import { h, styles, useHostTheme } from '../../api.js'
import {
  parseMarkdownToMindmap,
  normalizeMindmapTree,
  countMindmapNodes,
  defaultPreviewCollapsedIds,
  defaultPreviewCollapsedIdsWithinBudget,
  layoutMindmapTree,
} from '../../../../lib/domain/view_layout.mjs'
import { exportSvgElement, exportPngFromSvgElement } from './exportUtils.js'
import { SvgViewport } from './SvgViewport.js'
import { MarkmapSvgDocument } from './MarkmapSvgDocument.js'
import { useCanvasSession } from './useCanvasSession.js'
import { UiIcon } from '../UiIcon.js'

export function MarkmapRenderer({ object, sessionId = '', inModal = false, canvasSession: providedCanvasSession, onExpand = null }) {
  const hostTheme = useHostTheme()
  const dataSig = React.useMemo(() => JSON.stringify(object?.data || null), [object?.data])
  const root = React.useMemo(() => {
    const raw = object?.data?.root
      ? object.data.root
      : (object?.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null)
    return raw ? normalizeMindmapTree(raw) : null
  }, [dataSig, object?.title])
  const defaultCollapsedIds = React.useMemo(
    () => (root ? defaultPreviewCollapsedIdsWithinBudget(root, { fontSize: hostTheme.fontSize }) : []),
    [root, hostTheme.fontSize]
  )
  const ownCanvasSession = useCanvasSession(sessionId, object?.id, defaultCollapsedIds)
  const canvasSession = providedCanvasSession || ownCanvasSession
  const { collapsedIds, viewports, setCollapsedIds, setViewport } = canvasSession
  const mode = inModal ? 'modal' : 'preview'
  const viewport = viewports[mode] || { scale: 1, panX: 0, panY: 0 }
  const zoom = viewport.scale
  const pan = { x: viewport.panX, y: viewport.panY }
  const svgRef = React.useRef(null)
  const totalNodes = React.useMemo(() => (root ? countMindmapNodes(root) : 0), [root])
  const layout = React.useMemo(
    () => (root ? layoutMindmapTree(root, collapsedIds, { fontSize: hostTheme.fontSize }) : { nodes: [], edges: [], width: 0, height: 0, hiddenDescendantTotal: 0 }),
    [root, collapsedIds, hostTheme.fontSize]
  )

  React.useEffect(() => {
    if (!root) return
    const validIds = new Set()
    const walk = (node) => {
      validIds.add(node.id)
      for (const child of node.children || []) walk(child)
    }
    walk(root)
    setCollapsedIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [root, setCollapsedIds])

  const updateViewport = React.useCallback((nextZoom, nextPan) => {
    setViewport(mode, { scale: nextZoom, panX: nextPan.x, panY: nextPan.y })
  }, [mode, setViewport])

  const fitView = React.useCallback(() => {
    const stage = svgRef.current?.closest('.concerto-canvas-stage')
    if (!stage || !layout.width || !layout.height) return
    const nextZoom = Math.max(0.1, Math.min(1, stage.clientWidth / layout.width, stage.clientHeight / layout.height))
    updateViewport(nextZoom, { x: 0, y: 0 })
  }, [layout.width, layout.height, updateViewport])

  React.useLayoutEffect(() => {
    if (!inModal || viewports.modal) return
    const frame = requestAnimationFrame(fitView)
    return () => cancelAnimationFrame(frame)
  }, [inModal, object?.id, viewports.modal, fitView])

  if (!root) return h('p', { style: styles.muted }, '思维导图内容为空。')

  function updateCollapsed(nextSet) {
    setCollapsedIds(nextSet)
  }

  function toggleNode(id, event) {
    event.stopPropagation()
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hiddenCount = layout.hiddenDescendantTotal || 0
  const canFoldMore = totalNodes > 8 && collapsedIds.size === 0
  const branchCount = root.children?.length || 0
  const summaryText = inModal
    ? `共 ${totalNodes} 节点` + (hiddenCount > 0 ? ` · 当前展示 ${layout.nodes.length} 项（已折叠 ${hiddenCount} 项）` : ' · 已展开全部')
    : `${branchCount} 个分支 · ${totalNodes} 项` + (hiddenCount > 0 ? ` · 折叠 ${hiddenCount} 项` : '')

  const zoomOutBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost concerto-btn--icon' : 'concerto-btn',
    'aria-label': '缩小',
    title: '缩小',
    onClick: () => updateViewport(Math.max(0.1, Number((zoom - 0.15).toFixed(2))), pan),
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
  }, iconOnly ? h(UiIcon, { name: 'expand' }) : '适应窗口')

  const actualSizeBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost' : 'concerto-btn',
    'aria-label': '原始字号',
    title: '按宿主原始字号显示',
    onClick: () => updateViewport(1, { x: 0, y: 0 }),
  }, iconOnly ? '100%' : '原始字号')

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
      actualSizeBtn(false),
      fitBtn(false)),
    h('div', { className: 'concerto-canvas-export' },
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportSvgElement(svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, '导出 SVG'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportPngFromSvgElement(svgRef.current, `${object.id}.png`, layout.width, layout.height) }, '导出 PNG'))),
  h(SvgViewport, {
    width: layout.width,
    height: layout.height,
    zoom,
    pan,
    onViewportChange: updateViewport,
    inModal,
    label: object.title || '计划导图',
    tools: !inModal && h(React.Fragment, null, zoomOutBtn(true), zoomInBtn(true), actualSizeBtn(true), fitBtn(true)),
  }, h(MarkmapSvgDocument, {
    layout: { ...layout, zoom },
    title: object.title || '计划导图',
    svgRef,
    onToggleNode: toggleNode,
  })),
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
      }, '收起深层'),
      onExpand && h('button', {
        type: 'button',
        className: 'concerto-link',
        'aria-label': '全屏查看',
        onClick: onExpand,
      }, h(UiIcon, { name: 'expand', size: 12 }), '全屏'))))
}
