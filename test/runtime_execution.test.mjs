import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { executeMemberToolCall, REVIEWER_TOOL_SCHEMAS, WORKER_TOOL_SCHEMAS } from '../packages/dsh-concerto/lib/tools.mjs'

const payload = { title: 'Task', objective: 'Deliver', acceptance: ['Evidence'], constraints: [], dependsOn: [], assigneeRole: 'worker' }
function seed(runtime, scope = 'run') {
  runtime.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task', payload }, scope)
  return runtime.startExecution(scope, 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
}
function request(runtime, executionId, scope = 'run') {
  return runtime.recordExecutionEvent(scope, 'task-1', { type: 'approval.requested', requestId: '7', payload: { command: 'echo hello' } }, executionId)
}

test('a revised plan gates new work while existing attempts can finish under their approved version', () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-plan-')), 'runtime.json')
  let rt = createTeamRuntime({ statePath })
  rt.bindSession('cmd', 'run', { commanderId: 'c1', requirePlanApproval: true })
  const commander = { kind: 'member', role: 'commander', id: 'c1' }
  const user = { kind: 'user', id: 'local-owner' }
  const publish = (expectedVersion) => rt.publishViewObject('run', {
    id: 'plan', type: 'checklist', title: 'Overall plan', expectedVersion,
    data: { items: [{ label: 'Deliver and verify' }] },
  }, commander)
  const decide = (decisionId, action, body, actor = commander) => rt.submit({
    decisionId, expectedPlanRevision: rt.getStatus('run').planRevision, action, payload: body,
  }, 'run', actor)
  const approve = (proposalId, actor = user) => rt.approvePlan('run', { proposalId, commandId: `approve-${proposalId}` }, actor)

  assert.equal(publish(0).ok, true)
  const planV1 = { planId: 'plan', planVersion: 1 }
  assert.equal(decide('forged', 'propose_plan', planV1, { ...commander, id: 'another' }).code, 'unauthorized')
  const v1 = decide('v1', 'propose_plan', planV1).result
  assert.equal(v1.status, 'pending')
  assert.equal(approve(v1.proposalId, commander).code, 'unauthorized')
  assert.equal(approve(v1.proposalId).planGate.status, 'approved')
  assert.equal(rt.recordPlanWake('run', v1.proposalId, 'accepted').ok, true)
  rt = createTeamRuntime({ statePath })
  assert.equal(rt.getStatus('run').planGate.status, 'approved')
  assert.equal(rt.getStatus('run').planGate.commanderWake, 'accepted')
  assert.equal(decide('same-v1', 'propose_plan', planV1).result.proposalId, v1.proposalId)
  assert.equal(decide('first', 'create_task', payload).ok, true)
  assert.equal(decide('second', 'create_task', payload).ok, true)
  const running = rt.startExecution('run', 'task-1', { memberId: 'w1' })
  assert.equal(running.ok, true)
  assert.equal(publish(1).version, 2)
  assert.equal(rt.getStatus('run').planGate.status, 'stale')
  assert.equal(rt.approvePlan('run', { proposalId: v1.proposalId, commandId: 'old-page' }, user).code, 'stale')
  assert.equal(decide('resubmit-old', 'propose_plan', planV1).code, 'stale')
  assert.equal(decide('third', 'create_task', payload).code, 'precondition_failed')

  const result = { executionId: running.executionId, taskId: 'task-1', summary: 'Produced', checksPassed: true, needsReview: true }
  assert.equal(rt.submitResult(result, 'run').ok, true)
  assert.equal(rt.submitReview({ taskId: 'task-1', verdict: 'pass', reason: 'Verified' }, 'run').ok, true)
  assert.match(rt.startExecution('run', 'task-2', { memberId: 'w1' }).detail, /计划版本/)
  assert.match(rt.submitResult({ ...result, taskId: 'task-2', executionId: undefined }, 'run').detail, /计划版本/)

  const v2 = decide('v2', 'propose_plan', { planId: 'plan', planVersion: 2 }).result
  assert.equal(v2.status, 'pending')
  assert.equal(rt.recordPlanWake('run', v1.proposalId, 'manual').code, 'stale')
  assert.equal(rt.getStatus('run').planGate.commanderWake, undefined)
  assert.equal(approve(v2.proposalId).planGate.status, 'approved')
  assert.equal(rt.startExecution('run', 'task-2', { memberId: 'w1' }).ok, true)
  assert.deepEqual(rt.getStatus('run').executions.map((execution) => execution.planRef.version), [1, 2])
})

