import React from 'react'
import { createPortal } from 'react-dom'
import { h, label, styles, useHostTheme } from '../api.js'
import { DEFAULT_RENDERER, ALLOWED_RENDERERS } from '../../../lib/domain/view_objects.mjs'
import { mindmapToDiagramData, normalizeMindmapTree, parseMarkdownToMindmap, defaultPreviewCollapsedIdsWithinBudget } from '../../../lib/domain/view_layout.mjs'
import { useTeamCss } from '../styles.js'
import { useCanvasSession } from './renderers/useCanvasSession.js'
import { useModalDialog } from './overlay.js'
import { MarkmapRenderer } from './renderers/MarkmapRenderer.js'
import { SvgDiagramRenderer } from './renderers/SvgDiagramRenderer.js'
import { ExcalidrawRenderer } from './renderers/ExcalidrawRenderer.js'
import { HtmlSandboxRenderer } from './renderers/HtmlSandboxRenderer.js'
import { UiIcon } from './UiIcon.js'
import { showAnchoredPopover, hideAnchoredPopover } from './popover.js'

const RENDERER_LABELS = {
  html: 'HTML 表格 / 验收清单',
  markmap: 'SVG 导图',
  svg: 'SVG 图谱',
  excalidraw: '手绘白板',
  'sandbox-iframe': '沙箱 HTML',
}

