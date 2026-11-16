import React from 'react'
import {
  h,
  styles,
  label,
  EVENT_LABEL,
  STATE_META,
  useTeamSession,
  useHostTheme,
  roster,
  pendingRequests,
  memberState,
  consumeMemberDrawerOpen,
  onMemberDrawerRequest,
  readSessionViewState,
  writeSessionViewState,
  saveUserViewPreferences,
  formatCapabilitySummary,
} from '../api.js'
import { useTeamCss } from '../styles.js'
import { normalizePublicView, resolveViewObjectRef, DEFAULT_RENDERER } from '../../../lib/domain/view_objects.mjs'
import { MemberSprite, MemberGlyph } from './MemberSprite.js'
import { RequestCard, ReviewCard, AdjudicationCard } from './Panels.js'
import { StructuredObjectCard } from './StructuredObjectCard.js'
import { ReferenceText, InlineTextWithRefs } from './ReferenceText.js'
import { MemberDrawer } from './MemberDrawer.js'

const KANBAN_COLUMNS = [
  { id: 'pending', title: '待派发', cls: 'concerto-state-idle' },
  { id: 'running', title: '进行中', cls: 'concerto-state-running' },
  { id: 'review', title: '待验收', cls: 'concerto-state-review' },
  { id: 'done', title: '已完成', cls: 'concerto-state-done' },
]

const ARTIFACT_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'table', label: '表格' },
  { value: 'checklist', label: '清单' },
  { value: 'mindmap', label: '导图' },
  { value: 'diagram', label: '图谱' },
  { value: 'board', label: '白板' },
  { value: 'html', label: 'HTML 卡片' },
]

const BENTO_SPAN = { s: 4, m: 6, l: 12 }

function balanceBentoSpans(sizes) {
  const spans = sizes.map((s) => BENTO_SPAN[s] || 6)
  let rowUsed = 0
  for (const sp of spans) {
    rowUsed = rowUsed + sp > 12 ? sp : rowUsed + sp
  }
  const remainder = 12 - rowUsed
  if (remainder > 0 && remainder < 12 && spans.length > 0) {
    spans[spans.length - 1] += remainder
  }
  return spans
}

function bucketTaskColumn(task) {
  if (task.state === 'completed' || task.state === 'cancelled') return 'done'
  if (task.viewState === 'review' || task.state === 'review') return 'review'
  if (task.viewState === 'pending' && !task.blockedReason && task.state !== 'failed') return 'pending'
  return 'running'
}

function isTaskException(task) {
  return task.viewState === 'blocked'
    || task.viewState === 'failed'
    || task.viewState === 'unknown'
    || task.state === 'failed'
    || Boolean(task.blockedReason)
}

function taskPriorityRank(task) {
  if (task.viewState === 'unknown') return 0
  if (isTaskException(task)) return 1
  if (task.viewState === 'review' || task.state === 'review') return 2
  if (task.viewState === 'running' || task.state === 'running') return 3
  if (task.state === 'pending') return 4
  return 5
}

function deriveMemberActivity(member, snapshot) {
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : []
  const activeTask = tasks.find((t) => t.memberId === member.id && !['completed', 'cancelled'].includes(t.state))
  if (activeTask) {
    const latestNote = Array.isArray(activeTask.progress) && activeTask.progress.length > 0
      ? activeTask.progress.at(-1).note
      : ''
    return activeTask.blockedReason || latestNote || activeTask.title
  }
  const actList = snapshot?.memberActivitySummary?.[member.id]
  if (Array.isArray(actList) && actList.length > 0 && actList[0].summary) {
    return actList[0].summary
  }
  if (member.roleKind === 'commander') {
    const first = String(snapshot?.publicView?.summary || '').split(/\r?\n/).find((l) => l.trim())
    return first ? first.trim() : '统筹乐团分工与公共简报'
  }
  return label(memberState(snapshot, member))
}

function synthesizeAttention(snapshot) {
  if (Array.isArray(snapshot?.attention)) return snapshot.attention
  const items = []
  for (const req of pendingRequests(snapshot)) {
    items.push({
      id: 'req:' + req.requestId,
      kind: 'request',
      urgency: req.kind === 'approval' ? 1 : 2,
      title: (req.kind === 'approval' ? '请求批准' : '向你提问') + ' · ' + (req.memberId || '成员'),
      detail: req.detail || req.payload?.reason || '',
      requestId: req.requestId,
      taskId: req.taskId,
      memberId: req.memberId,
    })
  }
  for (const exec of (snapshot?.executions || []).filter((e) => e.state === 'unknown' && !e.quarantined)) {
    items.push({
      id: 'exec:' + exec.executionId,
      kind: 'unknown',
      urgency: 2,
      title: '执行状态未知 · ' + exec.taskId,
      detail: '上次运行结果尚未确认，需要你裁决',
      executionId: exec.executionId,
      taskId: exec.taskId,
      memberId: exec.memberId,
    })
  }
  for (const task of (snapshot?.tasks || [])) {
    if (task.viewState === 'review' || task.state === 'review') {
      items.push({
        id: 'review:' + task.taskId,
        kind: 'review',
        urgency: 3,
        title: '待你验收 · ' + task.title,
        detail: task.result?.summary || '成员已提交结果，等待审查',
        taskId: task.taskId,
        memberId: task.memberId,
      })
    } else if (isTaskException(task)) {
      items.push({
        id: 'blocked:' + task.taskId,
        kind: task.state === 'failed' ? 'failed' : 'blocked',
        urgency: 4,
        title: (task.state === 'failed' ? '任务失败 · ' : '任务阻塞 · ') + task.title,
        detail: task.blockedReason || '请查看详情并处理',
        taskId: task.taskId,
        memberId: task.memberId,
      })
    }
  }
  return items.sort((a, b) => a.urgency - b.urgency)
}

function buildTaskProgressStats(tasks) {
  const list = Array.isArray(tasks) ? tasks : []
  let done = 0
  let review = 0
  let block = 0
  let run = 0
  let pending = 0
  for (const t of list) {
    if (t.state === 'completed') done += 1
    else if (t.state === 'cancelled') continue
    else if (t.viewState === 'review' || t.state === 'review') review += 1
    else if (isTaskException(t)) block += 1
    else if (t.viewState !== 'pending') run += 1
    else pending += 1
  }
  const activeTotal = list.filter((t) => t.state !== 'cancelled').length
  const total = Math.max(activeTotal, 1)
  return {
    total: activeTotal,
    done,
    review,
    block,
    run,
    pending,
    donePct: Math.round((done / total) * 100),
    reviewPct: Math.round((review / total) * 100),
    runPct: Math.round((run / total) * 100),
    blockPct: Math.round((block / total) * 100),
  }
}

function matchesArtifactFilters(obj, filters) {
  if (!obj || !filters) return true
  if (filters.taskId && filters.taskId !== 'all' && obj.taskId !== filters.taskId) return false
  if (filters.memberId && filters.memberId !== 'all' && obj.authorId !== filters.memberId) return false
  if (filters.type && filters.type !== 'all' && obj.type !== filters.type) return false
  return true
}

function parseRefString(str) {
  const m = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/.exec(String(str || '').trim())
  return m ? { type: m[1], id: m[2] } : null
}

