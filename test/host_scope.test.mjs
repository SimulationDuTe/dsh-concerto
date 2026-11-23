import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'
import { removeGitWorktree, scopesOverlap } from '../packages/dsh-concerto/lib/workspace_scope.mjs'
import { approveFixturePlan, proposeFixturePlan } from './fixtures/approve-plan.mjs'
import {
  createHostedSessionEventLog,
  projectHostedSessionActivities,
  mergeAndPaginateActivities,
  decodeActivityCursor,
} from '../packages/dsh-concerto/lib/hosted_history.mjs'

// Only the host's config-schema builder is substituted. Runtime, tools, routes and runner are real.
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@deepseek-ai/schemastery') return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent('const z = new Proxy(() => z, { get: () => z }); export default z') }
  return next(specifier, context)
} })
const { apply } = await import('../packages/dsh-concerto/lib/index.js')
hook.deregister()

for (const memberField of ['member', 'memberId']) test(`host entry uses explicit ${memberField}, freezes scope and binds before tools`, async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-host-'))
  const statePath = join(root, 'teams.json')
  const team = { id: 'team', name: 'Team', commander: { id: 'c1', source: 'hosted' }, members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }, { id: 'w2', roleKind: 'worker', source: 'hosted' }],
    dispatchLimits: { maxAttempts: 2, maxReworks: 1 } }
  assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)
  const sessions = new Map(['a', 'b', 'unbound-member'].map((id) => [id, { id, preset: id === 'unbound-member' ? 'team--w1' : 'team' }]))
  const routes = new Map(), tools = new Map(), cleanups = []
  let nativeStatus = 'running'
  const kickoffPrompts = []
  const wakeWarnings = []
  const wakeStarted = Promise.withResolvers()
  const wakeAck = Promise.withResolvers()
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: 'call-fixture', agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { wakeWarnings.push(error) } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (session) => session.preset },
    agents: { get: () => ({ status: nativeStatus, whenIdle: async () => {} }) },
    sessionController: {
      async create({ agentPreset }) { assert.equal(agentPreset, 'team--w2'); sessions.set('member', { id: 'member', preset: agentPreset }); return { sessionId: 'member' } },
      async prompt(input, signal) {
        assert.ok(signal instanceof AbortSignal)
        if (input.sessionId === 'a') {
          kickoffPrompts.push(input)
          wakeStarted.resolve()
          return wakeAck.promise
        }
        if (input.sessionId === 'b') {
          kickoffPrompts.push(input)
          if (memberField === 'member') throw new Error('queue unavailable')
          return { accepted: false }
        }
        const result = await callTool('get_task', 'member', { taskId: 'task-1' })
        assert.equal(result.ok, true)
        assert.equal((await callTool('get_team_status', 'member')).code, 'unauthorized')
        assert.equal((await callTool('submit_result', 'member', { taskId: 'task-1', executionId: result.task.executionId, summary: 'candidate', checksPassed: true })).ok, true)
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'bundle'), codexCwd: root })
  async function request(path, body, origin = 'http://localhost') {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin, 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    const a = await request('/concerto/session?sessionId=a'), b = await request('/concerto/session?sessionId=b')
    assert.notEqual(a.value.teamSessionId, b.value.teamSessionId)
    assert.notEqual(a.value.projectId, b.value.projectId)
    assert.equal((await request('/concerto/teams', { requestId: 'config-2', expectedConfigVersion: 1,
      team: { ...team, name: 'Renamed team', members: [{ id: 'w2', roleKind: 'worker', source: 'hosted' }],
        dispatchLimits: { maxAttempts: 7, maxReworks: 0 } } })).status, 200)
    const frozen = (await request('/concerto/session?sessionId=a')).value
    assert.equal(frozen.configVersion, 1)
    assert.equal(frozen.members[0].id, 'w1')
    assert.deepEqual(frozen.snapshot.dispatchLimits, { maxAttempts: 2, maxReworks: 1 })
    sessions.set('latest', { id: 'latest', preset: 'team' })
    assert.deepEqual((await request('/concerto/session?sessionId=latest')).value.snapshot.dispatchLimits, { maxAttempts: 7, maxReworks: 0 })
    assert.equal((await request('/concerto/teams', { team: { ...team, dispatchLimits: { maxAttempts: 0 } } })).status, 400)
    assert.equal((await request('/concerto/session?sessionId=unbound-member')).status, 404)
    assert.equal((await callTool('get_task', 'unbound-member', { taskId: 'task-1' })).code, 'unauthorized')
    const createTask = (expectedPlanRevision) => callTool('submit_decision', 'a', { decisionId: 'd1', expectedPlanRevision, action: 'create_task', payload: {
      title: 'Task', objective: 'Deliver', acceptance: ['Evidence'], constraints: [], dependsOn: [], assigneeRole: 'worker',
      requiredViews: ['checklist:shared-checks'],
    } })
    assert.equal(a.value.snapshot.planGate.status, 'awaiting_plan')
    assert.equal((await createTask(1)).code, 'precondition_failed')
    const proposed = await proposeFixturePlan(callTool, 'a')
    assert.equal((await createTask(proposed.planRevision)).code, 'precondition_failed')
    const approvePath = '/concerto/runs/approve-plan'
    const approve = { sessionId: 'a', proposalId: proposed.result.proposalId, commandId: 'approve-v1' }
    assert.equal((await request(approvePath, approve, 'http://elsewhere')).status, 401)
    assert.equal((await request(approvePath, { ...approve, sessionId: 'unbound-member' })).status, 401)
    const otherProposal = await proposeFixturePlan(callTool, 'b')
    assert.equal((await request(approvePath, { ...approve, sessionId: 'b' })).status, 409)
    const revision = await proposeFixturePlan(callTool, 'a', 1)
    assert.equal((await request(approvePath, approve)).status, 409)
    const confirm = { ...approve, proposalId: revision.result.proposalId, commandId: 'approve-v2', actor: { kind: 'member', id: 'forged' } }
    assert.equal(kickoffPrompts.length, 0)
    const approving = request(approvePath, confirm)
    await wakeStarted.promise
    assert.equal((await callTool('get_team_status', 'a')).planGate.status, 'approved')
    assert.equal((await request(approvePath, confirm)).value.replayed, true)
    assert.equal((await request(approvePath, { ...confirm, commandId: 'approve-again' })).status, 200)
    assert.equal(kickoffPrompts.length, 1)
    assert.equal(kickoffPrompts[0].mode, 'queue')
    assert.equal(kickoffPrompts[0].requestId, `req-kickoff-${revision.result.proposalId}`)
    assert.match(kickoffPrompts[0].content[0].text, /checklist:kickoff-plan@v2/)
    assert.match(kickoffPrompts[0].content[0].text, new RegExp(revision.result.proposalId))
    wakeAck.resolve({ accepted: true })
    const approved = await approving
    assert.equal(approved.status, 200)
    assert.deepEqual(approved.value.planGate.approvedBy, { kind: 'user', id: 'local-owner' })
    assert.equal(approved.value.planGate.commanderWake, 'accepted')
    const failedWake = await request(approvePath, { sessionId: 'b', proposalId: otherProposal.result.proposalId, commandId: 'approve-b' })
    assert.equal(failedWake.status, 200)
    assert.equal(failedWake.value.planGate.status, 'approved')
    assert.equal((await callTool('get_team_status', 'b')).planGate.commanderWake, 'manual')
    assert.deepEqual(kickoffPrompts.map((entry) => entry.sessionId), ['a', 'b'])
    assert.deepEqual(wakeWarnings.map((error) => error.message), memberField === 'member' ? ['queue unavailable'] : [])
    assert.equal((await createTask(proposed.planRevision)).code, 'stale')
    assert.equal((await createTask(revision.planRevision)).ok, true)
    assert.equal((await callTool('get_team_status', 'b')).taskCount, 0)
    assert.equal((await request('/concerto/tasks/dispatch', { sessionId: 'unbound-member', taskId: 'task-1' })).value.code, 'unauthorized')
    assert.equal((await request('/concerto/tasks/dispatch', {sessionId:'a',taskId:'task-1',commandId:'conflict',member:'w1',memberId:'w2'})).value.code, 'invalid')
    assert.equal((await request('/concerto/tasks/dispatch', {sessionId:'a',taskId:'task-1',commandId:'unknown',memberId:'absent'})).value.code, 'invalid')
    const dispatchInput = { sessionId: 'a', teamId: 'forged', taskId: 'task-1', commandId: 'dispatch-1', [memberField]: 'w2' }
    assert.equal((await request('/concerto/runs/halt', { sessionId: 'a', commandId: 'invalid-pause', paused: 'true' })).status, 400)
    assert.equal((await request('/concerto/runs/halt', { sessionId: 'a', commandId: 'pause', paused: true, teamSessionId: b.value.teamSessionId })).status, 200)
    assert.equal((await callTool('get_team_status', 'a')).paused, true)
    assert.equal((await callTool('get_team_status', 'b')).paused, false)
    const pausedDispatch = await request('/concerto/tasks/dispatch', dispatchInput)
    assert.equal(pausedDispatch.value.code, 'precondition_failed')
    assert.match(pausedDispatch.value.detail, /暂停/)
    assert.equal((await request('/concerto/runs/halt', { sessionId: 'a', commandId: 'resume', paused: false })).value.paused, false)
    const dispatched = await request('/concerto/tasks/dispatch', dispatchInput)
    assert.equal(dispatched.status, 202)
    await new Promise((done) => setTimeout(done, 20))
    const snapshot = (await request('/concerto/session?sessionId=a')).value.snapshot
    assert.equal(snapshot.executions[0].state, 'finished')
    assert.equal(snapshot.executions[0].planRef.version, 2)
    assert.equal(snapshot.tasks[0].state, 'review')
    assert.equal(snapshot.tasks[0].memberId, 'w2')
    assert.equal(snapshot.tasks[0].result.summary, 'candidate')
    const feedbackPath = '/concerto/tasks/review-feedback'
    const comment = {
      sessionId: 'a', commandId: 'user-note', taskId: 'task-1', action: 'create', text: 'Verify the negative case.',
      targetExecutionId: snapshot.tasks[0].executionId, targetResultId: snapshot.tasks[0].result.resultId,
    }
    assert.equal((await request(feedbackPath, comment, 'http://elsewhere')).status, 401)
    assert.equal((await request(feedbackPath, { ...comment, sessionId: 'member' })).status, 401)
    assert.equal((await request(feedbackPath, { ...comment, sessionId: 'b' })).status, 404)
    const note = await request(feedbackPath, { ...comment, actor: { kind: 'member', id: 'forged' } })
    assert.equal(note.status, 200)
    assert.deepEqual(note.value.feedback.author, { kind: 'user', id: 'local-owner' })
    assert.equal((await request(feedbackPath, { sessionId: 'a', commandId: 'close-note', taskId: 'task-1',
      action: 'close', feedbackId: note.value.feedback.feedbackId, expectedVersion: 1 })).value.feedback.status, 'closed')
    assert.equal((await request('/concerto/session?sessionId=a')).value.snapshot.tasks[0].state, 'review')
    assert.equal((await request('/concerto/session?sessionId=member')).value.teamSessionId, a.value.teamSessionId)
    assert.equal((await request('/concerto/runs/halt', { sessionId: 'member', commandId: 'worker-pause', paused: true })).status, 401)
    const changeLimits = { commandId: 'new-limits', dispatchLimits: { maxAttempts: null, maxReworks: 0 } }
    assert.equal((await request('/concerto/runs/dispatch-limits', { ...changeLimits, sessionId: 'member' })).status, 401)
    assert.equal((await request('/concerto/runs/dispatch-limits', { ...changeLimits, sessionId: 'a', teamSessionId: b.value.teamSessionId })).status, 200)
    assert.deepEqual((await callTool('get_team_status', 'a')).dispatchLimits, changeLimits.dispatchLimits)
    assert.deepEqual((await callTool('get_team_status', 'b')).dispatchLimits, team.dispatchLimits)
    assert.equal((await request('/concerto/status?sessionId=b')).value.taskCount, 0)

    const importPath = '/concerto/view-objects/import-excalidraw'
    const file = { type: 'excalidraw', version: 2, files: { ignored: {} }, elements: [
      { id: 'shape', type: 'rectangle', x: -120, y: -30, width: 100, height: 60 },
      { id: 'unsupported', type: 'image' },
    ] }
    assert.equal((await request(`${importPath}?sessionId=member`, file)).status, 401)
    assert.equal((await request(`${importPath}?sessionId=a`, { ...file, version: 3 })).status, 400)
    const badLine = { id: 'arrow', type: 'arrow', x: 0, y: 0, width: 10, height: 1, points: [[0, 0], [10, 'bad']] }
    assert.equal((await request(`${importPath}?sessionId=a`, { ...file, elements: [badLine] })).status, 400)
    assert.deepEqual((await request('/concerto/session?sessionId=a')).value.snapshot.viewObjects.map((o) => o.id), ['kickoff-plan'])
    const imported = await request(`${importPath}?sessionId=a&filename=sample.excalidraw`, file)
    assert.equal(imported.status, 201)
    assert.equal(imported.value.title, 'sample')
    assert.equal(imported.value.omittedCount, 1)
    const readPath = `/concerto/view-objects/read?id=${imported.value.id}`
    const importedView = (await request(readPath + '&sessionId=a')).value
    assert.equal(importedView.source, 'user_import')
    assert.equal(importedView.ownerId, 'local-owner')
    assert.deepEqual(importedView.data.excalidrawScene.elements, [
      { id: 'shape', type: 'rectangle', x: 0, y: 0, width: 100, height: 60 },
    ])
    assert.equal(importedView.data.excalidrawScene.files, undefined)
    assert.equal((await request(readPath + '&sessionId=b')).status, 404)
    assert.equal((await callTool('publish_view_object', 'a', {
      id: imported.value.id, type: 'board', title: 'overwrite', expectedVersion: 1,
      data: { nodes: [{ id: 'replacement', label: 'replacement' }] },
    })).code, 'unauthorized')

    assert.equal((await callTool('publish_view_object', 'a', {
      id: 'shared-checks', type: 'checklist', taskId: 'task-1', title: 'Checks',
      data: { items: [{ id: 'base', label: 'Base check' }] },
    })).ok, true)
    const checklistPath = '/concerto/view-objects/acceptance-checklist'
    const edit = { sessionId: 'a', taskId: 'task-1', id: 'shared-checks', expectedVersion: 1,
      label: 'Add a negative test', commandId: 'checklist-edit' }
    assert.equal((await request(checklistPath, edit, 'http://elsewhere')).status, 401)
    assert.equal((await request(checklistPath, { ...edit, sessionId: 'member' })).status, 401)
    assert.equal((await request(checklistPath, { ...edit, sessionId: 'b' })).status, 404)
    const edited = await request(checklistPath, { ...edit, actor: { kind: 'member', id: 'forged' } })
    assert.equal(edited.status, 200)
    assert.deepEqual(edited.value.change.author, { kind: 'user', id: 'local-owner' })
    assert.equal((await request(checklistPath, { ...edit, commandId: 'stale-checklist' })).status, 409)
    const shared = (await request('/concerto/view-objects/read?sessionId=a&id=shared-checks')).value
    assert.equal(shared.authorId, 'c1')
    assert.equal(shared.updatedBy, 'local-owner')
    assert.deepEqual(shared.data.items.map((item) => item.label), ['Base check', edit.label])

    // Restart while a submitted result's native execution is unconfirmed.
    const runtimePath = join(root,'runtime.json')
    const saved = JSON.parse(readFileSync(runtimePath,'utf8'))
    saved.sessions.find(run=>run.sessionId===a.value.teamSessionId).executions[0].state = 'running'
    writeFileSync(runtimePath,JSON.stringify(saved))
    for (const cleanup of cleanups) cleanup()
    apply(ctx, {statePath,runtimePath,teamsBundleDir:join(root,'bundle'),codexCwd:root})
    assert.deepEqual((await request(readPath + '&sessionId=a')).value, importedView)
    const adjudication = {sessionId:'a',taskId:'task-1',executionId:snapshot.executions[0].executionId,commandId:'resolve',action:'confirm_failed',reason:'checked native stop',evidence:{kind:'hosted_idle'}}
    assert.equal((await request('/concerto/executions/adjudicate',adjudication)).value.code,'precondition_failed')
    nativeStatus = 'idle'
    assert.equal((await request('/concerto/executions/adjudicate',adjudication)).value.state,'failed')
    assert.equal((await request('/concerto/executions/adjudicate',adjudication)).value.replayed,true)
  } finally { for (const cleanup of cleanups) cleanup() }
})

