// Lead-run acceptance only. Uses an already enabled local CDP session; never starts/restarts DSH.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
if (!process.env.DSH_CDP_URL || !process.env.DSH_PAGE_URL) throw new Error('DSH_CDP_URL and exact DSH_PAGE_URL required')
const browser = await chromium.connectOverCDP(process.env.DSH_CDP_URL)
let page
const match = '**/concerto/session?*'
const interrupt = route => route.abort('internetdisconnected')
try {
  page = browser.contexts().flatMap(context=>context.pages()).find(page=>page.url()===process.env.DSH_PAGE_URL)
  assert.ok(page, 'specified DSH page must already be open on a managed team session')
  const panel = page.getByRole('region',{name:'Concerto 团队运行面板'})
  if (!await panel.isVisible()) await page.getByRole('button',{name:/ · 团队$/}).click()
  const sync = await page.getByText(/^最后同步/).textContent()
  const tasks = await panel.locator('article').allTextContents()
  await page.route(match, interrupt)
  await page.getByRole('button',{name:'刷新',exact:true}).click()
  await page.getByText('连接中断 · 显示上次状态',{exact:true}).waitFor()
  assert.equal(await page.getByText(/^最后同步/).textContent(),sync)
  assert.deepEqual(await panel.locator('article').allTextContents(),tasks)
  await page.unroute(match,interrupt)
  await page.getByRole('button',{name:'刷新',exact:true}).click()
  await page.getByText('连接中断 · 显示上次状态',{exact:true}).waitFor({state:'hidden'})
  console.log(JSON.stringify({status:'PASS',checks:['snapshot retained on transport failure','offline banner','recovery'],scope:'Concerto polling route only; model/backend network left intact'}))
} finally {
  if (page) await page.unroute(match,interrupt)
  await browser.close() // Detach the CDP client, do not close a page/context or stop the host.
}
