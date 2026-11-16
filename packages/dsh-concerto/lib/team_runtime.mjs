/**
 * 团队运行态（按会话隔离 + 可选 JSON 持久化）。
 *
 * 每个团队运行（teamSessionId）一份状态；Host Session 通过绑定找到运行。
 * 配置与运行态分开存：配置在 teams.json（team_store），运行态在 runtime.json。
 *
 * 设计：§7.3.1（决策契约）、§7.3.2（payload）、§7.0（Review 下限）、§7.7（按 teamSessionId 归属）
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { normalizeEventType } from './connector/contract.mjs'
import { scopesOverlap, workspaceKey } from './workspace_scope.mjs'
import {
  validateDecisionPayload,
  checkModifyPrecondition,
  effectiveRequiresReview,
  DECISION_ACTION,
} from './domain/decision_schema.mjs'
import { transitionExecution, transitionTask, taskViewState } from './domain/state_machine.mjs'
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
} from './domain/view_objects.mjs'

const MAX_ACTIVITY_TEXT = 4000
const MAX_ACTIVITIES_PER_SESSION = 1000
const USER_PIN_REF_RE = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/

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
  /** @type {Map<string, {planRevision:number, counter:number, tasks:Map, decisions:Map}>} */
  const sessions = new Map()
  /** Unique identity per host process boot so old PIDs are never naively trusted across restarts. */
  const hostBootId = randomUUID()
  /** 最近若干个工具激活判定的观测值（诊断用，最多 20 条；不持久化） */
  const activations = []
  let bindings = new Map()
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
  if (statePath) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, 'utf8'))
      if (!Array.isArray(parsed.sessions)) throw new Error('runtime.sessions must be an array')
      migrated = parsed.schemaVersion !== 3
      bindings = new Map(parsed.bindings ?? [])
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
          publicView: normalizePublicView(record.publicView),
          userPinnedRefs: normalizeUserPinnedRefs(record.userPinnedRefs),
        })
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot load Concerto runtime', { cause: error })
    }
  }

  /** 原子写全量运行态。返回是否落盘成功。 */
  function persist() {
    if (!statePath) return false
    if (transactionOpen) return true
    try {
      mkdirSync(dirname(statePath), { recursive: true })
      const data = {
        schemaVersion: 3,
        bindings: [...bindings],
        sessions: [...sessions.entries()].map(([sessionId, s]) => ({
          sessionId,
          metadata: s.metadata,
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
          publicView: normalizePublicView(s.publicView),
          userPinnedRefs: normalizeUserPinnedRefs(s.userPinnedRefs),
        })),
      }
      const tmp = `${statePath}.tmp`
      writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
      renameSync(tmp, statePath)
      return true
    } catch (error) {
      throw new Error('Cannot persist Concerto runtime', { cause: error })
    }
  }

  function stateOf(sessionId) {
    const key = sessionKey(sessionId)
    let state = sessions.get(key)
    if (!state) {
      state = { metadata: null, events: [], activities: [], activitySeq: 0, executions: new Map(), requests: new Map(), commands: new Map(), planRevision: 1, counter: 0, reviewCounter: 0, tasks: new Map(), decisions: new Map(), viewObjects: new Map(), viewObjectHistory: new Map(), publicView: normalizePublicView(null), userPinnedRefs: [] }
      sessions.set(key, state)
    }
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
  function buildAttentionList(state) {
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
    for (const t of state.tasks.values()) {
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
      } else if (t.state === 'blocked' || t.state === 'failed') {
        items.push({
          id: `${t.state}:${t.taskId}`,
          kind: t.state,
          urgency: 5,
          taskId: t.taskId,
          executionId: t.executionId ?? null,
          memberId: t.memberId ?? null,
          title: `${t.state === 'blocked' ? '阻塞' : '失败'} · ${t.title}`,
          detail: t.blockedReason || '需要重新派发或解除阻塞',
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

  function getStatus(sessionId) {
    const state = stateOf(sessionId)
    const tasksList = [...state.tasks.values()]
    const executionsList = [...state.executions.values()]
    const rawViewObjects = [...(state.viewObjects?.values() ?? [])]
    const viewObjects = rawViewObjects.map((o) => projectViewObjectWithRuntimeState(o, tasksList, executionsList))
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
      executions: executionsList,
      requests: [...state.requests.values()],
      attention: buildAttentionList(state),
      memberActivitySummary: buildMemberActivitySummary(state),
      events: state.events.slice(-100),
      planRevision: state.planRevision,
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
        assigneeRole: t.assigneeRole,
        requiresReview: t.requiresReview,
        executionId: t.executionId ?? null,
        memberId: t.memberId ?? null,
        viewState: taskViewState(t, state.executions.get(t.executionId)),
        progress: (t.progress ?? []).slice(-5),
        blockedReason: t.blockedReason ?? null,
        result: t.result,
        review: t.review ?? null,
        needsAdjudication: t.needsAdjudication === true,
        retryCwd: t.retryCwd ?? null,
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

  /**
   * 处理一次决策：幂等 → 计划版本 → 动作前置 → 校验 → 落库。
   * @param {{ decisionId: string, expectedPlanRevision: number, action: string, payload: object }} input
   * @param {string} sessionId 归属会话
   */
  function submit(input, sessionId) {
    const state = stateOf(sessionId)
    const { decisionId, expectedPlanRevision, action, payload } = input ?? {}
    if (typeof decisionId !== 'string' || decisionId === '') return fail('invalid', 'decisionId required')
    if (!Number.isInteger(expectedPlanRevision)) return fail('invalid', 'expectedPlanRevision must be an integer')
    if (typeof action !== 'string' || action === '') return fail('invalid', 'action required')

    const hash = JSON.stringify({ action, payload })
    const seen = state.decisions.get(decisionId)
    if (seen) {
      if (seen.hash !== hash) return fail('idempotency_conflict', 'same decisionId with different content')
      return { ok: true, replayed: true, planRevision: seen.planRevision, result: seen.result }
    }

    if (expectedPlanRevision !== state.planRevision) {
      return fail('stale', `expected ${expectedPlanRevision}, current ${state.planRevision}`)
    }

    if (action !== DECISION_ACTION.createTask && action !== DECISION_ACTION.modifyTask && action !== DECISION_ACTION.wait) {
      return fail('unsupported', `action ${action} not implemented yet`)
    }

    const checked = validateDecisionPayload(action, payload)
    if (!checked.ok) return fail('invalid', checked.errors)

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
      const updated = {
        ...target,
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
      requiresReview: effectiveRequiresReview(policyRequiresReview, payload.requiresReview === true),
      state: 'pending',
      attempt: 0,
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
  function getTask(input, sessionId) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')
    return { ok: true, task: structuredClone(task) }
  }

  /** 汇报进度：只记录，不改变任务状态（阻塞原因一并记录）。 */
  function reportProgress(input, sessionId, actor = null) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')
    const at = new Date().toISOString()
    const note = input?.note ?? ''
    task.progress = [...(task.progress ?? []), { note, at }]
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

  /**
   * 提交结果：pending 先 dispatch（MVP：单成员会话里该成员自行领取），
   * 再走 result_submitted；requiresReview 由任务决定，检查结果由调用方给证据。
   */
  function submitResult(input, sessionId) {
    const state = stateOf(sessionId)
    const found = state.tasks.get(input?.taskId)
    if (!found) return fail('not_found', 'task not found')

    let task = found
    if (task.state === 'pending') {
      const dispatched = transitionTask(task, { type: 'dispatch' })
      if (dispatched.kind !== 'ok') return fail(dispatched.code, dispatched.detail)
      task = { ...task, state: dispatched.next, attempt: (task.attempt ?? 0) + 1 }
    }

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
    task = {
      ...task,
      state: moved.next,
      blockedReason: moved.next === 'blocked' ? (input?.blockReason ?? 'acceptance not verified') : null,
      result: {
        resultId: `result-${randomUUID()}`,
        executionId: task.executionId ?? null,
        summary: input?.summary ?? '',
        artifactRefs: Array.isArray(input?.artifactRefs) ? input.artifactRefs : [],
        at,
      },
      updatedAt: at,
    }
    state.tasks.set(task.taskId, task)
    if (task.memberId) {
      recordActivity(sessionId, {
        memberId: task.memberId,
        kind: 'result',
        taskId: task.taskId,
        executionId: task.executionId ?? null,
        summary: `提交结果：${(task.result.summary || '').slice(0, 90)}`,
        text: task.result.summary,
        detail: { state: task.state, artifactRefs: task.result.artifactRefs },
      })
    }
    const persisted = persist()
    return { ok: true, taskId: task.taskId, state: task.state, attempt: task.attempt, persisted }
  }

  /**
   * 审查结果（Reviewer）：只针对处于 review 的任务。
   * pass -> completed（必须绑定 reviewId）；fail -> pending（返工）；
   * unable -> 拒绝（无法验证不等于通过，§7.4）。
   */
  function submitReview(input, sessionId) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(input?.taskId)
    if (!task) return fail('not_found', 'task not found')

    const verdict = input?.verdict
    if (verdict === 'unable') {
      return fail('unverifiable', 'cannot review without verifiable evidence')
    }

    if (verdict === 'fail') {
      const moved = transitionTask(task, { type: 'review_failed', reason: input?.reason ?? null })
      if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
      const at = new Date().toISOString()
      const next = { ...task, state: moved.next, review: { verdict: 'fail', reason: input?.reason ?? '', at }, updatedAt: at }
      state.tasks.set(task.taskId, next)
      const persisted = persist()
      return { ok: true, taskId: task.taskId, state: next.state, persisted }
    }

    if (verdict !== 'pass') return fail('invalid', 'verdict must be pass | fail | unable')
    if (task.state !== 'review') return fail('invalid_transition', `task is ${task.state}, not review`)

    const missingViews = missingAcceptanceViewsForTask(task, [...(state.viewObjects?.values() ?? [])], state.metadata?.requiredViews ?? [])
    if (missingViews.length > 0) {
      return fail('precondition_failed', `missing required acceptance view objects: ${missingViews.map((v) => `${v.type}:${v.id}`).join(', ')}`)
    }

    const reviewId = `review-${++state.reviewCounter}`
    const moved = transitionTask(task, { type: 'review_passed', reviewId })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)

    const at = new Date().toISOString()
    const next = {
      ...task,
      state: moved.next,
      review: { reviewId, verdict: 'pass', reason: input?.reason ?? '', evidenceRefs: Array.isArray(input?.evidenceRefs) ? input.evidenceRefs : [], at },
      updatedAt: at,
    }
    state.tasks.set(task.taskId, next)
    if (task.memberId) {
      recordActivity(sessionId, {
        memberId: task.memberId,
        kind: 'result',
        taskId: task.taskId,
        executionId: task.executionId ?? null,
        summary: `验收通过 (${reviewId})`,
        text: input?.reason ?? '',
        detail: { verdict: 'pass', reviewId },
      })
    }
    const persisted = persist()
    return { ok: true, taskId: task.taskId, state: next.state, reviewId, persisted }
  }

  /**
   * 启动外部执行：pending → running（attempt+1）。外部执行本身由 runner 负责，
   * 本方法只做状态迁移与持久化。
   */
  function startExecution(sessionId, taskId, binding = {}) {
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    if (!task) return fail('not_found', 'task not found')
    const moved = transitionTask(task, { type: 'dispatch' })
    if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
    const at = new Date().toISOString()
    const executionId = `exec-${randomUUID()}`
    const next = { ...task, state: moved.next, attempt: (task.attempt ?? 0) + 1, executionId, memberId: binding.memberId ?? null, progress: [], blockedReason: null, updatedAt: at }
    state.executions.set(executionId, { executionId, taskId, memberId: next.memberId, connectorId: binding.connectorId ?? null,
      attempt: next.attempt, writeScope: binding.writeScope ?? null, sandbox: binding.sandbox ?? null,
      ...(binding.dispatchedBy ? { dispatchedBy: structuredClone(binding.dispatchedBy) } : {}),
      hostBootId, metrics: {}, state: 'running', nativeSessionRef: null, createdAt: at, updatedAt: at })
    state.tasks.set(next.taskId, next)
    const persisted = persist()
    return { ok: true, taskId: next.taskId, executionId: next.executionId, state: next.state, attempt: next.attempt, persisted }
  }

  function recordExecutionEvent(sessionId, taskId, event, executionId) {
    event = { ...event, type: normalizeEventType(event.type) }
    const state = stateOf(sessionId)
    const task = state.tasks.get(taskId)
    if (!task || task.executionId !== executionId) return fail('stale', 'execution is no longer current')
    const execution = state.executions.get(executionId)
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
      task.progress.push({ note: event.text.slice(0, 1500), at: new Date().toISOString(), source: 'member' })
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
    return { ok: true }
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
      transactionOpen = true
      try {
        const result = operation(...args)
        transactionOpen = false
        if (result?.ok === false) {
          sessions.clear(); for (const [key, value] of before) sessions.set(key, value)
          bindings = previousBindings
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
        throw error
      }
    }
  }

  function audited(operation, type) {
    return transaction((input, scope, actor) => command(scope, input?.commandId, { type, input }, () => {
      const task = stateOf(scope).tasks.get(input?.taskId)
      if (input?.executionId && task?.executionId !== input.executionId) return fail('stale', 'execution is no longer current')
      if (input?.resultId && task?.result?.resultId !== input.resultId) return fail('stale', 'result is no longer current')
      if (operation === submitReview && task?.executionId) {
        const execution = stateOf(scope).executions.get(task.executionId)
        if (!['finished', 'stopped'].includes(execution.state)) return fail('precondition_failed', 'native execution must end before review')
      }
      if (operation === submitResult && task?.state === 'pending') startExecution(scope, task.taskId, { memberId: actor?.id })
      const out = operation(operation === submitResult && actor?.kind === 'member' ? { ...input, needsReview: true } : input, scope)
      if (out.ok && !out.replayed) {
        const taskId = out.taskId ?? out.result?.taskId ?? null
        const updated = taskId ? stateOf(scope).tasks.get(taskId) : null
        if (operation === submitResult && updated?.executionId) {
          const execution = stateOf(scope).executions.get(updated.executionId)
          if (execution.state !== 'running') return fail('precondition_failed', 'resolve outstanding requests before submitting a result')
          if (!execution.connectorId) moveExecution(execution, 'turn_settled')
        }
        if (operation === submitReview) updated.review = { ...updated.review, executionId: updated.executionId, resultId: updated.result.resultId, actor }
        appendEvent(scope, type, { input, outcome: out }, actor, taskId, updated?.executionId ?? null)
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

  function bindSession(sessionId, scope, metadata, member = {}) {
    const existing = bindings.get(sessionId)
    if (existing) {
      if (existing.teamSessionId !== scope) return fail('conflict', 'session already belongs to another run')
      return { ok: true, binding: existing }
    }
    const state = stateOf(scope)
    if (!state.metadata) state.metadata = structuredClone(metadata)
    else if (metadata && typeof metadata === 'object') {
      if (!state.metadata.cwd && metadata.cwd) state.metadata.cwd = metadata.cwd
      if (!state.metadata.workspaceId && metadata.workspaceId) state.metadata.workspaceId = metadata.workspaceId
    }
    const binding = { sessionId, teamSessionId: scope, teamId: state.metadata.teamId,
      roleKind: member.roleKind ?? 'commander', memberId: member.memberId ?? state.metadata.commanderId,
      executionId: member.executionId ?? null }
    bindings.set(sessionId, binding)
    if (binding.executionId) {
      const execution = state.executions.get(binding.executionId)
      execution.nativeSessionRef = { backend: 'hosted', sessionId, hostBootId }
    }
    appendEvent(scope, 'session.bound', binding)
    return { ok: true, binding }
  }

  function authorizeTask(scope, input, binding, tool) {
    const task = stateOf(scope).tasks.get(input.taskId)
    if (!task) return fail('not_found', 'task not found')
    if (binding.roleKind === 'worker' && (task.memberId !== binding.memberId || task.executionId !== binding.executionId)) return fail('unauthorized', 'task is not assigned to this member session')
    if (tool === 'submit_result' && (!task.executionId || input.executionId !== task.executionId)) return fail('stale', 'current executionId required')
    if (['submit_result', 'report_progress'].includes(tool) && binding.roleKind === 'worker' && input.executionId !== binding.executionId) return fail('stale', 'current executionId required')
    if (tool === 'submit_review' && (input.executionId !== task.executionId || input.resultId !== task.result?.resultId)) return fail('stale', 'current executionId and resultId required')
    return { ok: true }
  }

  function settleExecution(scope, taskId, executionId, outcome) {
    const state = stateOf(scope)
    const task = state.tasks.get(taskId)
    if (!task || task.executionId !== executionId) return fail('stale', 'execution is no longer current')
    const execution = state.executions.get(executionId)
    if (['finished', 'stopped', 'unknown'].includes(execution.state)) return { ok: true, state: task.state }
    for (const request of state.requests.values()) if (request.executionId === executionId && ['pending', 'decided'].includes(request.status)) request.status = 'expired'
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

  function decideRequest(scope, input, actor) {
    const state = stateOf(scope)
    const request = state.requests.get(input.requestId)
    if (!request) return fail('not_found', 'request not found')
    const hash = JSON.stringify(input.answer)
    if (request.commandId === input.commandId) return request.answerHash === hash ? { ok: true, request, replayed: true } : fail('conflict', 'command reused with different answer')
    if (request.status !== 'pending' || state.tasks.get(request.taskId).executionId !== request.executionId) return fail('precondition_failed', 'request is no longer pending')
    if (!['waiting_input', 'waiting_approval'].includes(state.executions.get(request.executionId).state)) return fail('precondition_failed', 'execution is no longer waiting for input')
    if (request.kind === 'approval' && !['accept', 'decline', 'cancel'].includes(input.answer?.decision)) return fail('invalid', 'decision must be accept, decline or cancel')
    if (request.kind === 'question') {
      for (const question of request.payload.questions) {
        const answers = input.answer?.answers?.[question.id]?.answers
        if (!Array.isArray(answers) || answers.length === 0 || answers.some((a) => typeof a !== 'string' || !a.trim())) return fail('invalid', `answer required for ${question.id}`)
      }
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
    appendEvent(scope, `${request.kind}.decided`, { requestId: request.requestId, answer: input.answer }, actor, request.taskId, request.executionId)
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
      if (!task || task.executionId !== input.executionId) return fail('stale', 'current task and execution required')
      const execution = state.executions.get(input.executionId)
      if (execution.state !== 'unknown') return fail('precondition_failed', 'execution is not unknown')
      if (typeof input.reason !== 'string' || !input.reason.trim()) return fail('invalid', 'adjudication reason required')
      let moved
      if (input.action === 'confirm_failed') {
        const stopProofKinds = ['hosted_idle', 'codex_reconcile_stopped']
        if (!stopProofKinds.includes(evidence?.kind) || evidence?.verified === false) {
          return fail('precondition_failed', 'no verified native stop evidence; cannot release workspace')
        }
        moved = transitionTask(task, { type: 'adjudicate_abandon', stopConfirmedOrIsolated: true })
        if (moved.kind !== 'ok') return fail(moved.code, moved.detail)
        moveExecution(execution, 'reconcile_stopped')
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
        execution.quarantined = true // Original workspace remains reserved. This is not a stop observation.
      } else return fail('invalid', 'action must be confirm_failed or retry_isolated')
      task.state = moved.next
      task.needsAdjudication = false
      task.blockedReason = null
      task.updatedAt = new Date().toISOString()
      appendEvent(scope, 'execution.adjudicated', { action: input.action, reason: input.reason, evidence }, actor, task.taskId, execution.executionId)
      return { ok: true, state: task.state, executionState: execution.state, retryCwd: task.retryCwd ?? null }
    })
  }

  let recovered = false
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
      if (actor?.role === 'worker' && exec.memberId !== actor.id) {
        return fail('unauthorized', 'execution belongs to another member')
      }
    } else if (task?.executionId) {
      const exec = state.executions.get(task.executionId)
      if (exec && (!actor?.id || actor.role === 'runtime' || exec.memberId === actor.id)) {
        resolvedExecutionId = exec.executionId
      }
    }
    return { ok: true, taskId: input.taskId ?? null, executionId: resolvedExecutionId }
  }

  function canEditViewObject(existing, actor) {
    if (!actor || actor.kind === 'runtime') return true
    const actorId = String(actor.id || '')
    const ownerId = existing.ownerId || existing.authorId
    if (actorId && actorId === ownerId) return true
    if (Array.isArray(existing.editableBy) && (existing.editableBy.includes(actorId) || (actor.role && existing.editableBy.includes(actor.role)))) {
      return true
    }
    return false
  }

  function isVersionReferenced(state, objectId, version) {
    for (const task of state.tasks.values()) {
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
      if (task.review?.verdict === 'pass' && task.result?.at) {
        // Also pin latest object version associated with an accepted task at review time if tagged
        if (task.viewObjectVersions?.[objectId] === version) return true
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

  return {
    getStatus: (scope) => structuredClone(getStatus(scope)),
    getModelStatus: (scope) => {
      const full = getStatus(scope)
      const { viewObjects, ...rest } = full
      return structuredClone({ ...rest, viewObjectRefs: (viewObjects || []).map(summarizeViewObject) })
    },
    getTask, listSessions, noteActivation, getActivations,
    submit: audited(submit, 'decision.applied'), reportProgress: audited(reportProgress, 'task.progress'),
    submitResult: audited(submitResult, 'result.submitted'), submitReview: audited(submitReview, 'review.submitted'),
    startExecution: transaction((scope, taskId, binding) => command(scope, binding?.commandId, { type: 'dispatch', taskId, binding }, () => {
      const state = stateOf(scope)
      const task = state.tasks.get(taskId)
      const reserved = [...state.executions.values()].some((e) => e.state === 'unknown' && e.quarantined)
      if (reserved) {
        const isHostedRetry = String(binding?.connectorId || '').startsWith('hosted:') && ['read-only', 'workspace-write', 'host-controlled'].includes(binding?.sandbox)
        const isCodexRetry = binding?.connectorId === 'codex' && ['read-only', 'workspace-write'].includes(binding?.sandbox) && binding?.approvals === 'ask'
        if (!binding?.writeScope || !task?.retryCwd || workspaceKey(binding.writeScope) !== task.retryCwd || (!isCodexRetry && !isHostedRetry)) {
          return fail('precondition_failed', 'retry must use its isolated cwd, bounded sandbox and ask approvals')
        }
      }
      if (binding?.writeScope && [...sessions.values()].some((run) => [...run.executions.values()].some((e) => scopesOverlap(e.writeScope, binding.writeScope) && !['finished', 'stopped'].includes(e.state)))) return fail('precondition_failed', 'workspace has an active or unconfirmed execution')
      if ([...state.executions.values()].some((e) => ['running', 'waiting_input', 'waiting_approval', 'interrupting', 'unknown'].includes(e.state) && !e.quarantined)) return fail('precondition_failed', 'another execution is active or unconfirmed in this run')
      const out = startExecution(scope, taskId, binding)
      if (out.ok) {
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
        const inferredCmd = commanderIds[0] || (scope.startsWith('run-') ? scope.slice(4) : null)
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
        const inferredCmd = commanderIds[0] || (scope.startsWith('run-') ? scope.slice(4) : null)
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
    recordExecutionEvent: transaction(recordExecutionEvent), completeExecution: transaction(completeExecution),
    settleExecution: transaction(settleExecution),
    adjudicate: transaction(adjudicate),
    replayCommand(scope, commandId, content) {
      const previous = stateOf(scope).commands.get(commandId)
      if (!previous) return null
      return previous.hash === JSON.stringify(content) ? { ...structuredClone(previous.result), replayed: true } : fail('idempotency_conflict', 'commandId reused with different content')
    },
    bindSession: transaction(bindSession), getBinding: (id) => structuredClone(bindings.get(id) ?? null),
    authorizeTask, decideRequest: transaction(decideRequest), delivery: transaction(delivery),
    requestCancel: transaction((scope, taskId, actor, input = {}) => command(scope, input.commandId, { type: 'cancel', taskId, executionId: input.executionId }, () => {
      const state = stateOf(scope), task = state.tasks.get(taskId)
      if (!task) return fail('not_found', 'task not found')
      if (input.executionId && task.executionId !== input.executionId) return fail('stale', 'execution is no longer current')
      const execution = state.executions.get(task.executionId)
      if (!execution || !['running', 'waiting_input', 'waiting_approval'].includes(execution.state)) return fail('precondition_failed', 'execution cannot be cancelled')
      moveExecution(execution, 'cancel_requested')
      appendEvent(scope, 'execution.cancel_requested', {}, actor, taskId, execution.executionId)
      return { ok: true, executionId: execution.executionId }
    })),
    recordStructured, getStructured, listStructured,
    recordActivity, getMemberActivity,
    publishViewObject: transaction((scope, input, actor = { kind: 'runtime', id: 'concerto' }) => {
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
          updatedBy: actorId,
          taskId: ref.taskId ?? existing?.taskId ?? null,
          executionId: ref.executionId ?? existing?.executionId ?? null,
          teamSessionId: scope,
          version,
          updatedAt: new Date().toISOString(),
          source: actor?.kind === 'member' ? 'member_tool' : 'runtime',
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
    readViewObject(scope, input = {}) {
      if (typeof input?.id !== 'string' || input.id === '') return fail('invalid', 'id required')
      const state = stateOf(scope)
      const current = state.viewObjects.get(input.id)
      if (!current) return fail('not_found', `view object "${input.id}" not found`)
      let target = current
      if (input.version !== undefined) {
        if (!Number.isInteger(input.version) || input.version < 1) return fail('invalid', 'version must be a positive integer')
        if (input.version !== current.version) {
          const hist = state.viewObjectHistory.get(input.id) ?? []
          const found = hist.find((v) => v.version === input.version)
          if (!found) return fail('not_found', `view object "${input.id}" version ${input.version} not found`)
          target = found
        }
      }
      const projected = projectViewObjectWithRuntimeState(target, [...state.tasks.values()], [...state.executions.values()])
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
}
