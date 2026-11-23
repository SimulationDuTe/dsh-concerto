import test from 'node:test'
import assert from 'node:assert/strict'
import { approveFixturePlan } from './fixtures/approve-plan.mjs'
import { registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { buildTeamBundleFiles } from '../packages/dsh-concerto/lib/team_bundle.mjs'
import { createCodexAdapter } from '../packages/dsh-concerto/lib/connector/codex-adapter.mjs'
import { removeGitWorktree, scopesOverlap } from '../packages/dsh-concerto/lib/workspace_scope.mjs'

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@deepseek-ai/schemastery') {
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent('const z = new Proxy(() => z, { get: () => z }); export default z') }
  }
  return next(specifier, context)
} })
const { apply } = await import('../packages/dsh-concerto/lib/index.js')
hook.deregister()

function createHarness({
  root,
  runtimePath = join(root, 'runtime.json'),
  team,
  definitions = null,
  workspaces = [],
  controllerImpl = null,
  toolSchemasByAgent = null,
  pluginManager = null,
} = {}) {
  const statePath = join(root, 'teams.json')
  const teamsBundleDir = join(root, 'bundle')
  if (team && !existsSync(statePath)) {
    assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)
  }

  const sessions = new Map()
  const agents = new Map()
  const routes = new Map()
  const tools = new Map()
  const cleanups = []
  const attachedLog = []

  const workspaceRegistry = {
    list: () => workspaces,
    get: (id) => workspaces.find((w) => w.id === id),
    async create(dirPath) {
      const existing = workspaces.find((w) => w.path === dirPath)
      if (existing) return existing
      const ws = {
        id: `ws-${workspaces.length + 1}`,
        path: dirPath,
        sessionIds: [],
        async attachSession(sid) {
          ws.sessionIds.push(sid)
          attachedLog.push({ workspaceId: ws.id, sessionId: sid })
        },
      }
      workspaces.push(ws)
      return ws
    },
  }

  const agentPresets = {
    presetForSession: (s) => s?.preset ?? null,
    ...(definitions ? { definitions } : {}),
  }

  const ctx = {
    logger: { error() {}, warn() {} },
    sessions: { get: (id) => sessions.get(id), list: async () => [...sessions.values()] },
    agents: { get: (id) => agents.get(id), list: async () => [...agents.values()] },
    agentPresets,
    pluginManager,
    workspaceRegistry,
    sessionController: controllerImpl || {
      async create({ workspaceId, cwd, agentPreset }) {
        assert.ok(!(workspaceId && cwd), 'never pass both workspaceId and cwd to sessionController.create')
        const sid = `sess-${sessions.size + 1}`
        const resolvedCwd = workspaceId ? workspaces.find((w) => w.id === workspaceId)?.path : cwd
        sessions.set(sid, { id: sid, preset: agentPreset, header: resolvedCwd ? { cwd: resolvedCwd } : {} })
        agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        if (workspaceId) {
          const ws = workspaces.find((w) => w.id === workspaceId)
          await ws?.attachSession?.(sid)
        }
        return { sessionId: sid }
      },
      async prompt() {},
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: {
      register(def) { tools.set(def.name, def); return () => {} },
      get(name) { return tools.get(name) },
      schemas(agentOrScope) {
        if (typeof toolSchemasByAgent === 'function') return toolSchemasByAgent(agentOrScope)
        return []
      },
    },
  }

  apply(ctx, { statePath, runtimePath, teamsBundleDir, codexCwd: '' })

  async function request(path, body, method = body === undefined ? 'GET' : 'POST') {
    const req = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
    Object.assign(req, {
      method,
      url: path,
      socket: { remoteAddress: '127.0.0.1' },
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' },
    })
    let status, value
    const handler = routes.get(path.split('?')[0])
    assert.ok(handler, `missing route handler for ${path}`)
    await handler(req, {
      writeHead(code) { status = code },
      end(text) { value = text ? JSON.parse(text) : null },
    })
    return { status, value }
  }

  function callTool(name, sessionId, args = {}, callId = `call-${Math.random().toString(16).slice(2)}`) {
    const def = tools.get(name)
    assert.ok(def, `missing tool ${name}`)
    return def.execute(args, { callId, agent: { id: sessionId, session: sessions.get(sessionId) } })
  }

  function dispose() {
    for (const c of cleanups) {
      if (typeof c === 'function') c()
    }
  }

  return {
    root,
    runtimePath,
    teamsBundleDir,
    sessions,
    agents,
    tools,
    attachedLog,
    workspaces,
    request,
    callTool,
    dispose,
  }
}