test('project context finds eligible shared records and preserves approved references across runs and restart', async () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-project-context-')), 'runtime.json')
  let rt = createTeamRuntime({ statePath })
  const meta = { projectId: 'project-a', teamId: 'team', commanderId: 'c1', configVersion: 4 }
  rt.bindSession('cmd-old', 'run-old', { ...meta, objective: '可靠发布', requirePlanApproval: true })
  rt.bindSession('cmd-new', 'run-new', meta)
  rt.bindSession('cmd-other', 'run-other', { ...meta, projectId: 'project-b' })
  const commander = { kind: 'member', role: 'commander', id: 'c1' }
  const worker = { teamSessionId: 'run-new', roleKind: 'worker', memberId: 'w1', capabilities: { fileRead: true, fileWrite: false } }
  const user = { kind: 'user', id: 'local-owner' }
  const publishPlan = (expectedVersion, title, label) => rt.publishViewObject('run-old', {
    id: 'policy', type: 'checklist', title, caption: 'Release procedure', expectedVersion,
    data: { items: [{ label }] },
  }, commander)
  const decide = (action, decisionId, body) => rt.submit({
    decisionId, expectedPlanRevision: rt.getStatus('run-old').planRevision, action, payload: body,
  }, 'run-old', commander)
  assert.equal(publishPlan(0, 'Release policy', 'Approved rule text').ok, true)
  const proposal = decide('propose_plan', 'propose-first', { planId: 'policy', planVersion: 1 })
  assert.equal(rt.approvePlan('run-old', { proposalId: proposal.result.proposalId, commandId: 'approve-first' }, user).ok, true)
  assert.equal(decide('create_task', 'create-task', payload).ok, true)
  assert.equal(publishPlan(1, 'Revised policy', 'Draft rule text').version, 2)
  assert.equal(decide('propose_plan', 'propose-revision', { planId: 'policy', planVersion: 2 }).ok, true)
  for (let version = 2; version < 25; version++) {
    assert.equal(publishPlan(version, 'Revised policy', 'Draft rule text').ok, true)
  }

  const checklist = { type: 'checklist', data: { items: [{ label: 'Evidence' }] } }
  assert.equal(rt.publishViewObject('run-old', { ...checklist, id: 'private-task', title: 'Private task notes', taskId: 'task-1' }).ok, true)
  assert.equal(rt.publishViewObject('run-old', { ...checklist, id: 'live', title: 'Live team status', semanticKind: 'live_execution' }).ok, true)
  assert.equal(rt.publishViewObject('run-other', { ...checklist, id: 'private-project', title: 'Foreign settings' }).ok, true)
  for (let index = 0; index < 10; index++) {
    assert.equal(rt.publishViewObject('run-new', { ...checklist, id: `meta-${index}`, title: 'Indexed summary', caption: '够'.repeat(240) }).ok, true)
  }

  const method = { title: 'Release check', description: 'Check the release', body: 'Run the release checks.', whenToUse: `${'x'.repeat(170)} Auditing a candidate` }
  const skill = rt.publishProjectSkill('run-old', { ...method, id: 'release-check' })
  assert.equal(skill.ok, true)
  assert.equal(rt.publishProjectSkill('run-old', { ...method, id: 'write-release', requiredCapabilities: ['fileWrite'] }).ok, true)
  rt = createTeamRuntime({ statePath })
  const before = readFileSync(statePath, 'utf8')
  const call = (name, args) => executeMemberToolCall(rt, worker, name, args)
  const search = (query, kind) => call('search_project_context', { query, ...(kind ? { kind } : {}) })

  for (const schemas of [WORKER_TOOL_SCHEMAS, REVIEWER_TOOL_SCHEMAS]) {
    assert.ok(schemas.some((tool) => tool.name === 'search_project_context'))
    assert.ok(schemas.find((tool) => tool.name === 'read_view_object').inputSchema.properties.teamSessionId)
  }
  const objective = await search('可靠发布', 'objective')
  assert.equal(objective.projectId, meta.projectId)
  assert.equal(objective.entries[0].source.teamSessionId, 'run-old')
  assert.equal(objective.entries[0].version, 4)
  const decisions = await search('RELEASE POLICY', 'decision')
  assert.equal(decisions.entries.length, 1)
  const [approved] = decisions.entries
  assert.equal(approved.source.kind, 'plan.approved')
  assert.deepEqual(approved.read.args, { teamSessionId: 'run-old', id: 'policy', version: 1 })
  const old = await call(approved.read.tool, approved.read.args)
  assert.equal(old.data.items[0].label, 'Approved rule text')
  assert.equal(old.version, 1)
  assert.equal((await search('Revised policy', 'decision')).entries.length, 0)
  assert.equal((await search('checklist revised', 'artifact')).entries[0].version, 25)
  const bounded = await search('Indexed summary', 'artifact')
  assert.equal(bounded.entries.length, 8)
  assert.equal(bounded.entries.some((entry) => 'data' in entry), false)

  for (const query of ['Private task', 'Live team status', 'Foreign settings']) {
    assert.deepEqual((await search(query)).entries, [])
  }
  for (const args of [
    { teamSessionId: 'run-other', id: 'private-project', version: 1 },
    { teamSessionId: 'run-old', id: 'private-task', version: 1 },
    { teamSessionId: 'run-old', id: 'live', version: 1 },
    { teamSessionId: 'run-old', id: 'policy', version: 999 },
  ]) assert.equal((await call('read_view_object', args)).code, 'not_found')
  assert.equal((await call('read_view_object', { teamSessionId: 'run-old', id: 'policy' })).code, 'invalid')
  const methods = await search('auditing', 'skill')
  assert.deepEqual(methods.entries.map((entry) => entry.id), ['release-check'])
  assert.equal(methods.entries[0].whenToUse.length, 160)
  assert.equal((await search('release', 'task')).code, 'invalid')
  assert.equal(readFileSync(statePath, 'utf8'), before)
  const fullSkill = await call(methods.entries[0].read.tool, methods.entries[0].read.args)
  assert.equal(fullSkill.skill.contentHash, skill.contentHash)
})

test('project experience reuses only proven observations and eligible methods across runs', async () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-experience-')), 'runtime.json')
  let rt = createTeamRuntime({ statePath })
  const meta = { projectId: 'project-a', teamId: 'team', commanderId: 'c1' }
  rt.bindSession('cmd-a', 'run-a', meta)
  rt.bindSession('cmd-next', 'run-next', meta)
  rt.bindSession('cmd-other', 'run-other', { ...meta, projectId: 'project-b' })
  const taskId = 'task-1'
  const executionId = seed(rt, 'run-a')
  const worker = { teamSessionId: 'run-a', memberId: 'w1', roleKind: 'worker', taskId, executionId, capabilities: { fileRead: true, fileWrite: true } }
  const reader = { ...worker, teamSessionId: 'run-next', capabilities: { fileRead: true, fileWrite: false } }
  const write = (args) => executeMemberToolCall(rt, worker, 'record_experience', args)
  const search = (query, kind, scope = reader) => executeMemberToolCall(rt, scope, 'search_experience', { query, kind })
  const command = 'node --test'
  const template = { kind: 'failure', problem: 'release checks', conditions: 'fixture workspace', method: command }
  const native = { ...template, mutationId: 'first-observation', result: 'exit code 1', evidenceRefs: ['native_command'] }
  const observe = (exitCode) => rt.recordExecutionEvent('run-a', taskId, {
    type: 'command.completed', command, exitCode, output: 'raw task transcript',
  }, executionId)
  for (const schemas of [WORKER_TOOL_SCHEMAS, REVIEWER_TOOL_SCHEMAS]) {
    assert.ok(schemas.some(({ name }) => name === 'search_experience'))
    assert.ok(schemas.some(({ name }) => name === 'record_experience'))
  }
  assert.equal((await write(native)).code, 'not_found')
  assert.equal(observe(1).ok, true)
  assert.equal((await write({ ...native, taskId: 'task-2' })).code, 'unauthorized')
  assert.equal((await write({ ...native, result: 'exit code 7' })).code, 'not_found')
  assert.equal((await write({ ...native, evidenceRefs: ['result:undefined'] })).code, 'not_found')
  const first = await write(native)
  assert.equal(first.status, 'searchable')
  assert.equal((await write(native)).replayed, true)
  assert.equal((await write({ ...native, conditions: 'different conditions' })).code, 'idempotency_conflict')
  const [failed] = (await search('release', 'failure')).entries
  assert.equal(failed.ref, first.ref)
  assert.equal(failed.proof.exitCode, 1)
  assert.equal(failed.source.executionId, executionId)
  assert.equal(failed.author.id, worker.memberId)

  const basedOn = { kind: 'experience', id: first.id, version: first.version }
  const pending = await write({ ...native, mutationId: 'pending-revision', basedOn, evidenceRefs: ['notes/experiment.log'] })
  assert.equal(pending.status, 'recorded')
  assert.equal(pending.version, 2)
  assert.equal((await search('release', 'failure')).entries[0].ref, first.ref)

  const method = { id: 'release-check', title: 'Release check', description: 'Check the release.', body: 'Long release workflow.' }
  const skill = rt.publishProjectSkill('run-a', method)
  const restricted = rt.publishProjectSkill('run-a', { ...method, id: 'author-release', requiredCapabilities: ['fileWrite'] })
  assert.equal(skill.ok, true)
  assert.equal(restricted.ok, true)
  assert.equal(rt.publishProjectSkill('run-a', { ...method, id: 'review-release' }).ok, true)
  assert.equal(observe(0).ok, true)
  const success = { ...native, mutationId: 'success', kind: 'success', result: '退出码 0' }
  const revised = await write({ ...success, basedOn })
  assert.equal(revised.version, 3)
  assert.equal((await write({
    ...success, mutationId: 'restricted-link', problem: 'restricted release method',
    basedOn: { kind: 'skill', id: restricted.id, version: restricted.version },
  })).status, 'searchable')
  assert.equal(rt.settleExecution('run-a', taskId, executionId, { status: 'completed' }).ok, true)
  rt = createTeamRuntime({ statePath })
  const before = readFileSync(statePath, 'utf8')
  const hits = (await search('release')).entries
  assert.equal(hits.length, 3)
  const revision = hits.find(({ id }) => id === first.id)
  assert.equal(revision.ref, revised.ref)
  assert.deepEqual(revision.basedOn, basedOn)
  assert.equal(revision.proof.exitCode, 0)
  assert.deepEqual((await search('release', 'failure')).entries, [])
  assert.deepEqual((await search('release', undefined, { ...reader, teamSessionId: 'run-other' })).entries, [])
  assert.equal((await search('restricted', 'success')).entries[0].basedOn, undefined)
  assert.equal(JSON.stringify(hits).includes('raw task transcript'), false)
  const methods = (await search('release', 'skill')).entries
  assert.deepEqual(methods.map(({ id }) => id), [method.id, 'review-release'])
  assert.deepEqual(methods[0].read.args, { id: method.id, version: skill.version })
  assert.equal(readFileSync(statePath, 'utf8'), before)
  assert.equal((await executeMemberToolCall(rt, reader, methods[0].read.tool, methods[0].read.args)).skill.body, method.body)
})

