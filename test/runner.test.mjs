import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { createTaskRunner, buildTaskPrompt } from '../packages/dsh-concerto/lib/runner.mjs'

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