test('hosted member activity merges DSH session/event & deriveMessages without calling deprecated snapshotEvents', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-hosted-act-'))
  const statePath = join(root, 'teams.json')
  const team = {
    id: 'team',
    name: 'Team',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted' },
      { id: 'w2', roleKind: 'worker', source: 'hosted' },
    ],
  }
  assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)

  const forbiddenDeprecated = () => {
    throw new Error('deprecated snapshotEvents() must never be called')
  }
  const cmdDerived = [
    { role: 'user', content: [{ kind: 'text', text: '请拆解接口测试任务' }] },
    { role: 'assistant', content: [{ kind: 'text', text: '好的，我先派发给 w1。' }] },
  ]
  const cmdLiveEvents = [
    { type: 'assistant/message', seq: 1, time: 1700000002000, data: { message: { role: 'assistant', content: [{ kind: 'text', text: '好的，我先派发给 w1。' }] } } },
    { type: 'tool/call', seq: 2, time: 1700000003000, data: { callId: 'call-1', name: 'submit_decision', arguments: { action: 'create_task' } } },
  ]
  const w1LiveEvents = [
    { type: 'assistant/message', seq: 0, time: 1700000005000, data: { message: { role: 'assistant', content: [{ kind: 'text', text: 'w1 正在执行 hosted 子任务。' }] } } },
    { type: 'tool/result', seq: 1, time: 1700000006000, data: { message: { role: 'tool', toolCallId: 'c-w1', name: 'submit_result', content: [{ kind: 'text', text: '{"ok":true}' }] } } },
  ]

  const cmdSession = { id: 'cmd-1', preset: 'team', deriveMessages: () => cmdDerived, snapshotEvents: forbiddenDeprecated }
  const sessions = new Map([['cmd-1', cmdSession]])
  const routes = new Map(), tools = new Map(), cleanups = [], sessionEventListeners = []
  const emitSessionEvent = (session, event) => {
    for (const fn of sessionEventListeners) fn(session, event)
  }
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: 'call-x', agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (session) => session.preset },
    agents: { get: () => ({ status: 'idle', whenIdle: async () => {} }) },
    on(eventName, fn) {
      if (eventName === 'session/event') sessionEventListeners.push(fn)
      return () => {
        const idx = sessionEventListeners.indexOf(fn)
        if (idx >= 0) sessionEventListeners.splice(idx, 1)
      }
    },
    sessionController: {
      async create({ agentPreset }) {
        assert.equal(agentPreset, 'team--w1')
        const workerSession = {
          id: 'hosted-w1-sid',
          preset: agentPreset,
          deriveMessages: () => w1LiveEvents.map((e) => e.data.message),
          snapshotEvents: forbiddenDeprecated,
        }
        sessions.set('hosted-w1-sid', workerSession)
        for (const ev of w1LiveEvents) emitSessionEvent(workerSession, ev)
        return { sessionId: 'hosted-w1-sid' }
      },
      async prompt({ sessionId }) {
        if (sessionId === 'cmd-1') return { accepted: true }
        const gt = await callTool('get_task', 'hosted-w1-sid', { taskId: 'task-1' })
        assert.equal(gt.ok, true)
        await callTool('submit_result', 'hosted-w1-sid', { taskId: 'task-1', executionId: gt.task.executionId, summary: 'hosted done', checksPassed: true })
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'bundle'), codexCwd: root })
  for (const ev of cmdLiveEvents) emitSessionEvent(cmdSession, ev)

  async function request(path, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }

  try {
    await request('/concerto/session?sessionId=cmd-1')
    const planRevision = await approveFixturePlan(callTool, request, 'cmd-1')
    await callTool('submit_decision', 'cmd-1', {
      decisionId: 'd-cmd-1',
      expectedPlanRevision: planRevision,
      action: 'create_task',
      payload: { title: 'Hosted History Task', objective: 'Check events', acceptance: ['Has messages'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
    })
    const disp = await request('/concerto/tasks/dispatch', { sessionId: 'cmd-1', taskId: 'task-1', commandId: 'disp-w1', memberId: 'w1' })
    assert.equal(disp.status, 202)
    await new Promise((done) => setTimeout(done, 25))

    const cmdPage1 = await request('/concerto/members/activity?sessionId=cmd-1&memberId=c1&limit=2')
    assert.equal(cmdPage1.status, 200)
    assert.equal(cmdPage1.value.backendHistoryMode, 'hosted_session')
    assert.equal(cmdPage1.value.historySources.dshSessionEvents, true)
    assert.equal(cmdPage1.value.historySources.dshDerivedMessages, true)
    assert.equal(cmdPage1.value.items.length, 2)
    assert.equal(cmdPage1.value.hasMore, true)
    assert.equal(decodeActivityCursor(cmdPage1.value.nextBefore)?.kind, 'composite')

    const cmdOlder = await request(`/concerto/members/activity?sessionId=cmd-1&memberId=c1&before=${cmdPage1.value.nextBefore}&limit=5`)
    assert.equal(cmdOlder.status, 200)
    assert.ok(cmdOlder.value.items.some((it) => it.kind === 'message' && it.role === 'user' && it.text.includes('请拆解接口测试任务')))
    const page1Ids = new Set(cmdPage1.value.items.map((it) => it.activityId))
    assert.ok(cmdOlder.value.items.every((it) => !page1Ids.has(it.activityId)))

    const w1Act = await request('/concerto/members/activity?sessionId=cmd-1&memberId=w1&limit=10')
    assert.equal(w1Act.status, 200)
    assert.equal(w1Act.value.backendHistoryMode, 'hosted_session')
    assert.equal(w1Act.value.historySources.dshSessionEvents, true)
    assert.ok(w1Act.value.items.some((it) => it.kind === 'message' && it.text.includes('w1 正在执行 hosted 子任务')))
    assert.ok(w1Act.value.items.some((it) => it.kind === 'tool' && it.summary.includes('submit_result')))
    assert.ok(!w1Act.value.items.some((it) => it.text?.includes('请拆解接口测试任务')))

    // w2 has never started a hosted child session -> stays honest hosted_partial
    const w2Act = await request('/concerto/members/activity?sessionId=cmd-1&memberId=w2&limit=10')
    assert.equal(w2Act.status, 200)
    assert.equal(w2Act.value.backendHistoryMode, 'hosted_partial')
    assert.equal(w2Act.value.historySources.dshSessionEvents, false)
    assert.equal(w2Act.value.historySources.dshDerivedMessages, false)
  } finally {
    for (const cleanup of cleanups) cleanup()
  }
})

