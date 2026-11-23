/**
 * 团队运行态（按会话隔离 + 可选持久化）。
 *
 * 每个团队运行（teamSessionId）一份状态；Host Session 通过绑定找到运行。
 * 团队配置保存在 teams.json，运行事实由独立的运行态存储维护。
 *
 * 设计：§7.3.1（决策契约）、§7.3.2（payload）、§7.0（Review 下限）、§7.7（按 teamSessionId 归属）
 */
import { createHash, randomUUID } from 'node:crypto'
import { closeSync, fstatSync, openSync, readSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { openRuntimeStorage } from './runtime_storage.mjs'
import { normalizeEventType } from './connector/contract.mjs'
import { inspectGitWorktreeDelivery, scopesOverlap, workspaceKey } from './workspace_scope.mjs'
import {
  validateDecisionPayload,
  checkModifyPrecondition,
  effectiveRequiresReview,
  resolvePolicyFloor,
  DECISION_ACTION,
} from './domain/decision_schema.mjs'
import { isTerminalTask, transitionExecution, transitionTask, taskViewState } from './domain/state_machine.mjs'
import { memberViewPublicationIssue, memberViewPatchIssue } from './domain/view_publication.mjs'
import { normalizeExcalidrawImport } from './domain/excalidraw_import.mjs'
import { dispatchBudget, validateDispatchLimits } from './domain/dispatch_limits.mjs'
import { PROJECT_CONTEXT_KINDS, isProjectViewObject, searchProjectEntries, viewObjectVersion } from './domain/project_context.mjs'
import {
  EXPERIENCE_KINDS, EXPERIENCE_LIMIT, experienceRecords, matchesObservedCommand,
  normalizeExperience, searchExperienceRecords, verifyReviewedExperiences,
} from './domain/project_experience.mjs'
import {
  WORKFLOW_SKILL_MAP,
  validateProjectSkillInput,
  hashSkillContent,
  checkSkillEligibility,
  listAvailableSkills,
  formatSkillReadPayload,
} from './domain/runtime_skills.mjs'
import {
  validateViewObjectInput,
  validatePublicViewPatch,
  normalizePublicView,
  applyViewObjectPatch,
  summarizeViewObject,
  sliceViewObjectData,
  projectViewObjectWithRuntimeState,
  evaluateRequiredViews,
  missingAcceptanceViewsForTask,
  normalizeRequiredViewEntry,
  reviewTargetItems,
  isSharedAcceptanceChecklist,
  isSharedTaskArtifact,
  matchesSharedArtifactChange,
  findMindmapNode,
} from './domain/view_objects.mjs'

const MAX_ACTIVITY_TEXT = 4000
const MAX_ACTIVITIES_PER_SESSION = 1000
const USER_PIN_REF_RE = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/
const FEEDBACK_VIEW_REF_RE = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})(?:@v?(\d+))?$/

