import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'
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
  const team = { id: 'team', name: 'Team', commander: { id: 'c1', source: 'hosted' }, members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }, { id: 'w2', roleKind: 'worker', source: 'hosted' }] }
  assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)
  const sessions = new Map(['a', 'b', 'unbound-member'].map((id) => [id, { id, preset: id === 'unbound-member' ? 'team--w1' : 'team' }]))
  const routes = new Map(), tools = new Map(), cleanups = []
  let nativeStatus = 'running'
  const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, { callId: 'call-fixture', agent: { id: sessionId, session: sessions.get(sessionId) } })
  const ctx = {
    logger: { error(error) { throw error }, warn(error) { throw error } },
    sessions: { get: (id) => sessions.get(id) },
    agentPresets: { presetForSession: (session) => session.preset },
    agents: { get: () => ({ status: nativeStatus, whenIdle: async () => {} }) },
    sessionController: {
      async create({ agentPreset }) { assert.equal(agentPreset, 'team--w2'); sessions.set('member', { id: 'member', preset: agentPreset }); return { sessionId: 'member' } },
      async prompt(_input, signal) {
        assert.ok(signal instanceof AbortSignal)
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
  async function request(path, body) {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method: body ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(req, { writeHead(code) { status = code }, end(text) { value = JSON.parse(text) } })
    return { status, value }
  }
  try {
    const a = await request('/concerto/session?sessionId=a'), b = await request('/concerto/session?sessionId=b')
    assert.notEqual(a.value.teamSessionId, b.value.teamSessionId)
    assert.notEqual(a.value.projectId, b.value.projectId)
    assert.equal((await request('/concerto/teams', { requestId: 'config-2', expectedConfigVersion: 1,
      team: { ...team, name: 'Renamed team', members: [{ id: 'w2', roleKind: 'worker', source: 'hosted' }] } })).status, 200)
    const frozen = (await request('/concerto/session?sessionId=a')).value
    assert.equal(frozen.configVersion, 1)
    assert.equal(frozen.members[0].id, 'w1')
    assert.equal((await request('/concerto/session?sessionId=unbound-member')).status, 404)
    assert.equal((await callTool('get_task', 'unbound-member', { taskId: 'task-1' })).code, 'unauthorized')
    await callTool('submit_decision', 'a', { decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: {
      title: 'Task', objective: 'Deliver', acceptance: ['Evidence'], constraints: [], dependsOn: [], assigneeRole: 'worker',
    } })
    assert.equal((await callTool('get_team_status', 'b')).taskCount, 0)
    assert.equal((await request('/concerto/tasks/dispatch', { sessionId: 'unbound-member', taskId: 'task-1' })).value.code, 'unauthorized')
    assert.equal((await request('/concerto/tasks/dispatch', {sessionId:'a',taskId:'task-1',commandId:'conflict',member:'w1',memberId:'w2'})).value.code, 'invalid')
    assert.equal((await request('/concerto/tasks/dispatch', {sessionId:'a',taskId:'task-1',commandId:'unknown',memberId:'absent'})).value.code, 'invalid')
    const dispatched = await request('/concerto/tasks/dispatch', { sessionId: 'a', teamId: 'forged', taskId: 'task-1', commandId: 'dispatch-1', [memberField]: 'w2' })
    assert.equal(dispatched.status, 202)
    await new Promise((done) => setTimeout(done, 20))
    const snapshot = (await request('/concerto/session?sessionId=a')).value.snapshot
    assert.equal(snapshot.executions[0].state, 'finished')
    assert.equal(snapshot.tasks[0].state, 'review')
    assert.equal(snapshot.tasks[0].memberId, 'w2')
    assert.equal(snapshot.tasks[0].result.summary, 'candidate')
    assert.equal((await request('/concerto/session?sessionId=member')).value.teamSessionId, a.value.teamSessionId)
    assert.equal((await request('/concerto/status?sessionId=b')).value.taskCount, 0)
    // Restart while a submitted result's native execution is unconfirmed.
    const runtimePath = join(root,'runtime.json')
    const saved = JSON.parse(readFileSync(runtimePath,'utf8'))
    saved.sessions.find(run=>run.sessionId===a.value.teamSessionId).executions[0].state = 'running'
    writeFileSync(runtimePath,JSON.stringify(saved))
    for (const cleanup of cleanups) cleanup()
    apply(ctx, {statePath,runtimePath,teamsBundleDir:join(root,'bundle'),codexCwd:root})
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
      async prompt() {
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
    await callTool('submit_decision', 'cmd-1', {
      decisionId: 'd-cmd-1',
      expectedPlanRevision: 1,
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

    // Create task WITHOUT task-level requiredViews; dispatched worker delivers candidate to review,
    // and Commander's submit_review(pass) acceptance gate is blocked by team-level checklist:accept-sheet.
    assert.equal((await callTool('submit_decision', 'tpl-cmd-1', {
      decisionId: 'd-tpl-1',
      expectedPlanRevision: 1,
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
      assert.equal((await callTool('submit_result', 'tpl-member-1', {
        taskId: 'task-1',
        executionId: t1.task.executionId,
        summary: 'candidate for review',
        checksPassed: true,
      })).state, 'review')
      markTask1Done()
    }
    assert.equal((await request('/concerto/tasks/dispatch', { sessionId: 'tpl-cmd-1', taskId: 'task-1', commandId: 'disp-t1', memberId: 'w1' })).status, 202)
    await task1Done
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
    const blockedReview = await callTool('submit_review', 'tpl-cmd-1', {
      taskId: 'task-1',
      executionId: t1State.executionId,
      resultId: t1State.result.resultId,
      verdict: 'pass',
      reason: 'trying pass before accept-sheet',
    })
    assert.equal(blockedReview.ok, false)
    assert.equal(blockedReview.code, 'precondition_failed')
    assert.match(blockedReview.detail, /checklist:accept-sheet/)

    // Publish ONLY checklist:accept-sheet (while advisory mindmap:overall-plan stays missing) -> acceptance passes!
    assert.equal((await callTool('publish_view_object', 'tpl-cmd-1', {
      id: 'accept-sheet',
      type: 'checklist',
      title: '验收清单',
      data: { items: [{ id: 'c1', label: '团队级门禁就绪', checked: true }] },
    })).ok, true)
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
