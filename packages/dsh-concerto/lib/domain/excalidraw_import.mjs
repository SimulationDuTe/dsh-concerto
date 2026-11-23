export const EXCALIDRAW_IMPORT_MAX_BYTES = 1024 * 1024
const MAX_ELEMENTS = 500
const MAX_COORDINATE = 100_000
const SHAPES = ['rectangle', 'ellipse', 'diamond']
const LINES = ['arrow', 'line']
const SUPPORTED = [...SHAPES, 'text', ...LINES]
const invalid = (detail) => ({ ok: false, code: 'invalid', detail })
const coordinate = (value) => Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE

// Project the file onto the fields the Concerto renderer consumes.
export function normalizeExcalidrawImport(scene) {
  if (scene?.type !== 'excalidraw' || scene.version !== 2 || !Array.isArray(scene.elements)) {
    return invalid('请选择 Excalidraw v2 白板文件。')
  }
  if (scene.elements.length > MAX_ELEMENTS) return invalid(`白板最多可包含 ${MAX_ELEMENTS} 个元素。`)

  const ids = new Set()
  const elements = []
  let omittedCount = 0
  let minX = 0
  let minY = 0
  for (const [index, item] of scene.elements.entries()) {
    if (typeof item?.type !== 'string') return invalid(`元素 ${index + 1} 缺少类型。`)
    if (item.isDeleted === true) continue
    if (!SUPPORTED.includes(item.type)) {
      omittedCount += 1
      continue
    }

    const { id, type, x, y, width, height } = item
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) {
      return invalid(`元素 ${index + 1} 的 ID 为空或重复。`)
    }
    if (![x, y, width, height].every(coordinate) || width < 0 || height < 0) {
      return invalid(`元素 ${index + 1} 的坐标或尺寸无效。`)
    }

    const element = { id, type, x, y, width, height }
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    if (typeof item.customData?.label === 'string') element.customData = { label: item.customData.label }
    if (type === 'text') {
      if (typeof item.text !== 'string') return invalid(`元素 ${index + 1} 缺少文字内容。`)
      element.text = item.text
      if (typeof item.containerId === 'string') element.containerId = item.containerId
    }
    if (LINES.includes(type)) {
      const { points } = item
      if (!Array.isArray(points) || points.length < 2 || points.some((point) =>
        !Array.isArray(point) || point.length !== 2 || !point.every(coordinate))) {
        return invalid(`元素 ${index + 1} 的连线坐标无效。`)
      }
      element.points = points
      for (const [dx, dy] of points) {
        minX = Math.min(minX, x + dx)
        minY = Math.min(minY, y + dy)
      }
      for (const end of ['startBinding', 'endBinding']) {
        if (typeof item[end]?.elementId === 'string') element[end] = { elementId: item[end].elementId }
      }
    }
    ids.add(id)
    elements.push(element)
  }
  if (elements.length === 0) return invalid('白板中没有可导入的图形、文字或连线。')

  const shapeIds = new Set(elements.filter((element) => SHAPES.includes(element.type)).map((element) => element.id))
  for (const element of elements) {
    // Excalidraw's infinite canvas can start at a negative position.
    element.x -= minX
    element.y -= minY
    if (element.type === 'text' && !shapeIds.has(element.containerId)) delete element.containerId
  }
  return { ok: true, scene: { type: 'excalidraw', version: 2, elements }, omittedCount }
}
