import { h } from '../api.js'
import { parseViewObjectReferences, resolveViewObjectRef } from '../../../lib/domain/view_objects.mjs'
import { StructuredObjectCard } from './StructuredObjectCard.js'

const TYPE_ICON = {
  table: '▦',
  checklist: '☑',
  mindmap: '◎',
  diagram: '⇢',
  board: '✎',
  html: '▣',
}

function scrollToInlineObjectRef(type, id) {
  if (typeof document === 'undefined') return
  const normType = type === 'canvas' ? 'board' : type
  const el = document.getElementById(`concerto-stage-obj-${normType}-${id}`)
    || document.querySelector(`[data-concerto-object-id="${CSS.escape ? CSS.escape(id) : id}"]`)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function renderInlineSpans(line, onJumpObject, viewObjects = [], onViewAllArtifacts = null) {
  const parts = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\b(?:table|checklist|mindmap|diagram|board|canvas|html):[a-zA-Z0-9][a-zA-Z0-9._-]{0,63})/g
  const rawRefs = line.match(/\b(?:table|checklist|mindmap|diagram|board|canvas|html):[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}/g) || []
  const collapseThreshold = rawRefs.length > 3 ? 2 : Infinity
  let shownRefCount = 0
  let skippedCollapsed = 0
  let last = 0
  let m
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      const gap = line.slice(last, m.index)
      if (!(shownRefCount >= collapseThreshold && /^[\s、,，;；与和]+$/.test(gap))) {
        parts.push(gap)
      }
    }
    const tok = m[0]
    if (tok.startsWith('`')) {
      parts.push(h('code', {
        key: parts.length,
        style: { fontFamily: 'var(--cc-font-mono)', fontSize: 'var(--cc-fs-code)', padding: '1px 5px', borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-card-nested-bg)' },
      }, tok.slice(1, -1)))
    } else if (tok.startsWith('**')) {
      parts.push(h('strong', { key: parts.length }, tok.slice(2, -2)))
    } else {
      const colonIdx = tok.indexOf(':')
      const rawType = tok.slice(0, colonIdx)
      const normType = rawType === 'canvas' ? 'board' : rawType
      const refId = tok.slice(colonIdx + 1)
      if (shownRefCount < collapseThreshold) {
        shownRefCount += 1
        const obj = (viewObjects || []).find((o) => o.type === normType && o.id === refId)
        const displayLabel = (TYPE_ICON[normType] ? TYPE_ICON[normType] + ' ' : '') + (obj?.title || refId)
        parts.push(h('button', {
          key: parts.length,
          type: 'button',
          className: 'concerto-chip',
          title: tok,
          'data-concerto-inline-ref': `${normType}:${refId}`,
          style: { margin: '0 2px', verticalAlign: 'baseline' },
          onClick: () => (onJumpObject ? onJumpObject({ type: normType, id: refId }) : scrollToInlineObjectRef(normType, refId)),
        }, displayLabel))
      } else {
        skippedCollapsed += 1
      }
    }
    last = m.index + tok.length
  }
  if (skippedCollapsed > 0) {
    parts.push(' ')
    parts.push(h('button', {
      key: 'more-' + parts.length,
      type: 'button',
      className: 'concerto-link',
      onClick: () => (onViewAllArtifacts ? onViewAllArtifacts() : onJumpObject?.({ id: '' })),
    }, `+${skippedCollapsed} 份产物 ›`))
  }
  if (last < line.length) {
    const tail = line.slice(last)
    if (!(skippedCollapsed > 0 && /^[\s。.,，、]+$/.test(tail))) {
      parts.push(tail)
    }
  }
  return parts
}

/**
 * Render a single-line or inline prose fragment with title-resolved `type:id` chips.
 */
export function InlineTextWithRefs({ text, onJumpObject = null, viewObjects = [], onViewAllArtifacts = null }) {
  return h('span', null, ...renderInlineSpans(String(text ?? ''), onJumpObject, viewObjects, onViewAllArtifacts))
}