test('mergeAndPaginateActivities cursor stays stable across runtime trimming, earlier backfill, and tail growth', () => {
  const mkRuntime = (seq, ts) => ({
    activityId: `rt-${seq}`,
    seq,
    memberId: 'w1',
    kind: 'progress',
    summary: `rt-${seq}`,
    recordedAt: new Date(ts).toISOString(),
  })
  const mkHosted = (id, ts, tieId) => ({
    activityId: id,
    memberId: 'w1',
    kind: 'message',
    role: 'assistant',
    summary: id,
    recordedAt: new Date(ts).toISOString(),
    sortTs: ts,
    tieId,
  })

  const runtime = [mkRuntime(1, 1000), mkRuntime(2, 2000), mkRuntime(3, 3000), mkRuntime(4, 4000)]
  const hosted = [mkHosted('h-1', 1500, '1:s1:000000000001:0000'), mkHosted('h-2', 2500, '1:s1:000000000002:0000')]

  const p1 = mergeAndPaginateActivities(runtime, hosted, { memberId: 'w1', limit: 2 })
  assert.deepEqual(p1.items.map((x) => x.activityId), ['rt-3', 'rt-4'])
  assert.equal(p1.hasMore, true)

  // Mutate history between page 1 and page 2:
  // 1) Runtime FIFO trims oldest item rt-1
  // 2) An earlier hosted event h-0 arrives at ts=500
  // 3) New tail events arrive after rt-4 (rt-5 at 5000, h-3 at 6000)
  const mutatedRuntime = [mkRuntime(2, 2000), mkRuntime(3, 3000), mkRuntime(4, 4000), mkRuntime(5, 5000)]
  const mutatedHosted = [
    mkHosted('h-0', 500, '1:s1:000000000000:0000'),
    ...hosted,
    mkHosted('h-3', 6000, '1:s1:000000000003:0000'),
  ]

  const p2 = mergeAndPaginateActivities(mutatedRuntime, mutatedHosted, { memberId: 'w1', before: p1.nextBefore, limit: 2 })
  assert.deepEqual(p2.items.map((x) => x.activityId), ['rt-2', 'h-2'])
  assert.equal(p2.hasMore, true)

  const p3 = mergeAndPaginateActivities(mutatedRuntime, mutatedHosted, { memberId: 'w1', before: p2.nextBefore, limit: 5 })
  assert.deepEqual(p3.items.map((x) => x.activityId), ['h-0', 'h-1'])
  assert.equal(p3.hasMore, false)

  const allPagedIds = [...p3.items, ...p2.items, ...p1.items].map((x) => x.activityId)
  assert.equal(new Set(allPagedIds).size, allPagedIds.length)
})

