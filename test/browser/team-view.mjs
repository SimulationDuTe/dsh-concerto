import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
import { createTeamRuntime } from '../../packages/dsh-concerto/lib/team_runtime.mjs'
import { mergeAndPaginateActivities } from '../../packages/dsh-concerto/lib/hosted_history.mjs'

const rt = createTeamRuntime()

// Session A: a single task still uses the board, with no forced set of charts.
const metaSimple = {
  projectId: 'project-simple',
  teamId: 'concerto-simple',
  teamName: 'Concerto · 单任务精简团队',
  objective: '完成轻量化接口检查清单即可交付',
  configVersion: 1,
  commanderId: 'c1',
  commander: { id: 'c1', source: 'hosted' },
  members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
}
rt.bindSession('team-simple', 'run-team-simple', metaSimple)
rt.submit({
  decisionId: 's1',
  expectedPlanRevision: 1,
  action: 'create_task',
  payload: {
    title: '核对登录态 Cookie 选项',
    objective: '确认 SameSite 与 HttpOnly 设置正确',
    acceptance: ['checklist:simple-check 完成并确认'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
    requiredViews: [{ type: 'checklist', id: 'simple-check', requiredForAcceptance: true }],
  },
}, 'run-team-simple')
rt.startExecution('run-team-simple', 'task-1', { memberId: 'w1', connectorId: 'codex' })
rt.publishViewObject('run-team-simple', {
  id: 'simple-check',
  type: 'checklist',
  title: '安全配置核对清单',
  taskId: 'task-1',
  data: { items: [{ label: 'SameSite=Lax 已启用', checked: true, taskId: 'task-1' }] },
}, { kind: 'member', id: 'w1', role: 'worker' })
rt.updateTeamView('run-team-simple', {
  summary: '当前进展：w1 正在核对登录态选项。\n关键问题：无阻塞。\n下一步：等待提交结果。',
  pinnedRefs: [{ type: 'checklist', id: 'simple-check' }],
}, { kind: 'member', id: 'c1', role: 'commander' })

// Session B: multi-member parallel team with 4 tasks, attention queue, missing requiredView, & all 6 renderers
const meta = {
  projectId: 'project-team-view',
  teamId: 'concerto-demo',
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
rt.bindSession('team-1', 'run-team-1', meta)
rt.submit({
  decisionId: 'd1',
  expectedPlanRevision: 1,
  action: 'create_task',
  payload: {
    title: '接通团队主页与多画布结构化对象',
    objective: '验证看板跳转、Bento、Markmap/SVG/Excalidraw/HTML 与右侧成员抽屉联动',
    acceptance: ['Markmap/SVG/Excalidraw/HTML 可渲染与交互', '成员抽屉仅显示自身消息与产物', '点击任务展开详情并高亮'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
  },
}, 'run-team-1')
rt.submit({
  decisionId: 'd2',
  expectedPlanRevision: 2,
  action: 'create_task',
  payload: {
    title: '实现宿主主题跟随与中文标签测量',
    objective: '确保深浅色切换及长中文节点自适应不截断',
    acceptance: ['主题跟随宿主变化'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
  },
}, 'run-team-1')
rt.submit({
  decisionId: 'd3',
  expectedPlanRevision: 3,
  action: 'create_task',
  payload: {
    title: '补充可选建议导图与回归用例',
    objective: '验证非阻塞 requiredViews 缺失提示',
    acceptance: ['单测通过'],
    constraints: [],
    dependsOn: ['task-2'],
    assigneeRole: 'worker',
    requiredViews: [{ type: 'diagram', id: 'optional-notes', requiredForAcceptance: false }],
  },
}, 'run-team-1')
rt.submit({
  decisionId: 'd4',
  expectedPlanRevision: 4,
  action: 'create_task',
  payload: {
    title: '初始化架构基线与依赖检查',
    objective: '确认打包与路由边界就绪',
    acceptance: ['无需生成 diagram:architecture', '基础脚本就绪'],
    constraints: [],
    dependsOn: [],
    assigneeRole: 'worker',
  },
}, 'run-team-1')
rt.submitResult({ taskId: 'task-4', summary: '依赖检查已通过', checksPassed: true }, 'run-team-1')

const executionId = rt.startExecution('run-team-1', 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
for (let i = 1; i <= 32; i += 1) {
  rt.recordExecutionEvent('run-team-1', 'task-1', {
    type: 'output.message',
    text: `w1-older-${String(i).padStart(2, '0')} 历史诊断片段`,
  }, executionId)
}
rt.reportProgress({ taskId: 'task-1', executionId, note: 'w1 已完成后端契约校验' }, 'run-team-1', { kind: 'member', id: 'w1', role: 'worker' })
rt.recordExecutionEvent('run-team-1', 'task-1', {
  type: 'output.message',
  text: 'w1 正在等待 npm test 审批确认。',
}, executionId)
rt.reportProgress({ taskId: 'task-1', executionId, note: 'c1 补充验收来源' }, 'run-team-1', { kind: 'member', id: 'c1', role: 'commander' })
rt.recordExecutionEvent('run-team-1', 'task-1', {
  type: 'approval.requested',
  requestId: 'req-1',
  payload: { command: 'node --test', cwd: 'F:/CodingFolder/Concerto', reason: '运行结构化视图单测' },
}, executionId)

// Second member w2 working in parallel on task-2
rt.startExecution('run-team-1', 'task-2', { memberId: 'w2', connectorId: 'codex' })
rt.reportProgress({ taskId: 'task-2', note: 'w2 正在调试亮色对比度与字体测量' }, 'run-team-1', { kind: 'member', id: 'w2', role: 'worker' })

// Mindmap with > 8 nodes to test preview hierarchical auto-fold + "+N" + fullscreen sync
rt.publishViewObject('run-team-1', {
  id: 'plan',
  type: 'mindmap',
  renderer: 'markmap',
  semanticKind: 'blueprint',
  size: 'l',
  caption: '团队结构与核心能力全景拆解',
  title: '协作思维导图',
  taskId: 'task-1',
  data: {
    markdown: [
      '# 团队主页升级全景',
      '## 信息分层与导航',
      '- 常驻团队目标与成员条',
      '- 概览：简报与重点对象',
      '- 任务：固定看板与按需展开详情',
      '- 成果：筛选与用户置顶',
      '## 多渲染器规范化',
      '- Markmap 预览与全屏同步',
      '- SVG 中文自适应测量与三态连线',
      '- Excalidraw 白板用户层独立版本',
      '- HTML 沙箱宿主主题注入',
    ].join('\n'),
  },
}, { kind: 'member', id: 'c1', role: 'commander' })

// Live execution diagram linking nodes to tasks (mirrored live from Runtime!) + 3 edge semantics
rt.publishViewObject('run-team-1', {
  id: 'dep-dag',
  type: 'diagram',
  renderer: 'svg',
  semanticKind: 'live_execution',
  size: 'm',
  title: '实时执行流水线图谱',
  taskId: 'task-1',
  layoutHints: { criticalPath: ['s4', 's2'] },
  data: {
    layout: 'dag',
    nodes: [
      { id: 's4', label: '架构基线就绪与环境检查', taskId: 'task-4', status: 'pending', critical: true },
      { id: 's2', label: '主题适配与中文自适应排版', taskId: 'task-2', status: 'pending', critical: true },
      { id: 's1', label: '审批门禁阻塞项处理', taskId: 'task-1', status: 'pending' },
      { id: 's3', label: '未知状态探测节点', status: 'unknown' },
    ],
    edges: [
      { from: 's4', to: 's2', label: '关键路径', kind: 'critical' },
      { from: 's4', to: 's1', label: '阻塞阻断', kind: 'error' },
      { from: 's2', to: 's3', label: '异常探测', kind: 'unknown' },
    ],
  },
}, { kind: 'member', id: 'c1', role: 'commander' })

rt.publishViewObject('run-team-1', {
  id: 'board',
  type: 'board',
  renderer: 'excalidraw',
  semanticKind: 'blueprint',
  size: 'm',
  title: '自由协作白板',
  taskId: 'task-1',
  data: {
    layout: 'timeline',
    nodes: [
      { id: 'b1', label: '架构草图', status: 'done' },
      { id: 'b2', label: '白板拖拽测试', status: 'in_progress' },
    ],
    edges: [{ from: 'b1', to: 'b2', label: 'next' }],
  },
}, { kind: 'member', id: 'w1', role: 'worker' })

rt.publishViewObject('run-team-1', {
  id: 'data',
  type: 'table',
  size: 's',
  title: '方案对比',
  taskId: 'task-1',
  data: { columns: ['模块', '状态'], rows: [['team-view', 'v1']] },
}, { kind: 'member', id: 'w1', role: 'worker' })

rt.publishViewObject('run-team-1', {
  id: 'acceptance',
  type: 'checklist',
  size: 's',
  title: '验收清单',
  taskId: 'task-1',
  data: { items: [{ label: 'task-4 基础设施验证通过', checked: false, taskId: 'task-4' }] },
}, { kind: 'member', id: 'c1', role: 'commander' })

// Seed a legacy HTML artifact through the trusted Runtime path.
rt.publishViewObject('run-team-1', {
  id: 'html-brief',
  type: 'html',
  renderer: 'sandbox-iframe',
  size: 's',
  title: '指标摘要卡',
  taskId: 'task-2',
  data: {
    html: '<div class="kpi"><div class="val">151</div><div class="sub">单测全量通过</div></div>',
    css: '.kpi{padding:10px;border:1px solid var(--border-color);border-radius:10px}.val{font-size:24px;font-weight:700;color:var(--brand)}.sub{color:var(--text-secondary);font-size:12px}',
  },
}, { kind: 'runtime', id: 'w2', role: 'worker' })

rt.publishViewObject('run-team-1', {
  id: 'mm-svg-layers',
  type: 'mindmap',
  renderer: 'svg',
  size: 'm',
  title: '多层导图（SVG 渲染）',
  taskId: 'task-1',
  data: {
    root: {
      id: 'r0',
      label: '根节点',
      children: [
        {
          id: 'r1',
          label: '第一层子节点',
          children: [
            { id: 'r2a', label: '第二层子节点A' },
            { id: 'r2b', label: '第二层子节点B' },
          ],
        },
      ],
    },
  },
}, { kind: 'member', id: 'w1', role: 'worker' })

rt.publishViewObject('run-team-1', {
  id: 'snap-check',
  type: 'checklist',
  semanticKind: 'snapshot',
  size: 's',
  title: '历史基线检查快照',
  taskId: 'task-4',
  data: { items: [{ label: 'task-4 完成前历史快照', checked: false, taskId: 'task-4' }] },
}, { kind: 'member', id: 'c1', role: 'commander' })

rt.updateTeamView('run-team-1', {
  summary: [
    '当前进展：task-4 已验收，w1 与 w2 正在并行推进主视图与主题适配。',
    '关键问题：task-1 存在待审批命令请求，task-3 缺少推荐视图。',
    '下一步：审批确认后完成主题切换与多产物筛选验收。',
    '补充引用：请检查 mindmap:mm-svg-layers。',
  ].join('\n'),
  sections: [
    {
      title: '全景与拓扑图谱',
      refs: [
        { type: 'mindmap', id: 'plan', size: 'l' },
        { type: 'diagram', id: 'dep-dag', size: 'm' },
        { type: 'board', id: 'board', size: 'm' },
      ],
    },
    {
      title: '对比表、清单与指标',
      refs: [
        { type: 'table', id: 'data', size: 's' },
        { type: 'checklist', id: 'acceptance', size: 's' },
        { type: 'html', id: 'html-brief', size: 's' },
      ],
    },
  ],
  pinnedRefs: [
    { type: 'mindmap', id: 'plan' },
    { type: 'diagram', id: 'dep-dag' },
    { type: 'board', id: 'board' },
    { type: 'table', id: 'data' },
    { type: 'checklist', id: 'acceptance' },
    { type: 'html', id: 'html-brief' },
  ],
}, { kind: 'member', id: 'c1', role: 'commander' })

let offline = false
const root = resolve('.test-data/presentation-team-view')
await mkdir(root, { recursive: true })
const reactRoot = resolve(process.env.CONCERTO_REACT_FIXTURE || '.test-data/presentation-implementation/preview')

const html = `<!doctype html><meta charset="utf-8"><style>
body{
  --dsw-alias-bg-base:#151517;
  --dsw-alias-bg-layer-1:#232324;
  --dsw-alias-bg-layer-2:#2c2c2e;
  --dsw-alias-bg-layer-3:#353638;
  --dsw-alias-bg-module-platform:#353638;
  --dsw-alias-label-primary:#f9fafb;
  --dsw-alias-label-secondary:#cfd3d6;
  --dsw-alias-label-tertiary:#adb2b8;
  --dsw-alias-border-l2:rgba(255,255,255,0.14);
  --dsw-alias-border-l3:rgba(255,255,255,0.22);
  --dsw-alias-brand-primary:#f9fafb;
  --dsw-alias-state-business-primary:#7aaaff;
  --dsw-alias-state-business-tertiary:#34415b;
  --dsw-alias-state-success-primary:#22c55e;
  --dsw-alias-state-success-tertiary:#233c2c;
  --dsw-alias-state-warn-primary:#f59e0b;
  --dsw-alias-state-warn-tertiary:#27241f;
  --dsw-alias-state-error-primary:#f25a5a;
  --dsw-alias-state-done-primary:#a78bfa;
  --dsh-content-font-size:14px;
  --dsh-content-font-size-secondary:13px;
  --dsh-code-font-size:11px;
  font:14px/1.6 system-ui;background:#0b1018;color:#f1f5fb;margin:16px
}
body[data-host-light="true"]{
  --dsw-alias-bg-base:#ffffff;
  --dsw-alias-bg-layer-1:#f9fafb;
  --dsw-alias-bg-layer-2:#f5f7fa;
  --dsw-alias-bg-layer-3:#edf0f4;
  --dsw-alias-bg-module-platform:#f5f6f7;
  --dsw-alias-label-primary:#0f1115;
  --dsw-alias-label-secondary:#61666b;
  --dsw-alias-label-tertiary:#81858c;
  --dsw-alias-border-l2:rgba(0,0,0,0.10);
  --dsw-alias-border-l3:rgba(0,0,0,0.16);
  --dsw-alias-brand-primary:#0f1115;
  --dsw-alias-state-business-primary:#4176e6;
  --dsw-alias-state-business-tertiary:#e4edfd;
  --dsw-alias-state-success-tertiary:#e6faed;
  --dsw-alias-state-warn-tertiary:#fef5e7;
  --dsw-alias-state-error-primary:#ec1313;
  --dsw-alias-state-done-primary:#7c3aed;
}
#tabs{display:flex;gap:8px;margin-bottom:12px}
#tabs [role="tab"]{padding:6px 12px;border-radius:8px;border:1px solid #39475c;background:#171e2b;color:#f1f5fb;cursor:pointer}
#tabs [role="tab"][aria-selected="true"]{border-color:#9edbd7;background:#263246;font-weight:600}
#view{min-height:680px}
</style>
<div id="tabs" data-conversation-tabs="true"></div><div id="view"></div><div id="dock"></div>
<script type="module">
import {React,ReactDOM,ReactDOMClient} from '/host-runtime.js';
const slots = {};
const tabsRoot = ReactDOMClient.createRoot(document.getElementById('tabs'));
const viewRoot = ReactDOMClient.createRoot(document.getElementById('view'));
const dockRoot = ReactDOMClient.createRoot(document.getElementById('dock'));

let currentSession = 'team-simple';
let currentView = 'chat';

let activeInjectedSlot = null;
window.__ModuleLoader__ = {
  load({factory}) {
    factory(name => ({'react':React,'react-dom':ReactDOM}[name])).apply({
      effect(fn) { return fn(); },
      locale: { register() {} },
      slots: {
        inject(name, fn) {
          if (name === 'locale') throw new Error('slots.inject must receive concrete slot name, not locale');
          activeInjectedSlot = name;
          try { return fn(); } finally { activeInjectedSlot = null; }
        },
        register(spec, component) {
          if (activeInjectedSlot && spec.name !== activeInjectedSlot) {
            throw new Error('slot mismatch: ' + spec.name + ' !== ' + activeInjectedSlot);
          }
          slots[spec.id || spec.key || spec.name] = component;
          return () => {};
        }
      }
    });
  }
};
await import('/client.js');

window.__SET_VIEW__ = (vid) => {
  currentView = vid;
  try { localStorage.setItem('dsh.conversation.' + currentSession, JSON.stringify({ view: vid })); } catch {}
  render();
};
window.__SET_SESSION__ = (sid, vid = 'chat') => {
  currentSession = sid;
  currentView = vid;
  render();
};
function render() {
  tabsRoot.render(React.createElement(React.Fragment, null,
    React.createElement('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': String(currentView === 'chat'),
      onClick: () => window.__SET_VIEW__('chat'),
    }, '对话'),
    React.createElement('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': String(currentView === 'concerto.team'),
      onClick: () => window.__SET_VIEW__('concerto.team'),
    }, '团队')
  ));
  if (currentView === 'concerto.team') {
    viewRoot.render(React.createElement(slots['concerto.team'], { sessionId: currentSession, openView: (v) => window.__SET_VIEW__(v) }));
  } else {
    viewRoot.render(React.createElement('div', { 'data-chat-placeholder': currentSession }, 'Chat view for ' + currentSession));
  }
  dockRoot.render(React.createElement(slots['concerto.members'], { sessionId: currentSession }));
}
render();
</script>`

function resolveRunId(sessionId) {
  if (sessionId === 'team-simple') return { runId: 'run-team-simple', meta: metaSimple }
  if (sessionId === 'team-1') return { runId: 'run-team-1', meta }
  return null
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html) }
    if (url.pathname === '/concerto/session') {
      if (offline) { req.socket.destroy(); return }
      const sid = url.searchParams.get('sessionId')
      const resolved = resolveRunId(sid)
      if (!resolved) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: false, code: 'not_found' })) }
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ ok: true, roleKind: 'commander', ...resolved.meta, snapshot: rt.getStatus(resolved.runId) }))
    }
    if (url.pathname === '/concerto/members/activity') {
      const resolved = resolveRunId(url.searchParams.get('sessionId'))
      if (!resolved) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: false, code: 'not_found' })) }
      const memberId = url.searchParams.get('memberId') || ''
      const beforeRaw = url.searchParams.get('before')
      const before = beforeRaw !== null && beforeRaw !== ''
        ? (/^\d+$/.test(beforeRaw) ? Number.parseInt(beforeRaw, 10) : beforeRaw)
        : null
      const limit = Number.parseInt(url.searchParams.get('limit') || '30', 10)
      const runtimeAll = []
      let cur = null
      for (let g = 0; g < 10; g += 1) {
        const pg = rt.getMemberActivity(resolved.runId, { memberId, before: cur, limit: 100 })
        if (!pg.ok || pg.items.length === 0) break
        runtimeAll.unshift(...pg.items)
        if (!pg.hasMore || !pg.nextBefore) break
        cur = pg.nextBefore
      }
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({
        ...mergeAndPaginateActivities(runtimeAll, [], {
          memberId,
          before,
          limit: Number.isInteger(limit) ? limit : 30,
        }),
        backendHistoryMode: memberId.startsWith('w') ? 'codex_normalized' : 'hosted_partial',
      }))
    }
    if (url.pathname === '/concerto/view-objects/user-layout' && req.method === 'POST') {
      let body = ''
      for await (const ch of req) body += ch
      const input = JSON.parse(body)
      const resolved = resolveRunId(input.sessionId) || { runId: 'run-team-1' }
      const out = rt.updateViewObjectUserLayout(resolved.runId, input)
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(out))
    }
    if (url.pathname === '/concerto/view-preferences' && req.method === 'POST') {
      let body = ''
      for await (const ch of req) body += ch
      const input = JSON.parse(body)
      const resolved = resolveRunId(input.sessionId) || { runId: 'run-team-1' }
      const out = rt.updateUserViewPreferences(resolved.runId, input)
      res.writeHead(out.ok ? 200 : 400, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(out))
    }
    if (url.pathname === '/concerto/requests/respond' && req.method === 'POST') {
      let body = ''
      for await (const ch of req) body += ch
      const input = JSON.parse(body)
      const resolved = resolveRunId(input.sessionId) || { runId: 'run-team-1' }
      const out = rt.decideRequest(resolved.runId, input, { kind: 'user', id: 'preview-owner' })
      assert.equal(out.ok, true)
      rt.delivery(resolved.runId, input.requestId, true)
      res.setHeader('content-type', 'application/json')
      return res.end('{"ok":true}')
    }
    const paths = {
      '/host-runtime.js': reactRoot + '/host-runtime.js',
      '/vendor-BUMdD3V7.js': reactRoot + '/vendor-BUMdD3V7.js',
      '/client.js': resolve('packages/dsh-concerto/lib/client.js'),
      '/concerto/assets/rough.js': resolve('packages/dsh-concerto/lib/vendor/rough.js'),
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
  page.on('pageerror', (err) => errors.push(err.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)

  // Scenario 1: Single simple task team -> concise overview, task tab stays a board.
  const home = page.getByRole('region', { name: 'Concerto 团队主页' })
  const refreshTeam = async ({ dispatch = false } = {}) => {
    const menu = home.locator('.concerto-hero-actions-menu')
    if (dispatch) {
      await menu.locator('button', { hasText: '刷新快照' }).dispatchEvent('click')
      return
    }
    await menu.locator('summary').click()
    await menu.getByRole('button', { name: '刷新快照' }).click()
  }
  await home.waitFor()
  assert.equal(await page.locator('[data-conversation-tabs] [role="tab"]').nth(1).getAttribute('aria-selected'), 'true')
  assert.equal(await page.locator('.concerto-dock').count(), 0)
  await home.locator('[data-concerto-section="briefing"]').waitFor()
  await home.locator('[data-concerto-key-task="task-1"]').waitFor()
  assert.equal(await home.locator('[data-concerto-renderer="markmap"]').count(), 0)
  await home.locator('[data-concerto-tab="tasks"]').click()
  assert.equal(await home.getByRole('group', { name: '任务展示模式' }).count(), 0)
  assert.equal(await home.locator('[data-concerto-section="kanban"]').count(), 1)

  // Switch to multi-member team-1
  await page.evaluate(() => window.__SET_SESSION__('team-1', 'chat'))
  await home.waitFor()
  await home.locator('[data-concerto-pending-badge="true"]').waitFor()
  await home.locator('[data-concerto-section="roster"]').getByRole('button', { name: /w2/ }).waitFor()

  // Host tab switch round-trip check
  await page.locator('[data-conversation-tabs] [role="tab"]').nth(0).click()
  await page.getByText('Chat view for team-1').waitFor()
  await page.locator('[data-conversation-tabs] [role="tab"]').nth(1).click()
  await home.waitFor()

  await home.locator('[data-concerto-tab="tasks"]').click()
  assert.equal(await home.locator('[data-concerto-tab="tasks"] .concerto-tab-attention').textContent(), '1')
  assert.equal(await home.locator('.concerto-kcard h4 > button').count(), 4)
  assert.match(await home.locator('[data-concerto-kanban-task="task-1"] .concerto-kcard-context').textContent(), /c1/)
  await home.screenshot({ path: root + '/tasks-host-tokens.png' })
  await home.locator('[data-concerto-pending-badge="true"]').click()
  const attentionPopover = home.locator('[data-concerto-section="attention"]')
  await attentionPopover.waitFor()
  assert.equal(await attentionPopover.getAttribute('popover'), 'auto')
  assert.equal(await attentionPopover.evaluate((element) => element.matches(':popover-open')), true)
  assert.equal(await home.locator('[data-concerto-tab="tasks"]').getAttribute('aria-selected'), 'true')
  await page.keyboard.press('Escape')
  await attentionPopover.waitFor({ state: 'detached' })
  await home.locator('[data-concerto-tab="overview"]').click()

  // Scenario 2 & 3: Hero Attention popover keeps the active tab and reuses the unified attention count
  assert.equal(await attentionPopover.count(), 0)
  assert.match(await home.locator('[data-concerto-pending-badge="true"]').textContent(), /待处理 1\s*项/)
  await home.locator('[data-concerto-pending-badge="true"]').click()
  await attentionPopover.waitFor()
  assert.equal(await home.locator('[data-concerto-tab="overview"]').getAttribute('aria-selected'), 'true')
  assert.match(await attentionPopover.locator('.concerto-attention-popover-head').textContent(), /待处理 1\s*项/)
  assert.equal(await home.locator('[data-concerto-missing-required="true"]').count(), 0)
  await page.keyboard.press('Escape')
  await attentionPopover.waitFor({ state: 'detached' })
  await home.locator('[data-concerto-section="briefing"]').getByText('当前进展').waitFor()
  await home.locator('[data-concerto-section="briefing"]').getByText('关键问题').waitFor()
  await home.locator('[data-concerto-section="briefing"]').getByText('下一步').waitFor()
  assert.match(await home.locator('[data-concerto-section="briefing"] [data-concerto-inline-ref="mindmap:mm-svg-layers"]').textContent(), /多层导图（SVG 渲染）/)
  assert.ok((await home.locator('[data-concerto-key-task]').count()) <= 4)

  // 6-Renderer coverage & Stage assertions
  const stage = home.locator('[data-concerto-section="stage"]')
  const planCard = stage.locator('[data-concerto-object-id="plan"]').first()
  assert.equal(await planCard.getAttribute('data-concerto-renderer'), 'markmap')
  assert.ok(['m', 'l'].includes(await planCard.getAttribute('data-size')))
  const dagCard = stage.locator('[data-concerto-object-id="dep-dag"]').first()
  assert.equal(await dagCard.getAttribute('data-concerto-renderer'), 'svg')
  assert.equal(await dagCard.getAttribute('data-concerto-semantic'), 'live_execution')
  // Intrinsic SVG sizing keeps text at the host size; overflow belongs to the canvas.
  for (const card of [planCard, dagCard]) {
    const scale = await card.locator('.concerto-graph-content > svg').evaluate((svg) => {
      const matrix = svg.getScreenCTM()
      return Math.hypot(matrix.a, matrix.b)
    })
    assert.ok(Math.abs(scale - 1) < 0.01, `preview unexpectedly rescaled host typography: ${scale}`)
  }
  await planCard.screenshot({ path: root + '/plan-preview.png' })
  await dagCard.screenshot({ path: root + '/dependency-preview.png' })
  await dagCard.hover()
  await dagCard.getByRole('button', { name: '放大' }).click()
  await dagCard.getByRole('button', { name: '放大' }).click()
  const dagViewport = dagCard.locator('.concerto-canvas-stage--readable')
  await dagViewport.evaluate((el) => { el.scrollLeft = 90 })
  await page.waitForFunction(() => document.querySelector('[data-concerto-object-id="dep-dag"] .concerto-canvas-stage--readable').scrollLeft >= 89)
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/concerto/session') && res.status() === 200),
    refreshTeam({ dispatch: true }),
  ])
  assert.ok(Math.abs(await dagViewport.evaluate((el) => el.scrollLeft) - 90) < 2, 'polling must preserve graph scroll')
  await dagCard.hover()
  await dagCard.getByRole('button', { name: '适应窗口' }).click()
  assert.ok(await dagViewport.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'explicit fit must show the whole graph')
  await dagCard.getByRole('button', { name: '原始字号' }).click()
  const actualScale = await dagCard.locator('.concerto-graph-content > svg').evaluate((svg) => Math.hypot(svg.getScreenCTM().a, svg.getScreenCTM().b))
  assert.ok(Math.abs(actualScale - 1) < 0.01, '100% must restore host typography')
  const boardCard = stage.locator('[data-concerto-object-id="board"]').first()
  assert.equal(await boardCard.getAttribute('data-concerto-renderer'), 'excalidraw')
  assert.equal(await stage.locator('[data-concerto-object-id="data"]').count(), 1)
  assert.equal(await stage.locator('[data-concerto-object-id="acceptance"]').count(), 1)
  const htmlCard = stage.locator('[data-concerto-object-id="html-brief"]').first()
  assert.equal(await htmlCard.getAttribute('data-concerto-renderer'), 'sandbox-iframe')
  assert.equal(await htmlCard.locator('iframe[sandbox=""]').count(), 1)

  // Verify live_execution sync (task-4 completed -> '已完成'; task-1 waiting_approval -> '等待审批') & 3 edge semantics
  await dagCard.locator('svg text', { hasText: '已完成' }).first().waitFor()
  await dagCard.locator('svg text', { hasText: '等待审批' }).first().waitFor()
  assert.ok((await dagCard.locator('[data-concerto-edge-semantic="critical"]').count()) >= 1)
  assert.ok((await dagCard.locator('[data-concerto-edge-semantic="waiting"]').count()) >= 1)
  assert.equal(await dagCard.locator('[data-concerto-edge-semantic="blocked"]').count(), 0)
  assert.ok((await dagCard.locator('[data-concerto-edge-semantic="unknown"]').count()) >= 1)
  await dagCard.locator('[data-concerto-diag-node="s1"]').click()
  assert.equal(await home.locator('[data-concerto-tab="tasks"]').getAttribute('aria-selected'), 'true')
  await page.locator('[data-concerto-task-id="task-1"]').waitFor()
  await home.locator('[data-concerto-tab="overview"]').click()
  await dagCard.waitFor()

  // Metadata ⓘ popover holds engine & compatibility details cleanly
  await planCard.getByRole('button', { name: /查看 .* 元数据/ }).click()
  await planCard.getByText('mindmap:plan').waitFor()
  await planCard.getByText(/自绘 SVG 导图/).waitFor()
  const infoPopover = planCard.locator('.concerto-info-pop')
  assert.equal(await infoPopover.getAttribute('popover'), 'auto')
  assert.equal(await infoPopover.evaluate((element) => element.matches(':popover-open')), true)
  await page.keyboard.press('Escape')
  await infoPopover.waitFor({ state: 'detached' })

  await boardCard.getByRole('button', { name: /查看 .* 元数据/ }).click()
  await boardCard.getByText(/Excalidraw v2/).waitFor()
  await boardCard.getByRole('button', { name: /查看 .* 元数据/ }).click()

  // Markmap > 8 nodes preview fold + expand parity + fullscreen CanvasModal + SVG export check
  if (await planCard.locator('[data-concerto-mm-expand-all="true"]').count() === 0) {
    await planCard.getByRole('button', { name: '收起深层', exact: true }).click()
  }
  const mmFoldedBefore = await planCard.locator('[data-concerto-mm-node]').count()
  await planCard.locator('[data-concerto-mm-expand-all="true"]').waitFor()
  await planCard.locator('[data-concerto-mm-toggle]').nth(1).click()
  const mmAfterToggle = await planCard.locator('[data-concerto-mm-node]').count()
  assert.notEqual(mmAfterToggle, mmFoldedBefore)

  const previewNodeIds = await planCard.locator('[data-concerto-mm-node]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-concerto-mm-node')))
  await planCard.getByRole('button', { name: '展开画布' }).click()
  const canvasDialog = page.getByRole('dialog', { name: '协作思维导图' })
  await canvasDialog.waitFor()
  await canvasDialog.locator('[data-concerto-mm-node]').first().waitFor()
  const modalNodeIds = await canvasDialog.locator('[data-concerto-mm-node]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-concerto-mm-node')))
  assert.deepEqual(modalNodeIds, previewNodeIds)
  await canvasDialog.getByRole('button', { name: '放大' }).click()
  await canvasDialog.getByRole('button', { name: '放大' }).click()
  const mmStage = canvasDialog.locator('.concerto-canvas-stage')
  const mmStageBox = await mmStage.boundingBox()
  assert.ok(mmStageBox)
  await page.mouse.move(mmStageBox.x + mmStageBox.width / 2, mmStageBox.y + mmStageBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(mmStageBox.x + mmStageBox.width / 2 + 48, mmStageBox.y + mmStageBox.height / 2 + 32, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  const readModalViewport = () => mmStage.evaluate((stage) => ({
    scrollLeft: Math.round(stage.scrollLeft),
    scrollTop: Math.round(stage.scrollTop),
    svgWidth: stage.querySelector('svg')?.getAttribute('width') || '',
  }))
  const mmViewportBeforePolls = await readModalViewport()
  assert.ok(mmViewportBeforePolls.svgWidth)
  for (let p = 0; p < 3; p += 1) {
    rt.recordExecutionEvent('run-team-1', 'task-2', { type: 'output.message', text: `markmap-poll-tick-${p + 1}` })
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/concerto/session') && res.status() === 200),
      refreshTeam({ dispatch: true }),
    ])
    await page.waitForTimeout(80)
  }
  assert.deepEqual(await readModalViewport(), mmViewportBeforePolls)
  await page.screenshot({ path: root + '/canvas-modal.png', fullPage: false })
  await canvasDialog.getByRole('button', { name: '关闭画布' }).click()
  await canvasDialog.waitFor({ state: 'detached' })

  await planCard.getByRole('button', { name: '展开画布' }).click()
  await canvasDialog.waitFor()
  await canvasDialog.locator('[data-concerto-mm-node]').first().waitFor()
  await page.waitForTimeout(120)
  assert.deepEqual(await readModalViewport(), mmViewportBeforePolls)
  await canvasDialog.locator('[data-concerto-mm-toggle]').first().click()
  const collapsedModalIds = await canvasDialog.locator('[data-concerto-mm-node]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-concerto-mm-node')))
  await canvasDialog.getByRole('button', { name: '关闭画布' }).click()
  await canvasDialog.waitFor({ state: 'detached' })
  const collapsedPreviewIds = await planCard.locator('[data-concerto-mm-node]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-concerto-mm-node')))
  assert.deepEqual(collapsedPreviewIds, collapsedModalIds)

  // Verify SVG export resolves CSS variables (no raw var(--...) leaked into exported SVG blob)
  await page.evaluate(() => {
    window.__LAST_SVG_BLOB__ = null
    const origCreate = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      if (blob && blob.type && blob.type.includes('svg')) {
        blob.text().then((txt) => { window.__LAST_SVG_BLOB__ = txt })
      }
      return origCreate(blob)
    }
  })
  await dagCard.getByRole('button', { name: '展开画布' }).click()
  const dagModal = page.getByRole('dialog', { name: '实时执行流水线图谱' })
  await dagModal.waitFor()
  await dagModal.getByRole('button', { name: '导出 SVG' }).click()
  await page.waitForFunction(() => typeof window.__LAST_SVG_BLOB__ === 'string' && window.__LAST_SVG_BLOB__.length > 50)
  const exportedSvg = await page.evaluate(() => window.__LAST_SVG_BLOB__)
  assert.equal(/stroke="var\(--/i.test(exportedSvg), false)
  await dagModal.getByRole('button', { name: '关闭画布' }).click()
  await dagModal.waitFor({ state: 'detached' })

  // Excalidraw drag persists userLayout across v1 -> v2 semantic update, then resets via 适应窗口
  const b1Node = boardCard.locator('[data-concerto-excalidraw-node="b1"]')
  await b1Node.scrollIntoViewIfNeeded()
  const x0 = Number(await b1Node.getAttribute('data-x'))
  const y0 = Number(await b1Node.getAttribute('data-y'))
  const box = await b1Node.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 25, { steps: 5 })
  await page.mouse.up()
  assert.equal(Number(await b1Node.getAttribute('data-x')), x0 + 45)
  assert.equal(Number(await b1Node.getAttribute('data-y')), y0 + 25)

  const boardV2 = rt.publishViewObject('run-team-1', {
    id: 'board',
    type: 'board',
    renderer: 'excalidraw',
    expectedVersion: 1,
    title: '自由协作白板',
    taskId: 'task-1',
    data: {
      layout: 'timeline',
      nodes: [
        { id: 'b1', label: '架构草图（已更新）', status: 'done' },
        { id: 'b2', label: '白板拖拽测试', status: 'in_progress' },
      ],
      edges: [{ from: 'b1', to: 'b2', label: 'next' }],
    },
  }, { kind: 'member', id: 'w1', role: 'worker' })
  assert.equal(boardV2.ok, true)
  await refreshTeam()
  await boardCard.locator('svg text', { hasText: '架构草图（已更新）' }).waitFor()
  assert.equal(await boardCard.getAttribute('data-concerto-object-version'), '2')
  assert.equal(Number(await b1Node.getAttribute('data-x')), x0 + 45)
  assert.equal(Number(await b1Node.getAttribute('data-y')), y0 + 25)
  await boardCard.hover()
  await boardCard.getByRole('button', { name: '适应窗口' }).click()
  // P0-3: "适应窗口" only resets zoom/pan and keeps user-dragged node positions intact
  assert.equal(Number(await b1Node.getAttribute('data-x')), x0 + 45)
  assert.equal(Number(await b1Node.getAttribute('data-y')), y0 + 25)
  // Modal inline annotation (no window.prompt) + destructive "重置布局" resets node positions
  await boardCard.getByRole('button', { name: '展开画布' }).click()
  const boardModal = page.getByRole('dialog', { name: '自由协作白板' })
  await boardModal.waitFor()
  await boardModal.getByRole('button', { name: '添加批注' }).click()
  await boardModal.getByLabel('白板批注', { exact: true }).fill('边界确认')
  await boardModal.getByRole('button', { name: '添加', exact: true }).click()
  await boardModal.locator('svg text', { hasText: '批注：边界确认' }).waitFor()
  await page.evaluate(() => { window.confirm = () => true })
  await boardModal.getByRole('button', { name: '重置布局' }).click()
  await boardModal.getByRole('button', { name: '关闭画布' }).click()
  await boardModal.waitFor({ state: 'detached' })
  assert.equal(Number(await b1Node.getAttribute('data-x')), x0)
  assert.equal(Number(await b1Node.getAttribute('data-y')), y0)

  // Verify P1 fixes in Artifacts: suggested optional-notes shown calmly + mindmap+svg 2 child layers (4 nodes, 3 edges) & snapshot checklist frozen unchecked
  await home.locator('[data-concerto-tab="artifacts"]').click()
  await home.locator('[data-concerto-artifact-filters="true"]').waitFor()
  await home.locator('[data-concerto-required-views="true"] [data-suggested="true"]').filter({ hasText: 'diagram:optional-notes' }).waitFor()
  const mmSvgCard = home.locator('[data-concerto-object-id="mm-svg-layers"]')
  assert.equal(await mmSvgCard.locator('[data-concerto-diag-node]').count(), 4)
  assert.ok((await mmSvgCard.locator('[data-concerto-edge-semantic]').count()) >= 3)
  const snapCheckCard = home.locator('[data-concerto-object-id="snap-check"]')
  assert.equal(await snapCheckCard.locator('.concerto-checklist .concerto-state-idle').count(), 1)
  assert.equal(await snapCheckCard.locator('.concerto-checklist .concerto-state-done').count(), 0)
  assert.ok((await snapCheckCard.textContent()).includes('未完成'))
  const acceptanceCard = home.locator('[data-concerto-object-id="acceptance"]')
  assert.equal(await acceptanceCard.locator('.concerto-checklist .concerto-state-done').count(), 1)
  assert.ok((await acceptanceCard.textContent()).includes('已完成'))

  // Scenario 4: Artifacts tab filtering (w2 + html) -> briefing inline ref & task artifact jump relax filters with restore -> w1 + table pin
  await home.locator('select[data-filter="memberId"]').selectOption('w2')
  await home.locator('select[data-filter="type"]').selectOption('html')
  assert.equal(await home.locator('[data-concerto-object-id="mm-svg-layers"]').count(), 0)
  await home.locator('[data-concerto-tab="overview"]').click()
  await home.locator('[data-concerto-section="briefing"] [data-concerto-inline-ref="mindmap:mm-svg-layers"]').click()
  assert.equal(await home.locator('[data-concerto-tab="artifacts"]').getAttribute('aria-selected'), 'true')
  await home.locator('[data-concerto-jump-banner="true"]').waitFor()
  assert.equal(await home.locator('[data-concerto-object-id="mm-svg-layers"]').count(), 1)
  await home.getByRole('button', { name: '返回原筛选条件' }).click()
  assert.equal(await home.locator('select[data-filter="memberId"]').inputValue(), 'w2')
  assert.equal(await home.locator('select[data-filter="type"]').inputValue(), 'html')
  assert.equal(await home.locator('[data-concerto-object-id="mm-svg-layers"]').count(), 0)

  await home.locator('select[data-filter="memberId"]').selectOption('w1')
  await home.locator('select[data-filter="type"]').selectOption('table')
  assert.equal(await home.locator('[data-concerto-object-id="data"]').count(), 1)
  assert.equal(await home.locator('[data-concerto-object-id="plan"]').count(), 0)
  await home.locator('[data-concerto-pin="table:data"]').click()
  assert.equal(await home.locator('[data-concerto-pin="table:data"]').getAttribute('aria-pressed'), 'true')

  // Commander removes table:data from pinnedRefs; user pin must still survive!
  rt.updateTeamView('run-team-1', {
    summary: '当前进展：进入最终确认。\n关键问题：无新增异常。\n下一步：验收交付。',
    pinnedRefs: [{ type: 'mindmap', id: 'plan' }],
    sections: [{ title: '精选对象', refs: [{ type: 'mindmap', id: 'plan', size: 'l' }] }],
  }, { kind: 'member', id: 'c1', role: 'commander' })
  await home.locator('[data-concerto-tab="overview"]').click()
  await refreshTeam()
  await home.locator('[data-concerto-stage-group="user-pinned"] [data-concerto-object-id="data"]').waitFor()

  // Tasks tab: Key Task click jumps to Tasks tab (kanban default because 4 tasks) & expands task-1; task artifact pill also relaxes filters
  await home.locator('[data-concerto-tab="artifacts"]').click()
  await home.locator('select[data-filter="memberId"]').selectOption('w2')
  await home.locator('select[data-filter="type"]').selectOption('html')
  await home.locator('[data-concerto-tab="overview"]').click()
  await home.locator('[data-concerto-key-task="task-1"]').click()
  assert.equal(await home.locator('[data-concerto-tab="tasks"]').getAttribute('aria-selected'), 'true')
  assert.equal(await home.locator('[data-concerto-section="kanban"]').count(), 1)
  await home.locator('[data-concerto-nav-banner="true"]').waitFor()
  // P0-1: one selected task Inspector, card toggle, focus restoration and narrow dialog
  assert.equal(await home.locator('[data-concerto-section="tasks"] [data-concerto-task-id]').count(), 1)
  const taskModule = page.locator('[data-concerto-task-id="task-1"]')
  const taskCardToggle = home.locator('[data-concerto-kanban-task="task-1"] .concerto-kcard-title')
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'true')
  await taskCardToggle.focus()
  await page.keyboard.press('Enter')
  await taskModule.waitFor({ state: 'detached' })
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'false')
  await taskCardToggle.focus()
  await page.keyboard.press('Enter')
  await taskModule.waitFor()
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-concerto-task-id') === 'task-1')
  assert.equal(await taskModule.locator('table.concerto-table').count(), 0)
  await page.setViewportSize({ width: 760, height: 960 })
  const taskDialog = page.locator('[data-concerto-task-inspector-dialog]')
  await taskDialog.waitFor()
  await page.keyboard.press('Escape')
  await taskDialog.waitFor({ state: 'detached' })
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'false')
  await page.setViewportSize({ width: 1280, height: 960 })
  await taskCardToggle.focus()
  await page.keyboard.press('Enter')
  await home.locator('.concerto-task-inspector--inline [data-concerto-task-id="task-1"]').waitFor()
  await taskModule.locator('.concerto-task-summary .concerto-chip').click()
  const returnDrawer = page.locator('[data-concerto-member-drawer]')
  await returnDrawer.waitFor()
  await page.keyboard.press('Escape')
  await returnDrawer.waitFor({ state: 'detached' })
  await taskModule.waitFor()
  assert.equal(await home.locator('[data-concerto-tab="tasks"]').getAttribute('aria-selected'), 'true')
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'true')
  await taskModule.locator('.concerto-task-summary .concerto-chip').click()
  await returnDrawer.waitFor()
  await returnDrawer.locator('[data-concerto-tab="tasks"]').click()
  await returnDrawer.getByRole('button', { name: '跳转查看任务 ›' }).click()
  await taskModule.waitFor()
  await taskModule.getByRole('button', { name: '返回 w1' }).click()
  await returnDrawer.waitFor()
  await returnDrawer.getByRole('button', { name: '返回 task-1' }).click()
  await taskModule.waitFor()
  assert.equal(await taskModule.getByRole('button', { name: /^返回 / }).count(), 0)
  await taskModule.locator('button[data-concerto-object-id="data"]').click()
  assert.equal(await home.locator('[data-concerto-tab="artifacts"]').getAttribute('aria-selected'), 'true')
  await home.locator('[data-concerto-jump-banner="true"]').waitFor()
  assert.equal(await home.locator('[data-concerto-object-id="data"]').count(), 1)
  await home.getByRole('button', { name: '返回原筛选条件' }).click()
  assert.equal(await home.locator('select[data-filter="memberId"]').inputValue(), 'w2')
  assert.equal(await home.locator('select[data-filter="type"]').inputValue(), 'html')
  await home.locator('select[data-filter="memberId"]').selectOption('all')
  await home.locator('select[data-filter="type"]').selectOption('all')

  // MemberDrawer: messages pagination + live tail merge + Tasks + Artifacts + Executions tabs + r1 empty states
  await home.locator('[data-concerto-section="roster"]').getByRole('button', { name: /w1/ }).click()
  const drawer = page.locator('dialog.concerto-drawer')
  await drawer.waitFor()
  await drawer.getByText('w1 正在等待 npm test 审批确认。').waitFor()
  const drawerBody = drawer.locator('.concerto-drawer-body')
  const beforeScroll = await drawerBody.evaluate((el) => ({ top: el.scrollTop, height: el.scrollHeight }))
  await drawer.getByRole('button', { name: '加载更早消息' }).click()
  await drawer.getByText('w1-older-01 历史诊断片段').waitFor()
  const afterScroll = await drawerBody.evaluate((el) => ({ top: el.scrollTop, height: el.scrollHeight }))
  assert.ok(afterScroll.height > beforeScroll.height && afterScroll.top > beforeScroll.top)
  rt.recordExecutionEvent('run-team-1', 'task-1', { type: 'output.message', text: 'w1 轮询追加新消息 tail-after-page' }, executionId)
  await refreshTeam({ dispatch: true })
  await drawer.getByText('w1 轮询追加新消息 tail-after-page').waitFor()

  await drawer.getByRole('tab', { name: /任务/ }).click()
  await drawer.locator('.concerto-drawer-body').getByText('接通团队主页与多画布结构化对象', { exact: true }).waitFor()
  await drawer.getByRole('tab', { name: /产物/ }).click()
  assert.equal(await drawer.locator('[data-concerto-object-id="data"]').count(), 1)
  // P0-1: Esc stack pops nested CanvasModal without closing underlying MemberDrawer
  await drawer.locator('[data-concerto-object-id="board"]').getByRole('button', { name: '展开画布' }).click()
  const nestedModal = page.getByRole('dialog', { name: '自由协作白板' })
  await nestedModal.waitFor()
  await page.keyboard.press('Escape')
  await nestedModal.waitFor({ state: 'detached' })
  assert.equal(await drawer.count(), 1)
  // P0-1: Poll refresh does not yank focus away from active drawer control
  const execTab = drawer.getByRole('tab', { name: /执行记录/ })
  await execTab.focus()
  await execTab.click()
  await drawer.getByText(/task-1 · 第 1 次尝试/).waitFor()
  await refreshTeam({ dispatch: true })
  await page.waitForTimeout(80)
  const focusedTabRole = await page.evaluate(() => document.activeElement?.getAttribute?.('role'))
  assert.equal(focusedTabRole, 'tab')
  await page.screenshot({ path: root + '/drawer-w1.png', fullPage: false })
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'detached' })

  await home.locator('[data-concerto-section="roster"]').getByRole('button', { name: /r1/ }).click()
  await drawer.waitFor()
  await drawer.getByText('暂无 r1 的消息或执行记录。').waitFor()
  await drawer.getByRole('tab', { name: /任务/ }).click()
  await drawer.getByText('r1 暂无关联任务。').waitFor()
  await drawer.getByRole('button', { name: '关闭' }).click()
  await drawer.waitFor({ state: 'detached' })

  // Capture dark screenshot on Overview
  await home.locator('[data-concerto-tab="overview"]').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: root + '/team-home.png', fullPage: true })

  // Replay an imported scene through the trusted Runtime path to exercise the subset notice.
  const boardV3 = rt.publishViewObject('run-team-1', {
    id: 'board',
    type: 'board',
    renderer: 'excalidraw',
    expectedVersion: 2,
    title: '自由协作白板',
    taskId: 'task-1',
    data: {
      excalidrawScene: {
        type: 'excalidraw',
        version: 2,
        elements: [
          { id: 'ell-1', type: 'ellipse', x: 30, y: 30, width: 120, height: 48, customData: { label: '椭圆节点', status: 'done' } },
          { id: 'txt-free', type: 'text', x: 40, y: 110, text: '独立注释文本' },
          { id: 'fd-1', type: 'freedraw', x: 10, y: 10, points: [[0, 0], [10, 10]] },
        ],
      },
    },
  }, { kind: 'runtime', id: 'w1', role: 'worker' })
  assert.equal(boardV3.ok, true)
  await home.locator('[data-concerto-tab="artifacts"]').click()
  await home.locator('select[data-filter="memberId"]').selectOption('all')
  await home.locator('select[data-filter="type"]').selectOption('board')
  await refreshTeam()
  await home.locator('[data-concerto-excalidraw-omitted="1"]').waitFor()
  await home.locator('svg text', { hasText: '独立注释文本' }).waitFor()

  // Scenario 5: Host Light Theme + Font Size/Family + Small Viewport (390x720)
  await home.locator('select[data-filter="type"]').selectOption('all')
  await home.locator('[data-concerto-tab="overview"]').click()
  await page.evaluate(() => {
    document.body.setAttribute('data-host-light', 'true')
    document.body.setAttribute('data-theme', 'light')
    document.body.style.setProperty('--dsh-content-font-size', '17px')
    document.body.style.setProperty('--dsw-font-family', 'Georgia, serif')
  })
  await page.waitForTimeout(100)
  assert.equal(await home.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
  assert.equal(await home.evaluate((el) => getComputedStyle(el).fontSize), '17px')
  // Wait briefly for newly mounted sandboxed iframe srcdoc paint in light theme before screenshot
  await home.locator('[data-concerto-tab="artifacts"]').click()
  const htmlFrame = home.locator('[data-concerto-object-id="html-brief"] iframe[sandbox=""]')
  const iframeSrcDoc = await htmlFrame.getAttribute('srcdoc')
  assert.match(iframeSrcDoc, /color-scheme:light/)
  assert.match(iframeSrcDoc, /--font-size:17px/)
  await htmlFrame.scrollIntoViewIfNeeded()
  await htmlFrame.evaluate((el) => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForTimeout(180)
  await page.screenshot({ path: root + '/team-home-light.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 720 })
  await page.waitForTimeout(80)
  const smallOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(smallOverflow <= 4, `unexpected horizontal overflow at 390px: ${smallOverflow}`)
  await home.locator('[data-concerto-tab="tasks"]').click()
  await taskDialog.waitFor()
  await page.keyboard.press('Escape')
  await taskDialog.waitFor({ state: 'detached' })
  assert.equal(await home.locator('.concerto-board-jump').isVisible(), true)
  await home.screenshot({ path: root + '/tasks-narrow-host-tokens.png' })
  const boardOverflow = await home.evaluate((el) => el.scrollWidth - el.clientWidth)
  assert.ok(boardOverflow <= 4, `board overflow escaped its scroll region: ${boardOverflow}`)
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.evaluate(() => {
    document.body.removeAttribute('data-host-light')
    document.body.setAttribute('data-theme', 'dark')
    document.body.style.setProperty('--dsh-content-font-size', '14px')
  })

  // Scenario 6: Active tab & selected task survive offline disconnect + recovery + ordinary session isolation
  await home.locator('[data-concerto-tab="tasks"]').click()
  await taskCardToggle.click()
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'true')
  offline = true
  await refreshTeam()
  await home.getByText(/连接中断/).waitFor()
  assert.equal(await home.locator('[data-concerto-tab="tasks"]').getAttribute('aria-selected'), 'true')
  assert.equal(await taskCardToggle.getAttribute('aria-pressed'), 'true')

  offline = false
  await refreshTeam()
  await home.getByText(/实时同步/).waitFor()

  await page.evaluate(() => window.__SET_SESSION__('ordinary-1', 'chat'))
  await page.getByText('Chat view for ordinary-1').waitFor()
  assert.equal(await page.locator('[data-conversation-tabs] [role="tab"]').nth(0).getAttribute('aria-selected'), 'true')
  await page.waitForFunction(() => {
    const tab = [...document.querySelectorAll('[data-conversation-tabs] [role="tab"]')].find((el) => /团队|Team/i.test(el.textContent || ''))
    return !tab || tab.hidden || getComputedStyle(tab).display === 'none'
  })

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    status: 'PASS',
    checks: [
      'Scenario 1: Simple task uses the fixed board & avoids forced 6 charts',
      'Scenario 2 & 3: Multi-member parallel, live_execution status/edges sync, persistent pending badge, missing requiredViews',
      'Scenario 4 & 6-Renderers: Task/Member/Type filters, userPinnedRefs preserved across update_team_view, metadata in ⓘ, Markmap/SVG/Excalidraw/HTML + SVG export CSS resolution',
      'Scenario 5: Host Light/Dark theme + 17px font/serif sync + 390px responsive check',
      'Scenario 6: Disconnect snapshot retention, online recovery, tab/expansion retention, ordinary chat isolation',
    ],
    errors,
  }))
} finally {
  if (browser) await browser.close()
  await new Promise((done) => server.close(done))
}