function parseCommanderBriefing(summary, stats, attentionItems) {
  const lines = String(summary || '').split(/\r?\n/)
  let progress = ''
  let issues = ''
  let nextStep = ''
  const extraLines = []
  let consumedFirstProse = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const mProg = /^当前进展[：:]\s*(.+)$/.exec(line)
    const mIss = /^关键问题[：:]\s*(.+)$/.exec(line)
    const mNext = /^下一步[：:]\s*(.+)$/.exec(line)
    if (mProg) {
      progress = mProg[1]
    } else if (mIss) {
      issues = mIss[1]
    } else if (mNext) {
      nextStep = mNext[1]
    } else {
      if (!progress && !consumedFirstProse && !/^(table|checklist|mindmap|diagram|board|html):/.test(line)) {
        progress = line
        consumedFirstProse = true
      } else {
        extraLines.push(raw)
      }
    }
  }
  if (!progress) {
    progress = stats.total === 0
      ? '尚未拆解任务，等待指挥者分析目标或直接对话。'
      : `已完成 ${stats.done}/${stats.total} 项任务` + (stats.run ? `，${stats.run} 项执行中` : '')
  }
  if (!issues) {
    if (attentionItems.length > 0) {
      issues = `${attentionItems.length} 项待你处理（${attentionItems.slice(0, 2).map((a) => a.title).join('；')}）`
    } else {
      issues = '暂无阻塞或待处理异常。'
    }
  }
  if (!nextStep) {
    if (stats.review > 0) nextStep = `优先验收 ${stats.review} 项已提交结果的任务。`
    else if (stats.pending > 0) nextStep = `派发或继续推进 ${stats.pending} 项待派发任务。`
    else if (stats.run > 0) nextStep = '关注执行中的成员产出并按需检阅产物。'
    else nextStep = stats.total === 0 ? '在底部输入框下达具体目标。' : '全部任务已收口，可归档或开启下一阶段。'
  }
  return { progress, issues, nextStep, extraText: extraLines.join('\n').trim() }
}

function EmptyState({ icon, text, action = null }) {
  return h('div', { className: 'concerto-empty' },
    h('span', { 'aria-hidden': true, style: { fontSize: 'var(--cc-fs-display)' } }, icon),
    h('p', { style: { margin: 0 } }, text),
    action)
}

