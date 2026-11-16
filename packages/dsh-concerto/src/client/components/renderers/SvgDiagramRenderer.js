import React from 'react'
import { h, styles, useHostTheme, readCanvasViewport, writeCanvasViewport } from '../../api.js'
import { approxLineWidth, layoutDiagram, STATUS_TOKENS } from '../../../../lib/domain/view_layout.mjs'
import { exportSvgElement, exportPngFromSvgElement } from './exportUtils.js'

const LAYOUT_LABELS = { dag: '依赖 DAG', timeline: '时间线', radial: '中心辐射', swimlane: '成员泳道' }

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
    default: return 'var(--cc-text-muted)'
  }
}

function edgeAppearance(semantic, highlightCritical) {
  if (semantic === 'blocked') {
    return { stroke: 'var(--cc-state-blocked)', width: 1.8, dash: '6 4', markerSuffix: '-blocked' }
  }
  if (semantic === 'unknown') {
    return { stroke: 'var(--cc-state-unknown)', width: 1.8, dash: '6 4', markerSuffix: '-unknown' }
  }
  if (semantic === 'critical' && highlightCritical) {
    return { stroke: 'var(--cc-accent)', width: 2.2, dash: undefined, markerSuffix: '-crit' }
  }
  return { stroke: 'var(--cc-border-strong)', width: 1.5, dash: undefined, markerSuffix: '' }
}

