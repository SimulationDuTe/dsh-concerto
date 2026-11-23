import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { createTaskRunner, buildTaskPrompt } from '../packages/dsh-concerto/lib/runner.mjs'
import { buildToolDefinitions } from '../packages/dsh-concerto/lib/tools.mjs'
import { createCodexAdapter } from '../packages/dsh-concerto/lib/connector/codex-adapter.mjs'

const S = 'session-runner'
const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms))

const createTask = {
  title: 't', objective: 'o', constraints: [], acceptance: ['a'], dependsOn: [], assigneeRole: 'worker',
}

function seedTask(rt, extra = {}) {
  const r = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: { ...createTask, ...extra } }, S)
  assert.equal(r.ok, true)
  return 'task-1'
}

function fakeAdapter(outcome) {
  return {
    id: 'fake',
    displayName: 'Fake',
    capabilities: {},
    async probe() { return { ok: true } },
    start({ onEvent }) {
      onEvent?.({ type: 'output.message', text: 'working' })
      return { completion: Promise.resolve(outcome), cancel() {} }
    },
  }
}

function makeRunner(rt, outcome = { ok: true, text: 'done' }) {
  const registry = { get: (id) => (id === 'fake' ? fakeAdapter(outcome) : null) }
  return createTaskRunner({ runtime: rt, registry, defaultCwd: 'F:\\CodingFolder\\Concerto' })
}

test('dispatch command replay does not start another native process', async () => {
  const rt = createTeamRuntime(), taskId = seedTask(rt)
  let starts = 0
  const runner = createTaskRunner({ runtime: rt, defaultCwd: process.cwd(), registry: { get: () => ({ id: 'fake',
    start() { starts++; return { completion: Promise.resolve({ status: 'completed', text: 'candidate' }) } },
  }) } })
  const input = { scope: S, taskId, connector: 'fake', commandId: 'dispatch-one' }
  const first = runner.dispatch(input)
  await tick()
  const replay = runner.dispatch(input)
  assert.equal(replay.replayed, true)
  assert.equal(replay.executionId, first.executionId)
  assert.equal(starts, 1)
  assert.equal(runner.dispatch({ ...input, sandbox: 'workspace-write' }).code, 'idempotency_conflict')
})

for (const scenario of ['accepted', 'rejected']) {
  test(`Codex next-turn question records the real send outcome when the backend ${scenario} the next turn`, { timeout: 5000 }, async (t) => {
    const runtime = createTeamRuntime()
    const taskId = seedTask(runtime)
    const notice = Promise.withResolvers()
    const fixture = fileURLToPath(new URL('./fixtures/app-server.mjs', import.meta.url))
    const adapter = createCodexAdapter({ timeoutMs: 2500,
      spawnProcess: (_bin, _args, options) => spawn(process.execPath, [fixture, `next_turn_${scenario}`], options) })
    const runner = createTaskRunner({ runtime, defaultCwd: process.cwd(), registry: { get: () => adapter },
      notifyCommander(scope, requestId) { notice.resolve({ scope, requestId }) },
    })
    t.after(() => runner.dispose())
    const { executionId } = runner.dispatch({ scope: S, taskId, connector: 'codex' })
    const { scope, requestId } = await notice.promise
    assert.equal(scope, S)
    assert.equal(runtime.getStatus(S).requests[0].status, 'pending')
    const input = { requestId, commandId: 'answer-once', answer: { answers: { answer: { answers: ['GLB'] } } } }
    const user = { kind: 'user', id: 'local-owner' }
    assert.equal((await runner.answer(S, input, user)).status, 'decided')
    assert.equal((await runner.answer(S, input, user)).replayed, true)
    assert.equal(runtime.getStatus(S).executions[0].state, 'waiting_input')
    const deadline = Date.now() + 3000
    while (runtime.getStatus(S).requests[0].status === 'decided' && Date.now() < deadline) await tick()
    const snapshot = runtime.getStatus(S)
    const events = snapshot.events.filter((event) => event.executionId === executionId)
    const ended = events.findIndex((event) => event.type === 'execution.turn_completed' && event.payload.turnId === 'first-turn')
    assert.ok(ended >= 0)
    if (scenario === 'accepted') {
      const started = events.findIndex((event) => event.payload.phase === 'turn.ack' && event.payload.turnId === 'answer-turn')
      const delivered = events.findIndex((event) => event.type === 'question.delivered')
      assert.ok(ended < started && started < delivered)
      assert.equal(snapshot.requests[0].status, 'delivered')
    } else {
      assert.equal(snapshot.requests[0].status, 'delivery_failed')
      assert.equal(snapshot.executions[0].state, 'unknown')
      assert.equal(events.some((event) => event.type === 'question.delivered'), false)
    }
    assert.equal(snapshot.requests[0].answerFacts[0].source, 'user')
  })
}

