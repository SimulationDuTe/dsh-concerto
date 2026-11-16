import React from 'react'
import { createPortal } from 'react-dom'
import {
  h,
  styles,
  cardStyle,
  label,
  EVENT_LABEL,
  request,
  useTeamSession,
  roster,
  pendingRequests,
  memberState,
  findTeamTab,
  selectHostTeamTab,
  requestMemberDrawerOpen,
  useHostTheme,
} from '../api.js'
import { useTeamCss } from '../styles.js'
import { MemberGlyph, MemberSprite } from './MemberSprite.js'
import { RequestCard, ReviewCard, AdjudicationCard } from './Panels.js'

const TOOL_LABELS = {
  get_team_status: '读取团队状态',
  submit_decision: '提交团队决策',
  dispatch_task: '派发任务',
  get_task: '读取任务详情',
  report_progress: '汇报任务进展',
  submit_result: '提交任务交付',
  submit_review: '提交验收结论',
  publish_view_object: '发布产物',
  patch_view_object: '局部更新产物',
  list_view_objects: '浏览产物列表',
  read_view_object: '按需读取产物',
  update_team_view: '更新指挥台简报',
}

export function ConcertoDock({ sessionId }) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const { info, error, refresh } = useTeamSession(sessionId)
  const [teamTabAvailable, setTeamTabAvailable] = React.useState(false)
  const snapshot = info?.snapshot

  React.useEffect(() => {
    if (!info || typeof requestAnimationFrame === 'undefined') return
    const frame = requestAnimationFrame(() => {
      selectHostTeamTab(sessionId, false)
      setTeamTabAvailable(Boolean(findTeamTab()))
    })
    return () => cancelAnimationFrame(frame)
  }, [sessionId, Boolean(info)])

  const [actionError, setActionError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [selectedMember, setSelectedMember] = React.useState('')
  const button = React.useRef(null)
  const lastCommand = React.useRef(null)

  React.useEffect(() => {
    setOpen(false)
    setFilter('')
    setSelectedMember('')
    setActionError('')
    lastCommand.current = null
  }, [sessionId])

  const close = React.useCallback(() => {
    setOpen(false)
    button.current?.focus?.()
  }, [])

  React.useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const escape = (event) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, close])

  if (!info || !snapshot) return error ? h('div', { role: 'status', style: styles.dock }, error) : null

  const canAct = info.roleKind === 'commander' && !busy && !error
  async function command(path, input) {
    setBusy(true)
    setActionError('')
    const signature = JSON.stringify({ path, input, sessionId })
    if (lastCommand.current?.signature !== signature) lastCommand.current = { signature, id: crypto.randomUUID() }
    try {
      await request(path, { method: 'POST', body: JSON.stringify({ ...input, sessionId, commandId: lastCommand.current.id }) })
      lastCommand.current = null
      refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pending = pendingRequests(snapshot)
  const active = snapshot.executions.filter((e) => ['running', 'waiting_input', 'waiting_approval', 'interrupting'].includes(e.state))
  const unknown = snapshot.executions.filter((e) => e.state === 'unknown' && !e.quarantined)
  const members = roster(snapshot)
  const summary = active.length + ' 个执行 · ' + pending.length + ' 项待处理' + (unknown.length ? ' · ' + unknown.length + ' 项状态未知' : '')

  const sprite = (member) => {
    const state = memberState(snapshot, member)
    return h(MemberSprite, {
      key: member.id,
      member,
      state,
      count: pending.filter((r) => r.memberId === member.id).length,
      selected: open && selectedMember === member.id,
      onClick: () => { setSelectedMember(member.id); setFilter(''); setOpen(true) },
    })
  }

  const visibleTasks = snapshot.tasks.filter((t) => !selectedMember || t.memberId === selectedMember)
  const panel = open && h('section', {
    className: 'concerto-surface concerto-panel',
    'data-concerto-theme': hostTheme.colorScheme,
    style: hostTheme.cssVars,
    'aria-label': 'Concerto 团队运行面板',
  },
  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
    h('strong', null, selectedMember ? info.teamName + ' / ' + selectedMember : info.teamName),
    h('div', { style: { display: 'flex', gap: 6 } },
      selectedMember && teamTabAvailable && h('button', {
        type: 'button',
        className: 'concerto-btn',
        onClick: () => {
          requestMemberDrawerOpen(sessionId, selectedMember, { tab: 'messages' })
          close()
          selectHostTeamTab(sessionId, true)
        },
      }, '打开成员抽屉'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: close }, '关闭'))),
  h('div', { style: styles.muted }, '最后同步 ' + new Date(snapshot.serverTime).toLocaleTimeString()),
  error && h('p', { role: 'status' }, error + '；保留最后一次成功快照'),
  actionError && h('p', { role: 'alert' }, actionError),
  pending.length > 0 && h('h3', null, '需要处理'),
  pending.filter((r) => !selectedMember || r.memberId === selectedMember).map((item) =>
    h(RequestCard, {
      key: item.requestId,
      item,
      disabled: !canAct,
      onAnswer: (it, answer) => command('/requests/respond', { requestId: it.requestId, answer }),
    })),
  unknown.filter((e) => !selectedMember || e.memberId === selectedMember).map((execution) =>
    h(AdjudicationCard, {
      key: execution.executionId,
      execution,
      disabled: !canAct,
      onSubmit: (input) => command('/executions/adjudicate', input),
    })),
  h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 } }, members.map(sprite)),
  selectedMember && h('button', { type: 'button', className: 'concerto-btn', style: { marginTop: 8 }, onClick: () => setSelectedMember('') }, '查看整个团队'),
  h('h3', null, '任务'),
  visibleTasks.length === 0 && h('p', null, '暂无任务'),
  visibleTasks.map((task) => h('article', { key: task.taskId, style: cardStyle },
    h('strong', null, task.title),
    h('span', { style: { marginLeft: 8 } }, label(task.viewState)),
    h('div', { style: styles.muted }, task.taskId + ' · ' + (task.memberId || '尚未分配') + ' · 第 ' + task.attempt + ' 次执行'),
    task.state === 'review' && active.some((e) => e.executionId === task.executionId) && h('p', null, '结果已提交，原生执行尚未结束；确认结束后才能审查。'),
    task.blockedReason && h('p', null, task.blockedReason),
    task.executionId && h('details', null,
      h('summary', { style: { cursor: 'pointer' } }, '执行耗时与阶段'),
      h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 'var(--cc-fs-code)' } },
        JSON.stringify(snapshot.executions.find((e) => e.executionId === task.executionId)?.metrics ?? {}, null, 2)),
      h('small', null, '最近状态写盘：' + (snapshot.lastPersistenceMs ?? '未采集') + ' ms')),
    task.result && h('details', null,
      h('summary', null, task.result.executionId === task.executionId ? '结果与证据' : '上次执行的结果与证据'),
      h('p', { style: { whiteSpace: 'pre-wrap' } }, task.result.summary),
      (task.result.artifactRefs || []).map((ref) => h('pre', { key: ref, style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, ref))),
    task.retryCwd && h('p', { style: { ...styles.muted, overflowWrap: 'anywhere' } }, '隔离工作目录：' + task.retryCwd),
    task.state === 'pending' && h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--primary',
      disabled: !canAct || active.length > 0 || unknown.length > 0,
      onClick: () => command('/tasks/dispatch', { taskId: task.taskId }),
    }, '派发任务'),
    active.some((e) => e.executionId === task.executionId) && h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost',
      disabled: !canAct || !active.some((e) => e.executionId === task.executionId && !e.connectorId.startsWith('hosted:') && e.state !== 'interrupting'),
      onClick: () => command('/tasks/cancel', { taskId: task.taskId, executionId: task.executionId }),
    }, '请求取消'),
    task.state === 'review' && h(ReviewCard, {
      task,
      disabled: !canAct || !snapshot.executions.some((e) => e.executionId === task.executionId && ['finished', 'stopped'].includes(e.state)),
      onReview: (tk, verdict, reason) => command('/tasks/review', {
        taskId: tk.taskId,
        executionId: tk.executionId,
        resultId: tk.result.resultId,
        verdict,
        reason,
      }),
    }))),
  h('details', { style: { marginTop: 18 } },
    h('summary', { style: { cursor: 'pointer' } }, '最近活动 · ' + snapshot.events.length),
    h('label', null, '筛选任务 ',
      h('select', { value: filter, onChange: (event) => setFilter(event.target.value), style: styles.input },
        h('option', { value: '' }, '全部任务'),
        snapshot.tasks.map((t) => h('option', { key: t.taskId, value: t.taskId }, t.taskId)))),
    h('ol', { style: { paddingLeft: 20 } },
      snapshot.events
        .filter((e) => (!filter || e.taskId === filter) && (!selectedMember || e.actor?.id === selectedMember || snapshot.executions.some((x) => x.executionId === e.executionId && x.memberId === selectedMember)))
        .slice()
        .reverse()
        .map((event) => h('li', { key: event.eventId, style: { marginTop: 8 } },
          h('details', null,
            h('summary', null, new Date(event.recordedAt).toLocaleTimeString() + ' · ' + (event.actor?.id || 'Concerto') + ' · ' + (EVENT_LABEL[event.type] || event.type) + (event.taskId ? ' · ' + event.taskId : '')),
            h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 240, overflow: 'auto' } }, JSON.stringify(event.payload, null, 2))))))))

  const hasTeamViewOrTab = teamTabAvailable || (typeof document !== 'undefined' && (Boolean(document.querySelector('[data-concerto-team-view]')) || Boolean(findTeamTab())))
  if (hasTeamViewOrTab) return null
  return h(React.Fragment, null,
    h('div', { className: 'concerto-surface concerto-dock', 'data-concerto-theme': hostTheme.colorScheme, style: hostTheme.cssVars },
      h('button', {
        ref: button,
        type: 'button',
        className: 'concerto-btn concerto-btn--primary',
        'aria-expanded': open,
        onClick: () => { setSelectedMember(''); setOpen(!open) },
      }, info.teamName + ' · 团队'),
      h('span', { role: 'status', 'aria-atomic': true }, error ? '连接中断 · 显示上次状态' : summary),
      h('button', { type: 'button', className: 'concerto-btn', onClick: refresh }, '刷新')),
    panel && typeof document !== 'undefined' && document.body ? createPortal(panel, document.body) : null)
}

