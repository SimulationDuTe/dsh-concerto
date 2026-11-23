import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import { createTeamRuntime } from '../../packages/dsh-concerto/lib/team_runtime.mjs'

const rt = createTeamRuntime()

const metaScroll = {
  projectId: 'project-hero-scroll',
  teamId: 'concerto-scroll',
  teamName: 'Concerto · 乐团指挥台验证团队',
  objective: '协调多成员完成契约升级与真实可视化验证',
  configVersion: 1,
  commanderId: 'c1',
  commander: { id: 'c1', source: 'hosted' },
  members: [
    { id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' },
    { id: 'w2', source: 'external', connector: 'codex', roleKind: 'worker' },
    { id: 'r1', source: 'hosted', roleKind: 'reviewer' },
  ],
}
rt.bindSession('team-scroll', 'run-scroll', metaScroll)
for (let i = 1; i <= 4; i += 1) {
  rt.submit({
    decisionId: `ds-${i}`,
    expectedPlanRevision: i,
    action: 'create_task',
    payload: {
      title: `滚动回归验证任务 ${i}`,
      objective: `验证长内容区滚动吸顶稳定性 ${i}`,
      acceptance: ['通过'],
      constraints: [],
      dependsOn: [],
      assigneeRole: 'worker',
    },
  }, 'run-scroll')
}
const execScroll = rt.startExecution('run-scroll', 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
rt.recordExecutionEvent('run-scroll', 'task-1', {
  type: 'approval.requested',
  requestId: 'req-scroll-1',
  payload: { command: 'node --test', cwd: 'F:/CodingFolder/Concerto', reason: '验证待处理 Popover 稳定打开' },
}, execScroll)
rt.publishViewObject('run-scroll', {
  id: 'plan',
  type: 'mindmap',
  renderer: 'markmap',
  size: 'l',
  title: '协作思维导图',
  taskId: 'task-1',
  data: {
    markdown: [
      '# 团队主页滚动稳定全景',
      '## 滚动与锚定隔离',
      '- 禁用直接父容器 scroll anchoring',
      '- 粘顶状态增加滞回区',
      '## 焦点避让与可达性',
      '- scroll-margin-block-start 保留焦点可见',
      '- Popover 支持点击开启与 Escape 关闭',
    ].join('\n'),
  },
}, { kind: 'member', id: 'c1', role: 'commander' })
rt.publishViewObject('run-scroll', {
  id: 'data',
  type: 'table',
  size: 'm',
  title: '回归对比表',
  taskId: 'task-1',
  data: {
    columns: ['场景', '视口', '状态'],
    rows: [
      ['宽屏吸顶', '1280px', '稳定'],
      ['窄屏吸顶', '390px', '稳定'],
      ['回顶恢复', '0px', '稳定'],
      ['短容器边界', '动态', '不抖动'],
    ],
  },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.publishViewObject('run-scroll', {
  id: 'chk',
  type: 'checklist',
  size: 'm',
  title: '验收清单',
  taskId: 'task-1',
  data: {
    items: [
      { label: 'Compact 态稳定吸顶不回跳', checked: true },
      { label: '待处理 Popover 点击打开且 Escape 关闭', checked: true },
      { label: '滚回顶部正常恢复展开态', checked: true },
    ],
  },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.updateTeamView('run-scroll', {
  summary: '当前进展：正在验证 Hero 滚动紧凑态吸顶与待处理浮层。\n关键问题：存在待批准请求。\n下一步：完成宽窄屏回归验证。',
  sections: [
    {
      title: '重点产物',
      refs: [
        { type: 'mindmap', id: 'plan', size: 'l' },
        { type: 'table', id: 'data', size: 'm' },
        { type: 'checklist', id: 'chk', size: 'm' },
      ],
    },
  ],
  pinnedRefs: [{ type: 'mindmap', id: 'plan' }],
}, { kind: 'member', id: 'c1', role: 'commander' })

const metaShort = {
  projectId: 'project-hero-short',
  teamId: 'concerto-short',
  teamName: 'Concerto · 短内容边界团队',
  configVersion: 1,
  commanderId: 'c1',
  commander: { id: 'c1', source: 'hosted' },
  members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
}
rt.bindSession('team-short', 'run-short', metaShort)
rt.submit({
  decisionId: 'd-short-1',
  expectedPlanRevision: 1,
  action: 'create_task',
  payload: {
    title: '单行短任务验证',
    objective: '确认短滚动行程不会收起后触发回弹',
    acceptance: ['ok'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
  },
}, 'run-short')
rt.publishViewObject('run-short', {
  id: 'short-chk',
  type: 'checklist',
  size: 'm',
  title: '精简核对',
  taskId: 'task-1',
  data: { items: [{ label: '短容器不抖动', checked: true }] },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.updateTeamView('run-short', {
  summary: '当前进展：短内容验证。\n关键问题：无阻塞。\n下一步：保持展开态。',
  pinnedRefs: [{ type: 'checklist', id: 'short-chk' }],
}, { kind: 'member', id: 'c1', role: 'commander' })

const sessions = {
  'team-scroll': { runId: 'run-scroll', meta: metaScroll },
  'team-short': { runId: 'run-short', meta: metaShort },
}

const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')
const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;height:100%}
body{
  --dsw-alias-bg-base:#151517;
  --dsw-alias-bg-layer-1:#232324;
  --dsw-alias-bg-layer-2:#2c2c2e;
  --dsw-alias-bg-layer-3:#353638;
  --dsw-alias-bg-module-platform:#353638;
  --dsw-alias-label-primary:#f9fafb;
  --dsw-alias-label-secondary:#cfd3d6;
  --dsw-alias-label-tertiary:#adb2b8;
  --dsw-alias-border-l1:rgba(255,255,255,0.08);
  --dsw-alias-border-l2:rgba(255,255,255,0.14);
  --dsw-alias-border-l3:rgba(255,255,255,0.22);
  --dsw-alias-brand-primary:#f9fafb;
  --dsw-alias-state-business-primary:#7aaaff;
  --dsw-alias-state-success-primary:#22c55e;
  --dsw-alias-state-warn-primary:#f59e0b;
  --dsw-alias-state-error-primary:#f25a5a;
  --dsw-alias-state-done-primary:#a78bfa;
  --dsh-content-font-size:14px;
  --dsh-content-font-size-secondary:13px;
  --dsh-code-font-size:11px;
  font:14px/1.6 system-ui;
  background:#0b1018;
  color:#f1f5fb;
}
#view{height:600px;overflow:hidden}
</style>
<div id="view"></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
const slots = {};
const viewRoot = ReactDOMClient.createRoot(document.getElementById('view'));
window.__ModuleLoader__ = {
  load({factory}) {
    factory(name => ({'react':React,'react-dom':ReactDOM}[name])).apply({
      effect(fn) { return fn(); },
      locale: { register() {} },
      slots: {
        inject(name, fn) { return fn(); },
        register(spec, component) { slots[spec.id || spec.key || spec.name] = component; return () => {}; }
      }
    });
  }
};
await import('/client.js');
window.__SET_SESSION__ = (sid) => {
  viewRoot.render(React.createElement(slots['concerto.team'], { sessionId: sid }));
};
window.__SET_SESSION__('team-scroll');
</script>`

const files = {
  '/host-runtime.js': reactRoot + '/host-runtime.js',
  '/vendor-BUMdD3V7.js': reactRoot + '/vendor-BUMdD3V7.js',
  '/client.js': resolve('packages/dsh-concerto/lib/client.js'),
  '/concerto/assets/rough.js': resolve('packages/dsh-concerto/lib/vendor/rough.js'),
  '/concerto/assets/focusgroup.js': resolve('packages/dsh-concerto/lib/vendor/focusgroup.js'),
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204)
      return res.end()
    }
    if (url.pathname === '/') {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      return res.end(html)
    }
    if (url.pathname === '/concerto/session') {
      const sid = url.searchParams.get('sessionId') || ''
      const found = sessions[sid]
      if (!found) {
        res.writeHead(404, { 'content-type': 'application/json' })
        return res.end(JSON.stringify({ ok: false, code: 'not_found' }))
      }
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ ok: true, roleKind: 'commander', ...found.meta, snapshot: rt.getStatus(found.runId) }))
    }
    const target = files[url.pathname]
    if (!target) {
      res.writeHead(404)
      return res.end()
    }
    res.setHeader('content-type', 'text/javascript; charset=utf-8')
    res.end(await readFile(target))
  } catch (err) {
    res.writeHead(500)
    res.end(err.message)
  }
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } })
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  await page.goto(`http://127.0.0.1:${server.address().port}`)

  const home = page.getByRole('region', { name: 'Concerto 团队主页' })
  await home.waitFor()
  assert.equal(await home.getAttribute('data-conversation-composer-overlay'), '')
  await home.locator('[data-concerto-pending-badge="true"]').waitFor()

  // 1. Wide (1280x760) & Narrow (390x760) inside 600px scroll container
  for (const vp of [{ name: 'wide', width: 1280, height: 760 }, { name: 'narrow', width: 390, height: 760 }]) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await home.evaluate(async (el) => {
      el.scrollTop = 0
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    })
    const hero = home.locator('header.concerto-hero')
    await home.locator('header.concerto-hero:not([data-compact="true"])').waitFor()
    const baseline = await home.evaluate(async (el) => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const header = el.querySelector('header.concerto-hero')
      return {
        expandedHeight: header.getBoundingClientRect().height,
        scrollHeight: el.scrollHeight,
      }
    })
    assert.ok(baseline.expandedHeight > 160, `${vp.name}: expected expanded hero height > 160, got ${baseline.expandedHeight}`)
    assert.ok(baseline.scrollHeight > 900, `${vp.name}: expected scrollHeight > 900, got ${baseline.scrollHeight}`)

    await home.evaluate((el) => {
      const header = el.querySelector('header.concerto-hero')
      window.__HERO_FLIPS__ = 0
      let lastCompact = header.getAttribute('data-compact')
      window.__HERO_OBSERVER__?.disconnect()
      window.__HERO_OBSERVER__ = new MutationObserver(() => {
        const next = header.getAttribute('data-compact')
        if (next !== lastCompact) {
          lastCompact = next
          window.__HERO_FLIPS__ += 1
        }
      })
      window.__HERO_OBSERVER__.observe(header, { attributes: true, attributeFilter: ['data-compact'] })
      el.scrollTop = 260
    })

    await home.locator('header.concerto-hero[data-compact="true"]').waitFor()
    await page.waitForTimeout(350)

    const compactState = await home.evaluate((el) => {
      const header = el.querySelector('header.concerto-hero')
      const hRect = header.getBoundingClientRect()
      const cRect = el.getBoundingClientRect()
      const tabbar = header.querySelector('.concerto-compact-tabbar')
      return {
        flips: window.__HERO_FLIPS__,
        compactAttr: header.getAttribute('data-compact'),
        scrollTop: el.scrollTop,
        compactHeight: hRect.height,
        stickyTop: hRect.top,
        containerTop: cRect.top,
        position: getComputedStyle(header).position,
        containerOverflowX: el.scrollWidth - el.clientWidth,
        docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tabbarWidth: tabbar ? tabbar.getBoundingClientRect().width : 0,
      }
    })
    assert.equal(compactState.flips, 1, `${vp.name}: hero oscillated on scroll (${compactState.flips} flips)`)
    assert.equal(compactState.compactAttr, 'true')
    assert.ok(compactState.scrollTop >= 200, `${vp.name}: scroll anchoring pulled scrollTop back to ${compactState.scrollTop}`)
    assert.ok(compactState.compactHeight < baseline.expandedHeight - 80, `${vp.name}: compact height ${compactState.compactHeight} not sufficiently reduced from ${baseline.expandedHeight}`)
    assert.equal(compactState.position, 'sticky')
    assert.ok(compactState.containerOverflowX <= 4, `${vp.name}: container horizontal overflow ${compactState.containerOverflowX}`)
    assert.ok(compactState.docOverflowX <= 4, `${vp.name}: document horizontal overflow ${compactState.docOverflowX}`)
    assert.ok(compactState.tabbarWidth >= 120, `${vp.name}: compact tabbar squished to ${compactState.tabbarWidth}px`)

    await home.evaluate(async (el) => {
      el.scrollTop = 400
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    })
    const pinnedState = await home.evaluate((el) => {
      const header = el.querySelector('header.concerto-hero')
      return {
        stickyTop: header.getBoundingClientRect().top,
        containerTop: el.getBoundingClientRect().top,
        scrollTop: el.scrollTop,
      }
    })
    assert.ok(Math.abs(pinnedState.stickyTop - compactState.stickyTop) <= 1, `${vp.name}: sticky top drifted from ${compactState.stickyTop} to ${pinnedState.stickyTop}`)
    assert.ok(pinnedState.stickyTop >= pinnedState.containerTop && pinnedState.stickyTop <= pinnedState.containerTop + 24, `${vp.name}: sticky top ${pinnedState.stickyTop} outside [${pinnedState.containerTop}, ${pinnedState.containerTop + 24}]`)

    await home.evaluate(async (el) => {
      el.scrollTop = 260
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    })
    await home.locator('[data-concerto-pending-badge="true"]').click()
    const pop = home.locator('[data-concerto-section="attention"]')
    await pop.waitFor()
    assert.equal(await pop.getAttribute('popover'), 'auto')
    assert.equal(await pop.evaluate((el) => el.matches(':popover-open')), true, `${vp.name}: attention popover must be :popover-open in compact mode`)
    assert.equal(await hero.getAttribute('data-compact'), 'true')
    assert.ok((await home.evaluate((el) => el.scrollTop)) >= 200, `${vp.name}: clicking compact badge pulled scrollTop back`)
    await page.keyboard.press('Escape')
    await pop.waitFor({ state: 'detached' })
    assert.equal(await hero.getAttribute('data-compact'), 'true')

    // Hysteresis deadband check: scrolling to 64 keeps compact mode active
    await home.evaluate((el) => { el.scrollTop = 64 })
    await page.waitForTimeout(100)
    assert.equal(await hero.getAttribute('data-compact'), 'true', `${vp.name}: hysteresis failed at scrollTop=64`)
    assert.equal(await page.evaluate(() => window.__HERO_FLIPS__), 1)

    // Scroll back to top: expanded state restores cleanly & pending popover opens/closes
    await home.evaluate((el) => { el.scrollTop = 0 })
    await home.locator('header.concerto-hero:not([data-compact="true"])').waitFor()
    await page.waitForTimeout(100)
    const restored = await home.evaluate((el) => ({
      restoredHeight: el.querySelector('header.concerto-hero').getBoundingClientRect().height,
      flips: window.__HERO_FLIPS__,
    }))
    assert.ok(restored.restoredHeight >= baseline.expandedHeight - 4, `${vp.name}: expanded height ${restored.restoredHeight} did not restore to ${baseline.expandedHeight}`)
    assert.equal(restored.flips, 2, `${vp.name}: expected 2 total flips (collapse + expand), got ${restored.flips}`)
    await home.locator('[data-concerto-pending-badge="true"]').click()
    await pop.waitFor()
    assert.equal(await pop.evaluate((el) => el.matches(':popover-open')), true, `${vp.name}: attention popover must open in expanded state`)
    await page.keyboard.press('Escape')
    await pop.waitFor({ state: 'detached' })
    await page.evaluate(() => { window.__HERO_OBSERVER__?.disconnect() })
  }

  // 2. Focus-not-obscured check in narrow (390x760) compact mode
  await page.setViewportSize({ width: 390, height: 760 })
  await home.evaluate(async (el) => {
    el.scrollTop = 260
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await home.locator('header.concerto-hero[data-compact="true"]').waitFor()
  const focusResult = await home.evaluate(async (el) => {
    const header = el.querySelector('header.concerto-hero')
    const target = el.querySelector('[data-concerto-key-task="task-1"]')
    const heroRect = header.getBoundingClientRect()
    const targetRectBefore = target.getBoundingClientRect()
    // Shift scrollTop so target sits behind the sticky compact header (top < heroRect.bottom)
    el.scrollTop += Math.max(0, targetRectBefore.top - heroRect.bottom + 24)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const beforeTop = target.getBoundingClientRect().top
    const heroBottomBefore = header.getBoundingClientRect().bottom
    target.focus()
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const afterTop = target.getBoundingClientRect().top
    const heroBottomAfter = header.getBoundingClientRect().bottom
    return { beforeTop, heroBottomBefore, afterTop, heroBottomAfter }
  })
  assert.ok(focusResult.beforeTop < focusResult.heroBottomBefore, `expected target to start obscured behind sticky header (${focusResult.beforeTop} < ${focusResult.heroBottomBefore})`)
  assert.ok(focusResult.afterTop >= focusResult.heroBottomAfter - 1, `focused target remained obscured behind sticky header (${focusResult.afterTop} < ${focusResult.heroBottomAfter})`)

  // 3. Short-container non-oscillation check (team-short, 1280x760)
  await page.setViewportSize({ width: 1280, height: 760 })
  await page.evaluate(() => window.__SET_SESSION__('team-short'))
  await home.getByText('单行短任务验证', { exact: true }).waitFor()
  await home.locator('header.concerto-hero:not([data-compact="true"])').waitFor()
  const shortExpandedScrollHeight = await home.evaluate(async (el) => {
    el.scrollTop = 0
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    return el.scrollHeight
  })
  const shortContainerHeight = Math.max(300, shortExpandedScrollHeight - 150)
  await page.evaluate((hPx) => {
    document.getElementById('view').style.height = `${hPx}px`
  }, shortContainerHeight)
  await home.evaluate(async (el) => {
    const header = el.querySelector('header.concerto-hero')
    window.__SHORT_FLIPS__ = 0
    let lastCompact = header.getAttribute('data-compact')
    window.__SHORT_OBSERVER__?.disconnect()
    window.__SHORT_OBSERVER__ = new MutationObserver(() => {
      const next = header.getAttribute('data-compact')
      if (next !== lastCompact) {
        lastCompact = next
        window.__SHORT_FLIPS__ += 1
      }
    })
    window.__SHORT_OBSERVER__.observe(header, { attributes: true, attributeFilter: ['data-compact'] })
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    el.scrollTop = 140
  })
  await page.waitForTimeout(250)
  const shortResult = await home.evaluate((el) => {
    window.__SHORT_OBSERVER__?.disconnect()
    return {
      flips: window.__SHORT_FLIPS__,
      compactAttr: el.querySelector('header.concerto-hero').getAttribute('data-compact'),
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }
  })
  assert.equal(shortResult.flips, 0, `short container unexpectedly flipped compact state (${shortResult.flips} flips)`)
  assert.equal(shortResult.compactAttr, null)
  assert.ok(shortResult.scrollTop >= 120, `short container scrollTop dropped unexpectedly to ${shortResult.scrollTop}`)

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    status: 'PASS',
    checks: [
      'Wide (1280px) & Narrow (390px) 600px scroll container: zero oscillation, stable sticky pinning, readable compact tabbar, horizontal fit',
      'Compact & expanded Attention Popover: real .click() opens :popover-open and Escape dismisses without collapsing scroll',
      'Hysteresis deadband (scrollTop=64) & full expand restore on scrollTop=0',
      'Focus-not-obscured behind sticky compact header at 390px',
      'Short-container scroll range guard avoids collapse-clamp bounce',
    ],
    errors,
  }))
} finally {
  if (browser) await browser.close()
  await new Promise((done) => server.close(done))
}