test('Commander cancellation persists the current execution before signaling and replays without signaling again', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-cancel-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const statePath = join(dir, 'runtime.json')
  const runtime = createTeamRuntime({ statePath })
  assert.equal(runtime.bindSession('commander-session', S, { teamId: 'team', commanderId: 'commander', cwd: dir }).ok, true)
  const taskId = seedTask(runtime)
  const completion = Promise.withResolvers()
  let signals = 0
  const runner = createTaskRunner({ runtime, defaultCwd: dir, registry: { get: () => ({
    id: 'fake',
    start: () => ({
      completion: completion.promise,
      cancel() {
        signals++
        const persisted = JSON.parse(readFileSync(statePath, 'utf8')).sessions.find((run) => run.sessionId === S)
        assert.equal(persisted.executions[0].state, 'interrupting')
        assert.ok(persisted.decisions.some((row) => row.id === 'cancel-once'))
      },
    }),
  }) } })
  const execution = runner.dispatch({ scope: S, taskId, connector: 'fake' })
  assert.equal(execution.ok, true)
  const { executionId } = execution
  const scope = { teamSessionId: S, roleKind: 'commander', memberId: 'commander' }
  const tool = buildToolDefinitions(runtime, { submitDecision: runner.submitDecision }).find((definition) => definition.name === 'submit_decision')
  const input = {
    decisionId: 'cancel-once', expectedPlanRevision: 2, action: 'request_cancel',
    payload: { taskId, executionId, reason: 'Stop this attempt' },
  }
  assert.equal((await tool.run(input, null, { ...scope, memberId: 'other' })).code, 'unauthorized')
  assert.equal((await tool.run({ ...input, expectedPlanRevision: 1 }, null, scope)).code, 'stale')
  assert.equal((await tool.run({ ...input, payload: { taskId, executionId: 'old-execution' } }, null, scope)).code, 'stale')
  assert.equal((await runner.cancel(S, taskId, { kind: 'user', id: 'local-owner' }, { commandId: 'stale-pending-click' })).code, 'stale')
  assert.equal(signals, 0)
  const [first, retry] = await Promise.all([tool.run(input, null, scope), tool.run(input, null, scope)])
  assert.equal(first.ok, true)
  assert.equal(first.delivery, undefined)
  assert.deepEqual(first.result, { taskId, executionId, state: 'interrupting' })
  assert.equal(retry.replayed, true)
  assert.deepEqual(retry.result, first.result)
  assert.equal((await tool.run({ ...input, payload: { taskId } }, null, scope)).code, 'idempotency_conflict')
  assert.equal(signals, 1)
  const task = runtime.getTask({ taskId }, S).task
  assert.equal(task.state, 'running')
  const event = task.events.find((event) => event.type === 'execution.cancel_requested')
  assert.equal(event.actor.id, 'commander')
  assert.equal(event.payload.reason, input.payload.reason)
  completion.resolve({ status: 'interrupted' })
  await tick()
  assert.equal(runtime.getTask({ taskId }, S).task.state, 'cancelled')
  assert.equal((await tool.run(input, null, scope)).replayed, true)
  assert.equal((await tool.run(input, null, { ...scope, memberId: 'other' })).code, 'unauthorized')
  assert.equal(signals, 1)
})

test('Commander can cancel a pending task once without involving a backend', async () => {
  const runtime = createTeamRuntime()
  assert.equal(runtime.bindSession('commander-session', S, { teamId: 'team', commanderId: 'commander' }).ok, true)
  const taskId = seedTask(runtime)
  const runner = createTaskRunner({ runtime })
  const actor = { kind: 'member', role: 'commander', id: 'commander' }
  const input = {
    decisionId: 'cancel-before-dispatch', expectedPlanRevision: 2, action: 'request_cancel',
    payload: { taskId, reason: 'No longer needed' },
  }
  const cancelled = await runner.submitDecision(input, S, actor)
  assert.deepEqual(cancelled.result, { taskId, executionId: null, state: 'cancelled' })
  assert.equal(runtime.getStatus(S).planRevision, 3)
  assert.deepEqual(runtime.getStatus(S).executions, [])
  assert.equal((await runner.submitDecision(input, S, actor)).replayed, true)
  const events = runtime.getTask({ taskId }, S).task.events.filter((event) => event.type === 'task.cancelled')
  assert.equal(events.length, 1)
  assert.equal(events[0].payload.reason, input.payload.reason)
})