// DSH 0.2.2-rc.1 has no avatar slot; mount `.concerto-message-avatar` beside host row safely via WeakMap.
const avatarFlows = typeof WeakMap !== 'undefined' ? new WeakMap() : null
export function bindMessageAvatars(flow, binding) {
  if (!avatarFlows) return () => {}
  let manager = avatarFlows.get(flow)
  if (!manager) {
    const entries = new Set()
    const mounts = new Map()
    let frame = 0
    const remove = (row, mount) => {
      mount.remove()
      row.removeAttribute('data-concerto-member-row')
      mounts.delete(row)
    }
    function sync() {
      frame = 0
      const byTurn = new Map([...entries].map((entry) => [String(entry.turn), entry]))
      const groups = new Map([...entries].map((entry) => [entry, []]))
      const turns = [...flow.querySelectorAll('[data-chat-turn]')].map((row) => Number(row.dataset.chatTurn))
      const latest = Math.max(0, ...turns)
      const rows = new Set()
      for (const row of flow.querySelectorAll('[data-chat-flow-kind="assistant-step"]:not([data-chat-group-part="reasoning"])')) {
        const entry = byTurn.get(row.dataset.chatTurn)
        if (!entry?.memberId) continue
        rows.add(row)
        let mount = mounts.get(row)
        if (!mount || !row.contains(mount)) {
          mount = document.createElement('div')
          mount.className = 'concerto-message-avatar'
          row.appendChild(mount)
          mounts.set(row, mount)
        }
        row.setAttribute('data-concerto-member-row', entry.memberId)
        groups.get(entry).push(mount)
      }
      for (const [row, mount] of mounts) if (!rows.has(row)) remove(row, mount)
      for (const entry of entries) entry.notify({ mounts: groups.get(entry), latest: entry.turn === latest, error: '' })
    }
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(sync)
    })
    observer.observe(flow, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-chat-turn', 'data-chat-flow-kind', 'data-chat-group-part'],
    })
    manager = {
      add(entry) { entries.add(entry); sync() },
      remove(entry) {
        entries.delete(entry)
        if (entries.size) sync()
        else {
          observer.disconnect()
          cancelAnimationFrame(frame)
          for (const [row, mount] of mounts) remove(row, mount)
          avatarFlows.delete(flow)
        }
      },
    }
    avatarFlows.set(flow, manager)
  }
  manager.add(binding)
  return () => manager.remove(binding)
}

