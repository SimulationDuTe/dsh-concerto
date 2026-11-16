import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
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

await callRoute('/concerto/session?sessionId=cmd-orphan-source')
await tools.get('submit_decision').execute({
  decisionId: 'd-1', expectedPlanRevision: 1, action: 'create_task',
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
await tools.get('submit_decision').execute({
  decisionId: 'd-live', expectedPlanRevision: 1, action: 'create_task',
  payload: { title: 'Inspect diffs', objective: 'Run commands', acceptance: ['ok'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
}, { callId: 'c-live', agent: { id: liveCmdId, session: liveCmdSession } })

const { createTeamRuntime } = await import('../../packages/dsh-concerto/lib/team_runtime.mjs')
const rtVerify = createTeamRuntime()
rtVerify.bindSession('seq-cmd', 'run-seq', team)
rtVerify.submit({
  decisionId: 's-1', expectedPlanRevision: 1, action: 'create_task',
  payload: { title: 'Approval Diff Verification', objective: 'Run git status then npm test', acceptance: ['pass'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
}, 'run-seq')
const seqExec = rtVerify.startExecution('run-seq', 'task-1', { memberId: 'ext-codex', connectorId: 'codex', commandId: 'seq-d1', sandbox: 'workspace-write', writeScope: workDir }).executionId
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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html) }
    if (url.pathname === '/concerto/session' && url.searchParams.get('sessionId') === 'seq-cmd') {
      const snap = rtVerify.getStatus('run-seq')
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
  await recSection.locator('textarea').fill('check orphan recovery')
  await recSection.getByRole('button', { name: '确认已停止并释放' }).click()
  await page.getByText(/恢复操作被拒绝/).waitFor()
  assert.equal(await recSection.locator('[data-concerto-recovery-exec]').count(), 1)

  // Retry isolated unblocks hosted bounded unknown execution!
  await recSection.locator('input[type="checkbox"]').check()
  await recSection.getByRole('button', { name: '隔离目录恢复' }).click()
  await page.getByText(/已在隔离新目录就绪/).waitFor()
  await recSection.getByText('当前没有需要恢复的 unknown 执行。').waitFor()

  // 2. Settings -> Launch Desktop team session & uiWorkspace.openSession called
  await page.locator('[data-concerto-launch-team="alpha-team"]').click()
  await page.getByText(/已打开团队会话/).waitFor()
  const opened = await page.evaluate(() => window.__OPENED_SESSIONS__)
  assert.ok(opened.length >= 1)

  // 3. Approval sequence clarity in TeamHome RequestCard (distinct command vs duplicate warning)
  await page.getByText('第 1 次审批').waitFor()
  await page.getByText('第 2 次审批').waitFor()
  await page.getByText(/与前次差异：命令不同/).waitFor()
  await page.getByText(/重复警告：与前一次请求签名完全一致/).waitFor()

  // 4. MemberDrawer displays verified hosted capabilities & actualTools
  await page.locator('[data-concerto-section="roster"]').getByRole('button', { name: /coder/ }).click()
  const drawer = page.getByRole('dialog', { name: 'Concerto 成员详情' })
  await drawer.waitFor()
  assert.equal(await drawer.locator('[data-concerto-capability-status="verified"]').count(), 1)
  await drawer.getByText(/编码\+Shell · 已实证/).waitFor()
  await drawer.getByText(/read, write, edit, glob, grep, pwsh/).waitFor()

  await page.screenshot({ path: join(outDir, 'browser-006-verified.png'), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    status: 'PASS',
    checks: ['orphan recovery UI', 'refuse confirm_failed without proof', 'retry_isolated hosted', 'launch team session + uiWorkspace.openSession', 'approval sequence diff + duplicate warning', 'member capability verification badge'],
    errors,
  }))
} finally {
  if (browser) await browser.close()
  for (const c of cleanups) if (typeof c === 'function') c()
  await new Promise((done) => server.close(done))
}
