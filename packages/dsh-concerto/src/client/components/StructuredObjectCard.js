import React from 'react'
import { createPortal } from 'react-dom'
import { h, label, styles, useHostTheme } from '../api.js'
import { DEFAULT_RENDERER, ALLOWED_RENDERERS } from '../../../lib/domain/view_objects.mjs'
import { mindmapToDiagramData, normalizeMindmapTree, parseMarkdownToMindmap } from '../../../lib/domain/view_layout.mjs'
import { useTeamCss } from '../styles.js'
import { useOverlay } from './overlay.js'
import { MarkmapRenderer } from './renderers/MarkmapRenderer.js'
import { SvgDiagramRenderer } from './renderers/SvgDiagramRenderer.js'
import { ExcalidrawRenderer } from './renderers/ExcalidrawRenderer.js'
import { HtmlSandboxRenderer } from './renderers/HtmlSandboxRenderer.js'

const RENDERER_LABELS = {
  html: 'HTML 表格 / 验收清单',
  markmap: 'Markmap',
  svg: 'SVG 图谱',
  excalidraw: '手绘白板',
  'sandbox-iframe': '沙箱 HTML',
}

const ENGINE_DETAILS = {
  html: 'HTML 结构化表格 / 验收清单（实时执行只读同步任务状态，快照冻结历史状态）',
  markmap: 'Markmap 0.18 + D3（预览为圆角节点，全屏为 Markmap 原生树枝样式，共享折叠与视角）',
  svg: 'Dagre + SVG 矢量布局（随宿主字号测量中文宽度，区分 3 种连线语义）',
  excalidraw: 'Excalidraw v2 + Rough.js 白板引擎（用户布局独立版本保存）',
  'sandbox-iframe': '沙箱 iframe（显式接收宿主深浅色、字体与字号变量）',
}

const SEMANTIC_META = {
  blueprint: { label: '方案示意', cls: 'concerto-state-idle' },
  snapshot: { label: '历史快照', cls: 'concerto-state-review' },
  live_execution: { label: '实时执行', cls: 'concerto-state-running' },
}

export function resolveObjectRenderer(object, overrideRenderer) {
  if (!object) return 'html'
  const allowed = ALLOWED_RENDERERS[object.type] || []
  if (overrideRenderer && allowed.includes(overrideRenderer)) return overrideRenderer
  if (object.renderer && allowed.includes(object.renderer)) return object.renderer
  return DEFAULT_RENDERER[object.type] || 'html'
}

export function CanvasModal({ title, onClose, children }) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const dialogRef = React.useRef(null)
  const closeBtnRef = React.useRef(null)
  useOverlay(dialogRef, closeBtnRef, onClose, true)

  const dialog = h('div', {
    className: 'concerto-modal-backdrop concerto-surface',
    'data-concerto-theme': hostTheme.colorScheme,
    style: hostTheme.cssVars,
    onClick: (e) => { if (e.target === e.currentTarget) onClose?.() },
  },
  h('section', {
    ref: dialogRef,
    className: 'concerto-canvas-modal',
    'data-concerto-modal': 'true',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  },
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
    h('strong', { style: { fontSize: 'var(--cc-fs-title)' } }, title),
    h('button', {
      ref: closeBtnRef,
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
      'aria-label': '关闭画布',
      title: '关闭画布',
      onClick: onClose,
    }, '✕')),
  children))

  return typeof document !== 'undefined' && document.body ? createPortal(dialog, document.body) : dialog
}

function isNumericCell(val) {
  if (typeof val === 'number') return true
  if (typeof val !== 'string') return false
  return /^-?\d+(?:\.\d+)?%?$/.test(val.trim())
}

function tableCellTone(colName, val) {
  const col = String(colName || '').toLowerCase()
  const txt = String(val || '').trim()
  if (/状态|status|risk|风险|结论/.test(col) || /^(done|completed|pass|通过|高|低|阻塞|blocked|running|进行中)$/i.test(txt)) {
    if (/通过|done|completed|低|已完成|已验收/i.test(txt)) return 'concerto-state-done'
    if (/阻塞|高|fail|blocked|失败/i.test(txt)) return 'concerto-state-blocked'
    if (/进行|running|in_progress/i.test(txt)) return 'concerto-state-running'
    if (/待|review|中等/i.test(txt)) return 'concerto-state-review'
  }
  return ''
}