const ENGINE_DETAILS = {
  html: 'HTML 结构化表格 / 验收清单（实时执行只读同步任务状态，快照冻结历史状态）',
  markmap: '自绘 SVG 导图（预览与全屏共用确定性布局、折叠状态和 SVG/PNG 导出）',
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
  const titleId = React.useId()
  useModalDialog(dialogRef, onClose)

  const dialog = h('dialog', {
    ref: dialogRef,
    className: 'concerto-canvas-modal concerto-surface',
    'data-concerto-theme': hostTheme.colorScheme,
    'data-concerto-modal': 'true',
    'aria-labelledby': titleId,
    closedby: 'any',
    style: hostTheme.cssVars,
  },
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
    h('h2', { id: titleId, className: 'concerto-dialog-title' }, title),
    h('button', {
      ref: (node) => node?.setAttribute('autofocus', ''),
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
      'aria-label': '关闭画布',
      title: '关闭画布',
      onClick: onClose,
    }, h(UiIcon, { name: 'close' }))),
  children)

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
  pinBusy = false,
  badgeLabel = '',
  isApprovedPlan = false,
  goalCompleted = false,
}) {
  const [modalOpen, setModalOpen] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const cardRef = React.useRef(null)
  const infoButtonRef = React.useRef(null)
  const infoPanelRef = React.useRef(null)
  const hostTheme = useHostTheme()

  React.useEffect(() => {
    if (!infoOpen || typeof document === 'undefined') return
    const native = showAnchoredPopover(infoButtonRef.current, infoPanelRef.current, { width: 420, maxHeight: 360 })
    infoPanelRef.current.dataset.nativePopover = String(native)
    const handleToggle = (event) => {
      if (event.newState === 'closed') setInfoOpen(false)
    }
    const handlePointer = (event) => {
      if (!cardRef.current?.contains(event.target)) setInfoOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setInfoOpen(false)
        infoButtonRef.current?.focus({ preventScroll: true })
      }
    }
    if (native) {
      infoPanelRef.current.addEventListener('toggle', handleToggle)
    } else {
      document.addEventListener('pointerdown', handlePointer, true)
      document.addEventListener('keydown', handleKey, true)
    }
    return () => {
      if (native) {
        infoPanelRef.current?.removeEventListener('toggle', handleToggle)
        hideAnchoredPopover(infoPanelRef.current)
      } else {
        document.removeEventListener('pointerdown', handlePointer, true)
        document.removeEventListener('keydown', handleKey, true)
      }
    }
  }, [infoOpen])
  const defaultCollapsedIds = React.useMemo(() => {
    if (object?.type !== 'mindmap') return []
    const raw = object.data?.root
      ? object.data.root
      : (object.data?.markdown ? parseMarkdownToMindmap(object.data.markdown) : null)
    const root = raw ? normalizeMindmapTree(raw) : null
    return root ? defaultPreviewCollapsedIdsWithinBudget(root, { fontSize: hostTheme.fontSize }) : []
  }, [object?.id, object?.version, object?.data, hostTheme.fontSize])
  const canvasSession = useCanvasSession(sessionId, object?.id, defaultCollapsedIds)

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
        h('table', { className: 'concerto-table', 'aria-label': object.title || '数据表格' },
          h('thead', null, h('tr', null, cols.map((col, idx) => h('th', { key: idx, scope: 'col' }, String(col))))),
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
          }, h(UiIcon, { name: checked ? 'checkbox-checked' : 'checkbox' })),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', null, item.label),
            h('span', { className: 'concerto-sr-only' }, checked ? '已完成' : '未完成'),
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
        content = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: false, onJumpTask })
        modalBody = h(SvgDiagramRenderer, { object: diagObj, sessionId, inModal: true, onJumpTask })
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
        content = h(MarkmapRenderer, { object, sessionId, inModal: false, canvasSession, onExpand: () => setModalOpen(true) })
        modalBody = h(MarkmapRenderer, { object, sessionId, inModal: true, canvasSession })
      }
    } else if (object.type === 'board' || (object.type === 'diagram' && renderer === 'excalidraw')) {
      content = h(ExcalidrawRenderer, { object, sessionId, inModal: false })
      modalBody = h(ExcalidrawRenderer, { object, sessionId, inModal: true })
    } else if (object.type === 'diagram') {
      content = h(SvgDiagramRenderer, { object, sessionId, inModal: false, onJumpTask })
      modalBody = h(SvgDiagramRenderer, { object, sessionId, inModal: true, onJumpTask })
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
  const semanticText = object.title?.includes(semantic.label)
    ? (object.semanticKind === 'live_execution' ? '实时' : '快照')
    : semantic.label

  const layerLabel = object.layer === 'review' || object.roleKind === 'reviewer'
    ? '审查级'
    : (object.layer === 'team' || (!object.taskId && object.roleKind === 'commander') ? '团队级' : '任务级')

  return h('article', {
    ref: cardRef,
    className: 'concerto-card' + (highlighted ? ' concerto-card-highlight' : ''),
    'data-concerto-object-id': object.id,
    'data-concerto-object-version': object.version,
    'data-concerto-renderer': renderer,
    'data-concerto-semantic': object.semanticKind || 'blueprint',
    'data-size': effectiveSize,
    tabIndex: -1,
    id: `concerto-stage-obj-${object.type}-${object.id}`,
  },
  h('div', { className: 'concerto-card-head' },
    h('div', { className: 'concerto-card-head-main' },
      h('div', { className: 'concerto-card-title-row' },
        h('h3', { title: object.title || `${object.type}:${object.id}` }, object.title || (object.type + ':' + object.id)),
        showInlineSemantic && h('span', {
          className: 'concerto-state-chip concerto-semantic-pill ' + semantic.cls,
          'data-semantic': object.semanticKind,
          title: object.snapshotAt ? '快照时间：' + new Date(object.snapshotAt).toLocaleString() : semantic.label,
        }, semanticText),
        isApprovedPlan && h('span', {
          className: 'concerto-state-chip concerto-semantic-pill ' + (goalCompleted ? 'concerto-state-done' : 'concerto-state-idle'),
          'data-concerto-plan-status': goalCompleted ? 'completed' : 'approved',
          title: goalCompleted ? '团队目标已结项，该计划已完成执行' : '当前已批准的团队计划基线',
        }, goalCompleted ? '目标已结项' : '已批准计划')),
      object.caption && h('div', { className: 'concerto-card-caption', title: object.caption }, object.caption)),
    h('div', { className: 'concerto-hover-tools' },
      onTogglePin && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon concerto-btn--pin',
        'aria-pressed': userPinned,
        disabled: pinBusy,
        'data-concerto-pin': `${object.type}:${object.id}`,
        'aria-label': userPinned ? '已置顶（点击取消）' : '置顶到概览预览',
        title: userPinned ? '取消个人置顶' : '个人置顶到概览预览（模型更新不覆盖）',
        onClick: () => onTogglePin(object),
      }, h(UiIcon, { name: 'pin', filled: userPinned })),
      modalBody && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        'aria-label': '展开画布',
        title: '全屏查看',
        onClick: () => setModalOpen(true),
      }, h(UiIcon, { name: 'expand' })),
      h('button', {
        ref: infoButtonRef,
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        title: '查看渲染引擎、来源与版本元数据',
        'aria-expanded': infoOpen,
        'aria-label': `查看 ${object.title || object.id} 元数据`,
        onPointerDown: (event) => {
          if (infoOpen) event.preventDefault()
        },
        onClick: () => setInfoOpen((v) => !v),
      }, h(UiIcon, { name: 'info' })))),

  infoOpen && h('div', {
    ref: infoPanelRef,
    popover: 'auto',
    role: 'dialog',
    'aria-label': `${object.title || object.id} 元数据`,
    className: 'concerto-info-pop',
  },
    h('div', null, '引用：', h('code', { className: 'concerto-id' }, `${object.type}:${object.id}`), ' · 语义：', h('strong', null, semantic.label),
      object.snapshotAt ? '（' + new Date(object.snapshotAt).toLocaleString() + '）' : '',
      badgeLabel ? ' · ' : '',
      badgeLabel && h('span', { className: 'concerto-tag' }, badgeLabel)),
    h('div', { style: { marginTop: 4 } }, '渲染引擎：', RENDERER_LABELS[renderer] || renderer,
      ENGINE_DETAILS[renderer] ? ' — ' + ENGINE_DETAILS[renderer] : ''),
    h('div', { style: { marginTop: 4 } }, '所有者：',
      object.source === 'user_import' ? '本机用户'
        : onOpenMember && object.authorId
        ? h('button', { type: 'button', className: 'concerto-chip', onClick: () => onOpenMember(object.authorId) }, object.authorId)
        : (object.ownerId || object.authorId || '未知'),
      ' · 层级：', h('span', { className: 'concerto-tag' }, layerLabel),
      ' · 版本：', h('span', { className: 'concerto-id' }, 'v' + object.version)),
    object.source === 'user_import' && h('div', { style: { marginTop: 4 } }, '来源：用户导入'),
    Array.isArray(object.editableBy) && object.editableBy.length > 0 && h('div', { style: { marginTop: 4 } },
      '编辑权限：', h('span', { className: 'concerto-id' }, object.editableBy.join(', '))),
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
