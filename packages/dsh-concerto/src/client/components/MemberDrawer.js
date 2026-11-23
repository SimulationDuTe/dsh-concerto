import React from 'react'
import { API, h, label, EVENT_LABEL, STATE_META, styles, fetchMemberActivity, fetchMemberDuties, updateMemberDuties, readHostChatMessages, formatCapabilitySummary } from '../api.js'
import { TabList, tabPanelProps } from './Tabs.js'
import { InspectorDialog } from './TaskInspectorDialog.js'
import { UiIcon, StateChip } from './UiIcon.js'
import { MemberGlyph } from './MemberSprite.js'
import { StructuredObjectCard } from './StructuredObjectCard.js'
import { ReferenceText } from './ReferenceText.js'

const HISTORY_SOURCE_DESC = {
  codex_normalized: 'Codex app-server · 消息与工具活动记录',
  connector_normalized: '外部连接器 · 归一化消息与工具活动记录',
  hosted_session: 'DSH Hosted · 宿主 session 事件投影 + Runtime 记录（完整度待真实宿主验证）',
  hosted_partial: 'DSH Hosted · 仅 Runtime 记录与决策摘要（未读取到宿主会话事件）',
  runtime_only: '该后端仅提供 Runtime 生命周期记录',
}

function EmptyState({ icon, text, action = null }) {
  return h('div', { className: 'concerto-empty' },
    h('span', { 'aria-hidden': true, style: { fontSize: 'var(--cc-fs-display)' } }, icon),
    h('p', { style: { margin: 0 } }, text),
    action)
}

function dutyAuthor(record) {
  return record.author.kind === 'user' ? '用户' : `指挥者 ${record.author.id}`
}

function MemberDutiesPanel({ sessionId, memberId }) {
  const fieldId = React.useId()
  const [data, setData] = React.useState(null)
  const [draft, setDraft] = React.useState(null)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [needsReload, setNeedsReload] = React.useState(false)
  const [reload, setReload] = React.useState(0)
  React.useEffect(() => {
    let active = true
    fetchMemberDuties(sessionId, memberId).then((result) => {
      if (!active) return
      setData(result)
      setNeedsReload(false)
    }, (error) => {
      if (!active) return
      setMessage(`读取失败：${error.message}`)
      setNeedsReload(true)
    })
    return () => { active = false }
  }, [sessionId, memberId, reload])

  const current = data?.current
  const save = async (event) => {
    event.preventDefault()
    const action = event.nativeEvent.submitter?.value || 'save'
    const body = new FormData(event.currentTarget).get('body')
    setPending(true)
    setMessage('')
    try {
      const updated = await updateMemberDuties(sessionId, memberId, {
        action,
        ...(action === 'save' ? { body } : {}),
        expectedVersion: current?.version ?? 0,
      })
      setData(updated)
      setDraft(null)
      setMessage(action === 'save' ? `已保存 v${updated.current.version}。` : '已撤销。')
    } catch (error) {
      setMessage(error.message)
      setNeedsReload(error.status === 409)
    } finally {
      setPending(false)
    }
  }

  return h('div', { className: 'concerto-card' },
    data && h('form', { action: `${API}/members/duties`, method: 'post', onSubmit: save },
      h('div', { style: styles.muted },
        current ? `v${current.version} · ${dutyAuthor(current)} · ${current.active ? '生效中' : '已撤销'}` : '暂无职责补充'),
      h('div', { className: 'concerto-field' },
        h('label', { htmlFor: fieldId }, '项目成员职责补充（必填）'),
        h('textarea', {
          id: fieldId, name: 'body', className: 'concerto-textarea', rows: 4,
          value: draft ?? current?.body ?? '',
          required: true, maxLength: data.maxLength,
          disabled: pending, 'aria-describedby': fieldId + '-hint',
          onChange: (event) => setDraft(event.target.value),
        }),
        h('p', { id: fieldId + '-hint', className: 'concerto-field-hint' }, '用于该成员后续派发。可填写职责重点、项目约定和交付要求。')),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        h('button', { type: 'submit', value: 'save', className: 'concerto-btn concerto-btn--primary', disabled: pending || needsReload }, '保存职责'),
        current?.active && h('button', {
          type: 'submit', value: 'revoke', className: 'concerto-btn concerto-btn--ghost',
          formNoValidate: true, disabled: pending || needsReload,
        }, '撤销职责'))),
    h('div', { role: 'status', style: styles.muted }, message || (!data ? '正在读取职责补充…' : '')),
    needsReload && h('button', {
      type: 'button', className: 'concerto-btn concerto-btn--ghost',
      onClick: () => { setMessage(''); setReload((value) => value + 1) },
    }, '重新读取'),
    data?.versions.length > 0 && h('details', { style: { marginTop: 8 } },
      h('summary', null, '版本历史'),
      h('ol', null, data.versions.slice().reverse().map((record) => h('li', { key: record.version },
        `v${record.version} · ${dutyAuthor(record)} · ${new Date(record.updatedAt).toLocaleString()} ${record.active ? '' : '· 已撤销'}`,
        record.active && h('p', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, record.body)))))
  )
}

