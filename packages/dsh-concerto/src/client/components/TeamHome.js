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
  fetchViewObjectVersion,
  formatCapabilitySummary,
} from '../api.js'
import { useTeamCss } from '../styles.js'
import { ExcalidrawImport } from './ExcalidrawImport.js'
import { normalizePublicView, resolveViewObjectRef, DEFAULT_RENDERER } from '../../../lib/domain/view_objects.mjs'
import { MemberSprite, MemberGlyph } from './MemberSprite.js'
import { UiIcon, StateChip } from './UiIcon.js'
import { RequestCard, ReviewCard, AdjudicationCard, UnblockTaskForm, DispatchLimitFields, readDispatchLimitsForm } from './Panels.js'
import { StructuredObjectCard, CanvasModal } from './StructuredObjectCard.js'
import { ReferenceText, InlineTextWithRefs } from './ReferenceText.js'
import { MemberDrawer } from './MemberDrawer.js'
import { AttentionPopover, AttentionContent } from './AttentionPopover.js'
import { InspectorDialog, TaskInspectorDialog } from './TaskInspectorDialog.js'
import { TaskReviewFeedback } from './TaskReviewFeedback.js'
import { SharedAcceptanceChecklist } from './SharedAcceptanceChecklist.js'
import { preferredRendererSize } from './renderers/layoutSize.js'
import { TabList, tabPanelProps, focusAndReveal } from './Tabs.js'

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

const HERO_COMPACT_ENTER_TOP = 96
const HERO_COMPACT_EXIT_TOP = 32
const HERO_COMPACT_MIN_HEADROOM = 16
const HERO_COMPACT_FALLBACK_HEIGHT = 60

function computeNextHeroCompact({ currentCompact, scrollTop, scrollHeight, clientHeight, expandedHeight, compactHeight }) {
  if (currentCompact) {
    return scrollTop > HERO_COMPACT_EXIT_TOP
  }
  if (scrollTop <= HERO_COMPACT_ENTER_TOP) return false
  if (clientHeight > 0 && scrollHeight > clientHeight && expandedHeight > 0) {
    const shrinkDelta = Math.max(0, expandedHeight - (compactHeight || HERO_COMPACT_FALLBACK_HEIGHT))
    const postCollapseMaxScroll = (scrollHeight - clientHeight) - shrinkDelta
    if (postCollapseMaxScroll < HERO_COMPACT_EXIT_TOP + HERO_COMPACT_MIN_HEADROOM) {
      return false
    }
  }
  return true
}

