/**
 * 命名结构化对象（table / checklist / mindmap / diagram）的纯校验、局部更新与按需切片逻辑。
 * 零 DSH import，可独立单测。
 *
 * 设计：§9.1–§9.7（ViewSpec 与 Business Facts 分离；类型与 Renderer 分离；按需读写与局部更新）
 */
import { parseMarkdownToMindmap } from './view_layout.mjs'

export const VIEW_OBJECT_TYPES = Object.freeze(['table', 'checklist', 'mindmap', 'diagram', 'board', 'html'])
export const VIEW_RENDERERS = Object.freeze(['html', 'markmap', 'svg', 'excalidraw', 'sandbox-iframe'])
export const VIEW_OBJECT_SIZES = Object.freeze(['s', 'm', 'l'])
export const VIEW_SEMANTIC_KINDS = Object.freeze(['blueprint', 'snapshot', 'live_execution'])

export const DEFAULT_RENDERER = Object.freeze({
  table: 'html',
  checklist: 'html',
  mindmap: 'markmap',
  diagram: 'svg',
  board: 'excalidraw',
  html: 'sandbox-iframe',
})

export const ALLOWED_RENDERERS = Object.freeze({
  table: Object.freeze(['html']),
  checklist: Object.freeze(['html']),
  mindmap: Object.freeze(['markmap', 'svg', 'html', 'excalidraw']),
  diagram: Object.freeze(['svg', 'excalidraw']),
  board: Object.freeze(['excalidraw']),
  html: Object.freeze(['sandbox-iframe']),
})

export const CONCERTO_HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:;"