test('ordinary review makes a confirmed failure reusable without passing the delivery', async () => {
  const rt = createTeamRuntime()
  const meta = { projectId: 'project-a', teamId: 'team', commanderId: 'c1' }
  const taskId = 'task-1'
  rt.bindSession('cmd', 'run', meta)
  const executionId = seed(rt)
  const worker = { teamSessionId: 'run', roleKind: 'worker', memberId: 'w1', taskId, executionId }
  const commander = { teamSessionId: 'run', roleKind: 'commander', memberId: 'c1' }
  const call = (scope, tool, input) => executeMemberToolCall(rt, scope, tool, input)
  assert.equal((await call(worker, 'publish_view_object', {
    id: 'metrics', type: 'table', title: 'Trial evidence', data: { columns: ['Observation'], rows: [['Missing fixture']] },
  })).ok, true)
  const evidenceRef = 'table:metrics@v1'
  const observation = {
    mutationId: 'trial', kind: 'failure', problem: 'fixture missing', conditions: 'fresh checkout',
    method: 'Use the cached installation', result: 'Required fixture was absent', evidenceRefs: [evidenceRef],
  }
  const draft = await call(worker, 'record_experience', observation)
  const own = await call(commander, 'record_experience', { ...observation, mutationId: 'own', taskId })
  const modelTask = await call(worker, 'get_task', {})
  assert.equal(draft.status, 'recorded')
  assert.equal(modelTask.task.experienceObservations[0].ref, draft.ref)
  const search = () => call(commander, 'search_experience', { query: 'fixture missing' })
  assert.deepEqual((await search()).entries, [])
  assert.equal((await call(worker, 'submit_result', { summary: 'Trial completed', checksPassed: true })).ok, true)
  assert.equal(rt.settleExecution('run', taskId, executionId, { status: 'completed' }).ok, true)
  const resultId = rt.getTask({ taskId }, 'run').task.result.resultId
  const verdict = {
    taskId, executionId, resultId, verdict: 'fail', reason: 'Verified the missing fixture.', evidenceRefs: [evidenceRef],
    verifiedExperienceRefs: [draft.ref],
  }
  assert.equal((await call(commander, 'submit_review', { ...verdict, verifiedExperienceRefs: [own.ref] })).code, 'unauthorized')
  const reviewExecution = rt.startReviewExecution('run', taskId, { memberId: 'r1' })
  assert.equal(reviewExecution.ok, true)
  const reviewer = { teamSessionId: 'run', roleKind: 'reviewer', memberId: 'r1', taskId, executionId: reviewExecution.executionId }
  assert.equal((await call(reviewer, 'submit_review', { ...verdict, evidenceRefs: ['notes/unbound.log'] })).code, 'precondition_failed')
  assert.equal((await call(reviewer, 'submit_review', verdict)).state, 'pending')
  const [entry] = (await search()).entries
  assert.equal(entry.ref, draft.ref)
  assert.equal(entry.proof.kind, 'review')
  assert.equal(entry.proof.verdict, 'fail')
  assert.equal(entry.proof.resultId, resultId)
  assert.deepEqual(entry.proof.evidenceRefs, [evidenceRef])
})

test('review feedback survives rework and keeps its original version and revision evidence', async () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-feedback-')), 'runtime.json')
  const runtime = createTeamRuntime({ statePath })
  const scope = 'run'
  const taskId = 'task-1'
  const user = { kind: 'user', id: 'local-owner' }
  const getTask = () => runtime.getTask({ taskId }, scope).task
  const submitFeedback = (input) => runtime.reviewFeedback(scope, { taskId, ...input }, user)
  const submit = (executionId, summary) => runtime.submitResult({
    taskId, executionId, summary, checksPassed: true, needsReview: true,
  }, scope)
  const publish = (expectedVersion) => runtime.publishViewObject(scope, {
    id: 'test-matrix', type: 'table', title: 'Test matrix', taskId, expectedVersion,
    data: { columns: ['Check'], rows: [[`Result ${expectedVersion + 1}`]] },
  })
  assert.equal(runtime.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task', payload }, scope).ok, true)
  const first = runtime.startExecution(scope, taskId, { memberId: 'w1' }).executionId
  assert.equal(publish(0).ok, true)
  assert.equal(submit(first, 'First delivery').ok, true)
  const firstResult = getTask().result.resultId
  const create = {
    action: 'create', text: 'Add the missing negative case.', commandId: 'feedback-1',
    targetExecutionId: first, targetResultId: firstResult,
    targetRef: 'table:test-matrix@v1', itemId: 'row-1',
  }
  assert.equal(submitFeedback({ ...create, itemId: 'row-2' }).code, 'invalid')
  const opened = submitFeedback(create).feedback
  assert.equal(submitFeedback(create).replayed, true)
  assert.equal(opened.target.artifact.itemId, 'row-1')
  assert.equal(opened.target.artifact.version, 1)
  assert.equal(publish(1).ok, true)
  assert.equal(runtime.submitReview({
    taskId, executionId: first, resultId: firstResult, verdict: 'fail', reason: 'Missing negative case.',
  }, scope, user).ok, true)

  const second = runtime.startExecution(scope, taskId, { memberId: 'w1' }).executionId
  const worker = { roleKind: 'worker', memberId: 'w1', teamSessionId: scope, taskId, executionId: second }
  const call = (binding, name, input = {}) => executeMemberToolCall(runtime, binding, name, input)
  assert.equal((await call(worker, 'get_task')).task.reviewFeedback[0].feedbackId, opened.feedbackId)
  assert.equal((await call(worker, 'manage_review_feedback', { action: 'create', text: 'Forged opinion' })).code, 'unauthorized')
  assert.equal(publish(2).ok, true)
  const reply = { action: 'reply', feedbackId: opened.feedbackId, expectedVersion: 1, text: 'Negative case added.', evidenceRefs: ['table:test-matrix', 'tests.log'] }
  assert.equal((await call({ ...worker, executionId: first }, 'manage_review_feedback', reply)).code, 'unauthorized')
  const replied = await call(worker, 'manage_review_feedback', reply)
  assert.equal(replied.feedback.status, 'replied')
  assert.equal(replied.feedback.updates[0].author.executionId, second)
  assert.equal(replied.feedback.updates[0].evidence[0].artifact.version, 3)
  const change = { feedbackId: opened.feedbackId }
  assert.equal(submitFeedback({ ...change, action: 'close', expectedVersion: 1 }).code, 'stale')
  assert.equal(submitFeedback({ ...change, action: 'close', expectedVersion: 2 }).feedback.status, 'closed')
  assert.equal(getTask().state, 'running')
  assert.equal(submitFeedback({ ...change, action: 'reopen', expectedVersion: 3 }).feedback.status, 'open')
  assert.equal(submit(second, 'Second delivery').ok, true)
  assert.equal(publish(3).ok, true)
  const verdict = { taskId, executionId: second, resultId: getTask().result.resultId, verdict: 'pass', reason: 'Verified negative case.' }
  assert.equal(submitFeedback({ ...create, commandId: 'stale-create' }).code, 'stale')
  assert.equal(runtime.submitReview({ ...verdict, executionId: first, resultId: firstResult }, scope, user).code, 'stale')
  assert.equal(runtime.submitReview(verdict, scope, user).ok, true)

  for (let version = 4; version <= 24; version += 1) assert.equal(publish(version).ok, true)
  const restored = createTeamRuntime({ statePath })
  const snapshot = restored.getStatus(scope).tasks[0]
  assert.equal(snapshot.reviewFeedback[0].target.resultId, firstResult)
  assert.equal(snapshot.reviewFeedback[0].updates[0].evidence[0].artifact.version, 3)
  assert.equal(restored.readViewObject(scope, { id: 'test-matrix', version: 1 }).ok, true)
  assert.equal(restored.readViewObject(scope, { id: 'test-matrix', version: 3 }).ok, true)
  assert.deepEqual(snapshot.deliveryHistory.map(({ type }) => type), ['result.submitted', 'review.submitted', 'result.submitted', 'review.submitted'])
  assert.deepEqual(snapshot.deliveryHistory.filter(({ type }) => type === 'review.submitted').map(({ payload: event }) => event.review.verdict), ['fail', 'pass'])
})