function balanceBentoSpans(sizes, preserveSize = []) {
  const spans = sizes.map((s) => BENTO_SPAN[s] || 6)
  let rowUsed = 0
  for (const sp of spans) {
    rowUsed = rowUsed + sp > 12 ? sp : rowUsed + sp
  }
  const remainder = 12 - rowUsed
  if (remainder > 0 && remainder < 12 && spans.length > 0) {
    let fillIndex = -1
    for (let idx = spans.length - 1; idx >= 0; idx -= 1) {
      if (!preserveSize[idx] && spans[idx] < 12) {
        fillIndex = idx
        break
      }
    }
    if (fillIndex >= 0) spans[fillIndex] += remainder
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

function humanizeActivityText(text) {
  return String(text || '').replace(/\b(table|checklist|mindmap|diagram|board|canvas|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})(?:\s*\(v(\d+)\))?/g, (match, type, id, version) => {
    const ref = parseRefString(`${type}:${id}`)
    const typeLabel = ARTIFACT_TYPE_OPTIONS.find((option) => option.value === ref.type)?.label || ref.type
    return `${typeLabel}${ref.id}${version ? ` v${version}` : ''}`
  }).replace(/^发布\s*/, '发布了')
}

function deriveMemberActivity(member, snapshot) {
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : []
  const activeTask = tasks.find((t) => t.memberId === member.id && !['completed', 'cancelled'].includes(t.state))
  if (activeTask) {
    const latestNote = Array.isArray(activeTask.progress) && activeTask.progress.length > 0
      ? activeTask.progress.at(-1).note
      : ''
    return humanizeActivityText(activeTask.blockedReason || latestNote || activeTask.title)
  }
  const actList = snapshot?.memberActivitySummary?.[member.id]
  if (Array.isArray(actList) && actList.length > 0 && actList[0].summary) {
    return humanizeActivityText(actList[0].summary)
  }
  if (member.roleKind === 'commander') {
    const first = String(snapshot?.publicView?.summary || '').split(/\r?\n/).find((l) => l.trim())
    return first ? humanizeActivityText(first.trim()) : '统筹乐团分工与公共简报'
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
    const manualReviewNeeded = (task.viewState === 'review' || task.state === 'review') &&
      Boolean(task.reviewPolicy?.requiresReview && task.reviewDispatch?.status === 'needs_assignment')
    if (manualReviewNeeded) {
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

function parseCommanderBriefing(summary, stats, attentionItems, dispatchPaused) {
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
    else if (stats.pending > 0) nextStep = dispatchPaused
      ? `恢复派发后继续处理 ${stats.pending} 项待派发任务。`
      : `派发或继续推进 ${stats.pending} 项待派发任务。`
    else if (stats.run > 0) nextStep = '关注执行中的成员产出并按需检阅产物。'
    else nextStep = stats.total === 0 ? '在底部输入框下达具体目标。' : '全部任务已收口，可归档或开启下一阶段。'
  }
  return { progress, issues, nextStep, extraText: extraLines.join('\n').trim() }
}

function relativeTimeLabel(value, nowValue) {
  const timestamp = Date.parse(value || '')
  const now = Date.parse(nowValue || '') || Date.now()
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function EmptyState({ icon, text, action = null }) {
  return h('div', { className: 'concerto-empty' },
    h('span', { 'aria-hidden': true, className: 'concerto-empty-icon' }, icon),
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
  const taskCardRefs = React.useRef(new Map())
  const boardColumnRefs = React.useRef(new Map())
  const boardScrollRef = React.useRef(null)
  const restoredScrollRef = React.useRef(false)
  const compactRef = React.useRef(false)
  const expandedHeroHeightRef = React.useRef(0)
  const compactHeroHeightRef = React.useRef(0)
  const lastCommand = React.useRef(null)
  const tabsId = React.useId()
  const pinRequestRef = React.useRef(null)

  const [drawerState, setDrawerState] = React.useState({ memberId: '', tab: 'messages', returnTaskId: '' })
  const [inspectorStack, setInspectorStack] = React.useState([])
  const [activeTab, setActiveTab] = React.useState(initialView.activeTab || 'overview')
  const [selectedTaskId, setSelectedTaskId] = React.useState(initialView.selectedTaskId || '')
  const [inspectorWide, setInspectorWide] = React.useState(false)
  const [artifactFilters, setArtifactFilters] = React.useState(initialView.artifactFilters || { taskId: 'all', memberId: 'all', type: 'all' })
  const [savedFilterBeforeJump, setSavedFilterBeforeJump] = React.useState(null)
  const [jumpOrigin, setJumpOrigin] = React.useState(null)
  const [compact, setCompact] = React.useState(false)
  const [attentionOpen, setAttentionOpen] = React.useState(false)
  const [activeBoardColumn, setActiveBoardColumn] = React.useState('pending')
  const [optimisticUserPins, setOptimisticUserPins] = React.useState(null)
  const [pinningRef, setPinningRef] = React.useState('')
  const [pinFailure, setPinFailure] = React.useState(null)
  const [highlightTaskId, setHighlightTaskId] = React.useState('')
  const [highlightObjectId, setHighlightObjectId] = React.useState('')
  const [pinnedPreview, setPinnedPreview] = React.useState(null)
  const [filePreview, setFilePreview] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const [runLimitsOpen, setRunLimitsOpen] = React.useState(false)
  const [runLimitsError, setRunLimitsError] = React.useState('')
  const hostTheme = useHostTheme()
  const isLight = hostTheme.isLight
  const effectiveTheme = hostTheme.colorScheme
  const snapshotViewObjectsRef = React.useRef([])
  snapshotViewObjectsRef.current = Array.isArray(snapshot?.viewObjects) ? snapshot.viewObjects : []
  const artifactFiltersRef = React.useRef(artifactFilters)
  artifactFiltersRef.current = artifactFilters
  const activeTabRef = React.useRef(activeTab)
  activeTabRef.current = activeTab
  const selectedTaskIdRef = React.useRef(selectedTaskId)
  selectedTaskIdRef.current = selectedTaskId
  const drawerStateRef = React.useRef(drawerState)
  drawerStateRef.current = drawerState
  const inspectorStackRef = React.useRef(inspectorStack)
  inspectorStackRef.current = inspectorStack

  React.useEffect(() => {
    const vs = readSessionViewState(sessionId)
    setDrawerState({ memberId: '', tab: 'messages', returnTaskId: '' })
    setInspectorStack([])
    setActiveTab(vs.activeTab || 'overview')
    setSelectedTaskId(vs.selectedTaskId || '')
    setArtifactFilters(vs.artifactFilters || { taskId: 'all', memberId: 'all', type: 'all' })
    setSavedFilterBeforeJump(null)
    setJumpOrigin(null)
    compactRef.current = false
    expandedHeroHeightRef.current = 0
    compactHeroHeightRef.current = 0
    setCompact(false)
    setOptimisticUserPins(null)
    setPinningRef('')
    setPinFailure(null)
    pinRequestRef.current = null
    setHighlightTaskId('')
    setHighlightObjectId('')
    setPinnedPreview(null)
    setActionError('')
    setRunLimitsOpen(false)
    setRunLimitsError('')
    restoredScrollRef.current = false
    lastCommand.current = null
  }, [sessionId])

  React.useEffect(() => {
    if (optimisticUserPins && JSON.stringify(snapshot?.userPinnedRefs || []) === JSON.stringify(optimisticUserPins)) {
      setOptimisticUserPins(null)
    }
  }, [snapshot?.userPinnedRefs, optimisticUserPins])

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
    const el = containerRef.current
    const savedTop = readSessionViewState(sessionId).scrollTop
    if (typeof savedTop === 'number' && savedTop > 0) {
      const header = el.querySelector('header')
      if (header && header.getAttribute('data-compact') !== 'true') {
        const headerHeight = header.getBoundingClientRect().height
        if (headerHeight > 0) expandedHeroHeightRef.current = headerHeight
      }
      el.scrollTop = savedTop
      const isCompact = computeNextHeroCompact({
        currentCompact: false,
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        expandedHeight: expandedHeroHeightRef.current,
        compactHeight: compactHeroHeightRef.current,
      })
      compactRef.current = isCompact
      setCompact(isCompact)
    }
    restoredScrollRef.current = true
  }, [sessionId, snapshot])

  React.useLayoutEffect(() => {
    const root = containerRef.current
    const header = root?.querySelector('header')
    if (!header) return
    const update = () => {
      const headerHeight = header.getBoundingClientRect().height
      if (headerHeight > 0) {
        if (header.getAttribute('data-compact') === 'true') {
          compactHeroHeightRef.current = headerHeight
        } else {
          expandedHeroHeightRef.current = headerHeight
        }
      }
      root.style.setProperty('--cc-sticky-height', `${headerHeight + 16}px`)
      setInspectorWide(root.clientWidth >= 1100)
      if (compactRef.current && root.scrollTop <= HERO_COMPACT_EXIT_TOP) {
        compactRef.current = false
        setAttentionOpen(false)
        setCompact(false)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    observer.observe(root)
    return () => observer.disconnect()
  }, [sessionId, Boolean(snapshot)])

  React.useEffect(() => {
    const root = boardScrollRef.current
    if (activeTab !== 'tasks' || !root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target?.dataset?.concertoColumn) setActiveBoardColumn(visible.target.dataset.concertoColumn)
    }, { root, threshold: [0.4, 0.6, 0.8] })
    for (const element of boardColumnRefs.current.values()) observer.observe(element)
    return () => observer.disconnect()
  }, [activeTab, snapshot?.tasks?.length, selectedTaskId, inspectorWide])

  const closeAttention = React.useCallback(() => setAttentionOpen(false), [])

  const changeTab = React.useCallback((tab, keepJumpOrigin = false) => {
    setAttentionOpen(false)
    if (!keepJumpOrigin) setJumpOrigin(null)
    setActiveTab(tab)
    writeSessionViewState(sessionId, { activeTab: tab })
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

  const goInspectorBack = React.useCallback(() => {
    const stack = [...inspectorStackRef.current]
    const previous = stack.pop()
    if (!previous) return false
    setInspectorStack(stack)
    setJumpOrigin(null)
    setActiveTab(previous.activeTab || 'tasks')
    if (previous.kind === 'member') {
      setSelectedTaskId('')
      setDrawerState({ memberId: previous.id, tab: previous.tab || 'messages', returnTaskId: '' })
      writeSessionViewState(sessionId, { activeTab: previous.activeTab || 'tasks', selectedTaskId: '' })
      return true
    }
    setDrawerState({ memberId: '', tab: 'messages', returnTaskId: '' })
    setSelectedTaskId(previous.id)
    writeSessionViewState(sessionId, { activeTab: previous.activeTab || 'tasks', selectedTaskId: previous.id })
    requestAnimationFrame(() => {
      const target = taskRefs.current.get(previous.id) || taskCardRefs.current.get(previous.id)
      focusAndReveal(target)
    })
    return true
  }, [sessionId])

  const openMemberDrawer = React.useCallback((memberId, tab = 'messages') => {
    if (!memberId) return
    setAttentionOpen(false)
    const visibleTaskId = activeTabRef.current === 'tasks' ? selectedTaskIdRef.current : ''
    const currentMemberId = drawerStateRef.current.memberId
    const stack = [...inspectorStackRef.current]
    if (currentMemberId && currentMemberId !== memberId) {
      stack.push({ kind: 'member', id: currentMemberId, tab: drawerStateRef.current.tab, activeTab: activeTabRef.current })
    } else if (visibleTaskId) {
      stack.push({ kind: 'task', id: visibleTaskId, activeTab: 'tasks' })
    }
    setInspectorStack(stack)
    if (visibleTaskId) {
      setSelectedTaskId('')
      writeSessionViewState(sessionId, { selectedTaskId: '' })
    }
    setDrawerState({ memberId, tab, returnTaskId: '' })
  }, [sessionId])

  const closeMemberDrawer = React.useCallback((restore = true) => {
    if (restore && goInspectorBack()) return
    setDrawerState({ memberId: '', tab: 'messages', returnTaskId: '' })
    if (restore) setInspectorStack([])
  }, [goInspectorBack])

  const closeTaskInspector = React.useCallback(() => {
    const taskId = selectedTaskIdRef.current
    setSelectedTaskId('')
    setInspectorStack([])
    writeSessionViewState(sessionId, { selectedTaskId: '' })
    requestAnimationFrame(() => {
      if (typeof document !== 'undefined' && document.querySelector('[data-concerto-member-drawer][open]')) return
      taskCardRefs.current.get(taskId)?.focus({ preventScroll: true })
    })
  }, [sessionId])

  const returnToJumpOrigin = React.useCallback(() => {
    if (!jumpOrigin) return
    const origin = jumpOrigin
    setJumpOrigin(null)
    setActiveTab(origin.tab)
    writeSessionViewState(sessionId, { activeTab: origin.tab })
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          document.getElementById(`${tabsId}-panel-${origin.tab}`)?.focus({ preventScroll: true })
          containerRef.current.scrollTop = origin.scrollTop || 0
        }
      })
    }
    if (origin.memberId) {
      openMemberDrawer(origin.memberId, 'tasks')
    }
  }, [jumpOrigin, sessionId, openMemberDrawer, tabsId])

  const jumpToTask = React.useCallback((taskId, origin = null) => {
    if (!taskId) return
    setAttentionOpen(false)
    const curTab = activeTabRef.current
    if (curTab === 'tasks' && selectedTaskIdRef.current === taskId && !origin?.memberId) {
      closeTaskInspector()
      return
    }
    if (origin?.memberId) {
      setInspectorStack([
        ...inspectorStackRef.current,
        { kind: 'member', id: origin.memberId, tab: origin.tab || 'tasks', activeTab: curTab },
      ])
    } else if (curTab === 'tasks' && selectedTaskIdRef.current && selectedTaskIdRef.current !== taskId) {
      setInspectorStack([
        ...inspectorStackRef.current,
        { kind: 'task', id: selectedTaskIdRef.current, activeTab: 'tasks' },
      ])
    } else if (curTab !== 'tasks') {
      setInspectorStack([])
    }
    if (curTab !== 'tasks' || origin?.memberId) {
      setJumpOrigin({
        tab: curTab,
        scrollTop: containerRef.current?.scrollTop || 0,
        memberId: origin?.memberId || '',
        targetLabel: taskId,
      })
    }
    setActiveTab('tasks')
    setSelectedTaskId(taskId)
    writeSessionViewState(sessionId, { activeTab: 'tasks', selectedTaskId: taskId })
    setHighlightObjectId('')
    setHighlightTaskId(taskId)
    requestAnimationFrame(() => {
      const el = taskRefs.current.get(taskId)
        || (typeof document !== 'undefined' ? document.querySelector(`[data-concerto-task-id="${taskId}"]`) : null)
      focusAndReveal(el)
    })
    setTimeout(() => {
      setHighlightTaskId((cur) => (cur === taskId ? '' : cur))
    }, 2400)
  }, [sessionId, closeTaskInspector])

  const jumpToStageObject = React.useCallback((refOrObj, origin = null) => {
    setAttentionOpen(false)
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

    setHighlightTaskId('')
    setHighlightObjectId(targetId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = typeof document !== 'undefined'
          ? ((domId && document.getElementById(domId)) || document.querySelector(`[data-concerto-object-id="${targetId}"]`))
          : null
        focusAndReveal(el)
      })
    })
    setTimeout(() => {
      setHighlightObjectId((cur) => (cur === targetId ? '' : cur))
    }, 2400)
  }, [sessionId, changeTab])

  async function openFilePreview(filePath, taskId = '') {
    if (!filePath) return
    setFilePreview({ loading: true, error: '', relativePath: filePath, path: filePath, content: '', sizeBytes: 0, truncated: false })
    try {
      const res = await request('/files/preview', {
        method: 'POST',
        body: JSON.stringify({ sessionId, path: filePath, ...(taskId ? { taskId } : {}) }),
      })
      setFilePreview({
        loading: false,
        error: '',
        relativePath: res.relativePath || filePath,
        path: res.path || filePath,
        content: res.content ?? '',
        sizeBytes: res.sizeBytes ?? 0,
        truncated: Boolean(res.truncated),
      })
    } catch (err) {
      setFilePreview({
        loading: false,
        error: err?.message || '读取文件失败',
        relativePath: filePath,
        path: filePath,
        content: '',
        sizeBytes: 0,
        truncated: false,
      })
    }
  }

  async function openArtifactVersion(id, version, refTitle = '', label = '固定证据') {
    const requestedRef = refTitle || `${id}@v${version}`
    setPinnedPreview({ loading: true, error: '', object: null, requestedRef, label })
    try {
      const res = await fetchViewObjectVersion(sessionId, id, version)
      if (!res?.ok) throw new Error(res?.detail || '读取固定版本失败')
      setPinnedPreview({ loading: false, error: '', object: res, requestedRef, label })
    } catch (err) {
      setPinnedPreview({ loading: false, error: err?.message || String(err), object: null, requestedRef, label })
    }
  }

  async function handleTogglePin(obj, desiredPinned) {
    if (!obj?.type || !obj?.id || pinRequestRef.current) return
    const refStr = `${obj.type}:${obj.id}`
    const operation = { sessionId, refStr }
    pinRequestRef.current = operation
    setPinningRef(refStr)
    setPinFailure(null)
    const current = optimisticUserPins ?? (Array.isArray(snapshot?.userPinnedRefs) ? snapshot.userPinnedRefs : [])
    const shouldPin = desiredPinned ?? !current.includes(refStr)
    const nextLocal = shouldPin ? [...new Set([...current, refStr])] : current.filter((r) => r !== refStr)
    setOptimisticUserPins(nextLocal)
    try {
      // Absolute preferences make an explicit retry safe after a lost response.
      const res = await saveUserViewPreferences(sessionId, { pinnedRefs: nextLocal })
      if (pinRequestRef.current !== operation) return
      if (!res?.ok || !Array.isArray(res.userPinnedRefs)) throw new Error('未取得服务器保存结果')
      setOptimisticUserPins(res.userPinnedRefs)
      refresh()
    } catch (err) {
      if (pinRequestRef.current !== operation) return
      setOptimisticUserPins(null)
      setPinFailure({ object: obj, desiredPinned: shouldPin, message: `置顶保存未确认：${err.message}。已恢复最近同步的状态。` })
      refresh()
    } finally {
      if (pinRequestRef.current === operation) {
        pinRequestRef.current = null
        setPinningRef('')
      }
    }
  }

  function handleContainerScroll(e) {
    const el = e.currentTarget
    const top = el.scrollTop
    writeSessionViewState(sessionId, { scrollTop: top })
    const header = el.querySelector('header')
    if (header && header.getAttribute('data-compact') !== 'true') {
      const headerHeight = header.getBoundingClientRect().height
      if (headerHeight > 0) expandedHeroHeightRef.current = headerHeight
    }
    const nextCompact = computeNextHeroCompact({
      currentCompact: compactRef.current,
      scrollTop: top,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      expandedHeight: expandedHeroHeightRef.current,
      compactHeight: compactHeroHeightRef.current,
    })
    if (nextCompact !== compactRef.current) {
      compactRef.current = nextCompact
      setAttentionOpen(false)
      setCompact(nextCompact)
    }
  }

  if (!info || !snapshot) {
    return h('section', {
      className: 'concerto-surface concerto-team-view',
      'data-concerto-team-view': 'true',
      'data-conversation-composer-overlay': '',
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
  const planGate = snapshot.planGate
  const planBlocksDispatch = Boolean(planGate && planGate.status !== 'approved')
  const dispatchPaused = snapshot.paused === true
  const dispatchLimits = snapshot.dispatchLimits ?? {}
  async function command(path, input, onError = setActionError) {
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
      return true
    } catch (err) {
      onError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  function openRunLimits() {
    setRunLimitsError('')
    setRunLimitsOpen(true)
  }

  async function saveRunLimits(event) {
    event.preventDefault()
    setRunLimitsError('')
    const values = readDispatchLimitsForm(event.currentTarget)
    if (await command('/runs/dispatch-limits', { dispatchLimits: values }, setRunLimitsError)) setRunLimitsOpen(false)
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
  const taskAttentionCount = new Set(attentionItems.filter((item) => item.taskId).map((item) => item.taskId)).size
  const teamGoal = snapshot.metadata?.objective || snapshot.metadata?.goal || ''
  const briefing = parseCommanderBriefing(publicView.summary, stats, attentionItems, dispatchPaused)

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

  const kanbanMap = { pending: [], running: [], review: [], done: [] }
  for (const t of tasks) kanbanMap[bucketTaskColumn(t)].push(t)
  kanbanMap.running.sort((a, b) => Number(isTaskException(b)) - Number(isTaskException(a)))

  // Artifacts tab filters
  const filteredArtifacts = viewObjects.filter((o) => matchesArtifactFilters(o, artifactFilters))

  const drawerMember = drawerState.memberId
    ? members.find((m) => m.id === drawerState.memberId) || null
    : null
  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.taskId === selectedTaskId) || null
    : null

  const renderCountTag = (count) => count > 0 ? h('span', { className: 'concerto-tag concerto-num' }, String(count)) : null

  function renderTaskDetailModule(task, isDialog = false) {
    const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending
    const taskObjects = viewObjects.filter((o) => o.taskId === task.taskId)
    const taskReqViews = requiredViews.filter((v) => v.taskId === task.taskId)
    const taskEvents = events.filter((e) => e.taskId === task.taskId)
    const latestNote = task.blockedReason || task.progress?.at(-1)?.note || ''
    const execSettled = executions.some((e) => e.executionId === task.executionId && ['finished', 'stopped'].includes(e.state))
    const taskRequests = pending.filter((req) => req.taskId === task.taskId)
    const taskUnknownExecs = unknownExecs.filter((exec) => exec.taskId === task.taskId)
    const pendingTask = task.state === 'pending'
    const canUnblock = task.state === 'blocked' && !task.needsAdjudication && taskUnknownExecs.length === 0
    const previousInspector = inspectorStack.at(-1)

    return h('article', {
      key: task.taskId,
      ref: (el) => {
        if (el) taskRefs.current.set(task.taskId, el)
        else taskRefs.current.delete(task.taskId)
      },
      className: 'concerto-task-module' + (highlightTaskId === task.taskId ? ' concerto-task-highlight' : ''),
      'data-concerto-task-id': task.taskId,
      tabIndex: -1,
    },
    h('div', { className: 'concerto-task-summary' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: '1 1 240px' } },
        previousInspector && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--ghost',
          'aria-label': `返回 ${previousInspector.id}`,
          onClick: goInspectorBack,
        }, `← ${previousInspector.id}`),
        h('h3', null, task.title),
        h(StateChip, { status: task.viewState || task.state, text: meta.label }),
        task.memberId && h('button', {
          type: 'button',
          className: 'concerto-chip',
          onClick: () => openMemberDrawer(task.memberId, 'tasks'),
        }, task.memberId),
        h('span', { className: 'concerto-id', style: { color: 'var(--dsw-alias-label-tertiary)' } },
          task.taskId + ' · 第 ' + task.attempt + ' 次' + (latestNote ? ' · ' + latestNote.slice(0, 60) : ''))),
      h('button', {
        type: 'button',
        autoFocus: isDialog,
        className: 'concerto-btn concerto-btn--ghost concerto-btn--icon',
        'aria-label': `关闭任务详情：${task.title}`,
        title: '关闭任务详情',
        onClick: closeTaskInspector,
      }, h(UiIcon, { name: 'close' }))),

    (taskRequests.length > 0 || taskUnknownExecs.length > 0 || pendingTask || canUnblock || (task.state === 'review' && task.result)) && h('section', {
      className: 'concerto-inspector-actions',
      'aria-label': '任务操作',
    },
    taskRequests.map((req) => h(RequestCard, {
      key: req.requestId,
      item: req,
      bare: true,
      disabled: !canAct,
      onAnswer: (it, ans) => command('/requests/respond', { requestId: it.requestId, answer: ans }),
    })),
    taskUnknownExecs.map((exec) => h(AdjudicationCard, {
      key: exec.executionId,
      execution: exec,
      bare: true,
      disabled: !canAct,
      onSubmit: (input) => command('/executions/adjudicate', input),
    })),
    pendingTask && !task.raceGroup && members.filter((m) => m.roleKind === 'worker').length >= 2 && h(RaceLauncherBar, {
      sessionId,
      taskId: task.taskId,
      workers: members.filter((m) => m.roleKind === 'worker'),
      disabled: !canAct || planBlocksDispatch || dispatchPaused,
      onStarted: () => refresh(),
    }),
    canUnblock && h(UnblockTaskForm, {
      key: task.taskId,
      task,
      disabled: !canAct,
      onSubmit: (input) => command('/tasks/unblock', input),
    }),
    pendingTask && task.worktreeWarning && h('section', {
      className: 'concerto-acc-box',
      role: 'status',
      'aria-label': '工作区未提交变更提示',
      style: { width: '100%', fontSize: 'var(--cc-fs-caption)', borderColor: 'var(--cc-state-attention)' },
    },
    h('div', { style: { fontWeight: 'var(--cc-fw-strong)', color: 'var(--cc-state-attention)', marginBottom: 4 } },
      `源 Git 工作区存在未提交/未跟踪变更（已暂存 ${task.worktreeWarning.stagedCount ?? 0} · 已修改 ${task.worktreeWarning.unstagedCount ?? 0} · 未跟踪 ${task.worktreeWarning.untrackedCount ?? 0}）`),
    h('div', { style: { color: 'var(--cc-text-secondary)', marginBottom: 6, overflowWrap: 'anywhere' } },
      task.worktreeWarning.detail),
    Array.isArray(task.worktreeWarning.dirtyFiles) && task.worktreeWarning.dirtyFiles.length > 0 && h('div', { style: { color: 'var(--cc-text-muted)', marginBottom: 6, overflowWrap: 'anywhere' } },
      '涉及文件：',
      h('code', null, task.worktreeWarning.dirtyFiles.slice(0, 6).map((f) => f.path).join('、') +
        ((task.worktreeWarning.totalDirtyCount || 0) > 6 ? ` 等 ${task.worktreeWarning.totalDirtyCount} 项` : ''))),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
      h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--primary',
        disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
        onClick: () => command('/tasks/dispatch', { taskId: task.taskId, worktreeMode: 'isolated_clean', callerKind: 'ui' }),
      }, '按干净 Worktree 派发（不复制未提交文件）'),
      h('button', {
        type: 'button',
        className: 'concerto-btn',
        disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
        onClick: () => command('/tasks/dispatch', { taskId: task.taskId, worktreeMode: 'shared', callerKind: 'ui' }),
      }, '改用共享目录顺序派发'))),
    pendingTask && h('button', {
      type: 'button',
      className: 'concerto-btn',
      disabled: !canAct || taskUnknownExecs.length > 0,
      onClick: () => command('/tasks/cancel', { taskId: task.taskId }),
    }, '取消待派任务'),
    pendingTask && h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--primary',
      disabled: !canAct || dispatchPaused || planBlocksDispatch || Boolean(task.dispatchBudget?.blockedReason) || active.length > 0 || unknownExecs.length > 0,
      onClick: () => command('/tasks/dispatch', { taskId: task.taskId, callerKind: 'ui' }),
    }, '派发任务'),
    task.state === 'review' && task.result && !task.reviewPolicy?.requiresReview && h('p', {
      className: 'concerto-field-hint',
      style: { margin: '0 0 6px' },
    }, '普通任务由指挥者自动核验闭环，无需手动操作（你也可在此直接人工确认）：'),
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
        evidenceRefs: tk.result.artifactRefs ?? [],
      }),
    })),

    h('div', { className: 'concerto-task-inspector-body', style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--cc-border-subtle)' } },
      task.dispatchBudget && h('div', { style: { ...styles.muted, marginBottom: 8 } },
        `执行 ${task.dispatchBudget.attempts} / ${dispatchLimits.maxAttempts ?? '不限'} · 返工 ${task.dispatchBudget.reworks} / ${dispatchLimits.maxReworks ?? '不限'}`,
        task.dispatchBudget.blockedReason && info.roleKind === 'commander' && h('button', {
          type: 'button', className: 'concerto-link', disabled: !canAct, onClick: openRunLimits,
        }, '调整本次运行的上限')),
      h('div', { className: 'concerto-acc-cols' },
        h('div', { className: 'concerto-acc-box' },
          task.objective && h('p', { style: { marginTop: 0, fontSize: 'var(--cc-fs-meta)' } }, h('strong', null, '目标与边界：'), task.objective),
          Array.isArray(task.dependsOn) && task.dependsOn.length > 0 && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 6 } },
            h('strong', null, '前置依赖：'), h('span', { className: 'concerto-id' }, task.dependsOn.join('、'))),
          task.writeScope && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 6, overflowWrap: 'anywhere' } },
            h('strong', null, '写入范围：'), h('code', null, task.writeScope)),
          task.worktree && h(WorktreeActionBar, {
            sessionId,
            taskId: task.taskId,
            worktree: task.worktree,
            disabled: !canAct,
          }),
          !task.worktree && task.worktreeFallback && h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 6, overflowWrap: 'anywhere', color: 'var(--cc-text-muted)' } },
            h('strong', null, '工作区模式：'),
            `共享目录顺序执行（未启用 Git Worktree 基线 · ${task.worktreeFallback.reason}）`),
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
          })),
        Array.isArray(task.result.artifactRefs) && (() => {
          const fileRefs = task.result.artifactRefs.filter((r) => typeof r === 'string' && r.trim() && !/^(table|checklist|mindmap|diagram|board|html):|^event-|^view-/i.test(r.trim()))
          if (fileRefs.length === 0) return null
          return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' } },
            h('span', { className: 'concerto-group-label' }, '交付文件预览：'),
            fileRefs.map((ref) => h('button', {
              key: ref,
              type: 'button',
              className: 'concerto-chip',
              'data-concerto-file-preview': ref,
              onClick: () => openFilePreview(ref, task.taskId),
            }, `📄 ${ref}`)))
        })()),
      task.review && h('div', { style: { marginTop: 6, fontSize: 'var(--cc-fs-meta)' } },
        h('p', { style: { margin: 0 } },
          h('strong', null, '审查结论：'),
          label(task.review.verdict),
          task.review.reviewId ? ` (${task.review.reviewId})` : '',
          task.review.actor?.id ? ` · 审查者 ${task.review.actor.id}` : '',
          task.review.reason ? ' · ' + task.review.reason : ''),
        Array.isArray(task.review.pinnedObjectVersions) && task.review.pinnedObjectVersions.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, alignItems: 'center' } },
          h('span', { className: 'concerto-group-label' }, '固定证据版本：'),
          task.review.pinnedObjectVersions.map((pv) => h('button', {
            key: `pin-${pv.id}-v${pv.version}`,
            type: 'button',
            className: 'concerto-chip',
            'data-concerto-pinned-evidence': `${pv.id}@v${pv.version}`,
            title: `查看审查时刻固定的 ${pv.type}:${pv.id} v${pv.version}`,
            onClick: () => openArtifactVersion(pv.id, pv.version, `${pv.type}:${pv.id}@v${pv.version}`),
          }, `${pv.title || pv.id} `, h('span', { className: 'concerto-id' }, `v${pv.version} (固定)`), h(UiIcon, { name: 'expand' }))))),

      h(SharedAcceptanceChecklist, {
        key: task.taskId,
        task, taskObjects,
        canWrite: info.roleKind === 'commander',
        disabled: !canAct,
        onSave: (input, onError) => command('/view-objects/acceptance-checklist', input, onError),
        onOpenVersion: openArtifactVersion,
      }),
      h(TaskReviewFeedback, {
        key: `${task.taskId}:${task.result?.resultId ?? task.executionId ?? ''}`,
        task, taskObjects, executions,
        canWrite: info.roleKind === 'commander',
        disabled: !canAct,
        onSave: (input, onError) => command('/tasks/review-feedback', input, onError),
        onOpenVersion: openArtifactVersion,
      }),
      taskObjects.length > 0 && h('div', { style: { marginTop: 10 } },
        h('div', { className: 'concerto-group-label', style: { marginBottom: 6 } },
          '关联产物（点击前往成果页签查看当前版本）'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
          taskObjects.map((obj) => {
            const roleTag = obj.layer === 'review' || obj.roleKind === 'reviewer' ? '审查' : '任务'
            return h('button', {
              key: 'pill-' + obj.id,
              type: 'button',
              className: 'concerto-chip',
              'data-concerto-object-id': obj.id,
              'data-concerto-object-version': obj.version,
              title: `${obj.type}:${obj.id} · 作者 ${obj.authorId || '未知'}`,
              onClick: () => jumpToStageObject(obj),
            }, `[${roleTag}] ${obj.title || obj.id} · ${obj.authorId || ''} `, h('span', { className: 'concerto-id' }, `v${obj.version}`), ' ›')
          })))))
  }

  function renderHeroStatus() {
    const connection = error ? (compact ? '连接中断' : '连接中断 · 保留上次快照') : '实时同步'
    return h('span', {
      className: 'concerto-live-dot',
      'data-offline': error ? 'true' : undefined,
      role: 'status',
      title: '最后同步：' + new Date(snapshot.serverTime).toLocaleString(),
    }, connection, dispatchPaused && ' · 派发已暂停')
  }

  function renderPlanConfirmation() {
    if (!planGate?.planRef || snapshot.goalCompletion) return null
    const { planRef, proposalId, status, commanderWake } = planGate
    const label = `${planRef.title} v${planRef.version}`
    const message = status === 'pending' ? '等待确认开工'
      : status === 'stale' ? '计划已更新，等待指挥者提交新版本'
        : commanderWake === 'accepted' ? '已确认开工，续接消息已提交'
          : commanderWake === 'manual' ? '已确认开工，请在对话中手动继续' : '已确认开工'
    return h('section', { className: 'concerto-feedback concerto-plan-confirmation', 'data-state': status, 'aria-label': '开工计划' },
      h('span', { role: 'status' }, h('strong', null, label), ' · ', message),
      h('div', { className: 'concerto-plan-actions' },
        h('button', {
          type: 'button',
          className: 'concerto-btn',
          onClick: () => openArtifactVersion(planRef.id, planRef.version, label, '开工计划'),
        }, `查看计划 v${planRef.version}`),
        status === 'pending' && info.roleKind === 'commander' && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--primary',
          disabled: !canAct,
          onClick: () => command('/runs/approve-plan', { proposalId }),
        }, `确认开工 v${planRef.version}`),
        status === 'approved' && openView && h('button', {
          type: 'button',
          className: 'concerto-btn',
          onClick: () => openView('chat'),
        }, commanderWake === 'accepted' ? '查看指挥者对话' : '回到对话继续')))
  }

  function renderHeroActionsMenu() {
    return h('details', { className: 'concerto-hero-actions-menu' },
      h('summary', { className: 'concerto-btn concerto-btn--ghost concerto-btn--icon', 'aria-label': '更多团队操作', title: '更多团队操作' }, '⋯'),
      h('div', { className: 'concerto-hero-menu-list' },
        h('span', { className: 'concerto-tag concerto-id', title: '计划修订版本' }, `plan v${snapshot.planRevision}`),
        info.roleKind === 'commander' && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--ghost',
          disabled: !canAct,
          onClick: (event) => {
            const menu = event.currentTarget.closest('details')
            menu.open = false
            menu.querySelector('summary').focus()
            command('/runs/halt', { paused: !dispatchPaused })
          },
        }, dispatchPaused ? '恢复派发' : '暂停派发'),
        info.roleKind === 'commander' && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--ghost',
          disabled: !canAct,
          onClick: (event) => {
            const menu = event.currentTarget.closest('details')
            menu.open = false
            menu.querySelector('summary').focus()
            openRunLimits()
          },
        }, '派发次数限制'),
        h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--ghost',
          onClick: (event) => {
            event.currentTarget.closest('details')?.removeAttribute('open')
            refresh()
          },
        }, h(UiIcon, { name: 'refresh' }), '刷新快照'),
        openView && h('button', {
          type: 'button',
          className: 'concerto-btn concerto-btn--ghost',
          onClick: (event) => {
            event.currentTarget.closest('details')?.removeAttribute('open')
            openView('chat')
          },
        }, '查看对话')))
  }

  function renderPrimaryTabs(className = '') {
    return h('div', { className: `concerto-tabbar ${className}`.trim() },
      h(TabList, { id: tabsId, label: '团队工作区导航', value: activeTab, onChange: changeTab, tabs: [
        { value: 'overview', label: '概览' },
        { value: 'tasks', label: '任务', count: tasks.length, attentionCount: taskAttentionCount },
        { value: 'artifacts', label: '成果', count: viewObjects.length },
      ] }))
  }

  function renderAttentionControl() {
    if (actionableCount === 0) {
      return h('span', {
        className: 'concerto-quiet',
        'data-has-pending': 'false',
        'data-concerto-pending-badge': 'true',
      }, h(UiIcon, { name: 'check' }), ' 无待处理')
    }
    return h(AttentionPopover, {
      open: attentionOpen && actionableCount > 0,
      onClose: closeAttention,
      count: actionableCount,
      trigger: h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--attn concerto-num',
        'data-has-pending': 'true',
        'data-concerto-pending-badge': 'true',
        onClick: () => setAttentionOpen((open) => !open),
      }, `待处理 ${actionableCount}`, h('span', { className: 'concerto-pending-unit' }, '项')),
    }, h(AttentionContent, {
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
    }))
  }

  function renderBentoGroup(items, keyPrefix) {
    const preserveSize = []
    const sizes = items.map((item, idx) => {
      const obj = item.cardProps.object
      const renderer = item.cardProps.rendererOverride || obj?.renderer || DEFAULT_RENDERER[obj?.type]
      const graph = renderer === 'markmap' || renderer === 'svg'
      const preferred = obj && graph ? preferredRendererSize(obj, renderer, { fontSize: hostTheme.fontSize }) : ''
      preserveSize[idx] = Boolean(preferred)
      return preferred || (graph ? 'l' : item.effSize)
    })
    const spans = balanceBentoSpans(sizes, preserveSize)
    return h('div', { className: 'concerto-bento-grid' },
      items.map((item, idx) =>
        h('div', {
          key: keyPrefix + ':' + item.key,
          className: 'concerto-bento-item',
          'data-size': sizes[idx],
          style: { '--cc-span': String(spans[idx]) },
        }, h(StructuredObjectCard, {
          ...item.cardProps,
          sizeHint: sizes[idx],
          pinBusy: Boolean(pinningRef),
          isApprovedPlan: Boolean(planGate?.planRef?.id && item.cardProps.object?.id === planGate.planRef.id && planGate.status === 'approved'),
          goalCompleted: snapshot.goalCompletion?.state === 'completed',
        }))))
  }

  return h('section', {
    ref: containerRef,
    onScroll: handleContainerScroll,
    onPointerDown: (event) => {
      if (event.target.closest('.concerto-hero-actions-menu')) return
      event.currentTarget.querySelectorAll('.concerto-hero-actions-menu[open]').forEach((menu) => menu.removeAttribute('open'))
    },
    className: 'concerto-surface concerto-team-view',
    'data-concerto-team-view': 'true',
    'data-conversation-composer-overlay': '',
    'data-concerto-theme': effectiveTheme,
    style: hostTheme.cssVars,
    'aria-label': 'Concerto 团队主页',
  },

  // ① 常驻顶部（sticky + scroll compact）
  h('header', { className: 'concerto-hero', 'data-concerto-section': 'header', 'data-compact': compact ? 'true' : undefined },
    !compact && h(React.Fragment, null,
    h('div', { className: 'concerto-hero-top' },
      h('div', { className: 'concerto-hero-heading' },
        h('div', { className: 'concerto-hero-title' },
          h('h2', { title: info.teamName }, info.teamName),
          renderHeroStatus()),
        teamGoal && h('p', { className: 'concerto-hero-goal', title: teamGoal }, teamGoal)),
      h('div', { className: 'concerto-hero-actions' },
        renderAttentionControl(),
        renderHeroActionsMenu())),

    stats.total > 0 && h('div', { className: 'concerto-hero-status' },
    h('div', { className: 'concerto-progress-wrap' },
      h('div', { className: 'concerto-progress-bar', role: 'progressbar', 'aria-label': '团队任务总体进度', 'aria-valuemin': 0, 'aria-valuemax': stats.total, 'aria-valuenow': stats.done, 'aria-valuetext': `已完成 ${stats.done} / ${stats.total} 项` },
        stats.donePct > 0 && h('div', { className: 'concerto-seg-done', style: { width: stats.donePct + '%' } }),
        stats.reviewPct > 0 && h('div', { className: 'concerto-seg-review', style: { width: stats.reviewPct + '%' } }),
        stats.runPct > 0 && h('div', { className: 'concerto-seg-run', style: { width: stats.runPct + '%' } }),
        stats.blockPct > 0 && h('div', { className: 'concerto-seg-block', style: { width: stats.blockPct + '%' } })),
      h('span', { className: 'concerto-progress-label concerto-num' },
        '已完成 ',
        h('span', { className: 'concerto-kpi-accent' }, `${stats.done}/${stats.total}`))),
    h('ul', { className: 'concerto-hero-legend', 'aria-label': '任务状态图例' },
      [
        ['done', '完成', stats.done],
        ['running', '进行中', stats.run],
        ['review', '待验收', stats.review],
        ['blocked', '阻塞', stats.block],
        ['pending', '待派发', stats.pending],
      ].filter(([, , count]) => count > 0).map(([status, text, count]) => h('li', {
        key: status,
        className: 'concerto-legend-item',
        'data-status': status,
      }, text, ' ', h('b', null, String(count)))))),

    // 实时演奏乐团舞台（指挥者居中 + 发光协作连线 + 左执行者 / 右审查者）
    (() => {
      const renderSprite = (member) => {
        const st = memberState(snapshot, member)
        const count = pending.filter((r) => r.memberId === member.id).length
        const capInfo = capByMemberId.get(member.id)
        const capBadge = capInfo ? formatCapabilitySummary(capInfo).badge : ''
        const actLine = deriveMemberActivity(member, snapshot) || capInfo?.persona || capBadge
        return h(MemberSprite, {
          key: member.id,
          member,
          state: st,
          activityLine: actLine,
          count,
          selected: drawerState.memberId === member.id,
          onClick: () => openMemberDrawer(member.id, 'messages'),
        })
      }
      const cmdMember = members.find((m) => m.roleKind === 'commander') || null
      const workerMembers = members.filter((m) => m.roleKind === 'worker')
      const reviewerMembers = members.filter((m) => m.roleKind === 'reviewer')
      if (!cmdMember || (workerMembers.length === 0 && reviewerMembers.length === 0)) {
        return h('div', { className: 'concerto-roster-strip', 'data-concerto-section': 'roster', 'aria-label': '乐团成员' },
          members.map(renderSprite))
      }
      const workerActive = workerMembers.some((m) => ['running', 'waiting_input', 'waiting_approval'].includes(memberState(snapshot, m)))
      const reviewerActive = reviewerMembers.some((m) => ['running', 'review', 'waiting_input', 'waiting_approval'].includes(memberState(snapshot, m)))
        || tasks.some((t) => t.state === 'review')
      return h('div', { className: 'concerto-live-stage', 'data-concerto-section': 'roster', 'data-concerto-live-stage': 'true', 'aria-label': '乐团实时演奏舞台' },
        h('div', { className: 'concerto-live-stage-row' }, renderSprite(cmdMember)),
        h('svg', { className: 'concerto-live-stage-svg', viewBox: '0 0 400 30', preserveAspectRatio: 'none', 'aria-hidden': true },
          workerMembers.length > 0 && h('path', {
            className: 'concerto-stage-arc',
            'data-active': workerActive ? 'true' : undefined,
            d: reviewerMembers.length > 0 ? 'M 200 2 C 200 18, 100 12, 100 28' : 'M 200 2 L 200 28',
          }),
          reviewerMembers.length > 0 && h('path', {
            className: 'concerto-stage-arc',
            'data-active': reviewerActive ? 'true' : undefined,
            d: workerMembers.length > 0 ? 'M 200 2 C 200 18, 300 12, 300 28' : 'M 200 2 L 200 28',
          })),
        h('div', { className: 'concerto-live-stage-wings' },
          workerMembers.length > 0 && h('div', { className: 'concerto-live-stage-wing' }, workerMembers.map(renderSprite)),
          reviewerMembers.length > 0 && h('div', { className: 'concerto-live-stage-wing' }, reviewerMembers.map(renderSprite))))
    })(),

    renderPrimaryTabs()),
    compact && h('div', { className: 'concerto-hero-compact' },
      h('div', { className: 'concerto-hero-compact-title' },
        h('strong', { title: info.teamName }, info.teamName),
        renderHeroStatus()),
      h('div', { className: 'concerto-hero-compact-actions' },
        renderPrimaryTabs('concerto-compact-tabbar'),
        renderAttentionControl(),
        renderHeroActionsMenu(),
        h('div', { className: 'concerto-compact-roster', 'data-concerto-section': 'roster', 'aria-label': '乐团成员' },
          members.map((member) => h('button', {
            key: member.id,
            type: 'button',
            className: 'concerto-compact-member',
            'aria-label': `查看成员 ${member.id}`,
            'aria-pressed': drawerState.memberId === member.id,
            title: member.id,
            onClick: () => openMemberDrawer(member.id, 'messages'),
          }, h(MemberGlyph, { member, state: memberState(snapshot, member), size: 24 })))))),
    actionError && h('p', { role: 'alert', className: 'concerto-field-error' }, actionError),
    renderPlanConfirmation(),
    ['api', 'external'].includes(snapshot?.metadata?.commander?.source)
      ? h(NonHostedCommanderBar, {
          sessionId,
          commander: snapshot.metadata.commander,
          disabled: !canAct,
          onSent: () => refresh(),
        })
      : (!snapshot?.goalCompletion && h(LiveSuggestionBar, {
          sessionId,
          disabled: !canAct,
          onSent: () => refresh(),
        })),
    pinningRef && h('p', { role: 'status', className: 'concerto-quiet' }, '正在保存置顶…'),
    pinFailure && h('div', { role: 'alert', className: 'concerto-feedback' },
      h('span', null, pinFailure.message),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => handleTogglePin(pinFailure.object, pinFailure.desiredPinned) }, '重试保存'))),

  // ② 概览页签
  activeTab === 'overview' && h('div', { ...tabPanelProps(tabsId, 'overview'), className: 'concerto-tab-content', 'data-concerto-tabpanel': 'overview' },
    tasks.filter((t) => t.raceGroup?.role === 'parent').map((parentTask) => h(RaceCompareBoard, {
      key: parentTask.raceGroup.raceId,
      sessionId,
      parentTask,
      tasks,
      members,
      disabled: !canAct,
      onOpenFilePreview: openFilePreview,
      onPicked: () => refresh(),
    })),
    stats.total > 0 && unreadyCaps.length > 0 && h('div', { className: 'concerto-attn-card', 'data-concerto-capability-warning': 'true' },
      h('strong', null, `成员执行能力尚未就绪（${unreadyCaps.length}）`),
      h('div', { style: { fontSize: 'var(--cc-fs-meta)', color: 'var(--cc-text-secondary)' } },
        unreadyCaps.map((c) => `${c.memberId}: ${formatCapabilitySummary(c).summary}`).join('；') + '（请前往设置 → Concerto 生成并重载团队）')),
    stats.total === 0 && !planGate?.planRef && h('section', { 'aria-label': '新团队引导', 'data-concerto-section': 'briefing' },
      h('div', { className: 'concerto-empty-guide' },
        h('div', { className: 'concerto-section-title' }, h('h2', null, '从第一个团队目标开始')),
        h('p', null, info.goal || '告诉指挥者你要完成什么，团队会拆解任务、同步进展并提交结构化成果。'),
        h('p', { className: 'concerto-empty-guide-readiness' },
          `${members.length} 名成员 · ${unreadyCaps.length === 0 ? '执行能力已就绪' : `${unreadyCaps.length} 名成员能力尚未就绪`}`),
        h('div', { className: 'concerto-empty-guide-examples', 'aria-label': '目标示例' },
          ['拆解一次版本升级并验证结果', '协调成员完成接口契约与测试', '汇总风险、证据和下一步计划'].map((example) => h('span', { key: example, className: 'concerto-chip' }, example))),
        openView && h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', onClick: () => openView('chat') }, '前往底部输入框下达目标'))),
    stats.total > 0 && h('section', { 'aria-label': '指挥者简报', 'data-concerto-section': 'briefing' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('h2', null, '指挥者简报'),
          publicView.updatedBy && h('span', { className: 'concerto-tag' }, '由 ' + publicView.updatedBy + ' 维护'))),
      h('div', { className: 'concerto-briefing-grid', 'data-has-issues': actionableCount > 0 ? 'true' : 'false' },
        h('div', { className: 'concerto-briefing-cell' },
          h('div', { className: 'concerto-group-label' },
            '当前进展',
            actionableCount === 0 && h('span', { className: 'concerto-state-chip concerto-state-done' }, h(UiIcon, { name: 'check', size: 12 }), '无阻塞')),
          h(InlineTextWithRefs, { text: briefing.progress, onJumpObject: jumpToStageObject, viewObjects, onViewAllArtifacts: () => changeTab('artifacts') })),
        actionableCount > 0 && h('div', { className: 'concerto-briefing-cell', 'data-tone': 'attention' },
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

    stats.total > 0 && h('section', { 'aria-label': '重点任务', 'data-concerto-section': 'key-tasks' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('h2', null, '重点任务'),
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
              h('span', { className: 'concerto-key-task-main' },
                tk.memberId
                  ? h(MemberGlyph, { member: members.find((m) => m.id === tk.memberId) || { id: tk.memberId, roleKind: 'worker' }, state: tk.viewState || tk.state, size: 22 })
                  : h('span', { className: 'concerto-empty-avatar', 'aria-hidden': 'true' }),
                h('strong', null, tk.title),
                h('span', { className: 'concerto-key-task-member' }, tk.memberId || '待分配')),
              h('span', { className: 'concerto-key-task-side' },
                h(StateChip, { status: tk.viewState || tk.state, text: meta.label }),
                h('span', { className: 'concerto-id' }, tk.taskId)))
            }))),

    // 精选产物预览（等高与最后一行平衡填满）
    (viewObjects.length > 0 || stageSections.length > 0 || userPinObjs.length > 0) && h('section', { 'aria-label': '精选产物预览', 'data-concerto-section': 'stage' },
      h('div', { className: 'concerto-section-head' },
        h('div', { className: 'concerto-section-title' },
          h('h2', null, '精选产物预览'),
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

  // ③ 任务页签：固定看板，仅在看板下呈现用户展开的任务详情
  activeTab === 'tasks' && h('div', { ...tabPanelProps(tabsId, 'tasks'), className: 'concerto-tab-content', 'data-concerto-tabpanel': 'tasks' },
    jumpOrigin && h('div', { className: 'concerto-jump-banner', 'data-concerto-nav-banner': 'true' },
      h('span', null, `已定位到任务 ${jumpOrigin.targetLabel || ''}`),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: returnToJumpOrigin },
        jumpOrigin.memberId ? `← 返回 ${jumpOrigin.memberId}` : '← 返回概览')),

    h('div', { className: 'concerto-section-head', style: { marginBottom: 0 } },
      h('h2', { className: 'concerto-sr-only' }, '任务管理'),
      taskAttentionCount > 0 && h('button', {
        type: 'button',
        className: 'concerto-kanban-attention-summary',
        onClick: () => setAttentionOpen(true),
      }, `${taskAttentionCount} 项待处理${stats.block > 0 ? ` · ${stats.block} 项阻塞` : ''}`)),

    tasks.length === 0
      ? h(EmptyState, { icon: '🧭', text: '暂无任务，可通过底部输入框向指挥者提出目标。' })
      : h(React.Fragment, null,
          h('div', {
            className: 'concerto-task-workspace',
            'data-has-inspector': selectedTask && inspectorWide ? 'true' : undefined,
          },
          h('section', { 'aria-label': '团队进度看板', 'data-concerto-section': 'kanban' },
            h('nav', { className: 'concerto-board-jump', 'aria-label': '看板列跳转' },
              KANBAN_COLUMNS.map((col) => h('button', {
                key: col.id,
                type: 'button',
                className: 'concerto-board-jump-btn',
                'data-column': col.id,
                'aria-pressed': activeBoardColumn === col.id,
                onClick: () => {
                  setActiveBoardColumn(col.id)
                  boardColumnRefs.current.get(col.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                },
              }, `${col.title} ${kanbanMap[col.id].length}`))),
            h('div', {
              ref: boardScrollRef,
              className: 'concerto-board-cols',
              style: !(selectedTask && inspectorWide) ? {
                gridTemplateColumns: KANBAN_COLUMNS.map((col) => kanbanMap[col.id].length === 0 ? 'minmax(104px, 120px)' : 'minmax(0, 1fr)').join(' '),
              } : undefined,
              tabIndex: 0,
              role: 'region',
              'aria-label': '任务看板，窄窗口可横向滚动',
            },
              KANBAN_COLUMNS.map((col) => {
                const list = kanbanMap[col.id]
                return h('section', {
                  key: col.id,
                  ref: (element) => {
                    if (element) boardColumnRefs.current.set(col.id, element)
                    else boardColumnRefs.current.delete(col.id)
                  },
                  className: 'concerto-board-col',
                  'data-concerto-column': col.id,
                  'data-empty': list.length === 0 ? 'true' : undefined,
                },
                h('div', { className: 'concerto-board-col-head', 'data-state': col.id },
                  h('h3', null, `${col.title} ${list.length}`)),
                list.length === 0 && h('p', { className: 'concerto-board-empty' }, '暂无任务'),
                list.length > 0 && h('ol', { className: 'concerto-board-card-list', 'aria-label': `${col.title}，${list.length} 项` }, list.map((task) => {
                  const blocked = task.viewState === 'blocked' || task.viewState === 'failed' || task.state === 'failed' || Boolean(task.blockedReason)
                  const unknown = task.viewState === 'unknown'
                  const latestProgress = task.progress?.at(-1)
                  const line = task.blockedReason || latestProgress?.note || task.objective || ''
                  const timeLabel = relativeTimeLabel(latestProgress?.at, snapshot.serverTime)
                  const sourceLabel = latestProgress?.memberId && latestProgress.memberId !== task.memberId ? latestProgress.memberId : ''
                  const progressContext = [sourceLabel, timeLabel].filter(Boolean).join(' · ')
                  const member = members.find((m) => m.id === task.memberId)
                  const needsAttention = attentionItems.some((item) => item.taskId === task.taskId) || blocked || unknown
                  const meta = STATE_META[task.viewState] || STATE_META[task.state] || STATE_META.pending
                  return h('li', { key: task.taskId }, h('article', {
                    className: 'concerto-kcard',
                    'data-concerto-kanban-task': task.taskId,
                    'data-status': col.id,
                    'data-attention': needsAttention ? 'true' : undefined,
                    'data-selected': selectedTaskId === task.taskId ? 'true' : undefined,
                    'data-blocked': blocked ? 'true' : undefined,
                    'data-unknown': unknown ? 'true' : undefined,
                  },
                  h('h4', null,
                    h('button', {
                      ref: (el) => {
                        if (el) taskCardRefs.current.set(task.taskId, el)
                        else taskCardRefs.current.delete(task.taskId)
                      },
                      type: 'button',
                      className: 'concerto-kcard-title',
                      'aria-pressed': selectedTaskId === task.taskId,
                      onClick: () => jumpToTask(task.taskId),
                    }, task.title)),
                  line && col.id !== 'done' && h('p', { className: 'concerto-kcard-summary' }, line),
                  progressContext && col.id !== 'done' && h('span', { className: 'concerto-kcard-context' }, progressContext),
                  needsAttention && h('div', { className: 'concerto-kcard-action' },
                    h(StateChip, { status: task.viewState || task.state, text: meta.label }),
                    h('button', { type: 'button', className: 'concerto-link', onClick: () => jumpToTask(task.taskId) }, '去处理')),
                  task.dependsOn?.length > 0 && h('div', { className: 'concerto-kcard-deps', 'aria-label': '前置依赖' },
                    task.dependsOn.map((depId) => {
                      const dependency = tasks.find((item) => item.taskId === depId)
                      const satisfied = dependency?.state === 'completed'
                      return h('button', {
                        key: depId,
                        type: 'button',
                        className: 'concerto-dependency-chip concerto-id',
                        title: `前置依赖：${depId}${dependency?.title ? ` · ${dependency.title}` : ''}`,
                        onClick: () => jumpToTask(depId),
                      }, h(UiIcon, { name: satisfied ? 'check' : 'attention', size: 12 }), depId)
                    })),
                  h('footer', { className: 'concerto-kcard-foot' },
                    h('span', { className: 'concerto-kcard-member' },
                      task.memberId
                        ? h(MemberGlyph, {
                            member: member || { id: task.memberId, roleKind: 'worker' },
                            state: task.viewState || task.state,
                            size: 20,
                          })
                        : h('span', { className: 'concerto-empty-avatar', 'aria-hidden': 'true' }),
                      h('span', null, member?.name || task.memberId || '待分配')),
                    h('span', { className: 'concerto-id concerto-kcard-id' }, task.taskId))))
                })))
              }))),
            selectedTask && inspectorWide && h('aside', {
              className: 'concerto-task-inspector concerto-task-inspector--inline',
              'aria-label': `任务详情：${selectedTask.title}`,
              'data-concerto-section': 'tasks',
              onKeyDown: (event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  closeTaskInspector()
                }
              },
            }, renderTaskDetailModule(selectedTask))),
          selectedTask && !inspectorWide && h(TaskInspectorDialog, {
            key: selectedTask.taskId,
            title: selectedTask.title,
            onClose: closeTaskInspector,
          }, renderTaskDetailModule(selectedTask, true)))),

  // ④ 成果页签：筛选栏 + 必需视图清单（含建议补充）+ Bento 网格 + 返回入口
  activeTab === 'artifacts' && h('div', { ...tabPanelProps(tabsId, 'artifacts'), className: 'concerto-tab-content', 'data-concerto-tabpanel': 'artifacts' },
    jumpOrigin && !savedFilterBeforeJump && h('div', { className: 'concerto-jump-banner', 'data-concerto-nav-banner': 'true' },
      h('span', null, `已定位到产物 ${jumpOrigin.targetLabel || ''}`),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: returnToJumpOrigin },
        jumpOrigin.memberId ? `← 返回 ${jumpOrigin.memberId}` : '← 返回概览')),

    h('div', { className: 'concerto-section-head', style: { marginBottom: 0 } },
      h('div', { className: 'concerto-section-title' },
        h('h2', null, '全部结构化产物'),
        h('span', { className: 'concerto-tag concerto-num' }, `${filteredArtifacts.length} / ${viewObjects.length}`)),
      info.roleKind === 'commander' && h(ExcalidrawImport, {
        key: sessionId, sessionId, disabled: !canAct, viewObjects, refresh, onLocate: jumpToStageObject,
      })),

    requiredViews.length > 0 && h('div', { className: 'concerto-req-views', 'data-concerto-required-views': 'true' },
      suggestedMissing.length > 0 && h('div', { className: 'concerto-group-label' }, `必需视图检查（${suggestedMissing.length} 项建议补充未阻塞）`),
      h('div', { className: 'concerto-req-view-list' },
        requiredViews.map((rv) => h('span', {
          key: `${rv.taskId || 'team'}:${rv.type}:${rv.id}`,
          className: 'concerto-req-view-pill',
          'data-missing': rv.missing && rv.requiredForAcceptance ? 'true' : undefined,
          'data-suggested': rv.missing && !rv.requiredForAcceptance ? 'true' : undefined,
        },
        h('span', { className: 'concerto-id' }, `${rv.type}:${rv.id}`),
        ` · ${rv.missing ? (rv.requiredForAcceptance ? '验收必需·缺失' : '建议补充') : `v${rv.version || 1} 已就绪`}`)))),

    h('div', { className: 'concerto-filter-bar', 'data-concerto-artifact-filters': 'true' },
      h('label', null, '任务 ',
        h('select', {
          'aria-label': '按任务筛选产物',
          'data-filter': 'taskId',
          'data-active': artifactFilters.taskId !== 'all' ? 'true' : undefined,
          value: artifactFilters.taskId,
          onChange: (e) => updateFilters({ taskId: e.target.value }),
        },
        h('option', { value: 'all' }, '全部任务'),
        tasks.map((t) => h('option', { key: t.taskId, value: t.taskId }, `${t.taskId} · ${t.title}`)))),

      h('label', null, '成员 ',
        h('select', {
          'aria-label': '按成员筛选产物',
          'data-filter': 'memberId',
          'data-active': artifactFilters.memberId !== 'all' ? 'true' : undefined,
          value: artifactFilters.memberId,
          onChange: (e) => updateFilters({ memberId: e.target.value }),
        },
        h('option', { value: 'all' }, '全部成员'),
        members.map((m) => h('option', { key: m.id, value: m.id }, m.id)))),

      h('label', null, '类型 ',
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

  pinnedPreview && h(CanvasModal, {
    title: `${pinnedPreview.label}快照 · ${pinnedPreview.requestedRef}`,
    onClose: () => setPinnedPreview(null),
  },
  pinnedPreview.loading
    ? h('p', { style: styles.muted }, '正在读取固定版本快照…')
    : (pinnedPreview.error
      ? h('p', { role: 'alert', style: styles.error }, pinnedPreview.error)
      : h(StructuredObjectCard, {
          object: pinnedPreview.object,
          tasks,
          sessionId,
          badgeLabel: `${pinnedPreview.label} v${pinnedPreview.object?.version ?? ''}（当前最新 v${pinnedPreview.object?.latestVersion ?? ''}）`,
        }))),

  filePreview && h(InspectorDialog, { title: `文件预览 · ${filePreview.relativePath}`, onClose: () => setFilePreview(null) },
    h('div', { className: 'concerto-drawer-body', style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('code', { style: { fontSize: 'var(--cc-fs-code)', overflowWrap: 'anywhere' } }, filePreview.path),
        h('div', { style: { display: 'flex', gap: 6 } },
          h('button', {
            type: 'button',
            className: 'concerto-btn',
            onClick: () => { try { navigator.clipboard?.writeText?.(filePreview.path) } catch { /* ignore */ } },
          }, '复制路径'),
          h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => setFilePreview(null) }, '关闭'))),
      filePreview.loading && h('p', { className: 'concerto-quiet' }, '读取文件中…'),
      filePreview.error && h('p', { role: 'alert', className: 'concerto-field-error' }, filePreview.error),
      !filePreview.loading && !filePreview.error && h(React.Fragment, null,
        h('div', { className: 'concerto-quiet' }, `${filePreview.sizeBytes} 字节${filePreview.truncated ? '（仅显示前 48 KiB）' : ''}`),
        h('pre', { style: { margin: 0, maxHeight: '60vh', overflow: 'auto', padding: 12, borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-card-nested-bg)', fontFamily: 'var(--cc-font-mono)', fontSize: 'var(--cc-fs-code)', whiteSpace: 'pre-wrap' } }, filePreview.content)))),

  runLimitsOpen && h(InspectorDialog, { title: '本次运行的派发次数限制', onClose: () => setRunLimitsOpen(false) },
    h('form', { className: 'concerto-drawer-body', method: 'post', action: '/concerto/runs/dispatch-limits', onSubmit: saveRunLimits },
      h('h2', { className: 'concerto-dialog-title' }, '本次运行的派发次数限制'),
      h(DispatchLimitFields, { limits: dispatchLimits, disabled: busy }),
      runLimitsError && h('p', { role: 'alert', className: 'concerto-field-error' }, runLimitsError),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
        h('button', { type: 'submit', className: 'concerto-btn concerto-btn--primary', disabled: !canAct }, '保存上限'),
        h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => setRunLimitsOpen(false) }, '关闭')))),

  // 右侧滑出成员详情抽屉（按 memberId key 挂载以保证切换成员重置焦点）
  drawerMember && h(MemberDrawer, {
    key: drawerMember.id,
    member: drawerMember,
    state: memberState(snapshot, drawerMember),
    sessionId,
    snapshot,
    initialTab: drawerState.tab,
    canManageDuties: info.roleKind === 'commander',
    onClose: closeMemberDrawer,
    onJumpTask: jumpToTask,
    onOpenMember: (mid) => openMemberDrawer(mid, 'messages'),
    onJumpObject: jumpToStageObject,
    returnTaskId: inspectorStack.at(-1)?.id || '',
    onBack: goInspectorBack,
    isLight,
  }))
}

function NonHostedCommanderBar({ sessionId, commander, disabled = false, onSent }) {
  const [text, setText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [reply, setReply] = React.useState('')
  const [err, setErr] = React.useState('')

  const labelText = commander?.source === 'api'
    ? `自定义 API 指挥者（${commander.model || 'API'}）`
    : `外部 Agent 指挥者（${commander?.connector || 'external'}）`

  async function onSubmit(event) {
    event?.preventDefault?.()
    if (!text.trim() || sending || disabled) return
    setSending(true)
    setErr('')
    setReply('')
    try {
      const res = await request('/commander/prompt', {
        method: 'POST',
        body: JSON.stringify({ sessionId, prompt: text.trim() }),
      })
      setText('')
      if (res?.text) setReply(res.text)
      onSent?.()
    } catch (error) {
      setErr(error.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  return h('form', {
    className: 'concerto-attn-card',
    style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 },
    'data-concerto-nonhosted-commander-bar': 'true',
    onSubmit,
  },
  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
    h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, labelText),
    sending && h('span', { className: 'concerto-quiet' }, '指挥者执行中…')),
  h('div', { style: { display: 'flex', gap: 8 } },
    h('input', {
      className: 'concerto-input',
      style: { flex: 1 },
      disabled: disabled || sending,
      value: text,
      placeholder: '直接向外部/API 指挥者下达任务或追问…',
      onChange: (e) => setText(e.target.value),
    }),
    h('button', {
      type: 'submit',
      className: 'concerto-btn concerto-btn--primary',
      disabled: disabled || sending || !text.trim(),
    }, sending ? '执行中…' : '发送指令')),
  err && h('div', { role: 'alert', className: 'concerto-field-error' }, err),
  reply && h('div', { style: { fontSize: 'var(--cc-fs-meta)', whiteSpace: 'pre-wrap', color: 'var(--cc-text-secondary)' } }, reply))
}

function LiveSuggestionBar({ sessionId, disabled = false, onSent }) {
  const [text, setText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [notice, setNotice] = React.useState('')
  const [err, setErr] = React.useState('')

  async function onSubmit(event) {
    event?.preventDefault?.()
    if (!text.trim() || sending || disabled) return
    setSending(true)
    setErr('')
    setNotice('')
    try {
      await request('/runs/suggest', {
        method: 'POST',
        body: JSON.stringify({ sessionId, text: text.trim(), commandId: `suggest-${crypto.randomUUID()}` }),
      })
      setText('')
      setNotice('已发送给指挥者队列')
      onSent?.()
    } catch (error) {
      setErr(error.message || '发送建议失败')
    } finally {
      setSending(false)
    }
  }

  return h('form', {
    style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
    'data-concerto-live-suggestion-bar': 'true',
    onSubmit,
  },
  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
    h('input', {
      className: 'concerto-input',
      style: { flex: 1 },
      disabled: disabled || sending,
      value: text,
      'aria-label': '给运行中的指挥者提建议',
      placeholder: '团队运行中随时插话 / 给指挥者补充建议…',
      onChange: (e) => { setText(e.target.value); if (notice) setNotice('') },
    }),
    h('button', {
      type: 'submit',
      className: 'concerto-btn',
      disabled: disabled || sending || !text.trim(),
    }, sending ? '发送中…' : '提建议')),
  err && h('div', { role: 'alert', className: 'concerto-field-error' }, err),
  notice && h('div', { role: 'status', className: 'concerto-quiet' }, notice))
}

function WorktreeActionBar({ sessionId, taskId, worktree, disabled = false }) {
  const [busy, setBusy] = React.useState('')
  const [diffResult, setDiffResult] = React.useState(null)
  const [statusMsg, setStatusMsg] = React.useState('')
  const [errMsg, setErrMsg] = React.useState('')

  async function runAction(kind) {
    setBusy(kind)
    setErrMsg('')
    setStatusMsg('')
    try {
      const res = await request(`/worktree/${kind}`, {
        method: 'POST',
        body: JSON.stringify({ sessionId, taskId }),
      })
      if (kind === 'diff') {
        setDiffResult(res)
      } else if (kind === 'merge') {
        setStatusMsg(res.noop ? res.detail : `已合并到主分支（${String(res.mergedCommit || '').slice(0, 7)}）`)
      } else if (kind === 'cleanup') {
        setDiffResult(null)
        setStatusMsg('临时 Worktree 已清理')
      }
    } catch (error) {
      setErrMsg(error.message || '操作失败')
    } finally {
      setBusy('')
    }
  }

  return h('div', { style: { fontSize: 'var(--cc-fs-caption)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--cc-text-secondary)' }, 'data-concerto-worktree-actions': taskId },
    h('div', { style: { overflowWrap: 'anywhere' } },
      h('strong', null, 'Git Worktree 隔离：'),
      h('code', null, `${worktree.branch || ''} @ ${String(worktree.baseCommit || '').slice(0, 7)}${worktree.headCommit && worktree.headCommit !== worktree.baseCommit ? `..${String(worktree.headCommit).slice(0, 7)}` : ''}`),
      worktree.repositoryRoot && `（源仓库：${worktree.repositoryRoot}）`),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      h('button', { type: 'button', className: 'concerto-btn', disabled: disabled || Boolean(busy), onClick: () => runAction('diff') }, busy === 'diff' ? '读取中…' : '查看 Diff'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: disabled || Boolean(busy), onClick: () => runAction('merge') }, busy === 'merge' ? '合并中…' : '合并到主分支'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--danger', disabled: disabled || Boolean(busy), onClick: () => runAction('cleanup') }, busy === 'cleanup' ? '清理中…' : '清理 Worktree')),
    statusMsg && h('div', { role: 'status', className: 'concerto-quiet' }, statusMsg),
    errMsg && h('div', { role: 'alert', className: 'concerto-field-error' }, errMsg),
    diffResult && h('details', { open: true, className: 'concerto-set-fold' },
      h('summary', null, `Diff 预览${diffResult.untrackedFiles?.length ? `（含 ${diffResult.untrackedFiles.length} 个未跟踪文件）` : ''}`),
      diffResult.stat && h('pre', { style: { margin: '4px 0', whiteSpace: 'pre-wrap', fontFamily: 'var(--cc-font-mono)', fontSize: 'var(--cc-fs-code)' } }, diffResult.stat),
      h('pre', { style: { margin: '4px 0', maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'var(--cc-font-mono)', fontSize: 'var(--cc-fs-code)', padding: 8, borderRadius: 'var(--cc-radius-ctrl)', background: 'var(--cc-card-nested-bg)' } },
        diffResult.diff || (diffResult.untrackedFiles?.length ? `未跟踪文件：\n${diffResult.untrackedFiles.join('\n')}` : '无改动'))))
}

function RaceLauncherBar({ sessionId, taskId, workers = [], disabled = false, onStarted }) {
  const [open, setOpen] = React.useState(false)
  const [memberA, setMemberA] = React.useState(workers[0]?.id || '')
  const [memberB, setMemberB] = React.useState(workers[1]?.id || workers[0]?.id || '')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')

  async function onStart() {
    if (!memberA || !memberB || memberA === memberB) {
      setErr('请选择两位不同的执行者进行赛马')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await request('/tasks/race', {
        method: 'POST',
        body: JSON.stringify({ sessionId, taskId, memberA, memberB, commandId: `race-${taskId}-${crypto.randomUUID()}` }),
      })
      setOpen(false)
      onStarted?.()
    } catch (error) {
      setErr(error.message || '启动赛马失败')
    } finally {
      setBusy(false)
    }
  }

  return h('div', { className: 'concerto-acc-box', style: { width: '100%' }, 'data-concerto-race-launcher': taskId },
    !open
      ? h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: 'var(--cc-fs-meta)' } }, '🏁 想对比不同 Agent 的解法？可临时发起一次双解赛马（独立 Worktree 并行）。'),
          h('button', { type: 'button', className: 'concerto-btn', disabled, onClick: () => setOpen(true) }, '启动双解赛马 (A/B)'))
      : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, '🏁 选择两位参赛成员（各自独立 Worktree 并行执行）'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--cc-fs-caption)' } }, '方案 A',
              h('select', { className: 'concerto-input', disabled: busy, value: memberA, onChange: (e) => setMemberA(e.target.value) },
                workers.map((w) => h('option', { key: w.id, value: w.id }, `${w.id}${w.connector ? ` (${w.connector})` : ''}`)))),
            h('span', { className: 'concerto-quiet' }, 'VS'),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--cc-fs-caption)' } }, '方案 B',
              h('select', { className: 'concerto-input', disabled: busy, value: memberB, onChange: (e) => setMemberB(e.target.value) },
                workers.map((w) => h('option', { key: w.id, value: w.id }, `${w.id}${w.connector ? ` (${w.connector})` : ''}`)))),
            h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: busy || disabled, onClick: onStart }, busy ? '启动中…' : '开始赛马'),
            h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: busy, onClick: () => setOpen(false) }, '取消')),
          err && h('div', { role: 'alert', className: 'concerto-field-error' }, err)))
}

