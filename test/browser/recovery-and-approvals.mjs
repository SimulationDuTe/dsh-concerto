import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { approveFixturePlan } from '../fixtures/approve-plan.mjs'
import { registerHooks } from 'node:module'
import { Readable } from 'node:stream'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import { createTeamStore } from '../../packages/dsh-concerto/lib/team_store.mjs'

const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@deepseek-ai/schemastery') {
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent('const z = new Proxy(() => z, { get: () => z }); export default z') }
  }
  return next(specifier, context)
} })
const { apply } = await import('../../packages/dsh-concerto/lib/index.js')
hook.deregister()

const root = mkdtempSync(join(tmpdir(), 'concerto-browser-006-'))
const workDir = join(root, 'workspace')
await mkdir(workDir, { recursive: true })
const statePath = join(root, 'teams.json')
const runtimePath = join(root, 'runtime.json')
const teamsBundleDir = join(root, 'bundle')

const team = {
  id: 'alpha-team',
  name: 'Alpha Team',
  commander: { id: 'c1', source: 'hosted', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
  members: [
    { id: 'coder', roleKind: 'worker', source: 'hosted', toolProfile: 'coding', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
    { id: 'ext-codex', roleKind: 'worker', source: 'external', connector: 'codex' },
  ],
}
assert.equal(createTeamStore({ statePath }).saveTeam({ team }).ok, true)

const sessions = new Map()
const agents = new Map()
const routes = new Map()
const tools = new Map()
const cleanups = []
const workspaces = []
const shellPlugin = process.platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash'
const definitions = new Map([
  ['alpha-team', { config: { id: 'alpha-team', plugins: [{ id: 'c1', name: 'dsh-concerto/member', config: {} }] } }],
  ['alpha-team--coder', {
    config: {
      id: 'alpha-team--coder',
      plugins: [
        { id: 'm1', name: 'dsh-concerto/member', config: {} },
        { id: 'inst', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
        { id: 'sh', name: shellPlugin, disabled: false, config: {} },
        { id: 'fs', name: '@deepseek-ai/dsh-tool-fs', config: { read: true, write: true, edit: true } },
        { id: 'search', name: '@deepseek-ai/dsh-tool-fs-search', config: {} },
      ],
    },
  }],
])

let workerGate
const ctx = {
  logger: { error() {}, warn() {} },
  sessions: { get: (id) => sessions.get(id) },
  agents: { get: (id) => agents.get(id) },
  agentPresets: { presetForSession: (s) => s?.preset ?? null, definitions },
  workspaceRegistry: {
    list: () => workspaces,
    get: (id) => workspaces.find((w) => w.id === id),
    async create(dirPath) {
      const existing = workspaces.find((w) => w.path === dirPath)
      if (existing) return existing
      const ws = { id: `ws-${workspaces.length + 1}`, path: dirPath, sessionIds: [], async attachSession(sid) { ws.sessionIds.push(sid) } }
      workspaces.push(ws)
      return ws
    },
  },
  sessionController: {
    async create({ workspaceId, cwd, agentPreset }) {
      const sid = agentPreset.includes('--') ? 'hosted-worker-live' : 'cmd-live'
      const resolved = workspaceId ? workspaces.find((w) => w.id === workspaceId)?.path : cwd
      sessions.set(sid, { id: sid, preset: agentPreset, header: resolved ? { cwd: resolved } : {} })
      agents.set(sid, { id: sid, status: 'running', whenIdle: () => new Promise((r) => { workerGate = r }) })
      if (workspaceId) await workspaces.find((w) => w.id === workspaceId)?.attachSession?.(sid)
      return { sessionId: sid }
    },
    async prompt() {},
  },
  get(name) { return this[name] },
  effect(fn) { cleanups.push(fn()) },
  webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
  tools: { register(def) { tools.set(def.name, def); return () => {} }, get: (n) => tools.get(n), schemas: () => [] },
}

apply(ctx, { statePath, runtimePath, teamsBundleDir, codexCwd: workDir })

// Create run, create 2 tasks, simulate 1 orphan unknown execution & 2 sequential approvals on another execution
const cmdSession = { id: 'cmd-orphan-source', preset: 'alpha-team', header: { cwd: workDir } }
sessions.set('cmd-orphan-source', cmdSession)

async function callRoute(pathname, method = 'GET', rawBody = '') {
  const req = Readable.from(rawBody ? [rawBody] : [])
  Object.assign(req, {
    method,
    url: pathname,
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json' },
  })
  let status = 200
  let headers = { 'content-type': 'application/json' }
  let body = ''
  await routes.get(pathname.split('?')[0])(req, {
    writeHead(code, h) { status = code; if (h) headers = { ...headers, ...h } },
    end(txt) { body = txt ? txt.toString() : '' },
  })
  return { status, headers, body }
}

const callTool = (name, sessionId, args = {}) => tools.get(name).execute(args, {
  callId: name, agent: { id: sessionId, session: sessions.get(sessionId) },
})
const request = async (path, input) => {
  const response = await callRoute(path, 'POST', JSON.stringify(input))
  return { status: response.status, value: JSON.parse(response.body) }
}

await callRoute('/concerto/session?sessionId=cmd-orphan-source')
const orphanRevision = await approveFixturePlan(callTool, request, 'cmd-orphan-source')
await tools.get('submit_decision').execute({
  decisionId: 'd-1', expectedPlanRevision: orphanRevision, action: 'create_task',
  payload: { title: 'Orphaned Task', objective: 'Modify a file', acceptance: ['done'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
}, { callId: 'c1', agent: { id: 'cmd-orphan-source', session: cmdSession } })
const d1 = await tools.get('dispatch_task').execute({ taskId: 'task-1', commandId: 'cmd-d1', memberId: 'coder' }, { callId: 'c2', agent: { id: 'cmd-orphan-source', session: cmdSession } })
assert.equal(d1.ok, true)
await new Promise((r) => setTimeout(r, 20))
// Simulate host reboot: orphan runtime & dropped live sessions/agents!
for (const c of cleanups) if (typeof c === 'function') c()
cleanups.length = 0
if (workerGate) workerGate()
const rtJson = JSON.parse(await readFile(runtimePath, 'utf8'))
rtJson.sessions[0].executions[0].state = 'unknown'
rtJson.sessions[0].executions[0].unknownReason = '宿主重启中断，未确认停止'
rtJson.sessions[0].tasks[0].state = 'running'
rtJson.sessions[0].tasks[0].needsAdjudication = true
const { writeFileSync } = await import('node:fs')
writeFileSync(runtimePath, JSON.stringify(rtJson))
sessions.clear()
agents.clear()
routes.clear()
tools.clear()
apply(ctx, { statePath, runtimePath, teamsBundleDir, codexCwd: workDir })

// Also prepare an interactive run with sequential approval events via launchTeamSession + fake approvals
const launchRes = JSON.parse((await callRoute('/concerto/teams/launch', 'POST', JSON.stringify({ teamId: 'alpha-team', cwd: workDir }))).body)
assert.equal(launchRes.ok, true)
const liveCmdId = launchRes.sessionId
const liveCmdSession = sessions.get(liveCmdId)
const liveRevision = await approveFixturePlan(callTool, request, liveCmdId)
await tools.get('submit_decision').execute({
  decisionId: 'd-live', expectedPlanRevision: liveRevision, action: 'create_task',
  payload: { title: 'Inspect diffs', objective: 'Run commands', acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
}, { callId: 'c-live', agent: { id: liveCmdId, session: liveCmdSession } })

const { createTeamRuntime } = await import('../../packages/dsh-concerto/lib/team_runtime.mjs')
const rtVerify = createTeamRuntime()
rtVerify.bindSession('seq-cmd', 'run-seq', {
  ...team, teamId: team.id, commanderId: team.commander.id, reviewPolicy: { requiresReview: false, version: 'fixture@1' },
})
assert.equal(rtVerify.submit({
  decisionId: 's-1', expectedPlanRevision: 1, action: 'create_task',
  payload: { title: 'Approval Diff Verification', objective: 'Run git status then npm test', acceptance: ['pass'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
}, 'run-seq').ok, true)
const seqStart = rtVerify.startExecution('run-seq', 'task-1', { memberId: 'ext-codex', connectorId: 'codex', commandId: 'seq-d1', sandbox: 'workspace-write', writeScope: workDir })
assert.equal(seqStart.ok, true, JSON.stringify(seqStart))
const seqExec = seqStart.executionId
rtVerify.recordExecutionEvent('run-seq', 'task-1', {
  type: 'approval.requested', requestId: 'a-1',
  payload: { method: 'item/commandExecution/requestApproval', command: 'git status', cwd: workDir, reason: 'Inspect repo' },
}, seqExec)
rtVerify.recordExecutionEvent('run-seq', 'task-1', {
  type: 'approval.requested', requestId: 'a-2',
  payload: { method: 'item/commandExecution/requestApproval', command: 'npm test', cwd: workDir, reason: 'Run tests' },
}, seqExec)
rtVerify.recordExecutionEvent('run-seq', 'task-1', {
  type: 'approval.requested', requestId: 'a-3',
  payload: { method: 'item/commandExecution/requestApproval', command: 'npm test', cwd: workDir, reason: 'Run tests' },
}, seqExec)
rtVerify.recordExecutionEvent('run-seq', 'task-1', {
  type: 'question.requested', requestId: 'q-1', responseMode: 'next_turn',
  payload: { questions: [{ id: 'format', question: 'Which output format?' }] },
}, seqExec)

const actionCwd = mkdtempSync(join(root, 'action-workspace-'))
for (const [decisionId, title, expectedPlanRevision] of [
  ['s-2', 'Task to unblock', 2],
  ['s-3', 'Verified unknown delivery', 3],
]) {
  assert.equal(rtVerify.submit({
    decisionId, expectedPlanRevision, action: 'create_task',
    payload: { title, objective: 'Verify task actions', acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  }, 'run-seq').ok, true)
}

const adjudications = []

const outDir = resolve('.test-data/acceptance-006-browser')
await mkdir(outDir, { recursive: true })
const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')

const html = `<!doctype html><meta charset="utf-8"><style>
body{--dsw-alias-bg-base:#151517;--dsw-alias-bg-layer-1:#232324;--dsw-alias-bg-layer-2:#2c2c2e;--dsw-alias-bg-layer-3:#353638;--dsw-alias-label-primary:#f9fafb;--dsw-alias-label-secondary:#cfd3d6;--dsw-alias-label-tertiary:#adb2b8;--dsw-alias-border-l2:rgba(255,255,255,0.14);--dsw-alias-border-l3:rgba(255,255,255,0.22);--dsw-alias-brand-primary:#f9fafb;--dsw-alias-state-business-primary:#7aaaff;--dsw-alias-state-business-tertiary:#34415b;--dsw-alias-state-success-primary:#22c55e;--dsw-alias-state-warn-primary:#f59e0b;--dsw-alias-state-error-primary:#f25a5a;--dsw-alias-state-done-primary:#a78bfa;--dsh-content-font-size:14px;font:14px/1.6 system-ui;background:#0b1018;color:#f1f5fb;margin:16px}
</style>
<div id="settings-root"></div><hr><div id="team-root"></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
window.__OPENED_SESSIONS__ = [];
const slots = {};
let activeInjectedSlot = null;
window.__ModuleLoader__ = {
  load({factory}) {
    factory(name => ({'react':React,'react-dom':ReactDOM}[name])).apply({
      effect(fn) { return fn(); },
      locale: { register() {} },
      get(serviceName) {
        if (serviceName === 'uiWorkspace') {
          return { openSession(sid) { window.__OPENED_SESSIONS__.push(sid); } };
        }
        return undefined;
      },
      slots: {
        inject(name, fn) {
          activeInjectedSlot = name;
          try { return fn(); } finally { activeInjectedSlot = null; }
        },
        register(spec, component) {
          slots[spec.id || spec.key || spec.name] = component;
          return () => {};
        }
      }
    });
  }
};
await import('/client.js');
ReactDOMClient.createRoot(document.getElementById('settings-root')).render(React.createElement(slots['concerto.section']));
ReactDOMClient.createRoot(document.getElementById('team-root')).render(React.createElement(slots['concerto.team'], { sessionId: 'seq-cmd', openView() {} }));
</script>`

let activeVerifyScope = 'run-seq'

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html) }
    if (url.pathname === '/concerto/session' && url.searchParams.get('sessionId') === 'seq-cmd') {
      const boundScope = activeVerifyScope || rtVerify.getBinding('seq-cmd')?.teamSessionId || 'run-seq'
      const snap = rtVerify.getStatus(boundScope)
      snap.metadata.memberCapabilities = [
        { memberId: 'c1', roleKind: 'commander', source: 'hosted', profile: 'none', coordinatorOnly: true, verificationStatus: 'coordinator_only', actualTools: [] },
        { memberId: 'coder', roleKind: 'worker', source: 'hosted', profile: 'coding', coordinatorOnly: false, verificationStatus: 'verified', liveVerified: true, actualTools: ['read', 'write', 'edit', 'glob', 'grep', 'pwsh'] },
        { memberId: 'ext-codex', roleKind: 'worker', source: 'external', connector: 'codex', verificationStatus: 'connector_registered', actualTools: [] },
      ]
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ ok: true, roleKind: 'commander', ...snap.metadata, snapshot: snap }))
    }
    if (url.pathname === '/concerto/members/activity') {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ ok: true, items: [], hasMore: false, nextBefore: null, backendHistoryMode: 'runtime_only' }))
    }
    if (['/concerto/tasks/cancel', '/concerto/tasks/unblock', '/concerto/tasks/review'].includes(url.pathname)) {
      let body = ''
      for await (const chunk of req) body += chunk
      const input = JSON.parse(body)
      assert.equal(input.sessionId, 'seq-cmd')
      const actor = { kind: 'user', id: 'fixture-owner' }
      const targetScope = activeVerifyScope || 'run-seq'
      let out
      if (url.pathname.endsWith('/cancel')) {
        out = rtVerify.requestCancel(targetScope, input.taskId, actor, input)
      } else if (url.pathname.endsWith('/unblock')) {
        out = rtVerify.unblockTask(targetScope, input, actor)
      } else {
        if (input.verdict === 'fail' && (typeof input.reason !== 'string' || !input.reason.trim())) {
          out = { ok: false, code: 'invalid', detail: 'review fail reason required' }
        } else {
          const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : '用户确认验收通过'
          out = rtVerify.submitReview({ ...input, reason }, targetScope, actor)
        }
      }
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(out))
    }
    if (url.pathname === '/concerto/executions/adjudicate') {
      let body = ''
      for await (const chunk of req) body += chunk
      const input = JSON.parse(body)
      adjudications.push(input)
      const evidence = input.action === 'retry_isolated'
        ? { kind: 'fresh_directory', cwd: mkdtempSync(join(root, 'adjudication-retry-')) }
        : undefined
      const out = rtVerify.adjudicate('run-seq', input, { kind: 'user', id: 'fixture-owner' }, evidence)
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(out))
    }
    if (routes.has(url.pathname)) {
      let body = ''
      for await (const ch of req) body += ch
      const fakeReq = Readable.from(body ? [body] : [])
      Object.assign(fakeReq, {
        method: req.method,
        url: req.url,
        socket: { remoteAddress: '127.0.0.1' },
        headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json' },
      })
      let st = 200, h = {}, out = ''
      await routes.get(url.pathname)(fakeReq, {
        writeHead(c, hdrs) { st = c; if (hdrs) h = hdrs },
        end(txt) { out = txt ? txt.toString() : '' },
      })
      res.writeHead(st, { 'content-type': 'application/json', ...h })
      return res.end(out)
    }
    const paths = {
      '/host-runtime.js': reactRoot + '/host-runtime.js',
      '/vendor-BUMdD3V7.js': reactRoot + '/vendor-BUMdD3V7.js',
      '/client.js': resolve('packages/dsh-concerto/lib/client.js'),
    }
    if (!paths[url.pathname]) { res.writeHead(404); return res.end() }
    res.setHeader('content-type', 'text/javascript; charset=utf-8')
    res.end(await readFile(paths[url.pathname]))
  } catch (err) {
    res.writeHead(500)
    res.end(err.message)
  }
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)

  // 1. Settings -> Recovery panel lists orphaned unknown execution without live commander session
  const recSection = page.locator('[data-concerto-recovery-section="true"]')
  await recSection.locator('[data-concerto-recovery-exec]').waitFor()
  await recSection.getByText('跨重启孤儿').waitFor()
  await recSection.getByRole('button', { name: '核对后端状态' }).click()
  await recSection.getByText(/未确认后端停止（不可释放原工作区）/).waitFor()

  // Confirm_failed without stop proof must be rejected and retain unknown card
  assert.equal(await recSection.locator('textarea').count(), 0, 'recovery must not require a written reason')
  await recSection.getByRole('button', { name: '确认已停止并释放' }).click()
  await page.getByText(/恢复操作被拒绝/).waitFor()
  assert.equal(await recSection.locator('[data-concerto-recovery-exec]').count(), 1)

  // Retry isolated unblocks hosted bounded unknown execution!
  await recSection.locator('input[type="checkbox"]').check()
  await recSection.getByRole('button', { name: '隔离目录恢复' }).click()
  await page.getByText(/已在隔离新目录就绪/).waitFor()
  await recSection.getByText('当前没有需要恢复的 unknown 执行。').waitFor()
  await recSection.getByText(/原工作区仍保留占用/).click()
  await recSection.getByRole('button', { name: '核对后端状态' }).waitFor()

  // 2. Settings -> Launch Desktop team session & uiWorkspace.openSession called
  await page.locator('[data-concerto-launch-team="alpha-team"]').click()
  await page.getByText(/已打开团队会话/).waitFor()
  const opened = await page.evaluate(() => window.__OPENED_SESSIONS__)
  assert.ok(opened.length >= 1)

  // 3. Approval sequence clarity in TeamHome RequestCard (distinct command vs duplicate warning)
  const home = page.locator('[data-concerto-team-view]')
  await home.locator('[data-concerto-tab="tasks"]').click()
  await home.getByRole('button', { name: 'Approval Diff Verification', exact: true }).click()
  await page.getByText('第 1 次审批').waitFor()
  await page.getByText('第 2 次审批').waitFor()
  await page.getByText(/与前次差异：命令不同/).waitFor()
  await page.getByText(/重复警告：与前一次请求签名完全一致/).waitFor()
  const question = page.getByRole('form', { name: '回答 ext-codex 的问题' })
  await question.getByText('本轮结束后，成员将在下一轮收到答复。').waitFor()
  await question.getByRole('textbox', { name: /Which output format/ }).fill('GLB')

  // Team adjudication uses the selected action as its audit note, with no text field.
  assert.equal(rtVerify.settleExecution('run-seq', 'task-1', seqExec, { status: 'unknown' }).ok, true)
  const adjudication = page.getByRole('form', { name: '裁决 task-1', exact: true })
  await adjudication.waitFor()
  assert.equal(await adjudication.locator('textarea, input[type="text"]').count(), 0)
  assert.equal(await adjudication.getByRole('button', { name: '带隔离重试' }).isDisabled(), true)
  await adjudication.getByRole('button', { name: '确认已停止并改派' }).click()
  await page.getByText(/no verified native stop evidence/).waitFor()
  assert.equal(adjudications[0].action, 'confirm_failed')
  assert.equal(adjudications[0].reason, '用户选择：确认执行已停止')
  assert.equal(rtVerify.getStatus('run-seq').executions.find((execution) => execution.executionId === seqExec).state, 'unknown')
  await adjudication.getByRole('checkbox').check()
  await adjudication.getByRole('button', { name: '带隔离重试' }).click()
  await adjudication.waitFor({ state: 'detached' })
  assert.equal(adjudications[1].reason, '用户选择：在隔离工作区重试')
  assert.equal(adjudications[1].externalEffectsReviewed, true)
  assert.equal(rtVerify.getStatus('run-seq').tasks[0].state, 'pending')

  await page.getByRole('button', { name: '取消待派任务' }).click()
  await page.getByRole('button', { name: '取消待派任务' }).waitFor({ state: 'detached' })
  assert.equal(rtVerify.getStatus('run-seq').tasks[0].state, 'cancelled')
  assert.equal(rtVerify.getStatus('run-seq').executions[0].state, 'unknown')
  await page.getByRole('button', { name: '关闭任务详情：Approval Diff Verification' }).click()

  const user = { kind: 'user', id: 'fixture-owner' }
  assert.equal(rtVerify.adjudicate('run-seq', {
    taskId: 'task-1', executionId: seqExec, commandId: 'fixture-stop', action: 'confirm_failed', reason: 'Fixture backend stopped',
  }, user, { kind: 'codex_reconcile_stopped', verified: true }).ok, true)
  const binding = { memberId: 'ext-codex', connectorId: 'codex', writeScope: actionCwd }
  const blocked = rtVerify.startExecution('run-seq', 'task-2', binding)
  assert.equal(blocked.ok, true, JSON.stringify(blocked))
  assert.equal(rtVerify.settleExecution('run-seq', 'task-2', blocked.executionId, { status: 'failed', detail: 'Missing input' }).state, 'blocked')
  await home.getByRole('button', { name: 'Task to unblock', exact: true }).click()
  const unblock = page.getByRole('form', { name: '解除任务阻塞' })
  await unblock.getByRole('textbox', { name: /阻塞解除依据/ }).fill('Input restored')
  await unblock.getByRole('button', { name: '解除阻塞' }).click()
  await unblock.waitFor({ state: 'detached' })
  assert.equal(rtVerify.getStatus('run-seq').tasks[1].state, 'pending')
  await page.getByRole('button', { name: '关闭任务详情：Task to unblock' }).click()

  writeFileSync(join(actionCwd, 'completed.txt'), 'Verified file from this execution')
  const accepted = rtVerify.startExecution('run-seq', 'task-3', binding)
  assert.equal(accepted.ok, true, JSON.stringify(accepted))
  assert.equal(rtVerify.submitResult({
    taskId: 'task-3', executionId: accepted.executionId, checksPassed: true, summary: 'Verified file', artifactRefs: ['completed.txt'],
  }, 'run-seq', { kind: 'member', role: 'worker', id: 'ext-codex' }).state, 'review')
  assert.equal(rtVerify.settleExecution('run-seq', 'task-3', accepted.executionId, { status: 'unknown' }).ok, true)
  await home.getByRole('button', { name: 'Verified unknown delivery', exact: true }).click()
  const recovery = page.getByRole('form', { name: '裁决 task-3' })
  await recovery.getByText(/completed\.txt.*原工作区继续保留占用/).waitFor()
  await recovery.getByRole('button', { name: '接收已验证交付' }).click()
  await recovery.waitFor({ state: 'detached' })
  assert.equal(rtVerify.getStatus('run-seq').tasks[2].state, 'completed')
  assert.equal(rtVerify.getStatus('run-seq').executions.at(-1).state, 'unknown')
  await page.getByRole('button', { name: '关闭任务详情：Verified unknown delivery' }).click()

  // 4. MemberDrawer displays verified hosted capabilities & actualTools
  await home.getByRole('tab', { name: '概览', exact: true }).click()
  await page.locator('[data-concerto-section="roster"]').getByRole('button', { name: /coder/ }).click()
  const drawer = page.locator('dialog.concerto-drawer')
  await drawer.waitFor()
  assert.equal(await drawer.locator('[data-concerto-capability-status="verified"]').count(), 1)
  await drawer.getByText(/编码\+Shell · 已实证/).waitFor()
  await drawer.getByText(/read, write, edit, glob, grep, pwsh/).waitFor()

  await page.screenshot({ path: join(outDir, 'browser-006-verified.png'), fullPage: true })

  // Team profile controls use the local fixture routes rather than the live DSH host.
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'detached' })
  const settings = page.locator('#settings-root')
  const teamRow = settings.locator('[data-concerto-team-row="alpha-team"]')
  const name = settings.getByRole('textbox', { name: '团队名' })
  await teamRow.getByRole('button', { name: '编辑团队 Alpha Team' }).click()
  await settings.getByRole('heading', { name: '编辑团队' }).waitFor()
  assert.equal(await name.inputValue(), 'Alpha Team')
  await name.fill('甲组')
  await settings.getByRole('button', { name: '保存配置' }).click()
  await teamRow.getByText('甲组', { exact: true }).waitFor()
  await teamRow.getByText(/v2/).waitFor()

  await name.fill('本地草稿')
  const update = await page.evaluate(async () => {
    const read = await fetch('/concerto/teams?teamId=alpha-team').then((response) => response.json())
    const response = await fetch('/concerto/teams', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ team: { ...read.team, name: '另一窗口' }, expectedConfigVersion: read.configVersion, requestId: 'team-from-another-window' }),
    })
    return response.status
  })
  assert.equal(update, 200)
  await settings.getByRole('button', { name: '保存配置' }).click()
  await settings.getByText(/团队配置已变化。草稿已保留/).waitFor()
  assert.equal(await name.inputValue(), '本地草稿')
  await teamRow.getByRole('button', { name: '删除团队 另一窗口' }).click()
  const confirmation = page.getByRole('dialog', { name: '删除团队 另一窗口' })
  await confirmation.waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '取消')
  await confirmation.getByRole('button', { name: '取消' }).click()
  await confirmation.waitFor({ state: 'detached' })
  assert.equal(await teamRow.isVisible(), true)
  await teamRow.getByRole('button', { name: '删除团队 另一窗口' }).click()
  await confirmation.getByRole('button', { name: '确认删除' }).click()
  await teamRow.waitFor({ state: 'detached' })
  await settings.getByText(/已删除团队配置/).waitFor()
  const preservedRuns = await page.evaluate(async () => (await fetch('/concerto/runs')).json())
  assert.ok(Array.isArray(preservedRuns?.runs) && preservedRuns.runs.length > 0)

  // Force-release dialog requires risk checkbox before unblocking a quarantined unknown execution
  const forceTrigger = recSection.locator(`[data-concerto-force-release="${d1.executionId}"]`)
  await forceTrigger.waitFor()
  await forceTrigger.click()
  const forceDialog = page.locator('dialog.concerto-force-release-dialog')
  await forceDialog.waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), '取消')
  const forceConfirmBtn = forceDialog.getByRole('button', { name: '确认风险并强制释放' })
  assert.equal(await forceConfirmBtn.isDisabled(), true)
  await forceDialog.locator('input[type="checkbox"]').check()
  assert.equal(await forceConfirmBtn.isDisabled(), false)
  await forceConfirmBtn.click()
  await forceDialog.waitFor({ state: 'detached' })
  await recSection.locator(`[data-concerto-recovery-exec="${d1.executionId}"]`).waitFor({ state: 'detached' })
  await page.getByText(/已按用户风险确认强制解除原工作区占用/).waitFor()
  assert.equal(JSON.parse((await callRoute('/concerto/recovery/unknown')).body).runs.length, 0)

  // Approved plan checklist badge reflects completed goal & ReviewCard optional pass reason
  rtVerify.bindSession('seq-cmd-done', 'run-plan-done', {
    ...team, teamId: team.id, projectId: 'proj-plan-done', commanderId: team.commander.id, requirePlanApproval: true,
    reviewPolicy: { requiresReview: false, version: 'fixture@1' },
  })
  const cmdActor = { kind: 'member', role: 'commander', id: team.commander.id }
  assert.equal(rtVerify.publishViewObject('run-plan-done', {
    id: 'goal-plan', type: 'checklist', title: '实施计划清单', semanticKind: 'blueprint',
    data: { items: [{ id: 's1', label: '完成写入' }] },
  }, cmdActor).ok, true)
  const doneProp = rtVerify.submit({
    decisionId: 'dp-1', expectedPlanRevision: 1, action: 'propose_plan', payload: { planId: 'goal-plan', planVersion: 1 },
  }, 'run-plan-done', cmdActor)
  assert.equal(doneProp.ok, true)
  assert.equal(rtVerify.approvePlan('run-plan-done', { proposalId: doneProp.result.proposalId, commandId: 'app-done' }, user).ok, true)
  const doneTask = rtVerify.submit({
    decisionId: 'dp-2', expectedPlanRevision: doneProp.planRevision, action: 'create_task',
    payload: { title: 'Review card optional pass', objective: 'Deliver file', acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker', requiresReview: false },
  }, 'run-plan-done', cmdActor)
  assert.equal(doneTask.ok, true, JSON.stringify(doneTask))
  const doneCwd = mkdtempSync(join(root, 'plan-done-workspace-'))
  const doneExec = rtVerify.startExecution('run-plan-done', 'task-1', { ...binding, writeScope: doneCwd })
  assert.equal(doneExec.ok, true, JSON.stringify(doneExec))
  writeFileSync(join(doneCwd, 'plan-done.txt'), 'Ready for optional pass check')
  const doneSub = rtVerify.submitResult({
    taskId: 'task-1', executionId: doneExec.executionId, checksPassed: true, summary: 'Ready for review', artifactRefs: ['plan-done.txt'],
  }, 'run-plan-done', { kind: 'member', role: 'worker', id: 'ext-codex' })
  assert.equal(doneSub.state, 'review', JSON.stringify(doneSub))
  assert.equal(rtVerify.settleExecution('run-plan-done', 'task-1', doneExec.executionId, { status: 'completed', text: 'done' }).ok, true)
  activeVerifyScope = 'run-plan-done'
  await home.locator('[data-concerto-tab="tasks"]').click()
  const reviewTaskBtn = home.getByRole('button', { name: 'Review card optional pass', exact: true })
  await reviewTaskBtn.waitFor({ timeout: 6000 })
  await reviewTaskBtn.click()
  const reviewForm = page.getByRole('form', { name: '验收 Review card optional pass', exact: true })
  await reviewForm.waitFor()
  await reviewForm.getByRole('button', { name: '退回重做' }).click()
  await reviewForm.getByText('退回重做时请填写修改原因。').waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'TEXTAREA')
  await reviewForm.getByRole('button', { name: '验收通过' }).click()
  await reviewForm.waitFor({ state: 'detached' })
  assert.equal(rtVerify.getStatus('run-plan-done').tasks[0].state, 'completed')
  assert.equal(rtVerify.getStatus('run-plan-done').tasks[0].review.reason, '用户确认验收通过')
  await page.getByRole('button', { name: '关闭任务详情：Review card optional pass' }).click()
  assert.equal(rtVerify.patchViewObject('run-plan-done', {
    id: 'goal-plan', expectedVersion: 1, op: 'upsert_items', items: [{ id: 's1', label: '完成写入', checked: true }],
  }, cmdActor).ok, true)
  assert.equal(rtVerify.getStatus('run-plan-done').planGate.status, 'approved')
  assert.equal(rtVerify.submit({
    decisionId: 'df-1', expectedPlanRevision: doneTask.planRevision, action: 'finish_goal',
    payload: { goalId: rtVerify.getStatus('run-plan-done').goalId, summary: 'Done' },
  }, 'run-plan-done', cmdActor).ok, true)
  await home.locator('[data-concerto-tab="overview"]').click()
  const planBadge = home.locator('[data-concerto-plan-status="completed"]')
  await planBadge.waitFor({ timeout: 6000 })
  assert.equal((await planBadge.textContent()).trim(), '目标已结项')

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    status: 'PASS',
    checks: ['orphan recovery UI without written reason', 'team adjudication without written reason', 'refuse confirm_failed without proof', 'retry_isolated hosted', 'pending cancellation', 'unblock with reason', 'accept verified delivery while retaining Unknown', 'launch team session + uiWorkspace.openSession', 'approval sequence diff + duplicate warning', 'next-turn question form', 'member capability verification badge', 'versioned team edit and confirmed deletion', 'force release quarantined orphan via modal risk confirmation', 'optional pass review reason & approved plan goal completion badge'],
    errors,
  }))
} finally {
  if (browser) await browser.close()
  for (const c of cleanups) if (typeof c === 'function') c()
  await new Promise((done) => server.close(done))
}
