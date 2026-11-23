import {
  defaultPreviewCollapsedIdsWithinBudget,
  layoutDiagram,
  layoutMindmapTree,
  mindmapToDiagramData,
  normalizeMindmapTree,
  parseMarkdownToMindmap,
} from '../../../../lib/domain/view_layout.mjs'

export function preferredRendererSize(object, renderer, options = {}) {
  const fontSize = Number.isFinite(options.fontSize) && options.fontSize > 0 ? options.fontSize : undefined
  try {
    let width = 0
    if (renderer === 'markmap') {
      const raw = object?.data?.root
        ? object.data.root
        : (object?.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null)
      const root = raw ? normalizeMindmapTree(raw) : null
      if (!root) return ''
      const collapsed = new Set(defaultPreviewCollapsedIdsWithinBudget(root, { fontSize }))
      width = layoutMindmapTree(root, collapsed, { fontSize }).width
    } else if (renderer === 'svg') {
      const data = object?.type === 'mindmap'
        ? mindmapToDiagramData(object.data, object.title)
        : object?.data
      width = layoutDiagram(data, { fontSize, semanticKind: object?.semanticKind }).width
    } else {
      return ''
    }
    if (width <= 560) return 's'
    if (width <= 900) return 'm'
    return 'l'
  } catch {
    return ''
  }
}