function RaceCompareBoard({ sessionId, parentTask, tasks = [], members = [], disabled = false, onOpenFilePreview, onPicked }) {
  const [busyId, setBusyId] = React.useState('')
  const [mergeWinner, setMergeWinner] = React.useState(false)
  const [err, setErr] = React.useState('')
  const race = parentTask.raceGroup
  const candidates = (race?.candidates ?? []).map((c) => ({
    ...c,
    task: tasks.find((t) => t.taskId === c.taskId) || null,
    member: members.find((m) => m.id === c.memberId) || { id: c.memberId, roleKind: 'worker' },
  }))

  async function pick(winnerTaskId) {
    setBusyId(winnerTaskId)
    setErr('')
    try {
      await request('/tasks/race/pick', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          raceId: race.raceId,
          winnerTaskId,
          mergeWinner,
          commandId: `race-pick-${race.raceId}-${winnerTaskId}`,
        }),
      })
      onPicked?.()
    } catch (error) {
      setErr(error.message || '采纳方案失败')
    } finally {
      setBusyId('')
    }
  }

  return h('section', { className: 'concerto-attn-card', style: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }, 'data-concerto-race-board': race.raceId },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('strong', null, `🏁 异构双解赛马 · ${parentTask.title}`),
      h('span', { className: 'concerto-chip' }, race.status === 'resolved' ? `已采纳胜者 ${race.winnerTaskId}` : '双方案并行对比中')),
    race.status !== 'resolved' && h('label', { className: 'concerto-set-check' },
      h('input', { type: 'checkbox', checked: mergeWinner, onChange: (e) => setMergeWinner(e.target.checked) }),
      h('span', null, '采纳时顺便将胜者的 Git Worktree 合并回主分支（未入选方案的临时目录会自动清理）')),
    h('div', { className: 'concerto-race-grid' },
      candidates.map(({ label: lbl, task: ct, member }) => {
        const isWinner = race.winnerTaskId === ct?.taskId
        const meta = STATE_META[ct?.viewState || ct?.state || 'pending'] || STATE_META.pending
        const fileRefs = Array.isArray(ct?.result?.artifactRefs)
          ? ct.result.artifactRefs.filter((r) => typeof r === 'string' && !/^(table|checklist|mindmap|diagram|board|html):|^event-|^view-/i.test(r))
          : []
        return h('div', { key: lbl, className: 'concerto-race-col', 'data-winner': isWinner ? 'true' : undefined },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              h(MemberGlyph, { member, state: ct?.state || 'idle', size: 28 }),
              h('strong', { style: { fontSize: 'var(--cc-fs-meta)' } }, `方案 ${lbl} · ${member.id}`)),
            h(StateChip, { status: ct?.viewState || ct?.state || 'pending', text: isWinner ? '🏆 已采纳' : meta.label })),
          ct?.result?.summary
            ? h('p', { style: { margin: 0, fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-secondary)', whiteSpace: 'pre-wrap' } }, ct.result.summary)
            : h('p', { style: { margin: 0, fontSize: 'var(--cc-fs-caption)', color: 'var(--cc-text-muted)' } }, '等待该成员提交结果…'),
          fileRefs.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
            fileRefs.map((ref) => h('button', { key: ref, type: 'button', className: 'concerto-chip', onClick: () => onOpenFilePreview?.(ref, ct.taskId) }, `📄 ${ref}`))),
          ct?.worktree && h(WorktreeActionBar, { sessionId, taskId: ct.taskId, worktree: ct.worktree, disabled }),
          race.status !== 'resolved' && ct && h('button', {
            type: 'button',
            className: 'concerto-btn concerto-btn--primary',
            disabled: disabled || Boolean(busyId) || ct.state === 'cancelled',
            onClick: () => pick(ct.taskId),
          }, busyId === ct.taskId ? '采纳中…' : `🏆 采纳方案 ${lbl}`))
      })),
    err && h('div', { role: 'alert', className: 'concerto-field-error' }, err))
}