export function ConcertoTeamView({ sessionId, openView }) {
  useTeamCss()
  const { info, error, refresh } = useTeamSession(sessionId)
  const snapshot = info?.snapshot
  const initialView = React.useMemo(() => readSessionViewState(sessionId), [sessionId])

  const containerRef = React.useRef(null)
  const taskRefs = React.useRef(new Map())
  const restoredScrollRef = React.useRef(false)
  const compactRef = React.useRef(false)
  const lastCommand = React.useRef(null)

  const [drawerState, setDrawerState] = React.useState({ memberId: '', tab: 'messages' })
  const [activeTab, setActiveTab] = React.useState(initialView.activeTab || 'overview')
  const [taskViewMode, setTaskViewMode] = React.useState(initialView.taskViewMode || 'auto')
  const [expandedTasks, setExpandedTasks] = React.useState(() => new Set(initialView.expandedTaskIds || []))
  const [artifactFilters, setArtifactFilters] = React.useState(initialView.artifactFilters || { taskId: 'all', memberId: 'all', type: 'all' })
  const [savedFilterBeforeJump, setSavedFilterBeforeJump] = React.useState(null)
  const [jumpOrigin, setJumpOrigin] = React.useState(null)
  const [compact, setCompact] = React.useState(false)
  const [optimisticUserPins, setOptimisticUserPins] = React.useState(null)
  const [highlightTaskId, setHighlightTaskId] = React.useState('')
  const [highlightObjectId, setHighlightObjectId] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const hostTheme = useHostTheme()
  const isLight = hostTheme.isLight
  const effectiveTheme = hostTheme.colorScheme
  const snapshotViewObjectsRef = React.useRef([])
  snapshotViewObjectsRef.current = Array.isArray(snapshot?.viewObjects) ? snapshot.viewObjects : []
  const artifactFiltersRef = React.useRef(artifactFilters)
  artifactFiltersRef.current = artifactFilters
  const activeTabRef = React.useRef(activeTab)
  activeTabRef.current = activeTab

  React.useEffect(() => {
    const vs = readSessionViewState(sessionId)
    setDrawerState({ memberId: '', tab: 'messages' })
    setActiveTab(vs.activeTab || 'overview')
    setTaskViewMode(vs.taskViewMode || 'auto')
    setExpandedTasks(new Set(vs.expandedTaskIds || []))
    setArtifactFilters(vs.artifactFilters || { taskId: 'all', memberId: 'all', type: 'all' })
    setSavedFilterBeforeJump(null)
    setJumpOrigin(null)
    compactRef.current = false
    setCompact(false)
    setOptimisticUserPins(null)
    setHighlightTaskId('')
    setHighlightObjectId('')
    setActionError('')
    restoredScrollRef.current = false
    lastCommand.current = null
  }, [sessionId])

  React.useEffect(() => {
    const consumePending = () => {
      const pending = consumeMemberDrawerOpen(sessionId)
      if (pending?.memberId) {
        setDrawerState({ memberId: pending.memberId, tab: pending.tab || 'messages' })
      }
    }
    consumePending()
    return onMemberDrawerRequest((targetSessionId) => {
      if (targetSessionId === sessionId) consumePending()
    })
  }, [sessionId])

  React.useLayoutEffect(() => {
    if (restoredScrollRef.current || !snapshot || !containerRef.current) return
    const savedTop = readSessionViewState(sessionId).scrollTop
    if (typeof savedTop === 'number' && savedTop > 0) {
      containerRef.current.scrollTop = savedTop
      const isCompact = savedTop > 96
      compactRef.current = isCompact
      setCompact(isCompact)
    }
    restoredScrollRef.current = true
  }, [sessionId, snapshot])

  const changeTab = React.useCallback((tab, keepJumpOrigin = false) => {
    if (!keepJumpOrigin) setJumpOrigin(null)
    setActiveTab(tab)
    writeSessionViewState(sessionId, { activeTab: tab })
  }, [sessionId])

  const changeTaskViewMode = React.useCallback((mode) => {
    setTaskViewMode(mode)
    writeSessionViewState(sessionId, { taskViewMode: mode })
  }, [sessionId])

  const updateFilters = React.useCallback((patch) => {
    setSavedFilterBeforeJump(null)
    setArtifactFilters((prev) => {
      const next = { ...prev, ...patch }
      writeSessionViewState(sessionId, { artifactFilters: next })
      return next
    })
  }, [sessionId])

  const restoreSavedFilters = React.useCallback(() => {
    if (!savedFilterBeforeJump?.filters) return
    const prevFilters = { ...savedFilterBeforeJump.filters }
    setSavedFilterBeforeJump(null)
    setArtifactFilters(prevFilters)
    writeSessionViewState(sessionId, { artifactFilters: prevFilters })
  }, [sessionId, savedFilterBeforeJump])

  const openMemberDrawer = React.useCallback((memberId, tab = 'messages') => {
    if (!memberId) return
    setDrawerState({ memberId, tab })
  }, [])

  const closeMemberDrawer = React.useCallback(() => {
    setDrawerState({ memberId: '', tab: 'messages' })
  }, [])

  const returnToJumpOrigin = React.useCallback(() => {
    if (!jumpOrigin) return
    const origin = jumpOrigin
    setJumpOrigin(null)
    setActiveTab(origin.tab)
    writeSessionViewState(sessionId, { activeTab: origin.tab })
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (containerRef.current) containerRef.current.scrollTop = origin.scrollTop || 0
      })
    }
    if (origin.memberId) {
      openMemberDrawer(origin.memberId, 'tasks')
    }
  }, [jumpOrigin, sessionId, openMemberDrawer])

  const jumpToTask = React.useCallback((taskId, origin = null) => {
    if (!taskId) return
    const curTab = activeTabRef.current
    if (curTab !== 'tasks' || origin?.memberId) {
      setJumpOrigin({
        tab: curTab,
        scrollTop: containerRef.current?.scrollTop || 0,
        memberId: origin?.memberId || '',
        targetLabel: taskId,
      })
    }
    setActiveTab('tasks')
    writeSessionViewState(sessionId, { activeTab: 'tasks' })
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      next.add(taskId)
      writeSessionViewState(sessionId, { expandedTaskIds: [...next] })
      return next
    })
    setHighlightTaskId(taskId)
    requestAnimationFrame(() => {
      const el = taskRefs.current.get(taskId)
        || (typeof document !== 'undefined' ? document.querySelector(`[data-concerto-task-id="${taskId}"]`) : null)
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    })
    setTimeout(() => {
      setHighlightTaskId((cur) => (cur === taskId ? '' : cur))
    }, 2400)
  }, [sessionId])

  const jumpToAttention = React.useCallback(() => {
    setJumpOrigin(null)
    setActiveTab('overview')
    writeSessionViewState(sessionId, { activeTab: 'overview' })
    requestAnimationFrame(() => {
      const sec = typeof document !== 'undefined' ? document.querySelector('[data-concerto-section="attention"]') : null
      sec?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    })
  }, [sessionId])

  const jumpToStageObject = React.useCallback((refOrObj, origin = null) => {
    if (!refOrObj || !refOrObj.id) {
      changeTab('artifacts')
      return
    }
    const curTab = activeTabRef.current
    const targetId = refOrObj.id
    const normType = refOrObj.type === 'canvas' ? 'board' : refOrObj.type
    const allObjs = snapshotViewObjectsRef.current
    const resolvedObj = allObjs.find((o) => o.id === targetId && (!normType || o.type === normType))
      || allObjs.find((o) => o.id === targetId)
      || (normType ? refOrObj : null)
    const domId = resolvedObj ? `concerto-stage-obj-${resolvedObj.type}-${resolvedObj.id}` : ''
    const existsOnCurrentOverview = curTab === 'overview'
      && typeof document !== 'undefined'
      && Boolean((domId && document.getElementById(domId)) || document.querySelector(`[data-concerto-object-id="${targetId}"]`))

    if (!existsOnCurrentOverview) {
      if (curTab !== 'artifacts' || origin?.memberId) {
        setJumpOrigin({
          tab: curTab,
          scrollTop: containerRef.current?.scrollTop || 0,
          memberId: origin?.memberId || '',
          targetLabel: resolvedObj ? (resolvedObj.title || `${resolvedObj.type}:${resolvedObj.id}`) : targetId,
        })
      }
      const curFilters = artifactFiltersRef.current
      if (resolvedObj && !matchesArtifactFilters(resolvedObj, curFilters)) {
        const relaxedFilters = {
          taskId: curFilters.taskId !== 'all' && resolvedObj.taskId !== curFilters.taskId ? 'all' : curFilters.taskId,
          memberId: curFilters.memberId !== 'all' && resolvedObj.authorId !== curFilters.memberId ? 'all' : curFilters.memberId,
          type: curFilters.type !== 'all' && resolvedObj.type !== curFilters.type ? 'all' : curFilters.type,
        }
        setSavedFilterBeforeJump({
          filters: { ...curFilters },
          targetLabel: `${resolvedObj.type}:${resolvedObj.id}`,
        })
        setArtifactFilters(relaxedFilters)
        writeSessionViewState(sessionId, { artifactFilters: relaxedFilters, activeTab: 'artifacts' })
      } else {
        writeSessionViewState(sessionId, { activeTab: 'artifacts' })
      }
      setActiveTab('artifacts')
    }

    setHighlightObjectId(targetId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = typeof document !== 'undefined'
          ? ((domId && document.getElementById(domId)) || document.querySelector(`[data-concerto-object-id="${targetId}"]`))
          : null
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      })
    })
    setTimeout(() => {
      setHighlightObjectId((cur) => (cur === targetId ? '' : cur))
    }, 2400)
  }, [sessionId, changeTab])

  function toggleTask(taskId) {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      writeSessionViewState(sessionId, { expandedTaskIds: [...next] })
      return next
    })
  }

  async function handleTogglePin(obj) {
    if (!obj?.type || !obj?.id) return
    const refStr = `${obj.type}:${obj.id}`
    const current = optimisticUserPins ?? (Array.isArray(snapshot?.userPinnedRefs) ? snapshot.userPinnedRefs : [])
    const nextLocal = current.includes(refStr)
      ? current.filter((r) => r !== refStr)
      : [...current, refStr]
    setOptimisticUserPins(nextLocal)
    try {
      const res = await saveUserViewPreferences(sessionId, { toggleRef: refStr })
      if (res?.ok && Array.isArray(res.userPinnedRefs)) {
        setOptimisticUserPins(res.userPinnedRefs)
        refresh()
      }
    } catch {
      // Keep local optimistic toggle if offline / mock harness lacks endpoint
    }
  }

  function handleContainerScroll(e) {
    const top = e.currentTarget.scrollTop
    writeSessionViewState(sessionId, { scrollTop: top })
    const nextCompact = top > 96
    if (nextCompact !== compactRef.current) {
      compactRef.current = nextCompact
      setCompact(nextCompact)
    }
  }

  if (!info || !snapshot) {
    return h('section', {
      className: 'concerto-surface concerto-team-view',
      'data-concerto-team-view': 'true',
      'data-concerto-theme': effectiveTheme,
      style: hostTheme.cssVars,
      'aria-label': 'Concerto 团队主页',
    },
    h('div', { className: 'concerto-hero' },
      h('div', { className: 'concerto-hero-top' },
        h('strong', { style: { fontSize: 'var(--cc-fs-title)' } }, 'Concerto 团队视图'),
        openView && h('button', { type: 'button', className: 'concerto-btn', onClick: () => openView('chat') }, '返回对话')),
      h('p', { style: { ...styles.muted, margin: 0 } },
        error || '当前会话不是受管团队会话，未接管普通对话。请在 Concerto 侧栏设置或团队 Preset 中启动团队。')))
  }

  const canAct = info.roleKind === 'commander' && !busy && !error
  async function command(path, input) {
    setBusy(true)
    setActionError('')
    const signature = JSON.stringify({ path, input, sessionId })
    if (lastCommand.current?.signature !== signature) {
      lastCommand.current = { signature, id: crypto.randomUUID() }
    }
    try {
      await fetch('/concerto' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...input, sessionId, commandId: lastCommand.current.id }),
      }).then(async (res) => {
        const text = await res.text()
        const body = text === '' ? null : JSON.parse(text)
        if (!res.ok) throw new Error(body?.detail || String(res.status))
        return body
      })
      lastCommand.current = null
      refresh()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const members = roster(snapshot)
  const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : []
  const executions = Array.isArray(snapshot.executions) ? snapshot.executions : []
  const events = Array.isArray(snapshot.events) ? snapshot.events : []
  const viewObjects = Array.isArray(snapshot.viewObjects) ? snapshot.viewObjects : []
  const requiredViews = Array.isArray(snapshot.requiredViews) ? snapshot.requiredViews : []
  const missingRequiredViews = Array.isArray(snapshot.missingRequiredViews) ? snapshot.missingRequiredViews : []
  const blockingMissing = missingRequiredViews.filter((m) => m.requiredForAcceptance)
  const suggestedMissing = missingRequiredViews.filter((m) => !m.requiredForAcceptance)
  const pending = pendingRequests(snapshot)
  const active = executions.filter((e) => ['running', 'waiting_input', 'waiting_approval', 'interrupting'].includes(e.state))
  const unknownExecs = executions.filter((e) => e.state === 'unknown' && !e.quarantined)
  const publicView = normalizePublicView(snapshot.publicView)
  const userPinnedRefs = optimisticUserPins ?? (Array.isArray(snapshot.userPinnedRefs) ? snapshot.userPinnedRefs : [])
  const userPinnedSet = new Set(userPinnedRefs)
  const stats = buildTaskProgressStats(tasks)
  const memberCapsList = Array.isArray(snapshot.metadata?.memberCapabilities) ? snapshot.metadata.memberCapabilities : []
  const capByMemberId = new Map(memberCapsList.map((c) => [c.memberId, c]))
  const unreadyCaps = memberCapsList.filter((c) => ['preset_unreloaded', 'preset_stale', 'preset_broken', 'connector_missing'].includes(c.verificationStatus))
  const attentionItems = synthesizeAttention(snapshot)
  const actionableCount = attentionItems.length + blockingMissing.length
  const teamGoal = snapshot.metadata?.objective || snapshot.metadata?.goal || ''
  const briefing = parseCommanderBriefing(publicView.summary, stats, attentionItems)

  // Curated refs for Overview (user-pinned first, then Commander-recommended deduplicated)
  const userPinObjs = userPinnedRefs
    .map(parseRefString)
    .filter(Boolean)
    .map((ref) => ({ ref, resolved: resolveViewObjectRef(viewObjects, ref, { pinnedRefs: publicView.pinnedRefs }) }))
  const stageSections = Array.isArray(publicView.sections) ? publicView.sections : []
  const commanderRenderedKeys = new Set()
  for (const sec of stageSections) {
    for (const ref of sec.refs || []) {
      const k = `${ref.type}:${ref.id}`
      if (!userPinnedSet.has(k)) commanderRenderedKeys.add(k)
    }
  }
  for (const ref of publicView.pinnedRefs || []) {
    const k = `${ref.type}:${ref.id}`
    if (!userPinnedSet.has(k)) commanderRenderedKeys.add(k)
  }
  const overviewShownKeys = new Set([...userPinnedSet, ...commanderRenderedKeys])
  const unpinnedFallbackObjs = overviewShownKeys.size === 0 ? viewObjects.slice(0, 2) : []
  const hiddenArtifactsCount = Math.max(0, viewObjects.length - overviewShownKeys.size - unpinnedFallbackObjs.length)

  // Key tasks (<= 4) for Overview
  const prioritizedTasks = tasks.slice().sort((a, b) => taskPriorityRank(a) - taskPriorityRank(b))
  const keyTasks = prioritizedTasks.slice(0, 4)

  // Tasks tab effective display mode: auto -> list if <= 3 tasks else kanban
  const resolvedTaskView = taskViewMode === 'auto' ? (tasks.length <= 3 ? 'list' : 'kanban') : taskViewMode
  const kanbanMap = { pending: [], running: [], review: [], done: [] }
  for (const t of tasks) kanbanMap[bucketTaskColumn(t)].push(t)
  kanbanMap.running.sort((a, b) => Number(isTaskException(b)) - Number(isTaskException(a)))

  // Artifacts tab filters
  const filteredArtifacts = viewObjects.filter((o) => matchesArtifactFilters(o, artifactFilters))

  const drawerMember = drawerState.memberId
    ? members.find((m) => m.id === drawerState.memberId) || null
    : null

  const renderCountTag = (count) => count > 0 ? h('span', { className: 'concerto-tag concerto-num' }, String(count)) : null

  function renderTaskDetailModule(task) {
    const isExpanded = expandedTasks.has(task.taskId)
    const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending
    const taskObjects = viewObjects.filter((o) => o.taskId === task.taskId)
    const taskReqViews = requiredViews.filter((v) => v.taskId === task.taskId)
    const taskEvents = events.filter((e) => e.taskId === task.taskId)
    const latestNote = task.blockedReason || task.progress?.at(-1)?.note || ''
    const execSettled = executions.some((e) => e.executionId === task.executionId && ['finished', 'stopped'].includes(e.state))

    return h('article', {
      key: task.taskId,
      ref: (el) => {
        if (el) taskRefs.current.set(task.taskId, el)
        else taskRefs.current.delete(task.taskId)
      },
      className: 'concerto-task-module' + (highlightTaskId === task.taskId ? ' concerto-task-highlight' : ''),
      'data-concerto-task-id': task.taskId,
    },
    h('div', { className: 'concerto-task-summary' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: '1 1 240px' } },
        h('strong', null, task.title),
        h('span', { className: 'concerto-state-chip ' + meta.cls }, meta.icon + ' ' + meta.label),
        task.memberId && h('button', {
          type: 'button',
          className: 'concerto-chip',
          onClick: () => openMemberDrawer(task.memberId, 'tasks'),
        }, task.memberId),
        h('span', { className: 'concerto-id', style: { color: 'var(--dsw-alias-label-tertiary)' } },
          task.taskId + ' · 第 ' + task.attempt + ' 次' + (latestNote ? ' · ' + latestNote.slice(0, 60) : ''))),
      h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost',
        'aria-expanded': isExpanded,
        onClick: () => toggleTask(task.taskId),
      }, isExpanded ? '收起详情' : '展开详情')),

    isExpanded && h('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--cc-border-subtle)' } },
      h('div', { className: 'concerto-acc-cols' },
        h('div', { className: 'concerto-acc-box' },
          task.objective && h('p', { style: { marginTop: 0, fontSize: 'var(--cc-fs-meta)' } }, h('strong', null, '目标与边界：'), task.objective),
          Array.isArray(task.dependsOn) && task.dependsOn.length > 0 && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 6 } },
            h('strong', null, '前置依赖：'), h('span', { className: 'concerto-id' }, task.dependsOn.join('、'))),
          task.writeScope && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 6, overflowWrap: 'anywhere' } },
            h('strong', null, '写入范围：'), h('code', null, task.writeScope)),
          Array.isArray(task.acceptance) && task.acceptance.length > 0 && h('div', null,
            h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, '验收标准：'),
            h('ul', { style: { margin: '4px 0', paddingLeft: 18, fontSize: 'var(--cc-fs-meta)' } },
              task.acceptance.map((acc, i) => h('li', { key: i }, acc)))),
          taskReqViews.length > 0 && h('div', { style: { marginTop: 8 } },
            h('div', { className: 'concerto-group-label', style: { marginBottom: 4 } }, '必需视图要求'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              taskReqViews.map((rv) => h('span', {
                key: `${rv.type}:${rv.id}`,
                className: 'concerto-req-view-pill',
                'data-missing': rv.missing && rv.requiredForAcceptance ? 'true' : undefined,
                'data-suggested': rv.missing && !rv.requiredForAcceptance ? 'true' : undefined,
              }, `${rv.type}:${rv.id} · ${rv.missing ? (rv.requiredForAcceptance ? '验收必需·缺失' : '建议·未提交') : '已就绪'}`))))),

        h('div', { className: 'concerto-acc-box' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
            h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, '最近活动 · ' + taskEvents.length),
            task.memberId && h('button', {
              type: 'button',
              className: 'concerto-link',
              onClick: () => openMemberDrawer(task.memberId, 'messages'),
            }, '查看 ' + task.memberId + ' 详情 ›')),
          taskEvents.length === 0
            ? h('div', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } }, '暂无任务活动事件。')
            : h('ul', { style: { margin: 0, paddingLeft: 16, fontSize: 'var(--cc-fs-caption)' } },
                taskEvents.slice(-5).reverse().map((ev) => {
                  let extra = ev.payload?.note ? ' · ' + ev.payload.note : ''
                  if (ev.type === 'approval.requested') {
                    const seqTxt = ev.payload?.sequenceIndex ? `第 ${ev.payload.sequenceIndex} 次` : ''
                    const rawDiff = ev.payload?.diffFromPrevious
                    const diffJoined = Array.isArray(rawDiff) ? rawDiff.join(' · ') : (rawDiff ? String(rawDiff) : '')
                    const diffTxt = diffJoined ? `（${diffJoined}）` : ''
                    const cmdTxt = ev.payload?.payload?.command || ev.payload?.command ? `: ${String(ev.payload?.payload?.command || ev.payload?.command).slice(0, 48)}` : ''
                    extra = [seqTxt, diffTxt, cmdTxt].filter(Boolean).join(' ')
                    if (extra) extra = ' · ' + extra
                  } else if (ev.type === 'execution.dispatched' && ev.payload?.dispatchedBy?.kind) {
                    extra = ` · 来源：${ev.payload.dispatchedBy.kind}${ev.payload.memberId ? ' → ' + ev.payload.memberId : ''}`
                  }
                  return h('li', { key: ev.eventId, style: { marginTop: 4 } },
                    new Date(ev.recordedAt).toLocaleTimeString() + ' · ' + (EVENT_LABEL[ev.type] || ev.type) + extra)
                })))),

      task.blockedReason && h('p', { role: 'status', style: { color: 'var(--cc-state-blocked)', marginTop: 8 } }, '阻塞原因：' + task.blockedReason),
      task.result && h('div', { style: { marginTop: 10 } },
        h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, '结果摘要：'),
        h('div', { style: { marginTop: 4 } },
          h(ReferenceText, {
            text: task.result.summary,
            viewObjects,
            tasks,
            pinnedRefs: publicView.pinnedRefs,
            context: { taskId: task.taskId, authorId: task.memberId },
            sessionId,
            onJumpTask: jumpToTask,
            onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
            onJumpObject: jumpToStageObject,
            onViewAllArtifacts: () => changeTab('artifacts'),
            isLight,
          }))),
      task.review && h('p', { style: { marginTop: 6, fontSize: 'var(--cc-fs-meta)' } },
        h('strong', null, '审查结论：'),
        label(task.review.verdict) + (task.review.reason ? ' · ' + task.review.reason : '')),

      taskObjects.length > 0 && h('div', { style: { marginTop: 10 } },
        h('div', { className: 'concerto-group-label', style: { marginBottom: 6 } },
          '关联产物（点击前往成果页签查看）'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
          taskObjects.map((obj) =>
            h('button', {
              key: 'pill-' + obj.id,
              type: 'button',
              className: 'concerto-chip',
              'data-concerto-object-id': obj.id,
              'data-concerto-object-version': obj.version,
              title: `${obj.type}:${obj.id}`,
              onClick: () => jumpToStageObject(obj),
            }, `${obj.title || obj.id} `, h('span', { className: 'concerto-id' }, `v${obj.version}`), ' ›')))),

      (task.state === 'pending' || task.state === 'review') && h('div', { style: { marginTop: 10 } },
        task.state === 'pending' && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--primary',
          disabled: !canAct || active.length > 0 || unknownExecs.length > 0,
          onClick: () => command('/tasks/dispatch', { taskId: task.taskId, callerKind: 'ui' }),
        }, '派发任务'),
        task.state === 'review' && task.result && h(ReviewCard, {
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
        }))))
  }

  function renderBentoGroup(items, keyPrefix) {
    const spans = balanceBentoSpans(items.map((item) => item.effSize))
    return h('div', { className: 'concerto-bento-grid' },
      items.map((item, idx) =>
        h('div', {
          key: keyPrefix + ':' + item.key,
          className: 'concerto-bento-item',
          'data-size': item.effSize,
          style: { '--cc-span': String(spans[idx]) },
        }, h(StructuredObjectCard, item.cardProps))))
  }

  return h('section', {
    ref: containerRef,
    onScroll: handleContainerScroll,
    className: 'concerto-surface concerto-team-view',
    'data-concerto-team-view': 'true',
    'data-concerto-theme': effectiveTheme,
    style: hostTheme.cssVars,
    'aria-label': 'Concerto 团队主页',
  },

  // ① 常驻顶部（sticky + scroll compact）
  h('header', { className: 'concerto-hero', 'data-concerto-section': 'header', 'data-compact': compact ? 'true' : undefined },
    h('div', { className: 'concerto-hero-top' },
      h('div', { style: { minWidth: 0, flex: '1 1 260px' } },
        h('div', { className: 'concerto-hero-title' },
          h('span', null, info.teamName),
          h('span', { className: 'concerto-badge concerto-id', title: '计划修订版本' }, `plan v${snapshot.planRevision}`),
          h('span', {
            className: 'concerto-live-dot',
            'data-offline': error ? 'true' : undefined,
            title: '计划第 ' + snapshot.planRevision + ' 版',
          }, error ? '连接中断 · 保留上次快照' : '实时同步 · ' + new Date(snapshot.serverTime).toLocaleTimeString())),
        teamGoal && h('p', { className: 'concerto-hero-goal', title: teamGoal }, '目标：' + teamGoal)),
      h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
        actionableCount > 0
          ? h('button', {
              type: 'button',
              className: 'concerto-btn concerto-btn--attn concerto-num',
              'data-has-pending': 'true',
              'data-concerto-pending-badge': 'true',
              onClick: jumpToAttention,
            }, `待处理 ${actionableCount} 项`)
          : h('span', {
              className: 'concerto-quiet',
              'data-has-pending': 'false',
              'data-concerto-pending-badge': 'true',
            }, '✓ 无待处理'),
        h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--icon',
          'aria-label': '刷新',
          title: '刷新快照',
          onClick: refresh,
        }, '⟳'),
        openView && h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => openView('chat') }, '查看对话'))),

    stats.total > 0 && h('div', { className: 'concerto-progress-wrap' },
      h('div', { className: 'concerto-progress-bar', 'aria-label': '团队任务总体进度' },
        stats.donePct > 0 && h('div', { className: 'concerto-seg-done', style: { width: stats.donePct + '%' } }),
        stats.reviewPct > 0 && h('div', { className: 'concerto-seg-review', style: { width: stats.reviewPct + '%' } }),
        stats.runPct > 0 && h('div', { className: 'concerto-seg-run', style: { width: stats.runPct + '%' } }),
        stats.blockPct > 0 && h('div', { className: 'concerto-seg-block', style: { width: stats.blockPct + '%' } })),
      h('span', { className: 'concerto-num', style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)' } },
        '已完成 ',
        h('span', { className: 'concerto-kpi-accent' }, `${stats.done}/${stats.total}`),
        ` (${Math.round(stats.donePct)}%)`,
        (stats.review ? ` · 待验收 ${stats.review}` : '') +
        (stats.run ? ` · 进行中 ${stats.run}` : '') +
        (stats.block ? ` · 异常 ${stats.block}` : ''))),

    // 常驻成员小精灵条（单行横向滚动，不折行）
    h('div', { className: 'concerto-roster-strip', 'data-concerto-section': 'roster', 'aria-label': '乐团成员' },
      members.map((member) => {
        const st = memberState(snapshot, member)
        const count = pending.filter((r) => r.memberId === member.id).length
        const capInfo = capByMemberId.get(member.id)
        const capBadge = capInfo ? formatCapabilitySummary(capInfo).badge : ''
        const actLine = deriveMemberActivity(member, snapshot) || capBadge
        return h(MemberSprite, {
          key: member.id,
          member,
          state: st,
          activityLine: actLine,
          count,
          selected: drawerState.memberId === member.id,
          onClick: () => openMemberDrawer(member.id, 'messages'),
        })
      })),

    // 下划线主导航页签
    h('div', { className: 'concerto-tabbar' },
      h('div', { className: 'concerto-tabs', role: 'tablist', 'aria-label': '团队工作区导航' },
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'concerto-tab-btn',
          'data-concerto-tab': 'overview',
          'aria-selected': activeTab === 'overview',
          onClick: () => changeTab('overview'),
        }, '概览'),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'concerto-tab-btn',
          'data-concerto-tab': 'tasks',
          'aria-selected': activeTab === 'tasks',
          onClick: () => changeTab('tasks'),
        }, '任务', renderCountTag(tasks.length)),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'concerto-tab-btn',
          'data-concerto-tab': 'artifacts',
          'aria-selected': activeTab === 'artifacts',
          onClick: () => changeTab('artifacts'),
        }, '成果', renderCountTag(viewObjects.length))),
      actionError && h('p', { role: 'alert', style: { ...styles.error, margin: 0 } }, actionError))),

  // ② 概览页签
  activeTab === 'overview' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--cc-space-6)' }, 'data-concerto-tabpanel': 'overview' },
    unreadyCaps.length > 0 && h('div', { className: 'concerto-attn-card', 'data-concerto-capability-warning': 'true' },
      h('strong', null, `成员执行能力尚未就绪（${unreadyCaps.length}）`),
      h('div', { style: { fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)' } },
        unreadyCaps.map((c) => `${c.memberId}: ${formatCapabilitySummary(c).summary}`).join('；') + '（请前往设置 → Concerto 生成并重载团队）')),
    // 待处理事项（仅包含审批 / 提问 / 阻塞 / 未知执行 / 待验收 / 阻塞验收的必需视图）
    actionableCount > 0 && h('section', { 'aria-label': '待处理事项', 'data-concerto-section': 'attention' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('span', null, '待处理事项'),
          h('span', { className: 'concerto-tag concerto-num' }, String(actionableCount)))),
      blockingMissing.length > 0 && h('div', { className: 'concerto-attn-card', 'data-concerto-missing-required': 'true', style: { marginBottom: attentionItems.length > 0 ? 12 : 0 } },
        h('strong', null, `缺少验收必需视图（${blockingMissing.length}）`),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
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
      attentionItems.length > 0 && h('div', { className: 'concerto-attn-grid' },
        attentionItems.map((item) => {
          if (item.kind === 'request' || item.kind === 'approval' || item.kind === 'question') {
            const req = pending.find((r) => r.requestId === item.requestId)
            if (!req) return null
            return h('div', { key: item.id, className: 'concerto-attn-card', 'data-kind': item.kind },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
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
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
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
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
                h('strong', null, '待你验收 · ' + task.title),
                h('button', { type: 'button', className: 'concerto-link concerto-id', onClick: () => jumpToTask(task.taskId) }, `定位 ${task.taskId} ›`)),
              task.result?.summary && h('p', { style: { margin: 0, fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)' } }, task.result.summary),
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
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
              h('strong', null, item.title),
              item.taskId && h('button', { type: 'button', className: 'concerto-link concerto-id', onClick: () => jumpToTask(item.taskId) }, `定位 ${item.taskId} ›`)),
            item.detail && h('p', { style: { margin: 0, fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)' } }, item.detail),
            item.memberId && h('div', null,
              h('button', { type: 'button', className: 'concerto-chip', onClick: () => openMemberDrawer(item.memberId, 'messages') },
                '查看 ' + item.memberId + ' 详情 ›')))
        }))),

    // 指挥者简报（无多余外框，按有无卡点切换状态强调）
    h('section', { 'aria-label': '指挥者简报', 'data-concerto-section': 'briefing' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('span', null, '指挥者简报'),
          publicView.updatedBy && h('span', { className: 'concerto-tag' }, '由 ' + publicView.updatedBy + ' 维护'))),
      h('div', { className: 'concerto-briefing-grid' },
        h('div', { className: 'concerto-briefing-cell' },
          h('div', { className: 'concerto-group-label' }, '当前进展'),
          h(InlineTextWithRefs, { text: briefing.progress, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab('artifacts') })),
        h('div', { className: 'concerto-briefing-cell', 'data-tone': actionableCount > 0 ? 'attention' : 'calm' },
          h('div', { className: 'concerto-group-label' }, '关键问题'),
          h(InlineTextWithRefs, { text: briefing.issues, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab('artifacts') })),
        h('div', { className: 'concerto-briefing-cell' },
          h('div', { className: 'concerto-group-label' }, '下一步'),
          h(InlineTextWithRefs, { text: briefing.nextStep, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab('artifacts') }))),
      briefing.extraText && h('div', { style: { marginTop: 'var(--cc-space-2)' } },
        h(ReferenceText, {
          text: briefing.extraText,
          viewObjects,
          tasks,
          pinnedRefs: publicView.pinnedRefs,
          skipPinnedIds: overviewShownKeys,
          sessionId,
          onJumpTask: jumpToTask,
          onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
          onJumpObject: jumpToStageObject,
          onViewAllArtifacts: () => changeTab('artifacts'),
          isLight,
        }))),

    // 重点任务
    h('section', { 'aria-label': '重点任务', 'data-concerto-section': 'key-tasks' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('span', null, '重点任务'),
          renderCountTag(tasks.length)),
        tasks.length > 0 && h('button', {
          type: 'button',
          className: 'concerto-link',
          onClick: () => changeTab('tasks'),
        }, '查看全部任务 →')),
      keyTasks.length === 0
        ? h(EmptyState, { icon: '🧭', text: '暂无任务，可通过底部输入框向指挥者下达目标。' })
        : h('div', { className: 'concerto-key-tasks' },
            keyTasks.map((tk) => {
              const meta = STATE_META[tk.viewState] || STATE_META[tk.state] || STATE_META.pending
              return h('button', {
                key: tk.taskId,
                type: 'button',
                className: 'concerto-key-task-row',
                'data-concerto-key-task': tk.taskId,
                onClick: () => jumpToTask(tk.taskId),
              },
              h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                h('strong', null, tk.title),
                h('span', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } }, tk.memberId || '待分配')),
              h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } },
                h('span', { className: 'concerto-state-chip ' + meta.cls }, meta.icon + ' ' + meta.label),
                h('span', { className: 'concerto-id', style: { color: 'var(--cc-text-muted)' } }, tk.taskId)))
            }))),

    // 精选产物预览（等高与最后一行平衡填满）
    (viewObjects.length > 0 || stageSections.length > 0 || userPinObjs.length > 0) && h('section', { 'aria-label': '精选产物预览', 'data-concerto-section': 'stage' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('span', null, '精选产物预览'),
          renderCountTag(viewObjects.length)),
        viewObjects.length > 0 && h('button', {
          type: 'button',
          className: 'concerto-link',
          'data-concerto-view-all-artifacts': 'true',
          onClick: () => changeTab('artifacts'),
        }, hiddenArtifactsCount > 0 ? `查看全部 ${viewObjects.length} 份产物（另有 ${hiddenArtifactsCount} 份）→` : `在成果页筛选（${viewObjects.length}）→`)),

      userPinObjs.length > 0 && h('div', { className: 'concerto-stage-group', 'data-concerto-stage-group': 'user-pinned' },
        h('div', { className: 'concerto-group-label' }, '我置顶的产物'),
        renderBentoGroup(userPinObjs.map(({ ref, resolved }, idx) => {
          const obj = resolved.ok ? resolved.object : null
          const defaultRend = obj ? (obj.renderer || DEFAULT_RENDERER[obj.type]) : 'html'
          const effSize = obj?.size || (defaultRend === 'markmap' || ref.type === 'board' ? 'l' : 'm')
          return {
            key: `${ref.type}:${ref.id}:${idx}`,
            effSize,
            cardProps: {
              object: obj,
              tasks,
              missingRef: obj ? null : ref,
              errorReason: resolved.ok ? '' : resolved.reason,
              sizeHint: effSize,
              sessionId,
              onJumpTask: jumpToTask,
              onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
              highlighted: obj && highlightObjectId === obj.id,
              userPinned: true,
              onTogglePin: handleTogglePin,
              badgeLabel: '用户置顶',
            },
          }
        }), 'upin')),

      stageSections.map((sec, sIdx) => {
        const visibleRefs = (sec.refs || []).filter((ref) => !userPinnedSet.has(`${ref.type}:${ref.id}`))
        if (visibleRefs.length === 0) return null
        return h('div', { key: 'sec-' + sIdx, className: 'concerto-stage-group' },
          (sec.title || sec.subtitle) && h('div', { className: 'concerto-group-label' },
            sec.title || '',
            sec.subtitle ? ` · ${sec.subtitle}` : ''),
          renderBentoGroup(visibleRefs.map((ref, rIdx) => {
            const resolved = resolveViewObjectRef(viewObjects, ref, { pinnedRefs: publicView.pinnedRefs })
            const obj = resolved.ok ? resolved.object : null
            const defaultRend = obj ? (obj.renderer || DEFAULT_RENDERER[obj.type]) : 'html'
            const effSize = ref.size || obj?.size || (defaultRend === 'markmap' || ref.type === 'board' ? 'l' : 'm')
            return {
              key: `${ref.type}:${ref.id}:${rIdx}`,
              effSize,
              cardProps: {
                object: obj,
                tasks,
                missingRef: obj ? null : ref,
                errorReason: resolved.ok ? '' : resolved.reason,
                ambiguousNote: resolved.ambiguous ? '同名对象按指挥台置顶优先展示' : '',
                sizeHint: effSize,
                sessionId,
                onJumpTask: jumpToTask,
                onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
                highlighted: obj && highlightObjectId === obj.id,
                userPinned: false,
                onTogglePin: handleTogglePin,
                badgeLabel: '指挥者推荐',
              },
            }
          }), 'sec-' + sIdx))
      }),

      unpinnedFallbackObjs.length > 0 && h('div', { className: 'concerto-stage-group' },
        h('div', { className: 'concerto-group-label' }, '最近产物'),
        renderBentoGroup(unpinnedFallbackObjs.map((obj) => ({
          key: obj.id,
          effSize: obj.size || (obj.type === 'mindmap' || obj.type === 'board' ? 'l' : 'm'),
          cardProps: {
            object: obj,
            tasks,
            sizeHint: obj.size || (obj.type === 'mindmap' || obj.type === 'board' ? 'l' : 'm'),
            sessionId,
            onJumpTask: jumpToTask,
            onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
            highlighted: highlightObjectId === obj.id,
            userPinned: userPinnedSet.has(`${obj.type}:${obj.id}`),
            onTogglePin: handleTogglePin,
          },
        })), 'fb')))),

  // ③ 任务页签：分段切换（列表 / 看板）+ 看板下仅渲染展开的详情，避免重复列表
  activeTab === 'tasks' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--cc-space-4)' }, 'data-concerto-tabpanel': 'tasks' },
    jumpOrigin && h('div', { className: 'concerto-jump-banner', 'data-concerto-nav-banner': 'true' },
      h('span', null, `已定位到任务 ${jumpOrigin.targetLabel || ''}`),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: returnToJumpOrigin },
        jumpOrigin.memberId ? `← 返回 ${jumpOrigin.memberId}` : '← 返回概览')),

    h('div', { className: 'concerto-section-head', style: { marginBottom: 0 } },
      h('div', { className: 'concerto-section-title' },
        h('span', null, '任务管理'),
        renderCountTag(tasks.length)),
      h('div', { className: 'concerto-seg', role: 'group', 'aria-label': '任务展示模式' },
        h('button', {
          type: 'button',
          className: 'concerto-seg-btn',
          'data-concerto-task-view': 'list',
          'aria-pressed': resolvedTaskView === 'list',
          onClick: () => changeTaskViewMode('list'),
        }, '列表视图'),
        h('button', {
          type: 'button',
          className: 'concerto-seg-btn',
          'data-concerto-task-view': 'kanban',
          'aria-pressed': resolvedTaskView === 'kanban',
          onClick: () => changeTaskViewMode('kanban'),
        }, '看板视图'))),

    tasks.length === 0
      ? h(EmptyState, { icon: '🧭', text: '暂无任务，可通过底部输入框向指挥者提出目标。' })
      : h(React.Fragment, null,
          resolvedTaskView === 'kanban' && h('section', { 'aria-label': '团队进度看板', 'data-concerto-section': 'kanban' },
            h('div', { className: 'concerto-board-cols' },
              KANBAN_COLUMNS.map((col) => {
                const list = kanbanMap[col.id]
                return h('div', {
                  key: col.id,
                  className: 'concerto-board-col',
                  'data-concerto-column': col.id,
                  'data-empty': list.length === 0 ? 'true' : undefined,
                },
                h('div', { className: 'concerto-board-col-head' },
                  h('span', null, col.title),
                  h('span', { className: 'concerto-tag concerto-num' }, String(list.length))),
                list.length > 0 && list.map((task) => {
                  const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending
                  const blocked = task.viewState === 'blocked' || task.viewState === 'failed' || task.state === 'failed' || Boolean(task.blockedReason)
                  const unknown = task.viewState === 'unknown'
                  const line = task.blockedReason || task.progress?.at(-1)?.note || task.objective || ''
                  return h('button', {
                    key: task.taskId,
                    type: 'button',
                    className: 'concerto-kcard',
                    'data-concerto-kanban-task': task.taskId,
                    'data-blocked': blocked ? 'true' : undefined,
                    'data-unknown': unknown ? 'true' : undefined,
                    onClick: () => jumpToTask(task.taskId),
                  },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 } },
                    h('strong', { style: { fontSize: 'var(--cc-fs-meta)', lineHeight: 1.35 } }, task.title),
                    h('span', { className: 'concerto-state-chip ' + meta.cls }, meta.icon + ' ' + meta.label)),
                  line && h('div', {
                    style: {
                      fontSize: 'var(--cc-fs-caption)',
                      color: 'var(--dsw-alias-label-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    },
                  }, line),
                  h('div', { className: 'concerto-kcard-foot' },
                    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
                      task.memberId && h(MemberGlyph, {
                        member: members.find((m) => m.id === task.memberId) || { id: task.memberId, roleKind: 'worker' },
                        state: task.viewState || task.state,
                        size: 20,
                      }),
                      h('span', null, task.memberId || '待分配')),
                    h('span', { className: 'concerto-id' },
                      (task.dependsOn?.length ? '依赖 ' + task.dependsOn.join(',') + ' · ' : '') + task.taskId)))
                }))
              }))),

          resolvedTaskView === 'list' && h('section', { 'aria-label': '任务列表与详情', 'data-concerto-section': 'tasks' },
            tasks.map((task) => renderTaskDetailModule(task))),

          resolvedTaskView === 'kanban' && (() => {
            const expandedList = tasks.filter((t) => expandedTasks.has(t.taskId))
            return expandedList.length > 0 && h('section', { 'aria-label': '已展开的任务', 'data-concerto-section': 'tasks' },
              h('div', { className: 'concerto-group-label' }, '已展开的任务'),
              expandedList.map((task) => renderTaskDetailModule(task)))
          })())),

  // ④ 成果页签：筛选栏 + 必需视图清单（含建议补充）+ Bento 网格 + 返回入口
  activeTab === 'artifacts' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--cc-space-3)' }, 'data-concerto-tabpanel': 'artifacts' },
    jumpOrigin && !savedFilterBeforeJump && h('div', { className: 'concerto-jump-banner', 'data-concerto-nav-banner': 'true' },
      h('span', null, `已定位到产物 ${jumpOrigin.targetLabel || ''}`),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: returnToJumpOrigin },
        jumpOrigin.memberId ? `← 返回 ${jumpOrigin.memberId}` : '← 返回概览')),

    h('div', { className: 'concerto-section-head', style: { marginBottom: 0 } },
      h('div', { className: 'concerto-section-title' },
        h('span', null, '全部结构化产物'),
        h('span', { className: 'concerto-tag concerto-num' }, `${filteredArtifacts.length} / ${viewObjects.length}`))),

    requiredViews.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 }, 'data-concerto-required-views': 'true' },
      suggestedMissing.length > 0 && h('div', { className: 'concerto-group-label' }, `必需视图检查（${suggestedMissing.length} 项建议补充未阻塞）`),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        requiredViews.map((rv) => h('span', {
          key: `${rv.taskId || 'team'}:${rv.type}:${rv.id}`,
          className: 'concerto-req-view-pill',
          'data-missing': rv.missing && rv.requiredForAcceptance ? 'true' : undefined,
          'data-suggested': rv.missing && !rv.requiredForAcceptance ? 'true' : undefined,
        },
        h('span', { className: 'concerto-id' }, `${rv.type}:${rv.id}`),
        ` · ${rv.missing ? (rv.requiredForAcceptance ? '验收必需·缺失' : '建议补充') : `v${rv.version || 1} 已就绪`}`)))),

    h('div', { className: 'concerto-filter-bar', 'data-concerto-artifact-filters': 'true' },
      h('label', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)' } }, '任务 ',
        h('select', {
          'aria-label': '按任务筛选产物',
          'data-filter': 'taskId',
          'data-active': artifactFilters.taskId !== 'all' ? 'true' : undefined,
          value: artifactFilters.taskId,
          onChange: (e) => updateFilters({ taskId: e.target.value }),
        },
        h('option', { value: 'all' }, '全部任务'),
        tasks.map((t) => h('option', { key: t.taskId, value: t.taskId }, `${t.taskId} · ${t.title}`)))),

      h('label', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)' } }, '成员 ',
        h('select', {
          'aria-label': '按成员筛选产物',
          'data-filter': 'memberId',
          'data-active': artifactFilters.memberId !== 'all' ? 'true' : undefined,
          value: artifactFilters.memberId,
          onChange: (e) => updateFilters({ memberId: e.target.value }),
        },
        h('option', { value: 'all' }, '全部成员'),
        members.map((m) => h('option', { key: m.id, value: m.id }, m.id)))),

      h('label', { style: { fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)' } }, '类型 ',
        h('select', {
          'aria-label': '按类型筛选产物',
          'data-filter': 'type',
          'data-active': artifactFilters.type !== 'all' ? 'true' : undefined,
          value: artifactFilters.type,
          onChange: (e) => updateFilters({ type: e.target.value }),
        },
        ARTIFACT_TYPE_OPTIONS.map((opt) => h('option', { key: opt.value, value: opt.value }, opt.label)))),

      (artifactFilters.taskId !== 'all' || artifactFilters.memberId !== 'all' || artifactFilters.type !== 'all') && h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--ghost',
        onClick: () => updateFilters({ taskId: 'all', memberId: 'all', type: 'all' }),
      }, '重置筛选')),

    savedFilterBeforeJump && h('div', { className: 'concerto-jump-banner', 'data-concerto-jump-banner': 'true' },
      h('span', null, `已临时调整筛选，确保定位目标 ${savedFilterBeforeJump.targetLabel} 可见`),
      h('button', {
        type: 'button',
        className: 'concerto-btn',
        'data-concerto-restore-filter': 'true',
        onClick: restoreSavedFilters,
      }, '返回原筛选条件')),

    filteredArtifacts.length === 0
      ? h(EmptyState, {
          icon: '🧩',
          text: viewObjects.length === 0 ? '成员暂未发布结构化产物。' : '当前筛选条件下没有匹配的结构化产物。',
          action: viewObjects.length > 0 && h('button', { type: 'button', className: 'concerto-link', onClick: () => updateFilters({ taskId: 'all', memberId: 'all', type: 'all' }) }, '查看全部产物 →'),
        })
      : renderBentoGroup(filteredArtifacts.map((obj) => {
          const effSize = obj.size || (obj.type === 'mindmap' || obj.type === 'board' ? 'l' : 'm')
          const isCmdPinned = (publicView.pinnedRefs || []).some((p) => p.type === obj.type && p.id === obj.id)
          const isUserPinned = userPinnedSet.has(`${obj.type}:${obj.id}`)
          return {
            key: obj.id,
            effSize,
            cardProps: {
              object: obj,
              tasks,
              sizeHint: effSize,
              sessionId,
              onJumpTask: jumpToTask,
              onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
              highlighted: highlightObjectId === obj.id,
              userPinned: isUserPinned,
              onTogglePin: handleTogglePin,
              badgeLabel: isUserPinned ? '用户置顶' : (isCmdPinned ? '指挥者推荐' : ''),
            },
          }
        }), 'art')),

  // 右侧滑出成员详情抽屉（按 memberId key 挂载以保证切换成员重置焦点）
  drawerMember && h(MemberDrawer, {
    key: drawerMember.id,
    member: drawerMember,
    state: memberState(snapshot, drawerMember),
    sessionId,
    snapshot,
    initialTab: drawerState.tab,
    onClose: closeMemberDrawer,
    onJumpTask: jumpToTask,
    onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
    onJumpObject: jumpToStageObject,
    isLight,
  }))
}
