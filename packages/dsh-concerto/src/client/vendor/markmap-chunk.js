/**
 * Lazy-loaded Markmap interactive renderer chunk (markmap-lib/no-plugins + markmap-view).
 */
import { Transformer } from 'markmap-lib/no-plugins'
import { Markmap, deriveOptions } from 'markmap-view'
import { zoomIdentity, zoomTransform } from 'd3'
import { DEPTH_PALETTE, parseMarkdownToMindmap, normalizeMindmapTree } from '../../../lib/domain/view_layout.mjs'

const transformer = new Transformer()

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function treeToPureNode(node, depth = 0, collapsedSet = new Set()) {
  if (!node) return { content: '中心主题', children: [], payload: { depth, nodeId: 'root', fold: 0 } }
  const nodeId = String(node.id || 'root')
  const folded = collapsedSet.has(nodeId) ? 1 : 0
  return {
    content: escapeHtml(node.label ?? nodeId),
    children: Array.isArray(node.children)
      ? node.children.map((c) => treeToPureNode(c, depth + 1, collapsedSet))
      : [],
    payload: { depth, nodeId, fold: folded },
  }
}

function buildPureTree(objectOrRoot, collapsedSet) {
  if (objectOrRoot?.data) {
    const domainTree = normalizeMindmapTree(
      objectOrRoot.data.root || parseMarkdownToMindmap(objectOrRoot.data.markdown)
    )
    return domainTree
      ? treeToPureNode(domainTree, 0, collapsedSet)
      : transformer.transform(String(objectOrRoot.data.markdown || objectOrRoot.title || '')).root
  }
  if (objectOrRoot && typeof objectOrRoot === 'object') {
    const domainTree = normalizeMindmapTree(objectOrRoot)
    return treeToPureNode(domainTree, 0, collapsedSet)
  }
  return treeToPureNode(null, 0, collapsedSet)
}

function collectFoldedIds(mmNode, out = []) {
  if (!mmNode || typeof mmNode !== 'object') return out
  const nodeId = mmNode.payload?.nodeId
  if (nodeId && mmNode.payload?.fold) {
    out.push(nodeId)
  }
  if (Array.isArray(mmNode.children)) {
    for (const c of mmNode.children) collectFoldedIds(c, out)
  }
  return out
}

function applyFoldIds(mmNode, collapsedSet) {
  if (!mmNode || typeof mmNode !== 'object') return
  const nodeId = mmNode.payload?.nodeId
  if (nodeId) {
    mmNode.payload = { ...(mmNode.payload || {}), fold: collapsedSet.has(nodeId) ? 1 : 0 }
  }
  if (Array.isArray(mmNode.children)) {
    for (const c of mmNode.children) applyFoldIds(c, collapsedSet)
  }
}

function resolveBranchPalette(svgElement) {
  const defaultColor = 'currentColor'
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return [defaultColor, defaultColor, defaultColor, defaultColor]
  }
  const host = svgElement?.closest?.('.concerto-surface') || document.body || document.documentElement
  if (!host) return [defaultColor, defaultColor, defaultColor, defaultColor]
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.appendChild(probe)
  try {
    return [1, 2, 3, 4].map((idx) => {
      probe.style.color = `var(--cc-branch-${idx}, var(--cc-accent-text, currentColor))`
      const resolved = getComputedStyle(probe).color
      return resolved || defaultColor
    })
  } catch {
    return [defaultColor, defaultColor, defaultColor, defaultColor]
  } finally {
    probe.remove()
  }
}