export function StructuredObjectCard({
  object,
  tasks = [],
  missingRef = null,
  errorReason = '',
  ambiguousNote = '',
  rendererOverride = '',
  sizeHint = '',
  sessionId = '',
  onJumpTask = null,
  onOpenMember = null,
  highlighted = false,
  userPinned = false,
  onTogglePin = null,
  badgeLabel = '',
}) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)

  if (!object) {
    return h('div', {
      className: 'concerto-card',
      'data-concerto-object-id': missingRef?.id || 'missing',
      'data-concerto-object-missing': 'true',
    },
    h('div', { className: 'concerto-card-head' },
      h('strong', null, '结构化对象不可用'),
      missingRef && h('span', { className: 'concerto-tag concerto-id' }, missingRef.type + ':' + missingRef.id)),
    h('p', { role: 'status', style: styles.muted }, errorReason || '引用指向的对象在当前团队会话中不存在或已被移除。'),
    missingRef?.raw && h('details', null,
      h('summary', { style: { cursor: 'pointer', fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } }, '查看原文'),
      h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 'var(--cc-fs-code)' } }, missingRef.raw)))
  }

  const renderer = resolveObjectRenderer(object, rendererOverride)
  const effectiveSize = sizeHint || object.size || (renderer === 'markmap' || object.type === 'board' ? 'l' : 'm')
  let content = null
  let modalBody = null
  let renderError = null

  try {
    if (object.type === 'table') {
      const cols = Array.isArray(object.data?.columns) ? object.data.columns : []
      const rows = Array.isArray(object.data?.rows) ? object.data.rows : []
      content = h('div', { className: 'concerto-table-wrap' },
        h('table', { className: 'concerto-table' },
          h('thead', null, h('tr', null, cols.map((col, idx) => h('th', { key: idx }, String(col))))),
          h('tbody', null, rows.map((row, rIdx) =>
            h('tr', { key: rIdx }, cols.map((col, cIdx) => {
              const cell = row[cIdx]
              const tone = tableCellTone(col, cell)
              const numeric = isNumericCell(cell)
              return h('td', {
                key: cIdx,
                className: numeric ? 'concerto-num' : undefined,
                style: numeric ? { textAlign: 'right' } : undefined,
              }, tone
                ? h('span', { className: 'concerto-state-chip ' + tone }, String(cell ?? ''))
                : String(cell ?? ''))
            }))))))
    } else if (object.type === 'checklist') {
      const items = Array.isArray(object.data?.items) ? object.data.items : []
      const isLiveChecklist = object.semanticKind === 'live_execution'
      content = h('ul', { className: 'concerto-checklist' }, items.map((item, idx) => {
        const linkedTask = item.taskId ? tasks.find((t) => t.taskId === item.taskId) : null
        const checked = (isLiveChecklist && linkedTask)
          ? linkedTask.state === 'completed'
          : item.checked === true
        const subHint = isLiveChecklist && linkedTask
          ? '只读实时任务状态：' + label(linkedTask.viewState) + '（' + linkedTask.taskId + '）'
          : (object.semanticKind === 'snapshot' && item.taskId
              ? '历史快照（关联 ' + item.taskId + '）'
              : (item.taskId ? '关联任务 ' + item.taskId : ''))
        return h('li', { key: item.id || idx },
          h('span', {
            'aria-hidden': true,
            className: 'concerto-state-chip ' + (checked ? 'concerto-state-done' : 'concerto-state-idle'),
          }, checked ? '☑' : '☐'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', null, item.label),
            (subHint || item.note) && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)' } },
              subHint,
              subHint && item.note ? ' · ' : '',
              item.note || '')))
      }))
    } else if (object.type === 'mindmap') {
      if (renderer === 'excalidraw') {
        content = h(ExcalidrawRenderer, { object, sessionId, inModal: false })
        modalBody = h(ExcalidrawRenderer, { object, sessionId, inModal: true })
      } else if (renderer === 'svg') {
        const diagObj = { ...object, type: 'diagram', data: mindmapToDiagramData(object.data, object.title) }
        content = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: false })
        modalBody = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: true })
      } else if (renderer === 'html') {
        const treeRoot = normalizeMindmapTree(object.data?.root || parseMarkdownToMindmap(object.data?.markdown))
        const renderOutlineNode = (node, depth = 0) => h('li', { key: node.id || depth },
          h('div', { className: 'concerto-mindmap-outline-node' },
            h('span', null, node.label),
            node.status && h('span', { className: 'concerto-tag', style: { marginLeft: 6 } }, label(node.status))),
          Array.isArray(node.children) && node.children.length > 0 && h('ul', { className: 'concerto-mindmap-outline' },
            node.children.map((child) => renderOutlineNode(child, depth + 1))))
        const outlineEl = treeRoot
          ? h('div', { 'data-concerto-renderer-root': 'html-outline' },
              h('ul', { className: 'concerto-mindmap-outline concerto-mindmap-outline-root' }, renderOutlineNode(treeRoot, 0)))
          : h('p', { style: styles.muted }, '思维导图内容为空。')
        content = outlineEl
        modalBody = outlineEl
      } else {
        content = h(MarkmapRenderer, { object, sessionId, inModal: false })
        modalBody = h(MarkmapRenderer, { object, sessionId, inModal: true })
      }
    } else if (object.type === 'board' || (object.type === 'diagram' && renderer === 'excalidraw')) {
      content = h(ExcalidrawRenderer, { object, sessionId, inModal: false })
      modalBody = h(ExcalidrawRenderer, { object, sessionId, inModal: true })
    } else if (object.type === 'diagram') {
      content = h(SvgDiagramRenderer, { object, sessionId, inModal: false })
      modalBody = h(SvgDiagramRenderer, { object, sessionId, inModal: true })
    } else if (object.type === 'html') {
      content = h(HtmlSandboxRenderer, { object, sessionId, inModal: false })
      modalBody = h(HtmlSandboxRenderer, { object, sessionId, inModal: true })
    } else {
      renderError = '未知结构化对象类型：' + object.type
    }
  } catch (err) {
    renderError = err?.message || String(err)
  }

  const semantic = SEMANTIC_META[object.semanticKind || 'blueprint'] || SEMANTIC_META.blueprint
  const showInlineSemantic = object.semanticKind === 'live_execution' || object.semanticKind === 'snapshot'

  return h('article', {
    className: 'concerto-card' + (highlighted ? ' concerto-card-highlight' : ''),
    'data-concerto-object-id': object.id,
    'data-concerto-object-version': object.version,
    'data-concerto-renderer': renderer,
    'data-concerto-semantic': object.semanticKind || 'blueprint',
    'data-size': effectiveSize,
    id: `concerto-stage-obj-${object.type}-${object.id}`,
  },
  h('div', { className: 'concerto-card-head' },
    h('div', { className: 'concerto-card-head-main' },
      h('div', { className: 'concerto-card-title-row' },
        showInlineSemantic && h('span', {
          className: 'concerto-state-chip concerto-semantic-pill ' + semantic.cls,
          'data-semantic': object.semanticKind,
          title: object.snapshotAt ? '快照时间：' + new Date(object.snapshotAt).toLocaleString() : semantic.label,
        }, semantic.label),
        h('strong', { title: object.title || `${object.type}:${object.id}` }, object.title || (object.type + ':' + object.id))),
      object.caption && h('div', { className: 'concerto-card-caption', title: object.caption }, object.caption)),
    h('div', { className: 'concerto-hover-tools' },
      onTogglePin && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon concerto-btn--pin',
        'aria-pressed': userPinned,
        'data-concerto-pin': `${object.type}:${object.id}`,
        'aria-label': userPinned ? '已置顶（点击取消）' : '置顶到概览预览',
        title: userPinned ? '取消个人置顶' : '个人置顶到概览预览（模型更新不覆盖）',
        onClick: () => onTogglePin(object),
      }, userPinned ? '★' : '☆'),
      modalBody && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        'aria-label': '展开画布',
        title: '全屏查看',
        onClick: () => setModalOpen(true),
      }, '⤢'),
      h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        title: '查看渲染引擎、来源与版本元数据',
        'aria-expanded': infoOpen,
        'aria-label': `查看 ${object.title || object.id} 元数据`,
        onClick: () => setInfoOpen((v) => !v),
      }, 'ⓘ'))),

  infoOpen && h('div', { className: 'concerto-info-pop' },
    h('div', null, '引用：', h('code', { className: 'concerto-id' }, `${object.type}:${object.id}`), ' · 语义：', h('strong', null, semantic.label),
      object.snapshotAt ? '（' + new Date(object.snapshotAt).toLocaleString() + '）' : '',
      badgeLabel ? ' · ' : '',
      badgeLabel && h('span', { className: 'concerto-tag' }, badgeLabel)),
    h('div', { style: { marginTop: 4 } }, '渲染引擎：', RENDERER_LABELS[renderer] || renderer,
      ENGINE_DETAILS[renderer] ? ' — ' + ENGINE_DETAILS[renderer] : ''),
    h('div', { style: { marginTop: 4 } }, '所有者：',
      onOpenMember && object.authorId
        ? h('button', { type: 'button', className: 'concerto-chip', onClick: () => onOpenMember(object.authorId) }, object.authorId)
        : (object.ownerId || object.authorId || '未知'),
      ' · 版本：', h('span', { className: 'concerto-id' }, 'v' + object.version)),
    object.taskId && h('div', { style: { marginTop: 4 } }, '关联任务：',
      onJumpTask
        ? h('button', { type: 'button', className: 'concerto-chip concerto-id', onClick: () => onJumpTask(object.taskId) }, object.taskId)
        : h('span', { className: 'concerto-id' }, object.taskId)),
    object.updatedAt && h('div', { style: { marginTop: 4, color: 'var(--dsw-alias-label-tertiary)' } }, '更新时间：' + new Date(object.updatedAt).toLocaleString()),
    h('details', { style: { marginTop: 4 } },
      h('summary', { style: { cursor: 'pointer' } }, '查看原始数据 JSON'),
      h('pre', { style: { whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', fontSize: 'var(--cc-fs-code)' } }, JSON.stringify(object.data, null, 2)))),

  ambiguousNote && h('p', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', marginTop: 0 } }, ambiguousNote),

  renderError
    ? h('div', { role: 'alert', style: { padding: 10, borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-state-blocked-bg)' } },
        h('strong', null, '渲染降级：'), renderError,
        h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 'var(--cc-fs-code)' } }, JSON.stringify(object.data, null, 2)))
    : content,

  modalOpen && modalBody && h(CanvasModal, {
    title: object.title || `${object.type}:${object.id}`,
    onClose: () => setModalOpen(false),
  }, modalBody))
}
