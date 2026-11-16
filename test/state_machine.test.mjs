import test from 'node:test'
import assert from 'node:assert/strict'
import {
  transitionTask, transitionExecution, taskViewState,
  TASK_STATE, EXEC_STATE, TASK_VIEW, REJECT,
} from '../packages/dsh-concerto/lib/domain/state_machine.mjs'

const task = (state, extra = {}) => ({ state, attempt: 0, ...extra })
const exec = (state) => ({ state })

test('dispatch: pending -> running, attempt+1', () => {
  const r = transitionTask(task('pending'), { type: 'dispatch' })
  assert.equal(r.kind, 'ok')
  assert.equal(r.next, TASK_STATE.running)
  assert.deepEqual(r.effects[0], { type: 'create_execution', attempt: 1 })
})

test('dispatch: non-pending rejected', () => {
  const r = transitionTask(task('running'), { type: 'dispatch' })
  assert.equal(r.kind, 'rejected')
  assert.equal(r.code, REJECT.invalidTransition)
})

test('result_submitted: requiresReview -> review', () => {
  const r = transitionTask(task('running'), { type: 'result_submitted', requiresReview: true })
  assert.equal(r.next, TASK_STATE.review)
})

test('result_submitted: no review + checks passed -> completed', () => {
  const r = transitionTask(task('running'), { type: 'result_submitted', requiresReview: false, basicChecksPassed: true })
  assert.equal(r.next, TASK_STATE.completed)
})

test('result_submitted: no review + checks failed -> blocked', () => {
  const r = transitionTask(task('running'), { type: 'result_submitted', requiresReview: false, basicChecksPassed: false })
  assert.equal(r.next, TASK_STATE.blocked)
})

test('review_passed without reviewId -> missing_evidence', () => {
  const r = transitionTask(task('review'), { type: 'review_passed' })
  assert.equal(r.code, REJECT.missingEvidence)
})

test('cancel_requested on running keeps Task running and targets execution', () => {
  const r = transitionTask(task('running'), { type: 'cancel_requested', hasActiveExecution: true })
  assert.equal(r.next, TASK_STATE.running)
  assert.deepEqual(r.effects[0], { type: 'execution_event', event: { type: 'cancel_requested' } })
})

test('cancel_confirmed without backend stop -> missing_evidence', () => {
  const r = transitionTask(task('running'), { type: 'cancel_confirmed', backendStopped: false })
  assert.equal(r.code, REJECT.missingEvidence)
})

test('execution_failed with unconfirmed side effects rejected', () => {
  const r = transitionTask(task('running'), { type: 'execution_failed', hasUnconfirmedSideEffects: true })
  assert.equal(r.code, REJECT.preconditionFailed)
})

test('adjudicate_accept requires verified artifact', () => {
  const r = transitionTask(task('running', { needsAdjudication: true }), { type: 'adjudicate_accept', hasVerifiedArtifact: false })
  assert.equal(r.code, REJECT.missingEvidence)
})

test('adjudicate_retry requires isolation', () => {
  const r = transitionTask(task('running', { needsAdjudication: true }), { type: 'adjudicate_retry', isolated: false })
  assert.equal(r.code, REJECT.preconditionFailed)
})

test('terminal task rejects everything', () => {
  for (const state of ['completed', 'cancelled', 'failed']) {
    const r = transitionTask(task(state), { type: 'dispatch' })
    assert.equal(r.kind, 'rejected', state)
  }
})

test('unknown event rejected', () => {
  const r = transitionTask(task('pending'), { type: 'nope' })
  assert.equal(r.code, REJECT.invalidTransition)
})

test('execution: question/answer cycle', () => {
  const a = transitionExecution(exec('running'), { type: 'question_persisted' })
  assert.equal(a.next, EXEC_STATE.waiting_input)
  const b = transitionExecution(exec('waiting_input'), { type: 'answer_delivered' })
  assert.equal(b.next, EXEC_STATE.running)
})

test('execution: unknown never retries blindly', () => {
  const r = transitionExecution(exec('unknown'), { type: 'retry_without_isolation' })
  assert.equal(r.code, REJECT.unsafeRetry)
})

test('execution: disconnected -> unknown, reconcile_unresolved stays unknown', () => {
  assert.equal(transitionExecution(exec('running'), { type: 'disconnected' }).next, EXEC_STATE.unknown)
  assert.equal(transitionExecution(exec('unknown'), { type: 'reconcile_unresolved' }).next, EXEC_STATE.unknown)
})

test('execution: stop_confirmed needs backend evidence', () => {
  const bad = transitionExecution(exec('interrupting'), { type: 'stop_confirmed' })
  assert.equal(bad.code, REJECT.missingEvidence)
  const good = transitionExecution(exec('interrupting'), { type: 'stop_confirmed', backendStopped: true })
  assert.equal(good.next, EXEC_STATE.stopped)
})

test('view: approval surfaces without mutating task', () => {
  const task = { state: 'running' }
  assert.equal(taskViewState(task, { state: 'waiting_approval' }), TASK_VIEW.waiting_approval)
  assert.equal(task.state, 'running')
})

test('view: waiting_input / cancelling / unknown', () => {
  assert.equal(taskViewState({ state: 'running' }, { state: 'waiting_input' }), TASK_VIEW.waiting_input)
  assert.equal(taskViewState({ state: 'running' }, { state: 'interrupting' }), TASK_VIEW.cancelling)
  assert.equal(taskViewState({ state: 'running' }, { state: 'unknown' }), TASK_VIEW.unknown)
})

test('view: non-running task ignores execution state', () => {
  assert.equal(taskViewState({ state: 'review' }, { state: 'waiting_approval' }), 'review')
  assert.equal(taskViewState({ state: 'completed' }, null), 'completed')
})

test('view: running without execution stays running', () => {
  assert.equal(taskViewState({ state: 'running' }, null), 'running')
  assert.equal(taskViewState({ state: 'running' }, undefined), 'running')
})

test('view: view states are never valid transition input', () => {
  for (const view of Object.values(TASK_VIEW)) {
    const r = transitionTask({ state: view }, { type: 'dispatch' })
    assert.equal(r.kind, 'rejected', view)
  }
})
