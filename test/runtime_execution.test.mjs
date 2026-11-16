import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'

const payload = { title: 'Task', objective: 'Deliver', acceptance: ['Evidence'], constraints: [], dependsOn: [], assigneeRole: 'worker' }
function seed(runtime, scope = 'run') {
  runtime.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task', payload }, scope)
  return runtime.startExecution(scope, 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
}
function request(runtime, executionId, scope = 'run') {
  return runtime.recordExecutionEvent(scope, 'task-1', { type: 'approval.requested', requestId: '7', payload: { command: 'echo hello' } }, executionId)
}

test('events retain execution/member/request payload, waiting state is visible in snapshots', () => {
  const rt = createTeamRuntime(), id = seed(rt)
  request(rt, id)
  const status = rt.getStatus('run')
  assert.equal(status.tasks[0].viewState, 'waiting_approval')
  assert.equal(status.tasks[0].memberId, 'w1')
  assert.equal(status.events.at(-1).executionId, id)
  assert.equal(status.events.at(-1).actor.id, 'w1')
  assert.equal(status.requests[0].payload.command, 'echo hello')
  assert.equal(status.requests[0].status, 'pending')
})

test('decision is durable before delivery, replay is idempotent and changed answers conflict', () => {
  const rt = createTeamRuntime(), id = seed(rt)
  request(rt, id)
  const input = { requestId: `${id}:7`, commandId: 'cmd-1', answer: { decision: 'accept' } }
  assert.equal(rt.decideRequest('run', input, { kind: 'user', id: 'owner' }).ok, true)
  assert.equal(rt.getStatus('run').executions[0].state, 'waiting_approval')
  assert.equal(rt.decideRequest('run', input).replayed, true)
  assert.equal(rt.decideRequest('run', { ...input, answer: { decision: 'decline' } }).code, 'conflict')
  assert.equal(rt.delivery('run', input.requestId, true).ok, true)
  assert.equal(rt.getStatus('run').executions[0].state, 'running')
  assert.equal(rt.getStatus('run').requests[0].status, 'delivered')
})

test('request from another run is inaccessible and worker cannot report for another execution', () => {
  const rt = createTeamRuntime(), id = seed(rt)
  request(rt, id)
  assert.equal(rt.decideRequest('other', { requestId: `${id}:7`, commandId: 'x', answer: { decision: 'accept' } }).code, 'not_found')
  assert.equal(rt.authorizeTask('run', { taskId: 'task-1' }, { roleKind: 'worker', memberId: 'w2', executionId: id }, 'get_task').code, 'unauthorized')
})

test('concurrent approvals stay waiting until every policy response is delivered', () => {
  const rt = createTeamRuntime(), id = seed(rt)
  for (const requestId of ['1', '2']) rt.recordExecutionEvent('run', 'task-1', { type: 'approval.requested', requestId, payload: { command: 'fixture' } }, id)
  rt.recordExecutionEvent('run', 'task-1', { type: 'approval.resolved', requestId: '1', decision: 'decline', actor: { kind: 'policy', id: 'decline' } }, id)
  assert.equal(rt.getStatus('run').executions[0].state, 'waiting_approval')
  rt.recordExecutionEvent('run', 'task-1', { type: 'approval.resolved', requestId: '2', decision: 'decline', actor: { kind: 'policy', id: 'decline' } }, id)
  assert.equal(rt.getStatus('run').executions[0].state, 'running')
})

test('restart retains facts, marks live execution unknown and expires pending request', () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-exec-')), 'runtime.json')
  const first = createTeamRuntime({ statePath }), id = seed(first)
  request(first, id)
  const saved = JSON.parse(readFileSync(statePath, 'utf8'))
  assert.equal(saved.sessions[0].requests.length, 1)
  assert.equal(saved.sessions[0].events.at(-1).executionId, id)
  const second = createTeamRuntime({ statePath })
  const status = second.getStatus('run')
  assert.equal(status.tasks[0].viewState, 'unknown')
  assert.equal(status.requests[0].status, 'expired')
  assert.equal(second.startExecution('run', 'task-1').ok, false)
  const third = createTeamRuntime({ statePath })
  assert.equal(third.getStatus('run').events.length, status.events.length)
})

