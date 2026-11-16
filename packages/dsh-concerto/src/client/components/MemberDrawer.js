import React from 'react'
import { createPortal } from 'react-dom'
import { h, label, EVENT_LABEL, STATE_META, styles, fetchMemberActivity, readHostChatMessages, useHostTheme, formatCapabilitySummary } from '../api.js'
import { useTeamCss } from '../styles.js'
import { useOverlay } from './overlay.js'
import { MemberGlyph } from './MemberSprite.js'
import { StructuredObjectCard } from './StructuredObjectCard.js'
import { ReferenceText } from './ReferenceText.js'

const HISTORY_SOURCE_DESC = {
  codex_normalized: 'Codex app-server · 完整归一化消息与工具活动行',
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
  initialTab = 'messages',
  onClose,
  onJumpTask,
  onOpenMember,
  onJumpObject,
}) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const [tab, setTab] = React.useState(initialTab)
  const [activities, setActivities] = React.useState([])
  const [hasMore, setHasMore] = React.useState(false)
  const [nextBefore, setNextBefore] = React.useState(null)
  const [historyMode, setHistoryMode] = React.useState('runtime_only')
  const [loading, setLoading] = React.useState(false)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  const asideRef = React.useRef(null)
  const closeRef = React.useRef(null)
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
  }, [member?.id, sessionId])

  useOverlay(asideRef, closeRef, onClose, Boolean(member?.id))

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
        const firstApply = !hasLoadedInitialRef.current
        hasLoadedInitialRef.current = true
        setActivities((prev) => (firstApply ? incoming : mergeLatestActivities(prev, incoming)))
        if (firstApply || !pagedOlderRef.current) {
          setHasMore(Boolean(res.hasMore))
          setNextBefore(res.nextBefore ?? null)
        }
        setHistoryMode(res.backendHistoryMode || (member.connector === 'codex' ? 'codex_normalized' : 'hosted_partial'))
      })
      .catch(() => {
        if (cancelled || requestGenRef.current !== gen) return
        const fallback = activityFromSnapshotEvents(snapshot, member.id)
        const firstApply = !hasLoadedInitialRef.current
        hasLoadedInitialRef.current = true
        setActivities((prev) => (firstApply ? fallback : mergeLatestActivities(prev, fallback)))
        if (firstApply) {
          setHasMore(false)
          setNextBefore(null)
        }
        setHistoryMode(member.connector === 'codex' ? 'codex_normalized' : 'runtime_only')
      })
      .finally(() => { if (!cancelled && isInitial) setLoading(false) })
    return () => { cancelled = true }
  }, [member?.id, sessionId, snapshot?.serverTime])

  async function loadOlder() {
    if (!nextBefore || loadingOlderRef.current) return
    const gen = requestGenRef.current
    loadingOlderRef.current = true
    setLoadingOlder(true)
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
    } catch {
      if (requestGenRef.current === gen) setHasMore(false)
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
  const memberTasks = member.roleKind === 'commander'
    ? (snapshot?.tasks || [])
    : (snapshot?.tasks || []).filter((t) => t.memberId === member.id)
  const memberExecs = (snapshot?.executions || []).filter((e) => e.memberId === member.id)
  const memberObjects = viewObjects.filter((o) =>
    o.authorId === member.id || (Array.isArray(o.editableBy) && o.editableBy.includes(member.id)))
  const currentTask = memberTasks.find((t) => !['completed', 'cancelled'].includes(t.state)) || memberTasks.at(-1)
  const stMeta = STATE_META[state] || STATE_META.idle
  const memberCap = (snapshot?.metadata?.memberCapabilities || []).find((c) => c.memberId === member.id) || null
  const capSummary = memberCap ? formatCapabilitySummary(memberCap) : null

  const hostChat = member.roleKind === 'commander' ? readHostChatMessages(sessionId) : { supported: false, messages: [] }
  const mergedMessages = activities.length > 0 ? activities : activityFromSnapshotEvents(snapshot, member.id)
  const tabCountTag = (count) => count > 0 ? h('span', { className: 'concerto-tag concerto-num' }, String(count)) : null

  const dialogNode = h('div', {
    className: 'concerto-drawer-backdrop concerto-surface',
    'data-concerto-theme': hostTheme.colorScheme,
    style: hostTheme.cssVars,
    onClick: (e) => { if (e.target === e.currentTarget) onClose?.() },
  },
  h('aside', {
    ref: asideRef,
    className: 'concerto-drawer concerto-surface',
    'data-concerto-theme': hostTheme.colorScheme,
    style: hostTheme.cssVars,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Concerto 成员详情',
    'data-concerto-member-drawer': member.id,
  },
  h('div', { className: 'concerto-drawer-head' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
      h(MemberGlyph, { member, state, size: 56 }),
      h('div', { style: { minWidth: 0, flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
          h('strong', { style: { fontSize: 'var(--cc-fs-title)' } }, member.id + (member.roleKind === 'commander' ? ' · 指挥者' : member.roleKind === 'reviewer' ? ' · 审查者' : ' · 执行者')),
          h('span', { className: 'concerto-state-chip ' + stMeta.cls }, stMeta.icon + ' ' + label(state)),
          h('span', { className: 'concerto-tag' }, member.connector ? `${member.connector} · app-server` : (member.source === 'hosted' ? 'DSH Hosted' : '外部后端')),
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
            onClick: () => { onClose?.(); onJumpTask(currentTask.taskId, { memberId: member.id, label: currentTask.taskId }) },
          }, `定位 ${currentTask.taskId} ›`)))),
    h('button', {
      ref: closeRef,
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
      'aria-label': '关闭',
      title: '关闭成员详情',
      onClick: onClose,
    }, '✕')),

  h('div', { className: 'concerto-drawer-tabs', role: 'tablist' },
    h('button', { type: 'button', role: 'tab', 'aria-selected': tab === 'messages', className: 'concerto-tab-btn', onClick: () => setTab('messages') }, '消息与活动'),
    h('button', { type: 'button', role: 'tab', 'aria-selected': tab === 'tasks', className: 'concerto-tab-btn', onClick: () => setTab('tasks') }, '任务', tabCountTag(memberTasks.length)),
    h('button', { type: 'button', role: 'tab', 'aria-selected': tab === 'objects', className: 'concerto-tab-btn', onClick: () => setTab('objects') }, '产物', tabCountTag(memberObjects.length)),
    h('button', { type: 'button', role: 'tab', 'aria-selected': tab === 'executions', className: 'concerto-tab-btn', onClick: () => setTab('executions') }, '执行记录', tabCountTag(memberExecs.length))),

  h('div', { ref: bodyRef, className: 'concerto-drawer-body' },
    tab === 'messages' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { className: 'concerto-tag', style: { alignSelf: 'flex-start' } },
        member.roleKind === 'commander'
          ? (hostChat.supported
            ? 'DSH 会话消息 + Runtime 决策'
            : (historyMode === 'hosted_session'
              ? HISTORY_SOURCE_DESC.hosted_session
              : '对话正文请看对话页签 · 当前展示 Commander Runtime 决策记录'))
          : (HISTORY_SOURCE_DESC[historyMode] || '该后端未提供完整对话历史，仅显示 Runtime 记录')),

      hasMore && h('button', { type: 'button', className: 'concerto-btn', disabled: loading || loadingOlder, onClick: loadOlder }, loadingOlder ? '加载中…' : '加载更早消息'),

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
            onJumpTask: (tid) => { onClose?.(); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
            onOpenMember,
            onJumpObject: (ref) => { onClose?.(); onJumpObject?.(ref, { memberId: member.id }) },
          }))),

      mergedMessages.length === 0 && hostChat.messages.length === 0 && memberTasks.length === 0
        ? h(EmptyState, {
            icon: '💬',
            text: '暂无 ' + member.id + ' 的消息或执行记录。',
            action: currentTask && onJumpTask && h('button', { type: 'button', className: 'concerto-link', onClick: () => { onClose?.(); onJumpTask(currentTask.taskId, { memberId: member.id }) } }, '查看关联任务 →'),
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
                  onJumpTask: (tid) => { onClose?.(); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
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
                h('span', { className: 'concerto-state-chip ' + tMeta.cls }, tMeta.icon + ' ' + tMeta.label)),
              tk.objective && h('div', { style: { fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)', marginBottom: 6 } }, tk.objective),
              (tk.blockedReason || tk.progress?.at(-1)?.note) && h('div', {
                style: { fontSize: 'var(--cc-fs-caption)', color: tk.blockedReason ? 'var(--cc-state-blocked)' : 'var(--cc-text-muted)', marginBottom: 6 },
              }, tk.blockedReason ? '阻塞：' + tk.blockedReason : '最新进展：' + tk.progress.at(-1).note),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                h('span', { className: 'concerto-id', style: { color: 'var(--cc-text-muted)' } }, tk.taskId + ' · 第 ' + tk.attempt + ' 次'),
                onJumpTask && h('button', {
                  type: 'button',
                  className: 'concerto-chip',
                  onClick: () => { onClose?.(); onJumpTask(tk.taskId, { memberId: member.id, label: tk.taskId }) },
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
                onJumpTask: (tid) => { onClose?.(); onJumpTask?.(tid, { memberId: member.id, label: tid }) },
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
                  h('strong', null, exec.taskId + ' · 第 ' + exec.attempt + ' 次尝试'))),
              h('span', { className: 'concerto-tag' }, label(exec.state))),
            h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)' } },
              (exec.connectorId || 'unknown') + (exec.nativeSessionRef?.sessionId ? ' · Session ' + exec.nativeSessionRef.sessionId : '')),
            exec.writeScope && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } }, '工作目录：' + exec.writeScope),
            exec.metrics && Object.keys(exec.metrics).length > 0 && h('details', { style: { marginTop: 6 } },
              h('summary', { style: { cursor: 'pointer', fontSize: 'var(--cc-fs-caption)' } }, '阶段耗时指标'),
              h('pre', { style: { fontSize: 'var(--cc-fs-code)', whiteSpace: 'pre-wrap' } }, JSON.stringify(exec.metrics, null, 2)))))))))

  return typeof document !== 'undefined' && document.body ? createPortal(dialogNode, document.body) : dialogNode
}
