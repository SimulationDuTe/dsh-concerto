/**
 * Deterministic layout & projection helpers for Concerto structured view objects.
 *
 * Shared across Node runtime/validation and bundled browser client (via esbuild)
 * so geometry stays single-sourced across static SVG previews, interactive SVG
 * canvases, Markmap trees, and Excalidraw scenes.
 */
import dagre from '@dagrejs/dagre'

export const DEPTH_PALETTE = Object.freeze(['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777'])

export const STATUS_TOKENS = Object.freeze({
  done: Object.freeze({ color: '#34d399', label: '已完成', icon: '✓' }),
  completed: Object.freeze({ color: '#34d399', label: '已完成', icon: '✓' }),
  running: Object.freeze({ color: '#2dd4bf', label: '进行中', icon: '⟳' }),
  in_progress: Object.freeze({ color: '#2dd4bf', label: '进行中', icon: '⟳' }),
  attention: Object.freeze({ color: '#f59e0b', label: '待处理', icon: '●' }),
  waiting_approval: Object.freeze({ color: '#f59e0b', label: '等待审批', icon: '●' }),
  waiting_input: Object.freeze({ color: '#f59e0b', label: '等待回答', icon: '●' }),
  cancelling: Object.freeze({ color: '#f59e0b', label: '取消中', icon: '◌' }),
  review: Object.freeze({ color: '#a78bfa', label: '待验收', icon: '◐' }),
  blocked: Object.freeze({ color: '#fb7185', label: '阻塞', icon: '!' }),
  failed: Object.freeze({ color: '#fb7185', label: '失败', icon: '!' }),
  unknown: Object.freeze({ color: '#94a3b8', label: '未知', icon: '?' }),
  pending: Object.freeze({ color: '#64748b', label: '待办', icon: '○' }),
  idle: Object.freeze({ color: '#64748b', label: '空闲', icon: '○' }),
})