test('review command is replayed after restart without a second event', () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-command-')), 'runtime.json')
  const rt = createTeamRuntime({ statePath }), id = seed(rt)
  rt.settleExecution('run', 'task-1', id, { status: 'completed', text: 'candidate' })
  const resultId = rt.getTask({ taskId: 'task-1' }, 'run').task.result.resultId
  const input = { commandId: 'review-1', taskId: 'task-1', executionId: id, resultId, verdict: 'pass', reason: 'checked artifact' }
  assert.equal(rt.submitReview(input, 'run').ok, true)
  const again = createTeamRuntime({ statePath })
  const count = again.getStatus('run').events.length
  assert.equal(again.submitReview(input, 'run').replayed, true)
  assert.equal(again.getStatus('run').events.length, count)
  assert.equal(again.submitReview({ ...input, verdict: 'fail' }, 'run').code, 'idempotency_conflict')
})

test('corrupt storage is visible; failed persistence rolls back in-memory mutation', () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-failure-'))
  const broken = join(root, 'broken.json')
  writeFileSync(broken, '{broken')
  assert.throws(() => createTeamRuntime({ statePath: broken }), /Cannot load/)
  const path = join(root, 'state.json')
  const rt = createTeamRuntime({ statePath: path })
  mkdirSync(path + '.tmp')
  assert.throws(() => rt.submit({ decisionId: 'x', expectedPlanRevision: 1, action: 'create_task', payload }, 'run'), /Cannot persist/)
  assert.equal(rt.getStatus('run').taskCount, 0)
  assert.equal(rt.getStatus('run').planRevision, 1)
})

test('late result and review from previous attempt cannot alter the current task', () => {
  const rt = createTeamRuntime(), first = seed(rt)
  rt.settleExecution('run', 'task-1', first, { status: 'completed', text: 'candidate' })
  const old = rt.getTask({ taskId: 'task-1' }, 'run').task.result
  rt.submitReview({ taskId: 'task-1', executionId: first, resultId: old.resultId, verdict: 'fail' }, 'run')
  const second = rt.startExecution('run', 'task-1', { memberId: 'w2', connectorId: 'codex' }).executionId
  assert.notEqual(first, second)
  assert.equal(rt.settleExecution('run', 'task-1', first, { status: 'completed', text: 'late' }).code, 'stale')
  assert.equal(rt.submitReview({ taskId: 'task-1', executionId: first, resultId: old.resultId, verdict: 'pass' }, 'run').code, 'stale')
  assert.equal(rt.getTask({ taskId: 'task-1' }, 'run').task.state, 'running')
})

test('member self-report is a candidate and does not claim the native process stopped', () => {
  const rt = createTeamRuntime(), id = seed(rt)
  rt.submitResult({ taskId: 'task-1', executionId: id, summary: 'done', checksPassed: true }, 'run', { kind: 'member', id: 'w1' })
  assert.equal(rt.getStatus('run').tasks[0].state, 'review')
  assert.equal(rt.getStatus('run').executions[0].state, 'running')
  assert.equal(rt.submitReview({ taskId: 'task-1', executionId: id, resultId: rt.getStatus('run').tasks[0].result.resultId, verdict: 'pass' }, 'run').code, 'precondition_failed')
  rt.settleExecution('run', 'task-1', id, { status: 'completed', text: 'native end' })
  assert.equal(rt.getStatus('run').executions[0].state, 'finished')
  assert.equal(rt.getStatus('run').tasks[0].result.summary, 'done')
})

test('shared write workspace cannot start another run until native completion', () => {
  const rt = createTeamRuntime()
  for (const scope of ['a', 'b']) rt.submit({ decisionId: 'd', expectedPlanRevision: 1, action: 'create_task', payload }, scope)
  const binding = { memberId: 'w1', connectorId: 'codex', writeScope: 'same-workspace' }
  assert.equal(rt.startExecution('a', 'task-1', binding).ok, true)
  assert.equal(rt.startExecution('b', 'task-1', binding).code, 'precondition_failed')
})