test('projectHostedSessionActivities aligns by message.id/callId across message replacement and compaction without duplication or lost tail messages', () => {
  const mkUser = (id, text) => ({ id, role: 'user', content: [{ type: 'text', text }] })
  const mkAssistant = (id, content) => ({ id, role: 'assistant', content })

  // Scenario A: Pre-subscribe history [A, B, C], then post-subscribe B is replaced by B-prime
  const logA = createHostedSessionEventLog()
  const msgA = mkUser('msg-A', 'A initial')
  const msgBPrime = mkAssistant('msg-B-prime', [{ type: 'text', text: 'B-prime replacement' }])
  const msgC = mkAssistant('msg-C', [
    { type: 'text', text: 'C preserved tail' },
    { type: 'tool_use', id: 'call-shared-1', name: 'read_file', input: { path: 'a.js' } },
  ])
  logA.record('s-repl', {
    type: 'assistant/message',
    seq: 3,
    time: 1700000010000,
    surfaceOp: { op: 'replace', startSeq: 1, endSeq: 1 },
    data: { message: msgBPrime },
  })
  // Also emit live tool/call for call-shared-1 to verify callId alignment across tool_use and tool/call
  logA.record('s-repl', {
    type: 'tool/call',
    seq: 4,
    time: 1700000011000,
    data: { callId: 'call-shared-1', name: 'read_file', arguments: { path: 'a.js' } },
  })
  const projA = projectHostedSessionActivities(
    { id: 's-repl', deriveMessages: () => [msgA, msgBPrime, msgC] },
    { memberId: 'c1', hostSessionId: 's-repl', eventLog: logA },
  )
  const bPrimeItems = projA.items.filter((it) => it.text?.includes('B-prime replacement'))
  const cItems = projA.items.filter((it) => it.text?.includes('C preserved tail'))
  const callItems = projA.items.filter((it) => it.summary?.includes('read_file'))
  assert.equal(bPrimeItems.length, 1)
  assert.equal(cItems.length, 1)
  assert.equal(projA.items.filter((it) => it.text?.includes('A initial')).length, 1)
  assert.equal(callItems.length, 1)
  assert.equal(bPrimeItems[0].detail?.surfaceOp?.op, 'replace')

  // Scenario B: Compaction collapses [A, B] -> [S], shifting C from derived array index 2 to 1;
  // C must retain the EXACT same activityId and cursor across compaction.
  const logB = createHostedSessionEventLog()
  const preMsgA = mkUser('cmp-A', 'A pre')
  const preMsgB = mkAssistant('cmp-B', [{ type: 'text', text: 'B pre' }])
  const preMsgC = mkAssistant('cmp-C', [{ type: 'text', text: 'C post-compaction target' }])
  let surface = [preMsgA, preMsgB, preMsgC]
  const hostComp = { id: 's-comp', deriveMessages: () => surface }

  const beforeComp = mergeAndPaginateActivities([], projectHostedSessionActivities(hostComp, { memberId: 'c1', hostSessionId: 's-comp', eventLog: logB }).items, { limit: 10 })
  const cBefore = beforeComp.items.find((it) => it.text === 'C post-compaction target')
  assert.ok(cBefore)

  const summaryS = mkAssistant('cmp-S', [{ type: 'text', text: 'Summary S of A+B' }])
  logB.record('s-comp', {
    type: 'assistant/message',
    seq: 3,
    time: 1700000020000,
    surfaceOp: { op: 'replace', startSeq: 0, endSeq: 1 },
    data: { message: summaryS },
  })
  surface = [summaryS, preMsgC]

  const afterComp = mergeAndPaginateActivities([], projectHostedSessionActivities(hostComp, { memberId: 'c1', hostSessionId: 's-comp', eventLog: logB }).items, { limit: 10 })
  const cAfter = afterComp.items.find((it) => it.text === 'C post-compaction target')
  assert.ok(cAfter)
  assert.equal(cAfter.activityId, cBefore.activityId)
  assert.equal(cAfter.cursor, cBefore.cursor)
  assert.equal(afterComp.items.filter((it) => it.text === 'Summary S of A+B').length, 1)
})

test('projectHostedSessionActivities preserves item identity and cursor across the 2000-event live buffer threshold', () => {
  const eventLog = createHostedSessionEventLog() // tests real default maxEventsPerSession = 2000
  const allMessages = []
  const pushLive = (seq) => {
    const msg = {
      id: `msg-${seq}`,
      role: seq % 2 === 0 ? 'user' : 'assistant',
      content: [{ type: 'text', text: `turn-${seq}` }],
    }
    allMessages.push(msg)
    eventLog.record('s-2000', {
      type: msg.role === 'user' ? 'user/message' : 'assistant/message',
      seq,
      time: 1700000000000 + seq * 1000,
      surfaceOp: 'append',
      data: msg.role === 'user' ? msg : { message: msg },
    })
  }

  for (let s = 0; s < 2000; s += 1) pushLive(s)
  const hostSession = { id: 's-2000', deriveMessages: () => allMessages }

  const beforeCap = mergeAndPaginateActivities(
    [],
    projectHostedSessionActivities(hostSession, { memberId: 'c1', hostSessionId: 's-2000', eventLog }).items,
    { limit: 100 },
  )
  // Pick page starting at index 1950 (50th-oldest among 1900..1999? Fetch specifically early page seq 0..49)
  const pageAtSeq55Before = mergeAndPaginateActivities(
    [],
    projectHostedSessionActivities(hostSession, { memberId: 'c1', hostSessionId: 's-2000', eventLog }).items,
    { before: beforeCap.nextBefore, limit: 100 },
  )
  assert.ok(pageAtSeq55Before.items.length === 100)
  // Also query exact first 3 events (seq 0, 1, 2) before crossing 2000
  const tailCurForEarly = mergeAndPaginateActivities(
    [],
    projectHostedSessionActivities(hostSession, { memberId: 'c1', hostSessionId: 's-2000', eventLog }).items.slice(0, 4),
    { limit: 1 },
  ).nextBefore
  const first3Before = mergeAndPaginateActivities(
    [],
    projectHostedSessionActivities(hostSession, { memberId: 'c1', hostSessionId: 's-2000', eventLog }).items,
    { before: tailCurForEarly, limit: 3 },
  )
  assert.deepEqual(first3Before.items.map((x) => x.text), ['turn-0', 'turn-1', 'turn-2'])

  // Cross 2000-event buffer (push seq 2000..2054, evicting seq 0..54 from raw event array)
  for (let s = 2000; s < 2055; s += 1) pushLive(s)

  const afterItems = projectHostedSessionActivities(hostSession, { memberId: 'c1', hostSessionId: 's-2000', eventLog }).items
  assert.equal(afterItems.length, 2055)
  assert.equal(new Set(afterItems.map((x) => x.activityId)).size, 2055)

  const first3After = mergeAndPaginateActivities([], afterItems, { before: tailCurForEarly, limit: 3 })
  assert.deepEqual(first3After.items.map((x) => x.text), ['turn-0', 'turn-1', 'turn-2'])
  for (let i = 0; i < 3; i += 1) {
    assert.equal(first3After.items[i].activityId, first3Before.items[i].activityId)
    assert.equal(first3After.items[i].cursor, first3Before.items[i].cursor)
    assert.equal(first3After.items[i].recordedAt, first3Before.items[i].recordedAt)
  }

  // Also paginate directly across the 54->55 eviction seam (derived backfill -> retained raw log)
  const seamTailCursor = mergeAndPaginateActivities(
    [],
    afterItems.slice(0, 60),
    { limit: 1 },
  ).nextBefore
  const seamPage = mergeAndPaginateActivities([], afterItems, { before: seamTailCursor, limit: 10 })
  assert.deepEqual(
    seamPage.items.map((x) => x.text),
    ['turn-49', 'turn-50', 'turn-51', 'turn-52', 'turn-53', 'turn-54', 'turn-55', 'turn-56', 'turn-57', 'turn-58'],
  )
})

