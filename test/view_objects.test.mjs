import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  validateViewObjectInput,
  validatePublicViewPatch,
  parseViewObjectReferences,
  resolveViewObjectRef,
  missingAcceptanceViewsForTask,
} from '../packages/dsh-concerto/lib/domain/view_objects.mjs'
import { parseMarkdownToMindmap, layoutMindmapTree, layoutDiagram, defaultPreviewCollapsedIds, approxLineWidth, mindmapToDiagramData, objectToExcalidrawScene } from '../packages/dsh-concerto/lib/domain/view_layout.mjs'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { registerConcertoTools } from '../packages/dsh-concerto/lib/tools.mjs'

test('view_objects: validates table, checklist, mindmap and rejects invalid inputs', () => {
  assert.equal(validateViewObjectInput({
    id: 'data',
    type: 'table',
    title: '方案对比',
    data: { columns: ['方案', '耗时'], rows: [['A', '2d'], ['B', '3d']] },
  }).ok, true)

  assert.equal(validateViewObjectInput({
    id: 'acceptance',
    type: 'checklist',
    title: '验收清单',
    data: { items: [{ label: '单测通过', checked: true, taskId: 'task-1' }] },
  }).ok, true)

  assert.equal(validateViewObjectInput({
    id: 'plan',
    type: 'mindmap',
    title: '协作计划',
    data: { root: { label: '目标', children: [{ label: '阶段一' }] } },
  }).ok, true)

  assert.equal(validateViewObjectInput({
    id: 'bad',
    type: 'uml',
    title: 'x',
    data: {},
  }).code, 'unsupported_type')

  assert.equal(validateViewObjectInput({
    id: 'bad-table',
    type: 'table',
    title: 'x',
    data: { columns: ['A', 'B'], rows: [['only-one']] },
  }).code, 'invalid')

  assert.equal(validatePublicViewPatch({ summary: '计划已更新', pinnedRefs: [{ type: 'table', id: 'data' }] }).ok, true)
  assert.equal(validatePublicViewPatch({}).code, 'invalid')
})