export function SvgDiagramRenderer({ object, sessionId = '', inModal = false }) {
  const hostTheme = useHostTheme()
  const initialVp = React.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id])
  const [zoom, setZoom] = React.useState(() => initialVp.scale || 1)
  const [pan, setPan] = React.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }))
  const [highlightCritical, setHighlightCritical] = React.useState(true)
  const dragging = React.useRef(null)
  const svgRef = React.useRef(null)

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

  const rawData = object?.data || {}
  const layoutMode = rawData.layout || 'dag'
  const layout = React.useMemo(() => layoutDiagram(rawData, {
    direction: object?.layoutHints?.direction,
    criticalPath: highlightCritical ? object?.layoutHints?.criticalPath : [],
    userOffsets: object?.userLayout?.offsets,
    fontSize: Math.max(12, hostTheme.fontSize - 1),
  }), [rawData, object?.layoutHints, object?.userLayout?.offsets, highlightCritical, hostTheme.fontSize])

  if (!layout.nodes.length) return h('p', { style: styles.muted }, '图谱暂无节点。')
  const markerId = 'concerto-arrow-' + String(object.id || 'diag').replace(/[^a-zA-Z0-9_-]/g, '') + (inModal ? '-modal' : '')
  const hasCritical = layout.nodes.some((n) => n.critical) || layout.edges.some((e) => e.critical || e.semantic === 'critical')
  const fs = Math.max(12, layout.fontSize || 12.5)
  const lh = layout.lineHeight || Math.round(fs * 1.38)
  const summaryText = (LAYOUT_LABELS[layoutMode] || layoutMode) + ' · ' + layout.nodes.length + ' 节点 / ' + layout.edges.length + ' 连线'

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
    onClick: () => updateViewport(1, { x: 0, y: 0 }),
  }, iconOnly ? '⊡' : '适应窗口')

  return h('div', {
    'data-concerto-renderer-root': 'svg',
    style: inModal ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined,
  },
  inModal && h('div', { className: 'concerto-canvas-bar' },
    h('span', { className: 'concerto-num' }, summaryText),
    h('div', { className: 'concerto-canvas-btns' },
      hasCritical && h('button', { type: 'button', className: 'concerto-btn', onClick: () => setHighlightCritical((v) => !v) }, highlightCritical ? '隐藏强调路径' : '强调路径'),
      zoomOutBtn(false),
      zoomInBtn(false),
      fitBtn(false),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportSvgElement(svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, '导出 SVG'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportPngFromSvgElement(svgRef.current, `${object.id}.png`, layout.width, layout.height) }, '导出 PNG'))),

  h('div', {
    className: 'concerto-canvas-stage',
    style: { height: inModal ? '100%' : Math.min(280, Math.max(185, layout.height + 24)) },
    onMouseDown: (e) => { dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y } },
    onMouseMove: (e) => {
      if (dragging.current) updateViewport(zoom, { x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
    },
    onMouseUp: () => { dragging.current = null },
    onMouseLeave: () => { dragging.current = null },
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
    style: { display: 'block', minHeight: 180, fontFamily: 'var(--cc-font-sans)' },
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
    (layout.lanes || []).map((lane) => {
      const laneText = lane.memberId ? `@${lane.memberId}` : lane.label
      const laneBoxW = Math.max(96, Math.round(approxLineWidth(laneText, fs) + 24))
      return h('g', { key: lane.id },
        h('rect', {
          x: 8,
          y: lane.y,
          width: layout.width - 16,
          height: lane.height,
          rx: 8,
          fill: lane.index % 2 === 0 ? 'var(--cc-card-nested-bg)' : 'transparent',
          stroke: 'var(--cc-border)',
          strokeDasharray: '4 4',
        }),
        h('rect', {
          x: 16,
          y: lane.y + 12,
          width: laneBoxW,
          height: 28,
          rx: 8,
          fill: 'var(--cc-card-bg)',
          stroke: 'var(--cc-border)',
        }),
        h('text', {
          x: 26,
          y: lane.y + 30,
          fill: 'var(--cc-text-primary)',
          fontSize: Math.max(11, Math.round(fs - 0.5)),
          fontWeight: 600,
        }, laneText))
    }),

    layout.edges.map((e, idx) => {
      const app = edgeAppearance(e.semantic, highlightCritical)
      const labelW = Math.max(44, Math.round(approxLineWidth(e.label || '', 12) + 16))
      return h('g', { key: idx, 'data-concerto-edge-semantic': e.semantic || 'default' },
        h('path', {
          d: e.path || `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`,
          fill: 'none',
          stroke: app.stroke,
          strokeWidth: app.width,
          strokeDasharray: app.dash,
          strokeOpacity: e.semantic === 'default' ? 0.85 : 0.95,
        }),
        h('line', {
          x1: e.x1,
          y1: e.y1,
          x2: e.x2,
          y2: e.y2,
          stroke: app.stroke,
          strokeWidth: app.width,
          strokeOpacity: 0.01,
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
            fontSize: Math.max(11, Math.round(fs - 0.5)),
            fontWeight: 500,
          }, e.label)))
    }),

    layout.nodes.map((n) => {
      const st = STATUS_TOKENS[n.status] || STATUS_TOKENS.pending
      const stColor = statusCssVar(n.status)
      const isCrit = Boolean(n.critical) && highlightCritical
      return h('g', { key: n.id, 'data-concerto-diag-node': n.id, 'data-status': n.status || 'pending', transform: `translate(${n.x}, ${n.y})` },
        h('title', null, (n.fullLabel || n.label) + (n.status ? ' · ' + st.label : '')),
        h('rect', {
          x: 0,
          y: 0,
          width: n.width,
          height: n.height,
          rx: 8,
          fill: 'var(--cc-card-nested-bg)',
          stroke: isCrit ? 'var(--cc-accent)' : stColor,
          strokeWidth: isCrit ? 2 : 1.5,
        }),
        h('rect', { x: 0, y: 0, width: 4, height: n.height, rx: 2, fill: stColor }),
        n.lines.map((line, li) => h('text', {
          key: li,
          x: 14,
          y: Math.round(fs + 6 + li * lh),
          fill: 'var(--cc-text-primary)',
          fontSize: fs,
          fontWeight: 600,
        }, line)),
        n.status && h('text', {
          x: n.width - 10,
          y: n.height - 6,
          textAnchor: 'end',
          fill: stColor,
          fontSize: Math.max(11, Math.round(fs - 0.5)),
          fontWeight: 600,
        }, `${st.icon} ${st.label}`))
    })))),

  !inModal && h('div', { className: 'concerto-canvas-foot' },
    h('span', { className: 'concerto-num' }, summaryText),
    hasCritical && h('button', { type: 'button', className: 'concerto-link', onClick: () => setHighlightCritical((v) => !v) }, highlightCritical ? '隐藏强调路径' : '强调路径')))
}
