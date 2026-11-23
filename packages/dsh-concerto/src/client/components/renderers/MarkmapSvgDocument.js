import React from 'react'
import { h } from '../../api.js'

function branchStroke(branchIndex) {
  return `var(--cc-branch-${Math.abs(branchIndex || 0) % 4 + 1})`
}

function nodeStrokeColor(node, liveStatus = null) {
  const status = liveStatus || node.status
  if (status === 'blocked' || status === 'failed') return 'var(--cc-state-blocked)'
  if (status === 'unknown') return 'var(--cc-state-unknown)'
  if (status === 'done' || status === 'completed') return 'var(--cc-state-done)'
  if (['running', 'waiting_input', 'waiting_approval'].includes(status)) return 'var(--cc-state-running)'
  if (status === 'review') return 'var(--cc-state-review)'
  return node.depth === 0 ? 'var(--cc-border-strong)' : branchStroke(node.branchIndex)
}

function matchMindmapTask(node, tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0 || !node) return null
  if (node.taskId) {
    const byId = tasks.find((t) => t.taskId === node.taskId)
    if (byId) return byId
  }
  const byNodeId = tasks.find((t) => t.taskId === node.id)
  if (byNodeId) return byNodeId
  const text = String(node.fullLabel || node.label || '')
  const m = text.match(/\b(task-\d+)\b/i)
  if (m) {
    const byMention = tasks.find((t) => t.taskId.toLowerCase() === m[1].toLowerCase())
    if (byMention) return byMention
  }
  return null
}