/** Split a label into up to `maxLines` lines of width `maxChars`, appending ellipsis if truncated. */
export function wrapLabel(text, maxChars = 16, maxLines = 3) {
  const s = String(text ?? '').trim()
  if (!s) return ['']
  const lines = []
  let line = ''
  for (const ch of s) {
    if (line.length >= maxChars) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const last = kept[maxLines - 1]
  kept[maxLines - 1] = last.length > 1 ? last.slice(0, maxChars - 1) + '…' : '…'
  return kept
}

export function approxLineWidth(line, fontSize = 13) {
  const fs = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 13
  let width = 0
  for (const ch of String(line ?? '')) {
    const code = ch.charCodeAt(0)
    // CJK / full-width characters need slightly more than 1em; uppercase/digits need ~0.64em
    if (code > 255) width += fs * 1.04
    else if (/[A-Z0-9MW@#%&]/.test(ch)) width += fs * 0.68
    else width += fs * 0.56
  }
  return width
}

function assignDeterministicIds(node, pathId = 'root') {
  if (!node || typeof node !== 'object') return null
  const id = node.id || pathId
  const children = Array.isArray(node.children)
    ? node.children.map((c, idx) => assignDeterministicIds(c, `${id}.${idx}`)).filter(Boolean)
    : []
  return { ...node, id, children }
}

export function normalizeMindmapTree(root) {
  return assignDeterministicIds(root, 'root')
}

/**
 * Convert a mindmap tree (`root` or `markdown`) into full hierarchical `diagram` data
 * (`nodes` + `edges`) without losing any descendant levels.
 */
export function mindmapToDiagramData(data, fallbackTitle = '思维导图') {
  const raw = data?.root
    ? data.root
    : (typeof data?.markdown === 'string' && data.markdown.trim() !== ''
        ? parseMarkdownToMindmap(data.markdown)
        : null)
  const norm = normalizeMindmapTree(raw || { id: 'root', label: String(fallbackTitle || '思维导图'), children: [] })
  const nodes = []
  const edges = []
  const usedIds = new Set()

  function allocId(preferred) {
    let candidate = String(preferred || 'n')
    let n = 1
    while (usedIds.has(candidate)) {
      candidate = `${preferred}-${++n}`
    }
    usedIds.add(candidate)
    return candidate
  }

  function walk(node, parentId, depth) {
    const id = allocId(node.id || 'root')
    nodes.push({
      id,
      label: String(node.label ?? id),
      ...(node.status ? { status: node.status } : {}),
      ...(node.taskId ? { taskId: node.taskId } : {}),
      ...(node.executionId ? { executionId: node.executionId } : {}),
      ...(node.memberId ? { memberId: node.memberId } : {}),
      ...(depth === 0 ? { critical: true } : {}),
    })
    if (parentId) {
      edges.push({ from: parentId, to: id })
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, id, depth + 1)
    }
  }

  walk(norm, null, 0)
  return { layout: data?.layout || 'dag', nodes, edges }
}

function countSubtreeDescendants(node) {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) return 0
  let total = 0
  for (const c of node.children) {
    total += 1 + countSubtreeDescendants(c)
  }
  return total
}

export function countMindmapNodes(root) {
  if (!root || typeof root !== 'object') return 0
  return 1 + countSubtreeDescendants(root)
}

export function defaultPreviewCollapsedIds(root, thresholdNodes = 8, maxOpenDepth = 1) {
  const norm = normalizeMindmapTree(root)
  if (!norm || countMindmapNodes(norm) <= thresholdNodes) return []
  const folded = []
  function walk(node, depth) {
    if (!Array.isArray(node.children) || node.children.length === 0) return
    if (depth >= maxOpenDepth) {
      folded.push(node.id)
      return
    }
    for (const c of node.children) walk(c, depth + 1)
  }
  walk(norm, 0)
  return folded
}

/**
 * Parse concise Markdown (# / ## / - lists) into a hierarchical mindmap tree.
 */
export function parseMarkdownToMindmap(markdown) {
  const lines = String(markdown ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, '  '))
    .filter((l) => l.trim() !== '')

  if (lines.length === 0) return null

  const root = { id: 'root', label: '中心主题', children: [] }
  const headingStack = [{ depth: 0, node: root }]
  const bulletStack = []
  let autoId = 0

  for (const raw of lines) {
    const trimmed = raw.trim()
    const hMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (hMatch) {
      const level = hMatch[1].length
      const label = hMatch[2].trim()
      if (level === 1 && root.children.length === 0 && root.label === '中心主题') {
        root.label = label
        headingStack.length = 1
        headingStack[0] = { depth: 1, node: root }
        bulletStack.length = 0
        continue
      }
      while (headingStack.length > 1 && headingStack[headingStack.length - 1].depth >= level) {
        headingStack.pop()
      }
      const parent = headingStack[headingStack.length - 1].node
      const node = { id: `n-${++autoId}`, label, children: [] }
      parent.children.push(node)
      headingStack.push({ depth: level, node })
      bulletStack.length = 0
      continue
    }

    const bMatch = /^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/.exec(raw)
    if (bMatch) {
      const indent = bMatch[1].length
      const label = bMatch[2].trim()
      while (bulletStack.length > 0 && bulletStack[bulletStack.length - 1].indent >= indent) {
        bulletStack.pop()
      }
      const parent = bulletStack.length > 0
        ? bulletStack[bulletStack.length - 1].node
        : headingStack[headingStack.length - 1].node
      const node = { id: `n-${++autoId}`, label, children: [] }
      parent.children.push(node)
      bulletStack.push({ indent, node })
      continue
    }

    if (root.children.length === 0 && root.label === '中心主题') {
      root.label = trimmed
    } else {
      const parent = headingStack[headingStack.length - 1].node
      parent.children.push({ id: `n-${++autoId}`, label: trimmed, children: [] })
    }
  }

  return root
}

/**
 * Compute deterministic Mindmap tree geometry (nodes + cubic Bezier edges).
 */
