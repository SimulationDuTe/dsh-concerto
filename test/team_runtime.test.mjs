import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { executeMemberToolCall } from '../packages/dsh-concerto/lib/tools.mjs'

const S = 'session-a'
const createTask = {
  title: 't', objective: 'o', constraints: ['c'], acceptance: ['npm test'], dependsOn: [], assigneeRole: 'worker',
}

test('runtime: initial status', () => {
  const rt = createTeamRuntime()
  const s = rt.getStatus(S)
  assert.equal(s.planRevision, 1)
  assert.deepEqual(s.tasks, [])
})

test('runtime: create_task bumps planRevision and records task', () => {
  const rt = createTeamRuntime()
  const r = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(r.ok, true)
  assert.equal(r.result.state, 'pending')
  assert.equal(r.planRevision, 2)
  assert.equal(rt.getStatus(S).tasks.length, 1)
})

test('runtime: stale planRevision rejected', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  const r = rt.submit({ decisionId: 'd2', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'stale')
})

test('runtime: replay same decisionId + same content', () => {
  const rt = createTeamRuntime()
  const first = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  const again = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(again.ok, true)
  assert.equal(again.replayed, true)
  assert.equal(again.result.taskId, first.result.taskId)
  assert.equal(rt.getStatus(S).planRevision, 2) // 没有二次递增
})

test('runtime: same decisionId + different content -> idempotency_conflict', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  const r = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: { ...createTask, title: 'other' } }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'idempotency_conflict')
})

test('runtime: wait action accepted', () => {
  const rt = createTeamRuntime()
  const r = rt.submit({ decisionId: 'w1', expectedPlanRevision: 1, action: 'wait', payload: { reason: 'waiting for input' } }, S)
  assert.equal(r.ok, true)
  assert.equal(r.result.waited, true)
  assert.equal(rt.getStatus(S).planRevision, 1) // wait 不改计划版本
})

test('runtime: unsupported action rejected', () => {
  const rt = createTeamRuntime()
  const r = rt.submit({ decisionId: 'x1', expectedPlanRevision: 1, action: 'unknown_action', payload: {} }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'unsupported')
})

test('runtime: finish_goal checks all project runs and persists one replayable completion', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-goal-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const statePath = join(dir, 'runtime.json')
  const rt = createTeamRuntime({ statePath })
  const commander = { teamSessionId: S, memberId: 'c1', roleKind: 'commander' }
  for (const [scope, projectId] of [[S, 'project-a'], ['sibling', 'project-a'], ['unrelated', 'project-b']]) {
    rt.bindSession(`cmd-${scope}`, scope, { projectId, teamId: 'team', commanderId: 'c1' })
  }
  const status = await executeMemberToolCall(rt, commander, 'get_team_status')
  assert.equal(status.goalId, 'project-a')
  assert.equal(status.goalCompletion, null)
  const close = {
    decisionId: 'close', expectedPlanRevision: 3, action: 'finish_goal',
    payload: { goalId: status.goalId, summary: 'All work settled', artifactRefs: ['proof.txt'] },
  }
  assert.equal(rt.submit({ ...close, expectedPlanRevision: 1 }, S).code, 'precondition_failed')
  for (const scope of [S, 'sibling', 'unrelated']) {
    const payload = { ...createTask, requiresReview: scope === S }
    const decisionId = scope === 'sibling' ? 'create-sibling' : 'create'
    const expectedPlanRevision = scope === 'sibling' ? 2 : 1
    assert.equal(rt.submit({ decisionId, expectedPlanRevision, action: 'create_task', payload }, scope).ok, true)
  }
  assert.equal(rt.submit({ ...close, expectedPlanRevision: 1 }, S).code, 'stale')
  assert.equal(rt.submit({ ...close, payload: { ...close.payload, goalId: 'project-b' } }, S).code, 'not_found')
  assert.equal((await executeMemberToolCall(rt, { ...commander, roleKind: 'worker' }, 'submit_decision', close)).code, 'unauthorized')

  const submitResult = (scope) => rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, scope)
  assert.equal(submitResult(S).state, 'review')
  const needsReview = rt.submit(close, S)
  assert.equal(needsReview.code, 'precondition_failed')
  assert.match(needsReview.detail, /review/)
  assert.equal(rt.submitReview({ taskId: 'task-1', verdict: 'pass', evidenceRefs: ['proof.txt'] }, S).ok, true)
  const siblingPending = rt.submit(close, S)
  assert.equal(siblingPending.code, 'precondition_failed')
  assert.match(siblingPending.detail, /sibling\/task-1/)
  assert.equal(submitResult('sibling').state, 'completed')

  const finished = await executeMemberToolCall(rt, commander, 'submit_decision', close)
  assert.equal(finished.ok, true)
  assert.equal(finished.result.state, 'completed')
  assert.equal(finished.result.actor.id, 'c1')
  assert.deepEqual(finished.result.artifactRefs, ['proof.txt'])
  assert.equal(finished.planRevision, 3)
  assert.equal(rt.getStatus('sibling').goalCompletion, null)
  assert.equal(rt.getStatus('unrelated').tasks[0].state, 'pending')
  assert.equal(rt.submit({ ...close, decisionId: 'close-again' }, S).code, 'precondition_failed')
  assert.equal(rt.submit({ decisionId: 'extra', expectedPlanRevision: 3, action: 'create_task', payload: createTask }, S).code, 'precondition_failed')

  const reloaded = createTeamRuntime({ statePath })
  assert.deepEqual(reloaded.getStatus(S).goalCompletion, finished.result)
  assert.equal(reloaded.submit(close, S).replayed, true)
  assert.equal(reloaded.submit({ ...close, payload: { ...close.payload, summary: 'Changed' } }, S).code, 'idempotency_conflict')
  assert.equal(reloaded.getStatus(S).events.filter(({ type }) => type === 'goal.finished').length, 1)
})