test('runtime: viewObjects are scoped per session, versioned in-place, and persisted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-view-'))
  const statePath = join(dir, 'runtime.json')
  try {
    const rt1 = createTeamRuntime({ statePath })
    rt1.bindSession('host-1', 'run-1', { projectId: 'p1', teamId: 't1', teamName: 'T1', configVersion: 1, commanderId: 'c1', commander: { id: 'c1', source: 'hosted' }, members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }] })
    rt1.bindSession('host-2', 'run-2', { projectId: 'p2', teamId: 't2', teamName: 'T2', configVersion: 1, commanderId: 'c1', commander: { id: 'c1', source: 'hosted' }, members: [] })

    const created = rt1.submit({ decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task', payload: {
      title: 'T1', objective: 'Obj', constraints: [], acceptance: ['Acc'], dependsOn: [], assigneeRole: 'worker',
    } }, 'run-1')
    assert.equal(created.ok, true)
    const exec = rt1.startExecution('run-1', 'task-1', { memberId: 'w1', connectorId: 'codex' })
    assert.equal(exec.ok, true)

    const p1 = rt1.publishViewObject('run-1', {
      id: 'data', type: 'table', title: '对比表', taskId: 'task-1',
      data: { columns: ['项', '值'], rows: [['v', 1]] },
    }, { kind: 'member', id: 'w1', role: 'worker' })
    assert.deepEqual(p1, {
      ok: true,
      replayed: false,
      id: 'data',
      type: 'table',
      renderer: 'html',
      version: 1,
      authorId: 'w1',
      ownerId: 'w1',
      taskId: 'task-1',
      executionId: exec.executionId,
    })

    const overwriteNoVer = rt1.publishViewObject('run-1', {
      id: 'data', type: 'table', title: '对比表', taskId: 'task-1',
      data: { columns: ['项', '值'], rows: [['v', 999]] },
    }, { kind: 'member', id: 'w1', role: 'worker' })
    assert.equal(overwriteNoVer.ok, false)
    assert.equal(overwriteNoVer.code, 'stale')
    assert.equal(rt1.getStatus('run-1').viewObjects[0].version, 1)

    const p2 = rt1.publishViewObject('run-1', {
      id: 'data', type: 'table', title: '对比表', taskId: 'task-1', expectedVersion: 1,
      data: { columns: ['项', '值'], rows: [['v', 2]] },
    }, { kind: 'member', id: 'w1', role: 'worker' })
    assert.equal(p2.version, 2)

    const tv = rt1.updateTeamView('run-1', {
      summary: '由指挥者维护的公共计划',
      pinnedRefs: [{ type: 'table', id: 'data' }],
    }, { kind: 'member', id: 'c1', role: 'commander' })
    assert.equal(tv.ok, true)

    assert.equal(rt1.getStatus('run-1').viewObjects.length, 1)
    assert.equal(rt1.getStatus('run-2').viewObjects.length, 0)

    const rt2 = createTeamRuntime({ statePath })
    const s1 = rt2.getStatus('run-1')
    assert.equal(s1.viewObjects.length, 1)
    assert.equal(s1.viewObjects[0].version, 2)
    assert.equal(s1.viewObjects[0].authorId, 'w1')
    assert.equal(s1.publicView.summary, '由指挥者维护的公共计划')
    assert.equal(s1.tasks[0].objective, 'Obj')
    assert.deepEqual(s1.tasks[0].acceptance, ['Acc'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('tools: update_team_view is commander-only while publish_view_object allows worker', async () => {
  const rt = createTeamRuntime()
  rt.bindSession('s-cmd', 'run-1', { projectId: 'p1', teamId: 't1', teamName: 'T1', configVersion: 1, commanderId: 'c1', commander: { id: 'c1', source: 'hosted' }, members: [{ id: 'w1', source: 'hosted', roleKind: 'worker' }] })
  const registered = new Map()
  const fakeCtx = {
    tools: {
      register(def, opts) {
        registered.set(def.name, { def, opts })
        return () => {}
      },
    },
  }
  const scopes = {
    's-cmd': { teamSessionId: 'run-1', memberId: 'c1', roleKind: 'commander' },
    's-wrk': { teamSessionId: 'run-1', memberId: 'w1', roleKind: 'worker' },
  }
  registerConcertoTools(fakeCtx, rt, { scopeOf: (session) => scopes[session?.id] ?? null })

  const cmdUpdate = await registered.get('update_team_view').def.execute({ summary: 'Plan A' }, { agent: { session: { id: 's-cmd' } }, callId: 'c-1' })
  assert.equal(cmdUpdate.ok, true)

  const wrkUpdate = await registered.get('update_team_view').def.execute({ summary: 'Hijack' }, { agent: { session: { id: 's-wrk' } }, callId: 'c-2' })
  assert.equal(wrkUpdate.ok, false)
  assert.equal(wrkUpdate.code, 'unauthorized')

  const wrkPublish = await registered.get('publish_view_object').def.execute({
    id: 'plan', type: 'mindmap', title: 'Plan', data: { root: { label: 'Root' } },
  }, { agent: { session: { id: 's-wrk' } }, callId: 'c-3' })
  assert.equal(wrkPublish.ok, true)
})


test('view_objects & layout: diagram, markdown mindmap, renderer validation, and deterministic layout', () => {
  const md = validateViewObjectInput({
    id: 'arch-map',
    type: 'mindmap',
    renderer: 'markmap',
    title: '架构导图',
    data: { markdown: '# 架构\n## 前端\n- 画布\n- 卡片\n## 运行时\n- 存储' },
  })
  assert.equal(md.ok, true)
  assert.equal(md.renderer, 'markmap')
  assert.equal(md.normalizedData.root.children.length, 2)

  const diag = validateViewObjectInput({
    id: 'dep-dag',
    type: 'diagram',
    renderer: 'svg',
    title: '任务依赖图',
    data: {
      layout: 'dag',
      nodes: [
        { id: 'n1', label: '步骤一', status: 'done' },
        { id: 'n2', label: '步骤二', status: 'in_progress' },
        { id: 'n3', label: '步骤三', status: 'pending' },
      ],
      edges: [
        { from: 'n1', to: 'n2', label: 'then' },
        { from: 'n2', to: 'n3' },
      ],
    },
  })
  assert.equal(diag.ok, true)
  assert.equal(diag.renderer, 'svg')

  assert.equal(validateViewObjectInput({
    id: 'bad-render',
    type: 'table',
    renderer: 'markmap',
    title: 'x',
    data: { columns: ['A'], rows: [['1']] },
  }).code, 'unsupported_renderer')

  const parsed = parseMarkdownToMindmap('# Root\n## A\n- A1\n## B\n- B1', 'Root')
  const mmLayout = layoutMindmapTree(parsed)
  assert.equal(mmLayout.nodes.length, 5)
  assert.ok(mmLayout.width > 0 && mmLayout.height > 0)

  const dagLayout = layoutDiagram(diag.normalizedData)
  assert.equal(dagLayout.nodes.length, 3)
  assert.equal(dagLayout.edges.length, 2)
  assert.ok(dagLayout.nodes[0].x < dagLayout.nodes[1].x)
  assert.ok(dagLayout.nodes[1].x < dagLayout.nodes[2].x)

  const scene = objectToExcalidrawScene({ id: 'dep-dag', type: 'diagram', title: '任务依赖图', data: diag.normalizedData })
  assert.equal(scene.type, 'excalidraw')
  assert.equal(scene.version, 2)
  assert.equal(scene.elements.length, 8)
})

test('runtime & tools: ownership, task/exec validation, CAS, mutationId idempotency, patch & on-demand reads', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-v96-'))
  const statePath = join(dir, 'runtime.json')
  try {
    const rt = createTeamRuntime({ statePath })
    rt.bindSession('s-cmd', 'run-1', {
      projectId: 'p1',
      teamId: 't1',
      teamName: 'Team 1',
      configVersion: 1,
      commanderId: 'c1',
      commander: { id: 'c1', source: 'hosted' },
      members: [
        { id: 'w1', source: 'hosted', roleKind: 'worker' },
        { id: 'w2', source: 'hosted', roleKind: 'worker' },
      ],
    })
    rt.submit({
      decisionId: 'd1',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: { title: 'Task 1', objective: 'Obj 1', constraints: [], acceptance: ['Ok'], dependsOn: [], assigneeRole: 'worker' },
    }, 'run-1')
    rt.submit({
      decisionId: 'd2',
      expectedPlanRevision: 2,
      action: 'create_task',
      payload: { title: 'Task 2', objective: 'Obj 2', constraints: [], acceptance: ['Ok'], dependsOn: [], assigneeRole: 'worker' },
    }, 'run-1')
    const exec1 = rt.startExecution('run-1', 'task-1', { memberId: 'w1', connectorId: 'codex' })
    assert.equal(exec1.ok, true)

    const registered = new Map()
    const fakeCtx = { tools: { register(def, opts) { registered.set(def.name, { def, opts }); return () => {} } } }
    const scopes = {
      's-cmd': { teamSessionId: 'run-1', memberId: 'c1', roleKind: 'commander' },
      's-w1': { teamSessionId: 'run-1', memberId: 'w1', roleKind: 'worker', executionId: exec1.executionId },
      's-w2': { teamSessionId: 'run-1', memberId: 'w2', roleKind: 'worker' },
    }
    registerConcertoTools(fakeCtx, rt, { scopeOf: (session) => scopes[session?.id] ?? null })

    // w1 publishes checklist linked to task-1
    const pub = await registered.get('publish_view_object').def.execute({
      id: 'w1-checks',
      type: 'checklist',
      renderer: 'html',
      title: 'W1 检查项',
      taskId: 'task-1',
      mutationId: 'm-pub-1',
      data: { items: [{ id: 'c1', label: '第一步', checked: false }, { id: 'c2', label: '第二步', checked: false }] },
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-1' })
    assert.equal(pub.ok, true)
    assert.equal(pub.version, 1)
    assert.equal(pub.ownerId, 'w1')

    // Idempotent replay with same mutationId & payload
    const pubReplay = await registered.get('publish_view_object').def.execute({
      id: 'w1-checks',
      type: 'checklist',
      renderer: 'html',
      title: 'W1 检查项',
      taskId: 'task-1',
      mutationId: 'm-pub-1',
      data: { items: [{ id: 'c1', label: '第一步', checked: false }, { id: 'c2', label: '第二步', checked: false }] },
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-2' })
    assert.equal(pubReplay.replayed, true)
    assert.equal(pubReplay.version, 1)

    // Idempotency conflict if payload differs
    const pubConflict = await registered.get('publish_view_object').def.execute({
      id: 'w1-checks',
      type: 'checklist',
      renderer: 'html',
      title: 'Changed',
      taskId: 'task-1',
      mutationId: 'm-pub-1',
      data: { items: [{ id: 'c1', label: '第一步', checked: true }] },
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-3' })
    assert.equal(pubConflict.code, 'idempotency_conflict')

    // Neither w2 nor commander c1 can overwrite w1-owned object without editableBy
    const cmdHijack = await registered.get('publish_view_object').def.execute({
      id: 'w1-checks',
      type: 'checklist',
      title: 'Hijacked',
      data: { items: [{ id: 'c1', label: 'x', checked: true }] },
    }, { agent: { session: { id: 's-cmd' } }, callId: 'call-4' })
    assert.equal(cmdHijack.code, 'unauthorized')

    // w1 cannot reference another member's task or mismatched executionId
    const badTask = await registered.get('publish_view_object').def.execute({
      id: 'w1-bad',
      type: 'table',
      title: 'Bad',
      taskId: 'task-999',
      data: { columns: ['A'], rows: [['1']] },
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-5' })
    assert.equal(badTask.code, 'not_found')

    // Patch checklist with stale expectedVersion -> stale
    const stalePatch = await registered.get('patch_view_object').def.execute({
      id: 'w1-checks',
      expectedVersion: 99,
      op: 'upsert_items',
      items: [{ id: 'c1', label: '第一步', checked: true }],
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-6' })
    assert.equal(stalePatch.code, 'stale')

    // Patch checklist with expectedVersion: 1 -> v2
    const okPatch = await registered.get('patch_view_object').def.execute({
      id: 'w1-checks',
      expectedVersion: 1,
      mutationId: 'm-patch-1',
      op: 'upsert_items',
      items: [{ id: 'c1', label: '第一步', checked: true }, { id: 'c3', label: '第三步', checked: false }],
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-7' })
    assert.equal(okPatch.ok, true)
    assert.equal(okPatch.version, 2)
    assert.equal(okPatch.authorId, 'w1')

    // Patch replay preserves version
    const okPatchReplay = await registered.get('patch_view_object').def.execute({
      id: 'w1-checks',
      expectedVersion: 1,
      mutationId: 'm-patch-1',
      op: 'upsert_items',
      items: [{ id: 'c1', label: '第一步', checked: true }, { id: 'c3', label: '第三步', checked: false }],
    }, { agent: { session: { id: 's-w1' } }, callId: 'call-8' })
    assert.equal(okPatchReplay.replayed, true)
    assert.equal(okPatchReplay.version, 2)

    // Mindmap publish + patch + subtree read
    const mmPub = await registered.get('publish_view_object').def.execute({
      id: 'shared-map',
      type: 'mindmap',
      renderer: 'markmap',
      title: 'Shared Map',
      editableBy: ['worker'],
      data: { root: { id: 'root', label: 'Root', children: [{ id: 'b1', label: 'Branch 1', children: [{ id: 'l1', label: 'Leaf 1' }] }] } },
    }, { agent: { session: { id: 's-cmd' } }, callId: 'call-9' })
    assert.equal(mmPub.ok, true)

    // w2 can patch because editableBy includes 'worker', while authorId stays c1
    const mmPatch = await registered.get('patch_view_object').def.execute({
      id: 'shared-map',
      expectedVersion: 1,
      op: 'upsert_node',
      parentId: 'b1',
      node: { id: 'l2', label: 'Leaf 2' },
    }, { agent: { session: { id: 's-w2' } }, callId: 'call-10' })
    assert.equal(mmPatch.ok, true)
    assert.equal(mmPatch.version, 2)

    // get_team_status omits heavy viewObjects and exposes metadata-only viewObjectRefs
    const modelStatus = await registered.get('get_team_status').def.execute({}, { agent: { session: { id: 's-cmd' } }, callId: 'call-11' })
    assert.ok(Array.isArray(modelStatus.tasks))
    assert.equal(modelStatus.viewObjects, undefined)
    assert.equal(modelStatus.viewObjectRefs.length, 2)
    assert.equal(modelStatus.viewObjectRefs[0].data, undefined)

    // list_view_objects returns summaries
    const listed = await registered.get('list_view_objects').def.execute({ type: 'checklist' }, { agent: { session: { id: 's-cmd' } }, callId: 'call-12' })
    assert.equal(listed.ok, true)
    assert.equal(listed.objects.length, 1)
    assert.equal(listed.objects[0].version, 2)

    // read_view_object pinned to historical version 1 vs latest version 2 + slice
    const readV1 = await registered.get('read_view_object').def.execute({ id: 'w1-checks', version: 1 }, { agent: { session: { id: 's-cmd' } }, callId: 'call-13' })
    assert.equal(readV1.ok, true)
    assert.equal(readV1.version, 1)
    assert.equal(readV1.data.items.length, 2)

    const readV2Slice = await registered.get('read_view_object').def.execute({ id: 'w1-checks', offset: 1, limit: 1 }, { agent: { session: { id: 's-cmd' } }, callId: 'call-14' })
    assert.equal(readV2Slice.version, 2)
    assert.equal(readV2Slice.data.items.length, 1)
    assert.equal(readV2Slice.data.items[0].id, 'c2')

    const readSubtreeShallow = await registered.get('read_view_object').def.execute({ id: 'shared-map', subtreeNodeId: 'b1', maxDepth: 1 }, { agent: { session: { id: 's-w2' } }, callId: 'call-15' })
    assert.equal(readSubtreeShallow.data.root.id, 'b1')
    assert.equal(readSubtreeShallow.data.root.truncatedChildrenCount, 2)
    assert.equal(readSubtreeShallow.authorId, 'c1')

    const readSubtree = await registered.get('read_view_object').def.execute({ id: 'shared-map', subtreeNodeId: 'b1', maxDepth: 2 }, { agent: { session: { id: 's-w2' } }, callId: 'call-16' })
    assert.equal(readSubtree.data.root.id, 'b1')
    assert.equal(readSubtree.data.root.children.length, 2)
    assert.equal(readSubtree.authorId, 'c1')

    // Rehydrate runtime from disk and ensure history & latest version survive restart
    const rt2 = createTeamRuntime({ statePath })
    const histRead = rt2.readViewObject('run-1', { id: 'w1-checks', version: 1 })
    assert.equal(histRead.ok, true)
    assert.equal(histRead.data.items.length, 2)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('P5 domain: board, html security, swimlane layout, refs, sections, userLayout, attention & activity stream', () => {
  // 1) html validation rejects scripts, event handlers, javascript: URLs, @import & external URLs
  for (const badHtml of [
    '<script>alert(1)</script>',
    '<img src="x" onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<iframe src="https://evil.test"></iframe>',
    '<img src="https://evil.test/a.png">',
  ]) {
    assert.equal(validateViewObjectInput({
      id: 'bad-html',
      type: 'html',
      title: 'bad',
      data: { html: badHtml },
    }).ok, false, 'should reject unsafe html: ' + badHtml)
  }
  assert.equal(validateViewObjectInput({
    id: 'bad-css',
    type: 'html',
    title: 'bad css',
    data: { html: '<div>ok</div>', css: '@import url(https://evil.test/x.css);' },
  }).ok, false)
  assert.equal(validateViewObjectInput({
    id: 'good-html',
    type: 'html',
    title: '良性 HTML 卡片',
    size: 'm',
    caption: '内联摘要',
    data: { html: '<div class="metric"><strong>98%</strong></div>', css: '.metric { color: var(--brand); }' },
  }).ok, true)

  // 2) board validation + size/caption/layoutHints
  assert.equal(validateViewObjectInput({
    id: 'arch-board',
    type: 'board',
    title: '架构草图白板',
    size: 'l',
    caption: '含泳道布局hints',
    layoutHints: { direction: 'LR' },
    data: {
      nodes: [
        { id: 'n1', label: '步骤一', status: 'done', memberId: 'w1', stage: 0 },
        { id: 'n2', label: '步骤二', status: 'in_progress', memberId: 'w2', stage: 1 },
      ],
      edges: [{ from: 'n1', to: 'n2', label: 'handover' }],
    },
  }).ok, true)

  // 3) swimlane layout computes distinct member lanes
  const sw = layoutDiagram({
    layout: 'swimlane',
    nodes: [
      { id: 'a', label: '后端设计', status: 'done', memberId: 'w1', stage: 0 },
      { id: 'b', label: '前端实现', status: 'running', memberId: 'w2', stage: 1 },
    ],
    edges: [{ from: 'a', to: 'b' }],
  })
  assert.equal(sw.lanes.length, 2)
  assert.notEqual(sw.nodes[0].y, sw.nodes[1].y)
  assert.ok(sw.edges[0].path.includes('M '))

  // 4) parseViewObjectReferences & resolveViewObjectRef
  const tokens = parseViewObjectReferences([
    '摘要段落',
    'table:data',
    '```concerto',
    'ref: diagram:dep-dag',
    'renderer: svg',
    'size: l',
    '```',
  ].join('\n'))
  assert.equal(tokens.length, 3)
  assert.equal(tokens[1].type, 'table')
  assert.equal(tokens[2].renderer, 'svg')
  assert.equal(tokens[2].size, 'l')
  assert.equal(resolveViewObjectRef([{ id: 'data', type: 'table', version: 1 }], tokens[1]).ok, true)
  assert.equal(resolveViewObjectRef([{ id: 'data', type: 'mindmap', version: 1 }], tokens[1]).code, 'type_mismatch')

  // 5) sections validation
  assert.equal(validatePublicViewPatch({
    summary: '团队摘要',
    sections: [{ title: '核心看板', refs: [{ type: 'table', id: 'data', size: 's' }] }],
  }).ok, true)

  // 6) runtime: userLayout survives semantic version bump, activity pagination + 4000-char cap, attention urgency & pinned history
  const dir = mkdtempSync(join(tmpdir(), 'concerto-p5-'))
  try {
    const rt = createTeamRuntime({ statePath: join(dir, 'state.json') })
    rt.bindSession('s1', 'run-p5', {
      teamId: 't-p5',
      teamName: 'P5 Verify',
      configVersion: 1,
      commanderId: 'c1',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
    })
    rt.submit({
      decisionId: 'd1',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: {
        title: '验证任务',
        objective: '测试 P5 活动与布局持久化',
        acceptance: ['ok'],
        constraints: [],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    }, 'run-p5')
    const execId = rt.startExecution('run-p5', 'task-1', { memberId: 'w1', connectorId: 'codex' }).executionId
    rt.recordExecutionEvent('run-p5', 'task-1', { type: 'output.message', text: 'A'.repeat(4500) }, execId)
    rt.recordExecutionEvent('run-p5', 'task-1', { type: 'approval.requested', requestId: 'req-p5', payload: { command: 'npm test' } }, execId)

    const actPage = rt.getMemberActivity('run-p5', { memberId: 'w1', limit: 1 })
    assert.equal(actPage.ok, true)
    assert.equal(actPage.items.length, 1)
    assert.equal(actPage.hasMore, true)
    const olderPage = rt.getMemberActivity('run-p5', { memberId: 'w1', before: actPage.nextBefore, limit: 10 })
    const longMsg = olderPage.items.find((it) => it.kind === 'message')
    assert.equal(longMsg.truncated, true)
    assert.equal(longMsg.text.length, 4000)

    const status = rt.getStatus('run-p5')
    assert.ok(status.attention.length >= 1)
    assert.equal(status.attention[0].kind, 'approval')
    assert.ok(Array.isArray(status.memberActivitySummary.w1))

    rt.publishViewObject('run-p5', {
      id: 'b1',
      type: 'board',
      title: '白板',
      data: { nodes: [{ id: 'n1', label: 'A', status: 'done' }], edges: [] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    const savedLayout = rt.updateViewObjectUserLayout('run-p5', {
      id: 'b1',
      expectedUserVersion: 0,
      offsets: { n1: { dx: 40, dy: 25 } },
    })
    assert.equal(savedLayout.ok, true)
    assert.equal(savedLayout.userLayout.version, 1)

    // Pin version 1 via updateTeamView pinnedRefs, publish 22 more versions -> v1 stays retained beyond 20-cap
    rt.updateTeamView('run-p5', {
      pinnedRefs: [{ type: 'board', id: 'b1', version: 1 }],
    }, { kind: 'member', id: 'c1', role: 'commander' })
    for (let v = 2; v <= 23; v += 1) {
      const next = rt.publishViewObject('run-p5', {
        id: 'b1',
        type: 'board',
        expectedVersion: v - 1,
        title: '白板 v' + v,
        data: { nodes: [{ id: 'n1', label: 'A' + v, status: 'done' }], edges: [] },
      }, { kind: 'member', id: 'c1', role: 'commander' })
      assert.equal(next.ok, true)
    }
    const latestObj = rt.getStatus('run-p5').viewObjects.find((o) => o.id === 'b1')
    assert.equal(latestObj.userLayout.offsets.n1.dx, 40)
    assert.equal(rt.readViewObject('run-p5', { id: 'b1', version: 1 }).ok, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Step 3 contracts: requiredViews gating, semanticKind live sync, and userPinnedRefs isolation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-step3-'))
  try {
    const rt = createTeamRuntime({ statePath: join(dir, 'runtime.json') })
    rt.bindSession('host-s3', 'run-s3', {
      projectId: 'p-s3',
      teamId: 't-s3',
      teamName: 'Step3 Contracts',
      configVersion: 1,
      commanderId: 'c1',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
    })

    // Create task with both non-blocking recommended view and acceptance-blocking view
    const t1 = rt.submit({
      decisionId: 's3-d1',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: {
        title: 'Task Gate',
        objective: 'Check requiredViews',
        constraints: [],
        acceptance: ['unit tests pass'],
        dependsOn: [],
        assigneeRole: 'worker',
        requiredViews: [
          'mindmap:notes',
          { type: 'checklist', id: 'accept-gate', title: 'Gate Checklist', requiredForAcceptance: true },
        ],
      },
    }, 'run-s3')
    assert.equal(t1.ok, true)

    const initialStatus = rt.getStatus('run-s3')
    assert.equal(initialStatus.missingRequiredViews.length, 2)

    rt.startExecution('run-s3', 'task-1', { memberId: 'w1' })

    // Direct runtime submitResult attempting immediate completion is blocked when requiredForAcceptance view is missing
    const blockedDone = rt.submitResult({
      taskId: 'task-1',
      commandId: 'cmd-done-1',
      summary: 'done without gate checklist',
      checksPassed: true,
    }, 'run-s3')
    assert.equal(blockedDone.ok, false)
    assert.equal(blockedDone.code, 'precondition_failed')

    // Publishing accept-gate unlocks completion even when non-blocking mindmap:notes is still missing
    const gatePub = rt.publishViewObject('run-s3', {
      id: 'accept-gate',
      type: 'checklist',
      title: 'Gate Checklist',
      taskId: 'task-1',
      data: { items: [{ id: 'c1', label: 'Done', checked: true, taskId: 'task-1' }] },
    }, { kind: 'member', id: 'w1', role: 'worker' })
    assert.equal(gatePub.ok, true)

    const passedDone = rt.submitResult({
      taskId: 'task-1',
      commandId: 'cmd-done-2',
      summary: 'all verified',
      checksPassed: true,
    }, 'run-s3')
    assert.equal(passedDone.ok, true)
    assert.equal(passedDone.state, 'completed')

    // Review gate also blocks submitReview(pass) until requiredForAcceptance view is published
    const tRev = rt.submit({
      decisionId: 's3-d-rev',
      expectedPlanRevision: 2,
      action: 'create_task',
      payload: {
        title: 'Review Gate',
        objective: 'Verify review gate blocks missing acceptance view',
        constraints: [],
        acceptance: ['ok'],
        dependsOn: [],
        assigneeRole: 'worker',
        requiresReview: true,
        requiredViews: [{ type: 'checklist', id: 'rev-gate', requiredForAcceptance: true }],
      },
    }, 'run-s3')
    assert.equal(tRev.ok, true)
    const revSubmitted = rt.submitResult({
      taskId: tRev.result.taskId,
      commandId: 'cmd-rev-sub',
      summary: 'awaiting review',
      checksPassed: true,
    }, 'run-s3', { kind: 'member', id: 'w1', role: 'worker' })
    assert.equal(revSubmitted.ok, true)
    assert.equal(revSubmitted.state, 'review')

    const revBlocked = rt.submitReview({
      taskId: tRev.result.taskId,
      commandId: 'cmd-rev-pass-1',
      verdict: 'pass',
      reason: 'missing gate',
    }, 'run-s3', { kind: 'member', id: 'c1', role: 'commander' })
    assert.equal(revBlocked.ok, false)
    assert.equal(revBlocked.code, 'precondition_failed')

    rt.publishViewObject('run-s3', {
      id: 'rev-gate',
      type: 'checklist',
      title: 'Rev Gate Checklist',
      taskId: tRev.result.taskId,
      data: { items: [{ id: 'r1', label: 'Reviewed', checked: true, taskId: tRev.result.taskId }] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    const revPassed = rt.submitReview({
      taskId: tRev.result.taskId,
      commandId: 'cmd-rev-pass-2',
      verdict: 'pass',
      reason: 'gate published',
    }, 'run-s3', { kind: 'member', id: 'c1', role: 'commander' })
    assert.equal(revPassed.ok, true)
    assert.equal(revPassed.state, 'completed')

    // Remaining missingRequiredViews warns only about mindmap:notes
    assert.deepEqual(rt.getStatus('run-s3').missingRequiredViews.map((m) => `${m.type}:${m.id}`), ['mindmap:notes'])

    // semanticKind: live_execution projects task state onto diagram nodes; snapshot freezes authored state
    const t2 = rt.submit({
      decisionId: 's3-d2',
      expectedPlanRevision: 3,
      action: 'create_task',
      payload: {
        title: 'Live Graph Task',
        objective: 'Track live node',
        constraints: [],
        acceptance: ['ok'],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    }, 'run-s3')
    assert.equal(t2.ok, true)
    const liveTaskId = t2.result.taskId
    rt.startExecution('run-s3', liveTaskId, { memberId: 'w1', connectorId: 'codex' })

    const livePub = rt.publishViewObject('run-s3', {
      id: 'live-flow',
      type: 'diagram',
      semanticKind: 'live_execution',
      title: 'Realtime Flow',
      data: { layout: 'dag', nodes: [{ id: 'n1', label: 'Exec', taskId: liveTaskId, status: 'pending' }], edges: [] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    assert.equal(livePub.semanticKind, 'live_execution')

    const snapPub = rt.publishViewObject('run-s3', {
      id: 'snap-flow',
      type: 'diagram',
      semanticKind: 'snapshot',
      snapshotAt: '2026-11-16T00:00:00Z',
      title: 'Frozen Flow',
      data: { layout: 'dag', nodes: [{ id: 'n1', label: 'Exec', taskId: liveTaskId, status: 'pending' }], edges: [] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    assert.equal(snapPub.semanticKind, 'snapshot')

    const statusLive = rt.getStatus('run-s3')
    const liveObj = statusLive.viewObjects.find((o) => o.id === 'live-flow')
    const snapObj = statusLive.viewObjects.find((o) => o.id === 'snap-flow')
    assert.equal(liveObj.data.nodes[0].status, 'running')
    assert.equal(liveObj.data.nodes[0].runtimeSynced, true)
    assert.equal(snapObj.data.nodes[0].status, 'pending')

    // User pinned preferences survive commander update_team_view
    const pref = rt.updateUserViewPreferences('run-s3', { toggleRef: 'diagram:live-flow' })
    assert.deepEqual(pref.userPinnedRefs, ['diagram:live-flow'])
    rt.updateTeamView('run-s3', {
      summary: '当前进展：task-2 进行中\n关键问题：无\n下一步：等待交付',
      pinnedRefs: [{ type: 'checklist', id: 'accept-gate' }],
    }, { kind: 'member', id: 'c1', role: 'commander' })
    const afterCmd = rt.getStatus('run-s3')
    assert.deepEqual(afterCmd.userPinnedRefs, ['diagram:live-flow'])
    assert.equal(afterCmd.publicView.pinnedRefs[0].id, 'accept-gate')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Step 5 layout: font-aware CJK width measurement, mindmap fold parity, and edge semantics', () => {
  assert.ok(approxLineWidth('中文长标签测试', 16) > approxLineWidth('中文长标签测试', 12))

  const smallDiag = layoutDiagram({
    layout: 'dag',
    nodes: [
      { id: 'a', label: '需求分析与拆解阶段测试标签', status: 'completed', critical: true },
      { id: 'b', label: '接口联调与异常恢复阶段检查', status: 'blocked' },
      { id: 'c', label: '未知执行确认', status: 'unknown' },
    ],
    edges: [
      { from: 'a', to: 'b', label: '依赖阻塞说明' },
      { from: 'a', to: 'c' },
    ],
  }, { fontSize: 12 })
  const bigDiag = layoutDiagram({
    layout: 'dag',
    nodes: [
      { id: 'a', label: '需求分析与拆解阶段测试标签', status: 'completed', critical: true },
      { id: 'b', label: '接口联调与异常恢复阶段检查', status: 'blocked' },
      { id: 'c', label: '未知执行确认', status: 'unknown' },
    ],
    edges: [
      { from: 'a', to: 'b', label: '依赖阻塞说明' },
      { from: 'a', to: 'c' },
    ],
  }, { fontSize: 16 })

  assert.ok(bigDiag.nodes[0].width > smallDiag.nodes[0].width)
  assert.equal(smallDiag.edges.find((e) => e.to === 'b').semantic, 'blocked')
  assert.equal(smallDiag.edges.find((e) => e.to === 'c').semantic, 'unknown')

  const largeTree = {
    id: 'root',
    label: 'Root',
    children: [
      { id: 'b1', label: 'Branch 1', children: [{ id: 'b1.0', label: 'L1' }, { id: 'b1.1', label: 'L2' }, { id: 'b1.2', label: 'L3' }] },
      { id: 'b2', label: 'Branch 2', children: [{ id: 'b2.0', label: 'L4' }, { id: 'b2.1', label: 'L5' }, { id: 'b2.2', label: 'L6' }] },
      { id: 'b3', label: 'Branch 3', children: [{ id: 'b3.0', label: 'L7' }] },
    ],
  }
  const autoFold = defaultPreviewCollapsedIds(largeTree, 8, 1)
  assert.ok(autoFold.length >= 2)
  const mmLayout = layoutMindmapTree(largeTree, new Set(autoFold), { fontSize: 14 })
  assert.ok(mmLayout.hiddenDescendantTotal >= 6)
  assert.ok(mmLayout.nodes.some((n) => n.collapsed && n.hiddenCount > 0))
})

test('P1/P2 fixes: mindmap-to-svg keeps descendants, snapshot checklist freezes checked state, and acceptance prose does not force views', () => {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-fixes-'))
  try {
    // Fix 1: mindmap -> svg full hierarchical conversion (root + 2 descendant levels)
    const converted = mindmapToDiagramData({
      root: {
        id: 'root',
        label: '根节点',
        children: [
          {
            id: 'l1',
            label: '一级子节点',
            status: 'running',
            children: [
              { id: 'l2a', label: '二级子节点A', status: 'done' },
              { id: 'l2b', label: '二级子节点B', status: 'pending' },
            ],
          },
        ],
      },
    })
    assert.equal(converted.nodes.length, 4)
    assert.equal(converted.edges.length, 3)

    const rt = createTeamRuntime({ statePath: join(dir, 'runtime.json') })
    rt.bindSession('host-fix', 'run-fix', {
      projectId: 'p-fix',
      teamId: 't-fix',
      teamName: 'Fix Verify',
      configVersion: 1,
      commanderId: 'c1',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
    })

    // Fix 3a: invalid requiredViews returns structured error instead of silent drop
    const badReqView = rt.submit({
      decisionId: 'd-bad-rv',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: {
        title: 'Bad RV',
        objective: 'Obj',
        constraints: [],
        acceptance: ['ok'],
        dependsOn: [],
        assigneeRole: 'worker',
        requiredViews: ['bogus:nope'],
      },
    }, 'run-fix')
    assert.equal(badReqView.ok, false)
    assert.equal(badReqView.code, 'invalid')

    // Fix 3b: acceptance prose saying "无需生成 diagram:architecture" must NOT force diagram:architecture
    const negTask = rt.submit({
      decisionId: 'd-neg',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: {
        title: 'Negation acceptance test',
        objective: 'Ensure prose ref does not force artifact',
        constraints: [],
        acceptance: ['无需生成 diagram:architecture', '完成文本总结即可'],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    }, 'run-fix')
    assert.equal(negTask.ok, true)
    assert.equal(rt.getStatus('run-fix').missingRequiredViews.length, 0)

    // Fix 2: snapshot checklist stays unchecked even after linked task completes
    rt.publishViewObject('run-fix', {
      id: 'snap-check',
      type: 'checklist',
      semanticKind: 'snapshot',
      snapshotAt: '2026-11-16T08:00:00Z',
      title: '历史快照清单',
      taskId: 'task-1',
      data: { items: [{ id: 'i1', label: '任务未完成时的快照项', checked: false, taskId: 'task-1' }] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    rt.publishViewObject('run-fix', {
      id: 'live-check',
      type: 'checklist',
      semanticKind: 'live_execution',
      title: '实时清单',
      taskId: 'task-1',
      data: { items: [{ id: 'i1', label: '实时联动项', checked: false, taskId: 'task-1' }] },
    }, { kind: 'member', id: 'c1', role: 'commander' })

    const doneRes = rt.submitResult({
      taskId: 'task-1',
      commandId: 'cmd-neg-done',
      summary: 'completed without diagram:architecture',
      checksPassed: true,
    }, 'run-fix')
    assert.equal(doneRes.ok, true)
    assert.equal(doneRes.state, 'completed')

    const status = rt.getStatus('run-fix')
    const snapCard = status.viewObjects.find((o) => o.id === 'snap-check')
    const liveCard = status.viewObjects.find((o) => o.id === 'live-check')
    assert.equal(snapCard.data.items[0].checked, false)
    assert.equal(liveCard.data.items[0].checked, true)
    assert.equal(rt.readViewObject('run-fix', { id: 'snap-check' }).data.items[0].checked, false)

    // Team-level requiredForAcceptance: true blocks completeExecution / submitResult / submitReview until published,
    // while advisory team requiredViews do not block completion.
    const teamBlocked = missingAcceptanceViewsForTask(
      { taskId: 'task-x', requiredViews: [{ type: 'checklist', id: 'gate', requiredForAcceptance: true }] },
      [],
      ['mindmap:plan', { type: 'checklist', id: 'gate', requiredForAcceptance: true }, { type: 'table', id: 'team-matrix', requiredForAcceptance: true }],
    )
    assert.deepEqual(teamBlocked.map((v) => `${v.type}:${v.id}`), ['checklist:gate', 'table:team-matrix'])

    rt.bindSession('host-team-gate', 'run-team-gate', {
      projectId: 'p-tg',
      teamId: 't-tg',
      teamName: 'Team Gate',
      configVersion: 1,
      commanderId: 'c1',
      commander: { id: 'c1', source: 'hosted' },
      members: [{ id: 'w1', source: 'external', connector: 'codex', roleKind: 'worker' }],
      requiredViews: [
        'mindmap:advisory-plan',
        { type: 'checklist', id: 'release-gate', requiredForAcceptance: true },
      ],
    })
    rt.submit({
      decisionId: 'd-tg-1',
      expectedPlanRevision: 1,
      action: 'create_task',
      payload: {
        title: 'Task governed by team template gate',
        objective: 'Check completeExecution with team requiredForAcceptance',
        constraints: [],
        acceptance: ['ok'],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    }, 'run-team-gate')
    rt.startExecution('run-team-gate', 'task-1', { memberId: 'w1', connectorId: 'codex' })
    const blockedExec = rt.completeExecution('run-team-gate', 'task-1', { summary: 'done', checksPassed: true })
    assert.equal(blockedExec.ok, false)
    assert.equal(blockedExec.code, 'precondition_failed')
    assert.match(blockedExec.detail, /checklist:release-gate/)

    // Second task tests direct submitResult blocked by team-level requiredForAcceptance: true
    rt.submit({
      decisionId: 'd-tg-2',
      expectedPlanRevision: 2,
      action: 'create_task',
      payload: {
        title: 'Direct submitResult gated by team gate',
        objective: 'Check submitResult with team requiredForAcceptance',
        constraints: [],
        acceptance: ['ok'],
        dependsOn: [],
        assigneeRole: 'worker',
      },
    }, 'run-team-gate')
    const blockedDirect = rt.submitResult({ taskId: 'task-2', summary: 'done', checksPassed: true }, 'run-team-gate')
    assert.equal(blockedDirect.ok, false)
    assert.equal(blockedDirect.code, 'precondition_failed')
    assert.match(blockedDirect.detail, /checklist:release-gate/)

    rt.publishViewObject('run-team-gate', {
      id: 'release-gate',
      type: 'checklist',
      title: '团队发布门禁',
      data: { items: [{ id: 'i1', label: 'Ready', checked: true }] },
    }, { kind: 'member', id: 'c1', role: 'commander' })
    // Advisory mindmap:advisory-plan is still missing, yet completion now succeeds
    const unblockedExec = rt.completeExecution('run-team-gate', 'task-1', { summary: 'done', checksPassed: true })
    assert.equal(unblockedExec.ok, true)
    assert.equal(unblockedExec.state, 'completed')
    const unblockedDirect = rt.submitResult({ taskId: 'task-2', summary: 'done', checksPassed: true }, 'run-team-gate')
    assert.equal(unblockedDirect.ok, true)
    assert.equal(unblockedDirect.state, 'completed')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