test('0.0.6 Step 3: buildTeamBundleFiles mounts @deepseek-ai/dsh-tool-* plugins cleanly on hosted workers', () => {
  const built = buildTeamBundleFiles([
    {
      id: 't1',
      name: 'Capability Team',
      commander: { id: 'cmd', source: 'hosted', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
      members: [
        { id: 'coder', roleKind: 'worker', source: 'hosted', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
        { id: 'auditor', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
        { id: 'ext', roleKind: 'worker', source: 'external', connector: 'codex' },
      ],
    },
  ], { platform: 'win32' })

  assert.equal(built.ok, true)
  const yaml = built.files['cordis.patch.yml']
  assert.ok(!yaml.includes('!!js'), 'must emit portable booleans without !!js unknown tags')
  assert.ok(yaml.includes('@deepseek-ai/dsh-tool-fs'))
  assert.ok(yaml.includes('@deepseek-ai/dsh-tool-fs-search'))
  assert.ok(yaml.includes('@deepseek-ai/dsh-tool-pwsh'))
  assert.ok(yaml.includes('@deepseek-ai/dsh-agent-instructions'))
  // Reviewer readonly preset disables write & edit
  const idxAuditor = yaml.indexOf("id: 't1--auditor'")
  assert.ok(idxAuditor > 0)
  const auditorSlice = yaml.slice(idxAuditor)
  assert.ok(auditorSlice.includes('write: false'))
  assert.ok(auditorSlice.includes('edit: false'))
  assert.ok(!auditorSlice.includes('@deepseek-ai/dsh-tool-pwsh'))
})

test('0.0.6 Step 1: orphan unknown execution recovery works without live commander session and never infers stop from sessions.get === undefined', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-orphan-'))
  const workDir = join(root, 'workspace')
  await import('node:fs/promises').then((fs) => fs.mkdir(workDir, { recursive: true }))
  const team = {
    id: 'orphan-team',
    name: 'Orphan Team',
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
  }

  let workerPromiseResolve
  const h1 = createHarness({
    root,
    team,
    controllerImpl: {
      async create({ agentPreset }) {
        const sid = 'hosted-w1-sess'
        h1.sessions.set(sid, { id: sid, preset: agentPreset, header: { cwd: workDir } })
        h1.agents.set(sid, { id: sid, status: 'running', whenIdle: () => new Promise((r) => { workerPromiseResolve = r }) })
        return { sessionId: sid }
      },
      async prompt() {},
    },
  })
  h1.sessions.set('cmd-old', { id: 'cmd-old', preset: 'orphan-team', header: { cwd: workDir } })
  const sesRes = await h1.request('/concerto/session?sessionId=cmd-old')
  assert.equal(sesRes.status, 200)
  const runScope = sesRes.value.teamSessionId

  const initialPlanRevision = await approveFixturePlan(h1.callTool, h1.request, 'cmd-old')
  await h1.callTool('submit_decision', 'cmd-old', {
    decisionId: 'd1',
    expectedPlanRevision: initialPlanRevision,
    action: 'create_task',
    payload: { title: 'Write README', objective: 'Create README file', acceptance: ['file exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })

  const disp = await h1.callTool('dispatch_task', 'cmd-old', { taskId: 'task-1', commandId: 'disp-1', memberId: 'w1' }, 'call-disp-1')
  assert.equal(disp.ok, true)
  const execId = disp.executionId
  await new Promise((r) => setTimeout(r, 20))
  h1.dispose()
  if (workerPromiseResolve) workerPromiseResolve()

  // Simulate host restart: cmd-old & hosted-w1-sess are NOT loaded in sessions/agents, execution stuck running in persisted runtime.json
  const persisted = JSON.parse(readFileSync(join(root, 'runtime.json'), 'utf8'))
  const runRow = persisted.sessions.find((s) => s.sessionId === runScope)
  const execRow = runRow.executions.find((e) => e.executionId === execId)
  execRow.state = 'running'
  execRow.nativeSessionRef = { backend: 'hosted', sessionId: 'hosted-w1-sess', hostBootId: 'old-boot-id' }
  runRow.tasks[0].state = 'running'
  writeFileSync(join(root, 'runtime.json'), JSON.stringify(persisted))

  const h2 = createHarness({ root, team })
  // Original sessions.get('cmd-old') is undefined -> old route must be unauthorized/unreachable
  const oldRoute = await h2.request('/concerto/executions/adjudicate', {
    sessionId: 'cmd-old', taskId: 'task-1', executionId: execId, commandId: 'old-1', action: 'confirm_failed', reason: 'stale',
  })
  assert.equal(oldRoute.status, 401)

  // Independent local-owner recovery route lists the orphaned unknown execution!
  const listRes = await h2.request('/concerto/recovery/unknown')
  assert.equal(listRes.status, 200)
  assert.equal(listRes.value.runs.length, 1)
  assert.equal(listRes.value.runs[0].executionId, execId)
  assert.equal(listRes.value.runs[0].originalCommanderSessionAlive, false)
  assert.equal(listRes.value.runs[0].isCurrentHostBoot, false)

  // Reconcile must NOT claim stopped just because sessions.get('hosted-w1-sess') === undefined
  const recRes = await h2.request('/concerto/recovery/reconcile', {
    teamSessionId: runScope, taskId: 'task-1', executionId: execId,
  })
  assert.equal(recRes.status, 200)
  assert.equal(recRes.value.confirmedStopped, false)
  assert.equal(recRes.value.kind, 'hosted_unconfirmed')

  // confirm_failed without verified stop proof MUST reject with 412 and keep workspace reserved!
  const denyRelease = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: runScope, taskId: 'task-1', executionId: execId, commandId: 'rec-deny', action: 'confirm_failed', reason: 'user checked manually',
  })
  assert.equal(denyRelease.status, 412)

  // retry_isolated succeeds for bounded Hosted execution, retaining quarantined unknown & setting fresh retryCwd
  const isoRes = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: runScope,
    taskId: 'task-1',
    executionId: execId,
    commandId: 'rec-iso',
    action: 'retry_isolated',
    reason: 'isolate onto clean dir after restart',
    externalEffectsReviewed: true,
  })
  assert.equal(isoRes.status, 200)
  assert.equal(isoRes.value.state, 'pending')
  assert.ok(isoRes.value.retryCwd)
  assert.equal(scopesOverlap(isoRes.value.retryCwd, workDir), false)

  // Now launch or attach a new commander session or reload session, verify retrying into old workDir is blocked while omitting cwd uses retryCwd!
  h2.sessions.set('cmd-old', { id: 'cmd-old', preset: 'orphan-team', header: { cwd: workDir } })
  const badRetry = await h2.callTool('dispatch_task', 'cmd-old', { taskId: 'task-1', commandId: 'retry-old-cwd', memberId: 'w1', cwd: workDir })
  assert.equal(badRetry.ok, false)
  assert.equal(badRetry.code, 'precondition_failed')

  const goodRetry = await h2.callTool('dispatch_task', 'cmd-old', { taskId: 'task-1', commandId: 'retry-iso-cwd', memberId: 'w1' })
  assert.equal(goodRetry.ok, true)
  await new Promise((r) => setTimeout(r, 25))
  const finalSnap = (await h2.request('/concerto/session?sessionId=cmd-old')).value.snapshot
  const newExec = finalSnap.executions.find((e) => e.executionId === goodRetry.executionId)
  assert.equal(newExec.dispatchedBy.kind, 'model')
  assert.equal(realpathSync(newExec.writeScope).toLowerCase(), realpathSync(isoRes.value.retryCwd).toLowerCase())

  h2.dispose()
})

test('dispatch capability failures persist a blocker with a replayable receipt until explicitly resolved', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-caps-'))
  const workDir = join(root, 'repo')
  await import('node:fs/promises').then((fs) => fs.mkdir(workDir, { recursive: true }))

  const team = {
    id: 'cap-team',
    name: 'Cap Team',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w-coding', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'w-readonly', roleKind: 'worker', source: 'hosted', toolProfile: 'readonly' },
      { id: 'w-unreloaded', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'w-none', roleKind: 'worker', source: 'hosted', toolProfile: 'none' },
      { id: 'w-unavailable', roleKind: 'worker', source: 'external', connector: 'fixture-unavailable' },
    ],
  }

  const shellPlugin = process.platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash'
  const definitions = new Map([
    ['cap-team', { config: { id: 'cap-team', plugins: [{ id: 'member-c1', name: 'dsh-concerto/member', config: {} }] } }],
    ['cap-team--w-coding', {
      config: {
        id: 'cap-team--w-coding',
        plugins: [
          { id: 'member-w-coding', name: 'dsh-concerto/member', config: {} },
          { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
          { id: 'shell', name: shellPlugin, disabled: false, config: {} },
          { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { read: true, write: true, edit: true } },
          { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: {} },
        ],
      },
    }],
    ['cap-team--w-readonly', {
      config: {
        id: 'cap-team--w-readonly',
        plugins: [
          { id: 'member-w-readonly', name: 'dsh-concerto/member', config: {} },
          { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
          { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { read: true, write: false, edit: false } },
          { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: {} },
        ],
      },
    }],
    ['cap-team--w-none', {
      config: { id: 'cap-team--w-none', plugins: [{ id: 'member-w-none', name: 'dsh-concerto/member', config: {} }] },
    }],
  ])

  const h = createHarness({
    root,
    runtimePath: join(root, 'runtime.sqlite'),
    team,
    definitions,
    toolSchemasByAgent: (agent) => agent?.id ? [{ name: 'read' }, { name: 'write' }, { name: 'edit' }, { name: 'glob' }, { name: 'grep' }, { name: process.platform === 'win32' ? 'pwsh' : 'bash' }] : [],
  })
  t.after(() => h.dispose())

  // Launch team session into a Desktop workspace cleanly!
  const launched = await h.request('/concerto/teams/launch', { teamId: 'cap-team', cwd: workDir })
  assert.equal(launched.status, 200)
  assert.equal(launched.value.ok, true)
  const cmdSid = launched.value.sessionId
  assert.ok(launched.value.workspaceId)
  assert.equal(h.attachedLog.some((x) => x.sessionId === cmdSid && x.workspaceId === launched.value.workspaceId), true)

  const runsRes = await h.request('/concerto/runs')
  assert.equal(runsRes.status, 200)
  assert.equal(runsRes.value.runs[0].teamSessionId, launched.value.teamSessionId)

  const status = await h.callTool('get_team_status', cmdSid)
  assert.equal(status.planGate.status, 'awaiting_plan')
  assert.equal(status.cwd, workDir)
  assert.ok(Array.isArray(status.memberCapabilities))
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-coding').verificationStatus, 'verified')
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-unreloaded').verificationStatus, 'preset_unreloaded')
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-none').coordinatorOnly, true)

  const planRevision = await approveFixturePlan(h.callTool, h.request, cmdSid)
  await h.callTool('submit_decision', cmdSid, {
    decisionId: 'd-write',
    expectedPlanRevision: planRevision,
    action: 'create_task',
    payload: { title: 'Modify code file', objective: 'Edit app.js and run tests', acceptance: ['tests pass'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })

  const snapshot = async () => (await h.request(`/concerto/session?sessionId=${cmdSid}`)).value.snapshot
  const originalRevision = (await snapshot()).planRevision
  for (const [memberId, reason] of [
    ['w-unreloaded', /preset_unreloaded/],
    ['w-none', /仅协调/],
    ['w-readonly', /只读权限/],
    ['w-unavailable', /连接器.*未注册/],
  ]) {
    const input = { taskId: 'task-1', commandId: `dispatch-${memberId}`, memberId }
    const send = async () => {
      if (memberId !== 'w-readonly') return h.callTool('dispatch_task', cmdSid, input)
      const response = await h.request('/concerto/tasks/dispatch', { ...input, sessionId: cmdSid, callerKind: 'ui' })
      assert.equal(response.status, 412)
      return response.value
    }
    const refused = await send()
    assert.equal(refused.ok, false)
    assert.equal(refused.code, 'capability_mismatch')
    assert.equal(refused.state, 'blocked')
    assert.match(refused.detail, reason)
    assert.deepEqual(await send(), { ...refused, replayed: true })
    let snap = await snapshot()
    assert.equal(snap.planRevision, originalRevision)
    assert.equal(snap.executions.length, 0)
    assert.equal(snap.tasks[0].attempt, 0)
    assert.equal(snap.tasks[0].blockedReason, refused.detail)
    assert.equal(snap.attention.find((item) => item.kind === 'blocked' && item.taskId === input.taskId)?.detail, refused.detail)
    assert.equal(h.sessions.size, 1)
    const events = snap.events.filter((event) => event.type === 'task.blocked' && event.payload.commandId === input.commandId)
    assert.equal(events.length, 1)
    assert.equal(events[0].payload.memberId, memberId)
    assert.equal(events[0].actor.kind, memberId === 'w-readonly' ? 'ui' : 'model')
    const reopened = createTeamRuntime({ statePath: h.runtimePath }).getStatus(launched.value.teamSessionId)
    assert.equal(reopened.tasks[0].blockedReason, refused.detail)
    assert.equal(reopened.tasks[0].state, 'blocked')

    const resolved = await h.request('/concerto/tasks/unblock', {
      sessionId: cmdSid, taskId: 'task-1', commandId: `unblock-${memberId}`,
      expectedUpdatedAt: snap.tasks[0].updatedAt, reason: 'Choose a member with verified capabilities',
    })
    assert.equal(resolved.value.state, 'pending')
    assert.equal((await send()).replayed, true)
    snap = await snapshot()
    assert.equal(snap.tasks[0].state, 'pending')
    assert.equal(snap.tasks[0].blockedReason, null)
  }

  // Coding member succeeds via model dispatch_task without passing cwd (inherits session cwd!), recording callId provenance!
  const okDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding' }, 'call-model-dispatch')
  assert.equal(okDisp.ok, true)
  const replayDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding' }, 'call-model-dispatch')
  assert.equal(replayDisp.replayed, true)
  const conflictDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding', sandbox: 'workspace-write' })
  assert.equal(conflictDisp.code, 'idempotency_conflict')
  const eventCount = (await snapshot()).events.filter((event) => event.type === 'task.blocked').length
  const lateMismatch = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'late-mismatch', memberId: 'w-readonly' })
  assert.equal(lateMismatch.ok, false)
  assert.equal((await snapshot()).events.filter((event) => event.type === 'task.blocked').length, eventCount)

  await new Promise((r) => setTimeout(r, 20))
  const snap = (await h.request(`/concerto/session?sessionId=${cmdSid}`)).value.snapshot
  assert.equal(snap.executions[0].dispatchedBy.kind, 'model')
  assert.equal(snap.executions[0].dispatchedBy.callId, 'call-model-dispatch')
  assert.ok(snap.events.some((ev) => ev.type === 'execution.dispatched' && ev.payload?.dispatchedBy?.kind === 'model'))
})

test('desktop project continuation reopens the current run and starts one fresh run after closeout', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-project-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const workDir = realpathSync(root)
  writeFileSync(join(workDir, 'proof.txt'), 'The first run delivered this fixture proof.')
  const team = {
    id: 'project-team', name: 'Project team',
    commander: { id: 'c1', source: 'hosted', provider: 'x', model: 'm' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'external', connector: 'codex' }],
  }
  const firstHost = createHarness({ root, team })
  let first, skill, close
  const create = {
    decisionId: 'first-task', action: 'create_task',
    payload: { title: 'First task', objective: 'Keep the proof', acceptance: ['proof exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  }
  try {
    const launched = await firstHost.request('/concerto/teams/launch', { teamId: team.id, cwd: workDir })
    assert.equal(launched.status, 200, JSON.stringify(launched.value))
    first = launched.value
    assert.ok(first.projectId)
    const resumed = await firstHost.request('/concerto/teams/launch', { teamId: team.id, projectId: first.projectId })
    assert.equal(resumed.status, 200)
    assert.equal(resumed.value.resumed, true)
    assert.equal(resumed.value.sessionId, first.sessionId)
    assert.equal(firstHost.sessions.size, 1)

    const planRevision = await approveFixturePlan(firstHost.callTool, firstHost.request, first.sessionId)
    create.expectedPlanRevision = planRevision
    const task = await firstHost.callTool('submit_decision', first.sessionId, create)
    assert.equal(task.ok, true)
    const authoring = await firstHost.callTool('read_skill', first.sessionId, { id: 'project-skill-authoring' })
    assert.equal(authoring.ok, true)
    skill = await firstHost.callTool('publish_project_skill', first.sessionId, {
      id: 'check-proof', title: 'Check proof', description: 'Verify the input against the saved proof.',
      body: 'Run the check and save the output.', sourceRefs: ['proof.txt'], mutationId: 'save-proof',
    })
    assert.equal(skill.ok, true, JSON.stringify(skill))
    close = {
      decisionId: 'close-first', expectedPlanRevision: task.planRevision, action: 'finish_goal',
      payload: { goalId: first.projectId, summary: 'First run accepted', artifactRefs: ['proof.txt'] },
    }
  } finally {
    firstHost.dispose()
  }

  const persisted = createTeamRuntime({ statePath: firstHost.runtimePath })
  const result = persisted.submitResult({ taskId: 'task-1', summary: 'proof checked', checksPassed: true, artifactRefs: ['proof.txt'] }, first.teamSessionId)
  assert.equal(result.state, 'completed', JSON.stringify(result))
  assert.equal(persisted.submit(close, first.teamSessionId).ok, true)

  const starting = Promise.withResolvers()
  const allowCreate = Promise.withResolvers()
  const activations = []
  const host = createHarness({ root, workspaces: firstHost.workspaces, controllerImpl: {
    async create({ workspaceId, cwd, agentPreset }) {
      const sessionId = `after-restart-${host.sessions.size + 1}`
      if (!host.sessions.size) {
        starting.resolve()
        await allowCreate.promise
      }
      const workspace = host.workspaces.find((item) => item.id === workspaceId)
      host.sessions.set(sessionId, { id: sessionId, preset: agentPreset, header: { cwd: workspace?.path ?? cwd } })
      activations.push(await host.callTool('get_team_status', sessionId))
      return { sessionId }
    },
  } })
  t.after(() => host.dispose())

  const list = await host.request('/concerto/runs')
  assert.equal(list.value.projects.length, 1)
  assert.equal(list.value.projects[0].projectId, first.projectId)
  assert.equal(list.value.projects[0].completed, true)
  const invalid = await host.request('/concerto/teams/launch', { teamId: team.id, projectId: 'absent' })
  assert.equal(invalid.status, 404)
  const selection = { teamId: team.id, projectId: first.projectId }
  const launch = host.request('/concerto/teams/launch', selection)
  try {
    assert.equal(await Promise.race([starting.promise.then(() => 'creating'), launch.then(() => 'returned')]), 'creating')
    assert.equal((await host.request('/concerto/teams/launch', selection)).status, 409)
  } finally {
    allowCreate.resolve()
  }
  const { status, value: second } = await launch
  assert.equal(status, 200, JSON.stringify(second))
  assert.equal(second.projectId, first.projectId)
  assert.notEqual(second.teamSessionId, first.teamSessionId)
  assert.equal(second.cwd, workDir)
  assert.equal(activations[0].goalId, first.projectId)
  assert.equal(activations[0].planRevision, close.expectedPlanRevision)
  assert.equal(activations[0].planGate.status, 'awaiting_plan')
  assert.deepEqual(activations[0].tasks, [])

  const inherited = await host.callTool('read_project_skill', second.sessionId, { id: 'check-proof', version: 1 })
  assert.equal(inherited.skill.contentHash, skill.contentHash)
  assert.equal((await host.callTool('submit_decision', second.sessionId, create)).code, 'idempotency_conflict')
  const emptyGoal = await host.callTool('submit_decision', second.sessionId, { ...close, decisionId: 'close-second' })
  assert.equal(emptyGoal.code, 'precondition_failed')
  const next = { ...create, decisionId: 'next-task', expectedPlanRevision: activations[0].planRevision }
  assert.equal((await host.callTool('submit_decision', second.sessionId, next)).code, 'precondition_failed')
  const nextRevision = await approveFixturePlan(host.callTool, host.request, second.sessionId)
  const continued = await host.callTool('submit_decision', second.sessionId, { ...next, expectedPlanRevision: nextRevision })
  assert.equal(continued.result.taskId, 'task-1')
  assert.ok(continued.planRevision > close.expectedPlanRevision)

  const resumed = await host.request('/concerto/teams/launch', selection)
  assert.equal(resumed.value.sessionId, second.sessionId)
  assert.equal(host.sessions.size, 1)
  const fresh = await host.request('/concerto/teams/launch', { teamId: team.id, cwd: workDir })
  assert.equal(fresh.status, 200)
  assert.notEqual(fresh.value.projectId, first.projectId)
  assert.equal((await host.callTool('read_project_skill', fresh.value.sessionId, { id: 'check-proof' })).code, 'not_found')
  const history = await host.request('/concerto/sessions/reveal', { teamSessionId: first.teamSessionId })
  assert.equal(history.value.sessionId, first.sessionId)
  const reloaded = createTeamRuntime({ statePath: host.runtimePath })
  assert.equal(reloaded.readViewObject(first.teamSessionId, { id: 'kickoff-plan', version: 1 }).version, 1)
  assert.deepEqual(reloaded.getTask({ taskId: 'task-1' }, first.teamSessionId).task.result.artifactRefs, ['proof.txt'])
  assert.equal(reloaded.submit(close, first.teamSessionId).replayed, true)
})

test('deleted last team removes its preset on reload and leaves the bound project accessible', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-team-preset-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const team = { id: 'alpha', name: 'Alpha', commander: { id: 'c', source: 'hosted' }, members: [] }
  let installed = true, removalFails = true, removals = 0
  const host = createHarness({ root, team, pluginManager: {
    async listBundles() { return installed ? [{ name: '@local/concerto-teams' }] : [] },
    async removeBundle(name) {
      assert.equal(name, '@local/concerto-teams')
      removals++
      if (removalFails) return { application: 'failed', error: 'bundle in use' }
      installed = false
      return { application: 'applied' }
    },
  } })
  t.after(() => host.dispose())
  const path = '/concerto/teams'
  const launch = await host.request(`${path}/launch`, { teamId: team.id, cwd: root })
  assert.equal(launch.status, 200)
  const { teamSessionId, projectId, sessionId } = launch.value
  const read = await host.request(`${path}?teamId=alpha`)
  const edited = await host.request(path, {
    team: { ...read.value.team, name: 'Renamed' }, expectedConfigVersion: read.value.configVersion, requestId: 'edit',
  })
  assert.equal(edited.value.teamId, team.id)
  assert.equal(edited.value.configVersion, 2)
  const patchPath = join(host.teamsBundleDir, 'cordis.patch.yml')
  assert.match(readFileSync(patchPath, 'utf8'), /Renamed/)
  const deletion = await host.request(path, { teamId: team.id, expectedConfigVersion: 2, requestId: 'remove' }, 'DELETE')
  assert.equal(deletion.value.deleted, true)
  assert.match(readFileSync(patchPath, 'utf8'), /\n\[\]\n$/)
  assert.equal(removals, 0)

  const reload = () => host.request(`${path}/reload`, { expectedHash: deletion.value.generatedHash })
  assert.equal((await reload()).status, 500)
  removalFails = false
  assert.equal((await reload()).value.application, 'applied')
  assert.equal((await reload()).value.application, 'unchanged')
  assert.equal(removals, 2)
  assert.equal((await host.request(`${path}/launch`, { teamId: team.id, cwd: root })).status, 404)
  const continued = await host.request(`${path}/launch`, { teamId: team.id, projectId })
  assert.equal(continued.value.teamSessionId, teamSessionId)
  assert.equal(continued.value.sessionId, sessionId)
  const history = await host.request(`/concerto/status?sessionId=${sessionId}`)
  assert.equal(history.value.metadata.teamName, 'Alpha')
  assert.equal(history.value.metadata.configVersion, 1)
})

test('0.0.6 Step 5: sequential approval requests record sequenceIndex and diffFromPrevious accurately without false duplicate warnings', () => {
  const rt = createTeamRuntime()
  rt.bindSession('cmd', 'run', {
    projectId: 'p1', teamId: 't1', teamName: 'T1', commanderId: 'c1', commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
  })
  rt.submit({
    decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Inspect', objective: 'Run commands and edit file', acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  }, 'run')
  const { executionId } = rt.startExecution('run', 'task-1', { memberId: 'w1', connectorId: 'codex', commandId: 'disp-1', sandbox: 'workspace-write', writeScope: '/repo' })

  rt.recordExecutionEvent('run', 'task-1', {
    type: 'approval.requested', requestId: 'nat-1',
    payload: { method: 'item/commandExecution/requestApproval', command: 'git status', cwd: '/repo', reason: 'Inspect git state', decisionScope: 'single' },
  }, executionId)
  rt.recordExecutionEvent('run', 'task-1', {
    type: 'approval.requested', requestId: 'nat-2',
    payload: { method: 'item/commandExecution/requestApproval', command: 'npm test', cwd: '/repo', reason: 'Run unit tests', decisionScope: 'single' },
  }, executionId)
  rt.recordExecutionEvent('run', 'task-1', {
    type: 'approval.requested', requestId: 'nat-3',
    payload: { method: 'item/fileChange/requestApproval', files: ['src/app.js'], cwd: '/repo', reason: 'Apply patch', decisionScope: 'single' },
  }, executionId)
  rt.recordExecutionEvent('run', 'task-1', {
    type: 'approval.requested', requestId: 'nat-4',
    payload: { method: 'item/fileChange/requestApproval', files: ['src/app.js'], cwd: '/repo', reason: 'Apply patch', decisionScope: 'single' },
  }, executionId)

  const [r1, r2, r3, r4] = rt.getStatus('run').requests
  assert.equal(r1.sequenceIndex, 1)
  assert.equal(r2.sequenceIndex, 2)
  assert.ok(Array.isArray(r2.diffFromPrevious) && r2.diffFromPrevious.includes('命令不同'))
  assert.equal(r2.duplicateOfRequestId, undefined)

  assert.equal(r3.sequenceIndex, 3)
  assert.ok(Array.isArray(r3.diffFromPrevious) && r3.diffFromPrevious.includes('方法不同'))
  assert.ok(r3.diffFromPrevious.includes('文件范围不同'))
  assert.equal(r3.duplicateOfRequestId, undefined)

  assert.equal(r4.sequenceIndex, 4)
  assert.equal(r4.duplicateOfRequestId, r3.requestId)
})

test('0.0.6 Step 1b: Codex reconcile inspects same-boot exited PID and never guesses stopped without threadId', async () => {
  const adapter = createCodexAdapter({ bin: process.execPath })
  const noProof = await adapter.reconcile({ backend: 'codex', pid: 999999 }, { sameHostBoot: false })
  assert.equal(noProof.confirmedStopped, false)

  const sameBootDeadPid = await adapter.reconcile({ backend: 'codex', pid: 99999999, threadId: 'thr-1' }, { sameHostBoot: true })
  assert.equal(sameBootDeadPid.checked, true)
  assert.equal(sameBootDeadPid.confirmedStopped, true)
  assert.equal(sameBootDeadPid.evidence.kind, 'codex_reconcile_stopped')

  const liveSelfPid = await adapter.reconcile({ backend: 'codex', pid: process.pid, threadId: 'thr-live' }, { sameHostBoot: true })
  assert.equal(liveSelfPid.checked, true)
  assert.equal(liveSelfPid.confirmedStopped, false)
})

test('0.0.6 Fix #3: lock errors diagnose blocker, Git worktree bypasses locked source repo, and force_release unblocks cross-reboot orphans', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-fix3-'))
  const workDir = join(root, 'plain-workspace')
  const gitRepo = join(root, 'git-workspace')
  mkdirSync(workDir, { recursive: true })
  mkdirSync(gitRepo, { recursive: true })
  execFileSync('git', ['init'], { cwd: gitRepo })
  execFileSync('git', ['config', 'user.email', 'test@concerto.local'], { cwd: gitRepo })
  execFileSync('git', ['config', 'user.name', 'Concerto Test'], { cwd: gitRepo })
  writeFileSync(join(gitRepo, 'README.md'), '# Repo\n', 'utf8')
  execFileSync('git', ['add', 'README.md'], { cwd: gitRepo })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: gitRepo })

  const teamAlpha = {
    id: 'gamma',
    name: 'Gamma Orphan',
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
  }
  const teamGit = {
    id: 'git-team',
    name: 'Git Team',
    commander: { id: 'c2', source: 'hosted' },
    members: [{ id: 'w2', roleKind: 'worker', source: 'hosted' }],
  }
  const store = createTeamStore({ statePath: join(root, 'teams.json') })
  assert.equal(store.saveTeam({ team: teamAlpha }).ok, true)
  assert.equal(store.saveTeam({ team: teamGit }).ok, true)

  const h1 = createHarness({
    root,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h1.sessions.size + 1}`
        h1.sessions.set(sid, { id: sid, preset: agentPreset, header: { cwd } })
        h1.agents.set(sid, { id: sid, status: 'running', whenIdle: () => new Promise(() => {}) })
        return { sessionId: sid }
      },
      async prompt() {},
    },
  })
  h1.sessions.set('cmd-plain', { id: 'cmd-plain', preset: 'gamma', header: { cwd: workDir } })
  assert.equal((await h1.request('/concerto/session?sessionId=cmd-plain')).status, 200)
  const revPlain = await approveFixturePlan(h1.callTool, h1.request, 'cmd-plain')
  await h1.callTool('submit_decision', 'cmd-plain', {
    decisionId: 'd-plain',
    expectedPlanRevision: revPlain,
    action: 'create_task',
    payload: { title: 'Hold plain dir', objective: 'Create file', acceptance: ['done'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dispPlain = await h1.callTool('dispatch_task', 'cmd-plain', { taskId: 'task-1', commandId: 'disp-plain', memberId: 'w1' })
  assert.equal(dispPlain.ok, true)

  h1.sessions.set('cmd-git-hold', { id: 'cmd-git-hold', preset: 'git-team', header: { cwd: gitRepo } })
  assert.equal((await h1.request('/concerto/session?sessionId=cmd-git-hold')).status, 200)
  const revGitHold = await approveFixturePlan(h1.callTool, h1.request, 'cmd-git-hold')
  await h1.callTool('submit_decision', 'cmd-git-hold', {
    decisionId: 'd-githold',
    expectedPlanRevision: revGitHold,
    action: 'create_task',
    payload: { title: 'Hold shared git dir', objective: 'Create file', acceptance: ['done'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dispGitHold = await h1.callTool('dispatch_task', 'cmd-git-hold', {
    taskId: 'task-1', commandId: 'disp-git-hold', memberId: 'w2', worktreeMode: 'shared',
  })
  assert.equal(dispGitHold.ok, true)
  const gitHoldScope = (await h1.request('/concerto/session?sessionId=cmd-git-hold')).value.teamSessionId
  const plainScope = (await h1.request('/concerto/session?sessionId=cmd-plain')).value.teamSessionId
  h1.dispose()

  // Persist cross-reboot running -> becomes unknown with hosted_unconfirmed, then quarantine both via retry_isolated
  const persisted = JSON.parse(readFileSync(join(root, 'runtime.json'), 'utf8'))
  for (const s of persisted.sessions) {
    for (const ex of s.executions) {
      ex.state = 'running'
      ex.nativeSessionRef = { backend: 'hosted', sessionId: `old-${ex.executionId}`, hostBootId: 'prev-boot' }
    }
    for (const tk of s.tasks) tk.state = 'running'
  }
  writeFileSync(join(root, 'runtime.json'), JSON.stringify(persisted))

  const createdWorktrees = []
  const h2 = createHarness({ root })
  t.after(() => {
    for (const wt of createdWorktrees) removeGitWorktree(wt)
    h2.dispose()
    rmSync(root, { recursive: true, force: true })
  })

  const isoDirs = []
  for (const [teamSessionId, executionId] of [[plainScope, dispPlain.executionId], [gitHoldScope, dispGitHold.executionId]]) {
    const iso = await h2.request('/concerto/recovery/adjudicate', {
      teamSessionId,
      taskId: 'task-1',
      executionId,
      commandId: `iso-${executionId}`,
      action: 'retry_isolated',
      reason: 'isolate old boot execution',
      externalEffectsReviewed: true,
    })
    assert.equal(iso.status, 200)
    if (iso.value.retryCwd) isoDirs.push(iso.value.retryCwd)
  }
  t.after(() => { for (const d of isoDirs) rmSync(d, { recursive: true, force: true }) })

  // 1) Dispatch to locked non-Git workDir fails with rich diagnostics pointing to gamma & exact executionId
  h2.sessions.set('cmd-new-plain', { id: 'cmd-new-plain', preset: 'gamma', header: { cwd: workDir } })
  assert.equal((await h2.request('/concerto/session?sessionId=cmd-new-plain')).status, 200)
  const revNewPlain = await approveFixturePlan(h2.callTool, h2.request, 'cmd-new-plain')
  await h2.callTool('submit_decision', 'cmd-new-plain', {
    decisionId: 'd-new-plain',
    expectedPlanRevision: revNewPlain,
    action: 'create_task',
    payload: { title: 'Write in locked plain dir', objective: 'Create txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const blockedPlain = await h2.callTool('dispatch_task', 'cmd-new-plain', { taskId: 'task-1', commandId: 'disp-blocked-plain', memberId: 'w1' })
  assert.equal(blockedPlain.ok, false)
  assert.equal(blockedPlain.code, 'precondition_failed')
  assert.match(blockedPlain.detail, /workspace has an active or unconfirmed execution/)
  assert.match(blockedPlain.detail, new RegExp(`executionId=${dispPlain.executionId}`))
  assert.match(blockedPlain.detail, /quarantined=true/)
  assert.equal(blockedPlain.blockingExecution?.teamId, 'gamma')
  assert.equal(blockedPlain.blockingExecution?.executionId, dispPlain.executionId)
  assert.equal(blockedPlain.blockingExecution?.quarantined, true)

  // 2) Dispatch to clean Git repo with a quarantined source lock succeeds by preparing an isolated tmpdir worktree
  h2.sessions.set('cmd-new-git', { id: 'cmd-new-git', preset: 'git-team', header: { cwd: gitRepo } })
  assert.equal((await h2.request('/concerto/session?sessionId=cmd-new-git')).status, 200)
  const revNewGit = await approveFixturePlan(h2.callTool, h2.request, 'cmd-new-git')
  await h2.callTool('submit_decision', 'cmd-new-git', {
    decisionId: 'd-new-git',
    expectedPlanRevision: revNewGit,
    action: 'create_task',
    payload: { title: 'Write in isolated worktree', objective: 'Create file', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const okGit = await h2.callTool('dispatch_task', 'cmd-new-git', { taskId: 'task-1', commandId: 'disp-ok-git', memberId: 'w2', worktreeMode: 'auto' })
  assert.equal(okGit.ok, true)
  const gitSnap = await h2.callTool('get_team_status', 'cmd-new-git')
  const gitExec = gitSnap.executions.find((e) => e.executionId === okGit.executionId)
  assert.ok(gitExec?.worktree?.path)
  assert.equal(scopesOverlap(gitRepo, gitExec.worktree.path), false)
  createdWorktrees.push(gitExec.worktree)

  // 3) confirm_failed stays strict, force_release rejects missing risk checkbox and hosted_active, then succeeds on hosted_unconfirmed
  const denyConfirm = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: plainScope, taskId: 'task-1', executionId: dispPlain.executionId, commandId: 'cf-1', action: 'confirm_failed', reason: 'still strict',
  })
  assert.equal(denyConfirm.status, 412)

  const denyMissingAck = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: plainScope, taskId: 'task-1', executionId: dispPlain.executionId, commandId: 'fr-noack', action: 'force_release', reason: 'no checkbox',
  })
  assert.equal(denyMissingAck.status, 412)

  h2.agents.set(`old-${dispPlain.executionId}`, { id: `old-${dispPlain.executionId}`, status: 'running', whenIdle: () => new Promise(() => {}) })
  const denyActive = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: plainScope, taskId: 'task-1', executionId: dispPlain.executionId, commandId: 'fr-active',
    action: 'force_release', confirmUnverifiedRelease: true, reason: 'try while active',
  })
  assert.equal(denyActive.status, 412)
  h2.agents.delete(`old-${dispPlain.executionId}`)

  const forced = await h2.request('/concerto/recovery/adjudicate', {
    teamSessionId: plainScope, taskId: 'task-1', executionId: dispPlain.executionId, commandId: 'fr-ok',
    action: 'force_release', confirmUnverifiedRelease: true, reason: 'user accepted concurrency risk after reboot',
  })
  assert.equal(forced.status, 200)
  assert.equal(forced.value.ok, true)
  assert.equal(forced.value.executionState, 'stopped')
  assert.equal(forced.value.forcedUnverified, true)

  const unblockedPlain = await h2.callTool('dispatch_task', 'cmd-new-plain', { taskId: 'task-1', commandId: 'disp-after-force', memberId: 'w1' })
  assert.equal(unblockedPlain.ok, true)
})

test('0.0.6 Fix #4: external Codex write tasks default sandbox to workspace-write while read-only tasks and reviewers stay read-only', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-ext-sandbox-'))
  const dirWrite = join(root, 'w')
  const dirExplicitRo = join(root, 'explicit-ro')
  const dirReadTask = join(root, 'ro-task')
  for (const d of [dirWrite, dirExplicitRo, dirReadTask]) mkdirSync(d, { recursive: true })

  const statePath = join(root, 'teams.json')
  const teamsBundleDir = join(root, 'bundle')
  const team = {
    id: 'ext-codex-team',
    name: 'External Codex Team',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w-codex', roleKind: 'worker', source: 'external', connector: 'codex' },
      { id: 'r-codex', roleKind: 'reviewer', source: 'external', connector: 'codex' },
    ],
  }
  assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)

  const sessions = new Map()
  const routes = new Map()
  const tools = new Map()
  const cleanups = []
  const ctx = {
    logger: { error() {}, warn() {} },
    sessions: { get: (id) => sessions.get(id), list: async () => [...sessions.values()] },
    agents: { get: () => null, list: async () => [] },
    agentPresets: { presetForSession: (s) => s?.preset ?? null },
    sessionController: { async create() { return { sessionId: 'unused' } }, async prompt() {} },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register(def) { tools.set(def.name, def); return () => {} }, get: (n) => tools.get(n) },
  }
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir, codexBin: join(root, 'missing-codex.exe'), codexCwd: '' })
  t.after(async () => {
    for (const c of cleanups) if (typeof c === 'function') c()
    await new Promise((r) => setTimeout(r, 40))
    rmSync(root, { recursive: true, force: true })
  })

  async function req(path, body) {
    const reqStream = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
    Object.assign(reqStream, { method: body !== undefined ? 'POST' : 'GET', url: path, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(reqStream, { writeHead(c) { status = c }, end(txt) { value = txt ? JSON.parse(txt) : null } })
    return { status, value }
  }
  const call = (name, sid, args = {}) => tools.get(name).execute(args, { callId: `c-${Math.random().toString(16).slice(2)}`, agent: { id: sid, session: sessions.get(sid) } })

  // Run 1: write task without explicit sandbox -> defaults to workspace-write (approvals: ask)
  sessions.set('cmd-w', { id: 'cmd-w', preset: team.id, header: { cwd: dirWrite } })
  assert.equal((await req('/concerto/session?sessionId=cmd-w')).status, 200)
  const revW = await approveFixturePlan(call, req, 'cmd-w')
  await call('submit_decision', 'cmd-w', {
    decisionId: 'dw', expectedPlanRevision: revW, action: 'create_task',
    payload: { title: '创建 test.txt', objective: '在 cwd 下创建并写入 test.txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dWrite = await call('dispatch_task', 'cmd-w', { taskId: 'task-1', commandId: 'cw', memberId: 'w-codex' })
  assert.equal(dWrite.ok, true)
  const snapWrite = await call('get_team_status', 'cmd-w')
  const exWrite = snapWrite.executions.find((e) => e.executionId === dWrite.executionId)
  const dispEventWrite = snapWrite.events.find((e) => e.type === 'execution.dispatched' && e.executionId === dWrite.executionId)
  assert.equal(exWrite.sandbox, 'workspace-write')
  assert.equal(dispEventWrite.payload.approvals, 'ask')

  // Run 2: explicit sandbox: 'read-only' overrides default even on a write task
  sessions.set('cmd-ero', { id: 'cmd-ero', preset: team.id, header: { cwd: dirExplicitRo } })
  assert.equal((await req('/concerto/session?sessionId=cmd-ero')).status, 200)
  const revE = await approveFixturePlan(call, req, 'cmd-ero')
  await call('submit_decision', 'cmd-ero', {
    decisionId: 'de', expectedPlanRevision: revE, action: 'create_task',
    payload: { title: 'Write something', objective: 'Modify files in workspace', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dExplicit = await call('dispatch_task', 'cmd-ero', { taskId: 'task-1', commandId: 'ce', memberId: 'w-codex', sandbox: 'read-only' })
  assert.equal(dExplicit.ok, true)
  assert.equal((await call('get_team_status', 'cmd-ero')).executions.find((e) => e.executionId === dExplicit.executionId).sandbox, 'read-only')

  // Run 3: read-only task & reviewer remain read-only when sandbox omitted
  sessions.set('cmd-ro', { id: 'cmd-ro', preset: team.id, header: { cwd: dirReadTask } })
  assert.equal((await req('/concerto/session?sessionId=cmd-ro')).status, 200)
  const revR = await approveFixturePlan(call, req, 'cmd-ro')
  await call('submit_decision', 'cmd-ro', {
    decisionId: 'dr', expectedPlanRevision: revR, action: 'create_task',
    payload: { title: 'Inspect docs', objective: 'Read README and summarize contents', acceptance: ['summary'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dRead = await call('dispatch_task', 'cmd-ro', { taskId: 'task-1', commandId: 'cr', memberId: 'w-codex' })
  assert.equal(dRead.ok, true)
  assert.equal((await call('get_team_status', 'cmd-ro')).executions.find((e) => e.executionId === dRead.executionId).sandbox, 'read-only')
})

test('same commander session can continue with new plans and tasks after finish_goal', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-same-session-cont-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const workDir = realpathSync(root)
  writeFileSync(join(workDir, 'test.txt'), 'first file')
  writeFileSync(join(workDir, 'test2.txt'), 'second file')
  const team = {
    id: 'cont-team', name: 'Continue Team',
    commander: { id: 'c1', source: 'hosted', provider: 'x', model: 'm' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'external', connector: 'codex' }],
  }
  const host = createHarness({ root, team })
  t.after(() => host.dispose())

  const launched = await host.request('/concerto/teams/launch', { teamId: team.id, cwd: workDir })
  assert.equal(launched.status, 200, JSON.stringify(launched.value))
  const sid = launched.value.sessionId
  const firstRunId = launched.value.teamSessionId
  const projectId = launched.value.projectId

  // Goal 1: approve plan, create & complete task-1, finish_goal
  const rev1 = await approveFixturePlan(host.callTool, host.request, sid)
  const t1 = await host.callTool('submit_decision', sid, {
    decisionId: 'd-t1', expectedPlanRevision: rev1, action: 'create_task',
    payload: { title: 'Write test.txt', objective: 'Create test.txt', acceptance: ['test.txt exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  assert.equal(t1.ok, true)
  host.dispose()
  const persisted1 = createTeamRuntime({ statePath: host.runtimePath })
  assert.equal(persisted1.submitResult({ taskId: 'task-1', summary: 'wrote test.txt', checksPassed: true, artifactRefs: ['test.txt'] }, firstRunId).state, 'completed')
  const fin1 = persisted1.submit({
    decisionId: 'd-fin1', expectedPlanRevision: t1.planRevision, action: 'finish_goal',
    payload: { goalId: projectId, summary: 'Goal 1 finished', artifactRefs: ['test.txt'] },
  }, firstRunId)
  assert.equal(fin1.ok, true)

  // Reopen host with the SAME commander session still open
  const host2 = createHarness({ root, team, workspaces: host.workspaces })
  t.after(() => host2.dispose())
  host2.sessions.set(sid, { id: sid, preset: team.id, header: { cwd: workDir } })

  // Before continuing, status shows completed goal 1
  const beforeCont = await host2.callTool('get_team_status', sid)
  assert.equal(beforeCont.goalCompletion?.state, 'completed')

  // User asks for a second file in the SAME session: Commander updates kickoff-plan (v1 -> v2) and proposes it
  const plan2 = await host2.callTool('publish_view_object', sid, {
    id: 'kickoff-plan', expectedVersion: 1, type: 'checklist', title: '创建 test2.txt 计划',
    data: { items: [{ label: '创建 test2.txt', checked: false }] },
  })
  assert.equal(plan2.ok, true, JSON.stringify(plan2))
  assert.equal(plan2.version, 2)

  const prop2 = await host2.callTool('submit_decision', sid, {
    decisionId: 'd-prop2', expectedPlanRevision: beforeCont.planRevision, action: 'propose_plan',
    payload: { planId: 'kickoff-plan', planVersion: 2 },
  })
  assert.equal(prop2.ok, true, JSON.stringify(prop2))
  assert.equal(prop2.continuedFromRun, firstRunId)
  assert.ok(prop2.teamSessionId && prop2.teamSessionId !== firstRunId)

  // Session info immediately points to the new active run with pending plan v2
  const sess2 = await host2.request(`/concerto/session?sessionId=${encodeURIComponent(sid)}`)
  assert.equal(sess2.status, 200)
  assert.equal(sess2.value.teamSessionId, prop2.teamSessionId)
  assert.equal(sess2.value.snapshot.goalCompletion, null)
  assert.equal(sess2.value.snapshot.planGate?.status, 'pending')
  assert.equal(sess2.value.snapshot.planGate?.planRef?.version, 2)

  // User approves plan v2 and Commander creates task for goal 2
  const approved2 = await host2.request('/concerto/runs/approve-plan', {
    sessionId: sid, proposalId: prop2.result.proposalId, commandId: 'approve-plan-2',
  })
  assert.equal(approved2.status, 200, JSON.stringify(approved2.value))
  const t2 = await host2.callTool('submit_decision', sid, {
    decisionId: 'd-t2', expectedPlanRevision: prop2.planRevision, action: 'create_task',
    payload: { title: 'Write test2.txt', objective: 'Create test2.txt', acceptance: ['test2.txt exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  assert.equal(t2.ok, true, JSON.stringify(t2))

  // Verify run 1 audit record is preserved untouched while run 2 is active in the same project
  const reloaded = createTeamRuntime({ statePath: host2.runtimePath })
  assert.equal(reloaded.getStatus(firstRunId).goalCompletion?.summary, 'Goal 1 finished')
  assert.equal(reloaded.getStatus(prop2.teamSessionId).goalCompletion, null)
  assert.equal(reloaded.getStatus(prop2.teamSessionId).tasks.length, 1)
  assert.equal(reloaded.getBinding(sid).teamSessionId, prop2.teamSessionId)

  // Complete goal 2 and verify a 3rd continuation (starting with create_task) rotates cleanly instead of "goal is already complete"
  host2.dispose()
  const persisted2 = createTeamRuntime({ statePath: host2.runtimePath })
  assert.equal(persisted2.submitResult({ taskId: 'task-1', summary: 'wrote test2.txt', checksPassed: true, artifactRefs: ['test2.txt'] }, prop2.teamSessionId).state, 'completed')
  assert.equal(persisted2.submit({
    decisionId: 'd-fin2', expectedPlanRevision: t2.planRevision, action: 'finish_goal',
    payload: { goalId: projectId, summary: 'Goal 2 finished', artifactRefs: ['test2.txt'] },
  }, prop2.teamSessionId).ok, true)

  const host3 = createHarness({ root, team, workspaces: host.workspaces })
  t.after(() => host3.dispose())
  host3.sessions.set(sid, { id: sid, preset: team.id, header: { cwd: workDir } })
  const directCreate3 = await host3.callTool('submit_decision', sid, {
    decisionId: 'd-t3', expectedPlanRevision: t2.planRevision, action: 'create_task',
    payload: { title: 'Write test3.txt', objective: 'Create test3.txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  assert.equal(directCreate3.ok, false)
  assert.doesNotMatch(String(directCreate3.detail), /goal is already complete/i)
  const after3 = await host3.callTool('get_team_status', sid)
  assert.equal(after3.goalCompletion, null)
  assert.notEqual(createTeamRuntime({ statePath: host3.runtimePath }).getBinding(sid).teamSessionId, prop2.teamSessionId)
})