/** Validate sandboxed HTML/CSS content: strictly forbid scripts, event handlers, and external URLs. */
export function validateSafeHtmlData(data) {
  if (!isPlainObject(data) || !isNonEmptyString(data.html)) {
    return fail('invalid', 'html.data.html must be a non-empty string')
  }
  const html = data.html
  const css = data.css === undefined ? '' : (typeof data.css === 'string' ? data.css : null)
  if (css === null) return fail('invalid', 'html.data.css must be a string when provided')
  if (html.length + css.length > 65536) {
    return fail('invalid', 'html payload exceeds 64 KiB limit')
  }
  const combined = `${html}\n${css}`
  const forbidden = [
    { re: /<\s*script\b/i, reason: '<script> is not permitted in concerto html objects' },
    { re: /<\s*(iframe|frame|object|embed|applet|base|link|meta\s+http-equiv\s*=\s*["']?refresh)\b/i, reason: 'active/nested embedding tags are not permitted in html objects' },
    { re: /\son[a-z]+\s*=/i, reason: 'inline event handlers (on*=) are not permitted in html objects' },
    { re: /(?:href|src|action|formaction|xlink:href)\s*=\s*["']?\s*(?:javascript|vbscript):/i, reason: 'javascript:/vbscript: URIs are not permitted' },
    { re: /(?:src|srcset|poster|background)\s*=\s*["']?\s*(?:https?:)?\/\//i, reason: 'external resource URLs are not permitted under offline CSP' },
    { re: /@import\b/i, reason: '@import rules are not permitted under offline CSP' },
    { re: /url\(\s*["']?\s*(?:https?:)?\/\//i, reason: 'external URL references are not permitted under offline CSP' },
  ]
  for (const rule of forbidden) {
    if (rule.re.test(combined)) return fail('unsafe_html', rule.reason)
  }
  const height = data.height
  if (height !== undefined && (!Number.isFinite(height) || height < 80 || height > 1200)) {
    return fail('invalid', 'html.data.height must be between 80 and 1200')
  }
  return { ok: true, normalizedData: { html, ...(css ? { css } : {}), ...(height !== undefined ? { height: Math.round(height) } : {}) } }
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/
const MAX_MINDMAP_DEPTH = 6
const MAX_MINDMAP_NODES = 120
const MAX_DIAGRAM_NODES = 120

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== ''

function fail(code, detail) {
  return { ok: false, code, detail }
}

function hasLiveTaskLinksInMindmap(node) {
  if (!node || typeof node !== 'object') return false
  if (isNonEmptyString(node.taskId) || isNonEmptyString(node.executionId)) return true
  return Array.isArray(node.children) && node.children.some((c) => hasLiveTaskLinksInMindmap(c))
}

export function resolveSemanticKind(input, normalizedData = null) {
  const explicit = input?.semanticKind ?? normalizedData?.semanticKind ?? input?.data?.semanticKind
  if (explicit !== undefined) {
    if (!VIEW_SEMANTIC_KINDS.includes(explicit)) {
      return fail('invalid', `semanticKind must be ${VIEW_SEMANTIC_KINDS.join(' | ')}`)
    }
    return { ok: true, semanticKind: explicit }
  }
  const d = normalizedData || input?.data || {}
  const hasLinks = (Array.isArray(d.nodes) && d.nodes.some((n) => isNonEmptyString(n?.taskId) || isNonEmptyString(n?.executionId)))
    || (Array.isArray(d.items) && d.items.some((it) => isNonEmptyString(it?.taskId)))
    || hasLiveTaskLinksInMindmap(d.root)
  if (hasLinks) return { ok: true, semanticKind: 'live_execution' }
  if (input?.snapshotAt) return { ok: true, semanticKind: 'snapshot' }
  return { ok: true, semanticKind: 'blueprint' }
}

function validateMindmapNode(node, depth, counter) {
  if (!isPlainObject(node)) return fail('invalid', 'mindmap node must be an object')
  if (!isNonEmptyString(node.label)) return fail('invalid', 'mindmap node.label must be a non-empty string')
  if (node.id !== undefined && !isNonEmptyString(node.id)) return fail('invalid', 'mindmap node.id must be a non-empty string')
  if (node.taskId !== undefined && !isNonEmptyString(node.taskId)) return fail('invalid', 'mindmap node.taskId must be a non-empty string')
  if (node.executionId !== undefined && !isNonEmptyString(node.executionId)) return fail('invalid', 'mindmap node.executionId must be a non-empty string')
  if (depth > MAX_MINDMAP_DEPTH) return fail('invalid', `mindmap depth exceeds ${MAX_MINDMAP_DEPTH}`)
  counter.count += 1
  if (counter.count > MAX_MINDMAP_NODES) return fail('invalid', `mindmap node count exceeds ${MAX_MINDMAP_NODES}`)
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) return fail('invalid', 'mindmap node.children must be an array')
    for (const child of node.children) {
      const checked = validateMindmapNode(child, depth + 1, counter)
      if (!checked.ok) return checked
    }
  }
  return { ok: true }
}

export function resolveRenderer(type, renderer) {
  if (!VIEW_OBJECT_TYPES.includes(type)) {
    return fail('unsupported_type', `unsupported view object type: ${String(type)}`)
  }
  const chosen = renderer ?? DEFAULT_RENDERER[type]
  if (!ALLOWED_RENDERERS[type].includes(chosen)) {
    return fail('unsupported_renderer', `renderer "${String(chosen)}" is not supported for type "${type}"`)
  }
  return { ok: true, renderer: chosen }
}

export function validateViewObjectData(type, data) {
  if (!VIEW_OBJECT_TYPES.includes(type)) {
    return fail('unsupported_type', `unsupported view object type: ${String(type)}`)
  }
  if (!isPlainObject(data)) return fail('invalid', 'data must be an object')

  if (type === 'table') {
    if (!Array.isArray(data.columns) || data.columns.length === 0 || !data.columns.every(isNonEmptyString)) {
      return fail('invalid', 'table.data.columns must be a non-empty string array')
    }
    if (!Array.isArray(data.rows)) return fail('invalid', 'table.data.rows must be an array')
    for (let i = 0; i < data.rows.length; i += 1) {
      const row = data.rows[i]
      if (!Array.isArray(row) || row.length !== data.columns.length) {
        return fail('invalid', `table.data.rows[${i}] length must match columns (${data.columns.length})`)
      }
      for (const cell of row) {
        if (cell !== null && !['string', 'number', 'boolean'].includes(typeof cell)) {
          return fail('invalid', `table.data.rows[${i}] contains non-scalar cell`)
        }
      }
    }
    return { ok: true, normalizedData: structuredClone(data) }
  }

  if (type === 'checklist') {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return fail('invalid', 'checklist.data.items must be a non-empty array')
    }
    for (let i = 0; i < data.items.length; i += 1) {
      const item = data.items[i]
      if (!isPlainObject(item) || !isNonEmptyString(item.label)) {
        return fail('invalid', `checklist.data.items[${i}].label must be a non-empty string`)
      }
      if (item.id !== undefined && !isNonEmptyString(item.id)) {
        return fail('invalid', `checklist.data.items[${i}].id must be a non-empty string`)
      }
      if (item.checked !== undefined && typeof item.checked !== 'boolean') {
        return fail('invalid', `checklist.data.items[${i}].checked must be boolean`)
      }
      if (item.taskId !== undefined && !isNonEmptyString(item.taskId)) {
        return fail('invalid', `checklist.data.items[${i}].taskId must be a non-empty string`)
      }
      if (item.note !== undefined && typeof item.note !== 'string') {
        return fail('invalid', `checklist.data.items[${i}].note must be a string`)
      }
    }
    const items = data.items.map((item, idx) => ({ ...structuredClone(item), id: item.id || `item-${idx + 1}` }))
    return { ok: true, normalizedData: { ...structuredClone(data), items } }
  }

  if (type === 'mindmap') {
    let root = data.root
    if (!root && isNonEmptyString(data.markdown)) {
      root = parseMarkdownToMindmap(data.markdown)
    }
    if (!isPlainObject(root)) return fail('invalid', 'mindmap.data requires root or non-empty markdown')
    const checked = validateMindmapNode(root, 1, { count: 0 })
    if (!checked.ok) return checked
    return { ok: true, normalizedData: { ...structuredClone(data), root: assignNodeIds(structuredClone(root), 'root') } }
  }

  if (type === 'html') {
    return validateSafeHtmlData(data)
  }

  if (type === 'board') {
    if (isPlainObject(data.excalidrawScene)) {
      const scene = data.excalidrawScene
      if (scene.type !== 'excalidraw' || !Array.isArray(scene.elements)) {
        return fail('invalid', 'board.data.excalidrawScene must be { type: "excalidraw", elements: [] }')
      }
      return {
        ok: true,
        normalizedData: {
          excalidrawScene: {
            type: 'excalidraw',
            version: 2,
            elements: structuredClone(scene.elements),
            ...(isPlainObject(scene.appState) ? { appState: structuredClone(scene.appState) } : {}),
            ...(isPlainObject(scene.files) ? { files: structuredClone(scene.files) } : {}),
          },
        },
      }
    }
    if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
      return fail('invalid', 'board.data requires excalidrawScene or non-empty nodes')
    }
  }

  // diagram (and board converted from nodes/edges)
  if (data.excalidrawScene !== undefined) {
    const scene = data.excalidrawScene
    if (!isPlainObject(scene) || scene.type !== 'excalidraw' || !Array.isArray(scene.elements)) {
      return fail('invalid', 'diagram.data.excalidrawScene must be { type: "excalidraw", elements: [] }')
    }
    return { ok: true, normalizedData: structuredClone(data) }
  }
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    return fail('invalid', 'diagram.data.nodes must be a non-empty array')
  }
  if (data.nodes.length > MAX_DIAGRAM_NODES) {
    return fail('invalid', `diagram node count exceeds ${MAX_DIAGRAM_NODES}`)
  }
  if (data.layout !== undefined && !['dag', 'timeline', 'radial', 'swimlane'].includes(data.layout)) {
    return fail('invalid', 'diagram.data.layout must be dag | timeline | radial | swimlane')
  }
  const nodeIds = new Set()
  for (let i = 0; i < data.nodes.length; i += 1) {
    const n = data.nodes[i]
    if (!isPlainObject(n) || !isNonEmptyString(n.id) || !isNonEmptyString(n.label)) {
      return fail('invalid', `diagram.data.nodes[${i}] requires non-empty id and label`)
    }
    nodeIds.add(n.id)
  }
  if (data.edges !== undefined) {
    if (!Array.isArray(data.edges)) return fail('invalid', 'diagram.data.edges must be an array')
    for (let i = 0; i < data.edges.length; i += 1) {
      const e = data.edges[i]
      if (!isPlainObject(e) || !isNonEmptyString(e.from) || !isNonEmptyString(e.to)) {
        return fail('invalid', `diagram.data.edges[${i}] requires from and to`)
      }
      if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
        return fail('invalid', `diagram.data.edges[${i}] references unknown node`)
      }
    }
  }
  return { ok: true, normalizedData: { layout: data.layout || 'dag', nodes: structuredClone(data.nodes), edges: structuredClone(data.edges || []) } }
}

function assignNodeIds(node, fallbackId) {
  node.id = node.id || fallbackId
  if (Array.isArray(node.children)) {
    node.children = node.children.map((c, i) => assignNodeIds(c, `${node.id}.${i}`))
  }
  return node
}

export function validateViewObjectInput(input) {
  if (!isPlainObject(input)) return fail('invalid', 'input must be an object')
  if (typeof input.id !== 'string' || !ID_PATTERN.test(input.id)) {
    return fail('invalid', 'id must match /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/')
  }
  if (!isNonEmptyString(input.title)) return fail('invalid', 'title must be a non-empty string')
  if (input.taskId !== undefined && input.taskId !== null && !isNonEmptyString(input.taskId)) {
    return fail('invalid', 'taskId must be a non-empty string when provided')
  }
  if (input.executionId !== undefined && input.executionId !== null && !isNonEmptyString(input.executionId)) {
    return fail('invalid', 'executionId must be a non-empty string when provided')
  }
  if (input.expectedVersion !== undefined && (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0)) {
    return fail('invalid', 'expectedVersion must be a non-negative integer')
  }
  if (input.editableBy !== undefined && (!Array.isArray(input.editableBy) || !input.editableBy.every(isNonEmptyString))) {
    return fail('invalid', 'editableBy must be a non-empty string array')
  }
  if (input.size !== undefined && !VIEW_OBJECT_SIZES.includes(input.size)) {
    return fail('invalid', 'size must be s | m | l')
  }
  if (input.caption !== undefined && (typeof input.caption !== 'string' || input.caption.length > 240)) {
    return fail('invalid', 'caption must be a string up to 240 characters')
  }
  if (input.layoutHints !== undefined && !isPlainObject(input.layoutHints)) {
    return fail('invalid', 'layoutHints must be a plain object')
  }
  if (input.snapshotAt !== undefined && !isNonEmptyString(input.snapshotAt)) {
    return fail('invalid', 'snapshotAt must be a non-empty ISO timestamp when provided')
  }
  const rend = resolveRenderer(input.type, input.renderer)
  if (!rend.ok) return rend
  const checked = validateViewObjectData(input.type, input.data)
  if (!checked.ok) return checked
  const semantic = resolveSemanticKind(input, checked.normalizedData)
  if (!semantic.ok) return semantic
  return {
    ok: true,
    renderer: rend.renderer,
    semanticKind: semantic.semanticKind,
    normalizedData: checked.normalizedData,
    ...(input.size ? { size: input.size } : {}),
    ...(input.caption !== undefined ? { caption: input.caption.trim() } : {}),
    ...(input.layoutHints ? { layoutHints: structuredClone(input.layoutHints) } : {}),
    ...(input.snapshotAt ? { snapshotAt: input.snapshotAt.trim() } : {}),
  }
}

function validateViewRefEntry(ref, labelPrefix) {
  if (!isPlainObject(ref) || !VIEW_OBJECT_TYPES.includes(ref.type) || typeof ref.id !== 'string' || !ID_PATTERN.test(ref.id)) {
    return fail('invalid', `${labelPrefix} must be { type: ${VIEW_OBJECT_TYPES.join('|')}, id }`)
  }
  if (ref.size !== undefined && !VIEW_OBJECT_SIZES.includes(ref.size)) {
    return fail('invalid', `${labelPrefix}.size must be s | m | l`)
  }
  return { ok: true }
}

export function normalizePublicView(publicView) {
  const summary = typeof publicView?.summary === 'string' ? publicView.summary : ''
  const pinnedRefs = Array.isArray(publicView?.pinnedRefs) ? publicView.pinnedRefs : []
  const sections = Array.isArray(publicView?.sections)
    ? publicView.sections
    : (pinnedRefs.length > 0 ? [{ title: '', refs: pinnedRefs }] : [])
  const resolvedPinned = pinnedRefs.length > 0
    ? pinnedRefs
    : sections.flatMap((s) => (Array.isArray(s?.refs) ? s.refs : []))
  return {
    summary,
    pinnedRefs: resolvedPinned,
    sections,
    updatedAt: publicView?.updatedAt ?? null,
    updatedBy: publicView?.updatedBy ?? null,
  }
}

export function validatePublicViewPatch(input) {
  if (!isPlainObject(input)) return fail('invalid', 'input must be an object')
  if (input.summary === undefined && input.pinnedRefs === undefined && input.sections === undefined) {
    return fail('invalid', 'at least one of summary, pinnedRefs, or sections is required')
  }
  if (input.summary !== undefined && typeof input.summary !== 'string') {
    return fail('invalid', 'summary must be a string')
  }
  if (input.pinnedRefs !== undefined) {
    if (!Array.isArray(input.pinnedRefs)) return fail('invalid', 'pinnedRefs must be an array')
    for (let i = 0; i < input.pinnedRefs.length; i += 1) {
      const checked = validateViewRefEntry(input.pinnedRefs[i], `pinnedRefs[${i}]`)
      if (!checked.ok) return checked
    }
  }
  if (input.sections !== undefined) {
    if (!Array.isArray(input.sections)) return fail('invalid', 'sections must be an array')
    for (let i = 0; i < input.sections.length; i += 1) {
      const sec = input.sections[i]
      if (!isPlainObject(sec) || !Array.isArray(sec.refs)) {
        return fail('invalid', `sections[${i}] must be { title?, refs: [] }`)
      }
      if (sec.title !== undefined && typeof sec.title !== 'string') {
        return fail('invalid', `sections[${i}].title must be a string`)
      }
      for (let j = 0; j < sec.refs.length; j += 1) {
        const checked = validateViewRefEntry(sec.refs[j], `sections[${i}].refs[${j}]`)
        if (!checked.ok) return checked
      }
    }
  }
  return { ok: true }
}

function findAndUpdateNode(root, targetId, updater) {
  if (root.id === targetId) return updater(root)
  if (!Array.isArray(root.children)) return false
  for (let i = 0; i < root.children.length; i += 1) {
    if (findAndUpdateNode(root.children[i], targetId, updater)) return true
  }
  return false
}

function findAndDeleteNode(root, targetId) {
  if (!Array.isArray(root.children)) return false
  const idx = root.children.findIndex((c) => c.id === targetId)
  if (idx >= 0) {
    root.children.splice(idx, 1)
    return true
  }
  return root.children.some((c) => findAndDeleteNode(c, targetId))
}

/**
 * 对已有对象做局部 patch，并返回校验后的新 data。
 */
export function applyViewObjectPatch(existing, patch) {
  if (!isPlainObject(patch)) return fail('invalid', 'patch must be an object')
  if (typeof patch.op !== 'string' || patch.op === '') return fail('invalid', 'op is required')
  const nextData = structuredClone(existing.data)

  if (existing.type === 'table') {
    if (patch.op === 'upsert_rows') {
      if (!Array.isArray(patch.rows) || patch.rows.length === 0) return fail('invalid', 'rows must be a non-empty array')
      for (const row of patch.rows) {
        if (!Array.isArray(row) || row.length !== nextData.columns.length) {
          return fail('invalid', `row length must match columns (${nextData.columns.length})`)
        }
        const key = String(row[0] ?? '')
        const idx = nextData.rows.findIndex((r) => String(r[0] ?? '') === key)
        if (idx >= 0) nextData.rows[idx] = structuredClone(row)
        else nextData.rows.push(structuredClone(row))
      }
    } else if (patch.op === 'delete_rows') {
      if (!Array.isArray(patch.keys) || patch.keys.length === 0) return fail('invalid', 'keys must be a non-empty array')
      const keys = new Set(patch.keys.map(String))
      nextData.rows = nextData.rows.filter((r) => !keys.has(String(r[0] ?? '')))
    } else {
      return fail('invalid', `unsupported table patch op: ${patch.op}`)
    }
    const checked = validateViewObjectData('table', nextData)
    return checked.ok ? { ok: true, data: checked.normalizedData } : checked
  }

  if (existing.type === 'checklist') {
    if (patch.op === 'upsert_items') {
      if (!Array.isArray(patch.items) || patch.items.length === 0) return fail('invalid', 'items must be a non-empty array')
      for (const item of patch.items) {
        if (!isPlainObject(item) || !isNonEmptyString(item.label)) return fail('invalid', 'item.label required')
        const key = item.id || item.label
        const idx = nextData.items.findIndex((it) => (it.id || it.label) === key)
        if (idx >= 0) nextData.items[idx] = { ...nextData.items[idx], ...structuredClone(item), id: nextData.items[idx].id || key }
        else nextData.items.push({ ...structuredClone(item), id: key })
      }
    } else if (patch.op === 'delete_items') {
      if (!Array.isArray(patch.ids) || patch.ids.length === 0) return fail('invalid', 'ids must be a non-empty array')
      const ids = new Set(patch.ids.map(String))
      nextData.items = nextData.items.filter((it) => !ids.has(String(it.id || it.label)))
      if (nextData.items.length === 0) return fail('invalid', 'checklist cannot become empty')
    } else {
      return fail('invalid', `unsupported checklist patch op: ${patch.op}`)
    }
    const checked = validateViewObjectData('checklist', nextData)
    return checked.ok ? { ok: true, data: checked.normalizedData } : checked
  }

  if (existing.type === 'mindmap') {
    if (patch.op === 'upsert_node') {
      if (!isPlainObject(patch.node) || !isNonEmptyString(patch.node.id) || !isNonEmptyString(patch.node.label)) {
        return fail('invalid', 'node.id and node.label are required')
      }
      const updatedExisting = findAndUpdateNode(nextData.root, patch.node.id, (target) => {
        target.label = patch.node.label
        if (Array.isArray(patch.node.children)) target.children = structuredClone(patch.node.children)
        return true
      })
      if (!updatedExisting) {
        const parentId = patch.parentId || nextData.root.id
        const attached = findAndUpdateNode(nextData.root, parentId, (parent) => {
          if (!Array.isArray(parent.children)) parent.children = []
          parent.children.push(structuredClone(patch.node))
          return true
        })
        if (!attached) return fail('not_found', `parent node "${parentId}" not found`)
      }
    } else if (patch.op === 'delete_node') {
      if (!isNonEmptyString(patch.nodeId)) return fail('invalid', 'nodeId required')
      if (patch.nodeId === nextData.root.id) return fail('invalid', 'cannot delete root node')
      if (!findAndDeleteNode(nextData.root, patch.nodeId)) return fail('not_found', `node "${patch.nodeId}" not found`)
    } else {
      return fail('invalid', `unsupported mindmap patch op: ${patch.op}`)
    }
    const checked = validateViewObjectData('mindmap', nextData)
    return checked.ok ? { ok: true, data: checked.normalizedData } : checked
  }

  if (existing.type === 'html' || existing.type === 'board') {
    return fail('invalid', `patch_view_object does not support type ${existing.type}; publish a new version instead`)
  }

  // diagram
  if (patch.op === 'upsert_elements') {
    if (nextData.excalidrawScene) return fail('invalid', 'cannot patch imported excalidrawScene with node/edge ops')
    for (const node of patch.nodes || []) {
      if (!isPlainObject(node) || !isNonEmptyString(node.id) || !isNonEmptyString(node.label)) return fail('invalid', 'node.id and node.label required')
      const idx = nextData.nodes.findIndex((n) => n.id === node.id)
      if (idx >= 0) nextData.nodes[idx] = { ...nextData.nodes[idx], ...structuredClone(node) }
      else nextData.nodes.push(structuredClone(node))
    }
    for (const edge of patch.edges || []) {
      if (!isPlainObject(edge) || !isNonEmptyString(edge.from) || !isNonEmptyString(edge.to)) return fail('invalid', 'edge.from and edge.to required')
      const idx = nextData.edges.findIndex((e) => e.from === edge.from && e.to === edge.to)
      if (idx >= 0) nextData.edges[idx] = { ...nextData.edges[idx], ...structuredClone(edge) }
      else nextData.edges.push(structuredClone(edge))
    }
  } else if (patch.op === 'delete_elements') {
    if (nextData.excalidrawScene) return fail('invalid', 'cannot patch imported excalidrawScene with node/edge ops')
    const delNodes = new Set(patch.nodeIds || [])
    if (delNodes.size > 0) {
      nextData.nodes = nextData.nodes.filter((n) => !delNodes.has(n.id))
      nextData.edges = nextData.edges.filter((e) => !delNodes.has(e.from) && !delNodes.has(e.to))
    }
    for (const key of patch.edgeKeys || []) {
      nextData.edges = nextData.edges.filter((e) => `${e.from}->${e.to}` !== key)
    }
  } else {
    return fail('invalid', `unsupported diagram patch op: ${patch.op}`)
  }
  const checked = validateViewObjectData('diagram', nextData)
  return checked.ok ? { ok: true, data: checked.normalizedData } : checked
}

export function summarizeViewObject(record) {
  let itemCount = 0
  if (record.type === 'table') itemCount = record.data?.rows?.length ?? 0
  else if (record.type === 'checklist') itemCount = record.data?.items?.length ?? 0
  else if (record.type === 'mindmap') itemCount = countMindmapNodes(record.data?.root)
  else if (record.type === 'diagram') itemCount = record.data?.nodes?.length ?? record.data?.excalidrawScene?.elements?.length ?? 0
  else if (record.type === 'board') itemCount = record.data?.excalidrawScene?.elements?.length ?? record.data?.nodes?.length ?? 0
  else if (record.type === 'html') itemCount = record.data?.html ? 1 : 0

  return {
    id: record.id,
    type: record.type,
    renderer: record.renderer || DEFAULT_RENDERER[record.type],
    semanticKind: record.semanticKind || resolveSemanticKind(record, record.data).semanticKind,
    title: record.title,
    ...(record.size ? { size: record.size } : {}),
    ...(record.caption ? { caption: record.caption } : {}),
    ...(record.snapshotAt ? { snapshotAt: record.snapshotAt } : {}),
    version: record.version,
    userLayoutVersion: record.userLayout?.version ?? 0,
    authorId: record.authorId,
    ownerId: record.ownerId || record.authorId,
    taskId: record.taskId ?? null,
    executionId: record.executionId ?? null,
    itemCount,
    updatedAt: record.updatedAt,
  }
}

function deriveLiveNodeState(task, exec) {
  if (exec?.state === 'unknown') return 'unknown'
  if (task) {
    if (task.viewState) return task.viewState
    if (task.state === 'running') {
      if (exec?.state === 'waiting_approval' || exec?.state === 'waiting_input') return exec.state
      if (exec?.state === 'interrupting') return 'cancelling'
    }
    return task.state
  }
  return exec?.state
}

function projectMindmapNodeWithRuntime(node, taskById, execById) {
  if (!node || typeof node !== 'object') return node
  const next = { ...node }
  let task = node.taskId ? taskById.get(node.taskId) : null
  const exec = node.executionId ? execById.get(node.executionId) : (task?.executionId ? execById.get(task.executionId) : null)
  if (!task && exec?.taskId) task = taskById.get(exec.taskId)
  if (task || exec) {
    next.status = deriveLiveNodeState(task, exec) || next.status
    next.memberId = next.memberId || exec?.memberId || task?.memberId || undefined
    next.runtimeSynced = true
  }
  if (Array.isArray(node.children)) {
    next.children = node.children.map((c) => projectMindmapNodeWithRuntime(c, taskById, execById))
  }
  return next
}

/**
 * Project a structured view object with live Runtime task/execution state when appropriate:
 * - `live_execution`: links node & checklist item states by `taskId` / `executionId` to Runtime truth.
 * - `snapshot`: freezes all authored item/node states at snapshot time without overwriting.
 * - `blueprint`: preserves model-supplied schematic labels/statuses without overwriting.
 */
export function projectViewObjectWithRuntimeState(record, tasks = [], executions = []) {
  if (!record || typeof record !== 'object') return record
  const next = structuredClone(record)
  const semanticKind = next.semanticKind || resolveSemanticKind(next, next.data).semanticKind
  next.semanticKind = semanticKind
  if (semanticKind === 'snapshot') {
    next.snapshotAt = next.snapshotAt || next.updatedAt || null
  }
  if (semanticKind !== 'live_execution') return next

  const taskById = new Map((tasks || []).map((t) => [t.taskId, t]))
  const execById = new Map((executions || []).map((e) => [e.executionId, e]))

  if (next.type === 'checklist' && Array.isArray(next.data?.items)) {
    next.data.items = next.data.items.map((item) => {
      if (!item?.taskId) return item
      const task = taskById.get(item.taskId)
      if (!task) return item
      const exec = task.executionId ? execById.get(task.executionId) : null
      return {
        ...item,
        checked: task.state === 'completed',
        runtimeStatus: deriveLiveNodeState(task, exec),
        runtimeSynced: true,
      }
    })
    return next
  }

  if (Array.isArray(next.data?.nodes)) {
    next.data.nodes = next.data.nodes.map((node) => {
      if (!node?.taskId && !node?.executionId) return node
      let task = node.taskId ? taskById.get(node.taskId) : null
      const exec = node.executionId ? execById.get(node.executionId) : (task?.executionId ? execById.get(task.executionId) : null)
      if (!task && exec?.taskId) task = taskById.get(exec.taskId)
      if (!task && !exec) return node
      return {
        ...node,
        status: deriveLiveNodeState(task, exec) || node.status,
        memberId: node.memberId || exec?.memberId || task?.memberId || undefined,
        blockedReason: task?.blockedReason || node.blockedReason || undefined,
        runtimeSynced: true,
      }
    })
  }
  if (next.type === 'mindmap' && next.data?.root) {
    next.data.root = projectMindmapNodeWithRuntime(next.data.root, taskById, execById)
  }
  if (next.data?.excalidrawScene && Array.isArray(next.data.excalidrawScene.elements)) {
    next.data.excalidrawScene.elements = next.data.excalidrawScene.elements.map((el) => {
      const taskId = el?.customData?.taskId
      const task = taskId ? taskById.get(taskId) : null
      if (!task) return el
      const exec = task.executionId ? execById.get(task.executionId) : null
      return {
        ...el,
        customData: { ...el.customData, status: deriveLiveNodeState(task, exec), runtimeSynced: true },
      }
    })
  }
  return next
}

/**
 * Normalize simple required view declarations (strings like `mindmap:plan` or
 * `{ id, type, title?, requiredForAcceptance? }`). No DSL; first-class simplicity.
 */
export function normalizeRequiredViewEntry(entry, defaults = {}) {
  if (typeof entry === 'string') {
    const m = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/.exec(entry.trim())
    if (!m) return null
    return {
      type: m[1],
      id: m[2],
      title: `${m[1]}:${m[2]}`,
      taskId: defaults.taskId ?? null,
      requiredForAcceptance: Boolean(defaults.requiredForAcceptance),
      source: defaults.source || 'template',
    }
  }
  if (!isPlainObject(entry) || !VIEW_OBJECT_TYPES.includes(entry.type) || typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id)) {
    return null
  }
  return {
    type: entry.type,
    id: entry.id,
    title: isNonEmptyString(entry.title) ? entry.title.trim() : `${entry.type}:${entry.id}`,
    taskId: entry.taskId ?? defaults.taskId ?? null,
    requiredForAcceptance: Boolean(entry.requiredForAcceptance ?? defaults.requiredForAcceptance),
    source: defaults.source || entry.source || (entry.taskId || defaults.taskId ? 'task' : 'template'),
  }
}

export function extractRequiredViewsFromTask(task) {
  const specs = []
  if (Array.isArray(task?.requiredViews)) {
    for (const raw of task.requiredViews) {
      const norm = normalizeRequiredViewEntry(raw, {
        taskId: task.taskId,
        requiredForAcceptance: raw?.requiredForAcceptance === true,
        source: 'task',
      })
      if (norm) specs.push(norm)
    }
  }
  return specs
}

/**
 * Advisory natural-language reference hints extracted from acceptance criteria (never blocking completion).
 */
export function extractAcceptanceRefHints(task) {
  const hints = []
  if (!Array.isArray(task?.acceptance)) return hints
  const refRe = /\b(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})/g
  for (const line of task.acceptance) {
    if (typeof line !== 'string') continue
    let m
    while ((m = refRe.exec(line)) !== null) {
      hints.push({
        type: m[1],
        id: m[2],
        title: `${m[1]}:${m[2]}`,
        taskId: task.taskId ?? null,
        requiredForAcceptance: false,
        source: 'acceptance_hint',
      })
    }
  }
  return hints
}

export function evaluateRequiredViews({ teamRequiredViews = [], tasks = [], viewObjects = [] } = {}) {
  const byKey = new Map()
  const addSpec = (spec) => {
    if (!spec) return
    const key = `${spec.taskId || 'team'}:${spec.type}:${spec.id}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, spec)
    } else {
      byKey.set(key, {
        ...prev,
        title: prev.title === `${prev.type}:${prev.id}` && spec.title ? spec.title : prev.title,
        requiredForAcceptance: prev.requiredForAcceptance || spec.requiredForAcceptance,
        source: spec.source === 'acceptance' ? 'acceptance' : prev.source,
      })
    }
  }
  for (const raw of teamRequiredViews || []) {
    addSpec(normalizeRequiredViewEntry(raw, { taskId: null, requiredForAcceptance: false, source: 'template' }))
  }
  for (const task of tasks || []) {
    if (task.state === 'cancelled') continue
    for (const spec of extractRequiredViewsFromTask(task)) addSpec(spec)
  }

  const evaluated = []
  for (const spec of byKey.values()) {
    const obj = (viewObjects || []).find((o) => o.type === spec.type && o.id === spec.id)
    const satisfied = Boolean(obj)
    evaluated.push({
      ...spec,
      satisfied,
      missing: !satisfied,
      version: obj?.version ?? null,
      authorId: obj?.authorId ?? null,
    })
  }
  return {
    requiredViews: evaluated,
    missingRequiredViews: evaluated.filter((v) => v.missing),
  }
}

export function missingAcceptanceViewsForTask(task, viewObjects = [], teamRequiredViews = []) {
  if (!task) return []
  const { missingRequiredViews } = evaluateRequiredViews({
    teamRequiredViews: Array.isArray(teamRequiredViews) ? teamRequiredViews : [],
    tasks: [task],
    viewObjects,
  })
  const seen = new Set()
  const blocking = []
  for (const v of missingRequiredViews) {
    if (v.requiredForAcceptance !== true) continue
    const key = `${v.type}:${v.id}`
    if (seen.has(key)) continue
    seen.add(key)
    blocking.push(v)
  }
  return blocking
}

/**
 * Parse text into alternating plain text blocks and structured view object reference tokens (§4.1):
 * 1) Standalone line `^(table|checklist|mindmap|diagram|html|board):([A-Za-z0-9._-]+)$`
 * 2) Fenced ```concerto block containing `ref: <type>:<id>` and optional `renderer` / `size` / `caption`
 */
export function parseViewObjectReferences(text) {
  const source = String(text ?? '')
  if (!source) return []
  const lines = source.split(/\r?\n/)
  const tokens = []
  let textBuf = []
  const flushText = () => {
    if (textBuf.length > 0) {
      tokens.push({ kind: 'text', text: textBuf.join('\n') })
      textBuf = []
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()
    if (/^```\s*concerto\b/i.test(trimmed)) {
      const endIdx = lines.findIndex((l, idx) => idx > i && /^```\s*$/.test(l.trim()))
      if (endIdx > i) {
        flushText()
        const bodyLines = lines.slice(i + 1, endIdx)
        const parsed = parseConcertoBlock(bodyLines)
        tokens.push(parsed)
        i = endIdx
        continue
      }
    }
    const lineMatch = /^(table|checklist|mindmap|diagram|html|board):([A-Za-z0-9._-]+)$/.exec(trimmed)
    if (lineMatch) {
      flushText()
      tokens.push({
        kind: 'ref',
        type: lineMatch[1],
        id: lineMatch[2],
        raw: trimmed,
      })
      continue
    }
    textBuf.push(line)
  }
  flushText()
  return tokens
}

function parseConcertoBlock(lines) {
  const raw = '```concerto\n' + lines.join('\n') + '\n```'
  const fields = {}
  for (const l of lines) {
    const m = /^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(l)
    if (m) fields[m[1]] = m[2]
  }
  const refMatch = /^(table|checklist|mindmap|diagram|html|board):([A-Za-z0-9._-]+)$/.exec(fields.ref || '')
  if (!refMatch) {
    return { kind: 'ref_error', reason: '缺少有效的 ref: <type>:<id> 字段', raw }
  }
  const type = refMatch[1]
  const id = refMatch[2]
  const renderer = fields.renderer || undefined
  const size = VIEW_OBJECT_SIZES.includes(fields.size) ? fields.size : undefined
  if (renderer && !ALLOWED_RENDERERS[type]?.includes(renderer)) {
    return { kind: 'ref_error', type, id, renderer, reason: `${type} 不支持 renderer=${renderer}`, raw }
  }
  return {
    kind: 'ref',
    type,
    id,
    ...(renderer ? { renderer } : {}),
    ...(size ? { size } : {}),
    ...(fields.caption ? { caption: fields.caption } : {}),
    raw,
  }
}

/**
 * Resolve an object reference within the current team run using priority:
 * same taskId > same authorId > pinned on stage > first match.
 */
export function resolveViewObjectRef(viewObjects, ref, context = {}) {
  if (!Array.isArray(viewObjects) || !ref?.id || !ref?.type) {
    return { ok: false, code: 'invalid_ref', reason: '无效引用格式' }
  }
  const byId = viewObjects.filter((o) => o.id === ref.id)
  if (byId.length === 0) {
    return { ok: false, code: 'not_found', reason: `未找到对象 ${ref.type}:${ref.id}` }
  }
  const typed = byId.filter((o) => o.type === ref.type)
  if (typed.length === 0) {
    return {
      ok: false,
      code: 'type_mismatch',
      reason: `类型不匹配：引用为 ${ref.type}，实际对象 ${ref.id} 为 ${byId[0].type}`,
    }
  }
  if (typed.length === 1) return { ok: true, object: typed[0] }
  if (context.taskId) {
    const taskMatch = typed.find((o) => o.taskId === context.taskId)
    if (taskMatch) return { ok: true, object: taskMatch }
  }
  if (context.authorId) {
    const authorMatch = typed.find((o) => o.authorId === context.authorId)
    if (authorMatch) return { ok: true, object: authorMatch }
  }
  if (Array.isArray(context.pinnedRefs)) {
    const isPinned = context.pinnedRefs.some((p) => p.id === ref.id && p.type === ref.type)
    if (isPinned) return { ok: true, object: typed[0] }
  }
  return { ok: true, ambiguous: true, object: typed[0] }
}

function countMindmapNodes(node) {
  if (!node) return 0
  return 1 + (Array.isArray(node.children) ? node.children.reduce((s, c) => s + countMindmapNodes(c), 0) : 0)
}

function findMindmapNode(node, id) {
  if (!node) return null
  if (node.id === id) return node
  for (const child of node.children || []) {
    const found = findMindmapNode(child, id)
    if (found) return found
  }
  return null
}

function trimMindmapDepth(node, depth, maxDepth) {
  const copy = {
    id: node.id,
    label: node.label,
    ...(node.status ? { status: node.status } : {}),
    ...(node.taskId ? { taskId: node.taskId } : {}),
    ...(node.executionId ? { executionId: node.executionId } : {}),
    ...(node.memberId ? { memberId: node.memberId } : {}),
  }
  if (Array.isArray(node.children) && node.children.length > 0) {
    if (depth < maxDepth) copy.children = node.children.map((c) => trimMindmapDepth(c, depth + 1, maxDepth))
    else copy.truncatedChildrenCount = node.children.length
  }
  return copy
}

export function sliceViewObjectData(record, opts = {}) {
  const offset = Number.isInteger(opts.offset) && opts.offset >= 0 ? opts.offset : 0
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : null

  if (record.type === 'table') {
    const total = record.data.rows.length
    const rows = limit !== null ? record.data.rows.slice(offset, offset + limit) : record.data.rows.slice(offset)
    return {
      truncated: offset > 0 || (limit !== null && offset + limit < total),
      totalItems: total,
      data: { columns: structuredClone(record.data.columns), rows: structuredClone(rows) },
    }
  }

  if (record.type === 'checklist') {
    const total = record.data.items.length
    const items = limit !== null ? record.data.items.slice(offset, offset + limit) : record.data.items.slice(offset)
    return {
      truncated: offset > 0 || (limit !== null && offset + limit < total),
      totalItems: total,
      data: { items: structuredClone(items) },
    }
  }

  if (record.type === 'mindmap') {
    const target = opts.subtreeNodeId ? findMindmapNode(record.data.root, opts.subtreeNodeId) : record.data.root
    if (!target) return null
    const maxDepth = Number.isInteger(opts.maxDepth) && opts.maxDepth > 0 ? opts.maxDepth : MAX_MINDMAP_DEPTH
    const root = trimMindmapDepth(target, 1, maxDepth)
    return {
      truncated: Boolean(opts.subtreeNodeId) || JSON.stringify(root).includes('truncatedChildrenCount'),
      totalItems: countMindmapNodes(record.data.root),
      data: { root },
    }
  }

  // diagram
  if (record.data.excalidrawScene) {
    return { truncated: false, totalItems: record.data.excalidrawScene.elements.length, data: structuredClone(record.data) }
  }
  const total = record.data.nodes.length
  const nodes = limit !== null ? record.data.nodes.slice(offset, offset + limit) : record.data.nodes.slice(offset)
  const keptIds = new Set(nodes.map((n) => n.id))
  const edges = (record.data.edges || []).filter((e) => keptIds.has(e.from) && keptIds.has(e.to))
  return {
    truncated: offset > 0 || (limit !== null && offset + limit < total),
    totalItems: total,
    data: { layout: record.data.layout, nodes: structuredClone(nodes), edges: structuredClone(edges) },
  }
}