test('user edits and worker checks follow one versioned acceptance checklist', async () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-checklist-')), 'runtime.json')
  const runtime = createTeamRuntime({ statePath })
  const scope = 'run'
  const taskId = 'task-1'
  const id = 'acceptance'
  const user = { kind: 'user', id: 'local-owner' }
  assert.equal(runtime.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task',
    payload: { ...payload, requiredViews: ['checklist:acceptance'] },
  }, scope).ok, true)
  const executionId = runtime.startExecution(scope, taskId, { memberId: 'w1' }).executionId
  const worker = { roleKind: 'worker', memberId: 'w1', teamSessionId: scope, taskId, executionId }
  const tool = (name, input = {}) => executeMemberToolCall(runtime, worker, name, input)
  const task = () => runtime.getTask({ taskId }, scope).task
  const readVersion = (version) => runtime.readViewObject(scope, { id, version })
  const edit = (input) => runtime.editAcceptanceChecklist(scope, { taskId, id, ...input }, user)
  assert.equal((await tool('publish_view_object', {
    id, type: 'checklist', title: 'Acceptance', semanticKind: 'blueprint',
    data: { items: [{ id: 'auth', label: 'Verify a valid token', checked: true }, { id: 'logs', label: 'Inspect logs' }] },
  })).ok, true)
  const changeInput = { itemId: 'auth', expectedVersion: 1, label: 'Reject expired tokens', commandId: 'edit-1' }
  const changed = edit(changeInput).change
  assert.equal(edit(changeInput).replayed, true)
  const conflict = edit({ ...changeInput, commandId: 'stale', label: 'Overwrite' })
  assert.equal(conflict.code, 'stale')
  assert.equal(conflict.currentVersion, 2)
  assert.equal(conflict.currentItem.label, changed.label)
  assert.equal(readVersion(1).data.items[0].checked, true)
  const current = readVersion(2)
  assert.equal(current.authorId, 'w1')
  assert.equal(current.ownerId, 'w1')
  assert.equal(current.updatedBy, 'local-owner')
  assert.equal(current.data.items[0].checked, false)
  assert.equal(current.data.items[1].label, 'Inspect logs')
  const submit = (changeId, version) => tool('submit_result', {
    taskId, executionId, summary: 'Contract checked', checksPassed: true,
    checklistEvidence: [{ changeId, version, evidenceRefs: ['notes/test-result.log'] }],
  })
  assert.equal((await submit(changed.changeId, 2)).code, 'precondition_failed')
  assert.equal(task().checklistChanges[0].reads.length, 0)
  const newer = edit({ itemId: 'auth', expectedVersion: 2, label: 'Reject expired tokens with HTTP 401', commandId: 'edit-2' }).change
  const got = await tool('get_task')
  assert.equal(got.task.checklistChanges[0].current, false)
  assert.equal(got.task.checklistChanges[1].reads[0].executionId, executionId)
  assert.equal((await tool('get_task')).task.checklistChanges[1].reads.length, 1)
  assert.equal((await tool('patch_view_object', { id, expectedVersion: 3, op: 'upsert_items',
    items: [{ id: 'auth', label: newer.label, checked: true }],
  })).version, 4)
  assert.equal(task().checklistChanges[1].currentVersion, 4)
  assert.equal((await submit(newer.changeId, 3)).code, 'stale')
  assert.equal((await submit(changed.changeId, 4)).code, 'stale')
  assert.equal((await submit(newer.changeId, 4)).ok, true)
  const candidate = task()
  assert.equal(candidate.state, 'review')
  assert.deepEqual(candidate.result.artifactRefs, ['checklist:acceptance@v4'])
  assert.equal(candidate.checklistChanges[1].reports[0].verification, undefined)

  const added = edit({ expectedVersion: 4, label: 'Record the status code in release notes', commandId: 'edit-3' }).change
  assert.equal(added.fromVersion, 4)
  assert.equal(runtime.submitReview({
    taskId, executionId, resultId: candidate.result.resultId, verdict: 'pass',
    reason: 'Reviewed the expired token case.', evidenceRefs: candidate.result.artifactRefs,
  }, scope, user).ok, true)
  assert.equal(edit({ ...changeInput, expectedVersion: 5, commandId: 'after-completion' }).code, 'precondition_failed')
  const restored = createTeamRuntime({ statePath }).getStatus(scope).tasks[0]
  assert.equal(restored.state, 'completed')
  assert.ok(restored.checklistChanges[1].reports[0].verification.reviewId)
  assert.equal(restored.checklistChanges[2].reports.length, 0)
  assert.equal(restored.checklistChanges[0].current, false)
})

