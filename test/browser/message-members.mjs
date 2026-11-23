// Lead/DSH executes this script. It does not connect to, install, or restart DSH.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createTeamRuntime } from '../../packages/dsh-concerto/lib/team_runtime.mjs'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const runtime = createTeamRuntime()
const metadata = { teamId:'fixture', teamName:'成员消息验证', commanderId:'c1', commander:{id:'c1',source:'hosted'},
  members:[{id:'w1',source:'hosted',roleKind:'worker'}], configVersion:1 }
runtime.bindSession('commander-session', 'run-fixture', metadata)
runtime.bindSession('worker-session', 'run-fixture', metadata, { memberId:'w1',roleKind:'worker' })
const reads = new Map()
const approvePayloads = []
let offline = false
const output = resolve('.test-data/presentation-004')
await mkdir(output, { recursive:true })
const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')
const html = `<!doctype html><meta charset="utf-8">
<style>
body{font:15px/1.6 system-ui;margin:24px;background:#0e1726;color:#eff7ff}
[data-slot="conversation.chat.flow"]{border:1px solid #435570;padding:16px;margin-bottom:20px}
[data-chat-flow-kind="assistant-step"]{display:flex;gap:12px;margin:12px 0}
.we-avatar{width:40px;height:40px;flex:none;background:#453d6f}
[data-slot="conversation.chat.node"]{display:contents}
[data-slot="conversation.chat.node"]>p{flex:1;min-width:0;margin:0}
.tail{margin:8px 0}
</style>
<h1>真实客户端组件：消息头像与内嵌卡片契约验证</h1>
<div data-slot="conversation.chat.flow" id="commander-flow">
 <div id="a1" data-chat-flow-kind="assistant-step" data-chat-turn="1"><div class="we-avatar">星</div><div data-slot="conversation.chat.node"><p>c1 的历史回复原文</p></div></div>
 <div data-chat-flow-kind="turn-tail" data-chat-turn="1"><div class="tail" id="tail-a1"></div></div>
 <div id="a2" data-chat-flow-kind="assistant-step" data-chat-turn="2"><div class="we-avatar">星</div><div data-slot="conversation.chat.node"><p>c1 的最新回复原文</p></div></div>
 <div data-chat-flow-kind="turn-tail" data-chat-turn="2"><div class="tail" id="tail-a2"></div></div>
</div>
<div data-slot="conversation.chat.flow" id="worker-flow">
 <div id="b1" data-chat-flow-kind="assistant-step" data-chat-turn="1"><div class="we-avatar">星</div><div data-slot="conversation.chat.node"><p>w1 自己会话的回复原文</p></div></div>
 <div data-chat-flow-kind="turn-tail" data-chat-turn="1"><div class="tail" id="tail-b1"></div></div>
</div>
<div id="unmanaged" data-chat-flow-kind="assistant-step" data-chat-turn="1"><div class="we-avatar">原头像</div><p>无关会话不修改</p></div>
<div id="dock"></div>
<div id="tail-plan"></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
const components={}, roots={};
window.__ModuleLoader__={load({factory}){factory(name=>({'react':React,'react-dom':ReactDOM}[name])).apply({effect(){},slots:{inject(name,fn){fn()},register(spec,component){components[spec.key||spec.name]=component}}})}};
await import('/client.js');
window.mountTurn=(id,sessionId,turn)=>{const root=ReactDOMClient.createRoot(document.getElementById(id));roots[id]=root;root.render(React.createElement(components['conversation.chat.turnTail'],{sessionId,turn:{turn,status:'closed'}}))};
window.unmountTurn=id=>roots[id].unmount();
window.mountTurn('tail-a1','commander-session',1);
window.mountTurn('tail-a2','commander-session',2);
window.mountTurn('tail-b1','worker-session',1);
ReactDOMClient.createRoot(document.getElementById('dock')).render(React.createElement(components['conversation.composer.dock'],{sessionId:'commander-session'}));
</script>`
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') { res.setHeader('content-type','text/html; charset=utf-8'); return res.end(html) }
    if (url.pathname === '/concerto/session') {
      const sessionId = url.searchParams.get('sessionId')
      reads.set(sessionId, (reads.get(sessionId) || 0) + 1)
      if (offline && sessionId === 'commander-session') { req.socket.destroy(); return }
      const binding = runtime.getBinding(sessionId)
      res.setHeader('content-type','application/json')
      return res.end(JSON.stringify({ok:true,...binding,...metadata,snapshot:runtime.getStatus(binding.teamSessionId)}))
    }
    if (url.pathname === '/concerto/runs/approve-plan' && req.method === 'POST') {
      const chunks = []
      for await (const ch of req) chunks.push(ch)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      approvePayloads.push(body)
      const binding = runtime.getBinding(body.sessionId)
      const out = runtime.approvePlan(binding.teamSessionId, { proposalId: body.proposalId, commandId: body.commandId }, { kind: 'user', id: 'local-owner' })
      res.setHeader('content-type','application/json')
      return res.end(JSON.stringify(out))
    }
    const paths = {'/client.js':resolve('packages/dsh-concerto/lib/client.js'),'/host-runtime.js':reactRoot+'/host-runtime.js','/vendor-BUMdD3V7.js':reactRoot+'/vendor-BUMdD3V7.js'}
    if (!paths[url.pathname]) { res.writeHead(404); return res.end() }
    res.setHeader('content-type','text/javascript'); res.end(await readFile(paths[url.pathname]))
  } catch(error) { res.writeHead(500); res.end(error.message) }
})
await new Promise(done => server.listen(0,'127.0.0.1',done))
let browser
try {
  browser = await chromium.launch({channel:'msedge',headless:true})
  const page = await browser.newPage({viewport:{width:1280,height:1000}})
  const errors = []; page.on('pageerror',error => errors.push(error.message))
  await page.goto('http://127.0.0.1:'+server.address().port)
  await page.locator('#a2 .concerto-message-avatar button').waitFor()
  await page.locator('#b1 .concerto-message-avatar button').waitFor()
  assert.equal(await page.locator('#a1 .concerto-message-avatar').count(),1)
  assert.match(await page.locator('#a1 .concerto-message-avatar button').getAttribute('aria-label'),/^c1 · 指挥者/)
  assert.match(await page.locator('#b1 .concerto-message-avatar button').getAttribute('aria-label'),/^w1 · 成员/)
  assert.equal(await page.locator('#unmanaged .concerto-message-avatar').count(),0)
  assert.equal(await page.locator('#unmanaged .we-avatar').isVisible(),true)
  assert.equal(await page.locator('#a2 .we-avatar').isVisible(),false)
  assert.equal(await page.locator('#tail-a1 .concerto-turn-card').count(),0)
  assert.equal(await page.locator('#tail-a2 .concerto-turn-card').count(),1)
  assert.equal(await page.locator('#tail-b1 .concerto-turn-card').count(),1)
  assert.equal(await page.locator('.concerto-dock .concerto-sprite').count(),0)
  assert.equal(await page.locator('#a2 [data-slot] > p').textContent(),'c1 的最新回复原文')
  // Three commander consumers share one timer, even across subsequent ticks.
  await page.waitForTimeout(2300)
  assert.ok(reads.get('commander-session') <= 3, 'duplicate polling per footer')
  // Wallpaper remains the owner of its original node, even when updating it.
  await page.evaluate(() => document.querySelector('#a2 .we-avatar').replaceChildren(document.createTextNode('换图')))
  await page.waitForTimeout(100)
  assert.equal(await page.locator('#a2').evaluate(row=>row.firstElementChild.className),'we-avatar')
  assert.equal(await page.locator('#a2 .concerto-message-avatar').count(),1)
  await page.locator('#a1 .concerto-message-avatar button').click()
  await page.locator('#tail-a1 .concerto-turn-card').waitFor()
  assert.match(await page.locator('#tail-a1 .concerto-turn-card').textContent(),/当前状态/)
  // Removing an extension restores the original avatar without changing prose.
  await page.evaluate(() => window.unmountTurn('tail-a1'))
  assert.equal(await page.locator('#a1 .concerto-message-avatar').count(),0)
  assert.equal(await page.locator('#a1 .we-avatar').isVisible(),true)
  assert.equal(await page.locator('#a1').getAttribute('data-concerto-member-row'),null)
  const lastSync = await page.locator('#tail-a2 .concerto-turn-heading small').textContent()
  offline = true
  await page.locator('#tail-a2').getByRole('button',{name:'同步',exact:true}).click()
  await page.locator('#tail-a2').getByText('连接中断 · 显示上次状态',{exact:true}).waitFor()
  assert.equal(await page.locator('#tail-a2 .concerto-turn-heading small').textContent(),lastSync)
  assert.equal(await page.locator('#tail-a2 .concerto-turn-member').count(),2)
  offline = false
  await page.locator('#tail-a2').getByRole('button',{name:'同步',exact:true}).click()
  await page.locator('#tail-a2').getByText('连接中断 · 显示上次状态',{exact:true}).waitFor({state:'detached'})
  await page.screenshot({path:output+'/message-members-fixture.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:output+'/message-members-fixture-narrow.png',fullPage:true})

  await page.setViewportSize({width:1280,height:1000})
  runtime.bindSession('plan-cmd-session', 'run-plan-chat', { ...metadata, requirePlanApproval: true })
  const pub = runtime.publishViewObject('run-plan-chat', {
    id: 'chat-blueprint', type: 'checklist', title: '对话内计划确认', semanticKind: 'blueprint',
    data: { items: [{ label: '确认后即派发任务' }] },
  }, { kind: 'member', role: 'commander', id: 'c1' })
  assert.equal(pub.ok, true)
  const prop = runtime.submit({
    decisionId: 'dec-plan-chat', expectedPlanRevision: 1, action: 'propose_plan',
    payload: { planId: 'chat-blueprint', planVersion: 1 },
  }, 'run-plan-chat', { kind: 'member', role: 'commander', id: 'c1' })
  assert.equal(prop.ok, true)
  await page.evaluate(() => window.mountTurn('tail-plan', 'plan-cmd-session', 1))
  const chatPlanCard = page.locator('#tail-plan [data-concerto-chat-plan-gate="pending"]')
  await chatPlanCard.waitFor()
  await chatPlanCard.getByRole('button', { name: '确认开工 v1' }).click()
  await page.locator('#tail-plan [data-concerto-chat-plan-gate="approved"]').waitFor()
  assert.equal(approvePayloads.length, 1)
  assert.equal(approvePayloads[0].sessionId, 'plan-cmd-session')
  assert.equal(approvePayloads[0].proposalId, prop.result.proposalId)
  assert.equal(runtime.getStatus('run-plan-chat').planGate.status, 'approved')

  assert.deepEqual(errors,[])
  console.log(JSON.stringify({status:'PASS',checks:['member identity','flow isolation','wallpaper ownership','unchanged prose','latest turn only','shared polling','unmount restoration','offline recovery','390px layout','in-chat plan confirmation'],reads:Object.fromEntries(reads),errors}))
} finally { await browser?.close(); server.close() }