test('Commander cancellation keeps unavailable channels running and records an uncertain interruption as unknown', async () => {
  const actor = { kind: 'member', role: 'commander', id: 'commander' }
  const handle = { completion: new Promise(() => {}) }
  const runtime = createTeamRuntime()
  runtime.bindSession('commander-session', S, { teamId: 'team', commanderId: actor.id, cwd: process.cwd() })
  const taskId = seedTask(runtime)
  const runner = createTaskRunner({ runtime, defaultCwd: process.cwd(), registry: { get: () => ({
    id: 'fake', start: () => handle,
  }) } })
  const { executionId } = runner.dispatch({ scope: S, taskId, connector: 'fake' })
  const input = { decisionId: 'cancel', expectedPlanRevision: 2, action: 'request_cancel', payload: { taskId } }
  assert.equal((await runner.submitDecision(input, S, actor)).code, 'precondition_failed')
  assert.equal(runtime.getStatus(S).executions.find((execution) => execution.executionId === executionId).state, 'running')
  handle.cancel = () => { throw new Error('interrupt transport closed') }
  const outcome = await runner.submitDecision(input, S, actor)
  assert.equal(outcome.result.executionId, executionId)
  assert.deepEqual(outcome.delivery, { state: 'unknown', detail: 'interrupt transport closed' })
  assert.equal(runtime.getStatus(S).executions.find((execution) => execution.executionId === executionId).state, 'unknown')
  assert.equal(runtime.getTask({ taskId }, S).task.needsAdjudication, true)
})

test('runner: unknown connector rejected', () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = makeRunner(rt)
  const out = runner.dispatch({ sessionId: S, taskId, connector: 'nope' })
  assert.equal(out.ok, false)
  assert.equal(out.code, 'unsupported_connector')
  assert.equal(rt.getTask({ taskId }, S).task.state, 'pending')
})

test('runner: missing task rejected', () => {
  const rt = createTeamRuntime()
  const runner = makeRunner(rt)
  const out = runner.dispatch({ sessionId: S, taskId: 'nope', connector: 'fake' })
  assert.equal(out.ok, false)
  assert.equal(out.code, 'not_found')
})

test('runner: dispatch moves task to running, completed turn awaits acceptance', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = makeRunner(rt)

  const out = runner.dispatch({ sessionId: S, taskId, connector: 'fake' })
  assert.equal(out.ok, true)
  assert.equal(out.state, 'running')

  await tick()
  const task = rt.getTask({ taskId }, S).task
  assert.equal(task.state, 'review')
  assert.equal(task.result.summary, 'done')
  assert.equal(task.result.connector, 'fake')
  assert.equal(task.attempt, 1)
  assert.ok(task.events.length >= 1)
})

test('runner: failed execution blocks the task', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = makeRunner(rt, { ok: false, status: 'failed', code: 'execution_failed', detail: 'boom' })

  runner.dispatch({ sessionId: S, taskId, connector: 'fake' })
  await tick()
  const task = rt.getTask({ taskId }, S).task
  assert.equal(task.state, 'blocked')
  assert.equal(task.result.summary, 'boom')
})

test('runner: requiresReview task lands in review', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt, { requiresReview: true })
  const runner = makeRunner(rt)
  runner.dispatch({ sessionId: S, taskId, connector: 'fake' })
  await tick()
  assert.equal(rt.getTask({ taskId }, S).task.state, 'review')
})

test('runner: same task cannot be dispatched twice concurrently', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = makeRunner(rt, { ok: true, text: 'slow' })

  const first = runner.dispatch({ sessionId: S, taskId, connector: 'fake' })
  assert.equal(first.ok, true)
  const second = runner.dispatch({ sessionId: S, taskId, connector: 'fake' })
  assert.equal(second.ok, false)
  // 第二次被拒的原因可能是 already_running 或 invalid_transition（取决于时序）
  assert.ok(['already_running', 'invalid_transition', 'precondition_failed'].includes(second.code))
  await tick()
})

test('runner: buildTaskPrompt carries task facts and the task id', () => {
  const prompt = buildTaskPrompt({ ...createTask, title: 'Implement X', objective: 'Do Y', acceptance: ['tests pass'] }, 'task-7')
  assert.match(prompt, /Implement X/)
  assert.match(prompt, /tests pass/)
  assert.match(prompt, /task-7/)
  assert.match(prompt, /submit_result/)
})