test('runtime: finish_goal waits for both the current execution and a quarantined older attempt', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  const binding = { memberId: 'w1', connectorId: 'hosted:w1', sandbox: 'host-controlled', writeScope: join(tmpdir(), 'concerto-original') }
  const first = rt.startExecution(S, 'task-1', binding)
  assert.equal(first.ok, true)
  assert.equal(rt.settleExecution(S, 'task-1', first.executionId, { status: 'unknown' }).ok, true)
  const isolated = join(tmpdir(), 'concerto-isolated')
  const original = { taskId: 'task-1', executionId: first.executionId, reason: 'Recover old attempt' }
  assert.equal(rt.adjudicate(S, { ...original, action: 'retry_isolated', externalEffectsReviewed: true },
    { kind: 'user', id: 'local-owner' }, { kind: 'fresh_directory', cwd: isolated }).ok, true)
  const retry = rt.startExecution(S, 'task-1', { ...binding, writeScope: isolated })
  assert.equal(retry.ok, true)
  assert.equal(rt.submitResult({ taskId: 'task-1', executionId: retry.executionId, summary: 'retry passed', checksPassed: true }, S).state, 'completed')
  const close = {
    decisionId: 'close', expectedPlanRevision: 2, action: 'finish_goal',
    payload: { goalId: rt.getStatus(S).goalId, summary: 'Recovered' },
  }
  const confirm = { ...original, action: 'confirm_failed' }
  const actor = { kind: 'user', id: 'local-owner' }
  const unknown = rt.submit(close, S)
  assert.equal(unknown.code, 'precondition_failed')
  assert.ok(unknown.detail.includes(first.executionId))
  assert.equal(rt.adjudicate(S, confirm, actor).code, 'precondition_failed')
  assert.equal(rt.adjudicate(S, confirm, actor, { kind: 'hosted_idle', verified: true }).executionState, 'stopped')
  const stillRunning = rt.submit(close, S)
  assert.equal(stillRunning.code, 'precondition_failed')
  assert.ok(stillRunning.detail.includes(retry.executionId))
  assert.equal(rt.settleExecution(S, 'task-1', retry.executionId, { status: 'completed' }).ok, true)
  assert.equal(rt.submit(close, S).ok, true)
  const task = rt.getTask({ taskId: 'task-1' }, S).task
  assert.equal(task.executionId, retry.executionId)
  assert.equal(task.result.summary, 'retry passed')
})

test('runtime: invalid payload rejected', () => {
  const rt = createTeamRuntime()
  const r = rt.submit({ decisionId: 'i1', expectedPlanRevision: 1, action: 'create_task', payload: { title: 'x' } }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'invalid')
})

test('runtime: policy requiresReview raises floor', () => {
  const rt = createTeamRuntime({ policyRequiresReview: true })
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(rt.getStatus(S).tasks[0].requiresReview, true)
})

test('runtime: sessions are isolated', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, 'session-a')

  const a = rt.getStatus('session-a')
  const b = rt.getStatus('session-b')
  assert.equal(a.planRevision, 2)
  assert.equal(a.tasks.length, 1)
  assert.equal(b.planRevision, 1)
  assert.equal(b.tasks.length, 0)

  const r = rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, 'session-b')
  assert.equal(r.ok, true) // 另一会话的同名 decisionId 互不影响
})

test('runtime: listSessions summarises known sessions', () => {
  const rt = createTeamRuntime()
  rt.getStatus('s1')
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, 's2')
  const all = rt.listSessions()
  assert.equal(all.length, 2)
  assert.deepEqual(all.map((x) => x.sessionId).sort(), ['s1', 's2'])
})