export function layoutMindmapTree(root, collapsedIds = new Set(), options = {}) {
  const normRoot = normalizeMindmapTree(root)
  if (!normRoot) return { nodes: [], edges: [], width: 0, height: 0, hiddenDescendantTotal: 0 }
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : 12.5
  const lineHeight = Math.round(fontSize * 1.4)
  const maxChars = fontSize >= 15 ? 15 : 18
  const X_GAP = 62
  const Y_GAP = 14
  const nodes = []
  const edges = []
  let hiddenDescendantTotal = 0

  function measure(node, depth, branchHueIdx) {
    const id = node.id
    const fullLabel = String(node.label ?? id)
    const lines = wrapLabel(fullLabel, maxChars, 3)
    const textW = Math.max(48, ...lines.map((l) => approxLineWidth(l, depth === 0 ? fontSize + 0.5 : fontSize)))
    const rawChildren = Array.isArray(node.children) ? node.children : []
    const collapsed = rawChildren.length > 0 && collapsedIds.has(id)
    const hiddenCount = collapsed ? countSubtreeDescendants(node) : 0
    if (collapsed) hiddenDescendantTotal += hiddenCount
    const badgeSpace = collapsed ? 36 : 0
    const width = Math.max(96, Math.min(280, Math.round(textW + 32 + badgeSpace)))
    const height = Math.max(34, lines.length * lineHeight + 14)
    const children = collapsed
      ? []
      : rawChildren.map((c, idx) => measure(c, depth + 1, depth === 0 ? idx : branchHueIdx))
    const childrenHeight = children.reduce((sum, c) => sum + c.subtreeHeight, 0) + Math.max(0, children.length - 1) * Y_GAP
    const subtreeHeight = Math.max(height, childrenHeight)
    return {
      id,
      label: fullLabel,
      fullLabel,
      lines,
      depth,
      branchIndex: depth === 0 ? 0 : branchHueIdx,
      width,
      height,
      subtreeHeight,
      collapsed,
      hasChildren: rawChildren.length > 0,
      childCount: rawChildren.length,
      hiddenCount,
      status: node.status,
      taskId: node.taskId,
      executionId: node.executionId,
      memberId: node.memberId,
      children,
    }
  }

  const measured = measure(normRoot, 0, 0)

  function place(item, x, topY) {
    const centerY = topY + item.subtreeHeight / 2
    const y = centerY - item.height / 2
    nodes.push({
      id: item.id,
      label: item.label,
      fullLabel: item.fullLabel,
      lines: item.lines,
      depth: item.depth,
      branchIndex: item.branchIndex,
      x,
      y,
      width: item.width,
      height: item.height,
      centerY,
      collapsed: item.collapsed,
      hasChildren: item.hasChildren,
      childCount: item.childCount,
      hiddenCount: item.hiddenCount,
      status: item.status,
      taskId: item.taskId,
      executionId: item.executionId,
      memberId: item.memberId,
    })
    if (item.children.length > 0) {
      const childX = x + item.width + X_GAP
      const totalH = item.children.reduce((s, c) => s + c.subtreeHeight, 0) + (item.children.length - 1) * Y_GAP
      let childTop = centerY - totalH / 2
      for (const child of item.children) {
        const childCenterY = childTop + child.subtreeHeight / 2
        edges.push({
          from: item.id,
          to: child.id,
          x1: x + item.width,
          y1: centerY,
          x2: childX,
          y2: childCenterY,
          depth: child.depth,
          branchIndex: child.branchIndex,
          status: child.status,
        })
        place(child, childX, childTop)
        childTop += child.subtreeHeight + Y_GAP
      }
    }
  }

  place(measured, 20, 20)
  const maxX = Math.max(280, ...nodes.map((n) => n.x + n.width + 32))
  const maxY = Math.max(140, ...nodes.map((n) => n.y + n.height + 24))
  return { nodes, edges, width: maxX, height: maxY, hiddenDescendantTotal, lineHeight, fontSize }
}