function SimpleMarkdownBlock({ text, onJumpObject, viewObjects, onViewAllArtifacts }) {
  const lines = String(text ?? '').split(/\r?\n/)
  const nodes = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { i += 1; continue }
    if (trimmed.startsWith('```')) {
      const end = lines.findIndex((l, idx) => idx > i && l.trim().startsWith('```'))
      const codeLines = end > i ? lines.slice(i + 1, end) : lines.slice(i + 1)
      nodes.push(h('pre', {
        key: nodes.length,
        style: { margin: '6px 0', padding: '8px 10px', borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-card-nested-bg)', border: '1px solid var(--cc-border-subtle)', overflowX: 'auto', fontSize: 'var(--cc-fs-code)' },
      }, h('code', null, codeLines.join('\n'))))
      i = end > i ? end + 1 : lines.length
      continue
    }
    const hMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed)
    if (hMatch) {
      nodes.push(h('div', { key: nodes.length, style: { fontWeight: 600, fontSize: hMatch[1].length <= 2 ? 'var(--cc-fs-title)' : 'var(--cc-fs-body)', marginTop: 6 } }, ...renderInlineSpans(hMatch[2], onJumpObject, viewObjects, onViewAllArtifacts)))
      i += 1
      continue
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''))
        i += 1
      }
      nodes.push(h('ul', { key: nodes.length, style: { margin: '4px 0', paddingLeft: 18 } },
        items.map((it, idx) => h('li', { key: idx }, ...renderInlineSpans(it, onJumpObject, viewObjects, onViewAllArtifacts)))))
      continue
    }
    nodes.push(h('p', { key: nodes.length, style: { margin: '4px 0', whiteSpace: 'pre-wrap' } }, ...renderInlineSpans(line, onJumpObject, viewObjects, onViewAllArtifacts)))
    i += 1
  }
  return h('div', null, nodes)
}

/**
 * Render prose / Markdown alongside resolved inline structured object cards (§4.1).
 * Recognizes standalone lines `^(table|checklist|mindmap|diagram|html|board):id$` and ```concerto blocks.
 */
export function ReferenceText({
  text,
  viewObjects = [],
  tasks = [],
  pinnedRefs = [],
  context = {},
  sessionId = '',
  skipPinnedIds = null,
  onJumpTask = null,
  onOpenMember = null,
  onJumpObject = null,
  onViewAllArtifacts = null,
  isLight = false,
}) {
  const tokens = parseViewObjectReferences(text)
  if (tokens.length === 0) return null

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    tokens.map((tok, idx) => {
      if (tok.kind === 'text') {
        return h(SimpleMarkdownBlock, { key: 't-' + idx, text: tok.text, onJumpObject, viewObjects, onViewAllArtifacts })
      }
      if (tok.kind === 'ref_error') {
        return h(StructuredObjectCard, {
          key: 'err-' + idx,
          object: null,
          missingRef: tok,
          errorReason: tok.reason,
        })
      }
      const obj = resolveViewObjectRef(viewObjects, tok, { ...context, pinnedRefs })
      if (skipPinnedIds && skipPinnedIds.has(`${tok.type}:${tok.id}`)) {
        const displayTitle = obj.ok ? (obj.object.title || `${tok.type}:${tok.id}`) : `${tok.type}:${tok.id}`
        return h('div', { key: 'skip-' + idx },
          h('button', {
            type: 'button',
            className: 'concerto-chip',
            title: `${tok.type}:${tok.id}`,
            'data-concerto-inline-ref': `${tok.type}:${tok.id}`,
            onClick: () => (onJumpObject ? onJumpObject({ type: tok.type, id: tok.id }) : scrollToInlineObjectRef(tok.type, tok.id)),
          }, (TYPE_ICON[tok.type] ? TYPE_ICON[tok.type] + ' ' : '') + displayTitle + ' ›'))
      }
      if (!obj.ok) {
        return h(StructuredObjectCard, {
          key: 'miss-' + idx,
          object: null,
          missingRef: tok,
          errorReason: obj.reason,
        })
      }
      return h(StructuredObjectCard, {
        key: `ref-${obj.object.id}-${idx}`,
        object: obj.object,
        tasks,
        rendererOverride: tok.renderer || '',
        sizeHint: tok.size || '',
        ambiguousNote: obj.ambiguous ? '当前运行内存在多个同名对象，已按同任务/同作者/置顶优先级解析。' : '',
        sessionId,
        onJumpTask,
        onOpenMember,
        isLight,
      })
    }))
}
