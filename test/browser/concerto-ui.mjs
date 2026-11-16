import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import { createTeamRuntime } from '../../packages/dsh-concerto/lib/team_runtime.mjs'

const rt = createTeamRuntime()
const meta = { projectId: 'project-preview', teamId: 'preview', teamName: 'Concerto · 开发团队', configVersion: 1,
  commanderId: 'commander', commander: { id: 'commander', source: 'hosted' }, members: [
    { id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' },
    { id: 'reviewer', source: 'hosted', roleKind: 'reviewer' },
  ] }
rt.bindSession('preview', 'run-preview', meta)
rt.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: {
  title: '接通团队执行时间线', objective: '让用户准确看到成员当前任务与待办', acceptance: ['状态与实际执行一致'], constraints: [], dependsOn: [], assigneeRole: 'worker',
} }, 'run-preview')
const executionId = rt.startExecution('run-preview', 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
rt.reportProgress({ taskId: 'task-1', note: '已完成事件身份绑定，正在验证审批往返。' }, 'run-preview')
rt.recordExecutionEvent('run-preview', 'task-1', { type: 'approval.requested', requestId: '7', payload: {
  command: 'npm test', cwd: 'F:/CodingFolder/Concerto', reason: '运行项目测试以验证事件持久化与状态刷新。',
} }, executionId)
let reads = 0, offline = false
const root = resolve('.test-data/presentation-003')
await mkdir(root, {recursive:true})
const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')
const html = `<!doctype html><meta charset="utf-8"><style>
body{
  --dsw-alias-bg-base:#ffffff;
  --dsw-alias-bg-layer-1:#f9fafb;
  --dsw-alias-bg-layer-2:#f5f7fa;
  --dsw-alias-bg-module-platform:#f5f6f7;
  --dsw-alias-label-primary:#0f1115;
  --dsw-alias-label-secondary:#61666b;
  --dsw-alias-label-tertiary:#81858c;
  --dsw-alias-border-l2:#dce1e8;
  --dsw-alias-brand-primary:#0f1115;
  --dsw-alias-state-business-primary:#4176e6;
  --dsw-alias-state-business-tertiary:#e4edfd;
  --dsw-font-family:system-ui,sans-serif;
  --dsh-content-font-size:14px;
  --dsh-content-font-size-secondary:13px;
  font:14px/1.6 system-ui;
  background:repeating-linear-gradient(45deg,#182337 0px,#182337 30px,#89592b 30px,#89592b 60px);
  color:white;margin:32px
}
body[data-ds-dark-theme]{
  --dsw-alias-bg-base:#151517;
  --dsw-alias-bg-layer-1:#232324;
  --dsw-alias-bg-layer-2:#2c2c2e;
  --dsw-alias-bg-module-platform:#353638;
  --dsw-alias-label-primary:#f9fafb;
  --dsw-alias-label-secondary:#cfd3d6;
  --dsw-alias-label-tertiary:#adb2b8;
  --dsw-alias-border-l2:rgba(255,255,255,0.12);
  --dsw-alias-brand-primary:#f9fafb;
  --dsw-alias-state-business-primary:#7aaaff;
  --dsw-alias-state-business-tertiary:#34415b;
}
button,select,textarea{font:inherit}button:focus-visible,summary:focus-visible{outline:2px solid #4176e6;outline-offset:2px}h3{margin:18px 0 4px}#dock{position:fixed;bottom:20px;left:24px;right:24px}#card{max-width:480px}
</style><h2>团队协作视图 · 独立浏览器验证</h2><p>使用当前客户端代码与真实 Runtime 生成的测试数据；不连接实际 DSH 会话。</p><div id="card"></div><div id="dock"></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
const components={};window.__ModuleLoader__={load({factory}){factory(name=>({'react':React,'react-dom':ReactDOM}[name])).apply({effect(){},slots:{inject(name,fn){fn()},register(spec,component){components[spec.key||spec.name]=component}}})}};
await import('/client.js');
ReactDOMClient.createRoot(document.getElementById('dock')).render(React.createElement(components['conversation.composer.dock'],{sessionId:'preview'}));
ReactDOMClient.createRoot(document.getElementById('card')).render(React.createElement(components['get_task'],{toolName:'get_task',callId:'call-preview',phase:'result',block:{content:[{type:'text',text:JSON.stringify({ok:true,task:{taskId:'task-1',state:'running'}})}]}}));
</script>`
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html) }
    if (url.pathname === '/concerto/session') {
      reads++
      if (offline) { req.socket.destroy(); return }
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ ok: true, roleKind: 'commander', ...meta, snapshot: rt.getStatus('run-preview') }))
    }
    if (url.pathname === '/concerto/requests/respond') {
      let body = ''; for await (const part of req) body += part
      const input = JSON.parse(body)
      assert.equal(input.answer.decision, 'decline')
      const out = rt.decideRequest('run-preview', input, { kind: 'user', id: 'preview-owner' })
      assert.equal(out.ok, true)
      rt.delivery('run-preview', input.requestId, true)
      res.setHeader('content-type', 'application/json'); return res.end('{"ok":true}')
    }
    const paths = { '/host-runtime.js': reactRoot + '/host-runtime.js', '/vendor-BUMdD3V7.js': reactRoot + '/vendor-BUMdD3V7.js', '/client.js': resolve('packages/dsh-concerto/lib/client.js') }
    if (!paths[url.pathname]) { res.writeHead(404); return res.end() }
    res.setHeader('content-type', 'text/javascript'); res.end(await readFile(paths[url.pathname]))
  } catch (error) { res.writeHead(500); res.end(error.message) }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('button', { name: /开发团队.*团队/ }).click()
  await page.getByRole('button', { name: '拒绝', exact: true }).waitFor()
  const surface = page.getByRole('region', { name: 'Concerto 团队运行面板' })
  // Host light theme & typography sync on panel & tool card
  assert.equal(await surface.evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(245, 247, 250)')
  assert.equal(await surface.evaluate(el=>getComputedStyle(el).fontSize), '14px')
  const toolCard = page.locator('.concerto-tool-card')
  assert.equal(await toolCard.evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(249, 250, 251)')

  // Toggle DSH dark theme, font size (18px), and font family on body -> all surfaces sync live
  await page.evaluate(() => {
    document.body.setAttribute('data-ds-dark-theme', '')
    document.body.style.setProperty('--dsh-content-font-size', '18px')
    document.body.style.setProperty('--dsw-font-family', '"Courier New", monospace')
  })
  assert.equal(await surface.evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(44, 44, 46)')
  assert.equal(await surface.evaluate(el=>getComputedStyle(el).fontSize), '18px')
  assert.match(await surface.evaluate(el=>getComputedStyle(el).fontFamily), /Courier New/)
  assert.equal(await toolCard.evaluate(el=>getComputedStyle(el).backgroundColor), 'rgb(35, 35, 36)')

  assert.equal(await page.locator('.concerto-dock .concerto-sprite').count(), 0)
  assert.equal(await surface.locator('.concerto-sprite').count(), 3)
  await page.screenshot({ path: root + '/team-panel.png', fullPage: true })
  await page.getByRole('button', { name: '拒绝', exact: true }).click()
  await page.getByText('1 个执行 · 0 项待处理', { exact: true }).waitFor()
  const previousSync = await page.getByText(/^最后同步/).textContent()
  offline = true
  await page.getByText('连接中断 · 显示上次状态', { exact: true }).waitFor()
  assert.ok(reads >= 3)
  assert.equal(await page.getByText(/^最后同步/).textContent(), previousSync)
  assert.equal(await page.getByText('接通团队执行时间线', {exact:true}).count(), 1)
  offline = false
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await page.getByText('1 个执行 · 0 项待处理', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('region', { name: 'Concerto 团队运行面板' }).count(), 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /开发团队.*团队/ }).click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: root + '/team-panel-narrow.png', fullPage: true })
  await page.emulateMedia({reducedMotion:'reduce'})
  assert.equal(await surface.locator('.concerto-sprite svg').first().evaluate(el=>getComputedStyle(el).animationName),'none')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ status: 'PASS', checks: ['React render', 'toolview durable result', 'approval rejection', 'polling', 'offline recovery', 'Escape close', '390px overflow', 'opaque surface', 'member sprites', 'reduced motion'], reads, errors }))
} finally { await browser?.close(); server.close() }