function buildRoundedOrthogonalPath(x1, y1, x2, y2, direction = 'LR') {
  const dx = x2 - x1
  const dy = y2 - y1
  if (Math.abs(dy) < 2 && direction !== 'TB') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  if (Math.abs(dx) < 2 && direction === 'TB') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  const r = 8
  if (direction === 'TB') {
    const midY = (y1 + y2) / 2
    const sx = dx >= 0 ? 1 : -1
    const sy = dy >= 0 ? 1 : -1
    const rx = Math.min(r, Math.abs(dx) / 2)
    const ry = Math.min(r, Math.abs(dy) / 2)
    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - sy * ry}`,
      `Q ${x1} ${midY} ${x1 + sx * rx} ${midY}`,
      `L ${x2 - sx * rx} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + sy * ry}`,
      `L ${x2} ${y2}`,
    ].join(' ')
  }
  const midX = (x1 + x2) / 2
  const sx = dx >= 0 ? 1 : -1
  const sy = dy >= 0 ? 1 : -1
  const rx = Math.min(r, Math.abs(dx) / 2)
  const ry = Math.min(r, Math.abs(dy) / 2)
  return [
    `M ${x1} ${y1}`,
    `L ${midX - sx * rx} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1 + sy * ry}`,
    `L ${midX} ${y2 - sy * ry}`,
    `Q ${midX} ${y2} ${midX + sx * rx} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ')
}

