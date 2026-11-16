import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import { createTeamRuntime } from '../../packages/dsh-concerto/lib/team_runtime.mjs'
import { compositeOver, contrastRatio, parseCssColor, relativeLuminance } from '../../packages/dsh-concerto/lib/domain/theme_contrast.mjs'

const rt = createTeamRuntime()
const meta = {
  projectId: 'project-theme-glass',
  teamId: 'theme-glass',
  teamName: 'Concerto · 宿主外观跟随验收',
  objective: '验证玻璃材质、蓝色前景强调色、字号/字体继承、极端壁纸对比度及浅色导出',
  configVersion: 1,
  commanderId: 'c1',
  commander: { id: 'c1', source: 'hosted' },
  members: [
    { id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' },
    { id: 'r1', source: 'hosted', roleKind: 'reviewer' },
  ],
}
rt.bindSession('team-theme', 'run-theme', meta)
rt.submit({
  decisionId: 'd1',
  expectedPlanRevision: 1,
  action: 'create_task',
  payload: {
    title: '实现宿主主题与玻璃材质融合',
    objective: '同步主题、强调色与字号',
    acceptance: ['checklist:theme-check 已核验'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
    requiredViews: [{ type: 'checklist', id: 'theme-check', requiredForAcceptance: true }],
  },
}, 'run-theme')
const exec1 = rt.startExecution('run-theme', 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
rt.recordExecutionEvent('run-theme', 'task-1', {
  type: 'output.message',
  text: '已完成 `src/client/styles.js` 令牌替换，详见 mindmap:arch 。',
}, exec1)
rt.publishViewObject('run-theme', {
  id: 'arch',
  type: 'mindmap',
  renderer: 'markmap',
  title: '外观架构导图',
  taskId: 'task-1',
  data: {
    root: {
      id: 'root',
      label: '宿主外观集成',
      children: [
        { id: 'glass', label: '玻璃材质 --dsw-mask-blur', status: 'done' },
        { id: 'accent', label: '强调色 --we-accent', status: 'running' },
      ],
    },
  },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.publishViewObject('run-theme', {
  id: 'preview-html',
  type: 'html',
  renderer: 'sandbox-iframe',
  title: '主题继承 HTML 沙箱卡片',
  taskId: 'task-1',
  data: {
    html: '<div id="box"><h4>沙箱预览卡片</h4><p>正文与 <a href="#ok" id="link">强调色链接</a> <code>codeToken()</code></p></div>',
    css: '#box{border:1px solid var(--border-color);background:var(--bg-layer-2);padding:10px;border-radius:8px}',
  },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.publishViewObject('run-theme', {
  id: 'flow-svg',
  type: 'diagram',
  renderer: 'svg',
  title: '主题导出 SVG 图',
  taskId: 'task-1',
  data: {
    nodes: [
      { id: 'n1', label: '读取令牌', status: 'done' },
      { id: 'n2', label: '对比度检验', status: 'running', critical: true },
    ],
    edges: [{ from: 'n1', to: 'n2', label: '传递', semantic: 'critical' }],
  },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.updateTeamView('run-theme', {
  summary: '当前进展：theme 适配器就绪。\n关键问题：等待极端对比度实测。\n下一步：点击 overview 查看 mindmap:arch 。',
  pinnedRefs: [{ type: 'mindmap', id: 'arch' }, { type: 'html', id: 'preview-html' }, { type: 'diagram', id: 'flow-svg' }],
}, { kind: 'member', id: 'c1', role: 'commander' })

const root = resolve('.test-data/theme-glass-005')
await mkdir(root, { recursive: true })
const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')

const html = `<!doctype html><html data-ds-theme-source="dark"><meta charset="utf-8"><style>
body {
  --dsw-alias-bg-base:#ffffff;
  --dsw-alias-bg-layer-1:#f9fafb;
  --dsw-alias-bg-layer-2:#f5f7fa;
  --dsw-alias-bg-layer-3:#edf0f4;
  --dsw-alias-bg-overlay:#ffffff;
  --dsw-alias-bg-module-platform:#f5f6f7;
  --dsw-alias-label-primary:#0f1115;
  --dsw-alias-label-secondary:#61666b;
  --dsw-alias-label-tertiary:#81858c;
  --dsw-alias-border-l1:rgba(0,0,0,0.06);
  --dsw-alias-border-l2:rgba(0,0,0,0.12);
  --dsw-alias-border-l3:rgba(0,0,0,0.18);
  --dsw-alias-brand-primary:#0f1115;
  --dsw-alias-state-business-primary:#4176e6;
  --dsw-alias-link:#4176e6;
  --dsw-alias-state-success-primary:#22c55e;
  --dsw-alias-state-warn-label:#dd8629;
  --dsw-alias-state-error-primary:#ec1313;
  --dsw-alias-state-done-primary:#7c3aed;
  --dsw-radius-sm:8px; --dsw-radius-md:12px; --dsw-radius-lg:16px;
  --dsw-font-family:system-ui,sans-serif;
  --ds-font-family-code:"Consolas",monospace;
  --dsh-content-font-size:14px;
  --dsh-content-font-size-secondary:13px;
  --dsh-code-font-size:11px;
  --dsw-mask-blur:none;
  margin:16px;
}
body[data-ds-dark-theme] {
  --dsw-alias-bg-base:#151517;
  --dsw-alias-bg-layer-1:#232324;
  --dsw-alias-bg-layer-2:#2c2c2e;
  --dsw-alias-bg-layer-3:#353638;
  --dsw-alias-bg-overlay:#2c2c2e;
  --dsw-alias-bg-module-platform:#353638;
  --dsw-alias-label-primary:#f9fafb;
  --dsw-alias-label-secondary:#cfd3d6;
  --dsw-alias-label-tertiary:#adb2b8;
  --dsw-alias-border-l1:rgba(255,255,255,0.08);
  --dsw-alias-border-l2:rgba(255,255,255,0.14);
  --dsw-alias-border-l3:rgba(255,255,255,0.22);
  --dsw-alias-state-business-primary:#7aaaff;
  --dsw-alias-link:#7aaaff;
}
body[data-we-glass-page="on"] {
  --dsw-alias-bg-base:transparent;
  --dsw-alias-bg-layer-1:color-mix(in srgb, var(--we-readability-base, #0d1524) 12%, color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 17%, transparent));
  --dsw-alias-bg-layer-2:color-mix(in srgb, var(--we-readability-base, #0d1524) 12%, color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 19%, transparent));
  --dsw-alias-bg-overlay:color-mix(in srgb, var(--we-readability-base, #0d1524) 12%, color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 24%, transparent));
  --dsw-alias-bg-module-platform:color-mix(in srgb, var(--we-readability-base, #0d1524) 12%, color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 22%, transparent));
  --dsw-mask-blur:blur(9px) saturate(1.3) brightness(1.04) contrast(1.01);
  --dsw-alias-settings-card-stroke:rgba(255,255,255,0.2);
}
</style>
<div id="home"></div><div id="tool"></div><div id="turn" data-slot="conversation.chat.flow"><div data-chat-turn="1" data-chat-flow-kind="assistant-step"><p>Member step</p></div><div id="turn-anchor"></div></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
const slots = {};
window.__ModuleLoader__ = {
  load({factory}) {
    factory(name => ({'react':React,'react-dom':ReactDOM}[name])).apply({
      effect(fn) { return fn(); },
      locale: { register() {} },
      slots: {
        inject(_name, fn) { return fn(); },
        register(spec, component) { slots[spec.key || spec.id || spec.name] = component; return () => {}; }
      }
    });
  }
};
await import('/client.js');
ReactDOMClient.createRoot(document.getElementById('home')).render(React.createElement(slots['concerto.team'], { sessionId: 'team-theme' }));
ReactDOMClient.createRoot(document.getElementById('tool')).render(React.createElement(slots['get_task'], { callId: 'c-theme', toolName: 'get_task', phase: 'result', block: { content: [{ type: 'text', text: JSON.stringify({ ok: true, task: { taskId: 'task-1', state: 'running' } }) }] } }));
ReactDOMClient.createRoot(document.getElementById('turn-anchor')).render(React.createElement(slots['concerto.turn-team'], { sessionId: 'team-theme', turn: { turn: 1 } }));
</script>`

let latestStandaloneSvg = ''
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html) }
  if (url.pathname === '/__save-markmap-svg' && req.method === 'POST') {
    const chunks = []
    for await (const ch of req) chunks.push(ch)
    latestStandaloneSvg = Buffer.concat(chunks).toString('utf8')
    res.writeHead(204)
    return res.end()
  }
  if (url.pathname === '/standalone-markmap.svg') {
    res.setHeader('content-type', 'image/svg+xml; charset=utf-8')
    return res.end(latestStandaloneSvg)
  }
  if (url.pathname === '/concerto/session') {
    res.setHeader('content-type', 'application/json')
    return res.end(JSON.stringify({ ok: true, roleKind: 'commander', ...meta, snapshot: rt.getStatus('run-theme') }))
  }
  if (url.pathname === '/concerto/members/activity') {
    res.setHeader('content-type', 'application/json')
    return res.end(JSON.stringify({ items: [], hasMore: false, nextBefore: null, backendHistoryMode: 'codex_normalized' }))
  }
  const paths = {
    '/host-runtime.js': reactRoot + '/host-runtime.js',
    '/vendor-BUMdD3V7.js': reactRoot + '/vendor-BUMdD3V7.js',
    '/client.js': resolve('packages/dsh-concerto/lib/client.js'),
    '/concerto/assets/markmap.js': resolve('packages/dsh-concerto/lib/vendor/markmap.js'),
    '/concerto/assets/rough.js': resolve('packages/dsh-concerto/lib/vendor/rough.js'),
  }
  if (!paths[url.pathname]) { res.writeHead(404); return res.end() }
  res.setHeader('content-type', 'text/javascript')
  return res.end(await readFile(paths[url.pathname]))
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))

let browser
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.locator('.concerto-card').first().waitFor()
  await page.locator('.concerto-tool-card').first().waitFor()
  await page.locator('.concerto-turn-card').first().waitFor()

  // 1. Dark solid -> Dark glass + Cyan accent (#67DCE7) -> Solid Light + Purple accent (#9333ea)
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  const solidDarkBlur = await page.locator('.concerto-hero').evaluate((el) => getComputedStyle(el).backdropFilter)
  assert.equal(solidDarkBlur, 'none', 'non-glass theme must have backdropFilter: none')

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-we-wallpaper-underlay', 'rgb(19, 58, 88)')
    document.documentElement.style.setProperty('--we-wallpaper-underlay', 'rgb(19, 58, 88)')
    document.body.setAttribute('data-we-glass-page', 'on')
    document.body.setAttribute('data-we-wallpaper', 'on')
    document.body.style.setProperty('--we-readability-base', '#0d1524')
    document.body.style.setProperty('--we-surface-tint-dark', '#0d1524')
    document.body.style.setProperty('--dsw-alias-state-business-primary', '#67DCE7')
    document.body.style.setProperty('--we-accent', '#67DCE7')
    document.body.style.setProperty('--we-accent-ink', '#0f1115')
    document.body.style.setProperty('--dsw-alias-label-primary', '#ffffff')
    document.body.style.setProperty('--dsw-alias-label-secondary', '#fafafa')
    document.body.style.setProperty('--dsw-alias-label-tertiary', '#75e6f5')
  })
  await page.waitForTimeout(100)
  const glassMetrics = await page.evaluate(() => {
    const hero = document.querySelector('.concerto-hero')
    const card = document.querySelector('.concerto-card')
    const tool = document.querySelector('.concerto-tool-card')
    const tab = document.querySelector('.concerto-tab-btn[aria-selected="true"]')
    const badge = document.querySelector('.concerto-badge')
    return {
      heroBlur: getComputedStyle(hero).backdropFilter,
      cardBlur: getComputedStyle(card).backdropFilter,
      toolBlur: getComputedStyle(tool).backdropFilter,
      cardBg: getComputedStyle(card).backgroundColor,
      tabColor: getComputedStyle(tab).color,
      badgeColor: getComputedStyle(badge).color,
    }
  })
  assert.match(glassMetrics.heroBlur, /blur\(9px\)/, 'hero must receive glass blur when glass ON')
  assert.match(glassMetrics.cardBlur, /blur\(9px\)/, 'cards must receive glass blur when glass ON')
  assert.match(glassMetrics.toolBlur, /blur\(9px\)/, 'tool card must receive glass blur when glass ON')
  assert.match(glassMetrics.tabColor, /103,\s*220,\s*231/, 'active tab uses cyan accent #67DCE7')
  assert.match(glassMetrics.badgeColor, /103,\s*220,\s*231/, 'badge uses cyan accent #67DCE7')

  // 2. Toggle Accent dynamically (#9333ea) + Font sizes (14 -> 18 -> 20px) + Font families
  await page.evaluate(() => {
    document.body.style.setProperty('--dsw-alias-state-business-primary', '#9333ea')
    document.body.style.setProperty('--we-accent', '#9333ea')
    document.body.style.setProperty('--dsh-content-font-size', '20px')
    document.body.style.setProperty('--dsh-content-font-size-secondary', '18px')
    document.body.style.setProperty('--dsh-code-font-size', '15px')
    document.body.style.setProperty('--dsw-font-family', '"Georgia", serif')
    document.body.style.setProperty('--ds-font-family-code', '"Consolas", monospace')
  })
  await page.waitForTimeout(100)
  const fontMetrics = await page.evaluate(() => {
    const team = document.querySelector('.concerto-team-view')
    const captionEl = document.querySelector('.concerto-group-label')
    const badge = document.querySelector('.concerto-badge')
    const idCode = document.querySelector('.concerto-badge.concerto-id')
    return {
      teamFs: getComputedStyle(team).fontSize,
      teamFf: getComputedStyle(team).fontFamily,
      captionFs: Number.parseFloat(getComputedStyle(captionEl).fontSize),
      codeFf: getComputedStyle(idCode).fontFamily,
      badgeColor: getComputedStyle(badge).color,
    }
  })
  assert.equal(fontMetrics.teamFs, '20px')
  assert.match(fontMetrics.teamFf, /Georgia/)
  assert.ok(fontMetrics.captionFs >= 16, `caption font size must scale with 20px host size (got ${fontMetrics.captionFs})`)
  assert.match(fontMetrics.codeFf, /Consolas/)
  assert.doesNotMatch(fontMetrics.badgeColor, /103,\s*220,\s*231/, 'badge accent must update dynamically off old cyan')

  // 3. Verify html-sandbox iframe receives 20px & host font
  const iframeDoc = await page.locator('iframe[sandbox=""]').getAttribute('srcdoc')
  assert.match(iframeDoc, /--font-size:20px/)
  assert.match(iframeDoc, /Georgia/)

  // 4. Extreme Pairing: Dark Theme + Bright Light Wallpaper -> Glass contrast rescue >= 4.5:1
  // Cover card, tool card, drawer, and fullscreen canvas modal uniformly!
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--we-wallpaper-underlay', 'rgb(245, 248, 255)')
    document.body.style.setProperty('--dsw-alias-label-primary', '#ffffff')
  })
  await page.waitForTimeout(120)
  await page.locator('.concerto-sprite').first().click()
  await page.locator('.concerto-drawer').waitFor()
  const darkBaseMetrics = await page.evaluate(() => {
    const snap = (sel) => {
      const el = document.querySelector(sel)
      return el ? { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color } : null
    }
    return {
      card: snap('.concerto-card'),
      toolCard: snap('.concerto-tool-card'),
      drawer: snap('.concerto-drawer'),
    }
  })
  await page.keyboard.press('Escape')
  await page.locator('.concerto-drawer').waitFor({ state: 'detached' })

  await page.locator('[data-concerto-object-id="flow-svg"]').getByRole('button', { name: '展开画布' }).click()
  const flowDarkModal = page.getByRole('dialog', { name: '主题导出 SVG 图' })
  await flowDarkModal.waitFor()
  const darkModalMetrics = await page.evaluate(() => {
    const el = document.querySelector('.concerto-canvas-modal')
    return el ? { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color } : null
  })
  await page.keyboard.press('Escape')
  await flowDarkModal.waitFor({ state: 'detached' })

  const darkBrightBackdrop = parseCssColor('rgb(245, 248, 255)')
  const checkCompositeCr = (m, label) => {
    assert.ok(m && m.bg && m.color, `missing metrics for ${label}`)
    const parsedBg = parseCssColor(m.bg)
    assert.ok(parsedBg.a >= 0.55, `${label} must receive rescued surface alpha instead of raw translucent layer (got a=${parsedBg.a})`)
    const comp = compositeOver(parsedBg, darkBrightBackdrop)
    const cr = contrastRatio(parseCssColor(m.color), comp)
    assert.ok(cr >= 4.5, `${label} Dark+LightWallpaper contrast ${cr.toFixed(2)} < 4.5`)
    return cr
  }
  const darkOnBrightCr = checkCompositeCr(darkBaseMetrics.card, '.concerto-card')
  const darkToolCardCr = checkCompositeCr(darkBaseMetrics.toolCard, '.concerto-tool-card')
  const darkDrawerCr = checkCompositeCr(darkBaseMetrics.drawer, '.concerto-drawer')
  const darkCanvasModalCr = checkCompositeCr(darkModalMetrics, '.concerto-canvas-modal')

  // 5. Extreme Pairing: Light Theme (system switch) + Dark Wallpaper (forced white-on-light collision test) + SVG & Markmap standalone exports
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    document.body.removeAttribute('data-we-glass-page')
    document.body.removeAttribute('data-ds-dark-theme')
    document.documentElement.setAttribute('data-ds-theme-source', 'system')
    document.documentElement.style.setProperty('--we-wallpaper-underlay', 'rgb(19, 58, 88)')
    document.body.style.setProperty('--dsw-mask-blur', 'none')
    document.body.style.setProperty('--dsw-alias-bg-base', '#ffffff')
    document.body.style.setProperty('--dsw-alias-bg-layer-1', '#f9fafb')
    document.body.style.setProperty('--dsw-alias-bg-layer-2', '#f5f7fa')
    document.body.style.setProperty('--dsw-alias-bg-overlay', '#ffffff')
    // Simulate broken host light collision leaving white label on light bg:
    document.body.style.setProperty('--dsw-alias-label-primary', '#ffffff')
    document.body.style.setProperty('--dsw-alias-state-business-primary', '#4176e6')
  })
  await page.waitForTimeout(120)
  await page.locator('.concerto-sprite').first().click()
  await page.locator('.concerto-drawer').waitFor()
  const lightCollisionDom = await page.evaluate(() => {
    const snap = (sel) => {
      const el = document.querySelector(sel)
      return el ? { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, blur: getComputedStyle(el).backdropFilter } : null
    }
    return {
      card: snap('.concerto-card'),
      toolCard: snap('.concerto-tool-card'),
      drawer: snap('.concerto-drawer'),
    }
  })
  await page.keyboard.press('Escape')
  await page.locator('.concerto-drawer').waitFor({ state: 'detached' })

  assert.equal(lightCollisionDom.card.blur, 'none', 'glass OFF returns blur: none on card')
  assert.equal(lightCollisionDom.toolCard.blur, 'none', 'glass OFF returns blur: none on toolCard')
  assert.equal(lightCollisionDom.drawer.blur, 'none', 'glass OFF returns blur: none on drawer')
  const checkOpaqueCr = (m, label) => {
    const cr = contrastRatio(parseCssColor(m.color), parseCssColor(m.bg))
    assert.ok(cr >= 4.5, `${label} Light white-on-light collision must be rescued >= 4.5:1 (got ${cr.toFixed(2)})`)
    return cr
  }
  const lightCr = checkOpaqueCr(lightCollisionDom.card, '.concerto-card')
  const lightToolCr = checkOpaqueCr(lightCollisionDom.toolCard, '.concerto-tool-card')
  const lightDrawerCr = checkOpaqueCr(lightCollisionDom.drawer, '.concerto-drawer')

  // Capture exported SVGs (regular SVG diagram + Markmap standalone SVG) in Light mode
  await page.evaluate(() => {
    window.__SVG_OUT__ = ''
    const orig = URL.createObjectURL
    URL.createObjectURL = (blob) => { blob?.text?.().then((t) => { window.__SVG_OUT__ = t }); return orig(blob) }
  })
  await page.locator('[data-concerto-object-id="flow-svg"]').getByRole('button', { name: '展开画布' }).click()
  const flowLightModal = page.getByRole('dialog', { name: '主题导出 SVG 图' })
  await flowLightModal.waitFor()
  const lightModalMetrics = await page.evaluate(() => {
    const el = document.querySelector('.concerto-canvas-modal')
    return { bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }
  })
  const lightModalCr = checkOpaqueCr(lightModalMetrics, '.concerto-canvas-modal')

  await flowLightModal.getByRole('button', { name: '导出 SVG' }).click()
  await page.waitForFunction(() => window.__SVG_OUT__.length > 80)
  const exportedSvg = await page.evaluate(() => window.__SVG_OUT__)
  assert.doesNotMatch(exportedSvg, /var\(--/, 'exported SVG must resolve all CSS vars')
  const bgMatch = /data-concerto-export-bg="([^"]+)"/.exec(exportedSvg)
  assert.ok(bgMatch, 'exported SVG carries data-concerto-export-bg')
  assert.ok(relativeLuminance(bgMatch[1]) > 0.7, `Light theme export must remain light (L=${relativeLuminance(bgMatch[1])})`)
  await page.getByRole('button', { name: '关闭画布' }).click()
  await flowLightModal.waitFor({ state: 'detached' })

  // 5b. Markmap standalone SVG export check: font-size/font-family must NOT be parsed as color!
  await page.evaluate(() => { window.__SVG_OUT__ = '' })
  await page.locator('[data-concerto-object-id="arch"]').getByRole('button', { name: '展开画布' }).click()
  const mmModal = page.getByRole('dialog', { name: '外观架构导图' })
  await mmModal.waitFor()
  await mmModal.locator('svg g.markmap-node').first().waitFor()
  await page.waitForFunction(() => {
    const fo = document.querySelector('[role="dialog"][aria-label="外观架构导图"] foreignObject')
    return fo && Number.parseFloat(getComputedStyle(fo).opacity) > 0.95
  })
  await mmModal.getByRole('button', { name: '导出 SVG' }).click()
  await page.waitForFunction(() => window.__SVG_OUT__.length > 80)
  const exportedMarkmapSvg = await page.evaluate(() => window.__SVG_OUT__)
  assert.doesNotMatch(exportedMarkmapSvg, /var\(--/, 'exported Markmap SVG must resolve all CSS vars')
  assert.doesNotMatch(exportedMarkmapSvg, /font:\s*rgb\(/, 'Markmap font size var must NOT be misparsed as rgb(...) color')
  assert.match(exportedMarkmapSvg, /font:\s*20px\/1\.45\s*[^;]*Georgia/, 'Markmap <style> must preserve 20px and Georgia font-family')
  await page.evaluate(async (svgText) => {
    await fetch('/__save-markmap-svg', { method: 'POST', body: svgText })
  }, exportedMarkmapSvg)

  const standalonePage = await browser.newPage({ viewport: { width: 960, height: 640 } })
  const standaloneErrors = []
  standalonePage.on('pageerror', (e) => standaloneErrors.push(e.message))
  await standalonePage.goto(`http://127.0.0.1:${server.address().port}/standalone-markmap.svg`)
  await standalonePage.waitForSelector('.markmap-foreign')
  const standaloneCheck = await standalonePage.evaluate(() => {
    const svg = document.documentElement
    const box = svg.getBoundingClientRect()
    const labels = [...document.querySelectorAll('.markmap-foreign')]
    const sample = labels.find((el) => (el.textContent || '').includes('宿主外观集成')) || labels[0]
    const cs = sample ? getComputedStyle(sample) : null
    return {
      rootTag: svg.tagName.toLowerCase(),
      width: box.width,
      height: box.height,
      exportBg: svg.getAttribute('data-concerto-export-bg'),
      textSample: sample?.textContent?.trim() || '',
      fontSize: cs?.fontSize || '',
      fontFamily: cs?.fontFamily || '',
      color: cs?.color || '',
    }
  })
  await standalonePage.close()
  assert.deepEqual(standaloneErrors, [], 'standalone Markmap SVG must have zero errors')
  assert.equal(standaloneCheck.rootTag, 'svg')
  assert.ok(standaloneCheck.width > 100 && standaloneCheck.height > 50, 'standalone Markmap SVG renders non-empty canvas')
  assert.match(standaloneCheck.textSample, /宿主外观集成/, 'Chinese Markmap labels preserved in standalone SVG')
  assert.equal(standaloneCheck.fontSize, '20px', 'standalone Markmap preserves 20px font-size')
  assert.match(standaloneCheck.fontFamily, /Georgia/, 'standalone Markmap preserves Georgia font-family')
  const mmStandaloneCr = contrastRatio(parseCssColor(standaloneCheck.color), parseCssColor(standaloneCheck.exportBg))
  assert.ok(mmStandaloneCr >= 4.5, `standalone Markmap text contrast ${mmStandaloneCr.toFixed(2)} < 4.5`)

  // 6. Narrow 390px zero overflow with 20px font
  await page.getByRole('button', { name: '关闭画布' }).click()
  await page.setViewportSize({ width: 390, height: 822 })
  await page.waitForTimeout(100)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 1, `390px viewport overflowed by ${overflow}px`)

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    status: 'PASS',
    glassMetrics,
    fontMetrics,
    darkOnBrightCr: {
      card: Number(darkOnBrightCr.toFixed(2)),
      toolCard: Number(darkToolCardCr.toFixed(2)),
      drawer: Number(darkDrawerCr.toFixed(2)),
      canvasModal: Number(darkCanvasModalCr.toFixed(2)),
    },
    lightCollisionRescuedCr: {
      card: Number(lightCr.toFixed(2)),
      toolCard: Number(lightToolCr.toFixed(2)),
      drawer: Number(lightDrawerCr.toFixed(2)),
      canvasModal: Number(lightModalCr.toFixed(2)),
    },
    lightExportBg: bgMatch[1],
    markmapStandalone: {
      fontSize: standaloneCheck.fontSize,
      fontFamily: standaloneCheck.fontFamily,
      cr: Number(mmStandaloneCr.toFixed(2)),
      textSample: standaloneCheck.textSample,
    },
    narrow390Overflow: overflow,
    errors,
  }, null, 2))
} finally {
  await browser?.close()
  server.close()
}
