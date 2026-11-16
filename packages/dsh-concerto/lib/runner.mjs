import { resolve } from 'node:path'
import { WORKER_TOOL_SCHEMAS, executeMemberToolCall } from './tools.mjs'
/**
 * Task Runner：把任务派发给「外部 Connector」或「hosted 成员会话」，
 * 并把状态迁移、归一化事件与结果写回 runtime。
 *
 * 设计：
 * - §2.1 Task Runner 不取代原生 Agent Loop，只负责派发与事实写入
 * - §7.5 外部执行不是事务的一部分：先提交状态，再异步执行
 * - §2.1 多 Agent：hosted 成员各自独立会话
 */

/** 把任务投影成给成员的原生指令（成员不需要知道团队结构）。 */
export function buildTaskPrompt(task, taskId, teamRequiredViews = []) {
  const constraints = (task.constraints ?? []).join('; ') || '(none)'
  const acceptance = (task.acceptance ?? []).join('; ') || '(none)'
  const mergedRequiredViews = [
    ...(Array.isArray(teamRequiredViews) ? teamRequiredViews : []),
    ...(Array.isArray(task.requiredViews) ? task.requiredViews : []),
  ]
  const requiredViews = mergedRequiredViews.length > 0
    ? mergedRequiredViews.map((v) => (typeof v === 'string'
      ? `${v} (recommended)`
      : `${v.type}:${v.id}${v.requiredForAcceptance ? ' (required for acceptance)' : ' (recommended)'}`)).join('; ')
    : '(none)'
  return [
    'You are the member assigned to one managed task.',
    `Task id: ${taskId}`,
    `Title: ${task.title}`,
    `Objective: ${task.objective}`,
    `Constraints: ${constraints}`,
    `Acceptance: ${acceptance}`,
    `Required view objects: ${requiredViews}`,
    '',
    `First call get_task with taskId "${taskId}" to read the authoritative task.`,
    'Do the work with your own tools.',
    'For simple tasks a checklist/summary may suffice; for complex tasks freely publish tables/diagrams/mindmaps/boards using stable IDs and patch_view_object.',
    `When done, call submit_result with taskId "${taskId}", a summary, checksPassed, and artifactRefs.`,
    'If blocked, report_progress with blockedReason, then submit_result with checksPassed false.',
    'Do not ask questions unless blocked.',
  ].join('\n')
}