function pointsToRoundedPath(points) {
  if (!Array.isArray(points) || points.length < 2) return ''
  if (points.length === 2) {
    return buildRoundedOrthogonalPath(points[0].x, points[0].y, points[1].x, points[1].y, 'LR')
  }
  let d = `M ${Math.round(points[0].x)} ${Math.round(points[0].y)}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const v1x = curr.x - prev.x
    const v1y = curr.y - prev.y
    const v2x = next.x - curr.x
    const v2y = next.y - curr.y
    const l1 = Math.hypot(v1x, v1y) || 1
    const l2 = Math.hypot(v2x, v2y) || 1
    const r = Math.min(8, l1 / 3, l2 / 3)
    const p1x = curr.x - (v1x / l1) * r
    const p1y = curr.y - (v1y / l1) * r
    const p2x = curr.x + (v2x / l2) * r
    const p2y = curr.y + (v2y / l2) * r
    d += ` L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`
  }
  const last = points[points.length - 1]
  d += ` L ${Math.round(last.x)} ${Math.round(last.y)}`
  return d
}

function topologicalLayers(nodeSpecs, rawEdges) {
  const inDeg = new Map(nodeSpecs.map((n) => [n.id, 0]))
  const adj = new Map(nodeSpecs.map((n) => [n.id, []]))
  for (const e of rawEdges) {
    if (adj.has(e.from) && inDeg.has(e.to)) {
      adj.get(e.from).push(e.to)
      inDeg.set(e.to, inDeg.get(e.to) + 1)
    }
  }
  const layerOf = new Map(nodeSpecs.map((n) => [n.id, 0]))
  const queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([id]) => id)
  const visited = new Set()
  while (queue.length > 0) {
    const curr = queue.shift()
    visited.add(curr)
    const baseLayer = layerOf.get(curr) ?? 0
    for (const next of adj.get(curr) || []) {
      layerOf.set(next, Math.max(layerOf.get(next) ?? 0, baseLayer + 1))
      inDeg.set(next, inDeg.get(next) - 1)
      if (inDeg.get(next) <= 0 && !visited.has(next)) queue.push(next)
    }
  }
  return layerOf
}

function classifyEdgeSemantic(edge, fromNode, toNode, isCrit) {
  const errStates = new Set(['blocked', 'failed', 'error'])
  if (edge.kind === 'error' || errStates.has(edge.status) || errStates.has(fromNode?.status) || errStates.has(toNode?.status)) {
    return 'blocked'
  }
  if (edge.kind === 'unknown' || edge.status === 'unknown' || toNode?.status === 'unknown') {
    return 'unknown'
  }
  if (isCrit || edge.kind === 'critical' || toNode?.status === 'running' || toNode?.status === 'in_progress') {
    return 'critical'
  }
  return 'default'
}

/**
 * Deterministic layout for diagram objects (`dag` | `timeline` | `radial` | `swimlane`).
 */
export function layoutDiagram(data, options = {}) {
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const rawEdges = Array.isArray(data?.edges) ? data.edges : []
  const layout = options.layout || data?.layout || 'dag'
  const direction = options.direction || data?.layoutHints?.direction || 'LR'
  const userOffsets = options.userOffsets && typeof options.userOffsets === 'object' ? options.userOffsets : {}
  const criticalNodes = new Set(Array.isArray(options.criticalPath) ? options.criticalPath : [])
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : 12.5
  const lineHeight = Math.round(fontSize * 1.38)
  const maxChars = fontSize >= 15 ? 14 : 16

  if (rawNodes.length === 0) return { nodes: [], edges: [], lanes: [], width: 320, height: 180, direction, fontSize, lineHeight }

  const hasEdgeLabels = rawEdges.some((e) => typeof e?.label === 'string' && e.label.trim() !== '')
  const maxEdgeLabelW = hasEdgeLabels
    ? Math.max(0, ...rawEdges.map((e) => (e?.label ? approxLineWidth(e.label, Math.max(10, fontSize - 2)) + 20 : 0)))
    : 0

  const nodeSpecs = rawNodes.map((n) => {
    const fullLabel = String(n.label ?? n.id)
    const lines = wrapLabel(fullLabel, maxChars, 3)
    const maxW = Math.max(52, ...lines.map((l) => approxLineWidth(l, fontSize)))
    const statusSpace = n.status ? 46 : 10
    const width = Math.max(114, Math.min(264, Math.round(Math.max(maxW + 32, maxW + statusSpace * 0.5 + 24))))
    const height = Math.max(44, lines.length * lineHeight + (n.status ? 26 : 18))
    return {
      ...n,
      fullLabel,
      lines,
      width,
      height,
      critical: Boolean(n.critical) || criticalNodes.has(n.id),
    }
  })

  const positioned = new Map()
  const lanes = []
  let dagreEdgePoints = new Map()

  if (layout === 'timeline') {
    let cursorX = 28
    const yBase = 48
    const stepGap = Math.max(58, Math.round(maxEdgeLabelW + 18))
    for (let i = 0; i < nodeSpecs.length; i += 1) {
      const n = nodeSpecs[i]
      positioned.set(n.id, { ...n, x: cursorX, y: yBase + (i % 2 === 0 ? 0 : 14) })
      cursorX += n.width + stepGap
    }
  } else if (layout === 'radial') {
    const [center, ...outer] = nodeSpecs
    const cx = 260
    const cy = 200
    positioned.set(center.id, { ...center, x: cx - center.width / 2, y: cy - center.height / 2 })
    const radius = Math.max(145, outer.length * 26)
    outer.forEach((n, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(1, outer.length) - Math.PI / 2
      const nx = cx + Math.cos(angle) * radius - n.width / 2
      const ny = cy + Math.sin(angle) * radius - n.height / 2
      positioned.set(n.id, { ...n, x: nx, y: ny })
    })
  } else if (layout === 'swimlane') {
    const layerOf = topologicalLayers(nodeSpecs, rawEdges)
    const laneNames = []
    const byLane = new Map()
    for (const n of nodeSpecs) {
      const laneKey = String(n.lane || n.memberId || n.assignee || '共享泳道')
      if (!byLane.has(laneKey)) {
        laneNames.push(laneKey)
        byLane.set(laneKey, [])
      }
      byLane.get(laneKey).push(n)
    }

    const colWidths = new Map()
    for (const n of nodeSpecs) {
      const col = Number.isInteger(n.stage) ? n.stage : (layerOf.get(n.id) ?? 0)
      colWidths.set(col, Math.max(colWidths.get(col) ?? 120, n.width))
    }
    const sortedCols = [...colWidths.keys()].sort((a, b) => a - b)
    const colX = new Map()
    const colGap = Math.max(60, Math.round(maxEdgeLabelW + 16))
    let curX = 160
    for (const col of sortedCols) {
      colX.set(col, curX)
      curX += (colWidths.get(col) ?? 120) + colGap
    }

    let curY = 24
    const LANE_PAD = 18
    for (let li = 0; li < laneNames.length; li += 1) {
      const laneId = laneNames[li]
      const laneNodes = byLane.get(laneId)
      const byCol = new Map()
      for (const n of laneNodes) {
        const col = Number.isInteger(n.stage) ? n.stage : (layerOf.get(n.id) ?? 0)
        if (!byCol.has(col)) byCol.set(col, [])
        byCol.get(col).push(n)
      }
      let maxStackH = 56
      for (const stack of byCol.values()) {
        const stackH = stack.reduce((s, item) => s + item.height, 0) + Math.max(0, stack.length - 1) * 16
        maxStackH = Math.max(maxStackH, stackH)
      }
      const laneH = maxStackH + LANE_PAD * 2
      const firstMember = laneNodes.find((n) => n.memberId)?.memberId || null
      lanes.push({ id: laneId, label: laneId, memberId: firstMember, index: li, y: curY, height: laneH, width: Math.max(420, curX + 28) })

      for (const [col, stack] of byCol.entries()) {
        let itemY = curY + LANE_PAD
        const xBase = colX.get(col) ?? 160
        for (const n of stack) {
          positioned.set(n.id, { ...n, x: xBase, y: itemY })
          itemY += n.height + 16
        }
      }
      curY += laneH + 10
    }
  } else {
    // DAG via @dagrejs/dagre with crossing minimization
    let usedDagre = false
    const ranksep = Math.max(hasEdgeLabels ? 98 : 72, Math.round(maxEdgeLabelW + 34))
    const nodesep = hasEdgeLabels ? 42 : 32
    if (dagre && typeof dagre.layout === 'function' && dagre.graphlib?.Graph) {
      try {
        const g = new dagre.graphlib.Graph({ multigraph: false })
        g.setGraph({ rankdir: direction === 'TB' ? 'TB' : 'LR', nodesep, ranksep, marginx: 28, marginy: 28 })
        g.setDefaultEdgeLabel(() => ({}))
        for (const n of nodeSpecs) {
          g.setNode(n.id, { width: n.width, height: n.height })
        }
        for (const e of rawEdges) {
          if (positioned.has(e.from) || nodeSpecs.some((n) => n.id === e.from)) {
            if (nodeSpecs.some((n) => n.id === e.to)) g.setEdge(e.from, e.to)
          }
        }
        dagre.layout(g)
        for (const n of nodeSpecs) {
          const layoutNode = g.node(n.id)
          if (layoutNode && Number.isFinite(layoutNode.x) && Number.isFinite(layoutNode.y)) {
            positioned.set(n.id, {
              ...n,
              x: Math.round(layoutNode.x - n.width / 2),
              y: Math.round(layoutNode.y - n.height / 2),
            })
          }
        }
        for (const e of rawEdges) {
          const edgeObj = g.edge(e.from, e.to)
          if (edgeObj && Array.isArray(edgeObj.points)) {
            dagreEdgePoints.set(`${e.from}->${e.to}`, edgeObj.points)
          }
        }
        usedDagre = positioned.size === nodeSpecs.length
      } catch {
        usedDagre = false
      }
    }

    if (!usedDagre) {
      const layerOf = topologicalLayers(nodeSpecs, rawEdges)
      const layers = new Map()
      for (const n of nodeSpecs) {
        const l = layerOf.get(n.id) ?? 0
        if (!layers.has(l)) layers.set(l, [])
        layers.get(l).push(n)
      }
      let cursorX = 28
      const sortedLayers = [...layers.keys()].sort((a, b) => a - b)
      for (const l of sortedLayers) {
        const col = layers.get(l)
        const colWidth = Math.max(...col.map((n) => n.width))
        let cursorY = 28
        for (const n of col) {
          positioned.set(n.id, { ...n, x: cursorX, y: cursorY })
          cursorY += n.height + 26
        }
        cursorX += colWidth + Math.max(72, Math.round(maxEdgeLabelW + 24))
      }
    }
  }

  // Apply userOffsets cleanly on top of automatic layout
  for (const [id, node] of positioned.entries()) {
    const off = userOffsets[id]
    if (off && Number.isFinite(off.dx) && Number.isFinite(off.dy)) {
      node.x += off.dx
      node.y += off.dy
    }
  }

  const nodes = [...positioned.values()]
  const minX = Math.min(0, ...nodes.map((n) => n.x - 24))
  const minY = Math.min(0, ...nodes.map((n) => n.y - 24))
  if (minX < 0 || minY < 0) {
    for (const n of nodes) {
      n.x -= minX
      n.y -= minY
    }
    for (const lane of lanes) lane.y -= minY
  }

  const hasUserOffsets = Object.keys(userOffsets).length > 0
  const edges = rawEdges
    .map((e) => {
      const from = positioned.get(e.from)
      const to = positioned.get(e.to)
      if (!from || !to) return null
      const rightToLeft = from.x + from.width <= to.x
      const downFlow = direction === 'TB' && from.y + from.height <= to.y
      let x1, y1, x2, y2
      if (downFlow) {
        x1 = from.x + from.width / 2
        y1 = from.y + from.height
        x2 = to.x + to.width / 2
        y2 = to.y
      } else if (rightToLeft) {
        x1 = from.x + from.width
        y1 = from.y + from.height / 2
        x2 = to.x
        y2 = to.y + to.height / 2
      } else {
        x1 = from.x + from.width / 2
        y1 = from.y + from.height
        x2 = to.x + to.width / 2
        y2 = to.y
      }
      const dagPoints = !hasUserOffsets && layout === 'dag' ? dagreEdgePoints.get(`${e.from}->${e.to}`) : null
      const path = dagPoints && dagPoints.length >= 2
        ? pointsToRoundedPath([{ x: x1, y: y1 }, ...dagPoints.slice(1, -1), { x: x2, y: y2 }])
        : buildRoundedOrthogonalPath(x1, y1, x2, y2, downFlow ? 'TB' : 'LR')
      const isCrit = Boolean(e.critical) || (Boolean(from.critical) && Boolean(to.critical))
      const semantic = classifyEdgeSemantic(e, from, to, isCrit)
      const labelWidth = e.label ? Math.round(approxLineWidth(e.label, Math.max(10, fontSize - 2)) + 16) : 0
      return {
        ...e,
        x1: Math.round(x1),
        y1: Math.round(y1),
        x2: Math.round(x2),
        y2: Math.round(y2),
        path,
        midX: Math.round((x1 + x2) / 2),
        midY: Math.round((y1 + y2) / 2),
        critical: isCrit,
        semantic,
        labelWidth,
      }
    })
    .filter(Boolean)

  const width = Math.max(340, ...nodes.map((n) => n.x + n.width + 32), ...lanes.map((l) => l.width))
  const height = Math.max(190, ...nodes.map((n) => n.y + n.height + 32), ...lanes.map((l) => l.y + l.height + 16))
  return { nodes, edges, lanes, width, height, direction, fontSize, lineHeight }
}

/**
 * Convert diagram / mindmap / board objects into valid Excalidraw v2 JSON elements,
 * complete with `boundElements` & arrow `startBinding` / `endBinding`.
 */
export function objectToExcalidrawScene(obj, options = {}) {
  const userOffsets = options.userOffsets ?? obj?.userLayout?.offsets ?? {}
  if ((obj?.type === 'board' || obj?.type === 'diagram') && obj?.data?.excalidrawScene && Array.isArray(obj.data.excalidrawScene.elements)) {
    return structuredClone({
      type: 'excalidraw',
      version: 2,
      source: 'https://concerto.local/excalidraw',
      appState: { viewBackgroundColor: '#ffffff', gridSize: 20, ...(obj.data.excalidrawScene.appState ?? {}) },
      files: obj.data.excalidrawScene.files ?? {},
      ...obj.data.excalidrawScene,
    })
  }

  let nodes = []
  let edges = []
  if (obj?.type === 'mindmap') {
    const mm = layoutMindmapTree(obj.data?.root || parseMarkdownToMindmap(obj.data?.markdown))
    nodes = mm.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      x: n.x + (userOffsets[n.id]?.dx || 0),
      y: n.y + (userOffsets[n.id]?.dy || 0),
      width: n.width,
      height: n.height,
    }))
    edges = mm.edges.map((e) => ({ from: e.from, to: e.to, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }))
  } else {
    const diag = layoutDiagram(obj?.data, { userOffsets })
    nodes = diag.nodes
    edges = diag.edges
  }

  const elements = []
  const now = Date.now()
  const rectByNodeId = new Map()
  const rectBound = new Map()

  nodes.forEach((n, idx) => {
    const rectId = `node-${n.id}`
    const textId = `label-${n.id}`
    rectByNodeId.set(n.id, rectId)
    rectBound.set(rectId, [{ id: textId, type: 'text' }])
    const fillMap = {
      done: '#dcfce7',
      completed: '#dcfce7',
      in_progress: '#ccfbf1',
      running: '#ccfbf1',
      blocked: '#ffe4e6',
      failed: '#ffe4e6',
      review: '#ede9fe',
      attention: '#fef3c7',
    }
    elements.push({
      id: rectId,
      type: 'rectangle',
      x: Math.round(n.x),
      y: Math.round(n.y),
      width: Math.round(n.width),
      height: Math.round(n.height),
      angle: 0,
      strokeColor: '#1e293b',
      backgroundColor: fillMap[n.status] || '#e0f2fe',
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      seed: 100 + idx,
      version: 1,
      versionNonce: 100 + idx,
      isDeleted: false,
      boundElements: rectBound.get(rectId),
      updated: now,
      roundness: { type: 3 },
      customData: { nodeId: n.id, status: n.status || 'pending' },
    })
    elements.push({
      id: textId,
      type: 'text',
      x: Math.round(n.x + 10),
      y: Math.round(n.y + n.height / 2 - 9),
      width: Math.max(40, Math.round(n.width - 20)),
      height: 18,
      angle: 0,
      strokeColor: '#0f172a',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      seed: 500 + idx,
      version: 1,
      versionNonce: 500 + idx,
      isDeleted: false,
      containerId: rectId,
      text: String(n.label),
      originalText: String(n.label),
      fontSize: 14,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      updated: now,
    })
  })

  edges.forEach((e, idx) => {
    const arrowId = `edge-${idx}-${e.from}-${e.to}`
    const fromRectId = rectByNodeId.get(e.from) || null
    const toRectId = rectByNodeId.get(e.to) || null
    if (fromRectId) rectBound.get(fromRectId)?.push({ id: arrowId, type: 'arrow' })
    if (toRectId) rectBound.get(toRectId)?.push({ id: arrowId, type: 'arrow' })
    elements.push({
      id: arrowId,
      type: 'arrow',
      x: Math.round(e.x1),
      y: Math.round(e.y1),
      width: Math.abs(Math.round(e.x2 - e.x1)),
      height: Math.abs(Math.round(e.y2 - e.y1)),
      angle: 0,
      strokeColor: '#475569',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1.5,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      seed: 900 + idx,
      version: 1,
      versionNonce: 900 + idx,
      isDeleted: false,
      points: [[0, 0], [Math.round(e.x2 - e.x1), Math.round(e.y2 - e.y1)]],
      startBinding: fromRectId ? { elementId: fromRectId, focus: 0, gap: 4 } : null,
      endBinding: toRectId ? { elementId: toRectId, focus: 0, gap: 4 } : null,
      endArrowhead: 'arrow',
      startArrowhead: null,
      updated: now,
      customData: e.label ? { label: String(e.label) } : undefined,
    })
  })

  return {
    type: 'excalidraw',
    version: 2,
    source: 'https://concerto.local/excalidraw',
    elements,
    appState: { viewBackgroundColor: '#ffffff', gridSize: 20 },
    files: {},
  }
}
