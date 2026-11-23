import React from 'react'
import { h, styles, useHostTheme, readCanvasViewport, writeCanvasViewport } from '../../api.js'
import { approxLineWidth, layoutDiagram, STATUS_TOKENS } from '../../../../lib/domain/view_layout.mjs'
import { exportSvgElement, exportPngFromSvgElement } from './exportUtils.js'
import { SvgViewport } from './SvgViewport.js'
import { StatusIcon, UiIcon } from '../UiIcon.js'

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

function statusGroup(status) {
  if (status === 'done' || status === 'completed') return ['completed', '完成']
  if (['waiting_approval', 'waiting_input', 'attention'].includes(status)) return ['waiting_approval', '等待']
  if (status === 'running' || status === 'in_progress') return ['running', '进行中']
  if (status === 'review') return ['review', '待验收']
  if (status === 'blocked' || status === 'failed') return ['blocked', '阻塞']
  if (status === 'unknown') return ['unknown', '未知']
  return ['pending', '待办']
}

function edgeAppearance(semantic, highlightCritical) {
  if (semantic === 'blocked') {
    return { stroke: 'var(--cc-state-blocked)', width: 1.8, dash: '6 4', markerSuffix: '-blocked' }
  }
  if (semantic === 'unknown') {
    return { stroke: 'var(--cc-state-unknown)', width: 1.8, dash: '6 4', markerSuffix: '-unknown' }
  }
  if (semantic === 'waiting') {
    return { stroke: 'var(--cc-state-attention)', width: 1.8, dash: '6 4', markerSuffix: '-waiting' }
  }
  if (semantic === 'critical' && highlightCritical) {
    return { stroke: 'var(--cc-accent)', width: 2.2, dash: undefined, markerSuffix: '-crit' }
  }
  return { stroke: 'var(--cc-border-strong)', width: 1.5, dash: undefined, markerSuffix: '' }
}

function resolveLiveTask(node, tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0 || !node) return null
  if (node.taskId) {
    const byId = tasks.find((t) => t.taskId === node.taskId)
    if (byId) return byId
  }
  if (typeof node.id === 'string') {
    const byNodeId = tasks.find((t) => t.taskId === node.id)
    if (byNodeId) return byNodeId
  }
  const text = String(node.fullLabel || node.label || '')
  const m = text.match(/\b(task-\d+)\b/i)
  if (m) {
    const byMention = tasks.find((t) => t.taskId.toLowerCase() === m[1].toLowerCase())
    if (byMention) return byMention
  }
  return null
}