test('team template requiredViews flows through POST /concerto/teams, preset freeze, and runtime snapshot', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-tpl-rv-'))
  const statePath = join(root, 'teams.json')
  const sessions = new Map([['tpl-cmd-1', { id: 'tpl-cmd-1', preset: 'tpl-team' }]])
  const routes = new Map(), tools = new Map(), cleanups = []
  let seq = 0
  let onWorkerTurn = null
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: 'tpl-call', agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (s) => s.preset },
    agents: { get: () => ({ status: 'idle', whenIdle: async () => {} }) },
    sessionController: {
      async create({ agentPreset }) {
        const sessionId = `tpl-member-${++seq}`
        sessions.set(sessionId, { id: sessionId, preset: agentPreset })
        return { sessionId }
      },
      async prompt(input) {
        if (input.sessionId === 'tpl-cmd-1') return { accepted: true }
        if (onWorkerTurn) await onWorkerTurn(input)
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'bundle'), codexCwd: root })
  async function request(path, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    // Reject malformed requiredViews at team save boundary
    const badSave = await request('/concerto/teams', {
      requestId: 'tpl-bad',
      team: {
        id: 'tpl-team',
        name: 'Template Bad',
        commander: { id: 'c1', source: 'hosted' },
        members: [],
        requiredViews: ['invalid-format'],
      },
    })
    assert.equal(badSave.status, 400)
    assert.equal(badSave.value.code, 'invalid')

    // Save valid team with template requiredViews (one advisory string + one requiredForAcceptance: true) & objective through official HTTP entry
    const goodSave = await request('/concerto/teams', {
      requestId: 'tpl-ok',
      team: {
        id: 'tpl-team',
        name: 'Template Good',
        objective: 'Verify template requiredViews',
        commander: { id: 'c1', source: 'hosted' },
        members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
        requiredViews: [
          'mindmap:overall-plan',
          { type: 'checklist', id: 'accept-sheet', title: '验收清单', requiredForAcceptance: true },
        ],
      },
    })
    assert.equal(goodSave.status, 200)

    // Opening commander session freezes team.requiredViews & objective into metadata automatically
    const sess = await request('/concerto/session?sessionId=tpl-cmd-1')
    assert.equal(sess.status, 200)
    assert.equal(sess.value.objective, 'Verify template requiredViews')
    assert.equal(sess.value.snapshot.requiredViews.length, 2)
    assert.deepEqual(
      sess.value.snapshot.missingRequiredViews.map((m) => `${m.type}:${m.id}:${m.requiredForAcceptance}`),
      ['mindmap:overall-plan:false', 'checklist:accept-sheet:true'],
    )

    // A team-level requirement blocks delivery before the reviewer can see a candidate.
    const planRevision = await approveFixturePlan(callTool, request, 'tpl-cmd-1')
    assert.equal((await callTool('submit_decision', 'tpl-cmd-1', {
      decisionId: 'd-tpl-1',
      expectedPlanRevision: planRevision,
      action: 'create_task',
      payload: {
        title: 'Task governed by team template gate',
        objective: 'Review pass blocked by team-level accept-sheet until published',
        acceptance: ['ok'],
        constraints: [],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    })).ok, true)

    // Dispatch task-1: worker prompt includes team template requiredViews; submitting candidate moves task to review
    let task1Prompt = ''
    let markTask1Done
    const task1Done = new Promise((resolve) => { markTask1Done = resolve })
    onWorkerTurn = async (input) => {
      task1Prompt = input?.content?.[0]?.text || input?.prompt || ''
      const t1 = await callTool('get_task', 'tpl-member-1', { taskId: 'task-1' })
      const result = {
        taskId: 'task-1',
        executionId: t1.task.executionId,
        summary: 'candidate for review',
        checksPassed: true,
      }
      const missing = await callTool('submit_result', 'tpl-member-1', result)
      const published = await callTool('publish_view_object', 'tpl-cmd-1', {
        id: 'accept-sheet', type: 'checklist', title: '验收清单',
        data: { items: [{ id: 'c1', label: '团队级门禁就绪', checked: true }] },
      })
      markTask1Done({ missing, published, delivered: await callTool('submit_result', 'tpl-member-1', result) })
    }
    assert.equal((await request('/concerto/tasks/dispatch', { sessionId: 'tpl-cmd-1', taskId: 'task-1', commandId: 'disp-t1', memberId: 'w1' })).status, 202)
    const { missing, published, delivered } = await task1Done
    assert.equal(missing.code, 'precondition_failed')
    assert.match(missing.detail, /checklist:accept-sheet/)
    assert.equal(published.ok, true)
    assert.equal(delivered.state, 'review', JSON.stringify(delivered))
    assert.match(task1Prompt, /mindmap:overall-plan \(recommended\)/)
    assert.match(task1Prompt, /checklist:accept-sheet \(required for acceptance\)/)

    let snap1
    for (let i = 0; i < 20; i += 1) {
      snap1 = (await request('/concerto/session?sessionId=tpl-cmd-1')).value.snapshot
      const ex = snap1.executions.find((e) => e.taskId === 'task-1')
      if (ex && ex.state === 'finished') break
      await new Promise((done) => setTimeout(done, 10))
    }
    const t1State = snap1.tasks.find((t) => t.taskId === 'task-1')
    assert.deepEqual(t1State.result.artifactRefs, ['checklist:accept-sheet@v1'])
    const unblockedReview = await callTool('submit_review', 'tpl-cmd-1', {
      taskId: 'task-1',
      executionId: t1State.executionId,
      resultId: t1State.result.resultId,
      verdict: 'pass',
      reason: 'accept-sheet ready',
    })
    assert.equal(unblockedReview.ok, true)
    assert.equal(unblockedReview.state, 'completed')
  } finally {
    for (const cleanup of cleanups) cleanup()
  }
})