test('user and members co-edit task blueprint tables, diagrams, and mindmaps with read receipts and review verification', async () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-coedit-multi-')), 'runtime.json')
  const runtime = createTeamRuntime({ statePath })
  const scope = 'run'
  const taskId = 'task-1'
  const user = { kind: 'user', id: 'local-owner' }
  const commander = { kind: 'member', id: 'c1', role: 'commander' }
  assert.equal(runtime.submit({
    decisionId: 'create-multi',
    expectedPlanRevision: 1,
    action: 'create_task',
    payload: {
      ...payload,
      requiredViews: ['table:delivery-matrix', 'diagram:service-flow', 'mindmap:scope-map'],
    },
  }, scope).ok, true)
  const executionId = runtime.startExecution(scope, taskId, { memberId: 'w1' }).executionId
  const worker = { roleKind: 'worker', memberId: 'w1', teamSessionId: scope, taskId, executionId }
  const tool = (name, input = {}) => executeMemberToolCall(runtime, worker, name, input)
  const task = () => runtime.getTask({ taskId }, scope).task

  assert.equal((await tool('publish_view_object', {
    id: 'delivery-matrix',
    type: 'table',
    title: '交付矩阵',
    semanticKind: 'blueprint',
    data: { columns: ['模块', '负责人', '状态'], rows: [['auth', 'w1', 'todo']] },
  })).ok, true)
  assert.equal(runtime.publishViewObject(scope, {
    id: 'service-flow',
    type: 'diagram',
    title: '服务链路',
    taskId,
    semanticKind: 'blueprint',
    data: {
      layout: 'dag',
      nodes: [{ id: 'n1', label: 'Gateway' }, { id: 'n2', label: 'Auth' }],
      edges: [{ from: 'n1', to: 'n2', label: 'verify' }],
    },
  }, commander).ok, true)
  assert.equal((await tool('publish_view_object', {
    id: 'scope-map',
    type: 'mindmap',
    title: '范围导图',
    semanticKind: 'blueprint',
    data: { root: { id: 'root', label: 'Release', children: [{ id: 'm1', label: 'Docs', children: [] }] } },
  })).ok, true)

  // Table: cell edit + idempotent replay + col-0 key edit + stale conflict + append row
  const tableStatusEditInput = {
    taskId, id: 'delivery-matrix', expectedVersion: 1,
    rowKey: 'auth', column: '状态', value: 'review', commandId: 'tbl-edit-1',
  }
  const tableStatusChange = runtime.editSharedTaskArtifact(scope, tableStatusEditInput, user).change
  assert.equal(tableStatusChange.viewType, 'table')
  assert.equal(tableStatusChange.targetKind, 'cell')
  assert.equal(runtime.editSharedTaskArtifact(scope, tableStatusEditInput, user).replayed, true)
  const tableKeyChange = runtime.editAcceptanceChecklist(scope, {
    taskId, id: 'delivery-matrix', expectedVersion: 2,
    rowIndex: 0, column: '模块', value: 'auth-api', commandId: 'tbl-edit-2',
  }, user).change
  assert.equal(tableKeyChange.version, 3)
  const tableStale = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'delivery-matrix', expectedVersion: 2,
    rowIndex: 0, column: '状态', value: 'done', commandId: 'tbl-stale',
  }, user)
  assert.equal(tableStale.code, 'stale')
  assert.equal(tableStale.currentVersion, 3)
  assert.deepEqual(tableStale.currentRow, ['auth-api', 'w1', 'review'])
  const tableRowChange = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'delivery-matrix', expectedVersion: 3,
    cells: ['billing', 'w2', 'pending'], commandId: 'tbl-append-row',
  }, user).change
  assert.equal(tableRowChange.targetKind, 'row')
  assert.equal(tableRowChange.itemId, 'row-2')
  const latestTable = runtime.readViewObject(scope, { id: 'delivery-matrix' })
  assert.equal(latestTable.version, 4)
  assert.equal(latestTable.authorId, 'w1')
  assert.equal(latestTable.updatedBy, 'local-owner')
  assert.deepEqual(latestTable.data.rows, [['auth-api', 'w1', 'review'], ['billing', 'w2', 'pending']])

  // Diagram: edge edit + node edit + stale conflict
  const diagEdgeChange = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'service-flow', expectedVersion: 1,
    targetKind: 'edge', from: 'n1', to: 'n2', label: 'verify JWT', edgeKind: 'critical', commandId: 'diag-edge-1',
  }, user).change
  assert.equal(diagEdgeChange.viewType, 'diagram')
  assert.equal(diagEdgeChange.targetKind, 'edge')
  assert.equal(diagEdgeChange.itemId, 'n1->n2')
  const diagNodeChange = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'service-flow', expectedVersion: 2,
    itemId: 'n1', label: 'API Gateway', commandId: 'diag-node-1',
  }, user).change
  assert.equal(diagNodeChange.targetKind, 'node')
  assert.equal(diagNodeChange.version, 3)
  const diagStale = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'service-flow', expectedVersion: 1,
    targetKind: 'edge', from: 'n1', to: 'n2', label: 'old', commandId: 'diag-stale',
  }, user)
  assert.equal(diagStale.code, 'stale')
  assert.equal(diagStale.currentVersion, 3)

  // Mindmap: update node + add child node
  const mmUpdateChange = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'scope-map', expectedVersion: 1,
    itemId: 'm1', label: 'Release Docs', commandId: 'mm-edit-1',
  }, user).change
  const mmAddChange = runtime.editSharedTaskArtifact(scope, {
    taskId, id: 'scope-map', expectedVersion: 2,
    parentId: 'm1', newNodeId: 'm1-api', label: 'API Changelog', commandId: 'mm-add-1',
  }, user).change
  assert.equal(mmAddChange.viewType, 'mindmap')
  assert.equal(mmAddChange.targetKind, 'node')
  assert.equal(mmAddChange.itemId, 'm1-api')
  assert.equal(mmAddChange.version, 3)

  // Worker must read updated task before submitting checklistEvidence
  const submitCurrentEvidence = () => tool('submit_result', {
    taskId,
    executionId,
    summary: 'Verified shared table, diagram, and mindmap edits',
    checksPassed: true,
    checklistEvidence: [
      { changeId: tableKeyChange.changeId, version: 4, evidenceRefs: ['notes/matrix.log'] },
      { changeId: tableRowChange.changeId, version: 4, evidenceRefs: ['notes/matrix.log'] },
      { changeId: diagEdgeChange.changeId, version: 3, evidenceRefs: ['notes/flow.log'] },
      { changeId: diagNodeChange.changeId, version: 3, evidenceRefs: ['notes/flow.log'] },
      { changeId: mmUpdateChange.changeId, version: 3, evidenceRefs: ['notes/map.log'] },
      { changeId: mmAddChange.changeId, version: 3, evidenceRefs: ['notes/map.log'] },
    ],
  })
  assert.equal((await submitCurrentEvidence()).code, 'precondition_failed')

  const read1 = await tool('get_task')
  assert.equal(read1.ok, true)
  const read2 = await tool('get_task')
  assert.equal(read2.ok, true)
  const changesBeforeSubmit = task().checklistChanges
  assert.equal(changesBeforeSubmit.find((c) => c.changeId === tableStatusChange.changeId).current, true)
  assert.equal(changesBeforeSubmit.find((c) => c.changeId === tableKeyChange.changeId).reads.length, 1)
  assert.equal(changesBeforeSubmit.find((c) => c.changeId === diagEdgeChange.changeId).reads.length, 1)
  assert.equal(changesBeforeSubmit.find((c) => c.changeId === mmAddChange.changeId).reads.length, 1)

  const delivered = await submitCurrentEvidence()
  assert.equal(delivered.ok, true, JSON.stringify(delivered))
  const candidate = task()
  assert.equal(candidate.state, 'review')
  assert.deepEqual(candidate.result.artifactRefs.slice().sort(), [
    'diagram:service-flow@v3',
    'mindmap:scope-map@v3',
    'table:delivery-matrix@v4',
  ])

  const reviewed = runtime.submitReview({
    taskId,
    executionId,
    resultId: candidate.result.resultId,
    verdict: 'pass',
    reason: 'Verified co-edited table, diagram, and mindmap deliveries.',
    evidenceRefs: candidate.result.artifactRefs,
  }, scope, commander)
  assert.equal(reviewed.ok, true, JSON.stringify(reviewed))

  const restored = createTeamRuntime({ statePath })
  const restoredTask = restored.getStatus(scope).tasks[0]
  assert.equal(restoredTask.state, 'completed')
  assert.equal(restored.readViewObject(scope, { id: 'service-flow' }).authorId, 'c1')
  assert.equal(restored.readViewObject(scope, { id: 'service-flow' }).updatedBy, 'local-owner')
  assert.ok(restoredTask.checklistChanges.find((c) => c.changeId === tableKeyChange.changeId).reports[0].verification.reviewId)
  assert.ok(restoredTask.checklistChanges.find((c) => c.changeId === diagEdgeChange.changeId).reports[0].verification.reviewId)
  assert.ok(restoredTask.checklistChanges.find((c) => c.changeId === mmAddChange.changeId).reports[0].verification.reviewId)
})

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