function activityFromSnapshotEvents(snapshot, memberId) {
  const memberExecs = (snapshot?.executions || []).filter((e) => e.memberId === memberId)
  const items = []
  for (const ev of (snapshot?.events || [])) {
    const owned = ev.actor?.id === memberId || memberExecs.some((x) => x.executionId === ev.executionId)
    if (!owned) continue
    if (ev.type === 'output.message') {
      items.push({
        activityId: ev.eventId,
        kind: 'message',
        taskId: ev.taskId,
        executionId: ev.executionId,
        summary: (ev.payload?.text || '').slice(0, 100),
        text: ev.payload?.text || '',
        recordedAt: ev.recordedAt,
      })
    } else {
      items.push({
        activityId: ev.eventId,
        kind: ev.type.includes('approval') || ev.type.includes('question') ? 'request' : 'result',
        taskId: ev.taskId,
        executionId: ev.executionId,
        summary: (EVENT_LABEL[ev.type] || ev.type) + (ev.payload?.note ? ' · ' + ev.payload.note : ''),
        detail: ev.payload,
        recordedAt: ev.recordedAt,
      })
    }
  }
  return items
}

function appendUniqueActivities(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev
  const existing = new Set((prev || []).map((item) => item.activityId))
  const additions = []
  for (const item of incoming) {
    if (!item?.activityId || existing.has(item.activityId)) continue
    existing.add(item.activityId)
    additions.push(item)
  }
  return additions.length > 0 ? [...(prev || []), ...additions] : prev
}

function mergeLatestActivities(prev, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev || []
  const byId = new Map()
  for (const item of incoming) {
    if (item?.activityId) byId.set(item.activityId, item)
  }
  const seen = new Set()
  const updated = []
  for (const item of (prev || [])) {
    const id = item?.activityId
    if (!id) continue
    seen.add(id)
    updated.push(byId.get(id) || item)
  }
  const additions = []
  for (const item of incoming) {
    if (!item?.activityId || seen.has(item.activityId)) continue
    seen.add(item.activityId)
    additions.push(item)
  }
  if (additions.length === 0 && updated.every((item, i) => item === (prev || [])[i])) {
    return prev || []
  }
  return [...updated, ...additions]
}

function prependOlderActivities(prev, olderItems) {
  if (!Array.isArray(olderItems) || olderItems.length === 0) return prev || []
  const existingIds = new Set((prev || []).map((item) => item.activityId))
  const uniqueOlder = olderItems.filter((item) => item?.activityId && !existingIds.has(item.activityId))
  return [...uniqueOlder, ...(prev || [])]
}