test('HTTP /concerto/view-objects/shared-artifact enforces host scope and co-edits task blueprint table and diagram', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-shared-http-'))
  const statePath = join(root, 'teams.json')
  createTeamStore({ statePath }).saveTeam({
    team: {
      id: 'shared-team',
      name: 'Shared Team',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
    },
  })
  createTeamStore({ statePath }).saveTeam({
    team: {
      id: 'other-team',
      name: 'Other Team',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
    },
  })
  const sessions = new Map([
    ['shared-cmd-1', { id: 'shared-cmd-1', preset: 'shared-team' }],
    ['shared-other-1', { id: 'shared-other-1', preset: 'other-team' }],
  ])
  const routes = new Map(), tools = new Map(), cleanups = []
  let seq = 0
  let workerReady
  const workerPromise = new Promise((resolve) => { workerReady = resolve })
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: 'shared-call', agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (s) => s.preset },
    agents: { get: () => ({ status: 'idle', whenIdle: async () => {} }) },
    sessionController: {
      async create({ agentPreset }) {
        const sessionId = `shared-member-${++seq}`
        sessions.set(sessionId, { id: sessionId, preset: agentPreset })
        return { sessionId }
      },
      async prompt(input) {
        if (input.sessionId === 'shared-cmd-1' || input.sessionId === 'shared-other-1') return { accepted: true }
        workerReady(input.sessionId)
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'bundle'), codexCwd: root })
  async function request(path, body, origin = 'http://localhost') {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin, 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    assert.equal((await request('/concerto/session?sessionId=shared-cmd-1')).status, 200)
    assert.equal((await request('/concerto/session?sessionId=shared-other-1')).status, 200)
    const planRevision = await approveFixturePlan(callTool, request, 'shared-cmd-1')
    assert.equal((await callTool('submit_decision', 'shared-cmd-1', {
      decisionId: 'd-shared-1',
      expectedPlanRevision: planRevision,
      action: 'create_task',
      payload: {
        title: 'Task with shared table and diagram',
        objective: 'Co-edit blueprint artifacts over HTTP',
        acceptance: ['ok'],
        constraints: [],
        dependsOn: [],
        assigneeRole: 'worker',
        requiredViews: ['table:deliverables', 'diagram:flow'],
      },
    })).ok, true)
    assert.equal((await request('/concerto/tasks/dispatch', { sessionId: 'shared-cmd-1', taskId: 'task-1', commandId: 'disp-shared-1', memberId: 'w1' })).status, 202)
    const memberSessionId = await workerPromise

    assert.equal((await callTool('publish_view_object', memberSessionId, {
      id: 'deliverables',
      type: 'table',
      title: '交付表格',
      semanticKind: 'blueprint',
      data: { columns: ['模块', '状态'], rows: [['api', 'todo']] },
    })).ok, true)
    assert.equal((await callTool('publish_view_object', 'shared-cmd-1', {
      id: 'flow',
      type: 'diagram',
      title: '流程图',
      taskId: 'task-1',
      semanticKind: 'blueprint',
      data: { layout: 'dag', nodes: [{ id: 'n1', label: 'Start' }, { id: 'n2', label: 'End' }], edges: [{ from: 'n1', to: 'n2', label: 'next' }] },
    })).ok, true)

    const sharedPath = '/concerto/view-objects/shared-artifact'
    const compatPath = '/concerto/view-objects/acceptance-checklist'
    const cellEdit = {
      sessionId: 'shared-cmd-1', taskId: 'task-1', id: 'deliverables', expectedVersion: 1,
      rowKey: 'api', column: '状态', value: 'verified', commandId: 'http-cell-1',
    }
    assert.equal((await request(sharedPath, cellEdit, 'http://elsewhere')).status, 401)
    assert.equal((await request(sharedPath, { ...cellEdit, sessionId: memberSessionId })).status, 401)
    assert.equal((await request(sharedPath, { ...cellEdit, sessionId: 'shared-other-1' })).status, 404)

    const editedCell = await request(sharedPath, { ...cellEdit, actor: { kind: 'member', id: 'forged' } })
    assert.equal(editedCell.status, 200)
    assert.deepEqual(editedCell.value.change.author, { kind: 'user', id: 'local-owner' })
    assert.equal((await request(sharedPath, { ...cellEdit, commandId: 'http-cell-stale' })).status, 409)

    const appendedRow = await request(compatPath, {
      sessionId: 'shared-cmd-1', taskId: 'task-1', id: 'deliverables', expectedVersion: 2,
      cells: ['ui', 'pending'], commandId: 'http-row-1',
    })
    assert.equal(appendedRow.status, 200)
    assert.equal(appendedRow.value.version, 3)

    const tbl = (await request('/concerto/view-objects/read?sessionId=shared-cmd-1&id=deliverables')).value
    assert.equal(tbl.authorId, 'w1')
    assert.equal(tbl.updatedBy, 'local-owner')
    assert.deepEqual(tbl.data.rows, [['api', 'verified'], ['ui', 'pending']])

    const edgeEdited = await request(sharedPath, {
      sessionId: 'shared-cmd-1', taskId: 'task-1', id: 'flow', expectedVersion: 1,
      targetKind: 'edge', from: 'n1', to: 'n2', label: 'strict check', edgeKind: 'critical', commandId: 'http-edge-1',
    })
    assert.equal(edgeEdited.status, 200)
    const nodeEdited = await request(sharedPath, {
      sessionId: 'shared-cmd-1', taskId: 'task-1', id: 'flow', expectedVersion: 2,
      itemId: 'n1', label: 'Entry Point', commandId: 'http-node-1',
    })
    assert.equal(nodeEdited.status, 200)
    assert.equal(nodeEdited.value.version, 3)
    const diag = (await request('/concerto/view-objects/read?sessionId=shared-cmd-1&id=flow')).value
    assert.equal(diag.authorId, 'c1')
    assert.equal(diag.updatedBy, 'local-owner')
    assert.equal(diag.data.nodes[0].label, 'Entry Point')
    assert.equal(diag.data.edges[0].label, 'strict check')
  } finally {
    for (const cleanup of cleanups) cleanup()
  }
})

function initTempGitRepo(dir) {
  mkdirSync(dir, { recursive: true })
  const run = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', windowsHide: true }).trim()
  run('init')
  run('config', 'core.autocrlf', 'false')
  run('config', 'user.email', 'concerto-test@example.com')
  run('config', 'user.name', 'Concerto Test')
  writeFileSync(join(dir, 'README.md'), '# Repo\n', 'utf8')
  writeFileSync(join(dir, 'base.txt'), 'initial\n', 'utf8')
  run('add', 'README.md', 'base.txt')
  run('commit', '-m', 'init')
  return { run, baseCommit: run('rev-parse', 'HEAD') }
}

async function waitRunExecutionsSettled(request, sessionId) {
  for (let i = 0; i < 40; i += 1) {
    const snap = (await request(`/concerto/session?sessionId=${sessionId}`)).value?.snapshot
    if (snap && (snap.executions ?? []).every((ex) => ['finished', 'stopped'].includes(ex.state))) return snap
    await new Promise((done) => setTimeout(done, 10))
  }
  return (await request(`/concerto/session?sessionId=${sessionId}`)).value?.snapshot
}

