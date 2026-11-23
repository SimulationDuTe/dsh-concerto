import React from 'react'
import { h } from '../../api.js'

function branchStroke(branchIndex) {
  return `var(--cc-branch-${Math.abs(branchIndex || 0) % 4 + 1})`
}

function nodeStrokeColor(node) {
  if (node.status === 'blocked' || node.status === 'failed') return 'var(--cc-state-blocked)'
  if (node.status === 'unknown') return 'var(--cc-state-unknown)'
  return node.depth === 0 ? 'var(--cc-border-strong)' : branchStroke(node.branchIndex)
}

export function MarkmapSvgDocument({ layout, title, svgRef, onToggleNode }) {
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
      const stroke = nodeStrokeColor(node)
      const isRoot = node.depth === 0
      const boxed = !node.isLeaf && (isRoot || node.depth === 1)
      const fontSize = layout.fontSize
      const lineHeight = layout.lineHeight || Math.round(fontSize * 1.4)
      const toggleWidth = node.collapsed ? Math.max(32, String(node.hiddenCount || 0).length * 10 + 18) : 24
      return h('g', {
        key: node.id,
        'data-concerto-mm-node': node.id,
        transform: `translate(${node.x}, ${node.y})`,
      },
      h('title', null, node.fullLabel || node.label),
      h('rect', {
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: 8,
        fill: boxed ? (isRoot ? 'var(--cc-accent-soft)' : 'var(--cc-card-bg)') : 'transparent',
        stroke: boxed ? stroke : 'none',
        strokeWidth: boxed ? 1.2 : 0,
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