function normalizeUserPinnedRefs(refs) {
  if (!Array.isArray(refs)) return []
  const seen = new Set()
  const out = []
  for (const item of refs) {
    const raw = typeof item === 'string'
      ? item.trim()
      : (item && typeof item === 'object' && item.type && item.id ? `${item.type}:${item.id}` : '')
    if (!USER_PIN_REF_RE.test(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
    if (out.length >= 24) break
  }
  return out
}

const fail = (code, detail) => ({ ok: false, code, ...(detail === undefined ? {} : { detail }) })
const dispatchPausedDetail = '团队已暂停新派发，请先恢复派发。'
const planApprovalRequired = '请先在团队页确认当前计划版本，再创建或派发任务。'

function workspaceArtifact(ref, cwd) {
  if (!cwd) return null
  const path = ref.startsWith('file:') ? ref.slice(5) : ref
  if (!path || path.includes('\0') || /^[a-z][a-z\d+.-]*:\/\//i.test(path)) return null
  let fd
  try {
    const root = realpathSync(cwd)
    const target = resolve(root, path)
    const requested = relative(root, target)
    if (isAbsolute(requested) || requested === '..' || requested.startsWith(`..${sep}`)) return null
    const file = realpathSync(target)
    const location = relative(root, file)
    if (!location || isAbsolute(location) || location === '..' || location.startsWith(`..${sep}`)) return null
    const located = statSync(file)
    if (!located.isFile()) return null
    fd = openSync(file, 'r')
    const before = fstatSync(fd)
    if (!before.isFile() || before.dev !== located.dev || before.ino !== located.ino) return null
    const hash = createHash('sha256'), buffer = Buffer.allocUnsafe(64 * 1024)
    for (let offset = 0; offset < before.size;) {
      const read = readSync(fd, buffer, 0, Math.min(buffer.length, before.size - offset), offset)
      if (read === 0) return null
      hash.update(buffer.subarray(0, read))
      offset += read
    }
    const after = fstatSync(fd)
    return before.size === after.size && before.mtimeMs === after.mtimeMs
      ? { kind: 'file', ref, location, bytes: before.size, sha256: hash.digest('hex') } : null
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'EINVAL', 'EBUSY', 'ELOOP', 'ENAMETOOLONG', 'EISDIR'].includes(error.code)) return null
    throw error
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

function normalizeTaskRequiredViewsStrict(rawList, taskId) {
  if (rawList === undefined) return { ok: true, items: [] }
  if (!Array.isArray(rawList)) return { ok: false, error: fail('invalid', 'requiredViews must be an array') }
  const items = []
  for (let i = 0; i < rawList.length; i += 1) {
    const raw = rawList[i]
    const norm = normalizeRequiredViewEntry(raw, {
      taskId,
      requiredForAcceptance: raw?.requiredForAcceptance === true,
      source: 'task',
    })
    if (!norm) {
      return { ok: false, error: fail('invalid', `requiredViews[${i}] must match (table|checklist|mindmap|diagram|board|html):<id>`) }
    }
    items.push(norm)
  }
  return { ok: true, items }
}

const sessionKey = (sessionId) => (typeof sessionId === 'string' && sessionId !== '' ? sessionId : '(unknown)')

export function createTeamRuntime({ policyRequiresReview = false, statePath = '' } = {}) {
  const storage = statePath ? openRuntimeStorage(statePath) : null
  /** @type {Map<string, {planRevision:number, counter:number, tasks:Map, decisions:Map}>} */
  const sessions = new Map()

  const managedDelivery = (state) => Boolean(state.metadata?.reviewPolicy || state.metadata?.requirePlanApproval)
  function baseReviewPolicy(state) {
    const bound = state.metadata?.reviewPolicy
    const profileFloor = policyRequiresReview === true
    const requiresReview = bound?.requiresReview === true || profileFloor
    return {
      version: bound ? `${bound.version}/dispatch-floor:${Number(requiresReview)}/profile-floor:${Number(profileFloor)}` : `profile:v1:${Number(profileFloor)}`,
      requiresReview,
    }
  }

  function frozenReviewPolicy(state, commanderRequiresReview, exemption) {
    const policy = baseReviewPolicy(state)
    const floor = resolvePolicyFloor(policy, exemption)
    return {
      version: policy.version, requiredByPolicy: policy.requiresReview, requiredByCommander: commanderRequiresReview === true,
      requiresReview: effectiveRequiresReview(floor.ok ? floor.requiresReview : policy.requiresReview, commanderRequiresReview),
      ...(exemption && floor.ok ? { exemption } : {}),
    }
  }
  /** Unique identity per host process boot so old PIDs are never naively trusted across restarts. */
  const hostBootId = randomUUID()
  /** 最近若干个工具激活判定的观测值（诊断用，最多 20 条；不持久化） */
  const activations = []
  let bindings = new Map()
  let projectSkills = new Map()
  let memberDuties = new Map()
  const eventSubscribers = new Set()
  let transactionOpen = false
  let migrated = false
  let lastPersistenceMs = null
  /** callId -> 结构化输出，仅供宿主诊断；客户端卡片直接读取宿主 toolview block。 */
  const structured = new Map()

  /** 记录一次工具的结构化输出（最多保留 200 条）。 */
  function recordStructured(teamId, callId, entry) {
    if (typeof callId !== 'string' || callId === '') return
    structured.set(callId, {
      teamId,
      tool: String(entry?.tool ?? ''),
      payload: entry?.payload ?? null,
      at: new Date().toISOString(),
    })
    if (structured.size > 200) {
      const oldest = structured.keys().next().value
      if (oldest !== undefined) structured.delete(oldest)
    }
  }

  function getStructured(callId) {
    return structured.get(String(callId)) ?? null
  }

  /** 最近的结构化输出列表（诊断用：核对 callId 是否与消息里的对得上）。 */
  function listStructured(limit = 20) {
    return [...structured.entries()].slice(-limit).map(([callId, entry]) => ({ callId, tool: entry.tool, teamId: entry.teamId, at: entry.at }))
  }

  // 首次使用允许文件不存在；损坏必须显式报错，不能抹掉协作事实。
  if (storage) {
    try {
      const loaded = storage.load()
      const parsed = loaded ? loaded.snapshot : { schemaVersion: 3, sessions: [] }
      if (!Array.isArray(parsed.sessions)) throw new Error('runtime.sessions must be an array')
      migrated = loaded?.needsMigration === true || parsed.schemaVersion !== 3
      bindings = new Map(parsed.bindings ?? [])
      memberDuties = new Map(parsed.memberDuties ?? [])
      if (Array.isArray(parsed.projectSkills)) {
        for (const [projId, entries] of parsed.projectSkills) {
          if (typeof projId !== 'string' || !Array.isArray(entries)) continue
          const skillMap = new Map()
          for (const entry of entries) {
            if (!entry || typeof entry.id !== 'string' || !Array.isArray(entry.versions)) continue
            skillMap.set(entry.id, {
              id: entry.id,
              projectId: projId,
              latestVersion: Number.isInteger(entry.latestVersion) ? entry.latestVersion : entry.versions.length,
              versions: new Map(entry.versions.map((v) => [v.version, v])),
            })
          }
          projectSkills.set(projId, skillMap)
        }
      }
      for (const record of parsed.sessions) {
        if (!record || typeof record.sessionId !== 'string') continue
        for (const event of [...(record.events ?? []), ...(record.tasks ?? []).flatMap((t) => t.events ?? [])]) {
          const type = normalizeEventType(event.type)
          if (type !== event.type) { event.originalType = event.type; event.type = type; migrated = true }
        }
        for (const execution of record.executions ?? []) {
          const dispatched = record.events?.find((e) => e.executionId === execution.executionId && e.type === 'execution.dispatched')
          execution.sandbox ??= dispatched?.payload?.sandbox ?? null
        }
        sessions.set(record.sessionId, {
          planRevision: Number.isInteger(record.planRevision) ? record.planRevision : 1,
          counter: Number.isInteger(record.counter) ? record.counter : 0,
          reviewCounter: Number.isInteger(record.reviewCounter) ? record.reviewCounter : 0,
          metadata: record.metadata ?? null,
          goalCompletion: record.goalCompletion ?? null,
          planApproval: record.planApproval ?? null,
          paused: record.paused === true,
          dispatchLimits: record.dispatchLimits ?? null,
          events: record.events ?? [],
          activities: Array.isArray(record.activities) ? record.activities : [],
          activitySeq: Number.isInteger(record.activitySeq) ? record.activitySeq : (Array.isArray(record.activities) ? record.activities.length : 0),
          executions: new Map((record.executions ?? []).map((e) => [e.executionId, e])),
          requests: new Map((record.requests ?? []).map((r) => [r.requestId, r])),
          commands: new Map(record.commands ?? []),
          tasks: new Map((record.tasks ?? []).map((t) => [t.taskId, t])),
          decisions: new Map((record.decisions ?? []).map((d) => [d.id, { hash: d.hash, planRevision: d.planRevision, result: d.result }])),
          viewObjects: new Map((record.viewObjects ?? []).map((o) => [o.id, o])),
          viewObjectHistory: new Map((record.viewObjectHistory ?? []).map(([id, versions]) => [id, versions])),
          loadedSkills: new Map((record.loadedSkills ?? []).map(([id, rec]) => [id, rec])),
          publicView: normalizePublicView(record.publicView),
          userPinnedRefs: normalizeUserPinnedRefs(record.userPinnedRefs),
        })
      }
    } catch (error) {
      throw new Error('Cannot load Concerto runtime', { cause: error })
    }
  }

  /** 原子写全量运行态。返回是否落盘成功。 */
  function persist() {
    if (!storage) return false
    if (transactionOpen) return true
    try {
      const data = {
        schemaVersion: 3,
        bindings: [...bindings],
        memberDuties: [...memberDuties],
        projectSkills: [...projectSkills.entries()].map(([projId, skillMap]) => [
          projId,
          [...skillMap.values()].map((entry) => ({
            id: entry.id,
            projectId: entry.projectId,
            latestVersion: entry.latestVersion,
            versions: [...entry.versions.values()],
          })),
        ]),
        sessions: [...sessions.entries()].map(([sessionId, s]) => ({
          sessionId,
          metadata: s.metadata,
          goalCompletion: s.goalCompletion,
          planApproval: s.planApproval,
          paused: s.paused,
          dispatchLimits: s.dispatchLimits,
          events: s.events,
          activities: s.activities ?? [],
          activitySeq: s.activitySeq ?? 0,
          executions: [...s.executions.values()],
          requests: [...s.requests.values()],
          commands: [...s.commands],
          planRevision: s.planRevision,
          counter: s.counter,
          reviewCounter: s.reviewCounter ?? 0,
          tasks: [...s.tasks.values()],
          decisions: [...s.decisions.entries()].map(([id, d]) => ({ id, hash: d.hash, planRevision: d.planRevision, result: d.result })),
          viewObjects: [...(s.viewObjects?.values() ?? [])],
          viewObjectHistory: [...(s.viewObjectHistory?.entries() ?? [])],
          loadedSkills: [...(s.loadedSkills?.entries() ?? [])],
          publicView: normalizePublicView(s.publicView),
          userPinnedRefs: normalizeUserPinnedRefs(s.userPinnedRefs),
        })),
      }
      storage.save(data)
      return true
    } catch (error) {
      throw new Error('Cannot persist Concerto runtime', { cause: error })
    }
  }

  function stateOf(sessionId) {
    const key = sessionKey(sessionId)
    let state = sessions.get(key)
    if (!state) {
      state = { metadata: null, goalCompletion: null, planApproval: null, paused: false, dispatchLimits: null, events: [], activities: [], activitySeq: 0, executions: new Map(), requests: new Map(), commands: new Map(), planRevision: 1, counter: 0, reviewCounter: 0, tasks: new Map(), decisions: new Map(), viewObjects: new Map(), viewObjectHistory: new Map(), loadedSkills: new Map(), publicView: normalizePublicView(null), userPinnedRefs: [] }
      sessions.set(key, state)
    }
    state.loadedSkills ??= new Map()
    return state
  }

  /** Record a visible, normalized per-member activity entry (§6.1). */
  function recordActivity(sessionId, entry) {
    if (!entry || !entry.memberId || !entry.kind) return null
    const state = stateOf(sessionId)
    state.activities ??= []
    state.activitySeq = (Number.isInteger(state.activitySeq) ? state.activitySeq : state.activities.length) + 1
    const seq = state.activitySeq
    const rawText = typeof entry.text === 'string' ? entry.text : ''
    const truncated = rawText.length > MAX_ACTIVITY_TEXT
    const item = {
      activityId: `act-${seq}`,
      seq,
      memberId: String(entry.memberId),
      kind: String(entry.kind),
      taskId: entry.taskId ?? null,
      executionId: entry.executionId ?? null,
      summary: String(entry.summary ?? rawText.slice(0, 120) ?? entry.kind),
      ...(rawText !== '' ? { text: truncated ? rawText.slice(0, MAX_ACTIVITY_TEXT) : rawText } : {}),
      ...(truncated ? { truncated: true, fullLength: rawText.length } : {}),
      ...(entry.detail !== undefined ? { detail: structuredClone(entry.detail) } : {}),
      ...(entry.artifactRef ? { artifactRef: String(entry.artifactRef) } : {}),
      recordedAt: entry.recordedAt || new Date().toISOString(),
    }
    state.activities.push(item)
    if (state.activities.length > MAX_ACTIVITIES_PER_SESSION) {
      state.activities.splice(0, state.activities.length - MAX_ACTIVITIES_PER_SESSION)
    }
    return item
  }

  /** Paginated query for per-member activity stream (§6.1). */
  function getMemberActivity(sessionId, { memberId = '', before = null, limit = 30 } = {}) {
    const state = stateOf(sessionId)
    const all = state.activities ?? []
    const clampedLimit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : Number.parseInt(limit, 10) || 30))
    const byMember = memberId ? all.filter((a) => a.memberId === memberId) : all
    const filtered = Number.isInteger(before) && before > 0 ? byMember.filter((a) => a.seq < before) : byMember
    const start = Math.max(0, filtered.length - clampedLimit)
    const items = filtered.slice(start)
    return {
      ok: true,
      memberId: memberId || null,
      items: structuredClone(items),
      hasMore: start > 0,
      nextBefore: items.length > 0 ? items[0].seq : null,
      total: byMember.length,
    }
  }

  /** Compute urgent user attention items from Runtime facts (§6.3). */
  function buildAttentionList(state, tasks) {
    const items = []
    for (const r of state.requests.values()) {
      if (!['pending', 'decided', 'delivery_failed'].includes(r.status)) continue
      const urgency = r.kind === 'approval' ? 1 : 2
      items.push({
        id: r.requestId,
        kind: r.kind,
        urgency,
        requestId: r.requestId,
        executionId: r.executionId,
        taskId: r.taskId,
        memberId: r.memberId,
        status: r.status,
        title: r.kind === 'approval'
          ? `审批 · ${r.memberId || '成员'} 请求执行命令`
          : `提问 · ${r.memberId || '成员'} 等待回答`,
        detail: r.payload?.command || r.payload?.reason || r.payload?.questions?.[0]?.question || '',
        payload: structuredClone(r.payload ?? {}),
        createdAt: r.createdAt,
      })
    }
    for (const ex of state.executions.values()) {
      if (ex.state !== 'unknown' || ex.quarantined) continue
      const task = state.tasks.get(ex.taskId)
      items.push({
        id: `unknown:${ex.executionId}`,
        kind: 'unknown',
        urgency: 3,
        executionId: ex.executionId,
        taskId: ex.taskId,
        memberId: ex.memberId,
        title: `未知执行 · ${ex.memberId || '成员'} 需要裁决`,
        detail: task?.title || ex.taskId,
        createdAt: ex.updatedAt || ex.createdAt,
      })
    }
    for (const t of tasks) {
      if (t.state === 'review') {
        items.push({
          id: `review:${t.taskId}`,
          kind: 'review',
          urgency: 4,
          taskId: t.taskId,
          executionId: t.executionId ?? null,
          resultId: t.result?.resultId ?? null,
          memberId: t.memberId ?? null,
          title: `待验收 · ${t.title}`,
          detail: t.result?.summary || '候选结果等待验收',
          createdAt: t.updatedAt,
        })
      } else {
        if (t.state === 'pending' && t.worktreeWarning) {
          items.push({
            id: `worktree-dirty:${t.taskId}`,
            kind: 'worktree_dirty',
            urgency: 5,
            taskId: t.taskId,
            title: `工作区含未提交变更 · ${t.title}`,
            detail: t.worktreeWarning.detail || '源 Git 工作区存在未提交/未跟踪文件，请选择隔离洁净检出或共享目录执行',
            worktreeWarning: structuredClone(t.worktreeWarning),
            createdAt: t.worktreeWarning.detectedAt || t.updatedAt,
          })
        }
        const limitReason = t.dispatchBudget.blockedReason
        if (!limitReason && t.state !== 'blocked' && t.state !== 'failed') continue
        const kind = t.state === 'failed' ? 'failed' : 'blocked'
        items.push({
          id: `${kind}:${t.taskId}`,
          kind,
          urgency: 5,
          taskId: t.taskId,
          executionId: t.executionId ?? null,
          memberId: t.memberId ?? null,
          title: `${kind === 'blocked' ? '阻塞' : '失败'} · ${t.title}`,
          detail: limitReason || t.blockedReason || '需要重新派发或解除阻塞',
          createdAt: t.updatedAt,
        })
      }
    }
    items.sort((a, b) => a.urgency - b.urgency || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
    return items
  }

  /** Small per-member preview (last 3 activities) for 256KB snapshot compliance (§6.1). */
  function buildMemberActivitySummary(state) {
    const grouped = {}
    for (const act of state.activities ?? []) {
      const list = grouped[act.memberId] || (grouped[act.memberId] = [])
      list.push({
        activityId: act.activityId,
        seq: act.seq,
        kind: act.kind,
        taskId: act.taskId,
        summary: act.summary,
        recordedAt: act.recordedAt,
      })
      if (list.length > 3) list.shift()
    }
    return grouped
  }

  /** 记录一次 when 判定，供 /concerto/probe 查看真实 preset 值。 */
  function noteActivation(entry) {
    activations.push(entry)
    if (activations.length > 20) activations.shift()
  }

  function getActivations() {
    return [...activations]
  }

  function dispatchLimitsOf(state) {
    const config = state.dispatchLimits ?? state.metadata?.dispatchLimits
    return { maxAttempts: config?.maxAttempts ?? null, maxReworks: config?.maxReworks ?? null }
  }

  function planGateOf(state) {
    if (!state.metadata?.requirePlanApproval) return null
    const proposal = state.planApproval
    if (!proposal) return { status: 'awaiting_plan' }
    const currentVersion = state.viewObjects.get(proposal.planRef.id)?.version
    const status = currentVersion !== proposal.planRef.version ? 'stale'
      : proposal.approvedAt ? 'approved' : 'pending'
    return { ...proposal, status, currentVersion }
  }

  function projectTaskBudget(state, task, limits) {
    const budget = dispatchBudget(task, limits)
    const activeExec = task.executionId ? state.executions.get(task.executionId) : null
    const viewState = taskViewState(task, activeExec)
    const writeScope = activeExec?.writeScope ?? task.writeScope ?? null
    const worktree = activeExec?.worktree ?? task.worktree ?? null
    const worktreeFallback = activeExec?.worktreeFallback ?? task.worktreeFallback ?? null
    return {
      ...task,
      writeScope,
      worktree: worktree ? structuredClone(worktree) : null,
      worktreeFallback: worktreeFallback ? structuredClone(worktreeFallback) : null,
      worktreeWarning: task.worktreeWarning ? structuredClone(task.worktreeWarning) : null,
      requiresReview: task.reviewPolicy?.requiresReview ?? frozenReviewPolicy(state, task.commanderRequiresReview ?? task.requiresReview, task.reviewExemption).requiresReview,
      dispatchBudget: budget,
      viewState: budget.blockedReason && viewState !== 'unknown' ? 'blocked' : viewState,
      blockedReason: budget.blockedReason ?? task.blockedReason ?? null,
    }
  }

  function getStatus(sessionId) {
    const state = stateOf(sessionId)
    const dispatchLimits = dispatchLimitsOf(state)
    const tasksList = [...state.tasks.values()].map((task) => projectTaskBudget(state, task, dispatchLimits))
    const executionsList = [...state.executions.values()].map((execution) => {
      const recoverableDelivery = unknownDelivery(state.tasks.get(execution.taskId), execution)
      return recoverableDelivery ? { ...execution, recoverableDelivery } : execution
    })
    const rawViewObjects = [...(state.viewObjects?.values() ?? [])]
    const viewObjects = rawViewObjects.map((o) => {
      const projected = projectViewObjectWithRuntimeState(o, tasksList, executionsList)
      if (!projected.layer) {
        projected.layer = projected.taskId ? (projected.roleKind === 'reviewer' ? 'review' : 'task') : 'team'
      }
      return projected
    })
    const { requiredViews, missingRequiredViews } = evaluateRequiredViews({
      teamRequiredViews: state.metadata?.requiredViews ?? [],
      tasks: tasksList,
      viewObjects: rawViewObjects,
    })
    return {
      serverTime: new Date().toISOString(),
      lastPersistenceMs,
      teamSessionId: sessionId,
      metadata: state.metadata,
      goalId: state.goalCompletion?.goalId ?? projectIdOf(sessionId, state),
      goalCompletion: state.goalCompletion,
      planGate: planGateOf(state),
      paused: state.paused,
      dispatchLimits,
      executions: executionsList,
      requests: [...state.requests.values()],
      attention: buildAttentionList(state, tasksList),
      memberActivitySummary: buildMemberActivitySummary(state),
      events: state.events.slice(-100),
      planRevision: latestPlanRevision(runsForProject(sessionId, state)),
      taskCount: state.tasks.size,
      tasks: tasksList.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        objective: t.objective ?? '',
        acceptance: t.acceptance ?? [],
        constraints: t.constraints ?? [],
        requiredViews: Array.isArray(t.requiredViews) ? t.requiredViews : [],
        state: t.state,
        attempt: t.attempt,
        dispatchBudget: t.dispatchBudget,
        assigneeRole: t.assigneeRole,
        requiresReview: t.requiresReview,
        reviewPolicy: t.reviewPolicy ?? null,
        ...(t.reviewExemption ? { reviewExemption: t.reviewExemption } : {}),
        reviewDispatch: t.reviewDispatch ?? null,
        executionId: t.executionId ?? null,
        memberId: t.memberId ?? null,
        viewState: t.viewState,
        progress: (t.progress ?? []).slice(-5),
        blockedReason: t.blockedReason,
        result: t.result,
        review: t.review ?? null,
        reviewFeedback: t.reviewFeedback ?? [],
        checklistChanges: checklistChangesForTask(state, t),
        deliveryHistory: (t.events ?? []).filter((event) => ['result.submitted', 'review.submitted'].includes(event.type)),
        ...(t.viewObjectVersions ? { viewObjectVersions: structuredClone(t.viewObjectVersions) } : {}),
        needsAdjudication: t.needsAdjudication === true,
        retryCwd: t.retryCwd ?? null,
        writeScope: t.writeScope ?? null,
        ...(t.worktree ? { worktree: t.worktree } : {}),
        ...(t.worktreeFallback ? { worktreeFallback: t.worktreeFallback } : {}),
        ...(t.worktreeWarning ? { worktreeWarning: t.worktreeWarning } : {}),
        updatedAt: t.updatedAt,
      })),
      viewObjects,
      requiredViews,
      missingRequiredViews,
      publicView: normalizePublicView(state.publicView),
      userPinnedRefs: normalizeUserPinnedRefs(state.userPinnedRefs),
    }
  }

  /** 已知会话的运行状态汇总（面板用）。 */
  function listSessions() {
    return [...sessions.keys()].map((sessionId) => ({ sessionId, ...getStatus(sessionId) }))
  }

  function checkGoalCompletion(sessionId, state, goalId) {
    const projectId = projectIdOf(sessionId, state)
    if (goalId !== projectId) return fail('not_found', 'goal not found in this team session')
    if (state.goalCompletion) return fail('precondition_failed', 'goal is already complete')
    if (state.tasks.size === 0) return fail('precondition_failed', 'goal has no tasks to close')

    for (const [scope, run] of runsForProject(sessionId, state)) {
      for (const task of run.tasks.values()) {
        if (task.needsAdjudication || !isTerminalTask(task.state)) {
          return fail('precondition_failed', `task ${scope}/${task.taskId} is unresolved (${task.state})`)
        }
      }
      for (const execution of run.executions.values()) {
        if (!['finished', 'stopped'].includes(execution.state)) {
          return fail('precondition_failed', `execution ${execution.executionId} is unresolved (${execution.state})`)
        }
      }
      for (const request of run.requests.values()) {
        if (['pending', 'decided'].includes(request.status)) {
          return fail('precondition_failed', `request ${request.requestId} is unresolved (${request.status})`)
        }
      }
    }
    return { ok: true }
  }

  function offerCloseoutSkill(scope, input, actor) {
    const state = stateOf(scope)
    const goal = state.goalCompletion
    if (!goal) return fail('precondition_failed', 'finish the goal before offering to save closeout experience')
    if (goal.skillOffer) return { ok: true, replayed: true, offer: goal.skillOffer }
    const { summary, sourceRefs } = input
    if (typeof summary !== 'string' || !summary.trim() || summary.length > 1200) {
      return fail('invalid', 'a closeout summary of up to 1200 characters is required')
    }
    if (!Array.isArray(sourceRefs) || sourceRefs.length < 1 || sourceRefs.length > 12 ||
        sourceRefs.some((ref) => typeof ref !== 'string' || !ref.trim() || ref.length > 240)) {
      return fail('invalid', 'provide 1 to 12 evidence references of up to 240 characters each')
    }
    const offer = {
      status: 'pending', summary: summary.trim(), sourceRefs: sourceRefs.map((ref) => ref.trim()),
      askedAt: new Date().toISOString(),
    }
    state.goalCompletion = { ...goal, skillOffer: offer }
    appendEvent(scope, 'goal.skill_offered', offer, actor)
    return { ok: true, offer }
  }

  function settleCloseoutSkill(scope, status, actor) {
    const state = stateOf(scope)
    const goal = state.goalCompletion
    if (goal?.skillOffer?.status !== 'pending') return fail('precondition_failed', 'there is no pending closeout Skill offer')
    const offer = { ...goal.skillOffer, status, resolvedAt: new Date().toISOString(), resolvedBy: actor }
    state.goalCompletion = { ...goal, skillOffer: offer }
    appendEvent(scope, 'goal.skill_offer_resolved', { status }, actor)
    return { ok: true, offer }
  }

  /**
   * 处理一次决策：幂等 → 计划版本 → 动作前置 → 校验 → 落库。
   * @param {{ decisionId: string, expectedPlanRevision: number, action: string, payload: object }} input
   * @param {string} sessionId 归属会话
   */
  function submit(input, sessionId, actor = { kind: 'runtime', id: 'concerto' }, canCancel = () => false) {
    const state = stateOf(sessionId)
    const { decisionId, expectedPlanRevision, action, payload } = input ?? {}
    if (typeof decisionId !== 'string' || decisionId === '') return fail('invalid', 'decisionId required')
    if (!Number.isInteger(expectedPlanRevision)) return fail('invalid', 'expectedPlanRevision must be an integer')
    if (typeof action !== 'string' || action === '') return fail('invalid', 'action required')
    if ([DECISION_ACTION.requestCancel, DECISION_ACTION.unblockTask].includes(action) &&
        (actor.kind !== 'member' || actor.role !== 'commander' || actor.id !== state.metadata?.commanderId)) {
      return fail('unauthorized', 'only the run Commander can perform this task action')
    }

    const hash = JSON.stringify({ action, payload })
    const seen = state.decisions.get(decisionId)
    if (seen) {
      if (seen.hash !== hash) return fail('idempotency_conflict', 'same decisionId with different content')
      return { ok: true, replayed: true, planRevision: seen.planRevision, result: seen.result }
    }

    const projectRuns = runsForProject(sessionId, state)
    if (projectRuns.some(([, run]) => run.decisions.has(decisionId))) {
      return fail('idempotency_conflict', 'decisionId already belongs to another run of this project')
    }
    const planRevision = latestPlanRevision(projectRuns)
    if (expectedPlanRevision !== planRevision) {
      return fail('stale', `expected ${expectedPlanRevision}, current ${planRevision}`)
    }

    if (!Object.values(DECISION_ACTION).includes(action)) {
      return fail('unsupported', `unknown action ${action}`)
    }

    const checked = validateDecisionPayload(action, payload)
    if (!checked.ok) return fail('invalid', checked.errors)

    state.planRevision = planRevision

    if (action === DECISION_ACTION.finishGoal) {
      const pre = checkGoalCompletion(sessionId, state, payload.goalId)
      if (!pre.ok) return pre
      const result = {
        goalId: payload.goalId,
        state: 'completed',
        summary: payload.summary,
        artifactRefs: [...(payload.artifactRefs ?? [])],
        planRevision: state.planRevision,
        finishedAt: new Date().toISOString(),
        actor: structuredClone(actor),
      }
      state.goalCompletion = result
      state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
      appendEvent(sessionId, 'goal.finished', result, actor)
      const persisted = persist()
      return { ok: true, replayed: false, planRevision: state.planRevision, result, persisted }
    }

    if (state.goalCompletion && action !== DECISION_ACTION.wait) {
      return fail('precondition_failed', 'goal is already complete')
    }

    if ([DECISION_ACTION.requestCancel, DECISION_ACTION.unblockTask].includes(action)) {
      const requested = action === DECISION_ACTION.requestCancel
        ? requestCancel(sessionId, payload.taskId, actor, payload, canCancel)
        : unblockTask(sessionId, payload, actor)
      if (!requested.ok) return requested
      const { ok, ...result } = requested
      state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
      const persisted = persist()
      return { ok: true, replayed: false, planRevision: state.planRevision, result, persisted }
    }

    if (action === DECISION_ACTION.proposePlan) {
      if (actor.kind !== 'member' || actor.role !== 'commander' || actor.id !== state.metadata?.commanderId) {
        return fail('unauthorized', 'only the run Commander can propose a plan')
      }
      if (!state.metadata.requirePlanApproval) return fail('precondition_failed', 'this run does not use plan approval')
      const plan = state.viewObjects.get(payload.planId)
      if (!plan || plan.roleKind !== 'commander' || plan.authorId !== actor.id || plan.layer !== 'team' || plan.semanticKind !== 'blueprint') {
        return fail('invalid', 'publish a team-level blueprint owned by the Commander before proposing it')
      }
      if (plan.version !== payload.planVersion) return fail('stale', `计划已更新到 v${plan.version}，请重新提交。`)
      const previousPlan = state.planApproval?.planRef
      if (previousPlan?.id !== plan.id || previousPlan.version !== plan.version) {
        state.planApproval = {
          proposalId: `plan-${randomUUID()}`,
          planRef: { type: plan.type, id: plan.id, title: plan.title, version: plan.version },
          proposedAt: new Date().toISOString(),
          proposedBy: actor,
        }
        state.planRevision += 1
        appendEvent(sessionId, 'plan.proposed', state.planApproval, actor)
      }
      const result = planGateOf(state)
      state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
      return { ok: true, replayed: false, planRevision: state.planRevision, result }
    }

    const gate = planGateOf(state)
    if (gate && gate.status !== 'approved' && [DECISION_ACTION.createTask, DECISION_ACTION.modifyTask].includes(action)) {
      return fail('precondition_failed', planApprovalRequired)
    }

    if (action === DECISION_ACTION.modifyTask) {
      const target = state.tasks.get(payload.taskId)
      if (!target) return fail('not_found', 'task not found')
      const pre = checkModifyPrecondition({ state: target.state, hasActiveExecution: Boolean(target.executionId) })
      if (!pre.ok) return fail('precondition_failed', pre.errors)
      const p = payload.patch
      let patchedRequiredViews
      if (p.requiredViews !== undefined) {
        const rv = normalizeTaskRequiredViewsStrict(p.requiredViews, target.taskId)
        if (!rv.ok) return rv.error
        patchedRequiredViews = rv.items
      }
      const { reviewExemption, ...rest } = target
      const updated = {
        ...rest,
        ...(p.title !== undefined ? { title: p.title } : {}),
        ...(p.objective !== undefined ? { objective: p.objective } : {}),
        ...(p.constraints !== undefined ? { constraints: p.constraints } : {}),
        ...(p.acceptance !== undefined ? { acceptance: p.acceptance } : {}),
        ...(p.dependsOn !== undefined ? { dependsOn: p.dependsOn } : {}),
        ...(p.assigneeRole !== undefined ? { assigneeRole: p.assigneeRole } : {}),
        ...(patchedRequiredViews !== undefined ? { requiredViews: patchedRequiredViews } : {}),
        updatedAt: new Date().toISOString(),
      }
      state.tasks.set(updated.taskId, updated)
      if (reviewExemption) appendEvent(sessionId, 'task.review_exemption_invalidated', { policyVersion: reviewExemption.policyVersion }, actor, updated.taskId)
      state.planRevision += 1
      const result = { taskId: updated.taskId, state: updated.state, planRevision: state.planRevision }
      state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
      const persisted = persist()
      return { ok: true, replayed: false, planRevision: state.planRevision, result, persisted }
    }

    if (action === DECISION_ACTION.wait) {
      const result = { waited: true, reason: payload.reason }
      state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
      if (state.metadata?.commanderId) {
        recordActivity(sessionId, {
          memberId: state.metadata.commanderId,
          kind: 'message',
          summary: `决策：暂缓创建任务（${payload.reason}）`,
          text: `submit_decision(wait): ${payload.reason}`,
          detail: { action: 'wait', reason: payload.reason, planRevision: state.planRevision },
        })
      }
      const persisted = persist()
      return { ok: true, replayed: false, planRevision: state.planRevision, result, persisted }
    }

    const taskId = `task-${state.counter + 1}`
    const rvChecked = normalizeTaskRequiredViewsStrict(payload.requiredViews, taskId)
    if (!rvChecked.ok) return rvChecked.error
    state.counter += 1
    const requiredViews = rvChecked.items
    const task = {
      taskId,
      title: payload.title,
      objective: payload.objective,
      constraints: payload.constraints,
      acceptance: payload.acceptance,
      dependsOn: payload.dependsOn,
      assigneeRole: payload.assigneeRole,
      requiredViews,
      commanderRequiresReview: payload.requiresReview === true,
      requiresReview: frozenReviewPolicy(state, payload.requiresReview).requiresReview,
      state: 'pending',
      attempt: 0,
      reworkCount: 0,
      progress: [],
      result: null,
      events: [],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    state.tasks.set(taskId, task)
    state.planRevision += 1

    if (state.metadata?.commanderId) {
      recordActivity(sessionId, {
        memberId: state.metadata.commanderId,
        kind: 'message',
        taskId,
        summary: `创建任务 ${taskId}：${payload.title}`,
        text: `submit_decision(create_task) → ${taskId}: ${payload.title}\n目标：${payload.objective}`,
        detail: { action: 'create_task', taskId, planRevision: state.planRevision },
      })
    }

    const result = { taskId, state: task.state, planRevision: state.planRevision }
    state.decisions.set(decisionId, { hash, planRevision: state.planRevision, result })
    const persisted = persist()
    return { ok: true, replayed: false, planRevision: state.planRevision, result, persisted }
  }

  /** 读取单个任务（授权成员用）。 */
  function getTask(input, sessionId, boundExecutionId) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')
    const limits = dispatchLimitsOf(state)
    const observations = [...experienceRecords(task.events ?? []).values()].filter((record) => record.targetExecutionId === task.executionId)
    return { ok: true, task: structuredClone({
      ...projectTaskBudget(state, task, limits), reviewFeedback: task.reviewFeedback ?? [],
      checklistChanges: checklistChangesForTask(state, task), dispatchLimits: limits,
      questions: [...state.requests.values()].filter((r) => r.taskId === task.taskId && r.kind === 'question' && r.executionId === (boundExecutionId ?? task.executionId)),
      ...(observations.length ? { experienceObservations: observations } : {}),
    }) }
  }

  function checklistChangesForTask(state, task) {
    const changes = task.checklistChanges ?? []
    const latest = new Map(changes.map((change) => [JSON.stringify([change.viewId, change.targetKind || 'item', change.itemId]), change.changeId]))
    return changes.map((change) => {
      const object = state.viewObjects.get(change.viewId)
      const viewType = change.viewType || object?.type || 'checklist'
      const current = latest.get(JSON.stringify([change.viewId, change.targetKind || 'item', change.itemId])) === change.changeId &&
        isSharedTaskArtifact(task, object) &&
        matchesSharedArtifactChange(object, change)
      return { ...change, viewType, current, currentVersion: current ? object.version : null }
    })
  }

  function readMemberTask(input, scope, binding) {
    const state = stateOf(scope)
    const task = state.tasks.get(input.taskId)
    if (!task || state.executions.get(binding.executionId)?.state !== 'running') return getTask(input, scope, binding.executionId)
    const unread = new Set(checklistChangesForTask(state, task)
      .filter((change) => change.current && !change.reads.some((read) => read.executionId === binding.executionId))
      .map((change) => change.changeId))
    if (unread.size === 0) return getTask(input, scope, binding.executionId)
    return transaction(() => {
      const at = new Date().toISOString()
      for (const change of task.checklistChanges) {
        if (unread.has(change.changeId)) {
          change.reads.push({ memberId: binding.memberId, executionId: binding.executionId, at })
        }
      }
      return getTask(input, scope, binding.executionId)
    })()
  }

  function commitSharedEdit(scope, state, task, object, data, changeFields, actor, eventType) {
    const version = object.version + 1
    const at = new Date().toISOString()
    const change = {
      changeId: `change-${randomUUID()}`,
      viewId: object.id,
      fromVersion: object.version,
      version,
      ...changeFields,
      author: actor,
      at,
      reads: [],
      reports: [],
    }
    task.checklistChanges = [...(task.checklistChanges ?? []), change]
    saveViewObjectVersion(state, { ...object, data, version, updatedBy: actor.id, updatedAt: at })
    appendEvent(scope, eventType, {
      changeId: change.changeId, id: object.id, viewType: object.type, targetKind: change.targetKind,
      itemId: change.itemId, fromVersion: object.version, version,
    }, actor, task.taskId, task.executionId)
    return { ok: true, version, change }
  }

  function editAcceptanceChecklist(scope, input = {}, actor) {
    if (actor.kind !== 'user') return fail('unauthorized', '仅用户可通过此入口编辑共编成果。')
    const { taskId, id, expectedVersion, commandId } = input
    const commandPayload = { type: 'edit_acceptance_checklist', ...input }
    delete commandPayload.commandId
    delete commandPayload.sessionId
    delete commandPayload.actor
    return command(scope, commandId, commandPayload, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      const object = state.viewObjects.get(id)
      if (!task || !isSharedTaskArtifact(task, object)) return fail('not_found', '未找到该任务可共编的验收清单或声明成果。')
      if (isTerminalTask(task.state)) return fail('precondition_failed', '此任务已结束。')

      if (object.type === 'checklist') {
        const { itemId, label } = input
        if (typeof label !== 'string' || !label.trim() || label.length > 500) return fail('invalid', '清单内容须为 1 到 500 字。')
        const matches = itemId === undefined ? [] : object.data.items.filter((item) => item.id === itemId)
        const item = matches[0]
        if (expectedVersion !== object.version) {
          return { ...fail('stale', `清单已更新到 v${object.version}。${item ? ` 当前条目：${item.label}` : ''}请核对新版后再保存。`),
            currentVersion: object.version, currentItem: item ?? null }
        }
        if (itemId !== undefined && matches.length !== 1) return fail('not_found', '未找到可唯一定位的清单条目。')
        const text = label.trim()
        if (item?.label === text) return { ok: true, version: object.version, unchanged: true }
        const entry = { id: item?.id ?? `item-${randomUUID()}`, label: text, checked: false }
        const patched = applyViewObjectPatch(object, { op: 'upsert_items', items: [entry] })
        if (!patched.ok) return patched
        return commitSharedEdit(scope, state, task, object, patched.data, {
          viewType: 'checklist', targetKind: 'item', itemId: entry.id,
          previousLabel: item?.label ?? null, label: text,
        }, actor, 'checklist.edited')
      }

      if (object.type === 'table') {
        const rows = Array.isArray(object.data?.rows) ? object.data.rows : []
        const cols = Array.isArray(object.data?.columns) ? object.data.columns : []
        if (Array.isArray(input.cells)) {
          if (input.cells.length !== cols.length) return fail('invalid', `新增行需要包含 ${cols.length} 列数据。`)
          const normalizedCells = []
          for (const cell of input.cells) {
            if (typeof cell === 'string') {
              if (cell.length > 500) return fail('invalid', '单元格内容不能超过 500 字。')
              normalizedCells.push(cell.trim())
            } else if ((typeof cell === 'number' && Number.isFinite(cell)) || typeof cell === 'boolean' || cell === null) {
              normalizedCells.push(cell)
            } else {
              return fail('invalid', '单元格只支持文本、数字、布尔值或空值。')
            }
          }
          if (normalizedCells.every((c) => c === null || String(c).trim() === '')) {
            return fail('invalid', '请至少填写一列内容后再新增行。')
          }
          if (expectedVersion !== object.version) {
            return { ...fail('stale', `表格已更新到 v${object.version}，请核对新版后再保存。`), currentVersion: object.version }
          }
          const patched = applyViewObjectPatch(object, { op: 'append_row', row: normalizedCells })
          if (!patched.ok) return patched
          const rowIndex = patched.data.rows.length - 1
          const rowKey = String(normalizedCells[0] ?? '')
          return commitSharedEdit(scope, state, task, object, patched.data, {
            viewType: 'table', targetKind: 'row', itemId: `row-${rowIndex + 1}`,
            rowIndex, rowKey, cells: normalizedCells, previousLabel: null,
            label: `新增第 ${rowIndex + 1} 行：${normalizedCells.map((c) => String(c ?? '')).join(' / ').slice(0, 200)}`,
          }, actor, 'shared_artifact.edited')
        }

        const column = typeof input.column === 'string' ? input.column : ''
        const colIdx = cols.indexOf(column)
        if (colIdx < 0) return fail('invalid', '请指定有效的表格列。')
        const rawVal = input.value !== undefined ? input.value : input.label
        let normalizedVal
        if (typeof rawVal === 'string') {
          if (!rawVal.trim() || rawVal.length > 500) return fail('invalid', '单元格内容须为 1 到 500 字。')
          normalizedVal = rawVal.trim()
        } else if ((typeof rawVal === 'number' && Number.isFinite(rawVal)) || typeof rawVal === 'boolean') {
          normalizedVal = rawVal
        } else {
          return fail('invalid', '单元格内容须为 1 到 500 字或有效标量。')
        }

        let resolvedRowIndex = -1
        if (Number.isInteger(input.rowIndex) && input.rowIndex >= 0 && input.rowIndex < rows.length) {
          resolvedRowIndex = input.rowIndex
        } else if (typeof input.rowKey === 'string' && input.rowKey.trim() !== '') {
          const matches = rows.flatMap((r, idx) => (String(r[0] ?? '') === input.rowKey.trim() ? [idx] : []))
          if (matches.length === 1) resolvedRowIndex = matches[0]
        }
        const row = resolvedRowIndex >= 0 ? rows[resolvedRowIndex] : null
        if (expectedVersion !== object.version) {
          return {
            ...fail('stale', `表格已更新到 v${object.version}。${row ? ` 当前行：${row.map((c) => String(c ?? '')).join(' / ')}` : ''}请核对新版后再保存。`),
            currentVersion: object.version, currentRow: row ? structuredClone(row) : null,
          }
        }
        if (!row) return fail('not_found', '未找到可唯一定位的表格行。')
        const oldVal = row[colIdx]
        if (String(oldVal ?? '') === String(normalizedVal)) return { ok: true, version: object.version, unchanged: true }
        const patched = applyViewObjectPatch(object, { op: 'update_cell', rowIndex: resolvedRowIndex, column, value: normalizedVal })
        if (!patched.ok) return patched
        const rowKey = String(patched.data.rows[resolvedRowIndex][0] ?? '')
        return commitSharedEdit(scope, state, task, object, patched.data, {
          viewType: 'table', targetKind: 'cell', itemId: `row-${resolvedRowIndex + 1}:${column}`,
          rowIndex: resolvedRowIndex, rowKey, column, value: normalizedVal,
          previousLabel: `${column}：${String(oldVal ?? '')}`,
          label: `第 ${resolvedRowIndex + 1} 行（${rowKey || `row-${resolvedRowIndex + 1}`}）· ${column}：${String(normalizedVal)}`,
        }, actor, 'shared_artifact.edited')
      }

      if (object.type === 'diagram' && input.targetKind === 'edge') {
        const from = typeof input.from === 'string' ? input.from.trim() : ''
        const to = typeof input.to === 'string' ? input.to.trim() : ''
        const rawLabel = input.label ?? ''
        if (!from || !to) return fail('invalid', '请指定图关系的起点与终点节点。')
        if (typeof rawLabel !== 'string' || rawLabel.length > 240) return fail('invalid', '关系说明不能超过 240 字。')
        const text = rawLabel.trim()
        const edgeKind = input.edgeKind
        if (edgeKind !== undefined && !['normal', 'critical', 'error'].includes(edgeKind)) {
          return fail('invalid', 'edgeKind 仅支持 normal | critical | error。')
        }
        const existingEdge = (object.data?.edges ?? []).find((e) => e.from === from && e.to === to) ?? null
        if (expectedVersion !== object.version) {
          return {
            ...fail('stale', `图表已更新到 v${object.version}。${existingEdge ? ` 当前关系：${from} → ${to}${existingEdge.label ? `（${existingEdge.label}）` : ''}` : ''}请核对新版后再保存。`),
            currentVersion: object.version, currentItem: existingEdge ? structuredClone(existingEdge) : null,
          }
        }
        const nodeIds = new Set((object.data?.nodes ?? []).map((n) => n.id))
        if (!nodeIds.has(from) || !nodeIds.has(to)) return fail('not_found', '图关系引用的节点不存在。')
        if (existingEdge && String(existingEdge.label ?? '') === text && (!edgeKind || (existingEdge.kind || 'normal') === edgeKind)) {
          return { ok: true, version: object.version, unchanged: true }
        }
        const patched = applyViewObjectPatch(object, {
          op: 'upsert_elements',
          edges: [{ ...(existingEdge || {}), from, to, label: text, ...(edgeKind ? { kind: edgeKind } : {}) }],
        })
        if (!patched.ok) return patched
        return commitSharedEdit(scope, state, task, object, patched.data, {
          viewType: 'diagram', targetKind: 'edge', itemId: `${from}->${to}`,
          from, to, edgeLabel: text, ...(edgeKind ? { edgeKind } : {}),
          previousLabel: existingEdge ? `${from} → ${to}${existingEdge.label ? `：${existingEdge.label}` : ''}` : null,
          label: `${from} → ${to}${text ? `：${text}` : ''}`,
        }, actor, 'shared_artifact.edited')
      }

      const { itemId, label } = input
      if (typeof label !== 'string' || !label.trim() || label.length > 500) {
        return fail('invalid', '节点名称须为 1 到 500 字。')
      }
      const text = label.trim()
      const existingNode = object.type === 'diagram'
        ? ((itemId === undefined ? [] : object.data.nodes.filter((n) => n.id === itemId))[0] ?? null)
        : (itemId === undefined ? null : findMindmapNode(object.data.root, itemId))
      if (expectedVersion !== object.version) {
        return {
          ...fail('stale', `图表已更新到 v${object.version}。${existingNode ? ` 当前节点：${existingNode.label}` : ''}请核对新版后再保存。`),
          currentVersion: object.version, currentItem: existingNode ? structuredClone(existingNode) : null,
        }
      }
      if (itemId !== undefined && !existingNode) return fail('not_found', '未找到可唯一定位的图节点。')
      if (existingNode?.label === text) return { ok: true, version: object.version, unchanged: true }
      const nodeId = existingNode?.id ?? (typeof input.newNodeId === 'string' && input.newNodeId.trim() ? input.newNodeId.trim() : `node-${randomUUID().slice(0, 8)}`)
      let patched
      if (object.type === 'diagram') {
        patched = applyViewObjectPatch(object, { op: 'upsert_elements', nodes: [{ ...(existingNode || {}), id: nodeId, label: text }] })
      } else {
        const parentId = typeof input.parentId === 'string' && input.parentId.trim() ? input.parentId.trim() : object.data.root.id
        if (!existingNode && !findMindmapNode(object.data.root, parentId)) {
          return fail('not_found', `未找到父节点 "${parentId}"。`)
        }
        patched = applyViewObjectPatch(object, existingNode
          ? { op: 'upsert_node', node: { id: nodeId, label: text } }
          : { op: 'upsert_node', parentId, node: { id: nodeId, label: text } })
      }
      if (!patched.ok) return patched
      return commitSharedEdit(scope, state, task, object, patched.data, {
        viewType: object.type, targetKind: 'node', itemId: nodeId,
        previousLabel: existingNode?.label ?? null, label: text,
      }, actor, 'shared_artifact.edited')
    })
  }

  function resolveFeedbackView(state, task, ref) {
    const match = FEEDBACK_VIEW_REF_RE.exec(ref)
    if (!match) return fail('invalid', '成果引用格式应为 type:id@vN。')
    const [, type, id, rawVersion] = match
    const current = state.viewObjects.get(id)
    const version = rawVersion === undefined ? current?.version : Number(rawVersion)
    const obj = current?.version === version ? current : state.viewObjectHistory.get(id)?.find((item) => item.version === version)
    if (!obj || obj.type !== type || obj.taskId !== task.taskId) return fail('not_found', `当前任务没有此成果版本：${ref}`)
    return { ok: true, object: obj, ref: { type, id, version, title: obj.title } }
  }

  function resolveRevisionEvidence(state, task, refs) {
    if (!Array.isArray(refs) || refs.length === 0 || refs.some((ref) => typeof ref !== 'string' || !ref.trim())) {
      return fail('invalid', '请附上修订的成果或验证证据。')
    }
    const evidence = []
    for (const raw of refs) {
      const ref = raw.trim()
      if (FEEDBACK_VIEW_REF_RE.test(ref)) {
        const view = resolveFeedbackView(state, task, ref)
        if (!view.ok) return view
        evidence.push({ artifact: view.ref })
      } else {
        evidence.push({ ref })
      }
    }
    return { ok: true, evidence }
  }

  function bindExperienceEvidence(state, task, executionId, observation) {
    const events = (task.events ?? []).filter((event) => event.executionId &&
      (event.executionId === executionId || event.executionId === task.executionId))
    const evidenceRefs = []
    const boundRefs = []
    let proof
    for (const inputRef of observation.evidenceRefs) {
      let ref = inputRef
      if (ref === 'native_command' || ref.startsWith('event:')) {
        const event = ref === 'native_command'
          ? events.findLast((candidate) => matchesObservedCommand(candidate, observation))
          : events.find((candidate) => `event:${candidate.eventId}` === ref)
        if (!event) return fail('not_found', 'experience evidence event not found for this execution')
        ref = `event:${event.eventId}`
        boundRefs.push(ref)
        if (matchesObservedCommand(event, observation)) {
          proof = { kind: 'native_command', eventId: event.eventId, exitCode: event.payload.exitCode }
        }
      } else if (ref.startsWith('result:')) {
        if (!task.result || `result:${task.result.resultId}` !== ref || task.result.executionId !== task.executionId) {
          return fail('not_found', 'experience evidence result not found for this execution')
        }
        boundRefs.push(ref)
      } else if (FEEDBACK_VIEW_REF_RE.test(ref)) {
        const resolved = resolveFeedbackView(state, task, ref)
        if (!resolved.ok) return resolved
        const { id, type, version } = resolved.ref
        const sourceExecutionId = resolved.object.executionId
        if (sourceExecutionId && sourceExecutionId !== executionId && sourceExecutionId !== task.executionId) {
          return fail('not_found', 'experience evidence artifact not found for this execution')
        }
        ref = `${type}:${id}@v${version}`
        boundRefs.push(ref)
        const saved = state.viewObjectHistory.get(id)?.find((object) => object.version === version)
        if (saved) saved.pinned = true
      }
      evidenceRefs.push(ref)
    }
    return { ok: true, evidenceRefs: [...new Set(evidenceRefs)], boundRefs: [...new Set(boundRefs)], proof }
  }

  function reviewFeedback(scope, input, actor) {
    const { action, taskId, feedbackId, expectedVersion, commandId } = input
    if (!['create', 'reply', 'close', 'reopen'].includes(action)) return fail('invalid', '未知的审查意见操作。')
    const reviewActor = actor.kind === 'user' || actor.role === 'reviewer'
    const workerReply = actor.role === 'worker' && action === 'reply'
    if (!reviewActor && !workerReply) return fail('unauthorized', '此角色不能执行该审查意见操作。')
    return command(scope, commandId, { type: 'review_feedback', actor, input }, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      if (!task) return fail('not_found', '未找到任务。')
      if (actor.kind === 'member' && state.executions.get(actor.executionId)?.state !== 'running') {
        return fail('stale', '此成员执行已不在运行。')
      }
      const at = new Date().toISOString()
      const text = typeof input.text === 'string' ? input.text.trim() : ''
      if (['create', 'reply'].includes(action) && (!text || text.length > MAX_ACTIVITY_TEXT)) {
        return fail('invalid', '请输入 1 到 4000 字的内容。')
      }
      const feedback = task.reviewFeedback ?? []
      if (action === 'create') {
        const executionId = task.result?.executionId ?? task.executionId ?? null
        const resultId = task.result?.resultId ?? null
        if ((input.targetExecutionId ?? null) !== executionId || (input.targetResultId ?? null) !== resultId) {
          return fail('stale', '任务交付已更新，请刷新后重新选择目标。')
        }
        const target = { executionId, resultId }
        if (input.targetRef !== undefined) {
          const view = resolveFeedbackView(state, task, input.targetRef)
          if (!view.ok) return view
          target.artifact = view.ref
          if (input.itemId !== undefined) {
            const items = reviewTargetItems(view.object).filter(({ id }) => id === input.itemId)
            if (items.length !== 1) return fail('invalid', '所选版本中没有可唯一定位的条目。')
            target.artifact.itemId = items[0].id
            target.artifact.itemLabel = items[0].label
          }
        } else if (input.itemId !== undefined) {
          return fail('invalid', '指定条目前请先选择成果版本。')
        }
        const thread = { feedbackId: `feedback-${randomUUID()}`, target, text, author: actor, status: 'open', version: 1, createdAt: at, updates: [] }
        task.reviewFeedback = [...feedback, thread]
        appendEvent(scope, 'review.feedback_created', { feedbackId: thread.feedbackId }, actor, taskId, executionId)
        return { ok: true, feedback: thread }
      }

      const thread = feedback.find((item) => item.feedbackId === feedbackId)
      if (!thread) return fail('not_found', '未找到审查意见。')
      if (thread.version !== expectedVersion) return fail('stale', '意见已有更新，请刷新后再处理。')
      const update = { action, author: actor, at }
      if (action === 'reply' && thread.status !== 'closed') {
        const checked = resolveRevisionEvidence(state, task, input.evidenceRefs)
        if (!checked.ok) return checked
        update.text = text
        if (task.result?.executionId === actor.executionId && task.result?.resultId) update.resultId = task.result.resultId
        update.evidence = checked.evidence
        thread.status = 'replied'
      } else if (action === 'close' && thread.status !== 'closed') {
        thread.status = 'closed'
      } else if (action === 'reopen' && thread.status === 'closed') {
        thread.status = 'open'
      } else {
        return fail('precondition_failed', '意见状态已变更，请刷新后处理。')
      }
      thread.version += 1
      thread.updates.push({ ...update, version: thread.version })
      appendEvent(scope, `review.feedback_${action}`, { feedbackId, version: thread.version }, actor, taskId, actor.executionId ?? task.executionId)
      return { ok: true, feedback: thread }
    })
  }

  /** 汇报进度：只记录，不改变任务状态（阻塞原因一并记录）。 */
  function reportProgress(input, sessionId, actor = null) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')
    const at = new Date().toISOString()
    const note = input?.note ?? ''
    task.progress = [...(task.progress ?? []), { note, at, memberId: actor?.id || task.memberId }]
    task.updatedAt = at
    if (typeof input?.blockedReason === 'string' && input.blockedReason !== '') task.blockedReason = input.blockedReason
    const memberId = actor?.id || task.memberId
    if (memberId && (note || input?.blockedReason)) {
      recordActivity(sessionId, {
        memberId,
        kind: 'progress',
        taskId: task.taskId,
        executionId: input?.executionId ?? task.executionId ?? null,
        summary: note || input.blockedReason,
        text: note || input.blockedReason,
      })
    }
    const persisted = persist()
    return { ok: true, taskId: task.taskId, state: task.state, progressCount: task.progress.length, persisted }
  }

  function verifyResultDelivery(state, task, refs, actor, coeditedRefs = new Set()) {
    const execution = state.executions.get(task.executionId)
    if (!execution || execution.taskId !== task.taskId ||
        (actor?.kind === 'member' && (actor.role !== 'worker' || actor.id !== execution.memberId))) {
      return fail('unauthorized', 'result must come from the current worker execution')
    }
    if (refs.some((ref) => typeof ref !== 'string' || !ref.trim())) return fail('invalid', 'artifactRefs must contain non-empty references')
    const currentWorkerView = (view) => view?.taskId === task.taskId && view.executionId === execution.executionId &&
      view.roleKind === 'worker' && (view.authorId === execution.memberId || view.updatedBy === execution.memberId)
    const sharedView = (view) => isProjectViewObject(view) && view.roleKind === 'commander' && view.authorId === state.metadata?.commanderId
    const sharedCoeditedView = (view) => Boolean(view && isSharedTaskArtifact(task, view) && coeditedRefs.has(`${view.type}:${view.id}@v${view.version}`))
    const evidence = new Map()
    const addView = (view) => {
      const ref = `${view.type}:${view.id}@v${view.version}`
      evidence.set(ref, { kind: 'view', ref, id: view.id, version: view.version, authorId: view.authorId, updatedBy: view.updatedBy, executionId: view.executionId ?? null })
    }
    const specs = evaluateRequiredViews({ teamRequiredViews: state.metadata?.requiredViews, tasks: [task] }).requiredViews
    for (const spec of specs.filter((entry) => entry.requiredForAcceptance)) {
      const view = state.viewObjects.get(spec.id)
      if (view?.type !== spec.type || !(currentWorkerView(view) || (!spec.taskId && sharedView(view)) || sharedCoeditedView(view))) {
        return fail('precondition_failed', `missing required acceptance view objects with current provenance: ${spec.type}:${spec.id}`)
      }
      addView(view)
    }
    const cwd = execution.writeScope || state.metadata?.cwd
    for (const raw of refs) {
      const ref = raw.trim()
      const match = FEEDBACK_VIEW_REF_RE.exec(ref)
      const view = match ? viewObjectVersion(state, match[2], match[3] === undefined ? undefined : Number(match[3])) : state.viewObjects.get(ref)
      if (view || match) {
        if (!(currentWorkerView(view) || sharedView(view) || sharedCoeditedView(view)) || (match && view.type !== match[1])) {
          return fail('precondition_failed', `artifact version is unavailable for this delivery: ${ref}`)
        }
        addView(view)
      } else if (ref.startsWith('event:')) {
        const event = task.events.find((entry) => entry.executionId === execution.executionId && `event:${entry.eventId}` === ref &&
          ['command.completed', 'file.changed'].includes(entry.type))
        if (!event) return fail('precondition_failed', `evidence event does not belong to this execution: ${ref}`)
        evidence.set(ref, { kind: 'event', ref, executionId: execution.executionId })
      } else {
        const file = workspaceArtifact(ref, cwd)
        if (!file) return fail('precondition_failed', `delivery file is unavailable in the execution workspace: ${ref}`)
        evidence.set(ref, file)
      }
    }
    const worktree = execution.worktree ? inspectGitWorktreeDelivery(execution.worktree) : null
    if (worktree) execution.worktree = worktree
    return {
      ok: true,
      delivery: {
        executionId: execution.executionId,
        memberId: execution.memberId,
        evidence: [...evidence.values()],
        ...(worktree ? { worktree: structuredClone(worktree) } : {}),
      },
    }
  }

  /**
   * 提交结果：pending 任务由审计入口先经过 startExecution。
   * requiresReview 由任务决定，检查结果由调用方给证据。
   */
  function submitResult(input, sessionId, actor) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')

    const reported = []
    if (input.checklistEvidence !== undefined) {
      if (!Array.isArray(input.checklistEvidence)) return fail('invalid', 'checklistEvidence must be an array')
      if (input.checklistEvidence.length && (actor?.kind !== 'member' || actor.role !== 'worker')) {
        return fail('unauthorized', '仅当前任务成员可以提交共编成果验证证据。')
      }
      const changes = checklistChangesForTask(state, task)
      const seen = new Set()
      for (const inputCheck of input.checklistEvidence) {
        const change = changes.find(({ changeId }) => changeId === inputCheck?.changeId)
        if (!change?.current || inputCheck.version !== change.currentVersion) return fail('stale', '共编成果或条目已更新，请先读取新版。')
        if (seen.has(change.changeId)) return fail('invalid', '同一条共编改动只能提交一组证据。')
        if (!change.reads.some((read) => read.executionId === task.executionId && read.memberId === actor.id)) {
          return fail('precondition_failed', '请先用 get_task 读取这条共编变更。')
        }
        const checked = resolveRevisionEvidence(state, task, inputCheck.evidenceRefs)
        if (!checked.ok) return checked
        const viewType = state.viewObjects.get(change.viewId)?.type ?? change.viewType ?? 'checklist'
        reported.push({ changeId: change.changeId, viewId: change.viewId, viewType, version: inputCheck.version, evidence: checked.evidence })
        seen.add(change.changeId)
      }
    }

    const moved = transitionTask(task, {
      type: 'result_submitted',
      requiresReview: task.requiresReview === true || input?.needsReview === true,
      basicChecksPassed: input?.checksPassed === true,
      reason: input?.blockReason,
    })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    if (input.artifactRefs !== undefined && !Array.isArray(input.artifactRefs)) return fail('invalid', 'artifactRefs must be an array')
    const artifactRefs = input.artifactRefs ?? []
    const coeditedRefs = new Set(reported.map((report) => `${report.viewType || 'checklist'}:${report.viewId}@v${report.version}`))
    const refs = [...new Set([...coeditedRefs, ...artifactRefs])]
    const checked = managedDelivery(state) ? verifyResultDelivery(state, task, refs, actor, coeditedRefs) : null
    if (checked && !checked.ok) return checked
    if (moved.next === 'completed') {
      const missingViews = missingAcceptanceViewsForTask(task, [...(state.viewObjects?.values() ?? [])], state.metadata?.requiredViews ?? [])
      if (missingViews.length > 0) {
        return fail('precondition_failed', `missing required acceptance view objects: ${missingViews.map((v) => `${v.type}:${v.id}`).join(', ')}`)
      }
    }

    const at = new Date().toISOString()
    const normalizedFeedback = Array.isArray(input?.skillFeedback)
      ? input.skillFeedback
          .filter((f) => f && typeof f.id === 'string' && f.id.trim() !== '')
          .map((f) => ({
            id: f.id.trim(),
            ...(Number.isInteger(f.version) ? { version: f.version } : {}),
            outcome: ['used', 'not_needed', 'issue'].includes(f.outcome) ? f.outcome : 'used',
            ...(typeof f.note === 'string' && f.note.trim() ? { note: f.note.trim().slice(0, 500) } : {}),
            status: 'member_reported',
            reportedAt: at,
          }))
      : []
    if (normalizedFeedback.length > 0 && task.executionId) {
      const exec = state.executions.get(task.executionId)
      if (exec) exec.skillFeedback = normalizedFeedback
    }
    const activeExec = task.executionId ? state.executions.get(task.executionId) : null
    if (!checked && activeExec?.worktree) {
      activeExec.worktree = inspectGitWorktreeDelivery(activeExec.worktree)
    }
    const deliveryWorktree = checked?.delivery?.worktree ?? (activeExec?.worktree ? structuredClone(activeExec.worktree) : null)
    const updated = {
      ...task,
      state: moved.next,
      ...(deliveryWorktree ? { worktree: structuredClone(deliveryWorktree) } : {}),
      reviewDispatch: null,
      blockedReason: moved.next === 'blocked' ? (input?.blockReason ?? 'acceptance not verified') : null,
      result: {
        resultId: `result-${randomUUID()}`,
        executionId: task.executionId ?? null,
        summary: input?.summary ?? '',
        artifactRefs: checked ? checked.delivery.evidence.map((entry) => entry.ref) : refs,
        ...(checked ? { delivery: checked.delivery } : {}),
        ...(deliveryWorktree ? { worktree: structuredClone(deliveryWorktree) } : {}),
        ...(normalizedFeedback.length > 0 ? { skillFeedback: normalizedFeedback } : {}),
        ...(reported.length > 0 ? { checklistEvidence: reported } : {}),
        at,
      },
      updatedAt: at,
    }
    for (const report of reported) {
      const change = task.checklistChanges.find(({ changeId }) => changeId === report.changeId)
      change.reports.push({
        ...report, memberId: actor.id, executionId: task.executionId, resultId: updated.result.resultId, at,
      })
    }
    state.tasks.set(task.taskId, updated)
    if (task.memberId) {
      recordActivity(sessionId, {
        memberId: task.memberId,
        kind: 'result',
        taskId: task.taskId,
        executionId: task.executionId ?? null,
        summary: `提交结果：${(updated.result.summary || '').slice(0, 90)}`,
        text: updated.result.summary,
        detail: { state: updated.state, artifactRefs: updated.result.artifactRefs },
      })
    }
    const persisted = persist()
    return { ok: true, taskId: task.taskId, state: updated.state, attempt: task.attempt, persisted }
  }

  function collectPinnedReviewVersions(state, task, evidenceRefs, includeTaskObjects = true) {
    const pinnedList = []
    const pinnedIds = new Set()
    const versionMap = { ...(task.viewObjectVersions ?? {}) }
    const pinObj = (obj) => {
      if (!obj || typeof obj.id !== 'string') return
      if (pinnedIds.has(obj.id)) return
      pinnedIds.add(obj.id)
      versionMap[obj.id] = obj.version
      pinnedList.push({
        id: obj.id,
        type: obj.type,
        version: obj.version,
        authorId: obj.authorId,
        title: obj.title,
      })
      const hist = state.viewObjectHistory?.get(obj.id)
      if (Array.isArray(hist)) {
        const hit = hist.find((h) => h.version === obj.version)
        if (hit) hit.pinned = true
      }
    }
    for (const ref of evidenceRefs) {
      if (typeof ref !== 'string') continue
      const m = /^(?:(table|checklist|mindmap|diagram|board|html):)?([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})(?:@v?(\d+))?$/.exec(ref.trim())
      if (!m) continue
      const explicitType = m[1] || null
      const objId = m[2]
      const reqVer = m[3] ? Number.parseInt(m[3], 10) : null
      if (reqVer !== null) {
        const hist = state.viewObjectHistory?.get(objId) ?? []
        const hit = hist.find((h) => h.version === reqVer)
        if (!hit) {
          return { ok: false, error: fail('not_found', `evidence view object "${objId}" version ${reqVer} not found`) }
        }
        if (explicitType && hit.type !== explicitType) {
          return { ok: false, error: fail('invalid', `evidence view object "${objId}@v${reqVer}" has type "${hit.type}", expected "${explicitType}"`) }
        }
        pinObj(hit)
      } else {
        const cur = state.viewObjects?.get(objId)
        if (explicitType && !cur) {
          return { ok: false, error: fail('not_found', `evidence view object "${explicitType}:${objId}" not found`) }
        }
        if (explicitType && cur && cur.type !== explicitType) {
          return { ok: false, error: fail('invalid', `evidence view object "${objId}" has type "${cur.type}", expected "${explicitType}"`) }
        }
        if (cur) pinObj(cur)
      }
    }
    if (includeTaskObjects) {
      for (const obj of state.viewObjects?.values() ?? []) {
        if (obj.taskId === task.taskId && !pinnedIds.has(obj.id)) pinObj(obj)
      }
    }
    return { ok: true, pinnedList, versionMap }
  }

  function recordReviewSkillAcceptance(state, task, verdict, reviewId, evidenceRefs, at) {
    if (!task?.executionId) return
    const exec = state.executions.get(task.executionId)
    if (!exec || !Array.isArray(exec.skillDeliveries) || exec.skillDeliveries.length === 0) return
    exec.skillAcceptanceEvidence = {
      status: verdict === 'pass' ? 'verified_with_task_acceptance' : 'review_failed',
      ...(reviewId ? { reviewId } : {}),
      verdict,
      evidenceRefs,
      verifiedAt: at,
    }
    for (const del of exec.skillDeliveries) {
      del.acceptanceStatus = exec.skillAcceptanceEvidence.status
      if (reviewId) del.reviewId = reviewId
      del.verifiedAt = at
    }
  }

  function checkPinnedDelivery(state, task) {
    const { delivery } = task.result
    const worker = state.executions.get(task.executionId)
    if (!delivery || !worker || delivery.executionId !== worker.executionId || delivery.memberId !== worker.memberId) {
      return fail('precondition_failed', 'a verified structured delivery is required')
    }
    for (const entry of delivery.evidence) {
      if (entry.kind === 'file' && workspaceArtifact(entry.ref, worker.writeScope || state.metadata?.cwd)?.sha256 !== entry.sha256) {
        return fail('precondition_failed', `delivery file changed or is no longer readable: ${entry.ref}`)
      }
      if (entry.kind === 'view' && !viewObjectVersion(state, entry.id, entry.version)) {
        return fail('precondition_failed', `pinned delivery artifact is no longer readable: ${entry.ref}`)
      }
    }
    return { ok: true }
  }

  function unknownDelivery(task, execution) {
    if (execution.state !== 'unknown' || execution.quarantined || execution.kind === 'review' || !task?.needsAdjudication ||
        !['running', 'review'].includes(task.state) || task.executionId !== execution.executionId ||
        task.result?.executionId !== execution.executionId) return null
    const evidence = task.result.delivery?.evidence?.filter((entry) => entry.kind === 'file' ||
      (entry.kind === 'view' && entry.executionId === execution.executionId))
    return evidence?.length ? {
      resultId: task.result.resultId, artifactRefs: evidence.map((entry) => entry.ref), requiresReview: task.requiresReview === true,
    } : null
  }

  function acceptedDeliveryAwaitingStop(state, task) {
    const worker = state.executions.get(task.executionId)
    return worker?.state === 'unknown' && worker.deliveryAccepted != null && worker.deliveryAccepted.resultId === task.result?.resultId
  }

  /**
   * 审查结果（Reviewer）：只针对处于 review 的任务。
   * pass -> completed（必须绑定 reviewId）；fail -> pending（返工）；
   * unable -> 拒绝（无法验证不等于通过，§7.4）。
   */
  function submitReview(input, sessionId, actor = null, binding) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')
    if (acceptedDeliveryAwaitingStop(state, task)) return fail('precondition_failed', 'confirm the original execution stopped before reviewing its accepted delivery')

    const verdict = input?.verdict
    if (verdict === 'unable') {
      return fail('unverifiable', 'cannot review without verifiable evidence')
    }

    const experience = verifyReviewedExperiences(task, input, actor)
    if (!experience.ok) return experience
    const verifiedExperiences = experience.observations.length ? { verifiedExperiences: experience.observations } : {}
    let evidenceRefs = Array.isArray(input?.evidenceRefs) ? input.evidenceRefs : []
    if (verdict === 'fail') {
      const pinnedRes = collectPinnedReviewVersions(state, task, evidenceRefs)
      if (!pinnedRes.ok) return pinnedRes.error
      const moved = transitionTask(task, { type: 'review_failed', reason: input?.reason ?? null })
      if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
      const at = new Date().toISOString()
      const { pinnedList, versionMap } = pinnedRes
      const next = {
        ...task,
        state: moved.next,
        viewObjectVersions: versionMap,
        review: {
          verdict: 'fail',
          reason: input?.reason ?? '',
          evidenceRefs,
          ...verifiedExperiences,
          pinnedObjectVersions: pinnedList,
          ...(actor ? { actor } : {}),
          at,
        },
        updatedAt: at,
      }
      state.tasks.set(task.taskId, next)
      recordReviewSkillAcceptance(state, task, 'fail', null, evidenceRefs, at)
      const actMember = actor?.id || task.memberId
      if (actMember) {
        recordActivity(sessionId, {
          memberId: actMember,
          kind: 'result',
          taskId: task.taskId,
          executionId: task.executionId ?? null,
          summary: `审查退回返工：${String(input?.reason ?? '').slice(0, 80)}`,
          text: input?.reason ?? '',
          detail: { verdict: 'fail', evidenceRefs, pinnedObjectVersions: pinnedList },
        })
      }
      const persisted = persist()
      return { ok: true, taskId: task.taskId, state: next.state, persisted }
    }

    if (verdict !== 'pass') return fail('invalid', 'verdict must be pass | fail | unable')
    if (task.state === 'completed' && !task.reviewPolicy?.requiresReview && task.review?.verdict === 'pass' &&
        task.review?.resultId === task.result?.resultId && (!input?.resultId || input.resultId === task.result?.resultId)) {
      const overriddenByActor = Boolean(task.review.autoAccepted && typeof input?.reason === 'string' && input.reason.trim())
      if (overriddenByActor) {
        const { autoAccepted, ...restReview } = task.review
        task.review = { ...restReview, reason: input.reason.trim(), actor: actor ?? task.review.actor }
        persist()
      }
      return { ok: true, replayed: !overriddenByActor, taskId: task.taskId, state: task.state, reviewId: task.review.reviewId, persisted: true }
    }
    if (task.state !== 'review') return fail('invalid_transition', `task is ${task.state}, not review`)

    if (managedDelivery(state) && task.reviewPolicy?.requiresReview) {
      const reviewer = state.executions.get(binding?.executionId)
      if (actor?.kind !== 'member' || actor.role !== 'reviewer' || !reviewer ||
          reviewer.kind !== 'review' || reviewer.executionId !== task.reviewExecutionId || reviewer.targetExecutionId !== task.executionId ||
          reviewer.targetResultId !== task.result.resultId || reviewer.memberId !== actor.id || reviewer.memberId === task.memberId ||
          reviewer.quarantined || !['running', 'finished'].includes(reviewer.state)) {
        return fail('unauthorized', 'this task requires a verdict from the bound independent Reviewer')
      }
    }

    if (managedDelivery(state) && task.reviewPolicy) {
      const { result } = task
      const checked = checkPinnedDelivery(state, task)
      if (!checked.ok) return checked
      const allowedRefs = new Set([
        ...result.artifactRefs,
        `result:${result.resultId}`,
        result.resultId,
        ...(result.delivery?.evidence ?? []).flatMap((entry) => [entry?.ref, entry?.location].filter(Boolean)),
      ])
      const validatedRefs = []
      for (const ref of evidenceRefs) {
        if (allowedRefs.has(ref)) {
          validatedRefs.push(ref)
          continue
        }
        const rawEventId = typeof ref === 'string' ? (ref.startsWith('event:') ? ref.slice(6) : ref) : ''
        if (rawEventId && task.events.some((event) =>
          event.eventId === rawEventId && ['file.changed', 'command.completed'].includes(event.type) &&
          (event.executionId === task.executionId || event.executionId === binding?.executionId))) {
          validatedRefs.push(`event:${rawEventId}`)
          continue
        }
        const match = typeof ref === 'string' && FEEDBACK_VIEW_REF_RE.exec(ref)
        const ownReviewView = match && match[3] !== undefined && viewObjectVersion(state, match[2], Number(match[3]))
        if (ownReviewView && ownReviewView.type === match[1] && ownReviewView.taskId === task.taskId &&
            ownReviewView.roleKind === 'reviewer' && ownReviewView.authorId === actor?.id && binding?.executionId &&
            ownReviewView.executionId === binding.executionId) {
          validatedRefs.push(ref)
          continue
        }
        if (task.reviewPolicy.requiresReview) {
          return fail('precondition_failed', `review evidence is not bound to this delivery: ${ref}`)
        }
      }
      if (task.reviewPolicy.requiresReview && (!validatedRefs.length || typeof input.reason !== 'string' || !input.reason.trim())) {
        return fail('precondition_failed', 'cite a verified evidence reference and explain the review verdict')
      }
      evidenceRefs = [...new Set([...result.artifactRefs, ...validatedRefs])]
    }

    const missingViews = missingAcceptanceViewsForTask(task, [...(state.viewObjects?.values() ?? [])], state.metadata?.requiredViews ?? [])
    if (missingViews.length > 0) {
      return fail('precondition_failed', `missing required acceptance view objects: ${missingViews.map((v) => `${v.type}:${v.id}`).join(', ')}`)
    }

    const pinnedRes = collectPinnedReviewVersions(state, task, evidenceRefs, !task.result?.delivery)
    if (!pinnedRes.ok) return pinnedRes.error

    const reviewId = `review-${++state.reviewCounter}`
    const moved = transitionTask(task, { type: 'review_passed', reviewId })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)

    const at = new Date().toISOString()
    const { pinnedList, versionMap } = pinnedRes
    const next = {
      ...task,
      state: moved.next,
      viewObjectVersions: versionMap,
      review: {
        reviewId,
        verdict: 'pass',
        reason: input?.reason ?? '',
        evidenceRefs,
        ...(input?.autoAccepted === true ? { autoAccepted: true } : {}),
        ...(binding?.executionId ? { reviewExecutionId: binding.executionId } : {}),
        ...verifiedExperiences,
        pinnedObjectVersions: pinnedList,
        ...(actor ? { actor } : {}),
        at,
      },
      updatedAt: at,
    }
    state.tasks.set(task.taskId, next)
    const currentChanges = new Set(checklistChangesForTask(state, task).filter((change) => change.current).map((change) => change.changeId))
    const cited = new Set(evidenceRefs.filter((ref) => typeof ref === 'string').map((ref) => ref.trim()))
    for (const change of task.checklistChanges ?? []) {
      const report = change.reports.find(({ resultId }) => resultId === task.result.resultId)
      const typePrefix = change.viewType || state.viewObjects.get(change.viewId)?.type || 'checklist'
      if (report && currentChanges.has(change.changeId) &&
          (cited.has(`${typePrefix}:${change.viewId}@v${report.version}`) || cited.has(`checklist:${change.viewId}@v${report.version}`)) &&
          pinnedList.some(({ id, version }) => id === change.viewId && version === report.version)) {
        report.verification = { reviewId, author: actor, at }
      }
    }
    recordReviewSkillAcceptance(state, task, 'pass', reviewId, evidenceRefs, at)
    const actMember = actor?.id || task.memberId
    if (actMember) {
      recordActivity(sessionId, {
        memberId: actMember,
        kind: 'result',
        taskId: task.taskId,
        executionId: task.executionId ?? null,
        summary: `验收通过 (${reviewId})`,
        text: input?.reason ?? '',
        detail: { verdict: 'pass', reviewId, evidenceRefs, pinnedObjectVersions: pinnedList },
      })
    }
    const persisted = persist()
    return { ok: true, taskId: task.taskId, state: next.state, reviewId, persisted }
  }

  /**
   * 记录派发结果。只有能启动的任务才创建 Execution 并计入 attempt。
   */
  function startExecution(sessionId, taskId, binding = {}) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    const gate = planGateOf(state)
    if (gate && gate.status !== 'approved') return fail('precondition_failed', planApprovalRequired)
    const { dispatchBlockReason, dispatchedBy } = binding
    const moved = transitionTask(task, dispatchBlockReason
      ? { type: 'dispatch_blocked', reason: dispatchBlockReason }
      : { type: 'dispatch' })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    const budget = dispatchBudget(task, dispatchLimitsOf(state))
    if (budget.blockedReason) return fail('precondition_failed', budget.blockedReason)
    const at = new Date().toISOString()
    if (moved.next === 'blocked') {
      task.state = moved.next
      task.blockedReason = dispatchBlockReason
      task.updatedAt = at
      appendEvent(sessionId, 'task.blocked', {
        code: 'capability_mismatch', reason: dispatchBlockReason,
        memberId: binding.memberId, connectorId: binding.connectorId, commandId: binding.commandId,
      }, dispatchedBy ? { kind: dispatchedBy.kind, id: dispatchedBy.actorId } : undefined, taskId)
      return { ok: true, taskId, state: task.state, blockedReason: task.blockedReason }
    }
    const executionId = (typeof binding.executionId === 'string' && /^exec-[A-Za-z0-9_-]+$/.test(binding.executionId) && !state.executions.has(binding.executionId))
      ? binding.executionId
      : `exec-${randomUUID()}`
    const worktree = binding.worktree ? structuredClone({ ...binding.worktree, executionId }) : null
    const worktreeFallback = binding.worktreeFallback ? structuredClone(binding.worktreeFallback) : null
    const reviewPolicy = task.reviewPolicy ?? frozenReviewPolicy(state, task.commanderRequiresReview ?? task.requiresReview, task.reviewExemption)
    const next = { ...task, state: moved.next, attempt: budget.attempts + 1,
      reworkCount: budget.reworks + Number(budget.reworkPending), executionId, memberId: binding.memberId ?? null,
      reviewPolicy, requiresReview: reviewPolicy.requiresReview,
      writeScope: binding.writeScope ?? null,
      worktree,
      worktreeFallback,
      worktreeWarning: null,
      progress: [], blockedReason: null, reviewDispatch: null, updatedAt: at }
    const frozenDuties = freezeMemberDuties(state.metadata, next.memberId)
    const frozenDeliveries = Array.isArray(binding.skillDeliveries) && binding.skillDeliveries.length > 0
      ? binding.skillDeliveries.map((d) => ({
          ...structuredClone(d),
          status: 'delivered',
          channel: binding.deliveryChannel || 'task_assignment_context',
          deliveredAt: at,
        }))
      : []
    state.executions.set(executionId, { executionId, taskId, kind: 'worker', memberId: next.memberId, connectorId: binding.connectorId ?? null,
      attempt: next.attempt, writeScope: binding.writeScope ?? null, sandbox: binding.sandbox ?? null,
      ...(worktree ? { worktree: structuredClone(worktree) } : {}),
      ...(worktreeFallback ? { worktreeFallback: structuredClone(worktreeFallback) } : {}),
      ...(gate ? { planRef: gate.planRef, planProposalId: gate.proposalId } : {}),
      ...(binding.dispatchedBy ? { dispatchedBy: structuredClone(binding.dispatchedBy) } : {}),
      ...(typeof binding.taskContext === 'string' && binding.taskContext.trim() !== '' ? { taskContext: binding.taskContext.trim() } : {}),
      ...(frozenDeliveries.length > 0 ? { skillDeliveries: frozenDeliveries } : {}),
      ...(frozenDuties ? { memberDuties: frozenDuties } : {}),
      hostBootId, metrics: {}, state: 'running', nativeSessionRef: null, createdAt: at, updatedAt: at })
    state.tasks.set(next.taskId, next)
    if (worktree) {
      appendEvent(sessionId, 'worktree.prepared', {
        executionId,
        repositoryRoot: worktree.repositoryRoot,
        path: worktree.path,
        branch: worktree.branch,
        baseCommit: worktree.baseCommit,
        ...(worktree.dirtySourceSkipped ? { dirtySourceSkipped: true } : {}),
      }, dispatchedBy ? { kind: dispatchedBy.kind, id: dispatchedBy.actorId } : undefined, taskId, executionId)
    } else if (worktreeFallback) {
      appendEvent(sessionId, 'worktree.fallback_shared', {
        executionId,
        reason: worktreeFallback.reason,
        ...(worktreeFallback.detail ? { detail: worktreeFallback.detail } : {}),
        ...(worktreeFallback.repositoryRoot ? { repositoryRoot: worktreeFallback.repositoryRoot } : {}),
      }, dispatchedBy ? { kind: dispatchedBy.kind, id: dispatchedBy.actorId } : undefined, taskId, executionId)
    }
    if (frozenDeliveries.length > 0) {
      appendEvent(sessionId, 'skill.delivered', {
        executionId,
        memberId: next.memberId,
        skills: frozenDeliveries.map((d) => ({ id: d.id, kind: d.kind, version: d.version, contentHash: d.contentHash, source: d.source })),
      }, { kind: 'runtime', id: 'concerto' }, taskId, executionId)
    }
    const persisted = persist()
    return { ok: true, taskId: next.taskId, executionId: next.executionId, state: next.state, attempt: next.attempt, persisted,
      ...(worktree ? { worktree: structuredClone(worktree) } : {}),
      ...(frozenDuties ? { memberDuties: structuredClone(frozenDuties) } : {}) }
  }

  function startReviewExecution(sessionId, taskId, binding = {}) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    if (task.state !== 'review' || !task.result?.resultId) {
      return fail('precondition_failed', `task "${taskId}" must be in review state with a submitted result`)
    }
    if (acceptedDeliveryAwaitingStop(state, task)) return fail('precondition_failed', 'confirm the original execution stopped before reviewing its accepted delivery')
    if (binding.targetResultId !== undefined && (binding.targetResultId !== task.result.resultId || binding.targetExecutionId !== task.executionId)) {
      return fail('stale', 'the result to review has changed')
    }
    if (binding.targetResultId !== undefined) {
      const checked = checkPinnedDelivery(state, task)
      if (!checked.ok) return checked
    }
    if (binding.memberId && binding.memberId === task.memberId) return fail('unauthorized', 'the worker cannot review their own delivery')
    const at = new Date().toISOString()
    const executionId = `exec-${randomUUID()}`
    const worktree = binding.worktree ? structuredClone(binding.worktree) : null
    const worktreeFallback = binding.worktreeFallback ? structuredClone(binding.worktreeFallback) : null
    const frozenDuties = freezeMemberDuties(state.metadata, binding.memberId)
    const frozenDeliveries = Array.isArray(binding.skillDeliveries) && binding.skillDeliveries.length > 0
      ? binding.skillDeliveries.map((d) => ({
          ...structuredClone(d),
          status: 'delivered',
          channel: binding.deliveryChannel || 'task_assignment_context',
          deliveredAt: at,
        }))
      : []
    state.executions.set(executionId, {
      executionId,
      taskId,
      kind: 'review',
      targetExecutionId: task.executionId ?? null,
      targetResultId: task.result.resultId,
      memberId: binding.memberId ?? null,
      connectorId: binding.connectorId ?? null,
      attempt: task.attempt ?? 1,
      writeScope: binding.writeScope ?? null,
      sandbox: binding.sandbox ?? 'read-only',
      ...(worktree ? { worktree: structuredClone(worktree) } : {}),
      ...(worktreeFallback ? { worktreeFallback: structuredClone(worktreeFallback) } : {}),
      ...(binding.dispatchedBy ? { dispatchedBy: structuredClone(binding.dispatchedBy) } : {}),
      ...(typeof binding.taskContext === 'string' && binding.taskContext.trim() !== '' ? { taskContext: binding.taskContext.trim() } : {}),
      ...(frozenDeliveries.length > 0 ? { skillDeliveries: frozenDeliveries } : {}),
      ...(frozenDuties ? { memberDuties: frozenDuties } : {}),
      hostBootId,
      metrics: {},
      state: 'running',
      nativeSessionRef: null,
      createdAt: at,
      updatedAt: at,
    })
    task.reviewExecutionId = executionId
    task.reviewDispatch = { resultId: task.result.resultId, status: 'started' }
    task.blockedReason = null
    task.updatedAt = at
    state.tasks.set(taskId, task)
    if (frozenDeliveries.length > 0) {
      appendEvent(sessionId, 'skill.delivered', {
        executionId,
        memberId: binding.memberId ?? null,
        skills: frozenDeliveries.map((d) => ({ id: d.id, kind: d.kind, version: d.version, contentHash: d.contentHash, source: d.source })),
      }, { kind: 'runtime', id: 'concerto' }, taskId, executionId)
    }
    const persisted = persist()
    return {
      ok: true,
      taskId,
      executionId,
      targetExecutionId: task.executionId ?? null,
      targetResultId: task.result.resultId,
      state: task.state,
      persisted,
      ...(frozenDuties ? { memberDuties: structuredClone(frozenDuties) } : {}),
    }
  }

  function recordWorktreeDirtyWarning(scope, taskId, warning = {}, actor = null) {
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    if (task.state !== 'pending') return fail('precondition_failed', 'task is not pending')
    const at = new Date().toISOString()
    const dirtyFiles = Array.isArray(warning.dirtyFiles) ? warning.dirtyFiles.slice(0, 50) : []
    const stagedCount = Number(warning.stagedCount ?? 0)
    const unstagedCount = Number(warning.unstagedCount ?? 0)
    const untrackedCount = Number(warning.untrackedCount ?? 0)
    const totalDirtyCount = Number(warning.totalDirtyCount ?? dirtyFiles.length)
    const worktreeWarning = {
      repositoryRoot: warning.repositoryRoot ?? '',
      baseCommit: warning.baseCommit ?? '',
      baseBranch: warning.baseBranch ?? 'HEAD',
      stagedCount,
      unstagedCount,
      untrackedCount,
      totalDirtyCount,
      dirtyFiles,
      detail: `源 Git 工作区存在 ${totalDirtyCount} 项未提交或未跟踪改动；独立 Worktree 不会包含这些改动（也不会静默复制密钥）。请先提交所需内容，或明确选择「按干净 Worktree 派发」/「改用共享目录顺序派发」。`,
      detectedAt: at,
    }
    task.worktreeWarning = worktreeWarning
    task.updatedAt = at
    state.tasks.set(taskId, task)
    appendEvent(scope, 'worktree.dirty_detected', {
      repositoryRoot: worktreeWarning.repositoryRoot,
      baseCommit: worktreeWarning.baseCommit,
      stagedCount,
      unstagedCount,
      untrackedCount,
      totalDirtyCount,
      dirtyFiles: dirtyFiles.slice(0, 10),
    }, actor ? { kind: actor.kind, id: actor.id ?? actor.actorId } : undefined, taskId)
    return { ok: true, worktreeWarning: structuredClone(worktreeWarning) }
  }

  function recordExecutionEvent(sessionId, taskId, event, executionId) {
    event = { ...event, type: normalizeEventType(event.type) }
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    const execution = state.executions.get(executionId)
    if (!task || !execution || execution.taskId !== taskId) return fail('stale', 'execution is no longer current')
    if (execution.kind !== 'review' && task.executionId !== executionId) return fail('stale', 'execution is no longer current')
    if (!execution || ['finished', 'stopped', 'unknown'].includes(execution.state)) return fail('precondition_failed', 'execution no longer accepts events')
    if (event.type === 'output.delta') return { ok: true } // Streaming text is not the durable audit log.
    execution.metrics ??= {}
    if (event.observedAt) execution.metrics.lastForwardingMs = Math.max(0, Date.now() - Date.parse(event.observedAt))
    if (event.type === 'execution.phase') execution.metrics[event.phase] = event.elapsedMs
    if (event.type === 'approval.requested' && execution.metrics.firstApprovalMs === undefined) {
      execution.metrics.firstApprovalMs = event.elapsedMs ?? null
      execution.metrics.firstApprovalForwardingMs = execution.metrics.lastForwardingMs ?? null
      execution.metrics.firstApprovalObservedAt = event.observedAt ?? null
    }
    if (event.type === 'output.message') {
      task.progress.push({ note: event.text.slice(0, 1500), at: new Date().toISOString(), source: 'member', memberId: execution.memberId })
      task.updatedAt = new Date().toISOString()
      recordActivity(sessionId, {
        memberId: execution.memberId,
        kind: 'message',
        taskId,
        executionId,
        summary: event.text.slice(0, 120),
        text: event.text,
        recordedAt: event.observedAt,
      })
    }
    if (event.type === 'command.completed') {
      const exitStr = Number.isInteger(event.exitCode) ? `退出码 ${event.exitCode}` : (event.status || 'completed')
      recordActivity(sessionId, {
        memberId: execution.memberId,
        kind: 'command',
        taskId,
        executionId,
        summary: `运行 \`${String(event.command || '').slice(0, 60)}\` → ${exitStr}`,
        text: event.output || '',
        detail: { command: event.command ?? '', cwd: event.cwd ?? null, exitCode: event.exitCode ?? null, status: event.status ?? null, truncated: Boolean(event.truncated) },
        recordedAt: event.observedAt,
      })
    }
    if (event.type === 'file.changed') {
      const count = Array.isArray(event.changes) ? event.changes.length : 0
      recordActivity(sessionId, {
        memberId: execution.memberId,
        kind: 'file_change',
        taskId,
        executionId,
        summary: `修改 ${count} 个文件${count > 0 && event.changes[0]?.path ? `（${event.changes[0].path}）` : ''}`,
        detail: { changes: event.changes ?? [] },
        recordedAt: event.observedAt,
      })
    }
    if (event.threadId || event.turnId || event.pid !== undefined) {
      execution.nativeSessionRef = {
        ...(execution.nativeSessionRef || {}),
        backend: execution.nativeSessionRef?.backend || execution.connectorId,
        sessionId: event.threadId ?? execution.nativeSessionRef?.sessionId ?? null,
        ...(event.pid !== undefined ? { pid: event.pid } : {}),
        ...(event.turnId !== undefined ? { turnId: event.turnId } : {}),
        hostBootId: execution.nativeSessionRef?.hostBootId ?? hostBootId,
      }
    }
    if (event.type === 'approval.requested' || event.type === 'question.requested') {
      const requestId = `${executionId}:${event.requestId}`
      if (state.requests.has(requestId)) return { ok: true, requestId, replayed: true }
      const kind = event.type.split('.')[0]
      // A backend may issue several requests concurrently; track sequence & diff without conflating distinct ops as a loop.
      if (execution.state === 'running') moveExecution(execution, kind === 'approval' ? 'approval_requested' : 'question_persisted')
      let sequenceIndex = 1
      let diffFromPrevious = null
      let duplicateOfRequestId = null
      if (kind === 'approval') {
        const prevApprovals = [...state.requests.values()].filter((r) => r.executionId === executionId && r.kind === 'approval')
        sequenceIndex = prevApprovals.length + 1
        const prev = prevApprovals.at(-1)
        if (prev) {
          const curFiles = JSON.stringify(event.payload?.files || event.payload?.changes || [])
          const prevFiles = JSON.stringify(prev.payload?.files || prev.payload?.changes || [])
          const diffs = []
          if ((prev.payload?.method || '') !== (event.payload?.method || '')) diffs.push('方法不同')
          if ((prev.payload?.command || '') !== (event.payload?.command || '')) diffs.push('命令不同')
          if (prevFiles !== curFiles) diffs.push('文件范围不同')
          if ((prev.payload?.cwd || '') !== (event.payload?.cwd || '')) diffs.push('目录不同')
          if ((prev.payload?.reason || '') !== (event.payload?.reason || '')) diffs.push('原因不同')
          if ((prev.payload?.decisionScope || '') !== (event.payload?.decisionScope || '')) diffs.push('决策范围不同')
          if (diffs.length === 0) {
            diffs.push('与前一次请求签名完全一致')
            duplicateOfRequestId = prev.requestId
          }
          diffFromPrevious = diffs
        }
      }
      const recordedReq = {
        requestId,
        nativeRequestId: event.requestId,
        taskId,
        executionId,
        memberId: execution.memberId,
        kind,
        ...(kind === 'question' && event.responseMode ? { responseMode: event.responseMode } : {}),
        payload: event.payload,
        sequenceIndex,
        ...(diffFromPrevious ? { diffFromPrevious } : {}),
        ...(duplicateOfRequestId ? { duplicateOfRequestId } : {}),
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      state.requests.set(requestId, recordedReq)
      event = {
        ...event,
        sequenceIndex,
        ...(diffFromPrevious ? { diffFromPrevious } : {}),
        ...(duplicateOfRequestId ? { duplicateOfRequestId } : {}),
      }
      recordActivity(sessionId, {
        memberId: execution.memberId,
        kind: 'request',
        taskId,
        executionId,
        summary: kind === 'approval' ? `第 ${sequenceIndex} 次请求审批：${event.payload?.command || (event.payload?.files || []).join(', ') || event.payload?.reason || ''}` : `提出问题：${event.payload?.questions?.[0]?.question || ''}`,
        detail: { requestId, kind, status: 'pending', sequenceIndex, ...(diffFromPrevious ? { diffFromPrevious } : {}), payload: event.payload },
        recordedAt: event.observedAt,
      })
    }
    if (event.type === 'approval.resolved') {
      const request = state.requests.get(`${executionId}:${event.requestId}`)
      if (!request) return fail('not_found', 'approval request not recorded')
      Object.assign(request, { status: 'delivered', answer: { decision: event.decision }, actor: event.actor })
      resumeAfterRequests(state, execution)
      recordActivity(sessionId, {
        memberId: execution.memberId,
        kind: 'request',
        taskId,
        executionId,
        summary: `审批结果：${event.decision}`,
        detail: { requestId: request.requestId, kind: 'approval', status: 'delivered', decision: event.decision },
        recordedAt: event.observedAt,
      })
    }
    execution.updatedAt = new Date().toISOString()
    appendEvent(sessionId, event.type, { ...event }, { kind: 'member', id: execution.memberId }, taskId, executionId)
    return event.type === 'question.requested' ? { ok: true, requestId: `${executionId}:${event.requestId}` } : { ok: true }
  }

  /**
   * 外部执行完成：写结果并走 result_submitted。
   * checksPassed=false 时按状态机进入 blocked；requiresReview 时进入 review。
   */
  function completeExecution(sessionId, taskId, input) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    const moved = transitionTask(task, {
      type: 'result_submitted',
      requiresReview: task.requiresReview === true || input?.needsReview === true,
      basicChecksPassed: input?.checksPassed === true,
      reason: input?.blockReason,
    })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    if (moved.next === 'completed') {
      const missingViews = missingAcceptanceViewsForTask(task, [...(state.viewObjects?.values() ?? [])], state.metadata?.requiredViews ?? [])
      if (missingViews.length > 0) {
        return fail('precondition_failed', `missing required acceptance view objects: ${missingViews.map((v) => `${v.type}:${v.id}`).join(', ')}`)
      }
    }

    const at = new Date().toISOString()
    const next = {
      ...task,
      state: moved.next,
      blockedReason: moved.next === 'blocked' ? (input?.blockReason ?? 'acceptance not verified') : null,
      result: {
        resultId: `result-${randomUUID()}`,
        executionId: task.executionId ?? null,
        summary: typeof input?.summary === 'string' ? input.summary.slice(0, 4000) : '',
        artifactRefs: Array.isArray(input?.artifactRefs) ? input.artifactRefs : [],
        connector: typeof input?.connector === 'string' ? input.connector : null,
        at,
      },
      updatedAt: at,
    }
    state.tasks.set(next.taskId, next)
    appendEvent(sessionId, 'result.submitted', { result: next.result }, { kind: 'runtime', id: 'concerto' }, taskId, next.executionId)
    const persisted = persist()
    return { ok: true, taskId: next.taskId, state: next.state, attempt: next.attempt, persisted }
  }

  function appendEvent(scope, type, payload, actor = { kind: 'runtime', id: 'concerto' }, taskId = null, executionId = null) {
    const state = stateOf(scope)
    const event = { eventId: `event-${randomUUID()}`, schemaVersion: 1, seq: state.events.length + 1,
      type, recordedAt: new Date().toISOString(), teamSessionId: scope, projectId: state.metadata?.projectId ?? scope,
      teamId: state.metadata?.teamId ?? null, taskId, executionId, actor, payload: structuredClone(payload) }
    state.events.push(event)
    if (taskId) state.tasks.get(taskId).events.push(event)
    if (eventSubscribers.size > 0) {
      queueMicrotask(() => {
        for (const fn of eventSubscribers) {
          try { fn(event) } catch { /* ignore listener error */ }
        }
      })
    }
    return event
  }

  function moveExecution(execution, type, extra = {}) {
    const moved = transitionExecution(execution, { type, ...extra })
    if (moved.kind !== 'ok') throw new Error(`Invalid execution transition ${execution.state}: ${type}`)
    execution.state = moved.next
    execution.updatedAt = new Date().toISOString()
  }

  // A synchronous command commits state and its audit records as one atomic file replacement.
  // No native process is started inside this boundary. A failed write restores memory as well.
  function transaction(operation) {
    return (...args) => {
      const before = structuredClone(sessions)
      const previousBindings = structuredClone(bindings)
      const previousProjectSkills = structuredClone(projectSkills)
      const previousMemberDuties = new Map(memberDuties)
      transactionOpen = true
      try {
        const result = operation(...args)
        transactionOpen = false
        if (result?.ok === false) {
          sessions.clear(); for (const [key, value] of before) sessions.set(key, value)
          bindings = previousBindings
          projectSkills = previousProjectSkills
          memberDuties = previousMemberDuties
          return result
        }
        const began = performance.now()
        persist()
        lastPersistenceMs = Math.round((performance.now() - began) * 100) / 100
        return result
      } catch (error) {
        transactionOpen = false
        sessions.clear(); for (const [key, value] of before) sessions.set(key, value)
        bindings = previousBindings
        projectSkills = previousProjectSkills
        memberDuties = previousMemberDuties
        throw error
      }
    }
  }

  function audited(operation, type) {
    return transaction((input, scope, actor, context) => command(scope, input?.commandId, { type, input }, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(input?.taskId)
      if ([submitResult, submitReview].includes(operation) && [...state.requests.values()].some((request) =>
        request.taskId === input?.taskId && request.memberId === actor?.id && request.responseMode === 'next_turn' &&
        ['pending', 'decided'].includes(request.status))) {
        return fail('precondition_failed', 'wait for the member question answer before submitting')
      }
      if (input?.executionId && task?.executionId !== input.executionId) return fail('stale', 'execution is no longer current')
      if (input?.resultId && task?.result?.resultId !== input.resultId) return fail('stale', 'result is no longer current')
      if (operation === submitReview && task?.executionId) {
        const execution = stateOf(scope).executions.get(task.executionId)
        if (!['finished', 'stopped'].includes(execution.state)) return fail('precondition_failed', 'native execution must end before review')
      }
      if (operation === submitResult && task?.state === 'pending') {
        if (state.paused) return fail('precondition_failed', dispatchPausedDetail)
        const started = startExecution(scope, task.taskId, { memberId: actor?.id })
        if (!started.ok) return started
      }
      const out = operation(operation === submitResult && actor?.kind === 'member' ? { ...input, needsReview: true } : input, scope, actor, context)
      if (out.ok && !out.replayed) {
        const taskId = out.taskId ?? out.result?.taskId ?? null
        const updated = taskId ? stateOf(scope).tasks.get(taskId) : null
        if (operation === submitResult && updated?.executionId) {
          const execution = stateOf(scope).executions.get(updated.executionId)
          if (execution.state !== 'running') return fail('precondition_failed', 'resolve outstanding requests before submitting a result')
          if (!execution.connectorId) moveExecution(execution, 'turn_settled')
        }
        if (operation === submitReview) updated.review = { ...updated.review, executionId: updated.executionId, resultId: updated.result.resultId, actor }
        const payload = { input, outcome: out }
        if (operation === submitResult) payload.result = updated.result
        if (operation === submitReview) payload.review = updated.review
        appendEvent(scope, type, payload, actor, taskId, updated?.executionId ?? null)
      }
      return out
    }))
  }

  // Replay the durable effect before evaluating current state. A retry must never start a new attempt.
  function command(scope, commandId, content, operation) {
    if (!commandId) return operation()
    const commands = stateOf(scope).commands
    const hash = JSON.stringify(content)
    const previous = commands.get(commandId)
    if (previous) return previous.hash === hash ? { ...structuredClone(previous.result), replayed: true } : fail('idempotency_conflict', 'commandId reused with different content')
    const result = operation()
    if (result.ok) commands.set(commandId, { hash, result: structuredClone(result) })
    return result
  }

  function replayCommand(scope, commandId, content) {
    const previous = stateOf(scope).commands.get(commandId)
    if (!previous) return null
    return previous.hash === JSON.stringify(content) ? { ...structuredClone(previous.result), replayed: true } : fail('idempotency_conflict', 'commandId reused with different content')
  }

  const reviewExemptionCommand = ({ taskId, reason }) => ({ type: 'task_review_exemption', taskId, reason })

  function prepareReviewExemption(scope, { taskId, commandId, reason }) {
    if (typeof commandId !== 'string' || !commandId.trim()) return fail('invalid', 'commandId required')
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1200) return fail('invalid', 'explain the exemption in up to 1200 characters')
    const input = { taskId, commandId, reason: reason.trim() }
    const replay = replayCommand(scope, commandId, reviewExemptionCommand(input))
    if (replay) return replay
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    if (task.state !== 'pending' || task.attempt > 0 || task.reviewPolicy || task.needsAdjudication || hasUnsettledTaskExecution(state, taskId)) {
      return fail('precondition_failed', 'an exemption can only be requested before the first dispatch of a pending task')
    }
    const policy = frozenReviewPolicy(state, task.commanderRequiresReview ?? task.requiresReview, task.reviewExemption)
    if (!policy.requiresReview || policy.requiredByCommander) {
      return fail('precondition_failed', 'this task has no mandatory Team/Profile-only review to exempt')
    }
    return {
      ok: true,
      request: { ...input, title: task.title, policyVersion: policy.version, expectedUpdatedAt: task.updatedAt,
        expectedPlanRevision: latestPlanRevision(runsForProject(scope, state)) },
    }
  }

  function settleReviewExemption(scope, request, approved, actor) {
    if (actor?.kind !== 'user' || !actor.id) return fail('unauthorized', 'only the user can confirm a review exemption')
    const { commandId, taskId, policyVersion, reason, expectedUpdatedAt, expectedPlanRevision } = request
    return command(scope, commandId, reviewExemptionCommand(request), () => {
      if (!approved) return { ok: true, status: 'declined', taskId, policyVersion }
      const latest = prepareReviewExemption(scope, request)
      if (!latest.ok) return latest
      const current = latest.request
      if (current.policyVersion !== policyVersion || current.expectedUpdatedAt !== expectedUpdatedAt ||
          current.expectedPlanRevision !== expectedPlanRevision) return fail('stale', 'the task or review policy changed during confirmation')
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      const at = new Date().toISOString()
      const exemption = { actor: actor.id, at, reason, policyVersion }
      task.reviewExemption = exemption
      task.updatedAt = at
      state.planRevision = expectedPlanRevision + 1
      appendEvent(scope, 'task.review_exemption_approved', exemption, actor, taskId)
      return { ok: true, status: 'approved', taskId, policyVersion, exemption, planRevision: state.planRevision }
    })
  }

  function approvePlan(scope, { proposalId, commandId }, actor) {
    if (actor?.kind !== 'user') return fail('unauthorized', 'only the user can confirm a plan')
    if (typeof proposalId !== 'string' || !proposalId) return fail('invalid', 'proposalId required')
    return command(scope, commandId, { type: 'approve_plan', proposalId }, () => {
      const state = stateOf(scope)
      const gate = planGateOf(state)
      if (state.goalCompletion) return fail('precondition_failed', 'goal is already complete')
      if (gate?.proposalId !== proposalId || gate.status === 'stale') {
        return fail('stale', '待确认的计划已变更，请刷新后查看当前版本。')
      }
      if (gate.status === 'pending') {
        state.planApproval = { ...state.planApproval, approvedAt: new Date().toISOString(), approvedBy: actor }
        appendEvent(scope, 'plan.approved', state.planApproval, actor)
        return { ok: true, confirmedNow: true, planGate: planGateOf(state) }
      }
      return { ok: true, planGate: gate }
    })
  }

  function recordPlanWake(scope, proposalId, commanderWake) {
    const state = stateOf(scope)
    if (state.planApproval?.proposalId !== proposalId) return fail('stale', 'plan proposal changed')
    state.planApproval = { ...state.planApproval, commanderWake }
    return { ok: true, planGate: planGateOf(state) }
  }

  function haltTeam(scope, { paused, commandId }, actor) {
    if (typeof paused !== 'boolean') return fail('invalid', 'paused must be a boolean')
    return command(scope, commandId, { type: 'halt_team', paused }, () => {
      const state = stateOf(scope)
      if (state.paused !== paused) {
        state.paused = paused
        appendEvent(scope, paused ? 'team.dispatch_paused' : 'team.dispatch_resumed', { paused }, actor)
      }
      return { ok: true, paused }
    })
  }

  function recordUserSuggestion(scope, { text, taskId = null, commandId } = {}, actor = { kind: 'user', id: 'local-owner' }) {
    const clean = typeof text === 'string' ? text.trim() : ''
    if (!clean || clean.length > 2000) return fail('invalid', '建议内容需为 1~2000 字')
    const cid = typeof commandId === 'string' && commandId.trim() ? commandId.trim() : `suggest-${randomUUID()}`
    return command(scope, cid, { type: 'user_suggestion', text: clean, taskId }, () => {
      const state = stateOf(scope)
      const commanderId = state.metadata?.commanderId || 'commander'
      const suggestion = {
        suggestionId: cid,
        text: clean,
        ...(taskId ? { taskId } : {}),
        createdAt: new Date().toISOString(),
        actor,
      }
      appendEvent(scope, 'user.suggestion', suggestion, actor, taskId || undefined)
      recordActivity(scope, {
        memberId: commanderId,
        kind: 'message',
        summary: `用户中途建议：${clean.slice(0, 120)}`,
        text: clean,
        detail: { suggestionId: cid, ...(taskId ? { taskId } : {}) },
      })
      return { ok: true, suggestion }
    })
  }

  function findAutoCascadeCandidates(scope) {
    const state = stateOf(scope)
    if (!state || state.goalCompletion || state.paused) return []
    const gate = planGateOf(state)
    if (gate && gate.status !== 'approved') return []
    const ready = []
    for (const task of state.tasks.values()) {
      if (task.state !== 'pending' || task.needsAdjudication) continue
      if (task.raceGroup?.role === 'parent') continue
      if (!Array.isArray(task.dependsOn) || task.dependsOn.length === 0) continue
      const allDepsDone = task.dependsOn.every((depId) => state.tasks.get(depId)?.state === 'completed')
      if (!allDepsDone) continue
      if (hasUnsettledTaskExecution(state, task.taskId)) continue
      ready.push({
        taskId: task.taskId,
        title: task.title,
        dependsOn: [...task.dependsOn],
        preferredMemberId: task.memberId || null,
      })
    }
    return ready
  }

  function recordAutoCascade(scope, { taskId, memberId, executionId, dependsOn = [] }) {
    const state = stateOf(scope)
    const commanderId = state.metadata?.commanderId || 'commander'
    appendEvent(scope, 'task.auto_cascaded', { taskId, memberId, executionId, dependsOn }, { kind: 'runtime', id: 'concerto-dag' }, taskId, executionId)
    recordActivity(scope, {
      memberId: commanderId,
      kind: 'dispatch',
      summary: `⚡ 依赖就绪，自动瀑布接力派发 ${taskId} → ${memberId}`,
      detail: { taskId, memberId, executionId, dependsOn },
    })
    return { ok: true }
  }

  function createRacePair(scope, { sourceTaskId, memberA, memberB, commandId }, actor = { kind: 'user', id: 'local-owner' }) {
    if (!sourceTaskId || !memberA || !memberB) return fail('invalid', 'sourceTaskId, memberA, memberB required')
    if (memberA === memberB) return fail('invalid', '请选择两位不同的成员进行双解赛马')
    const cid = typeof commandId === 'string' && commandId.trim() ? commandId.trim() : `race-${randomUUID()}`
    return command(scope, cid, { type: 'create_race_pair', sourceTaskId, memberA, memberB }, () => {
      const state = stateOf(scope)
      if (state.goalCompletion) return fail('precondition_failed', 'goal is already complete')
      const source = state.tasks.get(sourceTaskId)
      if (!source) return fail('not_found', `task ${sourceTaskId} not found`)
      if (source.state !== 'pending') return fail('precondition_failed', `只能对 pending 状态的任务发起赛马（当前：${source.state}）`)
      if (source.raceGroup) return fail('precondition_failed', '该任务已处于双解赛马中')

      const raceId = `race-${randomUUID().slice(0, 8)}`
      const now = new Date().toISOString()
      const makeCandidate = (label, memberId) => {
        state.counter += 1
        const taskId = `task-${state.counter}`
        const t = {
          taskId,
          title: `${source.title} [方案 ${label} · ${memberId}]`,
          objective: source.objective,
          acceptance: structuredClone(source.acceptance ?? []),
          constraints: structuredClone(source.constraints ?? []),
          dependsOn: structuredClone(source.dependsOn ?? []),
          assigneeRole: 'worker',
          requiresReview: false,
          reviewPolicy: structuredClone(source.reviewPolicy ?? { requiresReview: false }),
          state: 'pending',
          attempt: 0,
          memberId,
          executionId: null,
          result: null,
          review: null,
          events: [],
          raceGroup: { raceId, sourceTaskId, role: 'candidate', label, memberId, status: 'running' },
          createdAt: now,
          updatedAt: now,
        }
        state.tasks.set(taskId, t)
        appendEvent(scope, 'decision.applied', { action: 'create_task', taskId, title: t.title, raceId, label }, actor, taskId)
        return t
      }
      const taskA = makeCandidate('A', memberA)
      const taskB = makeCandidate('B', memberB)
      source.raceGroup = {
        raceId,
        sourceTaskId,
        role: 'parent',
        status: 'active',
        winnerTaskId: null,
        candidates: [
          { label: 'A', taskId: taskA.taskId, memberId: memberA },
          { label: 'B', taskId: taskB.taskId, memberId: memberB },
        ],
      }
      source.updatedAt = now
      state.planRevision += 1
      appendEvent(scope, 'race.started', {
        raceId,
        sourceTaskId,
        candidates: source.raceGroup.candidates,
      }, actor, sourceTaskId)
      return {
        ok: true,
        raceId,
        sourceTaskId,
        taskA: structuredClone(taskA),
        taskB: structuredClone(taskB),
        planRevision: state.planRevision,
      }
    })
  }

  function resolveRaceWinner(scope, { raceId, winnerTaskId, commandId }, actor = { kind: 'user', id: 'local-owner' }) {
    if (!raceId || !winnerTaskId) return fail('invalid', 'raceId and winnerTaskId required')
    const cid = typeof commandId === 'string' && commandId.trim() ? commandId.trim() : `race-pick-${randomUUID()}`
    return command(scope, cid, { type: 'resolve_race_winner', raceId, winnerTaskId }, () => {
      const state = stateOf(scope)
      const parent = [...state.tasks.values()].find((t) => t.raceGroup?.raceId === raceId && t.raceGroup?.role === 'parent')
      if (!parent) return fail('not_found', `未找到赛马组 ${raceId}`)
      const candidates = [...state.tasks.values()].filter((t) => t.raceGroup?.raceId === raceId && t.raceGroup?.role === 'candidate')
      const winner = candidates.find((t) => t.taskId === winnerTaskId)
      if (!winner) return fail('not_found', `获胜方案 ${winnerTaskId} 不在赛马组 ${raceId} 中`)
      const losers = candidates.filter((t) => t.taskId !== winnerTaskId)
      const now = new Date().toISOString()

      winner.raceGroup = { ...winner.raceGroup, status: 'winner' }
      if (winner.state === 'review' || winner.state === 'pending') winner.state = 'completed'
      winner.updatedAt = now

      for (const loser of losers) {
        loser.raceGroup = { ...loser.raceGroup, status: 'discarded' }
        if (loser.state !== 'completed' && loser.state !== 'cancelled') {
          loser.state = 'cancelled'
          loser.updatedAt = now
        }
      }

      const winnerMemberId = winner.memberId || winner.raceGroup?.memberId || null
      parent.raceGroup = { ...parent.raceGroup, status: 'resolved', winnerTaskId: winner.taskId, resolvedAt: now }
      parent.state = 'completed'
      parent.memberId = winnerMemberId
      parent.worktree = winner.worktree ? structuredClone(winner.worktree) : parent.worktree
      parent.result = winner.result
        ? { ...structuredClone(winner.result), raceWinner: { raceId, winnerTaskId: winner.taskId, label: winner.raceGroup.label, memberId: winnerMemberId } }
        : { resultId: `race-win-${randomUUID().slice(0, 8)}`, summary: `已采纳赛马方案 ${winner.raceGroup.label}（${winnerMemberId}）`, artifactRefs: [], raceWinner: { raceId, winnerTaskId: winner.taskId, label: winner.raceGroup.label, memberId: winnerMemberId } }
      parent.updatedAt = now
      state.planRevision += 1

      appendEvent(scope, 'race.winner_selected', {
        raceId,
        sourceTaskId: parent.taskId,
        winnerTaskId: winner.taskId,
        winnerLabel: winner.raceGroup.label,
        winnerMemberId,
        discardedTaskIds: losers.map((l) => l.taskId),
      }, actor, parent.taskId)

      return {
        ok: true,
        raceId,
        sourceTaskId: parent.taskId,
        winnerTaskId: winner.taskId,
        winnerMemberId,
        winnerWorktree: winner.worktree ? structuredClone(winner.worktree) : null,
        losers: losers.map((l) => ({ taskId: l.taskId, executionId: l.executionId, worktree: l.worktree ? structuredClone(l.worktree) : null })),
        planRevision: state.planRevision,
      }
    })
  }

  function setDispatchLimits(scope, { dispatchLimits, commandId }, actor) {
    const checked = validateDispatchLimits(dispatchLimits)
    if (!checked.ok) return fail('invalid', checked.detail)
    const { limits } = checked
    return command(scope, commandId, { type: 'dispatch_limits', limits }, () => {
      const state = stateOf(scope)
      const previous = dispatchLimitsOf(state)
      if (previous.maxAttempts !== limits.maxAttempts || previous.maxReworks !== limits.maxReworks) {
        state.dispatchLimits = limits
        appendEvent(scope, 'team.dispatch_limits_updated', { previous, limits }, actor)
      }
      return { ok: true, dispatchLimits: limits }
    })
  }

  function bindSession(sessionId, scope, metadata, member = {}) {
    const existing = bindings.get(sessionId)
    if (existing && existing.teamSessionId !== scope) return fail('conflict', 'session already belongs to another run')
    const state = stateOf(scope)
    if (metadata?.projectId && state.metadata && projectIdOf(scope, state) !== metadata.projectId) {
      return fail('conflict', 'session already belongs to another project')
    }
    if (existing) return { ok: true, binding: existing }
    if (!state.metadata) state.metadata = structuredClone(metadata)
    else if (metadata && typeof metadata === 'object') {
      if (!state.metadata.cwd && metadata.cwd) state.metadata.cwd = metadata.cwd
      if (!state.metadata.workspaceId && metadata.workspaceId) state.metadata.workspaceId = metadata.workspaceId
    }
    const binding = { sessionId, teamSessionId: scope, teamId: state.metadata.teamId,
      roleKind: member.roleKind ?? 'commander', memberId: member.memberId ?? state.metadata.commanderId,
      executionId: member.executionId ?? null,
      ...(member.taskId ? { taskId: member.taskId } : {}) }
    bindings.set(sessionId, binding)
    if (binding.executionId) {
      const execution = state.executions.get(binding.executionId)
      if (execution) execution.nativeSessionRef = { backend: 'hosted', sessionId, hostBootId }
    }
    appendEvent(scope, 'session.bound', binding)
    return { ok: true, binding }
  }

  function continueCompletedRun(sessionId, { decisionId = null, carryBlueprintId = null } = {}) {
    const existing = bindings.get(sessionId)
    if (!existing || existing.roleKind !== 'commander') {
      return fail('not_found', 'commander session binding not found')
    }
    const oldScope = existing.teamSessionId
    const oldState = sessions.get(oldScope)
    if (!oldState || oldState.goalCompletion?.state !== 'completed') {
      return { ok: true, rotated: false, binding: structuredClone(existing) }
    }
    if (typeof decisionId === 'string' && decisionId && oldState.decisions.has(decisionId)) {
      return { ok: true, rotated: false, binding: structuredClone(existing) }
    }
    const baseScope = `run-${sessionId}`
    let seq = 2
    let newScope = `${baseScope}#${seq}`
    while (sessions.has(newScope)) {
      seq += 1
      newScope = `${baseScope}#${seq}`
    }
    const projectRuns = runsForProject(oldScope, oldState)
    const nextPlanRevision = latestPlanRevision(projectRuns)
    const newState = stateOf(newScope)
    newState.metadata = {
      ...structuredClone(oldState.metadata ?? {}),
      projectId: projectIdOf(oldScope, oldState),
      commanderSessionId: sessionId,
      continuedFromRun: oldScope,
    }
    newState.planRevision = nextPlanRevision
    if (oldState.dispatchLimits) {
      newState.dispatchLimits = structuredClone(oldState.dispatchLimits)
    }
    if (typeof carryBlueprintId === 'string' && carryBlueprintId) {
      const bp = oldState.viewObjects.get(carryBlueprintId)
      if (bp && bp.layer === 'team' && bp.semanticKind === 'blueprint') {
        saveViewObjectVersion(newState, structuredClone(bp))
      }
    }
    if (oldState.metadata && !oldState.metadata.commanderSessionId) {
      oldState.metadata.commanderSessionId = sessionId
    }
    const newBinding = {
      ...existing,
      teamSessionId: newScope,
    }
    bindings.set(sessionId, newBinding)
    appendEvent(newScope, 'session.bound', newBinding)
    appendEvent(newScope, 'run.continued', {
      previousTeamSessionId: oldScope,
      projectId: newState.metadata.projectId,
      planRevision: nextPlanRevision,
      ...(carryBlueprintId && newState.viewObjects.has(carryBlueprintId) ? { carriedBlueprintId: carryBlueprintId } : {}),
    })
    return { ok: true, rotated: true, previousTeamSessionId: oldScope, binding: structuredClone(newBinding) }
  }

  function authorizeTask(scope, input, binding, tool) {
    const state = stateOf(scope)
    const task = state.tasks.get(input.taskId)
    if (!task) return fail('not_found', 'task not found')
    if (binding.roleKind === 'worker' && (task.memberId !== binding.memberId || task.executionId !== binding.executionId)) return fail('unauthorized', 'task is not assigned to this member session')
    if (binding.roleKind === 'reviewer') {
      if (binding.taskId && input.taskId !== binding.taskId) return fail('unauthorized', 'task is not assigned to this reviewer session')
      if (binding.executionId) {
        const revExec = state.executions.get(binding.executionId)
        if (!revExec || revExec.kind !== 'review' || revExec.taskId !== task.taskId || revExec.memberId !== binding.memberId) {
          return fail('unauthorized', 'review execution is not assigned to this reviewer session')
        }
        if (task.reviewExecutionId && task.reviewExecutionId !== binding.executionId) {
          return fail('stale', 'review execution has been superseded')
        }
        if (revExec.quarantined === true || ['unknown', 'stopped'].includes(revExec.state)) {
          return fail('stale', 'review execution is no longer active or has been quarantined')
        }
        if (revExec.targetExecutionId !== task.executionId || revExec.targetResultId !== task.result?.resultId) {
          return fail('stale', 'candidate execution or result under review is no longer current')
        }
      }
    }
    if (tool === 'submit_result' && (!task.executionId || input.executionId !== task.executionId)) return fail('stale', 'current executionId required')
    if (['submit_result', 'report_progress'].includes(tool) && binding.roleKind === 'worker' && input.executionId !== binding.executionId) return fail('stale', 'current executionId required')
    if (tool === 'submit_review' && (input.executionId !== task.executionId || input.resultId !== task.result?.resultId)) return fail('stale', 'current executionId and resultId required')
    return { ok: true }
  }

  function requestCancel(scope, taskId, actor, input, canCancel) {
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    if (typeof input.reason !== 'undefined' && (typeof input.reason !== 'string' || !input.reason.trim())) return fail('invalid', 'cancellation reason must be non-empty')
    if (input.executionId && task.executionId !== input.executionId) return fail('stale', 'execution is no longer current')
    if (task.state === 'pending' && !input.executionId) {
      const hasActiveExecution = hasUnsettledTaskExecution(state, taskId)
      const moved = transitionTask(task, { type: 'cancel_requested', hasActiveExecution })
      if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
      task.state = moved.next
      task.updatedAt = new Date().toISOString()
      state.planRevision = latestPlanRevision(runsForProject(scope, state)) + 1
      appendEvent(scope, 'task.cancelled', { reason: input.reason ?? 'pending task cancelled' }, actor, taskId)
      return { ok: true, taskId, executionId: null, state: task.state }
    }
    if (actor?.kind === 'user' && !input.executionId) return fail('stale', 'select the current execution to request interruption')
    const execution = state.executions.get(task.executionId)
    const moved = transitionTask(task, { type: 'cancel_requested', hasActiveExecution: Boolean(execution) })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    if (!['running', 'waiting_input', 'waiting_approval'].includes(execution.state)) return fail('precondition_failed', 'execution cannot be cancelled')
    if (canCancel && !canCancel(execution.executionId)) return fail('precondition_failed', 'this execution has no supported cancellation channel')
    moveExecution(execution, 'cancel_requested')
    appendEvent(scope, 'execution.cancel_requested', input.reason ? { reason: input.reason } : {}, actor, taskId, execution.executionId)
    return { ok: true, taskId, executionId: execution.executionId, state: 'interrupting' }
  }

  function hasUnsettledTaskExecution(state, taskId) {
    return [...state.executions.values()].some((execution) => execution.taskId === taskId && !execution.quarantined &&
      !['finished', 'stopped'].includes(execution.state))
  }

  function unblockTask(scope, { taskId, expectedUpdatedAt, reason }, actor) {
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1200) return fail('invalid', 'describe the resolution in up to 1200 characters')
    if (expectedUpdatedAt !== task.updatedAt) return fail('stale', 'the task changed before its blocker was resolved')
    const moved = transitionTask(task, { type: 'unblock' })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    if (task.needsAdjudication || hasUnsettledTaskExecution(state, taskId)) return fail('precondition_failed', 'resolve the active or unknown execution first')
    const previousReason = task.blockedReason ?? null
    task.state = moved.next
    task.blockedReason = null
    task.updatedAt = new Date().toISOString()
    appendEvent(scope, 'task.unblocked', { previousReason, reason: reason.trim() }, actor, taskId, task.executionId ?? null)
    return { ok: true, taskId, state: task.state }
  }

  function settleExecution(scope, taskId, executionId, outcome) {
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    const execution = state.executions.get(executionId)
    if (!task || !execution || execution.taskId !== taskId) return fail('stale', 'execution is no longer current')
    if (execution.kind !== 'review' && task.executionId !== executionId) return fail('stale', 'execution is no longer current')
    if (['finished', 'stopped', 'unknown'].includes(execution.state)) return { ok: true, state: task.state }
    for (const request of state.requests.values()) if (request.executionId === executionId && ['pending', 'decided'].includes(request.status)) request.status = 'expired'
    if (execution.kind === 'review') {
      if (outcome.status === 'unknown') {
        moveExecution(execution, 'disconnected')
        task.needsAdjudication = true
        execution.unknownReason = outcome.detail ?? '审查执行状态未确认'
        appendEvent(scope, 'execution.unknown', outcome, undefined, taskId, executionId)
      } else if (outcome.status === 'interrupted') {
        moveExecution(execution, 'stop_confirmed', { backendStopped: true })
        appendEvent(scope, 'execution.interrupted', outcome, undefined, taskId, executionId)
      } else {
        if (execution.state === 'interrupting') moveExecution(execution, 'stop_confirmed', { backendStopped: true })
        else moveExecution(execution, 'turn_settled')
        appendEvent(scope, `execution.${outcome.status === 'completed' ? 'settled' : outcome.status}`, outcome, undefined, taskId, executionId)
      }
      return { ok: true, state: task.state }
    }
    if (outcome.status === 'unknown') {
      moveExecution(execution, 'disconnected')
      task.needsAdjudication = true
      task.blockedReason = outcome.detail ?? '原生执行状态未确认'
      execution.unknownReason = task.blockedReason
    } else if (outcome.status === 'interrupted') {
      moveExecution(execution, 'stop_confirmed', { backendStopped: true })
      const moved = transitionTask(task, { type: 'cancel_confirmed', backendStopped: true })
      if (moved.kind === 'ok') task.state = moved.next
    } else {
      // A confirmed turn end is a result candidate, never evidence that acceptance passed.
      if (execution.state === 'interrupting') moveExecution(execution, 'stop_confirmed', { backendStopped: true })
      else moveExecution(execution, 'turn_settled')
      const denied = [...state.requests.values()].some((r) => r.executionId === executionId && r.status === 'delivered' && ['decline', 'cancel'].includes(r.answer?.decision))
      const blockDeniedResult = () => {
        if (!denied) return
        const current = state.tasks.get(taskId)
        const moved = transitionTask(current, { type: 'approval_denied' })
        if (moved.kind !== 'ok') throw new Error(`Invalid approval denial transition: ${current.state}`)
        current.state = moved.next
        current.blockedReason = '审批被拒，本次结果未完成；需重新规划或调整权限'
        current.result.outcome = 'approval_denied'
        appendEvent(scope, 'task.blocked', { reason: 'approval_denied' }, undefined, taskId, executionId)
      }
      if (task.result?.executionId === executionId) {
        blockDeniedResult()
        appendEvent(scope, 'execution.settled', outcome, undefined, taskId, executionId)
        return { ok: true, state: task.state }
      }
      const submitted = completeExecution(scope, taskId, { summary: outcome.text ?? outcome.detail ?? '', checksPassed: false,
        needsReview: outcome.status === 'completed' && !outcome.resultMissing, blockReason: outcome.status === 'completed' ? '验收尚未确认' : (outcome.detail ?? '执行失败'), connector: execution.connectorId })
      if (!submitted.ok) return submitted
      blockDeniedResult()
    }
    appendEvent(scope, `execution.${outcome.status}`, outcome, undefined, taskId, executionId)
    return { ok: true, state: state.tasks.get(taskId).state }
  }

  function askTaskQuestion(scope, input, binding) {
    const { taskId, executionId } = binding
    if (!taskId || !executionId || !['worker', 'reviewer'].includes(binding.roleKind)) return fail('unauthorized', 'a bound member execution is required')
    const access = authorizeTask(scope, { taskId }, binding, 'ask_task_question')
    if (!access.ok) return access
    const state = stateOf(scope)
    const { question, artifactCell, reuseConfirmedAnswer } = input
    if (typeof question !== 'string' || !question.trim() || question.length > 600 ||
        (reuseConfirmedAnswer !== undefined && typeof reuseConfirmedAnswer !== 'boolean')) {
      return fail('invalid', 'a question of up to 600 characters is required')
    }

    let text = question.trim()
    let facts = []
    if (artifactCell !== undefined) {
      const { teamSessionId, id, version, row, column } = artifactCell ?? {}
      if (typeof teamSessionId !== 'string' || !teamSessionId || typeof id !== 'string' || !id || id.length > 100 ||
          !Number.isSafeInteger(version) || version < 1 || !Number.isSafeInteger(row) || row < 1 ||
          typeof column !== 'string' || !column.trim() || column.length > 120) {
        return fail('invalid', 'artifactCell requires a pinned table, a 1-based row and an exact column name')
      }
      const source = sessions.get(teamSessionId)
      const target = source && projectIdOf(scope, state) === projectIdOf(teamSessionId, source)
        ? viewObjectVersion(source, id, version) : null
      // Answer the literal cell lookup only. The note supplied by the member cannot redefine it.
      text = `表格 ${id}@v${version} 第 ${row} 行「${column}」的值是什么？`
      if (isProjectViewObject(target) && target.type === 'table') {
        const columns = target.data.columns.flatMap((name, index) => name === column ? [index] : [])
        const value = target.data.rows[row - 1]?.[columns[0]]
        if (columns.length === 1 && value != null && String(value).trim() && String(value).length <= 1200) {
          facts = [{ values: [String(value)], source: 'artifact', verified: true,
            evidenceRef: { teamSessionId, id, version, row, column }, verifiedAt: new Date().toISOString() }]
        }
      }
    } else if (reuseConfirmedAnswer === true) {
      const candidates = new Map()
      for (const previous of state.requests.values()) {
        if (previous.taskId !== taskId || previous.kind !== 'question' || previous.status !== 'delivered' || previous.actor?.kind !== 'user') continue
        if (previous.payload.questions?.length !== 1) continue
        const [asked] = previous.payload.questions
        const values = previous.answer?.answers?.[asked.id]?.answers
        if (asked.question === text && values?.length === 1 && typeof values[0] === 'string' && values[0].length <= 1200) candidates.set(values[0], {
          values, source: 'user', verified: false, evidenceRef: { teamSessionId: scope, requestId: previous.requestId },
        })
      }
      if (candidates.size === 1) facts = [...candidates.values()]
    }

    if (state.executions.get(executionId)?.state !== 'running') return fail('precondition_failed', 'execution must be running before asking a question')
    const result = recordExecutionEvent(scope, taskId, {
      type: 'question.requested', requestId: `task-question-${randomUUID()}`, responseMode: 'next_turn',
      payload: { questions: [{ id: 'answer', question: text }] },
    }, executionId)
    if (!result.ok) return result
    if (facts.length === 1) {
      const [{ values, ...source }] = facts
      const decision = decideRequest(scope, {
        requestId: result.requestId, commandId: `source-${result.requestId}`, answer: { answers: { answer: { answers: values } } },
      }, { kind: 'runtime', id: 'concerto' }, [{ ...source, questionId: 'answer' }])
      if (!decision.ok) return decision
    }
    return { ok: true, request: structuredClone(state.requests.get(result.requestId)) }
  }

  function decideRequest(scope, input, actor, facts) {
    const state = stateOf(scope)
    const request = state.requests.get(input.requestId)
    if (!request) return fail('not_found', 'request not found')
    const hash = JSON.stringify(input.answer)
    if (request.commandId === input.commandId) return request.answerHash === hash ? { ok: true, request, replayed: true } : fail('conflict', 'command reused with different answer')
    const task = state.tasks.get(request.taskId)
    const execution = state.executions.get(request.executionId)
    const currentForExec = execution?.kind === 'review'
      ? (task?.state === 'review' && execution.taskId === task.taskId && (!task.reviewExecutionId || task.reviewExecutionId === request.executionId))
      : (task?.executionId === request.executionId)
    if (request.status !== 'pending' || !execution || !currentForExec) return fail('precondition_failed', 'request is no longer pending')
    if (!['waiting_input', 'waiting_approval'].includes(execution.state)) return fail('precondition_failed', 'execution is no longer waiting for input')
    if (request.kind === 'approval' && !['accept', 'decline', 'cancel'].includes(input.answer?.decision)) return fail('invalid', 'decision must be accept, decline or cancel')
    if (request.kind === 'question') {
      if (actor?.kind !== 'user' && !facts) return fail('unauthorized', 'question answers need explicit user input or a resolved source')
      for (const question of request.payload.questions) {
        const answers = input.answer?.answers?.[question.id]?.answers
        if (!Array.isArray(answers) || answers.length === 0 || answers.some((a) => typeof a !== 'string' || !a.trim())) return fail('invalid', `answer required for ${question.id}`)
      }
      request.answerFacts = facts ?? request.payload.questions.map((question) => ({
        questionId: question.id, source: 'user', verified: false, evidenceRef: { teamSessionId: scope, requestId: request.requestId },
      }))
    }
    Object.assign(request, { commandId: input.commandId, answerHash: hash, answer: input.answer, actor, status: 'decided' })
    recordActivity(scope, {
      memberId: request.memberId,
      kind: 'request',
      taskId: request.taskId,
      executionId: request.executionId,
      summary: request.kind === 'approval' ? `审批已处理：${input.answer?.decision}` : '提问已回复',
      detail: { requestId: request.requestId, kind: request.kind, status: 'decided', answer: input.answer },
    })
    appendEvent(scope, `${request.kind}.decided`, { requestId: request.requestId, answer: input.answer, ...(request.answerFacts ? { answerFacts: request.answerFacts } : {}) }, actor, request.taskId, request.executionId)
    return { ok: true, request: structuredClone(request) }
  }

  function delivery(scope, requestId, delivered, detail) {
    const state = stateOf(scope)
    const request = state.requests.get(requestId)
    if (!request || request.status !== 'decided') return fail('precondition_failed', 'request is not awaiting delivery')
    request.status = delivered ? 'delivered' : 'delivery_failed'
    request.detail = detail ?? null
    const execution = state.executions.get(request.executionId)
    if (delivered) resumeAfterRequests(state, execution)
    appendEvent(scope, `${request.kind}.${request.status}`, { requestId, detail }, request.actor, request.taskId, request.executionId)
    return { ok: true }
  }

  function resumeAfterRequests(state, execution) {
    const outstanding = [...state.requests.values()].some((r) => r.executionId === execution.executionId && r.status !== 'delivered' && r.status !== 'expired')
    if (!outstanding && ['waiting_input', 'waiting_approval'].includes(execution.state)) moveExecution(execution, execution.state === 'waiting_input' ? 'answer_delivered' : 'approval_decided')
  }

  function adjudicate(scope, input, actor, evidence) {
    return command(scope, input.commandId, { type: 'adjudicate', input }, () => {
      const state = stateOf(scope), task = state.tasks.get(input.taskId)
      const execution = state.executions.get(input.executionId)
      if (!task || !execution || execution.taskId !== input.taskId) return fail('stale', 'current task and execution required')
      const isForceRelease = input.action === 'force_release'
      const settleQuarantined = execution.quarantined === true && (input.action === 'confirm_failed' || isForceRelease)
      if (!settleQuarantined && execution.kind !== 'review' && task.executionId !== input.executionId) return fail('stale', 'current task and execution required')
      if (execution.state !== 'unknown') return fail('precondition_failed', 'execution is not unknown')
      if (typeof input.reason !== 'string' || !input.reason.trim()) return fail('invalid', 'adjudication reason required')
      if (input.action === 'accept') {
        if (actor?.kind !== 'user') return fail('unauthorized', 'only the local user can accept an unknown delivery')
        const candidate = unknownDelivery(task, execution)
        if (!candidate) return fail('precondition_failed', 'the current execution has no verified delivery artifact')
        if (input.resultId !== candidate.resultId) return fail('stale', 'the result to accept has changed')
        const checked = checkPinnedDelivery(state, task)
        if (!checked.ok) return checked
        const moved = transitionTask(task, { type: 'adjudicate_accept', hasVerifiedArtifact: true, requiresReview: candidate.requiresReview })
        if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
        const accepted = { ...candidate, reason: input.reason.trim(), at: new Date().toISOString() }
        execution.quarantined = true
        execution.deliveryAccepted = { ...accepted, actor: structuredClone(actor) }
        task.state = moved.next
        task.needsAdjudication = [...state.executions.values()].some((entry) => entry.taskId === task.taskId && entry.state === 'unknown' && !entry.quarantined)
        task.blockedReason = null
        task.updatedAt = accepted.at
        appendEvent(scope, 'execution.adjudicated', { action: input.action, ...accepted, workspaceReserved: true }, actor, task.taskId, execution.executionId)
        return { ok: true, state: task.state, executionState: execution.state, workspaceReserved: true, resultId: candidate.resultId }
      }
      if (execution.kind === 'review' && !settleQuarantined && task.needsAdjudication !== true) {
        return fail('invalid_transition', 'no_pending_adjudication')
      }
      const stopProofKinds = ['hosted_idle', 'codex_reconcile_stopped']
      let useVerifiedStop = false
      if (input.action === 'confirm_failed') {
        if (!stopProofKinds.includes(evidence?.kind) || evidence?.verified === false) {
          return fail('precondition_failed', 'no verified native stop evidence; cannot release workspace')
        }
        useVerifiedStop = true
      } else if (isForceRelease) {
        if (actor?.kind !== 'user') return fail('unauthorized', 'only the local user can force release an unconfirmed workspace lock')
        if (input.confirmUnverifiedRelease !== true) return fail('precondition_failed', 'explicit user risk acknowledgement (confirmUnverifiedRelease: true) required')
        const hasStopProof = stopProofKinds.includes(evidence?.kind) && evidence?.verified !== false
        const hasUserRiskProof = evidence?.kind === 'user_force_release'
          && evidence?.acknowledgedUnverified === true
          && evidence?.reconcileKind !== 'hosted_active'
          && evidence?.pidAlive !== true
        if (!hasStopProof && !hasUserRiskProof) {
          return fail('precondition_failed', 'explicit force_release confirmation or stop proof required; active backend cannot be force-released')
        }
        useVerifiedStop = hasStopProof
      }

      const applyStopOrForceTransition = () => {
        moveExecution(
          execution,
          useVerifiedStop ? 'reconcile_stopped' : 'force_released_unverified',
          useVerifiedStop ? {} : { userRiskAccepted: true },
        )
        if (!useVerifiedStop) {
          execution.forcedRelease = {
            at: new Date().toISOString(),
            by: structuredClone(actor),
            reason: input.reason.trim(),
            evidence: structuredClone(evidence ?? null),
          }
        }
      }

      if (settleQuarantined) {
        applyStopOrForceTransition()
        execution.quarantined = false
        appendEvent(scope, 'execution.adjudicated', {
          action: input.action,
          reason: input.reason.trim(),
          evidence,
          kind: execution.kind,
          ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
        }, actor, task.taskId, execution.executionId)
        return {
          ok: true,
          state: task.state,
          executionState: execution.state,
          retryCwd: task.retryCwd ?? null,
          ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
        }
      }

      if (execution.kind === 'review') {
        if (input.action === 'confirm_failed' || isForceRelease) {
          applyStopOrForceTransition()
        } else if (input.action === 'retry_isolated') {
          if (evidence?.kind !== 'fresh_directory' || input.externalEffectsReviewed !== true) return fail('precondition_failed', 'fresh isolated directory and external-effects review required')
          const isHosted = String(execution.connectorId || '').startsWith('hosted:') || execution.nativeSessionRef?.backend === 'hosted'
          const isBoundedCodex = execution.connectorId === 'codex' && ['read-only', 'workspace-write'].includes(execution.sandbox)
          const isBoundedHosted = isHosted && execution.sandbox !== 'danger-full-access'
          if (!isBoundedCodex && !isBoundedHosted) return fail('precondition_failed', 'unrestricted execution requires native stop evidence')
          if ([...sessions.values()].some((run) => [...run.executions.values()].some((e) => !['finished', 'stopped'].includes(e.state) && scopesOverlap(e.writeScope, evidence.cwd)))) return fail('precondition_failed', 'isolation overlaps a reserved workspace')
          task.retryCwd = workspaceKey(evidence.cwd)
          task.retryWorktree = evidence.worktree ? structuredClone(evidence.worktree) : null
          execution.quarantined = true
        } else return fail('invalid', 'action must be confirm_failed, retry_isolated or force_release')
        const hasOtherUnknown = [...state.executions.values()].some((e) => e.taskId === task.taskId && e.executionId !== execution.executionId && e.state === 'unknown' && !e.quarantined)
        task.needsAdjudication = hasOtherUnknown
        if (task.reviewExecutionId === execution.executionId) task.reviewExecutionId = null
        task.updatedAt = new Date().toISOString()
        appendEvent(scope, 'execution.adjudicated', {
          action: input.action,
          reason: input.reason.trim(),
          evidence,
          kind: 'review',
          ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
        }, actor, task.taskId, execution.executionId)
        return {
          ok: true,
          state: task.state,
          executionState: execution.state,
          retryCwd: task.retryCwd ?? null,
          ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
        }
      }

      let moved
      if (input.action === 'confirm_failed' || isForceRelease) {
        moved = transitionTask(task, { type: 'adjudicate_abandon', stopConfirmedOrIsolated: true })
        if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
        applyStopOrForceTransition()
      } else if (input.action === 'retry_isolated') {
        if (evidence?.kind !== 'fresh_directory' || input.externalEffectsReviewed !== true) return fail('precondition_failed', 'fresh isolated directory and external-effects review required')
        const isHosted = String(execution.connectorId || '').startsWith('hosted:') || execution.nativeSessionRef?.backend === 'hosted'
        const isBoundedCodex = execution.connectorId === 'codex' && ['read-only', 'workspace-write'].includes(execution.sandbox)
        const isBoundedHosted = isHosted && execution.sandbox !== 'danger-full-access'
        if (!isBoundedCodex && !isBoundedHosted) return fail('precondition_failed', 'unrestricted execution requires native stop evidence')
        if ([...sessions.values()].some((run) => [...run.executions.values()].some((e) => !['finished', 'stopped'].includes(e.state) && scopesOverlap(e.writeScope, evidence.cwd)))) return fail('precondition_failed', 'isolation overlaps a reserved workspace')
        moved = transitionTask(task, { type: 'adjudicate_retry', isolated: true })
        if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
        task.retryCwd = workspaceKey(evidence.cwd)
        task.retryWorktree = evidence.worktree ? structuredClone(evidence.worktree) : null
        execution.quarantined = true // Original workspace remains reserved. This is not a stop observation.
      } else return fail('invalid', 'action must be accept, confirm_failed, retry_isolated or force_release')
      task.state = moved.next
      task.needsAdjudication = false
      task.blockedReason = null
      task.updatedAt = new Date().toISOString()
      appendEvent(scope, 'execution.adjudicated', {
        action: input.action,
        reason: input.reason.trim(),
        evidence,
        ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
      }, actor, task.taskId, execution.executionId)
      return {
        ok: true,
        state: task.state,
        executionState: execution.state,
        retryCwd: task.retryCwd ?? null,
        ...(isForceRelease ? { forcedUnverified: !useVerifiedStop } : {}),
      }
    })
  }

  let recovered = false
  for (const [scope, state] of sessions) {
    if (state.goalCompletion?.skillOffer?.status !== 'pending') continue
    settleCloseoutSkill(scope, 'interrupted', { kind: 'runtime', id: 'concerto' })
    recovered = true
  }
  // Previously live processes cannot be inferred to have stopped after a restart.
  for (const [scope, state] of sessions) for (const execution of state.executions.values()) {
    if (!['running', 'waiting_input', 'waiting_approval', 'interrupting'].includes(execution.state)) continue
    recovered = true
    moveExecution(execution, 'disconnected')
    state.tasks.get(execution.taskId).needsAdjudication = true
    for (const request of state.requests.values()) if (request.executionId === execution.executionId && ['pending', 'decided'].includes(request.status)) request.status = 'expired'
    appendEvent(scope, 'execution.unknown', { reason: 'host restarted; backend state unconfirmed' }, undefined, execution.taskId, execution.executionId)
  }

  if (recovered || migrated) persist()

  function resolveTaskAndExecution(state, input, actor) {
    let task = null
    if (input.taskId) {
      task = state.tasks.get(input.taskId)
      if (!task) return fail('not_found', 'task not found')
      if (actor?.role === 'worker' && task.memberId && task.memberId !== actor.id) {
        return fail('unauthorized', 'task is assigned to another member')
      }
    }
    let resolvedExecutionId = input.executionId ?? null
    if (resolvedExecutionId) {
      const exec = state.executions.get(resolvedExecutionId)
      if (!exec) return fail('not_found', 'execution not found')
      if (task && exec.taskId !== task.taskId) return fail('invalid', 'executionId does not belong to taskId')
      if (['worker', 'reviewer'].includes(actor?.role) && exec.memberId !== actor.id) {
        return fail('unauthorized', 'execution belongs to another member')
      }
    } else if (actor?.role === 'reviewer' && task) {
      const revExec = [...state.executions.values()].reverse().find((e) => e.taskId === task.taskId && e.kind === 'review' && e.memberId === actor.id)
      if (revExec) resolvedExecutionId = revExec.executionId
    } else if (task?.executionId) {
      const exec = state.executions.get(task.executionId)
      if (exec && (!actor?.id || actor.role === 'runtime' || exec.memberId === actor.id)) {
        resolvedExecutionId = exec.executionId
      }
    }
    return { ok: true, taskId: input.taskId ?? null, executionId: resolvedExecutionId }
  }

  function stripChecklistChecked(item) {
    if (!item || typeof item !== 'object') return item
    const out = {}
    for (const key of Object.keys(item).sort()) {
      if (key !== 'checked' && item[key] !== undefined) out[key] = item[key]
    }
    return out
  }

  function isChecklistCheckedOnlyPatch(existing, nextData, input) {
    if (existing?.type !== 'checklist' || input?.op !== 'upsert_items') return false
    if (input.title !== undefined && String(input.title).trim() !== existing.title) return false
    if (input.caption !== undefined && String(input.caption).trim() !== (existing.caption || '')) return false
    const prevItems = existing.data?.items
    const nextItems = nextData?.items
    if (!Array.isArray(prevItems) || !Array.isArray(nextItems) || prevItems.length !== nextItems.length) return false
    return prevItems.every((item, idx) =>
      JSON.stringify(stripChecklistChecked(item)) === JSON.stringify(stripChecklistChecked(nextItems[idx]))
    )
  }

  function canEditViewObject(existing, actor) {
    if (!actor || actor.kind === 'runtime') return true
    if (existing.source === 'user_import' && actor.kind === 'member') return false
    const actorId = String(actor.id || '')
    const ownerId = existing.ownerId || existing.authorId
    if (actorId && actorId === ownerId) return true
    if (Array.isArray(existing.editableBy) && (existing.editableBy.includes(actorId) || (actor.role && existing.editableBy.includes(actor.role)))) {
      return true
    }
    return false
  }

  function isVersionReferenced(state, objectId, version) {
    const matches = (ref) => ref?.id === objectId && ref.version === version
    const currentPlan = state.planApproval?.planRef
    if (matches(currentPlan)) return true
    if (state.events.some((event) => event.type === 'plan.approved' && matches(event.payload?.planRef))) return true
    for (const execution of state.executions.values()) {
      if (matches(execution.planRef)) return true
    }
    for (const task of state.tasks.values()) {
      for (const change of task.checklistChanges ?? []) {
        if (change.viewId === objectId && (change.fromVersion === version || change.version === version)) return true
        if (change.reports.some((report) =>
          (report.viewId === objectId && report.version === version) ||
          report.evidence.some(({ artifact }) => matches(artifact)))) return true
      }
      for (const thread of task.reviewFeedback ?? []) {
        if (matches(thread.target.artifact) || thread.updates.some((update) =>
          update.evidence?.some(({ artifact }) => matches(artifact)))) return true
      }
      const refs = [
        ...(Array.isArray(task.result?.artifactRefs) ? task.result.artifactRefs : []),
        ...(Array.isArray(task.review?.evidenceRefs) ? task.review.evidenceRefs : []),
      ]
      for (const ref of refs) {
        if (typeof ref !== 'string') continue
        if (ref.includes(`${objectId}@v${version}`) || ref.includes(`${objectId}:v${version}`) || ref.includes(`${objectId}@${version}`)) {
          return true
        }
      }
      if (task.review && task.viewObjectVersions?.[objectId] === version) {
        return true
      }
    }
    const pub = normalizePublicView(state.publicView)
    for (const ref of pub.pinnedRefs) {
      if (ref?.id === objectId && ref?.version === version) return true
    }
    return false
  }

  function saveViewObjectVersion(state, record) {
    state.viewObjects.set(record.id, record)
    const hist = state.viewObjectHistory.get(record.id) ?? []
    const existingIdx = hist.findIndex((h) => h.version === record.version)
    if (existingIdx >= 0) hist[existingIdx] = structuredClone(record)
    else hist.push(structuredClone(record))
    if (hist.length > 20) {
      const keep = []
      const unpinned = []
      for (const item of hist) {
        if (item.pinned === true || isVersionReferenced(state, record.id, item.version)) keep.push(item)
        else unpinned.push(item)
      }
      const trimmedUnpinned = unpinned.slice(-20)
      const merged = [...keep, ...trimmedUnpinned].sort((a, b) => a.version - b.version)
      state.viewObjectHistory.set(record.id, merged)
    } else {
      state.viewObjectHistory.set(record.id, hist)
    }
  }

  function viewMutation(scope, mutationId, payload, run) {
    if (mutationId !== undefined && (typeof mutationId !== 'string' || mutationId === '')) {
      return fail('invalid', 'mutationId must be a non-empty string')
    }
    if (mutationId) {
      return command(scope, `view:${mutationId}`, payload, run)
    }
    return run()
  }

  function projectIdOf(scope, state) {
    return state?.metadata?.projectId || scope
  }

  function runsForProject(scope, state) {
    const projectId = projectIdOf(scope, state)
    return [...sessions].filter(([runId, run]) => projectIdOf(runId, run) === projectId)
  }

  function latestPlanRevision(runs) {
    return runs.reduce((latest, [, run]) => Math.max(latest, run.planRevision), 1)
  }

  function projectExperienceRecords(scope, state) {
    return runsForProject(scope, state).flatMap(([, run]) => [...experienceRecords(run.events).values()])
  }

  function canReadExperienceSkill(projectId, ref, memberContext) {
    const skill = projectSkills.get(projectId)?.get(ref.id)?.versions.get(ref.version)
    return checkSkillEligibility(skill, memberContext).eligible
  }

  function recordExperience(scope, input, binding, capabilities) {
    const checked = normalizeExperience(input)
    if (!checked.ok) return checked
    const state = sessions.get(scope)
    if (!state?.metadata) return fail('not_found', 'experience project not found')
    const access = authorizeTask(scope, input, binding, 'record_experience')
    if (!access.ok) return access
    const task = state.tasks.get(input.taskId)
    const executionId = binding.roleKind === 'commander' ? task.executionId : binding.executionId
    if (!executionId || state.executions.get(executionId)?.taskId !== task.taskId) {
      return fail('precondition_failed', 'a bound task execution is required to record experience')
    }
    const actor = { kind: 'member', id: binding.memberId, role: binding.roleKind }
    const { mutationId, ...observation } = checked.normalized
    return command(scope, `experience:${mutationId}`, { actor, taskId: task.taskId, executionId, observation }, () => {
      const projectId = projectIdOf(scope, state)
      let id = `exp-${randomUUID()}`
      let version = 1
      const related = observation.basedOn
      if (related?.kind === 'experience') {
        const records = projectExperienceRecords(scope, state).filter((item) => item.id === related.id)
        if (!records.some((item) => item.version === related.version && item.proof)) {
          return fail('not_found', 'linked project experience version not found')
        }
        id = related.id
        version = 1 + Math.max(...records.map((item) => item.version))
      } else if (related?.kind === 'skill' && !canReadExperienceSkill(projectId, related, { roleKind: binding.roleKind, capabilities })) {
        return fail('not_found', 'linked project skill version not found')
      }

      const evidence = bindExperienceEvidence(state, task, executionId, observation)
      if (!evidence.ok) return evidence
      const ref = `experience:${id}@v${version}`
      const { evidenceRefs, boundRefs, proof } = evidence
      appendEvent(scope, 'experience.recorded', {
        ...observation, id, version, ref, targetExecutionId: task.executionId,
        evidenceRefs, boundRefs, ...(proof ? { proof } : {}),
      }, actor, task.taskId, executionId)
      return { ok: true, id, version, ref, status: proof ? 'searchable' : 'recorded' }
    })
  }

  const maxDutyLength = 4096

  function memberDutyKey(metadata, memberId) {
    return JSON.stringify([metadata?.projectId, metadata?.teamId, memberId])
  }

  function dutyScope(scope, memberId) {
    const metadata = sessions.get(scope)?.metadata
    if (!metadata?.projectId || !metadata.teamId) return fail('not_found', '找不到项目团队。')
    if (!metadata.members?.some((member) => member.id === memberId && ['worker', 'reviewer'].includes(member.roleKind))) {
      return fail('not_found', '找不到当前团队中可派发任务的成员。')
    }
    return { ok: true, metadata, key: memberDutyKey(metadata, memberId) }
  }

  function dutyHistory(versions) {
    return structuredClone({ ok: true, current: versions.at(-1) ?? null, versions, maxLength: maxDutyLength })
  }

  function readMemberDuties(scope, memberId) {
    const target = dutyScope(scope, memberId)
    return target.ok ? dutyHistory(memberDuties.get(target.key) ?? []) : target
  }

  function updateMemberDuties(scope, { memberId, action, body, expectedVersion }, actor) {
    const target = dutyScope(scope, memberId)
    if (!target.ok) return target
    const { metadata, key } = target
    if (actor?.kind !== 'user' && !(actor?.kind === 'member' && actor.role === 'commander' && actor.id === metadata.commanderId)) {
      return fail('unauthorized', '只有用户和当前团队的指挥者可以更新成员职责。')
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return fail('invalid', '请提供有效的预期版本。')
    const versions = memberDuties.get(key) ?? []
    const current = versions.at(-1)
    const version = current?.version ?? 0
    if (expectedVersion !== version) return fail('conflict', `职责补充已更新至 v${version}，请重新读取后再修改。`)

    const active = action === 'save'
    if (!active && action !== 'revoke') return fail('invalid', '请选择保存或撤销。')
    const content = active && typeof body === 'string' ? body.trim() : ''
    if (active && (!content || content.length > maxDutyLength)) return fail('invalid', `职责正文须为 1 到 ${maxDutyLength} 个字符。`)
    if (!active && !current?.active) return fail('precondition_failed', '当前没有可撤销的职责补充。')

    const next = [...versions, {
      projectId: metadata.projectId,
      teamId: metadata.teamId,
      memberId,
      version: version + 1,
      body: content,
      contentHash: createHash('sha256').update(content).digest('hex'),
      author: structuredClone(actor),
      updatedAt: new Date().toISOString(),
      active,
    }]
    memberDuties.set(key, next)
    return dutyHistory(next)
  }

  function freezeMemberDuties(metadata, memberId) {
    const current = memberDuties.get(memberDutyKey(metadata, memberId))?.at(-1)
    return current?.active ? structuredClone(current) : null
  }

  function getProjectSkillMap(projectId) {
    let map = projectSkills.get(projectId)
    if (!map) {
      map = new Map()
      projectSkills.set(projectId, map)
    }
    return map
  }

  function resolveMemberContext(actor, memberContext) {
    const roleKind = memberContext?.roleKind || actor?.role || 'commander'
    return {
      roleKind,
      capabilities: memberContext?.capabilities ?? null,
      executionId: memberContext?.executionId ?? null,
    }
  }

  function readSkillImpl(scope, input = {}, actor = null, memberContext = null) {
    if (!input || typeof input.id !== 'string' || input.id.trim() === '') {
      return fail('invalid', 'skill id is required')
    }
    const id = input.id.trim()
    const state = stateOf(scope)
    const ctxInfo = resolveMemberContext(actor, memberContext)
    const requestedKind = input.kind && ['workflow', 'project'].includes(input.kind)
      ? input.kind
      : (WORKFLOW_SKILL_MAP.has(id) ? 'workflow' : 'project')

    if (requestedKind === 'workflow') {
      const skill = WORKFLOW_SKILL_MAP.get(id)
      if (!skill) return fail('not_found', `workflow skill "${id}" not found`)
      if (input.version !== undefined && input.version !== skill.version) {
        return fail('not_found', `workflow skill "${id}" version ${input.version} not found`)
      }
      const elig = checkSkillEligibility(skill, ctxInfo)
      if (!elig.eligible) {
        const code = Array.isArray(skill.allowedRoles) && !skill.allowedRoles.includes(ctxInfo.roleKind)
          ? 'unauthorized'
          : 'capability_mismatch'
        return fail(code, elig.reason)
      }
      const out = formatSkillReadPayload(skill, input.topic)
      if (!out.ok) return out
      const at = new Date().toISOString()
      state.loadedSkills.set(skill.id, {
        id: skill.id,
        kind: 'workflow',
        version: skill.version,
        contentHash: skill.contentHash,
        loadedBy: String(actor?.id || 'runtime'),
        roleKind: ctxInfo.roleKind,
        ...(ctxInfo.executionId ? { executionId: ctxInfo.executionId } : {}),
        ...(input.topic ? { topic: String(input.topic).trim() } : {}),
        loadedAt: at,
      })
      appendEvent(scope, 'skill.loaded', {
        id: skill.id,
        kind: 'workflow',
        version: skill.version,
        contentHash: skill.contentHash,
        ...(input.topic ? { topic: String(input.topic).trim() } : {}),
      }, actor ?? { kind: 'runtime', id: 'concerto' }, null, ctxInfo.executionId)
      return out
    }

    return readProjectSkillImpl(scope, input, actor, memberContext)
  }

  function readProjectSkillImpl(scope, input = {}, actor = null, memberContext = null) {
    if (!input || typeof input.id !== 'string' || input.id.trim() === '') {
      return fail('invalid', 'project skill id is required')
    }
    const id = input.id.trim()
    const state = stateOf(scope)
    const projectId = projectIdOf(scope, state)
    const entry = projectSkills.get(projectId)?.get(id)
    if (!entry) return fail('not_found', `project skill "${id}" not found in project "${projectId}"`)
    let targetVersion = entry.latestVersion
    if (input.version !== undefined) {
      if (!Number.isInteger(input.version) || input.version < 1) {
        return fail('invalid', 'version must be a positive integer')
      }
      targetVersion = input.version
    }
    const skill = entry.versions.get(targetVersion)
    if (!skill) return fail('not_found', `project skill "${id}" version ${targetVersion} not found`)
    const ctxInfo = resolveMemberContext(actor, memberContext)
    const elig = checkSkillEligibility(skill, ctxInfo)
    if (!elig.eligible) return fail('capability_mismatch', elig.reason)
    const out = formatSkillReadPayload(skill, input.topic)
    if (!out.ok) return out
    const at = new Date().toISOString()
    state.loadedSkills.set(`project:${skill.id}`, {
      id: skill.id,
      kind: 'project',
      projectId,
      version: skill.version,
      contentHash: skill.contentHash,
      loadedBy: String(actor?.id || 'runtime'),
      roleKind: ctxInfo.roleKind,
      ...(ctxInfo.executionId ? { executionId: ctxInfo.executionId } : {}),
      loadedAt: at,
    })
    appendEvent(scope, 'skill.loaded', {
      id: skill.id,
      kind: 'project',
      projectId,
      version: skill.version,
      contentHash: skill.contentHash,
    }, actor ?? { kind: 'runtime', id: 'concerto' }, null, ctxInfo.executionId)
    return out
  }

  function publishProjectSkillImpl(scope, input = {}, actor = { kind: 'runtime', id: 'concerto', role: 'commander' }) {
    if (actor?.kind !== 'runtime' && actor?.role !== 'commander') {
      return fail('unauthorized', 'only commander can publish or revise project skills')
    }
    const checked = validateProjectSkillInput(input)
    if (!checked.ok) return checked
    const state = stateOf(scope)
    const projectId = projectIdOf(scope, state)
    const norm = checked.normalized

    const run = () => {
      if (state.goalCompletion) {
        if (state.goalCompletion.skillOffer?.status !== 'approved') {
          return fail('precondition_failed', 'the user must approve saving closeout experience')
        }
        if (norm.sourceRefs.length === 0) return fail('invalid', 'closeout experience requires sourceRefs')
      }
      const authoringSpec = WORKFLOW_SKILL_MAP.get('project-skill-authoring')
      const loadedSpec = state.loadedSkills.get('project-skill-authoring')
      if (actor?.kind !== 'runtime' && (!loadedSpec || loadedSpec.version !== authoringSpec.version || loadedSpec.contentHash !== authoringSpec.contentHash)) {
        return fail('precondition_failed', 'must load workflow skill "project-skill-authoring" via read_skill before creating or revising a project skill')
      }
      const projMap = getProjectSkillMap(projectId)
      const existing = projMap.get(norm.id) ?? null
      if (existing) {
        if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== existing.latestVersion) {
          return fail(
            'stale',
            input.expectedVersion === undefined
              ? `project skill "${norm.id}" already exists at version ${existing.latestVersion}; expectedVersion is required to revise`
              : `expected version ${input.expectedVersion}, current ${existing.latestVersion}`,
          )
        }
      } else if (input.expectedVersion !== undefined && input.expectedVersion !== 0) {
        return fail('stale', `expected version ${input.expectedVersion}, project skill does not exist`)
      }
      const version = (existing?.latestVersion ?? 0) + 1
      const at = new Date().toISOString()
      const actorId = String(actor?.id || 'concerto')
      const contentHash = hashSkillContent(norm)
      const authoringSpecRef = {
        id: authoringSpec.id,
        version: authoringSpec.version,
        contentHash: authoringSpec.contentHash,
      }
      const record = {
        ...norm,
        projectId,
        version,
        contentHash,
        authorId: actorId,
        authorRole: String(actor?.role || actor?.kind || 'commander'),
        authoringSpecRef,
        createdAt: existing?.versions.get(1)?.createdAt ?? at,
        updatedAt: at,
        source: actor?.kind === 'member' ? 'commander_tool' : 'runtime',
      }
      if (existing) {
        existing.latestVersion = version
        existing.versions.set(version, record)
      } else {
        projMap.set(norm.id, {
          id: norm.id,
          projectId,
          latestVersion: version,
          versions: new Map([[version, record]]),
        })
      }
      recordActivity(scope, {
        memberId: actorId,
        kind: 'object_published',
        summary: `${existing ? '修订' : '发布'}项目方法 ${record.id} (v${record.version})`,
        text: record.description,
        detail: {
          skillId: record.id,
          projectId,
          version: record.version,
          contentHash: record.contentHash,
          authoringSpecRef,
        },
      })
      appendEvent(scope, 'project.skill.published', {
        id: record.id,
        projectId,
        version: record.version,
        contentHash: record.contentHash,
        authoringSpecRef,
      }, actor)
      return {
        ok: true,
        replayed: false,
        id: record.id,
        kind: 'project',
        projectId,
        version: record.version,
        contentHash: record.contentHash,
        authorId: record.authorId,
        authoringSpecRef,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }
    }

    if (input.mutationId !== undefined) {
      return command(scope, `skill:${input.mutationId}`, { op: 'publish_project_skill', ...norm, expectedVersion: input.expectedVersion ?? null }, run)
    }
    return run()
  }

  function resolveSkillRefsForDispatch(scope, skillRefs, targetContext = {}) {
    if (skillRefs === undefined || skillRefs === null) return { ok: true, deliveries: [] }
    if (!Array.isArray(skillRefs)) return fail('invalid', 'skillRefs must be an array')
    const state = stateOf(scope)
    const projectId = projectIdOf(scope, state)
    const projMap = projectSkills.get(projectId)
    const roleKind = targetContext?.roleKind || 'worker'
    const capabilities = targetContext?.capabilities ?? null
    const deliveries = []
    const seen = new Set()

    for (let i = 0; i < skillRefs.length; i += 1) {
      const ref = skillRefs[i]
      let id = ''
      let version
      let explicitKind
      if (typeof ref === 'string') {
        const m = /^([a-z0-9][a-z0-9._-]{0,63})(?:@v?(\d+))?$/.exec(ref.trim())
        if (!m) return fail('invalid', `skillRefs[${i}] is invalid`)
        id = m[1]
        if (m[2]) version = Number.parseInt(m[2], 10)
      } else if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
        if (typeof ref.id !== 'string' || !ref.id.trim()) return fail('invalid', `skillRefs[${i}].id required`)
        id = ref.id.trim()
        if (ref.version !== undefined) {
          if (!Number.isInteger(ref.version) || ref.version < 1) return fail('invalid', `skillRefs[${i}].version must be a positive integer`)
          version = ref.version
        }
        if (ref.kind !== undefined) {
          if (!['workflow', 'project'].includes(ref.kind)) return fail('invalid', `skillRefs[${i}].kind must be workflow | project`)
          explicitKind = ref.kind
        }
      } else {
        return fail('invalid', `skillRefs[${i}] must be a string or { id, version?, kind? }`)
      }

      const resolvedKind = explicitKind || (WORKFLOW_SKILL_MAP.has(id) ? 'workflow' : 'project')
      let skill = null
      if (resolvedKind === 'workflow') {
        skill = WORKFLOW_SKILL_MAP.get(id) ?? null
        if (!skill) return fail('not_found', `workflow skill "${id}" not found`)
        if (version !== undefined && version !== skill.version) {
          return fail('not_found', `workflow skill "${id}" version ${version} not found`)
        }
      } else {
        const entry = projMap?.get(id) ?? null
        if (!entry) return fail('not_found', `project skill "${id}" not found in project "${projectId}"`)
        const v = version ?? entry.latestVersion
        skill = entry.versions.get(v) ?? null
        if (!skill) return fail('not_found', `project skill "${id}" version ${v} not found`)
      }

      const key = `${skill.kind}:${skill.id}@${skill.version}`
      if (seen.has(key)) continue
      seen.add(key)

      const elig = checkSkillEligibility(skill, { roleKind, capabilities })
      if (!elig.eligible) {
        const code = Array.isArray(skill.allowedRoles) && !skill.allowedRoles.includes(roleKind)
          ? 'unauthorized'
          : 'capability_mismatch'
        return fail(code, elig.reason)
      }

      deliveries.push({
        kind: skill.kind,
        id: skill.id,
        version: skill.version,
        contentHash: skill.contentHash,
        source: skill.kind === 'workflow' ? 'plugin' : 'project',
        projectId: skill.kind === 'project' ? projectId : null,
        title: skill.title,
        content: skill.body,
        ...(skill.authoringSpecRef ? { authoringSpecRef: structuredClone(skill.authoringSpecRef) } : {}),
      })
    }
    return { ok: true, deliveries }
  }

  function checkDispatchExecutionPreconditions(state, task, binding, { checkWriteScope = true, scope = null } = {}) {
    if (state.paused) return fail('precondition_failed', dispatchPausedDetail)
    const reserved = [...state.executions.values()].some((e) => e.state === 'unknown' && e.quarantined)
    if (reserved) {
      const isHostedRetry = String(binding?.connectorId || '').startsWith('hosted:') && ['read-only', 'workspace-write', 'host-controlled'].includes(binding?.sandbox)
      const isCodexRetry = binding?.connectorId === 'codex' && ['read-only', 'workspace-write'].includes(binding?.sandbox) && binding?.approvals === 'ask'
      if (!binding?.writeScope || !task?.retryCwd || workspaceKey(binding.writeScope) !== task.retryCwd || (!isCodexRetry && !isHostedRetry)) {
        return fail('precondition_failed', 'retry must use its isolated cwd, bounded sandbox and ask approvals')
      }
    }
    if (checkWriteScope && binding?.writeScope) {
      let blocker = null
      for (const [blockerScope, run] of sessions.entries()) {
        const hit = [...run.executions.values()].find((e) => scopesOverlap(e.writeScope, binding.writeScope) && !['finished', 'stopped'].includes(e.state))
        if (hit) {
          blocker = {
            teamSessionId: blockerScope,
            teamId: run.metadata?.teamId ?? null,
            teamName: run.metadata?.teamName ?? run.metadata?.teamId ?? null,
            taskId: hit.taskId,
            executionId: hit.executionId,
            memberId: hit.memberId ?? null,
            state: hit.state,
            quarantined: hit.quarantined === true,
            writeScope: hit.writeScope ?? null,
          }
          break
        }
      }
      if (blocker) {
        const who = blocker.teamId || blocker.teamSessionId
        return {
          ...fail(
            'precondition_failed',
            `workspace has an active or unconfirmed execution (team=${who}, executionId=${blocker.executionId}, state=${blocker.state}, quarantined=${blocker.quarantined}, writeScope=${blocker.writeScope || 'unknown'})`
          ),
          blockingExecution: blocker,
        }
      }
    }
    const localBlocker = [...state.executions.values()].find((e) => ['running', 'waiting_input', 'waiting_approval', 'interrupting', 'unknown'].includes(e.state) && !e.quarantined)
    if (localBlocker) {
      return {
        ...fail(
          'precondition_failed',
          `another execution is active or unconfirmed in this run (executionId=${localBlocker.executionId}, taskId=${localBlocker.taskId}, state=${localBlocker.state})`
        ),
        blockingExecution: {
          teamSessionId: scope,
          teamId: state.metadata?.teamId ?? null,
          teamName: state.metadata?.teamName ?? state.metadata?.teamId ?? null,
          taskId: localBlocker.taskId,
          executionId: localBlocker.executionId,
          memberId: localBlocker.memberId ?? null,
          state: localBlocker.state,
          quarantined: false,
          writeScope: localBlocker.writeScope ?? null,
        },
      }
    }
    return { ok: true }
  }

  function checkDispatchReady(scope, taskId, binding = {}, { checkWriteScope = true } = {}) {
    const state = sessions.get(scope)
    if (!state) return fail('not_found', `unknown session ${scope}`)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    const gate = planGateOf(state)
    if (gate && gate.status !== 'approved') return fail('precondition_failed', planApprovalRequired)
    const moved = transitionTask(task, { type: 'dispatch' })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    const budget = dispatchBudget(task, dispatchLimitsOf(state))
    if (budget.blockedReason) return fail('precondition_failed', budget.blockedReason)
    const pre = checkDispatchExecutionPreconditions(state, task, binding, { checkWriteScope, scope })
    if (!pre.ok) return pre
    return { ok: true }
  }

  function nextAutomaticReview(scope, taskId) {
    const state = sessions.get(scope)
    if (!state || state.paused || !managedDelivery(state)) return null
    if ([...state.executions.values()].some((execution) => !execution.quarantined && !['finished', 'stopped'].includes(execution.state))) return null
    const tasks = taskId ? [state.tasks.get(taskId)] : [...state.tasks.values()]
    const task = tasks.find((row) => {
      if (row?.state !== 'review' || !row.reviewPolicy?.requiresReview || !row.result?.delivery || row.needsAdjudication) return false
      const worker = state.executions.get(row.executionId)
      const ready = worker?.state === 'finished' || (worker?.state === 'stopped' && worker.deliveryAccepted?.resultId === row.result.resultId)
      return ready && state.executions.get(row.reviewExecutionId)?.targetResultId !== row.result.resultId && row.reviewDispatch?.resultId !== row.result.resultId
    })
    if (!task) return null
    const workerExec = state.executions.get(task.executionId)
    return { taskId: task.taskId, executionId: task.executionId, resultId: task.result.resultId, memberId: task.memberId,
      cwd: workerExec.worktree?.path || workerExec.writeScope }
  }

  const api = {
    getStatus: (scope) => structuredClone(getStatus(scope)),
    getModelStatus: (scope) => {
      const full = getStatus(scope)
      const { viewObjects, ...rest } = full
      return structuredClone({ ...rest, viewObjectRefs: (viewObjects || []).map(summarizeViewObject) })
    },
    getTask, readMemberTask, listSessions, noteActivation, getActivations,
    nextAutomaticReview,
    runsWithPendingAutomaticReview: () => [...sessions.keys()].filter((scope) => nextAutomaticReview(scope)),
    recordReviewDispatchBlock: transaction((scope, pending, issue) => {
      const current = nextAutomaticReview(scope, pending.taskId)
      if (current?.resultId !== pending.resultId) return fail('stale', 'automatic review is no longer pending')
      const task = stateOf(scope).tasks.get(pending.taskId)
      const detail = issue.detail ?? issue.code
      task.reviewDispatch = { resultId: pending.resultId, status: 'needs_assignment', code: issue.code, detail }
      task.blockedReason = detail
      appendEvent(scope, 'review.assignment_needed', task.reviewDispatch, undefined, task.taskId, task.executionId)
      return { ok: true }
    }),
    haltTeam: transaction(haltTeam),
    recordUserSuggestion: transaction(recordUserSuggestion),
    findAutoCascadeCandidates,
    recordAutoCascade: transaction(recordAutoCascade),
    createRacePair: transaction(createRacePair),
    resolveRaceWinner: transaction(resolveRaceWinner),
    approvePlan: transaction(approvePlan),
    recordPlanWake: transaction(recordPlanWake),
    offerCloseoutSkill: transaction(offerCloseoutSkill),
    settleCloseoutSkill: transaction(settleCloseoutSkill),
    reviewFeedback: transaction(reviewFeedback),
    editAcceptanceChecklist: transaction(editAcceptanceChecklist),
    editSharedTaskArtifact: transaction(editAcceptanceChecklist),
    setDispatchLimits: transaction(setDispatchLimits),
    recordWorktreeDirtyWarning: transaction(recordWorktreeDirtyWarning),
    checkDispatchReady,
    submit: audited(submit, 'decision.applied'), reportProgress: audited(reportProgress, 'task.progress'),
    submitResult: audited(submitResult, 'result.submitted'), submitReview: audited(submitReview, 'review.submitted'),
    startExecution: transaction((scope, taskId, binding) => command(scope, binding?.commandId, {
      type: 'dispatch',
      taskId,
      memberId: binding?.memberId ?? null,
      connectorId: binding?.connectorId ?? null,
      sandbox: binding?.requestedSandbox ?? binding?.sandbox ?? null,
      approvals: binding?.approvals ?? null,
      writeScope: binding?.requestedWriteScope ?? binding?.writeScope ?? null,
      ...(binding?.worktreeMode !== undefined ? { worktreeMode: binding.worktreeMode } : {}),
      taskContext: binding?.taskContext ?? null,
      requestedSkillRefs: binding?.requestedSkillRefs ?? binding?.skillDeliveries?.map((d) => ({ id: d.id, version: d.version, kind: d.kind })) ?? null,
    }, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      const pre = checkDispatchExecutionPreconditions(state, task, binding, { scope })
      if (!pre.ok) return pre
      const out = startExecution(scope, taskId, binding)
      if (out.ok && out.executionId) {
        appendEvent(scope, 'execution.dispatched', binding ?? {}, binding?.dispatchedBy ? { kind: binding.dispatchedBy.kind, id: binding.dispatchedBy.actorId } : undefined, taskId, out.executionId)
        if (binding?.dispatchedBy) {
          recordActivity(scope, {
            memberId: binding.memberId || state.metadata?.commanderId || 'concerto',
            kind: 'result',
            taskId,
            executionId: out.executionId,
            summary: `任务已派发给 ${binding.memberId || ''}（来源：${binding.dispatchedBy.kind} / ${binding.dispatchedBy.actorId}）`,
            detail: { dispatchedBy: binding.dispatchedBy, writeScope: binding.writeScope ?? null },
          })
        }
      }
      return out
    })),
    startReviewExecution: transaction((scope, taskId, binding) => command(scope, binding?.commandId, {
      type: 'dispatch_review',
      taskId,
      ...(binding?.targetResultId !== undefined ? { targetResultId: binding.targetResultId, targetExecutionId: binding.targetExecutionId } : {}),
      memberId: binding?.memberId ?? null,
      connectorId: binding?.connectorId ?? null,
      taskContext: binding?.taskContext ?? null,
      requestedSkillRefs: binding?.requestedSkillRefs ?? binding?.skillDeliveries?.map((d) => ({ id: d.id, version: d.version, kind: d.kind })) ?? null,
    }, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      const normalizedBinding = { ...binding, sandbox: binding?.sandbox ?? 'read-only' }
      const pre = checkDispatchExecutionPreconditions(state, task, normalizedBinding, { scope })
      if (!pre.ok) return pre
      const out = startReviewExecution(scope, taskId, normalizedBinding)
      if (out.ok) {
        appendEvent(scope, 'execution.dispatched', { ...(binding ?? {}), kind: 'review' }, binding?.dispatchedBy ? { kind: binding.dispatchedBy.kind, id: binding.dispatchedBy.actorId } : undefined, taskId, out.executionId)
        if (binding?.dispatchedBy) {
          recordActivity(scope, {
            memberId: binding.memberId || state.metadata?.commanderId || 'concerto',
            kind: 'result',
            taskId,
            executionId: out.executionId,
            summary: `审查任务已派发给 ${binding.memberId || ''}（来源：${binding.dispatchedBy.kind} / ${binding.dispatchedBy.actorId}）`,
            detail: { kind: 'review', dispatchedBy: binding.dispatchedBy, targetExecutionId: out.targetExecutionId, targetResultId: out.targetResultId },
          })
        }
      }
      return out
    })),
    listSkills(scope, filter = {}, memberContext = null) {
      const state = stateOf(scope)
      const projectId = projectIdOf(scope, state)
      const projMap = projectSkills.get(projectId)
      const roleKind = memberContext?.roleKind || 'commander'
      const skills = listAvailableSkills({
        roleKind,
        capabilities: memberContext?.capabilities ?? null,
        projectSkills: projMap ? [...projMap.values()] : [],
        kind: filter?.kind || 'all',
        includeIneligible: filter?.includeIneligible === true,
      })
      return { ok: true, projectId, skills }
    },
    searchProjectContext(scope, input = {}, memberContext = {}) {
      const { query = '', kind } = input
      if (typeof query !== 'string' || query.length > 240) return fail('invalid', 'query must be a string up to 240 characters')
      if (kind !== undefined && !PROJECT_CONTEXT_KINDS.includes(kind)) return fail('invalid', 'unknown project context kind')
      const state = sessions.get(scope)
      if (!state?.metadata) return fail('not_found', 'project context not found')
      const projectId = projectIdOf(scope, state)
      const entries = searchProjectEntries(projectId, runsForProject(scope, state), projectSkills.get(projectId)?.values() ?? [], memberContext, { query, kind })
      return { ok: true, projectId, entries }
    },
    searchExperience(scope, input = {}, memberContext = {}) {
      const { query = '', kind } = input
      if (typeof query !== 'string' || query.length > 240) return fail('invalid', 'query must be a string up to 240 characters')
      if (kind !== undefined && kind !== 'skill' && !EXPERIENCE_KINDS.includes(kind)) return fail('invalid', 'unknown experience kind')
      const state = sessions.get(scope)
      if (!state?.metadata) return fail('not_found', 'project experience not found')
      const projectId = projectIdOf(scope, state)
      const experiences = kind === 'skill' ? [] : searchExperienceRecords(projectExperienceRecords(scope, state), query, kind)
      for (const item of experiences) {
        if (item.basedOn?.kind === 'skill' && !canReadExperienceSkill(projectId, item.basedOn, memberContext)) delete item.basedOn
      }
      const skills = !kind || kind === 'skill'
        ? searchProjectEntries(projectId, [], projectSkills.get(projectId)?.values() ?? [], memberContext, { query, kind: 'skill' })
        : []
      return { ok: true, projectId, entries: [...experiences, ...skills].slice(0, EXPERIENCE_LIMIT) }
    },
    recordExperience: transaction(recordExperience),
    readSkill: transaction(readSkillImpl),
    readProjectSkill: transaction(readProjectSkillImpl),
    publishProjectSkill: transaction(publishProjectSkillImpl),
    readMemberDuties,
    updateMemberDuties: transaction(updateMemberDuties),
    resolveSkillRefsForDispatch,
    getSkillLedger(scope) {
      const state = stateOf(scope)
      const projectId = projectIdOf(scope, state)
      const projMap = projectSkills.get(projectId)
      const projectSkillRecords = projMap
        ? [...projMap.values()].map((entry) => ({
            id: entry.id,
            projectId,
            latestVersion: entry.latestVersion,
            versions: [...entry.versions.values()].map((v) => ({
              version: v.version,
              contentHash: v.contentHash,
              title: v.title,
              description: v.description,
              requiredCapabilities: v.requiredCapabilities,
              authorId: v.authorId,
              authoringSpecRef: v.authoringSpecRef,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt,
            })),
          }))
        : []
      const executionDeliveries = [...state.executions.values()]
        .filter((e) => Array.isArray(e.skillDeliveries) && e.skillDeliveries.length > 0)
        .map((e) => ({
          executionId: e.executionId,
          taskId: e.taskId,
          memberId: e.memberId,
          kind: e.kind || 'worker',
          deliveries: e.skillDeliveries.map((d) => ({
            id: d.id,
            kind: d.kind,
            version: d.version,
            contentHash: d.contentHash,
            source: d.source,
            status: d.status,
            channel: d.channel,
            deliveredAt: d.deliveredAt,
            ...(d.acceptanceStatus ? { acceptanceStatus: d.acceptanceStatus, reviewId: d.reviewId, verifiedAt: d.verifiedAt } : {}),
          })),
          feedback: e.skillFeedback ?? [],
          acceptanceEvidence: e.skillAcceptanceEvidence ?? null,
        }))
      return {
        ok: true,
        projectId,
        projectSkills: projectSkillRecords,
        loadedSkills: [...(state.loadedSkills?.values() ?? [])],
        executionDeliveries,
      }
    },
    listRecoveryRuns() {
      const out = []
      const bindingsByRun = new Map()
      for (const b of bindings.values()) {
        if (!bindingsByRun.has(b.teamSessionId)) bindingsByRun.set(b.teamSessionId, [])
        bindingsByRun.get(b.teamSessionId).push(b)
      }
      for (const [scope, state] of sessions.entries()) {
        const runBindings = bindingsByRun.get(scope) ?? []
        const commanderIds = runBindings.filter((b) => b.roleKind === 'commander').map((b) => b.sessionId)
        const inferredCmd = commanderIds[0] || state.metadata?.commanderSessionId || (scope.startsWith('run-') ? scope.slice(4) : null)
        for (const ex of state.executions.values()) {
          if (ex.state !== 'unknown') continue
          const task = state.tasks.get(ex.taskId)
          out.push({
            teamSessionId: scope,
            teamId: state.metadata?.teamId ?? null,
            teamName: state.metadata?.teamName ?? state.metadata?.teamId ?? scope,
            commanderSessionId: inferredCmd,
            commanderBindings: commanderIds,
            taskId: ex.taskId,
            taskTitle: task?.title ?? ex.taskId,
            taskState: task?.state ?? 'unknown',
            retryCwd: task?.retryCwd ?? null,
            executionId: ex.executionId,
            memberId: ex.memberId ?? null,
            connectorId: ex.connectorId ?? null,
            sandbox: ex.sandbox ?? null,
            writeScope: ex.writeScope ?? null,
            quarantined: ex.quarantined === true,
            recoverableDelivery: unknownDelivery(task, ex),
            deliveryAccepted: ex.deliveryAccepted ?? null,
            unknownReason: ex.unknownReason ?? task?.blockedReason ?? null,
            nativeSessionRef: structuredClone(ex.nativeSessionRef ?? null),
            hostBootId: ex.hostBootId ?? ex.nativeSessionRef?.hostBootId ?? null,
            isCurrentHostBoot: (ex.hostBootId ?? ex.nativeSessionRef?.hostBootId ?? null) === hostBootId,
            dispatchedBy: structuredClone(ex.dispatchedBy ?? null),
            createdAt: ex.createdAt ?? null,
            updatedAt: ex.updatedAt ?? null,
          })
        }
      }
      return out
    },
    listRuns() {
      const bindingsByRun = new Map()
      for (const b of bindings.values()) {
        if (!bindingsByRun.has(b.teamSessionId)) bindingsByRun.set(b.teamSessionId, [])
        bindingsByRun.get(b.teamSessionId).push(b)
      }
      const runs = []
      for (const [scope, state] of sessions.entries()) {
        const runBindings = bindingsByRun.get(scope) ?? []
        const commanderIds = runBindings.filter((b) => b.roleKind === 'commander').map((b) => b.sessionId)
        const inferredCmd = commanderIds[0] || state.metadata?.commanderSessionId || (scope.startsWith('run-') ? scope.slice(4) : null)
        const unknownCount = [...state.executions.values()].filter((e) => e.state === 'unknown' && !e.quarantined).length
        runs.push({
          teamSessionId: scope,
          projectId: state.metadata?.projectId ?? null,
          teamId: state.metadata?.teamId ?? null,
          teamName: state.metadata?.teamName ?? state.metadata?.teamId ?? scope,
          objective: state.metadata?.objective ?? '',
          cwd: state.metadata?.cwd ?? null,
          workspaceId: state.metadata?.workspaceId ?? null,
          commanderSessionId: inferredCmd,
          commanderBindings: commanderIds,
          planRevision: state.planRevision,
          completed: state.goalCompletion?.state === 'completed',
          taskCount: state.tasks.size,
          unknownCount,
          quarantinedCount: [...state.executions.values()].filter((e) => e.state === 'unknown' && e.quarantined).length,
          createdAt: state.events[0]?.recordedAt ?? null,
          updatedAt: state.events.at(-1)?.recordedAt ?? null,
        })
      }
      return runs
    },
    getHostBootId: () => hostBootId,
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {}
      eventSubscribers.add(fn)
      return () => { eventSubscribers.delete(fn) }
    },
    recordExecutionEvent: transaction(recordExecutionEvent), completeExecution: transaction(completeExecution),
    settleExecution: transaction(settleExecution),
    adjudicate: transaction(adjudicate),
    replayCommand,
    prepareReviewExemption,
    settleReviewExemption: transaction(settleReviewExemption),
    bindSession: transaction(bindSession),
    continueCompletedRun: transaction(continueCompletedRun),
    getBinding: (id) => structuredClone(bindings.get(id) ?? null),
    authorizeTask,
    askTaskQuestion: transaction(askTaskQuestion),
    decideRequest: transaction((scope, input, actor) => decideRequest(scope, input, actor)),
    delivery: transaction(delivery),
    requestCancel: transaction((scope, taskId, actor, input = {}, canCancel) => command(
      scope, input.commandId, { type: 'cancel', taskId, executionId: input.executionId, reason: input.reason },
      () => requestCancel(scope, taskId, actor, input, canCancel),
    )),
    unblockTask: transaction((scope, { taskId, expectedUpdatedAt, reason, commandId }, actor) => command(
      scope, commandId, { type: 'unblock_task', taskId, expectedUpdatedAt, reason },
      () => unblockTask(scope, { taskId, expectedUpdatedAt, reason }, actor),
    )),
    recordStructured, getStructured, listStructured,
    recordActivity, getMemberActivity,
    importExcalidrawBoard(scope, filename, scene) {
      const imported = normalizeExcalidrawImport(scene)
      if (!imported.ok) return imported
      const title = (filename || '').replace(/\.excalidraw$/i, '').trim() || '导入的白板'
      const saved = api.publishViewObject(scope, {
        id: `board-${randomUUID()}`,
        type: 'board',
        title,
        expectedVersion: 0,
        data: { excalidrawScene: imported.scene },
      }, { kind: 'user', id: 'local-owner' })
      return saved.ok ? { ...saved, title, omittedCount: imported.omittedCount } : saved
    },
    publishViewObject: transaction((scope, input, actor = { kind: 'runtime', id: 'concerto' }) => {
      if (actor?.kind === 'member') {
        const issue = memberViewPublicationIssue(input)
        if (issue) return fail('invalid', issue)
      }
      const checked = validateViewObjectInput(input)
      if (!checked.ok) return checked
      const state = stateOf(scope)
      return viewMutation(scope, input.mutationId, { op: 'publish', id: input.id, type: input.type, renderer: checked.renderer, title: input.title, data: checked.normalizedData, size: checked.size ?? null, caption: checked.caption ?? null, layoutHints: checked.layoutHints ?? null, taskId: input.taskId ?? null, executionId: input.executionId ?? null, expectedVersion: input.expectedVersion ?? null }, () => {
        const ref = resolveTaskAndExecution(state, input, actor)
        if (!ref.ok) return ref
        const existing = state.viewObjects.get(input.id)
        if (existing) {
          if (!canEditViewObject(existing, actor)) return fail('unauthorized', `view object "${input.id}" is owned by ${existing.ownerId || existing.authorId}`)
          if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== existing.version) {
            return fail(
              'stale',
              input.expectedVersion === undefined
                ? `view object "${input.id}" already exists at version ${existing.version}; expectedVersion is required to overwrite`
                : `expected version ${input.expectedVersion}, current ${existing.version}`,
            )
          }
        } else if (input.expectedVersion !== undefined && input.expectedVersion !== 0) {
          return fail('stale', `expected version ${input.expectedVersion}, object does not exist`)
        }
        const actorId = String(actor?.id || 'concerto')
        const version = (existing?.version ?? 0) + 1
        const size = checked.size ?? existing?.size
        const caption = checked.caption !== undefined ? checked.caption : existing?.caption
        const layoutHints = checked.layoutHints ?? existing?.layoutHints
        const semanticKind = checked.semanticKind || existing?.semanticKind || 'blueprint'
        const snapshotAt = checked.snapshotAt || (semanticKind === 'snapshot' ? (existing?.snapshotAt || new Date().toISOString()) : undefined)
        const record = {
          id: input.id,
          type: input.type,
          renderer: checked.renderer,
          semanticKind,
          ...(snapshotAt ? { snapshotAt } : {}),
          title: input.title.trim(),
          data: checked.normalizedData,
          ...(size ? { size } : {}),
          ...(caption !== undefined && caption !== '' ? { caption } : {}),
          ...(layoutHints ? { layoutHints } : {}),
          ...(existing?.userLayout ? { userLayout: structuredClone(existing.userLayout) } : {}),
          ...(input.pinned === true ? { pinned: true } : (existing?.pinned ? { pinned: true } : {})),
          authorId: existing ? existing.authorId : actorId,
          ownerId: existing ? (existing.ownerId || existing.authorId) : actorId,
          editableBy: input.editableBy ? structuredClone(input.editableBy) : (existing?.editableBy ? structuredClone(existing.editableBy) : [actorId]),
          roleKind: existing ? existing.roleKind : String(actor?.role || actor?.kind || 'runtime'),
          layer: (ref.taskId ?? existing?.taskId)
            ? ((existing ? existing.roleKind : String(actor?.role || actor?.kind || 'runtime')) === 'reviewer' ? 'review' : 'task')
            : 'team',
          updatedBy: actorId,
          taskId: ref.taskId ?? existing?.taskId ?? null,
          executionId: ref.executionId ?? existing?.executionId ?? null,
          teamSessionId: scope,
          version,
          updatedAt: new Date().toISOString(),
          source: actor?.kind === 'member' ? 'member_tool' : actor?.kind === 'user' ? 'user_import' : 'runtime',
        }
        saveViewObjectVersion(state, record)
        recordActivity(scope, {
          memberId: actorId,
          kind: 'object_published',
          taskId: record.taskId,
          executionId: record.executionId,
          summary: `发布 ${record.type}:${record.id} (v${record.version})`,
          detail: { id: record.id, type: record.type, renderer: record.renderer, semanticKind: record.semanticKind, title: record.title, version: record.version },
        })
        appendEvent(scope, 'view.object.published', { id: record.id, type: record.type, renderer: record.renderer, semanticKind: record.semanticKind, version: record.version }, actor, record.taskId, record.executionId)
        return {
          ok: true,
          replayed: false,
          id: record.id,
          type: record.type,
          renderer: record.renderer,
          ...(input.semanticKind !== undefined ? { semanticKind: record.semanticKind } : {}),
          version: record.version,
          authorId: record.authorId,
          ownerId: record.ownerId,
          taskId: record.taskId,
          executionId: record.executionId,
        }
      })
    }),
    patchViewObject: transaction((scope, input, actor = { kind: 'runtime', id: 'concerto' }) => {
      if (actor?.kind === 'member') {
        const issue = memberViewPatchIssue(input)
        if (issue) return fail('invalid', issue)
      }
      if (!input || typeof input !== 'object') return fail('invalid', 'input must be an object')
      if (typeof input.id !== 'string' || input.id === '') return fail('invalid', 'id required')
      if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) return fail('invalid', 'expectedVersion must be an integer >= 1')
      const state = stateOf(scope)
      return viewMutation(scope, input.mutationId, { op: 'patch', ...input }, () => {
        const existing = state.viewObjects.get(input.id)
        if (!existing) return fail('not_found', `view object "${input.id}" not found`)
        if (!canEditViewObject(existing, actor)) return fail('unauthorized', `view object "${input.id}" is owned by ${existing.ownerId || existing.authorId}`)
        if (input.expectedVersion !== existing.version) {
          return fail('stale', `expected version ${input.expectedVersion}, current ${existing.version}`)
        }
        const ref = resolveTaskAndExecution(state, input, actor)
        if (!ref.ok) return ref
        const patched = applyViewObjectPatch(existing, input)
        if (!patched.ok) return patched
        const actorId = String(actor?.id || 'concerto')
        const record = {
          ...structuredClone(existing),
          title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : existing.title,
          data: patched.data,
          ...(input.size ? { size: input.size } : {}),
          ...(typeof input.caption === 'string' ? { caption: input.caption.trim() } : {}),
          updatedBy: actorId,
          taskId: ref.taskId ?? existing.taskId ?? null,
          executionId: ref.executionId ?? existing.executionId ?? null,
          version: existing.version + 1,
          updatedAt: new Date().toISOString(),
        }
        saveViewObjectVersion(state, record)
        if (
          state.planApproval?.approvedAt
          && state.planApproval.planRef?.id === existing.id
          && state.planApproval.planRef?.version === existing.version
          && isChecklistCheckedOnlyPatch(existing, patched.data, input)
        ) {
          state.planApproval = {
            ...state.planApproval,
            planRef: { ...state.planApproval.planRef, version: record.version },
          }
        }
        recordActivity(scope, {
          memberId: actorId,
          kind: 'object_published',
          taskId: record.taskId,
          executionId: record.executionId,
          summary: `局部更新 ${record.type}:${record.id} (v${record.version})`,
          detail: { id: record.id, type: record.type, op: input.op, title: record.title, version: record.version },
        })
        appendEvent(scope, 'view.object.patched', { id: record.id, type: record.type, op: input.op, version: record.version }, actor, record.taskId, record.executionId)
        return { ok: true, replayed: false, id: record.id, type: record.type, renderer: record.renderer, version: record.version, authorId: record.authorId, ownerId: record.ownerId, taskId: record.taskId, executionId: record.executionId }
      })
    }),
    updateViewObjectUserLayout: transaction((scope, input = {}) => {
      if (!input || typeof input.id !== 'string' || !input.id) return fail('invalid', 'id required')
      const state = stateOf(scope)
      const existing = state.viewObjects.get(input.id)
      if (!existing) return fail('not_found', `view object "${input.id}" not found`)
      const currentVersion = existing.userLayout?.version ?? 0
      if (input.expectedUserVersion !== undefined && input.expectedUserVersion !== currentVersion) {
        return fail('stale', `expected userLayout version ${input.expectedUserVersion}, current ${currentVersion}`)
      }
      const nextVersion = currentVersion + 1
      const nextUserLayout = input.reset === true
        ? { version: nextVersion, baseObjectVersion: existing.version, offsets: {}, labelOverrides: {}, annotations: [], updatedAt: new Date().toISOString() }
        : {
            version: nextVersion,
            baseObjectVersion: existing.version,
            offsets: input.offsets !== undefined ? structuredClone(input.offsets) : structuredClone(existing.userLayout?.offsets ?? {}),
            labelOverrides: input.labelOverrides !== undefined ? structuredClone(input.labelOverrides) : structuredClone(existing.userLayout?.labelOverrides ?? {}),
            annotations: input.annotations !== undefined ? structuredClone(input.annotations) : structuredClone(existing.userLayout?.annotations ?? []),
            updatedAt: new Date().toISOString(),
          }
      const updated = { ...structuredClone(existing), userLayout: nextUserLayout }
      state.viewObjects.set(updated.id, updated)
      return { ok: true, id: updated.id, userLayout: structuredClone(nextUserLayout) }
    }),
    listViewObjects(scope, filter = {}) {
      const state = stateOf(scope)
      const list = [...(state.viewObjects?.values() ?? [])].filter((o) => {
        if (filter.taskId && o.taskId !== filter.taskId) return false
        if (filter.authorId && o.authorId !== filter.authorId) return false
        if (filter.type && o.type !== filter.type) return false
        return true
      })
      return { ok: true, objects: list.map(summarizeViewObject) }
    },
    readProjectViewObject(scope, input) {
      const { teamSessionId, id, version } = input
      if (typeof teamSessionId !== 'string' || !teamSessionId || typeof id !== 'string' || !id ||
          !Number.isInteger(version) || version < 1) return fail('invalid', 'project artifact requires teamSessionId, id, and a positive integer version')
      const state = sessions.get(scope)
      const source = sessions.get(teamSessionId)
      if (!state?.metadata || !source?.metadata || projectIdOf(scope, state) !== projectIdOf(teamSessionId, source) ||
          !isProjectViewObject(viewObjectVersion(source, id, version))) {
        return fail('not_found', 'project artifact version not found')
      }
      const result = api.readViewObject(teamSessionId, input)
      if (!result.ok) return result
      // User layout belongs to the current view, even when the requested semantic version is older.
      const { userLayout, latestVersion, ...versioned } = result
      return { ...versioned, teamSessionId }
    },
    readViewObject(scope, input = {}) {
      if (typeof input?.id !== 'string' || input.id === '') return fail('invalid', 'id required')
      const state = stateOf(scope)
      const current = state.viewObjects.get(input.id)
      if (!current) return fail('not_found', `view object "${input.id}" not found`)
      if (input.version !== undefined && (!Number.isInteger(input.version) || input.version < 1)) {
        return fail('invalid', 'version must be a positive integer')
      }
      const target = viewObjectVersion(state, input.id, input.version)
      if (!target) return fail('not_found', `view object "${input.id}" version ${input.version} not found`)
      const limits = dispatchLimitsOf(state)
      const tasks = [...state.tasks.values()].map((task) => projectTaskBudget(state, task, limits))
      const projected = projectViewObjectWithRuntimeState(target, tasks, [...state.executions.values()])
      const sliced = sliceViewObjectData(projected, input)
      if (!sliced) return fail('not_found', `subtreeNodeId "${input.subtreeNodeId}" not found`)
      return {
        ok: true,
        id: projected.id,
        type: projected.type,
        renderer: projected.renderer,
        semanticKind: projected.semanticKind,
        ...(projected.snapshotAt ? { snapshotAt: projected.snapshotAt } : {}),
        title: projected.title,
        ...(projected.size ? { size: projected.size } : {}),
        ...(projected.caption ? { caption: projected.caption } : {}),
        ...(projected.layoutHints ? { layoutHints: structuredClone(projected.layoutHints) } : {}),
        ...(current.userLayout ? { userLayout: structuredClone(current.userLayout) } : {}),
        version: projected.version,
        latestVersion: current.version,
        authorId: projected.authorId,
        ownerId: projected.ownerId || projected.authorId,
        updatedBy: projected.updatedBy,
        updatedAt: projected.updatedAt,
        ...(projected.source ? { source: projected.source } : {}),
        roleKind: projected.roleKind || 'runtime',
        layer: projected.layer || (projected.taskId ? (projected.roleKind === 'reviewer' ? 'review' : 'task') : 'team'),
        taskId: projected.taskId ?? null,
        executionId: projected.executionId ?? null,
        truncated: sliced.truncated,
        totalItems: sliced.totalItems,
        data: sliced.data,
      }
    },
    updateTeamView: transaction((scope, input, actor = { kind: 'runtime', id: 'concerto' }) => {
      const checked = validatePublicViewPatch(input)
      if (!checked.ok) return checked
      const state = stateOf(scope)
      const prev = normalizePublicView(state.publicView)
      const nextSections = input.sections !== undefined
        ? structuredClone(input.sections)
        : (input.pinnedRefs !== undefined ? (input.pinnedRefs.length > 0 ? [{ title: '', refs: structuredClone(input.pinnedRefs) }] : []) : prev.sections)
      const nextPinnedRefs = input.pinnedRefs !== undefined
        ? structuredClone(input.pinnedRefs)
        : (input.sections !== undefined ? nextSections.flatMap((s) => (Array.isArray(s.refs) ? s.refs : [])) : prev.pinnedRefs)
      const next = {
        summary: input.summary !== undefined ? input.summary : prev.summary,
        pinnedRefs: nextPinnedRefs,
        sections: nextSections,
        updatedAt: new Date().toISOString(),
        updatedBy: String(actor?.id || 'concerto'),
      }
      state.publicView = next
      if (actor?.id) {
        recordActivity(scope, {
          memberId: String(actor.id),
          kind: 'object_published',
          summary: `更新指挥台公共视图（${nextPinnedRefs.length} 项置顶）`,
          text: next.summary,
          detail: { publicView: true, pinnedCount: nextPinnedRefs.length, sectionsCount: nextSections.length },
        })
      }
      appendEvent(scope, 'team.view.updated', { summary: next.summary, pinnedCount: next.pinnedRefs.length }, actor)
      return { ok: true, publicView: structuredClone(next) }
    }),
    updateUserViewPreferences: transaction((scope, input = {}) => {
      if (!input || typeof input !== 'object') return fail('invalid', 'input must be an object')
      const state = stateOf(scope)
      let nextPins = normalizeUserPinnedRefs(state.userPinnedRefs)
      if (input.pinnedRefs !== undefined) {
        if (!Array.isArray(input.pinnedRefs)) return fail('invalid', 'pinnedRefs must be an array')
        nextPins = normalizeUserPinnedRefs(input.pinnedRefs)
      } else if (input.toggleRef !== undefined) {
        const refStr = typeof input.toggleRef === 'string' ? input.toggleRef.trim() : ''
        if (!USER_PIN_REF_RE.test(refStr)) return fail('invalid', 'toggleRef must match <type>:<id>')
        if (nextPins.includes(refStr)) nextPins = nextPins.filter((r) => r !== refStr)
        else nextPins = normalizeUserPinnedRefs([...nextPins, refStr])
      } else {
        return fail('invalid', 'pinnedRefs or toggleRef is required')
      }
      state.userPinnedRefs = nextPins
      return { ok: true, userPinnedRefs: [...nextPins] }
    }),
  }
  return api
}