test('Git worktree write isolation prepares clean worktree, records baseCommit..headCommit delivery, and sends review into worktree', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'concerto-wt-clean-')))
  const createdWorktrees = []
  t.after(() => {
    for (const wt of createdWorktrees) removeGitWorktree(wt)
    rmSync(root, { recursive: true, force: true })
  })
  const repoDir = join(root, 'repo')
  const { run: gitRepo, baseCommit } = initTempGitRepo(repoDir)

  const statePath = join(root, 'teams.json')
  createTeamStore({ statePath }).saveTeam({
    team: {
      id: 'wt-team',
      name: 'Worktree Team',
      commander: { id: 'c1', source: 'hosted' },
      members: [
        { id: 'w1', roleKind: 'worker', source: 'hosted' },
        { id: 'r1', roleKind: 'reviewer', toolProfile: 'readonly', source: 'hosted' },
      ],
    },
  })

  const sessions = new Map([['wt-cmd-1', { id: 'wt-cmd-1', preset: 'wt-team', header: { cwd: repoDir } }]])
  const routes = new Map(), tools = new Map(), cleanups = [], createReqs = [], memberPrompts = []
  let seq = 0
  let onWorkerTurn = null
  let onReviewTurn = null
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: `wt-call-${++seq}`, agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (s) => s.preset },
    agents: { get: () => ({ status: 'idle', whenIdle: async () => {} }) },
    workspaceRegistry: {
      list: () => [{ id: 'ws-repo', path: repoDir }],
    },
    sessionController: {
      async create(req) {
        createReqs.push(req)
        const sessionId = `wt-member-${++seq}`
        sessions.set(sessionId, { id: sessionId, preset: req.agentPreset, header: req.cwd ? { cwd: req.cwd } : {} })
        return { sessionId }
      },
      async prompt(input) {
        if (input.sessionId === 'wt-cmd-1') return { accepted: true }
        const text = input?.content?.[0]?.text || input?.prompt || ''
        memberPrompts.push({ sessionId: input.sessionId, text })
        if (text.includes('[Candidate Result Under Review]')) {
          if (onReviewTurn) await onReviewTurn(input.sessionId, text)
        } else if (onWorkerTurn) {
          await onWorkerTurn(input.sessionId, text)
        }
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.sqlite'), teamsBundleDir: join(root, 'bundle'), codexCwd: '' })
  async function request(path, body, origin = 'http://localhost') {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin, 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    assert.equal((await request('/concerto/session?sessionId=wt-cmd-1')).status, 200)
    const planRevision = await approveFixturePlan(callTool, request, 'wt-cmd-1')
    assert.equal((await callTool('submit_decision', 'wt-cmd-1', {
      decisionId: 'd-wt-1',
      expectedPlanRevision: planRevision,
      action: 'create_task',
      payload: {
        title: 'Write isolated feature',
        objective: 'Create feature.txt and commit on an isolated branch',
        acceptance: ['feature.txt committed'],
        constraints: [],
        dependsOn: [],
        assigneeRole: 'worker',
        requiresReview: true,
      },
    })).ok, true)

    const workerDone = Promise.withResolvers()
    let headCommit = ''
    onWorkerTurn = async (workerSid, promptText) => {
      try {
        const got = await callTool('get_task', workerSid, { taskId: 'task-1' })
        const wt = got.task.worktree
        writeFileSync(join(wt.path, 'feature.txt'), 'isolated worktree output\n', 'utf8')
        const gitWt = (...args) => execFileSync('git', ['-C', wt.path, ...args], { encoding: 'utf8', windowsHide: true }).trim()
        gitWt('add', 'feature.txt')
        gitWt('commit', '-m', 'add feature')
        headCommit = gitWt('rev-parse', 'HEAD')
        const submitted = await callTool('submit_result', workerSid, {
          taskId: 'task-1',
          executionId: got.task.executionId,
          summary: 'Implemented feature.txt in isolated worktree',
          checksPassed: true,
          artifactRefs: ['feature.txt'],
        })
        workerDone.resolve({ promptText, submitted })
      } catch (error) {
        workerDone.reject(error)
      }
    }

    const disp = await request('/concerto/tasks/dispatch', {
      sessionId: 'wt-cmd-1', taskId: 'task-1', commandId: 'disp-wt-1', memberId: 'w1',
    })
    assert.equal(disp.status, 202, JSON.stringify(disp.value))
    assert.ok(disp.value.worktree)
    createdWorktrees.push(disp.value.worktree)
    assert.equal(disp.value.worktree.repositoryRoot, repoDir)
    assert.equal(disp.value.worktree.baseCommit, baseCommit)
    assert.match(disp.value.worktree.branch, /^concerto\/task-1\//)
    assert.equal(scopesOverlap(repoDir, disp.value.worktree.path), false)

    // Identical commandId replay must not spawn a second worktree
    const replayed = await request('/concerto/tasks/dispatch', {
      sessionId: 'wt-cmd-1', taskId: 'task-1', commandId: 'disp-wt-1', memberId: 'w1',
    })
    assert.equal(replayed.status, 202)
    assert.equal(replayed.value.replayed, true)
    assert.equal(replayed.value.executionId, disp.value.executionId)

    const { promptText: workerPrompt, submitted } = await workerDone.promise
    assert.equal(submitted.ok, true, JSON.stringify(submitted))
    assert.match(workerPrompt, /\[Git Worktree Isolation\]/)
    assert.match(workerPrompt, new RegExp(baseCommit))
    assert.equal(createReqs[0].cwd, disp.value.worktree.path)
    assert.equal(createReqs[0].workspaceId, undefined, 'tmpdir worktree must pass cwd instead of source workspaceId')

    // Source repository stayed completely clean and unmodified
    assert.equal(existsSync(join(repoDir, 'feature.txt')), false)
    assert.equal(gitRepo('status', '--porcelain'), '')

    // Result delivery captures headCommit, diffRange baseCommit..headCommit, and committedFiles
    const afterSubmit = await waitRunExecutionsSettled(request, 'wt-cmd-1')
    const reviewTask = afterSubmit.tasks[0]
    assert.equal(reviewTask.state, 'review')
    assert.equal(reviewTask.worktree.headCommit, headCommit)
    assert.equal(reviewTask.result.delivery.worktree.diffRange, `${baseCommit}..${headCommit}`)
    assert.deepEqual(reviewTask.result.delivery.worktree.committedFiles, ['feature.txt'])

    // Dispatch Reviewer: executes in the same worktree with baseCommit..headCommit diff range
    const reviewDone = Promise.withResolvers()
    onReviewTurn = async (reviewSid, reviewPrompt) => {
      try {
        const got = await callTool('get_task', reviewSid, { taskId: 'task-1' })
        const passed = await callTool('submit_review', reviewSid, {
          taskId: 'task-1',
          executionId: got.task.result.executionId,
          resultId: got.task.result.resultId,
          verdict: 'pass',
          reason: `Verified diff ${baseCommit}..${headCommit}`,
          evidenceRefs: got.task.result.artifactRefs,
        })
        reviewDone.resolve({ reviewPrompt, passed })
      } catch (error) {
        reviewDone.reject(error)
      }
    }
    const dispRev = await callTool('dispatch_review', 'wt-cmd-1', {
      taskId: 'task-1', commandId: 'rev-wt-1', memberId: 'r1',
    })
    assert.equal(dispRev.ok, true, JSON.stringify(dispRev))
    const { reviewPrompt, passed } = await reviewDone.promise
    await waitRunExecutionsSettled(request, 'wt-cmd-1')
    assert.equal(passed.ok, true, JSON.stringify(passed))
    assert.equal(passed.state, 'completed')
    assert.equal(createReqs.at(-1).cwd, disp.value.worktree.path)
    assert.match(reviewPrompt, /\[Git Worktree Review Baseline\]/)
    assert.match(reviewPrompt, new RegExp(`${baseCommit}\\.\\.${headCommit}`))
    assert.match(reviewPrompt, /Committed files \(1\): feature\.txt/)
  } finally {
    for (const cleanup of cleanups) cleanup()
  }
})

test('Dirty Git workspace returns 409 worktree_dirty without copying secrets and honors isolated_clean vs shared fallback', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'concerto-wt-dirty-')))
  const createdWorktrees = []
  t.after(() => {
    for (const wt of createdWorktrees) removeGitWorktree(wt)
    rmSync(root, { recursive: true, force: true })
  })
  const repoDir = join(root, 'dirty-repo')
  const { baseCommit } = initTempGitRepo(repoDir)
  // Uncommitted modification + untracked secret file
  writeFileSync(join(repoDir, 'base.txt'), 'uncommitted local change\n', 'utf8')
  writeFileSync(join(repoDir, '.env.secret'), 'API_KEY=do-not-copy\n', 'utf8')
  const plainDir = join(root, 'non-git')
  mkdirSync(plainDir, { recursive: true })
  writeFileSync(join(plainDir, 'notes.txt'), 'plain non-git file\n', 'utf8')

  const statePath = join(root, 'teams.json')
  createTeamStore({ statePath }).saveTeam({
    team: {
      id: 'dirty-team',
      name: 'Dirty Team',
      commander: { id: 'c1', source: 'hosted' },
      members: [
        { id: 'w1', roleKind: 'worker', source: 'hosted' },
        { id: 'r1', roleKind: 'reviewer', toolProfile: 'readonly', source: 'hosted' },
      ],
    },
  })
  const sessions = new Map([['dirty-cmd-1', { id: 'dirty-cmd-1', preset: 'dirty-team', header: { cwd: repoDir } }]])
  const routes = new Map(), tools = new Map(), cleanups = []
  let seq = 0
  let onWorkerTurn = null
  let onReviewTurn = null
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: `dirty-call-${++seq}`, agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (s) => s.preset },
    agents: { get: () => ({ status: 'idle', whenIdle: async () => {} }) },
    sessionController: {
      async create(req) {
        const sessionId = `dirty-member-${++seq}`
        sessions.set(sessionId, { id: sessionId, preset: req.agentPreset, header: req.cwd ? { cwd: req.cwd } : {} })
        return { sessionId }
      },
      async prompt(input) {
        if (input.sessionId === 'dirty-cmd-1') return { accepted: true }
        const text = input?.content?.[0]?.text || input?.prompt || ''
        if (text.includes('[Candidate Result Under Review]')) {
          if (onReviewTurn) await onReviewTurn(input.sessionId, text)
        } else if (onWorkerTurn) {
          await onWorkerTurn(input.sessionId, text)
        }
      },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} } },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.sqlite'), teamsBundleDir: join(root, 'bundle'), codexCwd: '' })
  async function request(path, body, origin = 'http://localhost') {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin, 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    assert.equal((await request('/concerto/session?sessionId=dirty-cmd-1')).status, 200)
    const planRevision = await approveFixturePlan(callTool, request, 'dirty-cmd-1')
    for (const [id, title, obj] of [
      ['d1', 'Modify tracked config', 'Write config output'],
      ['d2', 'Edit shared workspace', 'Modify file in shared dir'],
      ['d3', 'Inspect plain folder', 'Read plain folder'],
    ]) {
      assert.equal((await callTool('submit_decision', 'dirty-cmd-1', {
        decisionId: id, expectedPlanRevision: id === 'd1' ? planRevision : planRevision + Number(id[1]) - 1,
        action: 'create_task',
        payload: { title, objective: obj, acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
      })).ok, true)
    }

    // 1) Default dispatch on dirty Git repo refuses with 409 worktree_dirty and warns user
    const blockedDirty = await request('/concerto/tasks/dispatch', {
      sessionId: 'dirty-cmd-1', taskId: 'task-1', commandId: 'disp-dirty-default', memberId: 'w1',
    })
    assert.equal(blockedDirty.status, 409)
    assert.equal(blockedDirty.value.code, 'worktree_dirty')
    assert.equal(blockedDirty.value.worktreeWarning.unstagedCount, 1)
    assert.equal(blockedDirty.value.worktreeWarning.untrackedCount, 1)
    const snapDirty = (await request('/concerto/session?sessionId=dirty-cmd-1')).value.snapshot
    assert.equal(snapDirty.tasks[0].state, 'pending')
    assert.equal(snapDirty.attention.some((a) => a.kind === 'worktree_dirty' && a.taskId === 'task-1'), true)

    // 2) Explicit worktreeMode='isolated_clean' checks out baseCommit cleanly without copying .env.secret or dirty edits
    const task1Done = Promise.withResolvers()
    onWorkerTurn = async (workerSid) => {
      try {
        const got = await callTool('get_task', workerSid, { taskId: 'task-1' })
        const wtPath = got.task.worktree.path
        assert.equal(existsSync(join(wtPath, '.env.secret')), false, 'secrets must not be copied into clean worktree')
        assert.equal(readFileSync(join(wtPath, 'base.txt'), 'utf8'), 'initial\n')
        writeFileSync(join(wtPath, 'clean-out.txt'), 'from clean head\n', 'utf8')
        const res = await callTool('submit_result', workerSid, {
          taskId: 'task-1', executionId: got.task.executionId, summary: 'Clean worktree output', checksPassed: true, artifactRefs: ['clean-out.txt'],
        })
        task1Done.resolve(res)
      } catch (error) {
        task1Done.reject(error)
      }
    }
    const cleanDisp = await request('/concerto/tasks/dispatch', {
      sessionId: 'dirty-cmd-1', taskId: 'task-1', commandId: 'disp-isolated-clean', memberId: 'w1', worktreeMode: 'isolated_clean',
    })
    assert.equal(cleanDisp.status, 202)
    createdWorktrees.push(cleanDisp.value.worktree)
    assert.equal(cleanDisp.value.worktree.baseCommit, baseCommit)
    assert.equal(cleanDisp.value.worktree.dirtySourceSkipped, true)
    assert.equal((await task1Done.promise).ok, true)
    await waitRunExecutionsSettled(request, 'dirty-cmd-1')

    const rev1Done = Promise.withResolvers()
    onReviewTurn = async (reviewSid) => {
      try {
        const got = await callTool('get_task', reviewSid, { taskId: 'task-1' })
        rev1Done.resolve(await callTool('submit_review', reviewSid, {
          taskId: 'task-1', executionId: got.task.result.executionId, resultId: got.task.result.resultId,
          verdict: 'pass', reason: 'Clean worktree checked', evidenceRefs: got.task.result.artifactRefs,
        }))
      } catch (error) {
        rev1Done.reject(error)
      }
    }
    assert.equal((await callTool('dispatch_review', 'dirty-cmd-1', { taskId: 'task-1', commandId: 'rev-1', memberId: 'r1' })).ok, true)
    assert.equal((await rev1Done.promise).state, 'completed')
    await waitRunExecutionsSettled(request, 'dirty-cmd-1')

    // 3) Explicit worktreeMode='shared' runs in repoDir sequentially and tells reviewer NOT to claim a Git baseline
    const task2Done = Promise.withResolvers()
    onWorkerTurn = async (workerSid) => {
      try {
        const got = await callTool('get_task', workerSid, { taskId: 'task-2' })
        assert.equal(got.task.worktree, null)
        assert.equal(got.task.worktreeFallback.reason, 'explicit_shared')
        task2Done.resolve(await callTool('submit_result', workerSid, {
          taskId: 'task-2', executionId: got.task.executionId, summary: 'Shared workspace update', checksPassed: true, artifactRefs: ['base.txt'],
        }))
      } catch (error) {
        task2Done.reject(error)
      }
    }
    const sharedDisp = await request('/concerto/tasks/dispatch', {
      sessionId: 'dirty-cmd-1', taskId: 'task-2', commandId: 'disp-shared', memberId: 'w1', worktreeMode: 'shared',
    })
    assert.equal(sharedDisp.status, 202)
    assert.equal(sharedDisp.value.worktree, undefined)
    assert.equal((await task2Done.promise).ok, true)
    await waitRunExecutionsSettled(request, 'dirty-cmd-1')
    assert.equal(readFileSync(join(repoDir, '.env.secret'), 'utf8'), 'API_KEY=do-not-copy\n')

    const rev2Done = Promise.withResolvers()
    onReviewTurn = async (reviewSid, reviewPrompt) => {
      try {
        const got = await callTool('get_task', reviewSid, { taskId: 'task-2' })
        const passed = await callTool('submit_review', reviewSid, {
          taskId: 'task-2', executionId: got.task.result.executionId, resultId: got.task.result.resultId,
          verdict: 'pass', reason: 'Checked shared file hash', evidenceRefs: got.task.result.artifactRefs,
        })
        rev2Done.resolve({ reviewPrompt, passed })
      } catch (error) {
        rev2Done.reject(error)
      }
    }
    assert.equal((await callTool('dispatch_review', 'dirty-cmd-1', { taskId: 'task-2', commandId: 'rev-2', memberId: 'r1' })).ok, true)
    const { reviewPrompt: sharedRevPrompt, passed: sharedPassed } = await rev2Done.promise
    await waitRunExecutionsSettled(request, 'dirty-cmd-1')
    assert.equal(sharedPassed.state, 'completed')
    assert.match(sharedRevPrompt, /no isolated Git worktree baseline; do not claim a Git baseCommit\.\.HEAD baseline/)

    // 4) Non-Git directory: forced worktree returns 412, read-only auto mode falls back cleanly without creating fake worktree
    const strictNonGit = await request('/concerto/tasks/dispatch', {
      sessionId: 'dirty-cmd-1', taskId: 'task-3', commandId: 'disp-nongit-strict', memberId: 'w1', cwd: plainDir, worktreeMode: 'worktree',
    })
    assert.equal(strictNonGit.status, 412)
    const task3Done = Promise.withResolvers()
    onWorkerTurn = async (workerSid) => {
      try {
        const got = await callTool('get_task', workerSid, { taskId: 'task-3' })
        task3Done.resolve(await callTool('submit_result', workerSid, {
          taskId: 'task-3', executionId: got.task.executionId, summary: 'Read plain dir', checksPassed: true, artifactRefs: ['notes.txt'],
        }))
      } catch (error) {
        task3Done.reject(error)
      }
    }
    const roNonGit = await request('/concerto/tasks/dispatch', {
      sessionId: 'dirty-cmd-1', taskId: 'task-3', commandId: 'disp-nongit-ro', memberId: 'w1', cwd: plainDir, sandbox: 'read-only',
    })
    assert.equal(roNonGit.status, 202)
    assert.equal(roNonGit.value.worktree, undefined)
    assert.equal((await task3Done.promise).ok, true)
    await waitRunExecutionsSettled(request, 'dirty-cmd-1')
  } finally {
    for (const cleanup of cleanups) cleanup()
  }
})
