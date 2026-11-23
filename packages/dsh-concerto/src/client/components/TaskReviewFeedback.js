import React from 'react'
import { h, label } from '../api.js'
import { reviewTargetItems } from '../../../lib/domain/view_objects.mjs'

const STATUS = { open: '待处理', replied: '待复核', closed: '已关闭' }
const ACTION = { reply: '提交修订', close: '关闭意见', reopen: '重新打开' }
const viewRef = (obj) => `${obj.type}:${obj.id}@v${obj.version}`
const actorName = (actor) => actor?.kind === 'user' ? '用户' : actor?.id || 'Concerto'

export function TaskReviewFeedback({ task, taskObjects, executions, canWrite, disabled, onSave, onOpenVersion }) {
  const [target, setTarget] = React.useState(null)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const feedback = task.reviewFeedback ?? []
  const history = task.deliveryHistory ?? []
  const taskExecutions = executions.filter((entry) => entry.taskId === task.taskId)
  const targetOptions = target && !taskObjects.some((item) => viewRef(item) === viewRef(target))
    ? [...taskObjects, target] : taskObjects
  const items = target ? reviewTargetItems(target) : []

  function versionButton(obj) {
    return h('button', {
      type: 'button',
      className: 'concerto-link',
      onClick: () => onOpenVersion(obj.id, obj.version, viewRef(obj)),
    }, `${obj.title || obj.id} v${obj.version}${obj.itemLabel ? ` · ${obj.itemLabel}` : ''}`)
  }

  async function save(input, successText) {
    setError('')
    setMessage('')
    const ok = await onSave({ ...input, taskId: task.taskId }, setError)
    if (ok) setMessage(successText)
    return ok
  }

  async function create(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const text = fields.get('text').trim()
    if (!text) {
      setError('请输入审查意见。')
      form.elements.namedItem('text').focus()
      return
    }
    const itemId = fields.get('itemId')
    const ok = await save({
      action: 'create', text,
      targetExecutionId: task.result?.executionId ?? task.executionId ?? null,
      targetResultId: task.result?.resultId ?? null,
      ...(target ? { targetRef: viewRef(target) } : {}),
      ...(itemId ? { itemId } : {}),
    }, '审查意见已保存。')
    if (ok) {
      form.reset()
      setTarget(null)
    }
  }

  return h('section', { className: 'concerto-acc-box concerto-review-feedback', 'aria-label': '审查意见和历史' },
    h('strong', null, '审查意见'),
    feedback.length > 0 && h('ol', { className: 'concerto-review-threads' }, feedback.map((thread) => {
      const original = taskExecutions.find(({ executionId }) => executionId === thread.target.executionId)
      const action = thread.status === 'closed' ? 'reopen' : 'close'
      return h('li', { key: thread.feedbackId, className: 'concerto-review-thread' },
        h('header', { className: 'concerto-review-heading' },
          h('strong', null, actorName(thread.author)),
          h('span', { className: 'concerto-tag' }, STATUS[thread.status]),
          h('time', { dateTime: thread.createdAt, className: 'concerto-quiet' }, new Date(thread.createdAt).toLocaleString())),
        h('p', { className: 'concerto-review-text' }, thread.text),
        h('div', { className: 'concerto-review-heading concerto-quiet' },
          thread.target.resultId ? (original ? `第 ${original.attempt} 次交付` : '已提交交付') : (original ? `第 ${original.attempt} 次执行` : '任务'),
          thread.target.artifact && versionButton(thread.target.artifact)),
        thread.updates.length > 0 && h('ul', { className: 'concerto-review-updates' }, thread.updates.map((update) =>
          h('li', { key: update.version },
            h('span', { className: 'concerto-quiet' },
              `${actorName(update.author)} · ${ACTION[update.action]} · ${new Date(update.at).toLocaleString()}`),
            update.text && h('p', { className: 'concerto-review-text' }, update.text),
            update.evidence?.map((entry, index) => h('div', { key: index }, entry.artifact ? versionButton(entry.artifact) : entry.ref))))),
        canWrite && h('button', {
          type: 'button', className: 'concerto-btn', disabled,
          onClick: () => save({ action, feedbackId: thread.feedbackId, expectedVersion: thread.version },
            action === 'close' ? '意见已关闭。' : '意见已重新打开。'),
        }, ACTION[action]))
    })),
    canWrite && h('details', null,
      h('summary', null, '添加审查意见'),
      h('form', { onSubmit: create },
        h('div', { className: 'concerto-field' },
          h('label', null, '针对对象',
            h('select', { className: 'concerto-input', value: target ? viewRef(target) : '', disabled,
              onChange: (event) => setTarget(targetOptions.find((obj) => viewRef(obj) === event.target.value) ?? null) },
            h('option', { value: '' }, task.result ? '本次交付' : '任务'),
            targetOptions.map((obj) => h('option', { key: viewRef(obj), value: viewRef(obj) }, `${obj.title || obj.id} v${obj.version}`))))),
        target && versionButton(target),
        items.length > 0 && h('div', { className: 'concerto-field' },
          h('label', null, '成果条目',
            h('select', { key: viewRef(target), className: 'concerto-input', name: 'itemId', disabled },
              h('option', { value: '' }, '整个成果'),
              items.map(({ id, label: title }, index) => h('option', { key: `${id}-${index}`, value: id }, title))))),
        h('div', { className: 'concerto-field' },
          h('label', null, '意见内容',
            h('textarea', { name: 'text', className: 'concerto-textarea', required: true, maxLength: 4000, rows: 3, disabled }))),
        h('button', { type: 'submit', className: 'concerto-btn concerto-btn--primary', disabled }, '保存意见'))),
    error && h('p', { role: 'alert', className: 'concerto-field-error' }, error),
    h('span', { role: 'status', className: 'concerto-quiet' }, message),
    (taskExecutions.length > 0 || history.length > 0) && h('details', null,
      h('summary', null, '历次执行与验收'),
      taskExecutions.length > 0 && h('ul', { className: 'concerto-review-updates' }, taskExecutions.map((entry) =>
        h('li', { key: entry.executionId }, `${entry.kind === 'review' ? '审查' : '执行'} · 第 ${entry.attempt} 次 · ${entry.memberId || '未分配'} · ${label(entry.state)}`))),
      history.length > 0 && h('ol', { className: 'concerto-review-updates' }, history.map((event) => {
        const content = event.type === 'review.submitted' ? event.payload.review ?? event.payload.input : event.payload.result ?? event.payload.input
        if (!content) return null
        const recordTitle = event.type === 'review.submitted' ? (content.verdict === 'pass' ? '验收通过' : '退回返工') : '提交交付'
        return h('li', { key: event.eventId },
          h('strong', null, `${recordTitle} · ${actorName(event.actor)}`),
          h('span', { className: 'concerto-quiet' }, ` · ${new Date(event.recordedAt).toLocaleString()}`),
          h('p', { className: 'concerto-review-text' }, content.reason ?? content.summary),
          (content.artifactRefs ?? content.evidenceRefs)?.join(' · '),
          content.pinnedObjectVersions?.map((obj) => h('div', { key: viewRef(obj) }, versionButton(obj))))
      }))))
}