test('question reuse requires a unique exact answer explicitly supplied by the user', () => {
  const rt = createTeamRuntime(), executionId = seed(rt)
  const binding = { roleKind: 'worker', memberId: 'w1', taskId: 'task-1', executionId }
  const ask = (reuseConfirmedAnswer) => rt.askTaskQuestion('run', { question: 'Which output format?', reuseConfirmedAnswer }, binding).request
  const user = { kind: 'user', id: 'local-owner' }
  const first = ask(true)
  assert.equal(first.status, 'pending')
  const answer = (request, value) => ({ requestId: request.requestId, commandId: `reply-${request.requestId}`, answer: { answers: { answer: { answers: [value] } } } })
  assert.equal(rt.decideRequest('run', answer(first, 'model guess'), { kind: 'member', id: 'commander' }).code, 'unauthorized')
  assert.equal(rt.decideRequest('run', answer(first, 'GLB'), user).ok, true)
  assert.equal(rt.delivery('run', first.requestId, true).ok, true)

  const reused = ask(true)
  assert.equal(reused.status, 'decided')
  assert.equal(reused.answerFacts[0].source, 'user')
  assert.equal(reused.answerFacts[0].evidenceRef.requestId, first.requestId)
  assert.equal(rt.delivery('run', reused.requestId, true).ok, true)

  const fresh = ask(false)
  assert.equal(fresh.status, 'pending')
  assert.equal(rt.decideRequest('run', answer(fresh, 'FBX'), user).ok, true)
  assert.equal(rt.delivery('run', fresh.requestId, true).ok, true)
  assert.equal(ask(true).status, 'pending')
})

test('artifact question resolves only a uniquely defined cell in a pinned shared table from this project', () => {
  const rt = createTeamRuntime()
  const commander = { kind: 'member', role: 'commander', id: 'c1' }
  rt.bindSession('cmd-source', 'source', { projectId: 'p', commanderId: commander.id })
  rt.bindSession('cmd-work', 'work', { projectId: 'p', commanderId: commander.id })
  rt.bindSession('cmd-other', 'other', { projectId: 'other', commanderId: commander.id })
  const table = { id: 'format', type: 'table', title: 'Format registry', data: { columns: ['Format'], rows: [['GLB']] } }
  assert.equal(rt.publishViewObject('source', table, commander).ok, true)
  assert.equal(rt.publishViewObject('source', { ...table, expectedVersion: 1, data: { columns: ['Format'], rows: [['FBX']] } }, commander).ok, true)
  assert.equal(rt.publishViewObject('other', table, commander).ok, true)
  const executionId = seed(rt, 'work')
  const binding = { roleKind: 'worker', memberId: 'w1', taskId: 'task-1', executionId }
  const artifactCell = { teamSessionId: 'source', id: 'format', version: 1, row: 1, column: 'Format' }
  const ask = (cell) => rt.askTaskQuestion('work', { question: 'Look up the table value', artifactCell: cell }, binding).request
  const pinned = ask(artifactCell)
  assert.equal(pinned.answer.answers.answer.answers[0], 'GLB')
  assert.deepEqual(pinned.answerFacts[0].evidenceRef, artifactCell)
  assert.equal(pinned.answerFacts[0].source, 'artifact')
  assert.equal(pinned.answerFacts[0].verified, true)
  assert.equal(rt.delivery('work', pinned.requestId, true).ok, true)
  const outside = ask({ ...artifactCell, teamSessionId: 'other' })
  assert.equal(outside.status, 'pending')
  assert.equal(outside.answer, undefined)
})

test('managed delivery pins the policy, current execution artifacts and readable workspace files before review', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-result-proof-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cwd = join(root, 'work'), statePath = join(root, 'runtime.sqlite')
  mkdirSync(cwd)
  writeFileSync(join(cwd, 'result.txt'), 'original delivery')
  writeFileSync(join(root, 'outside.txt'), 'outside execution scope')
  let rt = createTeamRuntime({ statePath })
  rt.bindSession('cmd', 'run', { teamId: 'proof', commanderId: 'c1', reviewPolicy: { requiresReview: true, version: 'proof@v3' } })
  const add = rt.submit({ decisionId: 'create', expectedPlanRevision: 1, action: 'create_task', payload: {
    ...payload, requiresReview: false, requiredViews: [{ id: 'report', type: 'table', requiredForAcceptance: true }],
  } }, 'run')
  assert.equal(add.ok, true, JSON.stringify(add))
  const taskId = add.result.taskId
  const { executionId } = rt.startExecution('run', taskId, { memberId: 'w1', connectorId: 'mock', writeScope: cwd })
  const worker = { kind: 'member', role: 'worker', id: 'w1' }
  const commander = { kind: 'member', role: 'commander', id: 'c1' }
  const submitDelivery = (artifactRefs) => rt.submitResult({ taskId, executionId, artifactRefs, summary: 'candidate', checksPassed: true }, 'run', worker)
  const table = (id) => ({ id, type: 'table', title: 'Report', data: { columns: ['Result'], rows: [['ok']] } })
  assert.equal(rt.publishViewObject('run', table('report'), commander).ok, true)
  assert.match(submitDelivery([]).detail, /current provenance/)
  const added = rt.submit({ decisionId: 'separate-test', expectedPlanRevision: 2, action: 'create_task', payload }, 'run')
  assert.equal(added.ok, true)
  const publish = rt.publishViewObject('run', { ...table('worker-report'), taskId, executionId }, worker)
  assert.equal(publish.ok, true, JSON.stringify(publish))
  // The same id owned by Commander cannot satisfy a task-scoped requirement.
  assert.match(submitDelivery(['table:worker-report@v1']).detail, /table:report/)

  // A second task gives the Worker a fresh, unclaimed delivery id.
  rt.settleExecution('run', taskId, executionId, { status: 'completed', resultMissing: true })
  const nextTaskId = added.result.taskId
  const next = rt.startExecution('run', nextTaskId, { memberId: 'w1', connectorId: 'mock', writeScope: cwd })
  const send = (artifactRefs) => rt.submitResult({ taskId: nextTaskId, executionId: next.executionId, summary: 'candidate', checksPassed: true, artifactRefs }, 'run', worker)
  assert.match(send(['missing.txt']).detail, /unavailable/)
  assert.match(send(['../outside.txt']).detail, /unavailable/)
  assert.match(send(['table:worker-report@v1']).detail, /unavailable/)
  assert.equal(rt.publishViewObject('run', { ...table('current-report'), taskId: nextTaskId, executionId: next.executionId }, worker).ok, true)
  assert.equal(send(['table:current-report', 'result.txt']).state, 'review')
  assert.equal(rt.nextAutomaticReview('run'), null)
  assert.equal(rt.settleExecution('run', nextTaskId, next.executionId, { status: 'completed' }).ok, true)
  const recorded = rt.getTask({ taskId: nextTaskId }, 'run').task
  assert.deepEqual(recorded.result.artifactRefs, ['table:current-report@v1', 'result.txt'])
  assert.equal(recorded.reviewPolicy.requiresReview, true)
  assert.equal(recorded.reviewPolicy.requiredByCommander, false)
  assert.match(recorded.reviewPolicy.version, /proof@v3/)

  rt = createTeamRuntime({ statePath, policyRequiresReview: false })
  const pending = rt.nextAutomaticReview('run')
  assert.equal(pending.resultId, recorded.result.resultId)
  const verdict = { taskId: nextTaskId, executionId: next.executionId, resultId: pending.resultId,
    verdict: 'pass', reason: 'Read the file and the pinned report', evidenceRefs: ['result.txt'] }
  assert.equal(rt.submitReview(verdict, 'run', { kind: 'user', id: 'local-owner' }).code, 'unauthorized')
  const reviewer = rt.startReviewExecution('run', nextTaskId, { memberId: 'r1', targetExecutionId: next.executionId, targetResultId: pending.resultId })
  assert.equal(reviewer.ok, true, JSON.stringify(reviewer))
  assert.equal(rt.nextAutomaticReview('run'), null)
  const review = () => rt.submitReview(verdict, 'run', { kind: 'member', role: 'reviewer', id: 'r1' }, { executionId: reviewer.executionId })
  writeFileSync(join(cwd, 'result.txt'), 'changed after delivery')
  assert.match(review().detail, /file changed/)
  writeFileSync(join(cwd, 'result.txt'), 'original delivery')
  assert.equal(review().state, 'completed')
})

