import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { buildTeamBundleFiles } from '../packages/dsh-concerto/lib/team_bundle.mjs'
import { createCodexAdapter } from '../packages/dsh-concerto/lib/connector/codex-adapter.mjs'
import { scopesOverlap } from '../packages/dsh-concerto/lib/workspace_scope.mjs'

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
  team,
  definitions = null,
  workspaces = [],
  controllerImpl = null,
  toolSchemasByAgent = null,
} = {}) {
  const statePath = join(root, 'teams.json')
  const runtimePath = join(root, 'runtime.json')
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

  async function request(path, body) {
    const req = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
    Object.assign(req, {
      method: body !== undefined ? 'POST' : 'GET',
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

  await h1.callTool('submit_decision', 'cmd-old', {
    decisionId: 'd1',
    expectedPlanRevision: 1,
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

test('0.0.6 Step 2 & 3: dispatch_task provenance, capability verification, mismatch refusal without fallback', async () => {
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
    team,
    definitions,
    toolSchemasByAgent: (agent) => agent?.id ? [{ name: 'read' }, { name: 'write' }, { name: 'edit' }, { name: 'glob' }, { name: 'grep' }, { name: process.platform === 'win32' ? 'pwsh' : 'bash' }] : [],
  })

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
  assert.equal(status.cwd, workDir)
  assert.ok(Array.isArray(status.memberCapabilities))
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-coding').verificationStatus, 'verified')
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-unreloaded').verificationStatus, 'preset_unreloaded')
  assert.equal(status.memberCapabilities.find((c) => c.memberId === 'w-none').coordinatorOnly, true)

  await h.callTool('submit_decision', cmdSid, {
    decisionId: 'd-write',
    expectedPlanRevision: 1,
    action: 'create_task',
    payload: { title: 'Modify code file', objective: 'Edit app.js and run tests', acceptance: ['tests pass'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })

  // Unreloaded preset MUST be rejected with capability_mismatch (no silent fallback!)
  const failUnreloaded = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-unrel', memberId: 'w-unreloaded' })
  assert.equal(failUnreloaded.ok, false)
  assert.equal(failUnreloaded.code, 'capability_mismatch')

  // Coordinator-only member MUST be rejected
  const failNone = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-none', memberId: 'w-none' })
  assert.equal(failNone.ok, false)
  assert.equal(failNone.code, 'capability_mismatch')

  // Readonly member on write/modify task MUST be rejected unless explicitly read-only
  const failRo = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-ro', memberId: 'w-readonly' })
  assert.equal(failRo.ok, false)
  assert.equal(failRo.code, 'capability_mismatch')

  // Coding member succeeds via model dispatch_task without passing cwd (inherits session cwd!), recording callId provenance!
  const okDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding' }, 'call-model-dispatch')
  assert.equal(okDisp.ok, true)
  const replayDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding' }, 'call-model-dispatch')
  assert.equal(replayDisp.replayed, true)
  const conflictDisp = await h.callTool('dispatch_task', cmdSid, { taskId: 'task-1', commandId: 'd-code', memberId: 'w-coding', sandbox: 'workspace-write' })
  assert.equal(conflictDisp.code, 'idempotency_conflict')

  await new Promise((r) => setTimeout(r, 20))
  const snap = (await h.request(`/concerto/session?sessionId=${cmdSid}`)).value.snapshot
  assert.equal(snap.executions[0].dispatchedBy.kind, 'model')
  assert.equal(snap.executions[0].dispatchedBy.callId, 'call-model-dispatch')
  assert.ok(snap.events.some((ev) => ev.type === 'execution.dispatched' && ev.payload?.dispatchedBy?.kind === 'model'))

  h.dispose()
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