function useMessageAvatars(anchor, turn, memberId, enabled) {
  const [placement, setPlacement] = React.useState({ mounts: [], latest: false, error: '' })
  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    const flow = anchor.current?.closest('[data-slot="conversation.chat.flow"]')
    if (!flow || !Number.isInteger(turn)) {
      setPlacement({ mounts: [], latest: true, error: '宿主头像挂载点未找到，当前仅显示内嵌卡片。' })
      return
    }
    return bindMessageAvatars(flow, {
      turn,
      memberId,
      notify(next) {
        setPlacement((old) => (
          old.latest === next.latest &&
          old.error === next.error &&
          old.mounts.length === next.mounts.length &&
          old.mounts.every((node, i) => node === next.mounts[i])
            ? old
            : next
        ))
      },
    })
  }, [anchor, turn, memberId, enabled])
  return placement
}

export function ConcertoTurnCard({ sessionId, turn }) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const { info, error, refresh } = useTeamSession(sessionId)
  const anchor = React.useRef(null)
  const card = React.useRef(null)
  const [opened, setOpened] = React.useState(false)
  const [selected, setSelected] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const lastCommand = React.useRef(null)
  const snapshot = info?.snapshot

  React.useEffect(() => {
    setOpened(false)
    setSelected('')
    setActionError('')
    lastCommand.current = null
  }, [sessionId])

  const members = snapshot ? roster(snapshot) : []
  const speaker = members.find((member) => member.id === info?.memberId)
  const placement = useMessageAvatars(anchor, turn.turn, speaker?.id, Boolean(info))

  function reveal(memberId) {
    setSelected(memberId)
    setOpened(true)
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        card.current?.scrollIntoView?.({ block: 'nearest' })
        card.current?.focus?.({ preventScroll: true })
      })
    }
  }

  async function answer(item, ans) {
    setBusy(true)
    setActionError('')
    const input = { sessionId, requestId: item.requestId, answer: ans }
    const signature = JSON.stringify(input)
    if (lastCommand.current?.signature !== signature) lastCommand.current = { signature, id: crypto.randomUUID() }
    try {
      await request('/requests/respond', { method: 'POST', body: JSON.stringify({ ...input, commandId: lastCommand.current.id }) })
      lastCommand.current = null
      refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!info || !snapshot) return h('div', { ref: anchor, className: 'concerto-turn-anchor' })
  const pending = pendingRequests(snapshot)
  const tasks = snapshot.tasks.filter((task) => !selected || task.memberId === selected)
  const events = snapshot.events.filter((event) => !selected || event.actor?.id === selected || snapshot.executions.some((e) => e.executionId === event.executionId && e.memberId === selected))
  const canAct = info.roleKind === 'commander' && !busy && !error
  const drawerTarget = selected || speaker?.id || ''

  return h('div', { ref: anchor, className: 'concerto-turn-anchor', 'data-concerto-turn': turn.turn },
    speaker && placement.mounts.map((mount, index) => createPortal(
      h('button', {
        type: 'button',
        'data-state': error ? 'unknown' : memberState(snapshot, speaker),
        'aria-label': speaker.id + ' · ' + (speaker.roleKind === 'commander' ? '指挥者' : '成员') + '，查看当前团队状态',
        onClick: () => reveal(speaker.id),
      },
      h(MemberGlyph, { member: speaker, state: error ? 'unknown' : memberState(snapshot, speaker), size: 36 }),
      h('small', null, speaker.id)),
      mount,
      String(index))),
    (placement.latest || opened) && h('section', {
      ref: card,
      tabIndex: -1,
      className: 'concerto-surface concerto-turn-card',
      'data-concerto-theme': hostTheme.colorScheme,
      style: hostTheme.cssVars,
      'aria-label': 'Concerto 对话内团队动态',
      'data-concerto-session-id': sessionId,
    },
    h('div', { className: 'concerto-turn-heading' },
      h('strong', null, info.teamName + ' · 团队动态'),
      h('span', { className: 'concerto-badge concerto-id' }, `v${snapshot.planRevision}`),
      h('small', null, '当前状态 · ' + new Date(snapshot.serverTime).toLocaleTimeString()),
      drawerTarget && h('button', {
        type: 'button',
        className: 'concerto-btn',
        onClick: () => {
          requestMemberDrawerOpen(sessionId, drawerTarget, { tab: 'messages' })
          selectHostTeamTab(sessionId, true)
        },
      }, '打开 ' + drawerTarget + ' 详情'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: refresh }, '同步')),
    error && h('p', { role: 'status' }, '连接中断 · 显示上次状态'),
    placement.error && h('p', { role: 'status' }, placement.error),
    !speaker && h('p', { role: 'status' }, '当前会话的成员身份尚未绑定，保留原头像。'),
    actionError && h('p', { role: 'alert' }, actionError),
    h('div', { className: 'concerto-turn-members' }, members.map((member) => {
      const state = memberState(snapshot, member)
      const count = pending.filter((item) => item.memberId === member.id).length
      return h('button', {
        key: member.id,
        type: 'button',
        className: 'concerto-turn-member',
        'aria-pressed': selected === member.id,
        onClick: () => setSelected(selected === member.id ? '' : member.id),
      },
      h(MemberGlyph, { member, state }),
      h('span', null, h('strong', null, member.id),
        h('small', null, label(state) + (count ? ' · ' + count + ' 项待办' : ''))))
    })),
    selected && h('button', { type: 'button', className: 'concerto-btn', style: { marginTop: 10 }, onClick: () => setSelected('') }, '查看全部成员'),
    tasks.length === 0 && h('p', { style: styles.muted }, selected ? selected + ' 当前没有分配的任务。' : '暂无任务，团队已就绪。'),
    tasks.slice(-4).map((task) => h('article', { key: task.taskId, className: 'concerto-turn-task' },
      h('strong', null, (task.memberId || '待分配') + ' · ' + task.title),
      h('small', { style: { ...styles.muted, marginLeft: 8 } }, label(task.viewState)),
      (task.blockedReason || task.progress?.at(-1)?.note) && h('p', null, task.blockedReason || task.progress.at(-1).note),
      task.result && h('details', null, h('summary', null, '查看结果'), h('p', { style: { whiteSpace: 'pre-wrap' } }, task.result.summary)))),
    pending.filter((item) => !selected || item.memberId === selected).map((item) =>
      h(RequestCard, { key: item.requestId, item, disabled: !canAct, onAnswer: answer })),
    events.length > 0 && h('details', { style: { marginTop: 12 } },
      h('summary', { style: { cursor: 'pointer', color: 'var(--cc-text-secondary)' } }, '最近活动 · ' + events.length),
      h('ol', { className: 'concerto-turn-events' },
        events.slice(-6).reverse().map((event) => h('li', { key: event.eventId },
          new Date(event.recordedAt).toLocaleTimeString() + ' · ' + (event.actor?.id || 'Concerto') + ' · ' + (EVENT_LABEL[event.type] || event.type) + (event.taskId ? ' · ' + event.taskId : '')))))))
}