test('unblock records the cause against the task revision and leaves dispatch pending', () => {
  const rt = createTeamRuntime()
  const executionId = seed(rt)
  const taskId = 'task-1'
  rt.settleExecution('run', taskId, executionId, { status: 'completed', resultMissing: true })
  const blocked = rt.getStatus('run').tasks[0]
  assert.equal(blocked.state, 'blocked')
  assert.ok(blocked.updatedAt)
  const actor = { kind: 'user', id: 'owner' }
  const input = { taskId, commandId: 'unblock', expectedUpdatedAt: blocked.updatedAt, reason: 'Dependency restored' }
  assert.equal(rt.unblockTask('run', { ...input, expectedUpdatedAt: 'old' }, actor).code, 'stale')
  assert.equal(rt.unblockTask('run', { ...input, reason: ' ' }, actor).code, 'invalid')
  assert.equal(rt.unblockTask('run', input, actor).state, 'pending')
  assert.equal(rt.unblockTask('run', input, actor).replayed, true)
  assert.equal(rt.getStatus('run').executions.length, 1)
  const current = rt.getTask({ taskId }, 'run').task
  assert.equal(current.blockedReason, null)
  const events = current.events.filter((event) => event.type === 'task.unblocked')
  assert.equal(events.length, 1)
  assert.deepEqual(events[0].payload, { previousReason: blocked.blockedReason, reason: input.reason })
  assert.equal(events[0].actor.id, actor.id)
})

test('accepting a verified unknown delivery keeps its scope reserved until verified stop', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-unknown-delivery-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const cwd = join(root, 'work'), statePath = join(root, 'runtime.sqlite')
  mkdirSync(cwd)
  const proof = join(cwd, 'result.txt')
  writeFileSync(proof, 'pinned delivery')
  let rt = createTeamRuntime({ statePath })
  rt.bindSession('cmd', 'run', { teamId: 'proof', commanderId: 'c1', reviewPolicy: { requiresReview: true, version: 'proof@1' } })
  rt.bindSession('other-cmd', 'other-run', { teamId: 'independent', commanderId: 'c2' })
  const taskId = 'task-1'
  for (const scope of ['run', 'other-run']) {
    assert.equal(rt.submit({ decisionId: 'first', expectedPlanRevision: 1, action: 'create_task', payload }, scope).ok, true)
  }
  const worker = { kind: 'member', role: 'worker', id: 'w1' }
  const actor = { kind: 'user', id: 'owner' }
  const { executionId } = rt.startExecution('run', taskId, { memberId: worker.id, connectorId: 'mock', writeScope: cwd })
  assert.equal(rt.submitResult({ taskId, executionId, summary: 'candidate', checksPassed: true, artifactRefs: ['result.txt'] }, 'run', worker).state, 'review')
  assert.equal(rt.settleExecution('run', taskId, executionId, { status: 'unknown' }).ok, true)
  const { recoverableDelivery } = rt.getStatus('run').executions[0]
  const { resultId } = recoverableDelivery
  assert.deepEqual(recoverableDelivery, { resultId, artifactRefs: ['result.txt'], requiresReview: true })
  const input = { taskId, executionId, resultId, commandId: 'accept', action: 'accept', reason: 'Reviewed recovery evidence' }
  assert.equal(rt.adjudicate('run', input, worker).code, 'unauthorized')
  assert.equal(rt.adjudicate('run', { ...input, resultId: 'old' }, actor).code, 'stale')
  writeFileSync(proof, 'modified after delivery')
  assert.match(rt.adjudicate('run', input, actor).detail, /delivery file changed/)
  writeFileSync(proof, 'pinned delivery')
  assert.deepEqual(rt.adjudicate('run', input, actor), { ok: true, state: 'review', executionState: 'unknown', workspaceReserved: true, resultId })
  rt = createTeamRuntime({ statePath })
  assert.equal(rt.adjudicate('run', input, actor).replayed, true)
  assert.ok(rt.getStatus('run').executions.find((e) => e.executionId === executionId).quarantined)
  const reserve = () => rt.startExecution('other-run', taskId, { memberId: 'w2', connectorId: 'mock', writeScope: cwd })
  assert.match(reserve().detail, /workspace has an active or unconfirmed execution/)
  assert.equal(rt.nextAutomaticReview('run'), null)
  assert.equal(rt.startReviewExecution('run', taskId, { memberId: 'r1' }).code, 'precondition_failed')
  const stop = { taskId, executionId, commandId: 'stop', action: 'confirm_failed', reason: 'Reconciled original execution' }
  assert.equal(rt.adjudicate('run', stop, actor).ok, false)
  assert.equal(rt.adjudicate('run', stop, actor, { kind: 'codex_reconcile_stopped', verified: true }).executionState, 'stopped')
  assert.equal(rt.getTask({ taskId }, 'run').task.result.resultId, resultId)
  assert.equal(rt.nextAutomaticReview('run').resultId, resultId)
  assert.equal(reserve().ok, true)
})