export function SvgDiagramRenderer({ object, sessionId = '', inModal = false, tasks = [], onJumpTask = null, onSelectNode = null }) {
  const hostTheme = useHostTheme()
  const initialVp = React.useMemo(() => readCanvasViewport(sessionId, object?.id), [sessionId, object?.id])
  const [zoom, setZoom] = React.useState(() => initialVp.scale || 1)
  const [pan, setPan] = React.useState(() => ({ x: initialVp.panX || 0, y: initialVp.panY || 0 }))
  const [highlightCritical, setHighlightCritical] = React.useState(true)
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
    fontSize: hostTheme.fontSize,
    semanticKind: object?.semanticKind,
  }), [rawData, object?.layoutHints, object?.userLayout?.offsets, object?.semanticKind, highlightCritical, hostTheme.fontSize])

  const markerId = 'concerto-arrow-' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!layout.nodes.length) return h('p', { style: styles.muted }, '图谱暂无节点。')
  const hasCritical = layout.nodes.some((n) => n.critical) || layout.edges.some((e) => e.critical || e.semantic === 'critical')
  const fs = Math.max(12, layout.fontSize || 12.5)
  const lh = layout.lineHeight || Math.round(fs * 1.38)
  const summaryText = (LAYOUT_LABELS[layoutMode] || layoutMode) + ' · ' + layout.nodes.length + ' 节点 / ' + layout.edges.length + ' 连线'
  const statusCounts = new Map()
  for (const node of layout.nodes) {
    const [status, text] = statusGroup(node.status)
    const current = statusCounts.get(status) || { status, text, count: 0 }
    current.count += 1
    statusCounts.set(status, current)
  }
  const edgeLegend = [...new Set(layout.edges.map((edge) => edge.semantic).filter((semantic) => semantic && semantic !== 'default'))]
  const edgeLegendLabels = { critical: '关键路径', waiting: '等待', blocked: '阻塞', unknown: '未知' }

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
    onClick: () => {
      const stage = svgRef.current.closest('.concerto-canvas-stage')
      updateViewport(Math.min(1, stage.clientWidth / layout.width, stage.clientHeight / layout.height), { x: 0, y: 0 })
    },
  }, iconOnly ? h(UiIcon, { name: 'expand' }) : '适应窗口')

  const actualSizeBtn = (iconOnly) => h('button', {
    type: 'button',
    className: iconOnly ? 'concerto-btn concerto-btn--ghost' : 'concerto-btn',
    'aria-label': '原始字号', title: '按宿主原始字号显示',
    onClick: () => updateViewport(1, { x: 0, y: 0 }),
  }, iconOnly ? '100%' : '原始字号')

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
      actualSizeBtn(false),
      fitBtn(false)),
    h('div', { className: 'concerto-canvas-export' },
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportSvgElement(svgRef.current, `${object.id}.svg`, layout.width, layout.height) }, '导出 SVG'),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => exportPngFromSvgElement(svgRef.current, `${object.id}.png`, layout.width, layout.height) }, '导出 PNG'))),

  h(SvgViewport, {
    width: layout.width, height: layout.height, zoom, pan, onViewportChange: updateViewport,
    inModal, label: object.title || '任务依赖图',
    tools: !inModal && h(React.Fragment, null, zoomOutBtn(true), zoomInBtn(true), actualSizeBtn(true), fitBtn(true)),
  },
  h('svg', {
    ref: svgRef,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: Math.ceil(layout.width * zoom),
    height: Math.ceil(layout.height * zoom),
    role: 'img',
    'aria-label': object.title || '任务依赖图',
    'aria-describedby': markerId + '-description',
    style: { fontFamily: 'var(--cc-font-sans)' },
  },
  h('desc', { id: markerId + '-description' },
    layout.nodes.map((node) => `${node.fullLabel}：${(STATUS_TOKENS[node.status] || STATUS_TOKENS.pending).label}`).join('；')
    + '。关系：' + layout.edges.map((edge) => `${layout.nodes.find((node) => node.id === edge.from).fullLabel} → ${layout.nodes.find((node) => node.id === edge.to).fullLabel}`).join('；')),
  h('defs', null,
    h('marker', { id: markerId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-border-strong)' })),
    h('marker', { id: markerId + '-crit', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-accent)' })),
    h('marker', { id: markerId + '-blocked', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-state-blocked)' })),
    h('marker', { id: markerId + '-unknown', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-state-unknown)' })),
    h('marker', { id: markerId + '-waiting', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' },
      h('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'var(--cc-state-attention)' }))),
  h('g', null,
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
      const labelW = e.labelWidth
      return h('g', { key: idx, 'data-concerto-edge-semantic': e.semantic || 'default' },
        h('path', {
          d: e.path || `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`,
          fill: 'none',
          stroke: app.stroke,
          strokeWidth: app.width,
          strokeDasharray: app.dash,
          strokeOpacity: e.semantic === 'default' ? 0.85 : 0.95,
          markerEnd: `url(#${markerId + app.markerSuffix})`,
        }),
        e.label && h('g', null,
          h('rect', {
            x: e.midX - Math.round(labelW / 2),
            y: e.midY - e.labelHeight / 2,
            width: labelW,
            height: e.labelHeight,
            rx: 6,
            fill: 'var(--cc-canvas-bg)',
            stroke: 'var(--cc-border-subtle)',
          }),
          h('text', {
            x: e.midX,
            y: e.midY + e.labelFontSize * 0.35,
            textAnchor: 'middle',
            fill: e.semantic === 'default' ? 'var(--cc-text-secondary)' : app.stroke,
            fontSize: e.labelFontSize,
            fontWeight: 500,
          }, e.label)))
    }),

    layout.nodes.map((n) => {
      const liveTask = resolveLiveTask(n, tasks)
      const effectiveStatus = liveTask ? (liveTask.viewState || liveTask.state) : n.status
      const effectiveTaskId = liveTask?.taskId || n.taskId || null
      const st = STATUS_TOKENS[effectiveStatus] || STATUS_TOKENS.pending
      const stColor = statusCssVar(effectiveStatus)
      const completed = effectiveStatus === 'done' || effectiveStatus === 'completed'
      const isRunning = ['running', 'waiting_input', 'waiting_approval'].includes(effectiveStatus)
      const isBlocked = effectiveStatus === 'blocked' || effectiveStatus === 'failed'
      const canJump = Boolean(effectiveTaskId && typeof onJumpTask === 'function')
      const canAnnotate = typeof onSelectNode === 'function'
      const interactive = canJump || canAnnotate
      const activate = (event) => {
        if (!interactive) return
        event.stopPropagation()
        if (event.shiftKey && canAnnotate) {
          onSelectNode({ id: n.id, label: n.fullLabel || n.label, taskId: effectiveTaskId })
          return
        }
        if (canJump) {
          onJumpTask(effectiveTaskId)
        } else if (canAnnotate) {
          onSelectNode({ id: n.id, label: n.fullLabel || n.label, taskId: effectiveTaskId })
        }
      }
      const battleClass = [
        'concerto-diagram-node',
        interactive ? 'concerto-battle-node--interactive' : '',
        isRunning ? 'concerto-battle-node--running' : '',
        completed ? 'concerto-battle-node--done' : '',
        isBlocked ? 'concerto-battle-node--blocked' : '',
      ].filter(Boolean).join(' ')
      return h('g', {
        key: n.id,
        className: battleClass,
        'data-concerto-diag-node': n.id,
        'data-status': effectiveStatus || 'pending',
        'data-task-id': effectiveTaskId || undefined,
        transform: `translate(${n.x}, ${n.y})`,
        role: interactive ? 'button' : undefined,
        tabIndex: interactive ? 0 : undefined,
        'aria-label': canJump
          ? `打开任务 ${effectiveTaskId}：${n.fullLabel || n.label}`
          : (canAnnotate ? `批注节点：${n.fullLabel || n.label}` : undefined),
        onClick: interactive ? activate : undefined,
        onKeyDown: interactive ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            activate(event)
          }
        } : undefined,
      },
        h('title', null, (n.fullLabel || n.label) + (effectiveStatus ? ' · ' + st.label : '') + (canJump ? '（点击打开任务，Shift+点击批注）' : (canAnnotate ? '（点击指图下指令）' : ''))),
        h('rect', {
          x: 0,
          y: 0,
          width: n.width,
          height: n.height,
          rx: 8,
          fill: completed ? 'var(--cc-card-nested-bg)' : 'var(--cc-card-bg)',
          stroke: isBlocked ? 'var(--cc-state-blocked)' : (effectiveStatus === 'unknown' ? 'var(--cc-state-unknown)' : (isRunning ? 'var(--cc-state-running)' : (completed ? 'var(--cc-state-done)' : 'var(--cc-border-subtle)'))),
          strokeDasharray: effectiveStatus === 'unknown' ? '5 3' : undefined,
          strokeWidth: isRunning ? 2 : 1.2,
        }),
        h('rect', { x: 0, y: 0, width: 4, height: n.height, rx: 2, fill: stColor }),
        n.lines.map((line, li) => h('text', {
          key: li,
          x: 18,
          y: Math.round(fs + 12 + li * lh),
          fill: completed ? 'var(--cc-text-secondary)' : 'var(--cc-text-primary)',
          fontSize: fs,
          fontWeight: 600,
        }, line)),
        effectiveStatus && h('text', {
          x: 18,
          y: n.height - 12,
          fill: stColor,
          fontSize: Math.max(11, Math.round(fs - 0.5)),
          fontWeight: 600,
        }, `${st.icon} ${st.label}`))
    })))),

  !inModal && h('div', { className: 'concerto-canvas-foot concerto-diagram-foot' },
    h('div', { className: 'concerto-diagram-status-summary', 'aria-label': '节点状态统计' },
      [...statusCounts.values()].map((item) => h('span', { key: item.status },
        h(StatusIcon, { status: item.status, size: 12 }),
        `${item.count} ${item.text}`))),
    edgeLegend.length > 0 && h('div', { className: 'concerto-diagram-edge-legend', 'aria-label': '连线图例' },
      edgeLegend.map((semantic) => h('span', { key: semantic, 'data-semantic': semantic }, edgeLegendLabels[semantic] || semantic)))))
}