function summarizePayload(tool, payload) {
  const value = payload || {}
  if (tool === 'get_team_status') return 'planRevision ' + (value.planRevision ?? '?') + ' · 任务 ' + (Array.isArray(value.tasks) ? value.tasks.length : 0)
  if (tool === 'submit_decision') return (value.replayed ? 'replayed' : 'applied') + ' · plan ' + (value.planRevision ?? '?')
  if (tool === 'get_task') return String(value.task?.taskId ?? '') + ' · ' + String(value.task?.state ?? '')
  if (tool === 'dispatch_task') return String(value.taskId ?? '') + ' → ' + String(value.memberId || value.state || 'running')
  if (tool === 'submit_result' || tool === 'submit_review') return String(value.taskId ?? '') + ' → ' + String(value.state ?? '')
  if (tool === 'publish_view_object' || tool === 'patch_view_object') return String(value.id ?? '') + ' · v' + (value.version ?? '?')
  if (tool === 'list_view_objects') return '对象 ' + (Array.isArray(value.objects) ? value.objects.length : 0)
  if (tool === 'read_view_object') return String(value.id ?? '') + ' · v' + (value.version ?? '?')
  return value.ok === false ? String(value.code ?? 'error') : 'ok'
}

export function ConcertoToolCard({ callId, toolName, phase, block, inspect }) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const text = phase === 'result'
    ? (block.content || []).filter((part) => part.type === 'text').map((part) => part.text).join('\n')
    : ''
  let payload = null
  let parseError = null
  if (text) {
    try { payload = JSON.parse(text) } catch (err) { parseError = err.message }
  }
  const failed = Boolean(block.isError || block.error || payload?.ok === false)
  const status = phase === 'result' ? (failed ? '未成功' : '已返回') : (phase === 'preparing' ? '准备中' : '执行中')
  const titleLabel = TOOL_LABELS[toolName] ? `${TOOL_LABELS[toolName]} · ${toolName}` : toolName
  return h('details', {
    className: 'concerto-surface concerto-tool-card',
    'data-concerto-theme': hostTheme.colorScheme,
    style: { ...styles.inlineCard, ...(hostTheme.cssVars || {}) },
    'data-concerto-call-id': callId,
    'data-concerto-tool': toolName,
  },
  h('summary', { style: { cursor: 'pointer', padding: 6 }, title: toolName },
    'Concerto · ' + titleLabel + ' · ' + status,
    payload && h('span', { style: { marginLeft: 8 } }, summarizePayload(toolName, payload))),
  h('div', { className: 'concerto-id', style: styles.muted }, '调用 ' + callId),
  parseError && h('div', { role: 'status' }, '结构化结果无法解析，显示原文'),
  h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflow: 'auto' } },
    text || inspect?.text || JSON.stringify(block, null, 2)))
}