test('runtime: state persists across runtime instances', async () => {  const dir = await mkdtemp(join(tmpdir(), 'concerto-runtime-'))
  const statePath = join(dir, 'runtime.json')

  const first = createTeamRuntime({ statePath })
  const saved = first.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(saved.persisted, true)

  const second = createTeamRuntime({ statePath })
  const status = second.getStatus(S)
  assert.equal(status.planRevision, 2)
  assert.equal(status.taskCount, 1)
  assert.equal(status.tasks[0].taskId, 'task-1')

  // 决策幂等也跨实例生效：同 decisionId 同内容 -> replayed
  const again = second.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  assert.equal(again.replayed, true)
  // 且另一个实例的会话互不影响
  assert.equal(second.getStatus('session-b').planRevision, 1)
})

test('runtime: get_task returns not_found for unknown id', () => {
  const rt = createTeamRuntime()
  const r = rt.getTask({ taskId: 'nope' }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'not_found')
})

test('runtime: report_progress records a note without changing state', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  const r = rt.reportProgress({ taskId: 'task-1', note: 'looking at tests' }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'pending')
  assert.equal(r.progressCount, 1)

  const task = rt.getTask({ taskId: 'task-1' }, S).task
  assert.equal(task.state, 'pending')
  assert.equal(task.progress.length, 1)
})

test('runtime: submit_result dispatches a pending task then completes it', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)

  const r = rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'completed')
  assert.equal(r.attempt, 1)

  const task = rt.getTask({ taskId: 'task-1' }, S).task
  assert.equal(task.result.summary, 'done')
})

test('runtime: submit_result with requiresReview goes to review, not completed', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: { ...createTask, requiresReview: true } }, S)

  const r = rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'review')
})

test('runtime: submit_result with failed checks blocks the task', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)

  const r = rt.submitResult({ taskId: 'task-1', summary: 'partial', checksPassed: false, blockReason: 'test failed' }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'blocked')
})

test('runtime: submit_result on a terminal task is rejected', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, S)

  const again = rt.submitResult({ taskId: 'task-1', summary: 'done again', checksPassed: true }, S)
  assert.equal(again.ok, false)
  assert.equal(again.code, 'invalid_transition')
})

function reviewTask(rt) {
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: { ...createTask, requiresReview: true } }, S)
  rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, S)
}

test('runtime: review pass completes the task and binds a reviewId', () => {
  const rt = createTeamRuntime()
  reviewTask(rt)

  const r = rt.submitReview({ taskId: 'task-1', verdict: 'pass', reason: 'checked output' }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'completed')
  assert.match(r.reviewId, /^review-\d+$/)

  const task = rt.getTask({ taskId: 'task-1' }, S).task
  assert.equal(task.review.reviewId, r.reviewId)
})

test('runtime: review fail returns the task to pending', () => {
  const rt = createTeamRuntime()
  reviewTask(rt)

  const r = rt.submitReview({ taskId: 'task-1', verdict: 'fail', reason: 'missing evidence' }, S)
  assert.equal(r.ok, true)
  assert.equal(r.state, 'pending')
})

test('runtime: review unable is rejected, never a pass', () => {
  const rt = createTeamRuntime()
  reviewTask(rt)

  const r = rt.submitReview({ taskId: 'task-1', verdict: 'unable', reason: 'cannot verify' }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'unverifiable')
  assert.equal(rt.getTask({ taskId: 'task-1' }, S).task.state, 'review')
})

test('runtime: review pass on a non-review task is rejected', () => {
  const rt = createTeamRuntime()
  rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: createTask }, S)
  rt.submitResult({ taskId: 'task-1', summary: 'done', checksPassed: true }, S) // 无 review -> completed

  const r = rt.submitReview({ taskId: 'task-1', verdict: 'pass', reason: 'x' }, S)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'invalid_transition')
})

test('runtime: review id counter survives persistence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-review-'))
  const statePath = join(dir, 'runtime.json')

  const first = createTeamRuntime({ statePath })
  reviewTask(first)
  const passed = first.submitReview({ taskId: 'task-1', verdict: 'pass', reason: 'ok' }, S)
  assert.equal(passed.reviewId, 'review-1')

  const second = createTeamRuntime({ statePath })
  second.submit({ decisionId: 'd2', expectedPlanRevision: second.getStatus(S).planRevision, action: 'create_task', payload: { ...createTask, requiresReview: true } }, S)
  second.submitResult({ taskId: 'task-2', summary: 'done', checksPassed: true }, S)
  const again = second.submitReview({ taskId: 'task-2', verdict: 'pass', reason: 'ok' }, S)
  assert.equal(again.ok, true)
  assert.equal(again.reviewId, 'review-2')
})