test('haltTeam persists and blocks new worker and reviewer dispatches while active work can settle', () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-halt-')), 'runtime.json')
  const rt = createTeamRuntime({ statePath }), id = seed(rt)
  const actor = { kind: 'user', id: 'owner' }
  const pause = { paused: true, commandId: 'pause' }
  assert.equal(request(rt, id).ok, true)
  assert.equal(rt.haltTeam('run', pause, actor).paused, true)
  assert.equal(rt.getStatus('run').executions[0].state, 'waiting_approval')
  const approval = { requestId: `${id}:7`, commandId: 'approve', answer: { decision: 'accept' } }
  assert.equal(rt.decideRequest('run', approval, actor).ok, true)
  assert.equal(rt.delivery('run', approval.requestId, true).ok, true)
  assert.equal(rt.submitResult({ taskId: 'task-1', executionId: id, summary: 'candidate', checksPassed: true }, 'run',
    { kind: 'member', id: 'w1', role: 'worker' }).state, 'review')
  assert.equal(rt.settleExecution('run', 'task-1', id, { status: 'completed' }).ok, true)

  assert.equal(rt.submit({ decisionId: 'next', expectedPlanRevision: 2, action: 'create_task', payload }, 'run').ok, true)
  const reloaded = createTeamRuntime({ statePath })
  assert.equal(reloaded.getStatus('run').paused, true)
  assert.match(reloaded.startExecution('run', 'task-2').detail, /暂停/)
  assert.match(reloaded.startReviewExecution('run', 'task-1', { memberId: 'r1' }).detail, /暂停/)
  assert.match(reloaded.submitResult({ taskId: 'task-2', summary: 'candidate', checksPassed: true }, 'run').detail, /暂停/)
  assert.equal(reloaded.getStatus('run').executions.length, 1)

  assert.equal(reloaded.haltTeam('run', { paused: false, commandId: 'resume' }, actor).paused, false)
  assert.equal(reloaded.haltTeam('run', pause, actor).replayed, true)
  const resumed = reloaded.getStatus('run')
  assert.equal(resumed.paused, false)
  assert.equal(resumed.planRevision, 3)
  assert.equal(resumed.events.filter(({ type }) => type === 'team.dispatch_paused').length, 1)
  assert.equal(resumed.events.find(({ type }) => type === 'team.dispatch_paused').actor.id, 'owner')
  assert.equal(reloaded.startReviewExecution('run', 'task-1', { memberId: 'r1' }).ok, true)
})

test('dispatch limits retain failed review evidence and charge rework only when a worker starts', () => {
  const statePath = join(mkdtempSync(join(tmpdir(), 'concerto-dispatch-limits-')), 'runtime.json')
  const rt = createTeamRuntime({ statePath })
  rt.bindSession('cmd', 'run', { projectId: 'p1', teamId: 'team', commanderId: 'c1',
    dispatchLimits: { maxAttempts: 2, maxReworks: 1 } })
  const actor = { kind: 'user', id: 'owner' }
  const rejectAttempt = (executionId, commandId) => {
    assert.equal(rt.settleExecution('run', 'task-1', executionId, { status: 'completed', text: 'candidate' }).state, 'review')
    const { result } = rt.getTask({ taskId: 'task-1' }, 'run').task
    const decision = { taskId: 'task-1', resultId: result.resultId, executionId, commandId,
      verdict: 'fail', reason: 'check failed', evidenceRefs: ['failed-check.txt'] }
    assert.equal(rt.submitReview(decision, 'run', actor).ok, true)
    return decision
  }

  const first = seed(rt)
  rejectAttempt(first, 'review-first')
  assert.equal(rt.getStatus('run').tasks[0].dispatchBudget.reworks, 0)
  const reworkDispatch = { memberId: 'w1', connectorId: 'codex', commandId: 'rework-first' }
  const rework = rt.startExecution('run', 'task-1', reworkDispatch)
  assert.equal(rework.ok, true)
  assert.equal(rt.startExecution('run', 'task-1', reworkDispatch).replayed, true)
  assert.equal(rt.getStatus('run').tasks[0].dispatchBudget.reworks, 1)
  const rejection = rejectAttempt(rework.executionId, 'review-rework')
  assert.equal(rt.submitReview(rejection, 'run', actor).replayed, true)

  // Simulate a saved task from before the explicit counter was introduced.
  const stored = JSON.parse(readFileSync(statePath, 'utf8'))
  delete stored.sessions[0].tasks[0].reworkCount
  writeFileSync(statePath, JSON.stringify(stored))
  const reloaded = createTeamRuntime({ statePath })
  const blocked = reloaded.getStatus('run').tasks[0]
  assert.equal(blocked.state, 'pending')
  assert.equal(blocked.viewState, 'blocked')
  assert.equal(blocked.dispatchBudget.reworks, 1)
  assert.match(blocked.blockedReason, /执行次数/)
  assert.deepEqual(blocked.review.evidenceRefs, ['failed-check.txt'])
  assert.match(reloaded.getStatus('run').attention.find(({ taskId }) => taskId === 'task-1').detail, /执行次数/)
  assert.match(reloaded.startExecution('run', 'task-1').detail, /执行次数/)
  assert.match(reloaded.submitResult({ taskId: 'task-1', summary: 'bypass', checksPassed: true }, 'run').detail, /执行次数/)

  const adjust = { dispatchLimits: { maxAttempts: 3, maxReworks: 1 }, commandId: 'raise-attempts' }
  assert.equal(reloaded.setDispatchLimits('run', adjust, actor).ok, true)
  assert.match(reloaded.startExecution('run', 'task-1').detail, /返工次数/)
  assert.equal(reloaded.setDispatchLimits('run', { dispatchLimits: { maxAttempts: 3, maxReworks: 2 }, commandId: 'raise-reworks' }, actor).ok, true)
  assert.equal(reloaded.setDispatchLimits('run', adjust, actor).replayed, true)
  assert.equal(reloaded.getStatus('run').tasks[0].viewState, 'pending')
  assert.equal(reloaded.startExecution('run', 'task-1').attempt, 3)
  assert.equal(reloaded.getStatus('run').tasks[0].dispatchBudget.reworks, 2)
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

test('patchViewObject toggling checked only on an approved plan checklist keeps planGate approved while label edits make it stale', () => {
  const rt = createTeamRuntime()
  rt.bindSession('cmd', 'run', { commanderId: 'c1', requirePlanApproval: true })
  const commander = { kind: 'member', role: 'commander', id: 'c1' }
  const user = { kind: 'user', id: 'local-owner' }

  assert.equal(rt.publishViewObject('run', {
    id: 'goal-plan',
    type: 'checklist',
    title: '实施计划',
    semanticKind: 'blueprint',
    data: {
      items: [
        { id: 's1', label: '写入文件' },
        { id: 's2', label: '回读核对' },
      ],
    },
  }, commander).ok, true)

  const prop = rt.submit({
    decisionId: 'prop-1',
    expectedPlanRevision: 1,
    action: 'propose_plan',
    payload: { planId: 'goal-plan', planVersion: 1 },
  }, 'run', commander)
  assert.equal(prop.ok, true)
  assert.equal(rt.approvePlan('run', { proposalId: prop.result.proposalId, commandId: 'app-1' }, user).planGate.status, 'approved')

  const ticked = rt.patchViewObject('run', {
    id: 'goal-plan',
    expectedVersion: 1,
    op: 'upsert_items',
    items: [{ id: 's1', label: '写入文件', checked: true }],
  }, commander)
  assert.equal(ticked.ok, true)
  assert.equal(ticked.version, 2)
  assert.equal(rt.getStatus('run').planGate.status, 'approved')
  assert.equal(rt.getStatus('run').planGate.planRef.version, 2)
  assert.equal(rt.submit({ decisionId: 't1', expectedPlanRevision: prop.planRevision, action: 'create_task', payload }, 'run', commander).ok, true)

  const modifiedLabel = rt.patchViewObject('run', {
    id: 'goal-plan',
    expectedVersion: 2,
    op: 'upsert_items',
    items: [{ id: 's2', label: '修改了计划步骤内容', checked: false }],
  }, commander)
  assert.equal(modifiedLabel.ok, true)
  assert.equal(modifiedLabel.version, 3)
  assert.equal(rt.getStatus('run').planGate.status, 'stale')
})