export function renderInteractiveMarkmap(svgElement, objectOrRoot, options = {}) {
  if (!svgElement) return null
  while (svgElement.firstChild) svgElement.removeChild(svgElement.firstChild)

  const collapsedSet = options.collapsedIds instanceof Set
    ? options.collapsedIds
    : new Set(Array.isArray(options.collapsedIds) ? options.collapsedIds : [])
  const root = buildPureTree(objectOrRoot, collapsedSet)
  const palette = resolveBranchPalette(svgElement)

  const mmOpts = {
    ...deriveOptions({
      color: palette,
      colorFreezeLevel: 2,
      autoFit: false,
      initialExpandLevel: Number.isInteger(options.initialExpandLevel) ? options.initialExpandLevel : -1,
      maxWidth: 280,
      duration: 160,
      zoom: true,
      pan: true,
      paddingX: 14,
      spacingHorizontal: 56,
      spacingVertical: 10,
    }),
    embedGlobalCSS: true,
    style: (id) => `
      .markmap.${id} {
        --markmap-text-color: var(--cc-text-primary, var(--dsw-alias-label-primary));
        --markmap-circle-open-bg: var(--cc-canvas-bg, var(--dsw-alias-bg-base));
        --markmap-code-bg: var(--cc-card-nested-bg, var(--dsw-alias-bg-layer-2));
        --markmap-code-color: var(--cc-text-secondary, var(--dsw-alias-label-secondary));
        color: var(--cc-text-primary, var(--dsw-alias-label-primary));
        font: var(--cc-font-size, 1em)/1.45 var(--cc-font-sans, system-ui, sans-serif);
      }
      .markmap.${id} .markmap-foreign { display: inline-block; color: inherit; }
    `,
  }

  let destroyed = false
  let suppressZoomSave = true
  const mm = new Markmap(svgElement, mmOpts)

  const emitTransform = (t) => {
    if (destroyed || suppressZoomSave || typeof options.onTransformChange !== 'function') return
    if (t && Number.isFinite(t.k) && t.k > 0) {
      options.onTransformChange({ k: t.k, x: Number.isFinite(t.x) ? t.x : 0, y: Number.isFinite(t.y) ? t.y : 0 })
    }
  }

  mm.zoom.on('zoom.concerto', (ev) => {
    if (!suppressZoomSave) emitTransform(ev.transform)
  })

  const applySavedOrFit = async () => {
    const saved = options.initialTransform
    suppressZoomSave = true
    try {
      if (saved && Number.isFinite(saved.k) && saved.k > 0) {
        mm.svg.call(mm.zoom.transform, zoomIdentity.translate(saved.x || 0, saved.y || 0).scale(saved.k))
      } else {
        await mm.fit?.().catch?.(() => {})
      }
    } finally {
      suppressZoomSave = false
    }
  }

  mm.setData(root).then(() => {
    if (!destroyed) return applySavedOrFit()
  }).catch(() => {})

  const onSvgClick = () => {
    if (typeof options.onFoldChange !== 'function') return
    setTimeout(() => {
      try {
        const dataRoot = mm.state?.data
        if (dataRoot) options.onFoldChange(collectFoldedIds(dataRoot))
      } catch { /* ignore */ }
    }, 20)
  }
  svgElement.addEventListener?.('click', onSvgClick)

  return {
    instance: mm,
    fit: async () => {
      suppressZoomSave = true
      try {
        await mm.fit?.()
      } finally {
        suppressZoomSave = false
      }
      options.onTransformChange?.(null)
    },
    rescale: async (factor) => {
      await mm.rescale?.(factor)
      emitTransform(zoomTransform(svgElement))
    },
    getTransform: () => {
      const t = zoomTransform(svgElement)
      return { k: t.k, x: t.x, y: t.y }
    },
    updateData: (nextObjectOrRoot, nextCollapsed) => {
      const nextSet = nextCollapsed instanceof Set ? nextCollapsed : new Set(Array.isArray(nextCollapsed) ? nextCollapsed : [])
      const nextTree = buildPureTree(nextObjectOrRoot, nextSet)
      suppressZoomSave = true
      return Promise.resolve(mm.setData(nextTree)).finally(() => { suppressZoomSave = false })
    },
    setCollapsedIds: (nextIds) => {
      const nextSet = nextIds instanceof Set ? nextIds : new Set(Array.isArray(nextIds) ? nextIds : [])
      if (mm.state?.data) {
        applyFoldIds(mm.state.data, nextSet)
        suppressZoomSave = true
        return Promise.resolve(mm.renderData?.(mm.state.data)).finally(() => { suppressZoomSave = false })
      }
    },
    destroy: () => {
      destroyed = true
      svgElement.removeEventListener?.('click', onSvgClick)
      mm.zoom?.on?.('zoom.concerto', null)
      mm.destroy?.()
    },
  }
}