test('runner: buildTaskPrompt includes team template requiredViews when passed', () => {
  const prompt = buildTaskPrompt(
    { ...createTask, title: 'Implement X', objective: 'Do Y', acceptance: ['tests pass'] },
    'task-8',
    ['mindmap:plan', { type: 'checklist', id: 'team-gate', requiredForAcceptance: true }],
  )
  assert.match(prompt, /mindmap:plan \(recommended\)/)
  assert.match(prompt, /checklist:team-gate \(required for acceptance\)/)
})

test('runner: hosted dispatch is rejected when no hostedStart is configured', () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = createTaskRunner({ runtime: rt, registry: { get: () => null }, defaultCwd: 'F:\\x' })
  const out = runner.dispatch({ sessionId: S, taskId, hosted: { agentPreset: 'team--w1', memberId: 'w1' } })
  assert.equal(out.ok, false)
  assert.equal(out.code, 'hosted_unavailable')
})

test('runner: hosted member that never submits a result ends blocked', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = createTaskRunner({
    runtime: rt,
    registry: { get: () => null },
    defaultCwd: 'F:\\x',
    hostedStart: async () => ({ ok: true, sessionId: 'session-member' }),
  })
  const out = runner.dispatch({ sessionId: S, taskId, hosted: { agentPreset: 'team--w1', memberId: 'w1' } })
  assert.equal(out.ok, true)
  assert.equal(out.state, 'running')

  await tick()
  const task = rt.getTask({ taskId }, S).task
  assert.equal(task.state, 'blocked')
  assert.match(task.result.summary, /without submitting a result/)
  assert.equal(task.result.connector, 'hosted:w1')
})

test('runner: hosted transport failure leaves execution unknown', async () => {
  const rt = createTeamRuntime()
  const taskId = seedTask(rt)
  const runner = createTaskRunner({
    runtime: rt,
    registry: { get: () => null },
    defaultCwd: 'F:\\x',
    hostedStart: async () => ({ ok: false, code: 'create_failed', detail: 'boom' }),
  })
  runner.dispatch({ sessionId: S, taskId, hosted: { agentPreset: 'team--w1', memberId: 'w1' } })
  await tick()
  const task = rt.getTask({ taskId }, S).task
  assert.equal(task.state, 'running')
  assert.equal(task.needsAdjudication, true)
  assert.equal(rt.getStatus(S).executions[0].state, 'unknown')
  assert.equal(rt.getStatus(S).events.at(-1).payload.detail, 'boom')
})


test('runner: external connector dynamic tool call executes publish_view_object with execution scope', async () => {
  const rt = createTeamRuntime()
  rt.bindSession('host-r', S, {
    projectId: 'p1',
    teamId: 't1',
    teamName: 'T1',
    configVersion: 1,
    commanderId: 'c1',
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
  })
  const taskId = seedTask(rt, { assigneeRole: 'worker' })
  let capturedToolSchemas = null
  let toolResults = []

  const runner = createTaskRunner({
    runtime: rt,
    defaultCwd: 'F:\\CodingFolder\\Concerto',
    registry: {
      get: (id) => (id === 'codex' ? {
        id: 'codex',
        displayName: 'Codex',
        capabilities: { approvals: true, dynamicTools: true },
        start({ dynamicTools, onToolCall }) {
          capturedToolSchemas = dynamicTools
          return {
            completion: (async () => {
              toolResults.push(await onToolCall('publish_view_object', {
                id: 'worker-out',
                type: 'diagram',
                renderer: 'svg',
                title: 'Worker Diagram',
                data: { layout: 'dag', nodes: [{ id: 'n1', label: 'Node 1', status: 'done' }] },
              }))
              toolResults.push(await onToolCall('publish_view_object', {
                id: 'forbidden-out',
                type: 'table',
                title: 'Wrong Task',
                taskId: 'task-999',
                data: { columns: ['A'], rows: [['1']] },
              }))
              return { ok: true, status: 'completed', text: 'finished with diagram' }
            })(),
            cancel() {},
          }
        },
      } : null),
    },
  })

  const dispatched = runner.dispatch({ sessionId: S, taskId, memberId: 'w1', connector: 'codex' })
  assert.equal(dispatched.ok, true)
  await tick(40)

  assert.ok(Array.isArray(capturedToolSchemas) && capturedToolSchemas.some((t) => t.name === 'publish_view_object'))
  assert.equal(toolResults[0].ok, true)
  assert.equal(toolResults[0].authorId, 'w1')
  assert.equal(toolResults[0].taskId, taskId)
  assert.equal(toolResults[0].executionId, dispatched.executionId)
  assert.equal(toolResults[1].ok, false)
  assert.equal(toolResults[1].code, 'unauthorized')
  const status = rt.getStatus(S)
  assert.equal(status.viewObjects.length, 1)
  assert.equal(status.viewObjects[0].renderer, 'svg')
})
