/**
 * Model-facing publication shapes. The same fields describe the tools and
 * constrain member writes into the more permissive historical view format.
 */
import { MAX_MINDMAP_DEPTH } from './view_objects.mjs'

const string = { type: 'string' }
const boolean = { type: 'boolean' }
const array = (items) => ({ type: 'array', items })
const object = (properties, required = []) => ({
  type: 'object', additionalProperties: false, properties,
  ...(required.length ? { required } : {}),
})
const choices = (...values) => ({ type: 'string', enum: values })
const scalar = (...types) => ({ oneOf: types.map((type) => ({ type })) })

const stringList = array(string)
const semanticKind = choices('blueprint', 'snapshot', 'live_execution')
const size = choices('s', 'm', 'l')
const linkedId = scalar('string', 'null')
const row = array(scalar('string', 'number', 'boolean', 'null'))
const rows = array(row)
const items = array(object({ id: string, label: string, checked: boolean, taskId: string, note: string }, ['label']))
const linkedNodeFields = { id: string, label: string, taskId: string, executionId: string, memberId: string, status: string }
// DSH schemas have no recursive references. Mirror the existing tree limit.
function treeNode(depth) {
  const child = depth < MAX_MINDMAP_DEPTH ? treeNode(depth + 1) : object({})
  return object({ ...linkedNodeFields, children: array(child) }, ['label'])
}
const treeRoot = treeNode(1)
const nodes = array(object({
  ...linkedNodeFields, lane: string, assignee: string, stage: { type: 'integer' }, critical: boolean,
}, ['id', 'label']))
const edges = array(object({
  id: string, from: string, to: string, label: string, kind: string, status: string,
}, ['from', 'to']))
const graph = object({ layout: choices('dag', 'timeline', 'radial', 'swimlane'), nodes, edges, semanticKind }, ['nodes'])

const dataByType = {
  table: object({ columns: stringList, rows, semanticKind }, ['columns', 'rows']),
  checklist: object({ items, semanticKind }, ['items']),
  mindmap: object({ root: treeRoot, markdown: string, semanticKind }),
  diagram: graph,
  board: graph,
}
const metadata = {
  id: string, title: string, size, caption: string,
  taskId: linkedId, executionId: linkedId,
  expectedVersion: { type: 'integer' }, mutationId: string,
}

export const PUBLISH_VIEW_SCHEMA = object({
  ...metadata,
  type: choices(...Object.keys(dataByType)),
  renderer: choices('html', 'markmap', 'svg', 'excalidraw'),
  semanticKind,
  snapshotAt: string,
  editableBy: stringList,
  layoutHints: object({ direction: choices('LR', 'TB'), criticalPath: stringList }),
  data: {
    description: 'Semantic data matching type. A mindmap can use a tree or Markdown headings and lists.',
    oneOf: [...new Set(Object.values(dataByType))],
  },
}, ['id', 'type', 'title', 'data'])

const patchFields = {
  upsert_rows: { rows },
  delete_rows: { keys: stringList },
  upsert_items: { items },
  delete_items: { ids: stringList },
  upsert_node: { parentId: string, node: treeRoot },
  delete_node: { nodeId: string },
  upsert_elements: { nodes, edges },
  delete_elements: { nodeIds: stringList, edgeKeys: stringList },
}
const patchMetadata = { ...metadata, op: choices(...Object.keys(patchFields)) }

export const PATCH_VIEW_SCHEMA = object(
  Object.assign({}, patchMetadata, ...Object.values(patchFields)), ['id', 'expectedVersion', 'op'],
)

// Check only the supplied fields. The existing view validator handles required
// content, references and normalization, and the Runtime owns CAS and scope.
function fieldIssue(value, field, path) {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  const types = field.oneOf ? field.oneOf.map((branch) => branch.type) : [field.type]
  if (!types.includes(type) && !(field.type === 'integer' && Number.isInteger(value))) {
    return `${path} must be ${types.join(' | ')}`
  }
  if (field.enum && !field.enum.includes(value)) return `${path} must be ${field.enum.join(' | ')}`
  if (type === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const at = `${path}.${key}`
      if (!Object.hasOwn(field.properties, key)) return `${at} is not a supported publication field`
      if (entry === undefined) continue
      const issue = fieldIssue(entry, field.properties[key], at)
      if (issue) return issue
    }
  } else if (type === 'array') {
    for (const [index, entry] of value.entries()) {
      const issue = fieldIssue(entry, field.items, `${path}[${index}]`)
      if (issue) return issue
    }
  }
  return null
}

export function memberViewPublicationIssue(input) {
  const type = input?.type
  if (typeof type !== 'string' || !Object.hasOwn(dataByType, type)) {
    return `type must be ${Object.keys(dataByType).join(' | ')}`
  }
  return fieldIssue(input, object({ ...PUBLISH_VIEW_SCHEMA.properties, data: dataByType[type] }), 'publication')
}

export function memberViewPatchIssue(input) {
  const op = input?.op
  if (typeof op !== 'string' || !Object.hasOwn(patchFields, op)) {
    return `op must be ${Object.keys(patchFields).join(' | ')}`
  }
  return fieldIssue(input, object({ ...patchMetadata, ...patchFields[op] }), 'patch')
}
