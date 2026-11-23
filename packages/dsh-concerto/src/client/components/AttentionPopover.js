import React from 'react'
import { h } from '../api.js'
import { RequestCard, ReviewCard, AdjudicationCard } from './Panels.js'
import { UiIcon } from './UiIcon.js'
import { showAnchoredPopover, hideAnchoredPopover } from './popover.js'

export function AttentionPopover({ open, onClose, count, trigger, children }) {
  const rootRef = React.useRef(null)
  const closeRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const panelId = React.useId()

  React.useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const native = showAnchoredPopover(rootRef.current, panelRef.current, { width: 520, maxHeight: 640 })
    panelRef.current.dataset.nativePopover = String(native)
    const handleToggle = (event) => {
      if (event.newState === 'closed') onClose()
    }
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose()
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    if (native) {
      panelRef.current.addEventListener('toggle', handleToggle)
    } else {
      document.addEventListener('pointerdown', handlePointer, true)
      document.addEventListener('keydown', handleKey, true)
    }
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (native) {
        panelRef.current?.removeEventListener('toggle', handleToggle)
        hideAnchoredPopover(panelRef.current)
      } else {
        document.removeEventListener('pointerdown', handlePointer, true)
        document.removeEventListener('keydown', handleKey, true)
      }
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  return h('div', { className: 'concerto-attention-anchor', ref: rootRef },
    React.cloneElement(trigger, {
      'aria-expanded': open,
      'aria-controls': panelId,
      'aria-haspopup': 'dialog',
      onPointerDown: (event) => {
        trigger.props.onPointerDown?.(event)
        if (open) event.preventDefault()
      },
    }),
    open && h('div', {
      ref: panelRef,
      id: panelId,
      popover: 'auto',
      className: 'concerto-attention-popover concerto-surface',
      role: 'dialog',
      'aria-modal': 'false',
      'aria-label': `待处理事项，共 ${count} 项`,
      'data-concerto-section': 'attention',
    },
    h('div', { className: 'concerto-attention-popover-head' },
      h('strong', null, `待处理 ${count} 项`),
      h('button', {
        ref: closeRef,
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        'aria-label': '关闭待处理事项',
        onClick: onClose,
      }, h(UiIcon, { name: 'close' }))),
    children))
}

export function AttentionContent({
  attentionItems,
  blockingMissing,
  pending,
  unknownExecs,
  tasks,
  executions,
  canAct,
  command,
  jumpToTask,
  openMemberDrawer,
}) {
  return h('div', { className: 'concerto-attention-content' },
    blockingMissing.length > 0 && h('div', { className: 'concerto-attn-card', 'data-concerto-missing-required': 'true' },
      h('strong', null, `缺少验收必需视图（${blockingMissing.length}）`),
      h('div', { className: 'concerto-attention-pills' },
        blockingMissing.map((rv) => h('span', {
          key: `${rv.taskId || 'team'}:${rv.type}:${rv.id}`,
          className: 'concerto-req-view-pill',
          'data-missing': 'true',
        },
        h('span', { className: 'concerto-id' }, `${rv.type}:${rv.id}`),
        rv.taskId && h('button', {
          type: 'button',
          className: 'concerto-chip concerto-id',
          onClick: () => jumpToTask(rv.taskId),
        }, rv.taskId))))),
    attentionItems.map((item) => {
      if (item.kind === 'request' || item.kind === 'approval' || item.kind === 'question') {
        const req = pending.find((r) => r.requestId === item.requestId)
        if (!req) return null
        return h('div', { key: item.id, className: 'concerto-attn-card', 'data-kind': item.kind },
          h('div', { className: 'concerto-attention-card-head' },
            h('strong', null, (req.kind === 'approval' ? '请求批准' : '向你提问') + ' · ' + (req.memberId || '成员')),
            req.taskId && h('span', { className: 'concerto-tag concerto-id' }, req.taskId)),
          h(RequestCard, {
            item: req,
            bare: true,
            disabled: !canAct,
            onAnswer: (it, ans) => command('/requests/respond', { requestId: it.requestId, answer: ans }),
          }))
      }
      if (item.kind === 'unknown') {
        const exec = unknownExecs.find((e) => e.executionId === item.executionId)
        if (!exec) return null
        return h('div', { key: item.id, className: 'concerto-attn-card', 'data-kind': 'unknown' },
          h('div', { className: 'concerto-attention-card-head' },
            h('strong', null, '需要你裁决 · ' + exec.taskId),
            h('button', { type: 'button', className: 'concerto-link concerto-id', onClick: () => jumpToTask(exec.taskId) }, `定位 ${exec.taskId} ›`)),
          h(AdjudicationCard, {
            execution: exec,
            bare: true,
            disabled: !canAct,
            onSubmit: (input) => command('/executions/adjudicate', input),
          }))
      }
      if (item.kind === 'review') {
        const task = tasks.find((t) => t.taskId === item.taskId)
        if (!task) return null
        const execSettled = executions.some((e) => e.executionId === task.executionId && ['finished', 'stopped'].includes(e.state))
        return h('div', { key: item.id, className: 'concerto-attn-card', 'data-kind': 'review' },
          h('div', { className: 'concerto-attention-card-head' },
            h('strong', null, '待你验收 · ' + task.title),
            h('button', { type: 'button', className: 'concerto-link concerto-id', onClick: () => jumpToTask(task.taskId) }, `定位 ${task.taskId} ›`)),
          task.result?.summary && h('p', { className: 'concerto-attention-summary' }, task.result.summary),
          task.result && h(ReviewCard, {
            task,
            bare: true,
            disabled: !canAct || !execSettled,
            onReview: (tk, verdict, reason) => command('/tasks/review', {
              taskId: tk.taskId,
              executionId: tk.executionId,
              resultId: tk.result.resultId,
              verdict,
              reason,
            }),
          }))
      }
      return h('div', { key: item.id, className: 'concerto-attn-card', 'data-kind': item.kind || 'blocked' },
        h('div', { className: 'concerto-attention-card-head' },
          h('strong', null, item.title),
          item.taskId && h('button', { type: 'button', className: 'concerto-link concerto-id', onClick: () => jumpToTask(item.taskId) }, `定位 ${item.taskId} ›`)),
        item.detail && h('p', { className: 'concerto-attention-summary' }, item.detail),
        item.memberId && h('div', null,
          h('button', { type: 'button', className: 'concerto-chip', onClick: () => openMemberDrawer(item.memberId, 'messages') },
            '查看 ' + item.memberId + ' 详情 ›')))
    }))
}