export function MemberDrawer({
  member,
  state,
  sessionId,
  snapshot,
  canManageDuties = false,
  initialTab = 'messages',
  onClose,
  onJumpTask,
  onOpenMember,
  onJumpObject,
  returnTaskId = '',
  onBack = null,
}) {
  const [tab, setTab] = React.useState(initialTab)
  const [activities, setActivities] = React.useState([])
  const [hasMore, setHasMore] = React.useState(false)
  const [nextBefore, setNextBefore] = React.useState(null)
  const [historyMode, setHistoryMode] = React.useState('runtime_only')
  const [loading, setLoading] = React.useState(false)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  const [historyError, setHistoryError] = React.useState('')
  const [olderError, setOlderError] = React.useState('')
  const [historyRetry, setHistoryRetry] = React.useState(0)
  const tabsId = React.useId()
  const bodyRef = React.useRef(null)
  const hasLoadedInitialRef = React.useRef(false)
  const pagedOlderRef = React.useRef(false)
  const loadingOlderRef = React.useRef(false)
  const requestGenRef = React.useRef(0)
  const pendingScrollAnchorRef = React.useRef(null)

  React.useEffect(() => {
    setTab(initialTab || 'messages')
  }, [member?.id, initialTab])

  React.useEffect(() => {
    requestGenRef.current += 1
    hasLoadedInitialRef.current = false
    pagedOlderRef.current = false
    loadingOlderRef.current = false
    pendingScrollAnchorRef.current = null
    setActivities([])
    setHasMore(false)
    setNextBefore(null)
    setLoadingOlder(false)
    setHistoryError('')
    setOlderError('')
  }, [member?.id, sessionId])

  React.useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current
    const body = bodyRef.current
    if (!anchor || !body) return
    pendingScrollAnchorRef.current = null
    const delta = body.scrollHeight - anchor.prevScrollHeight
    if (delta > 0) body.scrollTop = anchor.prevScrollTop + delta
  }, [activities])

  React.useEffect(() => {
    if (!member?.id || !sessionId) return
    const isInitial = !hasLoadedInitialRef.current
    const gen = requestGenRef.current
    let cancelled = false
    if (isInitial) setLoading(true)
    fetchMemberActivity(sessionId, member.id, { limit: 30 })
      .then((res) => {
        if (cancelled || requestGenRef.current !== gen) return
        const incoming = Array.isArray(res.items) ? res.items : []
        setHistoryError('')
        const firstApply = !hasLoadedInitialRef.current
        hasLoadedInitialRef.current = true
        setActivities((prev) => (firstApply ? incoming : mergeLatestActivities(prev, incoming)))
        if (firstApply || !pagedOlderRef.current) {
          setHasMore(Boolean(res.hasMore))
          setNextBefore(res.nextBefore ?? null)
        }
        setHistoryMode(res.backendHistoryMode || (member.connector === 'codex' ? 'codex_normalized' : 'hosted_partial'))
      })
      .catch((err) => {
        if (cancelled || requestGenRef.current !== gen) return
        const fallback = activityFromSnapshotEvents(snapshot, member.id)
        const firstApply = !hasLoadedInitialRef.current
        hasLoadedInitialRef.current = true
        setActivities((prev) => (firstApply ? fallback : mergeLatestActivities(prev, fallback)))
        if (firstApply) {
          setHasMore(false)
          setNextBefore(null)
        }
        if (firstApply) setHistoryMode('runtime_only')
        setHistoryError(`历史同步失败：${err.message}。${firstApply ? '当前仅显示 Runtime 记录。' : '已保留加载过的记录。'}`)
      })
      .finally(() => { if (!cancelled && isInitial) setLoading(false) })
    return () => { cancelled = true }
  }, [member?.id, sessionId, snapshot?.serverTime, historyRetry])

  async function loadOlder() {
    if (!nextBefore || loadingOlderRef.current) return
    const gen = requestGenRef.current
    loadingOlderRef.current = true
    setLoadingOlder(true)
    setOlderError('')
    try {
      const res = await fetchMemberActivity(sessionId, member.id, { before: nextBefore, limit: 30 })
      if (requestGenRef.current !== gen) return
      if (Array.isArray(res.items) && res.items.length > 0) {
        const body = bodyRef.current
        if (body) {
          pendingScrollAnchorRef.current = {
            prevScrollHeight: body.scrollHeight,
            prevScrollTop: body.scrollTop,
          }
        }
        pagedOlderRef.current = true
        setActivities((prev) => prependOlderActivities(prev, res.items))
        setHasMore(Boolean(res.hasMore))
        setNextBefore(res.nextBefore ?? null)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      if (requestGenRef.current === gen) setOlderError('更早消息加载失败：' + err.message)
    } finally {
      if (requestGenRef.current === gen) {
        loadingOlderRef.current = false
        setLoadingOlder(false)
      }
    }
  }

  if (!member) return null

  const viewObjects = Array.isArray(snapshot?.viewObjects) ? snapshot.viewObjects : []
  const pinnedRefs = snapshot?.publicView?.pinnedRefs || []
  const userPinnedSet = new Set(Array.isArray(snapshot?.userPinnedRefs) ? snapshot.userPinnedRefs : [])
  const memberExecs = (snapshot?.executions || []).filter((e) => e.memberId === member.id)
  const memberTasks = member.roleKind === 'commander'
    ? (snapshot?.tasks || [])
    : (snapshot?.tasks || []).filter((t) => t.memberId === member.id
      || t.review?.actor?.id === member.id
      || memberExecs.some((e) => e.taskId === t.taskId))
  const memberObjects = viewObjects.filter((o) =>
    o.authorId === member.id || (Array.isArray(o.editableBy) && o.editableBy.includes(member.id)))
  const currentTask = memberTasks.find((t) => !['completed', 'cancelled'].includes(t.state)) || memberTasks.at(-1)
  const memberCap = (snapshot?.metadata?.memberCapabilities || []).find((c) => c.memberId === member.id) || null
  const capSummary = memberCap ? formatCapabilitySummary(memberCap) : null

  const hostChat = member.roleKind === 'commander' ? readHostChatMessages(sessionId) : { supported: false, messages: [] }
  const mergedMessages = activities.length > 0 ? activities : activityFromSnapshotEvents(snapshot, member.id)
  return h(InspectorDialog, {
    title: `成员详情：${member.id}`,
    onClose,
    className: 'concerto-member-inspector-dialog',
    dialogProps: { 'data-concerto-member-drawer': member.id },
  },
  h('div', { className: 'concerto-drawer-head' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
      returnTaskId && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost',
        'aria-label': `返回 ${returnTaskId}`,
        onClick: onBack || onClose,
      }, `← ${returnTaskId}`),
      h(MemberGlyph, { member, state, size: 56 }),
      h('div', { style: { minWidth: 0, flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
          h('h2', { className: 'concerto-dialog-title' }, member.id + (member.roleKind === 'commander' ? ' · 指挥者' : member.roleKind === 'reviewer' ? ' · 审查者' : ' · 执行者')),
          h(StateChip, { status: state, text: label(state) }),
          h('span', { className: 'concerto-tag' }, member.connector ? (member.connector === 'codex' ? 'codex · app-server' : `外部连接器 · ${member.connector}`) : (member.source === 'hosted' ? 'DSH Hosted' : '外部后端')),
          capSummary && h('span', {
            className: 'concerto-chip',
            'data-concerto-capability-status': memberCap?.verificationStatus || 'unknown',
            title: capSummary.summary,
          }, capSummary.badge)),
        capSummary && h('div', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)', marginTop: 4 } },
          capSummary.summary + (capSummary.tools.length > 0 ? `（工具：${capSummary.tools.join(', ')}）` : '')),
        currentTask && h('div', { style: { fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          h('span', null, '当前任务：' + currentTask.title),
          onJumpTask && h('button', {
            type: 'button',
            className: 'concerto-link concerto-id',
            onClick: () => { onClose?.(false); onJumpTask(currentTask.taskId, { memberId: member.id, label: currentTask.taskId }) },
          }, `定位 ${currentTask.taskId} ›`)))),
    h('button', {
      ref: (node) => node?.setAttribute('autofocus', ''),
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
      'aria-label': '关闭',
      title: '关闭成员详情',
      onClick: onClose,
    }, h(UiIcon, { name: 'close' }))),

  h(TabList, { id: tabsId, label: `${member.id} 成员详情`, className: 'concerto-drawer-tabs', value: tab, onChange: setTab, tabs: [
    { value: 'messages', label: '消息与活动' },
    { value: 'tasks', label: '任务', count: memberTasks.length },
    { value: 'objects', label: '产物', count: memberObjects.length },
    { value: 'executions', label: '执行记录', count: memberExecs.length },
    ...(canManageDuties && member.roleKind !== 'commander' ? [{ value: 'duties', label: '项目职责' }] : []),
  ] }),

  h('div', { ...tabPanelProps(tabsId, tab), ref: bodyRef, className: 'concerto-drawer-body' },
    tab === 'duties' && h(MemberDutiesPanel, { sessionId, memberId: member.id }),
    tab === 'messages' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { className: 'concerto-tag', style: { alignSelf: 'flex-start' } },
        member.roleKind === 'commander'
          ? (hostChat.supported
            ? 'DSH 会话消息 + Runtime 决策'
            : (historyMode === 'hosted_session'
              ? HISTORY_SOURCE_DESC.hosted_session
              : '对话正文请看对话页签 · 当前展示 Commander Runtime 决策记录'))
          : (HISTORY_SOURCE_DESC[historyMode] || '该后端未提供完整对话历史，仅显示 Runtime 记录')),

      historyError && h('div', { className: 'concerto-feedback', role: 'status' },
        h('span', null, historyError),
        h('button', { type: 'button', className: 'concerto-btn', onClick: () => setHistoryRetry((n) => n + 1) }, '重试同步')),
      olderError && h('p', { role: 'status', className: 'concerto-field-error' }, olderError),
      hasMore && h('button', { type: 'button', className: 'concerto-btn', disabled: loading || loadingOlder, onClick: loadOlder }, loadingOlder ? '加载中…' : olderError ? '重试加载更早消息' : '加载更早消息'),

      member.roleKind === 'commander' && hostChat.messages.map((msg) =>
        h('div', { key: 'hc-' + msg.id, className: 'concerto-bubble' },
          h('div', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } },
            (msg.role === 'user' ? '用户' : member.id) + (msg.recordedAt ? ' · ' + new Date(msg.recordedAt).toLocaleTimeString() : '')),
          h(ReferenceText, {
            text: msg.text,
            viewObjects,
            tasks: snapshot?.tasks || [],
            pinnedRefs,
            context: { authorId: member.id },
            sessionId,
            onJumpTask: (tid) => { onClose?.(false); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
            onOpenMember,
            onJumpObject: (ref) => { onClose?.(); onJumpObject?.(ref, { memberId: member.id }) },
          }))),

      mergedMessages.length === 0 && hostChat.messages.length === 0 && memberTasks.length === 0
        ? h(EmptyState, {
            icon: '💬',
            text: '暂无 ' + member.id + ' 的消息或执行记录。',
            action: currentTask && onJumpTask && h('button', { type: 'button', className: 'concerto-link', onClick: () => { onClose?.(false); onJumpTask(currentTask.taskId, { memberId: member.id }) } }, '查看关联任务 →'),
          })
        : mergedMessages.map((act) => {
            if (act.kind === 'message') {
              const speaker = act.role === 'user' ? '用户' : member.id
              return h('div', { key: act.activityId, className: 'concerto-bubble' },
                h('div', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } },
                  speaker + (act.recordedAt ? ' · ' + new Date(act.recordedAt).toLocaleTimeString() : '') + (act.taskId ? ' · ' + act.taskId : '')),
                h(ReferenceText, {
                  text: act.text || act.summary,
                  viewObjects,
                  tasks: snapshot?.tasks || [],
                  pinnedRefs,
                  context: { taskId: act.taskId, authorId: member.id },
                  sessionId,
                  onJumpTask: (tid) => { onClose?.(false); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
                  onOpenMember,
                  onJumpObject: (ref) => { onClose?.(); onJumpObject?.(ref, { memberId: member.id }) },
                }),
                act.truncated && h('div', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } },
                  `已截断至 4000 字符（原始 ${act.fullLength} 字符）`))
            }
            return h('details', { key: act.activityId, className: 'concerto-activity-line' },
              h('summary', { style: { cursor: 'pointer' } },
                (act.recordedAt ? new Date(act.recordedAt).toLocaleTimeString() + ' · ' : '') + act.summary),
              (act.text || act.detail) && h('pre', {
                style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 'var(--cc-fs-code)', marginTop: 6, maxHeight: 200, overflow: 'auto' },
              }, act.text || JSON.stringify(act.detail, null, 2)))
          })),

    tab === 'tasks' && (
      memberTasks.length === 0
        ? h(EmptyState, { icon: '📋', text: member.id + ' 暂无关联任务。' })
        : memberTasks.map((tk) => {
            const tMeta = STATE_META[tk.viewState] || STATE_META[tk.state] || STATE_META.pending
            return h('div', { key: tk.taskId, className: 'concerto-card' },
              h('div', { className: 'concerto-card-head' },
                h('div', { className: 'concerto-card-head-main' },
                  h('div', { className: 'concerto-card-title-row' },
                    h('strong', null, tk.title))),
                h(StateChip, { status: tk.viewState || tk.state, text: tMeta.label })),
              tk.objective && h('div', { style: { fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)', marginBottom: 6 } }, tk.objective),
              (tk.blockedReason || tk.progress?.at(-1)?.note) && h('div', {
                style: { fontSize: 'var(--cc-fs-caption)', color: tk.blockedReason ? 'var(--cc-state-blocked)' : 'var(--cc-text-muted)', marginBottom: 6 },
              }, tk.blockedReason ? '阻塞：' + tk.blockedReason : '最新进展：' + tk.progress.at(-1).note),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                h('span', { className: 'concerto-id', style: { color: 'var(--cc-text-muted)' } }, tk.taskId + ' · 第 ' + tk.attempt + ' 次'),
                onJumpTask && h('button', {
                  type: 'button',
                  className: 'concerto-chip',
                  onClick: () => { onClose?.(false); onJumpTask(tk.taskId, { memberId: member.id, label: tk.taskId }) },
                }, '跳转查看任务 ›')))
          })
    ),

    tab === 'objects' && (
      memberObjects.length === 0
        ? h(EmptyState, { icon: '🧩', text: member.id + ' 暂未发布结构化输出。' })
        : memberObjects.map((obj) => {
            const isCmdPinned = pinnedRefs.some((p) => p.id === obj.id && p.type === obj.type)
            const isUserPinned = userPinnedSet.has(`${obj.type}:${obj.id}`)
            return h('div', { key: obj.id, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h(StructuredObjectCard, {
                object: obj,
                tasks: snapshot?.tasks || [],
                sessionId,
                onJumpTask: (tid) => { onClose?.(false); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
                onOpenMember,
                userPinned: isUserPinned,
                badgeLabel: isCmdPinned ? '指挥者推荐' : '',
              }))
          })
    ),

    tab === 'executions' && (
      memberExecs.length === 0
        ? h(EmptyState, { icon: '⚙️', text: member.id + ' 暂无执行记录。' })
        : memberExecs.slice().reverse().map((exec) => h('div', { key: exec.executionId, className: 'concerto-card' },
            h('div', { className: 'concerto-card-head' },
              h('div', { className: 'concerto-card-head-main' },
                h('div', { className: 'concerto-card-title-row' },
                  h('strong', null, exec.taskId + (exec.kind === 'review' ? ' · 独立审查' : ` · 第 ${exec.attempt} 次尝试`)))),
              h('span', { className: 'concerto-tag' }, label(exec.state))),
            h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)' } },
              (exec.connectorId || 'unknown') + (exec.nativeSessionRef?.sessionId ? ' · Session ' + exec.nativeSessionRef.sessionId : '')),
            exec.writeScope && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } }, '工作目录：' + exec.writeScope),
            exec.worktree && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } },
              `Worktree 分支：${exec.worktree.branch || ''} · 基线 ${String(exec.worktree.baseCommit || '').slice(0, 7)}${exec.worktree.headCommit && exec.worktree.headCommit !== exec.worktree.baseCommit ? `..${String(exec.worktree.headCommit).slice(0, 7)}` : ''}`),
            exec.taskContext && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginTop: 4 } },
              h('strong', null, '临时任务说明：'), exec.taskContext),
            exec.memberDuties && h('details', { style: { marginTop: 6 } },
              h('summary', null, `派发职责 v${exec.memberDuties.version} · ${dutyAuthor(exec.memberDuties)}`),
              h('p', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, exec.memberDuties.body)),
            Array.isArray(exec.skillDeliveries) && exec.skillDeliveries.length > 0 && h('div', { style: { marginTop: 6, fontSize: 'var(--cc-fs-caption)' } },
              h('strong', null, '派发冻结方法：'),
              exec.skillDeliveries.map((d) => {
                const fb = (exec.skillFeedback || []).find((f) => f.id === d.id)
                const acc = exec.skillAcceptanceEvidence
                return h('div', { key: `${d.id}@${d.version}`, style: { marginTop: 2 } },
                  h('span', { className: 'concerto-id' }, `${d.id}@v${d.version}`),
                  ` (${d.source} · 已交付`,
                  fb ? ` · 成员自述:${fb.outcome}` : '',
                  acc ? ` · 验收证据:${acc.status === 'verified_with_task_acceptance' ? (acc.reviewId || 'pass') : 'fail'}` : '',
                  ')')
              })),
            exec.metrics && Object.keys(exec.metrics).length > 0 && h('details', { style: { marginTop: 6 } },
              h('summary', { style: { cursor: 'pointer', fontSize: 'var(--cc-fs-caption)' } }, '阶段耗时指标'),
              h('pre', { style: { fontSize: 'var(--cc-fs-code)', whiteSpace: 'pre-wrap' } }, JSON.stringify(exec.metrics, null, 2))))))))

}