export function MarkmapSvgDocument({ layout, title, svgRef, onToggleNode, tasks = [], onJumpTask = null, onSelectNode = null }) {
  return h('svg', {
    ref: svgRef,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: Math.ceil(layout.width * (layout.zoom || 1)),
    height: Math.ceil(layout.height * (layout.zoom || 1)),
    role: 'group',
    'aria-label': title,
    style: { fontFamily: 'var(--cc-font-sans)' },
  },
  h('g', null,
    layout.edges.map((edge, index) => {
      const cx1 = edge.x1 + (edge.x2 - edge.x1) * 0.5
      const d = `M ${edge.x1} ${edge.y1} C ${cx1} ${edge.y1}, ${cx1} ${edge.y2}, ${edge.x2} ${edge.y2}`
      const isError = edge.status === 'blocked' || edge.status === 'failed'
      const isUnknown = edge.status === 'unknown'
      const isWaiting = ['waiting_approval', 'waiting_input', 'attention'].includes(edge.status)
      const target = layout.nodes.find((node) => node.id === edge.targetId)
      const stroke = isError
        ? 'var(--cc-state-blocked)'
        : (isUnknown ? 'var(--cc-state-unknown)' : (isWaiting ? 'var(--cc-state-attention)' : branchStroke(edge.branchIndex)))
      return h('path', {
        key: index,
        d,
        fill: 'none',
        stroke,
        strokeDasharray: (isError || isUnknown || isWaiting) ? '5 4' : undefined,
        strokeOpacity: 0.9,
        strokeWidth: Math.max(1.1, 2.2 - Math.max(0, (target?.depth || 1) - 1) * 0.4),
      })
    }),
    layout.nodes.map((node) => {
      const liveTask = matchMindmapTask(node, tasks)
      const liveStatus = liveTask ? (liveTask.viewState || liveTask.state) : node.status
      const linkedTaskId = liveTask?.taskId || node.taskId || null
      const stroke = nodeStrokeColor(node, liveStatus)
      const isRoot = node.depth === 0
      const isRunning = ['running', 'waiting_input', 'waiting_approval'].includes(liveStatus)
      const isDone = liveStatus === 'done' || liveStatus === 'completed'
      const isBlocked = liveStatus === 'blocked' || liveStatus === 'failed'
      const boxed = (!node.isLeaf && (isRoot || node.depth === 1)) || Boolean(liveTask)
      const fontSize = layout.fontSize
      const lineHeight = layout.lineHeight || Math.round(fontSize * 1.4)
      const toggleWidth = node.collapsed ? Math.max(32, String(node.hiddenCount || 0).length * 10 + 18) : 24
      const canJump = Boolean(linkedTaskId && typeof onJumpTask === 'function')
      const canAnnotate = typeof onSelectNode === 'function'
      const interactive = canJump || canAnnotate
      const onNodeClick = (event) => {
        if (!interactive) return
        event.stopPropagation()
        if (event.shiftKey && canAnnotate) {
          onSelectNode({ id: node.id, label: node.fullLabel || node.label, taskId: linkedTaskId })
          return
        }
        if (canJump) onJumpTask(linkedTaskId)
        else if (canAnnotate) onSelectNode({ id: node.id, label: node.fullLabel || node.label, taskId: linkedTaskId })
      }
      const cls = [
        interactive ? 'concerto-battle-node--interactive' : '',
        isRunning ? 'concerto-battle-node--running' : '',
        isDone ? 'concerto-battle-node--done' : '',
        isBlocked ? 'concerto-battle-node--blocked' : '',
      ].filter(Boolean).join(' ')
      return h('g', {
        key: node.id,
        className: cls || undefined,
        'data-concerto-mm-node': node.id,
        'data-task-id': linkedTaskId || undefined,
        'data-status': liveStatus || undefined,
        transform: `translate(${node.x}, ${node.y})`,
        onClick: interactive ? onNodeClick : undefined,
      },
      h('title', null, (node.fullLabel || node.label) + (linkedTaskId ? ` · ${linkedTaskId}（${liveStatus || 'pending'}，点击查看任务）` : (canAnnotate ? '（点击指图下指令）' : ''))),
      h('rect', {
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: 8,
        fill: boxed ? (isRoot ? 'var(--cc-accent-soft)' : 'var(--cc-card-bg)') : 'transparent',
        stroke: boxed ? stroke : 'none',
        strokeWidth: isRunning ? 2 : (boxed ? 1.2 : 0),
      }),
      !isRoot && h('rect', { x: 0, y: 4, width: 3, height: Math.max(0, node.height - 8), rx: 1.5, fill: stroke }),
      node.isLeaf && h('line', { x1: -10, y1: node.height / 2, x2: 0, y2: node.height / 2, stroke, strokeWidth: 1.2 }),
      node.lines.map((line, lineIndex) => h('text', {
        key: lineIndex,
        x: node.isLeaf ? 8 : 18,
        y: Math.round((node.height - node.lines.length * lineHeight) / 2 + fontSize + lineIndex * lineHeight),
        fill: isRoot ? 'var(--cc-accent-text)' : 'var(--cc-text-primary)',
        fontSize,
        fontWeight: isRoot ? 600 : 500,
      }, line)),
      node.hasChildren && h('g', {
        'data-concerto-mm-toggle': node.id,
        transform: `translate(${node.width}, ${node.height / 2})`,
        style: { cursor: 'pointer' },
        role: 'button',
        tabIndex: 0,
        'aria-label': `${node.collapsed ? '展开' : '收起'}：${node.fullLabel || node.label}`,
        'aria-expanded': !node.collapsed,
        onKeyDown: (event) => {
          if (event.key === ' ') event.preventDefault()
          if (event.key === 'Enter') onToggleNode(node.id, event)
        },
        onKeyUp: (event) => {
          if (event.key === ' ') onToggleNode(node.id, event)
        },
        onClick: (event) => onToggleNode(node.id, event),
      },
      h('circle', { className: 'concerto-mm-hit', cx: 0, cy: 0, r: 12, fill: 'transparent', stroke: 'none' }),
      h('rect', {
        x: -toggleWidth / 2,
        y: -12,
        width: toggleWidth,
        height: 24,
        rx: 12,
        fill: 'var(--cc-card-nested-bg)',
        stroke,
        strokeWidth: 1,
      }),
      h('text', {
        x: 0,
        y: 3.5,
        textAnchor: 'middle',
        fill: 'var(--cc-text-secondary)',
        fontSize: Math.max(10, Math.round(fontSize - 1)),
        fontWeight: 500,
      }, node.collapsed ? `+${node.hiddenCount}` : '−')))
    })))
}