export function createTaskRunner({ runtime, registry, defaultCwd = '', hostedStart = null, hostedTimeoutMs = 180000, onError = console.error }) {
  const running = new Map()
  function dispatch(input) {
    const scope = input.scope || input.sessionId
    if (!scope || !input.taskId) return { ok: false, code: 'invalid', detail: 'scope and taskId required' }
    const found = runtime.getTask({ taskId: input.taskId }, scope)
    if (!found.ok) return found
    const { taskId } = input
    const cwd = input.cwd || found.task.retryCwd || defaultCwd
    if (!cwd) return { ok: false, code: 'invalid', detail: 'cwd required' }
    if (input.sandbox && !['read-only', 'workspace-write', 'danger-full-access'].includes(input.sandbox)) return { ok: false, code: 'invalid', detail: 'unsupported sandbox mode' }
    if (input.approvals && !['ask', 'accept', 'decline'].includes(input.approvals)) return { ok: false, code: 'invalid', detail: 'unsupported approval policy' }
    const hosted = input.hosted
    const adapter = hosted ? null : registry.get(input.connector)
    if (hosted && !hostedStart) return { ok: false, code: 'hosted_unavailable' }
    if (!hosted && !adapter) return { ok: false, code: 'unsupported_connector' }
    const memberId = hosted?.memberId ?? input.memberId ?? input.connector
    const started = runtime.startExecution(scope, taskId, {
      memberId,
      connectorId: hosted ? `hosted:${memberId}` : adapter.id,
      commandId: input.commandId,
      sandbox: hosted ? 'host-controlled' : (input.sandbox ?? 'read-only'),
      approvals: input.approvals ?? 'ask',
      writeScope: process.platform === 'win32' ? resolve(cwd).toLowerCase() : resolve(cwd),
      ...(input.dispatchedBy ? { dispatchedBy: input.dispatchedBy } : {}),
    })
    if (!started.ok || started.replayed) return started
    const { executionId } = started
    const teamRequiredViews = typeof runtime.getStatus === 'function' ? (runtime.getStatus(scope)?.metadata?.requiredViews ?? []) : []
    const prompt = input.prompt || (hosted ? buildTaskPrompt(found.task, taskId, teamRequiredViews) + `\nExecution id: ${executionId}. Include executionId in progress and result submissions.`
      : [found.task.title, found.task.objective, 'Constraints: ' + found.task.constraints.join('; '), 'Acceptance: ' + found.task.acceptance.join('; '), 'Return your result with evidence and artifact paths.'].join('\n'))
    let handle
    try {
      if (hosted) {
        const controller = new AbortController()
        const began = performance.now()
        let phase = 'hosted.create', timer
        const native = Promise.resolve().then(() => hostedStart({ cwd, agentPreset: hosted.agentPreset, prompt, scope, executionId, memberId,
          signal: controller.signal, onPhase: (value) => {
            phase = value
            runtime.recordExecutionEvent(scope, taskId, { type: 'execution.phase', phase, elapsedMs: Math.round(performance.now() - began), observedAt: new Date().toISOString() }, executionId)
          },
        })).then((out) => ({ ...out, status: out.ok ? 'completed' : 'unknown', resultMissing: true,
          text: out.ok ? 'member session finished without submitting a result' : out.detail }))
        const deadline = new Promise((resolve) => { timer = setTimeout(() => {
          resolve({ ok: false, status: 'unknown', code: 'hosted_timeout', detail: `Hosted 等待超过 ${hostedTimeoutMs}ms；阶段 ${phase}，原生执行未确认停止` })
          controller.abort(new Error('hosted_timeout'))
        }, hostedTimeoutMs) })
        handle = { completion: Promise.race([native, deadline]).finally(() => clearTimeout(timer)), dispose: () => controller.abort() }
      } else handle = adapter.start({ cwd, prompt, sandbox: input.sandbox ?? 'read-only', approvals: input.approvals ?? 'ask',
        ...(adapter.capabilities?.dynamicTools ? {
          dynamicTools: WORKER_TOOL_SCHEMAS,
          onToolCall: (name, args) => executeMemberToolCall(runtime, { teamSessionId: scope, memberId, roleKind: 'worker', taskId, executionId }, name, args),
        } : {}),
        onEvent: (event) => {
          const out = runtime.recordExecutionEvent(scope, taskId, event, executionId)
          if (!out.ok) throw new Error(`Cannot record execution event: ${out.code}`)
        } })
    } catch (error) {
      runtime.settleExecution(scope, taskId, executionId, { status: 'unknown', detail: error.message })
      return { ok: false, code: 'start_failed', detail: error.message }
    }
    running.set(executionId, handle)
    Promise.resolve(handle.completion)
      .then((out) => runtime.settleExecution(scope, taskId, executionId, {
        ...out, status: out.status ?? (out.ok ? 'completed' : 'unknown'),
      }))
      .catch((error) => {
        onError(error)
        return runtime.settleExecution(scope, taskId, executionId, { status: 'unknown', detail: error.message })
      })
      .catch(onError)
      .finally(() => running.delete(executionId))
    return { ...started, connector: adapter?.id, hosted, memberId }
  }
  async function cancel(scope, taskId, actor, input = {}) {
    const found = runtime.getTask({ taskId }, scope)
    if (!found.ok) return found
    const handle = running.get(found.task.executionId)
    if (!handle?.cancel) return { ok: false, code: 'precondition_failed', detail: 'this execution has no supported cancellation channel' }
    const out = runtime.requestCancel(scope, taskId, actor, input)
    if (!out.ok || out.replayed) return out
    try { await handle.cancel(); return { ok: true, state: 'interrupting' } }
    catch (error) {
      runtime.settleExecution(scope, taskId, found.task.executionId, { status: 'unknown', detail: error.message })
      return { ok: false, code: 'precondition_failed', detail: error.message }
    }
  }
  async function answer(scope, input, actor) {
    const decision = runtime.decideRequest(scope, input, actor)
    if (!decision.ok || decision.replayed) return decision
    const { request } = decision
    const handle = running.get(request.executionId)
    try {
      if (!handle?.respond) throw new Error('backend request channel unavailable')
      await handle.respond(request.nativeRequestId, request.answer)
    } catch (error) {
      runtime.delivery(scope, request.requestId, false, error.message)
      return { ok: false, code: 'precondition_failed', detail: error.message }
    }
    runtime.delivery(scope, request.requestId, true)
    return { ok: true, requestId: request.requestId, status: 'delivered' }
  }
  function dispose() {
    for (const handle of running.values()) handle.dispose?.()
  }
  return { dispatch, cancel, answer, dispose }
}
