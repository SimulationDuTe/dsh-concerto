import test from 'node:test'
import assert from 'node:assert/strict'
import { approveFixturePlan } from './fixtures/approve-plan.mjs'
import { registerHooks } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { createTaskRunner } from '../packages/dsh-concerto/lib/runner.mjs'
import { buildToolDefinitions, WORKER_TOOL_SCHEMAS, REVIEWER_TOOL_SCHEMAS } from '../packages/dsh-concerto/lib/tools.mjs'
import { buildMemberSystemPrompt, WORKFLOW_SKILLS } from '../packages/dsh-concerto/lib/domain/runtime_skills.mjs'

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@deepseek-ai/schemastery') {
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent('const z = new Proxy(() => z, { get: () => z }); export default z') }
    }
    return next(specifier, context)
  },
})
const { apply: applyMember } = await import('../packages/dsh-concerto/lib/member.mjs')
const { apply: applyConcerto } = await import('../packages/dsh-concerto/lib/index.js')
hook.deregister()

function createHarness({ root, team, controllerImpl = null, adapterStart = null, askUser = null } = {}) {
  const statePath = join(root, 'teams.json')
  const runtimePath = join(root, 'runtime.json')
  const teamsBundleDir = join(root, 'bundle')
  createTeamStore({ statePath }).saveTeam({ team })

  const sessions = new Map()
  const agents = new Map()
  const routes = new Map()
  const tools = new Map()
  const cleanups = []

  const definitions = new Map()
  definitions.set(team.id, {
    generation: { key: `gen-${team.id}` },
    config: { plugins: [] },
  })
  for (const m of team.members) {
    if (m.source !== 'hosted') continue
    const presetId = `${team.id}--${m.id}`
    const plugins = m.toolProfile === 'readonly'
      ? [
          { name: '@deepseek-ai/dsh-agent-instructions', config: {} },
          { name: '@deepseek-ai/dsh-tool-fs', config: { read: true, write: false, edit: false } },
          { name: '@deepseek-ai/dsh-tool-fs-search', config: {} },
        ]
      : [
          { name: '@deepseek-ai/dsh-agent-instructions', config: {} },
          { name: process.platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash', config: {} },
          { name: '@deepseek-ai/dsh-tool-fs', config: { read: true, write: true, edit: true } },
          { name: '@deepseek-ai/dsh-tool-fs-search', config: {} },
        ]
    definitions.set(presetId, {
      generation: { key: `gen-${presetId}` },
      config: { plugins },
    })
  }

  const ctx = {
    logger: { error() {}, warn() {} },
    sessions: { get: (id) => sessions.get(id), list: async () => [...sessions.values()] },
    agents: { get: (id) => agents.get(id), list: async () => [...agents.values()] },
    agentPresets: {
      presetForSession: (s) => s?.preset ?? null,
      definitions,
    },
    sessionController: controllerImpl || {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${sessions.size + 1}`
        sessions.set(sid, { id: sid, preset: agentPreset, header: cwd ? { cwd } : {} })
        agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        return { sessionId: sid }
      },
      async prompt() {},
    },
    get(name) { return this[name] },
    inject(services, fn) {
      assert.deepEqual(services, ['userQuestions'])
      if (askUser) fn({ userQuestions: { ask: askUser }, effect: (run) => cleanups.push(run()) })
    },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: {
      register(def) { tools.set(def.name, def); return () => {} },
      get(name) { return tools.get(name) },
      schemas(key) {
        if (String(key).includes('--r1') || String(key).includes('--r2')) return [{ name: 'read' }, { name: 'glob' }, { name: 'grep' }]
        if (String(key).includes('--w1')) return [{ name: 'read' }, { name: 'write' }, { name: 'edit' }, { name: 'glob' }, { name: 'grep' }, { name: process.platform === 'win32' ? 'pwsh' : 'bash' }]
        return []
      },
    },
  }

  applyConcerto(ctx, { statePath, runtimePath, teamsBundleDir, codexCwd: root })

  if (adapterStart) {
    // Allow testing external connector prompt/dynamic tools through routes or custom runner directly
  }

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
    assert.ok(handler, `missing route ${path}`)
    await handler(req, {
      writeHead(code) { status = code },
      end(text) { value = text ? JSON.parse(text) : null },
    })
    return { status, value }
  }

  function callTool(name, sessionId, args = {}, callId = `call-${Math.random().toString(16).slice(2)}`) {
    const def = tools.get(name)
    assert.ok(def, `missing tool ${name}`)
    return def.execute(args, { callId, signal: new AbortController().signal, agent: { id: sessionId, session: sessions.get(sessionId) } })
  }

  function dispose() {
    for (const c of cleanups) {
      if (typeof c === 'function') c()
    }
  }

  return { root, runtimePath, statePath, teamsBundleDir, sessions, agents, tools, request, callTool, dispose }
}

test('Hosted member question reaches Commander and the explicit user answer starts a second turn in the original session', { timeout: 5000 }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-hosted-question-'))
  const team = {
    id: 'questions', name: 'Questions', commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', source: 'hosted', roleKind: 'worker', toolProfile: 'coding' }],
  }
  const memberPrompts = [], pending = Promise.withResolvers(), firstIdle = Promise.withResolvers(), secondPrompt = Promise.withResolvers()
  const secondIdle = Promise.withResolvers()
  const h = createHarness({ root, team,
    askUser: async ({ agent, questions }) => {
      assert.equal(agent.id, 'cmd')
      assert.equal(questions[0].question, 'Which output format?')
      return { answers: [{ id: questions[0].id, selected: [], custom: 'GLB' }] }
    },
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        h.sessions.set('worker', { id: 'worker', preset: agentPreset, header: { cwd } })
        h.agents.set('worker', { status: 'idle', whenIdle() {
          if (memberPrompts.length === 2) secondIdle.resolve()
          return firstIdle.promise
        } })
        return { sessionId: 'worker' }
      },
      async prompt(input) {
        if (input.requestId.startsWith('req-member-question-')) pending.resolve(input)
        if (input.sessionId === 'worker') {
          memberPrompts.push(input)
          if (memberPrompts.length === 1) {
            const asked = await h.callTool('ask_task_question', 'worker', { question: 'Which output format?' })
            assert.equal(asked.status, 'pending')
          } else secondPrompt.resolve(input)
        }
        return { accepted: true }
      },
    },
  })
  t.after(() => { firstIdle.resolve(); h.dispose(); rmSync(root, { recursive: true, force: true }) })
  h.sessions.set('cmd', { id: 'cmd', preset: 'questions', header: { cwd: root } })
  assert.equal((await h.request('/concerto/session?sessionId=cmd')).status, 200)
  const revision = await approveFixturePlan(h.callTool, h.request, 'cmd')
  assert.equal((await h.callTool('submit_decision', 'cmd', { decisionId: 'task', expectedPlanRevision: revision,
    action: 'create_task', payload: { title: 'Export scene', objective: 'Export one scene', constraints: [], acceptance: ['File is readable'], dependsOn: [], assigneeRole: 'worker' },
  })).ok, true)
  const dispatched = await h.callTool('dispatch_task', 'cmd', { taskId: 'task-1', commandId: 'dispatch', memberId: 'w1' })
  assert.equal(dispatched.ok, true)
  assert.equal((await pending.promise).sessionId, 'cmd')
  const snapshot = await h.callTool('get_team_status', 'cmd')
  const { requestId } = snapshot.requests[0]
  assert.equal((await h.callTool('ask_member_question_user', 'worker', { requestId })).code, 'unauthorized')
  const answered = await h.callTool('ask_member_question_user', 'cmd', { requestId })
  assert.equal(answered.status, 'decided')
  assert.equal(memberPrompts.length, 1)
  firstIdle.resolve()
  const resumed = await secondPrompt.promise
  assert.equal(resumed.sessionId, 'worker')
  const input = JSON.parse(resumed.content[0].text.split('\n').at(-1))
  assert.deepEqual(input.answer, ['GLB'])
  assert.equal(input.sources[0].source, 'user')
  await secondIdle.promise
  const finished = await h.callTool('get_team_status', 'cmd')
  assert.equal(finished.requests[0].status, 'delivered')
  assert.equal(finished.executions[0].executionId, dispatched.executionId)
})

test('Step 1: member.mjs composes core protocol, role duties, skill index, and persona without replacing defaults', () => {
  const recorded = []
  const makeCtx = () => ({
    systemPrompt: {
      section(entry) {
        recorded.push(entry)
        return () => {}
      },
    },
    effect(fn) { fn() },
  })

  applyMember(makeCtx(), {
    memberId: 'c1',
    roleKind: 'commander',
    roleId: 'lead',
    source: 'hosted',
    persona: 'Focus on minimal safe incremental diffs and concise Chinese briefings.',
  })
  assert.equal(recorded.length, 1)
  const cmdPrompt = recorded[0].text
  assert.match(cmdPrompt, /\[Concerto Collaboration Core\]/)
  assert.match(cmdPrompt, /\[Role Responsibilities: Commander\]/)
  assert.match(cmdPrompt, /\[Workflow Skill Index/)
  assert.match(cmdPrompt, /project-skill-authoring/)
  assert.match(cmdPrompt, /Prefer updating an appropriate project skill/)
  assert.match(cmdPrompt, /search_experience.*record_experience/)
  assert.match(cmdPrompt, /\[Configured Role Persona/)
  assert.match(cmdPrompt, /Focus on minimal safe incremental diffs/)
  // Must not leak other roles' full duty blocks into Commander
  assert.doesNotMatch(cmdPrompt, /\[Role Responsibilities: Worker\]/)
  assert.doesNotMatch(cmdPrompt, /\[Role Responsibilities: Reviewer\]/)

  applyMember(makeCtx(), {
    memberId: 'w1',
    roleKind: 'worker',
    source: 'hosted',
    toolProfile: 'coding',
    persona: 'Prefer TypeScript strict types.',
  })
  const workerPrompt = recorded[1].text
  assert.match(workerPrompt, /\[Concerto Collaboration Core\]/)
  assert.match(workerPrompt, /\[Role Responsibilities: Worker\]/)
  assert.match(workerPrompt, /Prefer TypeScript strict types\./)
  assert.doesNotMatch(workerPrompt, /\[Role Responsibilities: Commander\]/)
  // Skill index must not dump full tutorial bodies
  assert.doesNotMatch(workerPrompt, /### Table \(`type: "table"`/)

  // Descriptor-only or external members still inject nothing
  applyMember(makeCtx(), { memberId: 'w2', roleKind: 'worker', source: 'external', persona: 'ignored' })
  applyMember(makeCtx(), { memberId: 'w3', roleKind: 'worker', source: 'hosted', descriptorOnly: true, persona: 'ignored' })
  assert.equal(recorded.length, 2)

  // Reviewer prompt isolation check
  const revPrompt = buildMemberSystemPrompt({ memberId: 'r1', roleKind: 'reviewer', toolProfile: 'readonly', persona: 'Verify edge cases.' })
  assert.match(revPrompt, /\[Role Responsibilities: Reviewer\]/)
  assert.match(revPrompt, /Verify edge cases\./)
  assert.match(revPrompt, /submit_review\.verifiedExperienceRefs/)
  assert.doesNotMatch(revPrompt, /\[Role Responsibilities: Worker\]/)
})

test('Step 1 & 2: Hosted and Codex receive semantically consistent TaskAssignment prompts and complete tool schemas', async () => {
  const rt = createTeamRuntime()
  rt.bindSession('cmd-1', 'run-1', {
    projectId: 'proj-1',
    teamId: 't1',
    teamName: 'T1',
    commanderId: 'c1',
    commander: { id: 'c1', source: 'hosted' },
    requiredViews: ['mindmap:plan'],
    members: [
      { id: 'w-hosted', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'w-codex', roleKind: 'worker', source: 'external', connector: 'codex' },
    ],
  })
  for (const memberId of ['w-hosted', 'w-codex']) {
    assert.equal(rt.updateMemberDuties('run-1', {
      memberId, action: 'save', expectedVersion: 0, body: 'Include keyboard checks.',
    }, { kind: 'member', id: 'c1', role: 'commander' }).ok, true)
  }
  const d1 = rt.submit({
    decisionId: 'd-dep', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Prep API', objective: 'Expose /v1/items', constraints: ['no breaking change'], acceptance: ['unit pass'], dependsOn: [], assigneeRole: 'worker' },
  }, 'run-1')
  assert.equal(d1.ok, true)
  rt.startExecution('run-1', 'task-1', { memberId: 'w-hosted' })
  rt.submitResult({ taskId: 'task-1', executionId: rt.getTask({ taskId: 'task-1' }, 'run-1').task.executionId, summary: 'API ready', artifactRefs: ['src/api.js'], checksPassed: true }, 'run-1', { kind: 'runtime', id: 'w-hosted' })

  const d2 = rt.submit({
    decisionId: 'd-main', expectedPlanRevision: 2, action: 'create_task',
    payload: {
      title: 'Build Client',
      objective: 'Render items list',
      constraints: ['Use host CSS tokens'],
      acceptance: ['npm test passes'],
      dependsOn: ['task-1'],
      assigneeRole: 'worker',
      requiredViews: [{ type: 'checklist', id: 'verify', requiredForAcceptance: true }],
    },
  }, 'run-1')
  assert.equal(d2.ok, true)

  const deliveredPrompts = []
  let codexSchemas = []
  const runner = createTaskRunner({
    runtime: rt,
    defaultCwd: 'F:\\CodingFolder\\Concerto',
    hostedStart: async ({ prompt }) => {
      deliveredPrompts.push({ backend: 'hosted', prompt })
      return { ok: true, sessionId: 'h-sess' }
    },
    registry: {
      get: (id) => (id === 'codex' ? {
        id: 'codex',
        displayName: 'Codex',
        capabilities: { dynamicTools: true },
        start({ prompt, dynamicTools }) {
          deliveredPrompts.push({ backend: 'codex', prompt })
          codexSchemas = dynamicTools
          return { completion: Promise.resolve({ ok: true, status: 'completed', text: 'codex done' }), cancel() {} }
        },
      } : null),
    },
  })

  const skillDelivery = [{
    kind: 'workflow',
    id: 'execution-and-handoff',
    version: 1,
    contentHash: 'sha256:test',
    source: 'plugin',
    title: 'Execution',
    content: 'Follow verification steps.',
  }]

  // Dispatch to Hosted
  const rHosted = runner.dispatch({
    scope: 'run-1',
    taskId: 'task-2',
    hosted: { agentPreset: 't1--w-hosted', memberId: 'w-hosted' },
    skillDeliveries: skillDelivery,
    taskContext: 'Check dark mode contrast carefully.',
  })
  assert.equal(rHosted.ok, true)
  await new Promise((r) => setTimeout(r, 25))

  // Create a clone task for Codex to compare prompt semantics
  const d3 = rt.submit({
    decisionId: 'd-codex', expectedPlanRevision: 3, action: 'create_task',
    payload: {
      title: 'Build Client',
      objective: 'Render items list',
      constraints: ['Use host CSS tokens'],
      acceptance: ['npm test passes'],
      dependsOn: ['task-1'],
      assigneeRole: 'worker',
      requiredViews: [{ type: 'checklist', id: 'verify', requiredForAcceptance: true }],
    },
  }, 'run-1')
  assert.equal(d3.ok, true)

  const rCodex = runner.dispatch({
    scope: 'run-1',
    taskId: 'task-3',
    memberId: 'w-codex',
    connector: 'codex',
    skillDeliveries: skillDelivery,
    taskContext: 'Check dark mode contrast carefully.',
  })
  assert.equal(rCodex.ok, true)
  await new Promise((r) => setTimeout(r, 25))

  assert.equal(deliveredPrompts.length, 2)
  for (const entry of deliveredPrompts) {
    assert.match(entry.prompt, /\[Execution Identity\]/)
    assert.match(entry.prompt, /\[Task Contract\]/)
    assert.match(entry.prompt, /Objective: Render items list/)
    assert.match(entry.prompt, /Constraints: Use host CSS tokens/)
    assert.match(entry.prompt, /Acceptance: npm test passes/)
    assert.match(entry.prompt, /Dependencies: task-1/)
    assert.match(entry.prompt, /task-1 \(completed\): API ready \| refs: src\/api\.js/)
    assert.match(entry.prompt, /checklist:verify \(required for acceptance\)/)
    assert.match(entry.prompt, /\[Task Context \(Temporary Dispatch Guidance\)\]/)
    assert.match(entry.prompt, /Check dark mode contrast carefully\./)
    assert.match(entry.prompt, /execution-and-handoff@v1/)
    assert.match(entry.prompt, /\[Project Member Duties \(Frozen For This Execution\)\]/)
    assert.match(entry.prompt, /Version: v1 \| Source: member\/c1 \| Hash: [a-f0-9]{64}/)
    assert.match(entry.prompt, /Include keyboard checks\./)
    assert.match(entry.prompt, /search_experience.*record_experience/)
  }

  // Verify callable tool schemas remain complete on both Worker & Reviewer sets
  assert.ok(WORKER_TOOL_SCHEMAS.every((t) => t.name && t.inputSchema?.type === 'object'))
  assert.ok(REVIEWER_TOOL_SCHEMAS.some((t) => t.name === 'submit_review'))
  assert.ok(codexSchemas.some((t) => t.name === 'read_skill' && Array.isArray(t.inputSchema.required)))
  assert.ok(codexSchemas.some((t) => t.name === 'record_experience' && t.inputSchema.required.includes('evidenceRefs')))
  assert.ok(![...codexSchemas, ...REVIEWER_TOOL_SCHEMAS].some((t) => t.name === 'manage_member_duties'))
  assert.ok(buildToolDefinitions(null).every((d) => d.parameters?.type === 'object' && d.parameters.additionalProperties === false))
})

test('closeout Skills require a persisted, single native user choice', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-closeout-'))
  const statePath = join(root, 'runtime.json')
  const team = {
    id: 'closeout', name: 'Closeout', commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }],
  }
  const evidence = ['test-results.txt']
  const proposal = { summary: 'Run the contract checks before release.', sourceRefs: evidence }
  const seed = createTeamRuntime({ statePath })
  const outcomes = [
    ['save', '保存为项目 Skill', 'approved'],
    ['decline', '不保存', 'declined'],
    ['later', '暂不处理', 'deferred'],
    ['cancel', null, 'deferred'],
    ['custom', null, 'deferred'],
  ]
  for (const sessionId of ['unfinished', 'interrupted', ...outcomes.map(([id]) => id)]) {
    seed.bindSession(sessionId, sessionId, { teamId: team.id, projectId: sessionId, commanderId: 'c1' })
    if (sessionId === 'unfinished') continue
    assert.equal(seed.submit({
      decisionId: 'create', expectedPlanRevision: 1, action: 'create_task',
      payload: { title: 'Check contract', objective: 'Verify contract', constraints: [], acceptance: ['Tests pass'], dependsOn: [], assigneeRole: 'worker' },
    }, sessionId).ok, true)
    assert.equal(seed.submitResult({ taskId: 'task-1', summary: 'Tests pass', checksPassed: true }, sessionId).ok, true)
    assert.equal(seed.submit({
      decisionId: 'finish', expectedPlanRevision: 2, action: 'finish_goal',
      payload: { goalId: sessionId, summary: 'Verified delivery', artifactRefs: evidence },
    }, sessionId).ok, true)
  }
  const commander = { kind: 'member', id: 'c1', role: 'commander' }
  assert.equal(seed.offerCloseoutSkill('interrupted', proposal, commander).ok, true)

  const shown = []
  const userAnswer = Promise.withResolvers()
  const h = createHarness({
    root, team,
    async askUser({ agent, signal, questions }) {
      assert.ok(signal instanceof AbortSignal)
      shown.push(agent.session.id)
      const [question] = questions
      assert.match(question.detail, /test-results\.txt/)
      assert.deepEqual(question.options.map((option) => option.label), outcomes.slice(0, 3).map(([, label]) => label))
      if (agent.session.id === 'save') await userAnswer.promise
      if (agent.session.id === 'custom') return { answers: [{ id: question.id, selected: [], custom: '可以，但先发我看看' }] }
      const label = outcomes.find(([id]) => id === agent.session.id)[1]
      if (!label) throw Object.assign(new Error('cancelled'), { code: 'ASK_CANCELLED' })
      return { answers: [{ id: question.id, selected: [label] }] }
    },
  })
  t.after(() => { h.dispose(); rmSync(root, { recursive: true, force: true }) })
  for (const sessionId of ['unfinished', 'interrupted', ...outcomes.map(([id]) => id)]) {
    h.sessions.set(sessionId, { id: sessionId, preset: team.id })
  }
  const offer = (sessionId, input = proposal) => h.callTool('offer_project_skill', sessionId, input)
  const publish = (sessionId, sourceRefs = evidence) => h.callTool('publish_project_skill', sessionId, {
    id: 'contract-checks', title: 'Contract checks', description: 'Verify the contract before release.',
    body: 'Run the contract checks and verify the result.', sourceRefs, mutationId: 'save-summary',
  })
  assert.equal((await offer('unfinished')).code, 'precondition_failed')
  assert.equal((await offer('interrupted')).offer.status, 'interrupted')
  assert.equal((await offer('save', { ...proposal, sourceRefs: [] })).code, 'invalid')
  assert.equal((await publish('save')).code, 'precondition_failed')

  const firstOffer = offer('save')
  const repeated = await offer('save')
  assert.equal(repeated.replayed, true)
  assert.equal(repeated.offer.status, 'pending')
  assert.equal((await publish('save')).code, 'precondition_failed')
  userAnswer.resolve()
  const approved = (await firstOffer).offer
  assert.equal(approved.status, 'approved')
  assert.deepEqual(approved.resolvedBy, { kind: 'user', id: 'local-owner' })
  assert.equal((await h.callTool('read_skill', 'save', { id: 'project-skill-authoring' })).ok, true)
  assert.equal((await publish('save', [])).code, 'invalid')
  assert.equal((await publish('save')).version, 1)
  assert.equal((await publish('save')).replayed, true)

  for (const [sessionId, , expected] of outcomes.slice(1)) {
    assert.equal((await offer(sessionId)).offer.status, expected)
    assert.equal((await offer(sessionId)).replayed, true)
    assert.equal((await publish(sessionId)).code, 'precondition_failed')
  }
  assert.deepEqual(shown, outcomes.map(([id]) => id))
  const reloaded = createTeamRuntime({ statePath })
  assert.deepEqual(reloaded.getStatus('save').goalCompletion.skillOffer, approved)
  assert.equal(reloaded.getStatus('save').events.filter(({ type }) => type === 'goal.skill_offered').length, 1)
})

test('Project member duties use managed authors, versioned history, and immutable worker and review inputs', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-duties-'))
  const team = {
    id: 'duties',
    name: 'Duties',
    policyRequiresReview: true,
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
    ],
  }
  const h = createHarness({ root, team })
  t.after(() => { h.dispose(); rmSync(root, { recursive: true, force: true }) })
  h.sessions.set('cmd-a', { id: 'cmd-a', preset: 'duties', header: { cwd: root } })
  h.sessions.set('cmd-b', { id: 'cmd-b', preset: 'duties', header: { cwd: root } })
  const path = '/concerto/members/duties'
  const save = { memberId: 'w1', action: 'save', expectedVersion: 0, body: 'Keep v1 evidence' }
  const created = await h.callTool('manage_member_duties', 'cmd-a', { ...save, author: { kind: 'user', id: 'forged' } })
  assert.equal(created.ok, true)
  assert.deepEqual(created.current.author, { kind: 'member', id: 'c1', role: 'commander' })
  const other = await h.request(path + '?sessionId=cmd-b&memberId=w1')
  assert.equal(other.status, 200)
  assert.equal(other.value.current, null)
  assert.equal((await h.request(path, { ...save, sessionId: 'unknown' })).status, 401)
  assert.equal((await h.request(path, { ...save, sessionId: 'cmd-a', memberId: 'missing' })).status, 404)
  assert.equal((await h.request(path, { ...save, sessionId: 'cmd-a' })).status, 409)
  const revised = await h.request(path, { ...save, sessionId: 'cmd-a', expectedVersion: 1, body: 'Keep v2 evidence' })
  assert.equal(revised.status, 200)
  assert.deepEqual(revised.value.versions.map((v) => v.body), ['Keep v1 evidence', 'Keep v2 evidence'])
  assert.deepEqual(revised.value.current.author, { kind: 'user', id: 'local-owner' })

  const planRevision = await approveFixturePlan(h.callTool, h.request, 'cmd-a')
  let runtime = createTeamRuntime({ statePath: h.runtimePath, policyRequiresReview: true })
  const scope = runtime.getBinding('cmd-a').teamSessionId
  const metadata = runtime.getStatus(scope).metadata
  assert.equal(metadata.reviewPolicy.requiresReview, true)
  runtime.bindSession('other-team', 'other-team', { ...metadata, teamId: 'another' })
  assert.equal(runtime.readMemberDuties('other-team', 'w1').current, null)
  runtime.bindSession('same-team', 'same-team', { ...metadata, requirePlanApproval: false })
  assert.equal(runtime.readMemberDuties('same-team', 'w1').current.version, 2)
  const user = { kind: 'user', id: 'local-owner' }
  const set = (input, actor = user) => runtime.updateMemberDuties(scope, input, actor)
  assert.equal(set({ ...save, expectedVersion: 2 }, { kind: 'member', id: 'w1', role: 'worker' }).code, 'unauthorized')
  assert.equal(set({ ...save, memberId: 'r1', body: 'Verify independently' }).ok, true)
  const addTask = (revision, run = scope) => {
    const result = runtime.submit({
      decisionId: `create-${revision}`, expectedPlanRevision: revision, action: 'create_task',
      payload: { title: 'Check evidence', objective: 'Verify contents', constraints: [], acceptance: ['verified'], dependsOn: [], assigneeRole: 'worker' },
    }, run)
    assert.equal(result.ok, true, JSON.stringify(result))
    return result.result.taskId
  }
  const taskId = addTask(planRevision)
  const worker = runtime.startExecution(scope, taskId, { memberId: 'w1' })
  assert.equal(worker.ok, true, JSON.stringify(worker))
  assert.equal(worker.memberDuties.version, 2)
  assert.equal(runtime.submitResult({
    taskId, executionId: worker.executionId, summary: 'done', checksPassed: true,
  }, scope, { kind: 'runtime', id: 'w1' }).ok, true)
  const review = runtime.startReviewExecution(scope, taskId, { memberId: 'r1' })
  assert.equal(review.ok, true, JSON.stringify(review))
  assert.equal(review.memberDuties.body, 'Verify independently')
  assert.equal(set({ memberId: 'w1', action: 'revoke', expectedVersion: 2 }).current.active, false)
  assert.equal(set({ ...save, memberId: 'r1', expectedVersion: 1, body: 'New review guidance' }).ok, true)
  const afterRevoke = runtime.startExecution('same-team', addTask(planRevision + 1, 'same-team'), { memberId: 'w1' })
  assert.equal(afterRevoke.ok, true, JSON.stringify(afterRevoke))
  assert.equal(afterRevoke.memberDuties, undefined)
  runtime = createTeamRuntime({ statePath: h.runtimePath })
  assert.deepEqual(runtime.getStatus(scope).executions.find((e) => e.executionId === worker.executionId).memberDuties, worker.memberDuties)
  assert.deepEqual(runtime.getStatus(scope).executions.find((e) => e.executionId === review.executionId).memberDuties, review.memberDuties)
})

test('Step 2 & 3: Workflow skill on-demand reading, authoring spec gate, CAS, idempotency, cross-project isolation, frozen dispatch & restart recovery', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-skills-'))
  const team = {
    id: 'alpha',
    name: 'Alpha',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
    ],
  }

  let capturedPrompts = []
  const h = createHarness({
    root,
    team,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h.sessions.size + 1}`
        h.sessions.set(sid, { id: sid, preset: agentPreset, header: cwd ? { cwd } : {} })
        h.agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        return { sessionId: sid }
      },
      async prompt(input) {
        if (input.sessionId === 'cmd-a') return { accepted: true }
        capturedPrompts.push(input.content[0].text)
      },
    },
  })

  try {
    // Two isolated projects (Session A = project-A, Session B = project-B)
    h.sessions.set('cmd-a', { id: 'cmd-a', preset: 'alpha', header: { cwd: root } })
    h.sessions.set('cmd-b', { id: 'cmd-b', preset: 'alpha', header: { cwd: root } })
    assert.equal((await h.request('/concerto/session?sessionId=cmd-a')).status, 200)
    assert.equal((await h.request('/concerto/session?sessionId=cmd-b')).status, 200)

    // Discovery returns concise index only (no full body!)
    const idx = await h.callTool('list_skills', 'cmd-a', {})
    assert.equal(idx.ok, true)
    assert.equal(idx.skills.length, WORKFLOW_SKILLS.filter((s) => s.allowedRoles.includes('commander')).length)
    assert.equal(idx.skills.every((s) => s.body === undefined && typeof s.description === 'string'), true)

    // On-demand topic reading loads ONLY the requested renderer tutorial
    const tableTut = await h.callTool('read_skill', 'cmd-a', { id: 'structured-artifact-publishing', topic: 'table' })
    assert.equal(tableTut.ok, true)
    assert.match(tableTut.skill.content, /### Table/)
    assert.doesNotMatch(tableTut.skill.content, /### Excalidraw|### Sandboxed HTML|### Mindmap/)

    // Creating project skill WITHOUT loading project-skill-authoring MUST fail!
    const blockedCreate = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check',
      description: 'Check DSH theme token usage.',
      body: '1. Inspect CSS vars.',
      requiredCapabilities: ['fileWrite'],
      mutationId: 'mut-blocked',
    })
    assert.equal(blockedCreate.ok, false)
    assert.equal(blockedCreate.code, 'precondition_failed')

    // Load authoring spec first
    const spec = await h.callTool('read_skill', 'cmd-a', { id: 'project-skill-authoring' })
    assert.equal(spec.ok, true)
    assert.match(spec.skill.body, /先查再写/)
    assert.match(spec.skill.body, /失败经验记录已复现的无效操作/)

    // Forbidden authority fields / workflow id collision rejected
    const forged = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'X',
      description: 'Y',
      body: 'Z',
      requiresReview: false,
    })
    assert.equal(forged.ok, false)
    assert.equal(forged.code, 'unauthorized')

    const collision = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'task-planning',
      title: 'Shadow',
      description: 'Shadow',
      body: 'Shadow',
    })
    assert.equal(collision.ok, false)
    assert.equal(collision.code, 'conflict')

    // Publish project skill v1 (Runtime binds projectId, authorId, version, contentHash, authoringSpecRef)
    const pub1 = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check',
      description: 'Check DSH theme token usage and edit client CSS.',
      body: 'Step 1: Verify --dsw-* variables.\nStep 2: Run verify-theme-contrast.',
      requiredCapabilities: ['fileWrite'],
      sourceRefs: ['docs/Concerto-Design-v0.3.2.md#9.7'],
      mutationId: 'pub-v1',
    })
    assert.equal(pub1.ok, true)
    assert.equal(pub1.version, 1)
    assert.equal(pub1.authorId, 'c1')
    assert.equal(pub1.authoringSpecRef.id, 'project-skill-authoring')
    assert.ok(pub1.contentHash.startsWith('sha256:'))

    // Idempotent replay with same mutationId -> replayed: true, same version
    const pub1Replay = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check',
      description: 'Check DSH theme token usage and edit client CSS.',
      body: 'Step 1: Verify --dsw-* variables.\nStep 2: Run verify-theme-contrast.',
      requiredCapabilities: ['fileWrite'],
      sourceRefs: ['docs/Concerto-Design-v0.3.2.md#9.7'],
      mutationId: 'pub-v1',
    })
    assert.equal(pub1Replay.replayed, true)
    assert.equal(pub1Replay.version, 1)

    // Same mutationId with different content -> idempotency_conflict
    const pubConflict = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check Changed',
      description: 'Changed',
      body: 'Changed',
      mutationId: 'pub-v1',
    })
    assert.equal(pubConflict.code, 'idempotency_conflict')

    // Stale CAS revision rejected
    const staleRev = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check v2',
      description: 'Desc',
      body: 'Body',
      expectedVersion: 0,
    })
    assert.equal(staleRev.code, 'stale')

    // Cross-project isolation: Session B (project-B) CANNOT read or dispatch project-A's skill
    const crossRead = await h.callTool('read_project_skill', 'cmd-b', { id: 'theme-check' })
    assert.equal(crossRead.ok, false)
    assert.equal(crossRead.code, 'not_found')
    const crossList = await h.callTool('list_skills', 'cmd-b', { kind: 'project' })
    assert.equal(crossList.skills.length, 0)

    // Create task & test capability mismatch when dispatching fileWrite skill to readonly reviewer
    const planRevision = await approveFixturePlan(h.callTool, h.request, 'cmd-a')
    await h.callTool('submit_decision', 'cmd-a', {
      decisionId: 'd1', expectedPlanRevision: planRevision, action: 'create_task',
      payload: { title: 'Audit tokens', objective: 'Check tokens', constraints: [], acceptance: ['contrast >= 4.5'], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
    })

    // Hold worker session open so task-1 stays running while Commander revises skill to v2!
    let releaseWorker
    const workerGate = new Promise((res) => { releaseWorker = res })
    const origGetAgent = h.agents.get.bind(h.agents)
    let firstWorkerSid = null
    h.agents.get = (id) => {
      if (id !== 'cmd-a' && id !== 'cmd-b' && !firstWorkerSid) {
        firstWorkerSid = id
        return { id, status: 'running', whenIdle: () => workerGate }
      }
      return origGetAgent(id)
    }

    const disp1 = await h.callTool('dispatch_task', 'cmd-a', {
      taskId: 'task-1',
      commandId: 'disp-t1',
      memberId: 'w1',
      skillRefs: [{ id: 'theme-check', version: 1 }],
      taskContext: 'Focus on TeamHome.js only.',
    })
    assert.equal(disp1.ok, true)
    await new Promise((r) => setTimeout(r, 20))

    // Revise project skill to v2 WHILE task-1 is running!
    const pub2 = await h.callTool('publish_project_skill', 'cmd-a', {
      id: 'theme-check',
      title: 'Theme Check v2',
      description: 'Check DSH theme tokens v2.',
      body: 'Step 1 (v2): Check dark & light.',
      expectedVersion: 1,
      requiredCapabilities: ['fileWrite'],
      sourceRefs: ['verify-report.txt'],
      mutationId: 'pub-v2',
    })
    assert.equal(pub2.ok, true)
    assert.equal(pub2.version, 2)

    // Verify running execution still freezes v1 content & hash!
    const snapMid = (await h.request('/concerto/session?sessionId=cmd-a')).value.snapshot
    assert.equal(snapMid.executions[0].skillDeliveries[0].version, 1)
    assert.equal(snapMid.executions[0].skillDeliveries[0].contentHash, pub1.contentHash)
    assert.match(capturedPrompts[0], /Step 1: Verify --dsw-\* variables/)
    assert.match(capturedPrompts[0], /Focus on TeamHome\.js only\./)

    // Worker submits result with member feedback (reported, NOT verified acceptance!)
    writeFileSync(join(root, 'verify-report.txt'), 'Contrast checks passed in the test fixture')
    const subRes = await h.callTool('submit_result', firstWorkerSid, {
      taskId: 'task-1',
      executionId: disp1.executionId,
      summary: 'Tokens verified',
      artifactRefs: ['verify-report.txt'],
      checksPassed: true,
      skillFeedback: [{ id: 'theme-check', version: 1, outcome: 'used', note: 'Worked cleanly' }],
    })
    assert.equal(subRes.ok, true)
    releaseWorker()
    await new Promise((r) => setTimeout(r, 25))

    // Before review pass, ledger shows delivered + member_reported feedback, acceptanceEvidence still null
    const ledgerBeforeReview = (await h.request('/concerto/skills?sessionId=cmd-a')).value
    assert.equal(ledgerBeforeReview.executionDeliveries[0].deliveries[0].version, 1)
    assert.equal(ledgerBeforeReview.executionDeliveries[0].feedback[0].status, 'member_reported')
    assert.equal(ledgerBeforeReview.executionDeliveries[0].acceptanceEvidence, null)

    // The bound Reviewer owns the mandatory verdict and skill acceptance evidence.
    const taskAfterSubmit = (await h.request('/concerto/session?sessionId=cmd-a')).value.snapshot.tasks[0]
    const reviewerSid = [...h.sessions.values()].find((session) => session.preset === 'alpha--r1')?.id
    assert.ok(reviewerSid)
    const rev = await h.callTool('submit_review', reviewerSid, {
      taskId: 'task-1',
      executionId: disp1.executionId,
      resultId: taskAfterSubmit.result.resultId,
      verdict: 'pass',
      reason: 'Verified contrast output',
      evidenceRefs: ['verify-report.txt'],
    })
    assert.equal(rev.ok, true, JSON.stringify(rev))

    // Restart runtime from disk and verify v1 & v2 project skills AND frozen v1 delivery survive restart!
    h.dispose()
    const rtReloaded = createTeamRuntime({ statePath: h.runtimePath })
    const runId = snapMid.teamSessionId
    const readV1 = rtReloaded.readProjectSkill(runId, { id: 'theme-check', version: 1 })
    const readV2 = rtReloaded.readProjectSkill(runId, { id: 'theme-check', version: 2 })
    assert.equal(readV1.ok, true)
    assert.equal(readV1.skill.contentHash, pub1.contentHash)
    assert.equal(readV2.ok, true)
    assert.equal(readV2.skill.contentHash, pub2.contentHash)
    assert.deepEqual(readV2.skill.sourceRefs, ['verify-report.txt'])
    const ledgerAfterRestart = rtReloaded.getSkillLedger(runId)
    assert.equal(ledgerAfterRestart.executionDeliveries[0].deliveries[0].version, 1)
    assert.equal(ledgerAfterRestart.executionDeliveries[0].acceptanceEvidence.status, 'verified_with_task_acceptance')
    assert.equal(ledgerAfterRestart.executionDeliveries[0].acceptanceEvidence.reviewId, rev.reviewId)

    // Capability mismatch test on skillRefs (readonly reviewer cannot be dispatched a fileWrite skill!)
    const h2 = createHarness({ root, team })
    h2.sessions.set('cmd-cap', { id: 'cmd-cap', preset: 'alpha', header: { cwd: root } })
    await h2.request('/concerto/session?sessionId=cmd-cap')
    await h2.callTool('read_skill', 'cmd-cap', { id: 'project-skill-authoring' })
    await h2.callTool('publish_project_skill', 'cmd-cap', {
      id: 'write-only-method',
      title: 'Write Method',
      description: 'Requires write capability',
      body: 'Edit files.',
      requiredCapabilities: ['fileWrite'],
    })
    const capPlanRevision = await approveFixturePlan(h2.callTool, h2.request, 'cmd-cap')
    await h2.callTool('submit_decision', 'cmd-cap', {
      decisionId: 'd-cap', expectedPlanRevision: capPlanRevision, action: 'create_task',
      payload: { title: 'Read files', objective: 'Read README', constraints: [], acceptance: ['done'], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
    })
    const dispRo = await h2.callTool('dispatch_task', 'cmd-cap', {
      taskId: 'task-1', commandId: 'disp-ro', memberId: 'r1',
    })
    // r1 is reviewer so dispatch_task rejects (use dispatch_review); test skillRefs mismatch via dispatch_review after worker submits
    assert.equal(dispRo.code, 'unsupported')
    const dispW = await h2.callTool('dispatch_task', 'cmd-cap', { taskId: 'task-1', commandId: 'disp-w', memberId: 'w1' })
    assert.equal(dispW.ok, true)
    await new Promise((r) => setTimeout(r, 20))
    const wSid = [...h2.sessions.keys()].find((k) => k !== 'cmd-cap')
    await h2.callTool('submit_result', wSid, { taskId: 'task-1', executionId: dispW.executionId, summary: 'Read done', checksPassed: true })
    await new Promise((r) => setTimeout(r, 20))
    const badRevSkill = await h2.callTool('dispatch_review', 'cmd-cap', {
      taskId: 'task-1', commandId: 'rev-bad-skill', memberId: 'r1',
      skillRefs: [{ id: 'write-only-method', version: 1 }],
    })
    assert.equal(badRevSkill.ok, false)
    assert.equal(badRevSkill.code, 'capability_mismatch')
    h2.dispose()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Step 4: Hierarchical structured artifacts (Commander/Worker/Reviewer), shared references, ownership preservation, and pinned review versions', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-step4-'))
  const team = {
    id: 'delta',
    name: 'Delta',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
    ],
  }

  let workerSid = null
  let reviewerSid = null
  const workerIdle = Promise.withResolvers()
  const reviewerIdle = Promise.withResolvers()
  const h = createHarness({
    root,
    team,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h.sessions.size + 1}`
        h.sessions.set(sid, { id: sid, preset: agentPreset, header: cwd ? { cwd } : {} })
        h.agents.set(sid, { id: sid, status: 'idle', whenIdle: () => agentPreset.endsWith('--w1') ? workerIdle.promise : reviewerIdle.promise })
        if (agentPreset.endsWith('--w1')) workerSid = sid
        if (agentPreset.endsWith('--r1')) reviewerSid = sid
        return { sessionId: sid }
      },
      async prompt() {},
    },
  })

  try {
    h.sessions.set('cmd-1', { id: 'cmd-1', preset: 'delta', header: { cwd: root } })
    assert.equal((await h.request('/concerto/session?sessionId=cmd-1')).status, 200)

    // 1. Commander creates team-level plan + task
    const planRevision = await approveFixturePlan(h.callTool, h.request, 'cmd-1')
    await h.callTool('submit_decision', 'cmd-1', {
      decisionId: 'd1', expectedPlanRevision: planRevision, action: 'create_task',
      payload: {
        title: 'Implement Login API',
        objective: 'Build /api/login with tests',
        constraints: ['No plaintext passwords'],
        acceptance: ['Auth tests pass'],
        dependsOn: [],
        assigneeRole: 'worker',
        requiresReview: true,
      },
    })

    const cmdPlan = await h.callTool('publish_view_object', 'cmd-1', {
      id: 'team-plan',
      type: 'mindmap',
      semanticKind: 'live_execution',
      title: '团队总体计划',
      data: { root: { id: 'r', label: '登录功能', children: [{ id: 't1', label: 'Login API', taskId: 'task-1' }] } },
    })
    assert.equal(cmdPlan.ok, true)
    assert.equal(cmdPlan.authorId, 'c1')

    // 2. Dispatch worker -> Worker publishes task-level table (auto-bound to task-1 & executionId)
    const disp = await h.callTool('dispatch_task', 'cmd-1', { taskId: 'task-1', commandId: 'd-w1', memberId: 'w1' })
    assert.equal(disp.ok, true)
    assert.ok(workerSid)

    const wTable1 = await h.callTool('publish_view_object', workerSid, {
      id: 'api-contract',
      type: 'table',
      title: '接口与测试矩阵',
      data: { columns: ['Endpoint', 'Status'], rows: [['POST /api/login', 'Pass v1']] },
    })
    assert.equal(wTable1.ok, true)
    assert.equal(wTable1.authorId, 'w1')
    assert.equal(wTable1.taskId, 'task-1')
    assert.equal(wTable1.executionId, disp.executionId)
    assert.equal(wTable1.version, 1)
    const lesson = await h.callTool('record_experience', workerSid, {
      mutationId: 'login-trial', kind: 'success', problem: 'Verify login', conditions: 'fixture workspace',
      method: 'Check the test matrix', result: 'The login row passed', evidenceRefs: ['table:api-contract@v1'],
    })
    assert.equal(lesson.status, 'recorded')
    assert.deepEqual((await h.callTool('search_experience', 'cmd-1', { query: 'verify login' })).entries, [])

    // Commander CANNOT overwrite Worker's artifact (ownership preserved!)
    const cmdOverwrite = await h.callTool('publish_view_object', 'cmd-1', {
      id: 'api-contract',
      type: 'table',
      expectedVersion: 1,
      title: 'Hijacked',
      data: { columns: ['A'], rows: [['B']] },
    })
    assert.equal(cmdOverwrite.ok, false)
    assert.equal(cmdOverwrite.code, 'unauthorized')

    const delivery = await h.callTool('submit_result', workerSid, {
      taskId: 'task-1',
      executionId: disp.executionId,
      summary: 'Implemented /api/login with matrix table:api-contract',
      artifactRefs: ['table:api-contract@v1'],
      checksPassed: true,
    })
    assert.equal(delivery.ok, true, JSON.stringify(delivery))
    assert.equal(reviewerSid, null, 'the worker native turn is still active')
    assert.equal((await h.request('/concerto/runs/halt', { sessionId: 'cmd-1', commandId: 'pause-review', paused: true })).status, 200)
    workerIdle.resolve()
    await new Promise((r) => setTimeout(r, 25))
    assert.equal(reviewerSid, null, 'automatic review honors pause')
    assert.equal((await h.request('/concerto/runs/halt', { sessionId: 'cmd-1', commandId: 'resume-review', paused: false })).status, 200)

    // 3. Runtime starts one independent reviewer for the submitted result.
    assert.ok(reviewerSid)
    const reviewing = (await h.request('/concerto/session?sessionId=cmd-1')).value.snapshot
    const reviewInstances = reviewing.executions.filter((row) => row.kind === 'review')
    assert.equal(reviewInstances.length, 1)
    const [dispRev] = reviewInstances
    assert.equal(dispRev.dispatchedBy.kind, 'runtime')
    assert.equal(dispRev.targetResultId, reviewing.tasks[0].result.resultId)

    const revTable = await h.callTool('publish_view_object', reviewerSid, {
      id: 'review-login',
      type: 'checklist',
      title: '审查检查表',
      data: { items: [{ id: 'chk-1', label: 'Bcrypt hash verified', checked: true }] },
    })
    assert.equal(revTable.ok, true)
    assert.equal(revTable.authorId, 'r1')
    assert.equal(revTable.taskId, 'task-1')
    assert.equal(revTable.executionId, dispRev.executionId)

    const snapBeforeReview = (await h.request('/concerto/session?sessionId=cmd-1')).value.snapshot
    const reviewExec = snapBeforeReview.executions.find((e) => e.executionId === dispRev.executionId)
    assert.equal(reviewExec.kind, 'review')

    const note = await h.callTool('manage_review_feedback', reviewerSid, {
      action: 'create', text: 'Confirm the negative case in this row.',
      targetExecutionId: disp.executionId, targetResultId: snapBeforeReview.tasks[0].result.resultId,
      targetRef: 'table:api-contract@v1', itemId: 'row-1',
    })
    assert.equal(note.ok, true, JSON.stringify(note))
    assert.equal(note.feedback.author.executionId, dispRev.executionId)
    assert.equal((await h.callTool('manage_review_feedback', reviewerSid, {
      action: 'close', feedbackId: note.feedback.feedbackId, expectedVersion: 1,
    })).feedback.status, 'closed')

    const revPass = await h.callTool('submit_review', reviewerSid, {
      taskId: 'task-1',
      executionId: disp.executionId,
      resultId: snapBeforeReview.tasks[0].result.resultId,
      verdict: 'pass',
      reason: 'All security checks verified.',
      evidenceRefs: ['table:api-contract@v1', 'checklist:review-login@v1'],
    })
    assert.equal(revPass.ok, true, JSON.stringify(revPass))

    // 4. Worker later updates api-contract to v2 (shared live reference reflects v2, while Review stays pinned to v1!)
    const wTable2 = await h.callTool('patch_view_object', workerSid, {
      id: 'api-contract',
      expectedVersion: 1,
      op: 'upsert_rows',
      rows: [['POST /api/login', 'Pass v2']],
    })
    assert.equal(wTable2.ok, true)
    assert.equal(wTable2.version, 2)

    // Commander organizes public team briefing referencing Commander, Worker, and Reviewer artifacts
    const pubTeam = await h.callTool('update_team_view', 'cmd-1', {
      summary: '当前进展：登录接口已通过独立审查。\n关键问题：无阻塞。\n下一步：准备下一任务。',
      pinnedRefs: [
        { type: 'mindmap', id: 'team-plan' },
        { type: 'table', id: 'api-contract' },
        { type: 'checklist', id: 'review-login' },
      ],
    })
    assert.equal(pubTeam.ok, true)

    const finalSnap = (await h.request('/concerto/session?sessionId=cmd-1')).value.snapshot
    const liveTable = finalSnap.viewObjects.find((o) => o.id === 'api-contract')
    const livePlan = finalSnap.viewObjects.find((o) => o.id === 'team-plan')
    const liveReview = finalSnap.viewObjects.find((o) => o.id === 'review-login')

    // Layers & authors preserved in single shared snapshot
    assert.equal(livePlan.layer, 'team')
    assert.equal(livePlan.authorId, 'c1')
    assert.equal(liveTable.layer, 'task')
    assert.equal(liveTable.authorId, 'w1')
    assert.equal(liveTable.version, 2)
    assert.equal(liveReview.layer, 'review')
    assert.equal(liveReview.authorId, 'r1')
    // Live execution mindmap synced completed status from Runtime!
    assert.equal(livePlan.data.root.children[0].status, 'completed')

    // Review pinned versions preserve v1 even though live api-contract is v2!
    const pinnedApi = finalSnap.tasks[0].review.pinnedObjectVersions.find((p) => p.id === 'api-contract')
    assert.equal(pinnedApi.version, 1)

    // Pinned version HTTP read returns v1 snapshot while reporting latestVersion: 2
    const pinnedHttp = await h.request('/concerto/view-objects/read?sessionId=cmd-1&id=api-contract&version=1')
    assert.equal(pinnedHttp.status, 200)
    assert.equal(pinnedHttp.value.version, 1)
    assert.equal(pinnedHttp.value.latestVersion, 2)
    assert.equal(pinnedHttp.value.data.rows[0][1], 'Pass v1')

    h.dispose()
  } finally {
    workerIdle.resolve()
    reviewerIdle.resolve()
    rmSync(root, { recursive: true, force: true })
  }
})

test('P1/P2 fixes: reviewer approval response, review unknown adjudication, pinned v1 vs v2 isolation, and review executionId binding', async () => {
  // 1) Reviewer requests approval -> user responds -> reviewer continues, binds review executionId on artifact, and submits review citing Worker executionId
  const rt = createTeamRuntime()
  rt.bindSession('cmd', 'run-rev', {
    projectId: 'p-rev',
    teamId: 't-rev',
    teamName: 'TRev',
    commanderId: 'c1',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'external', connector: 'codex' },
      { id: 'r1', roleKind: 'reviewer', source: 'external', connector: 'codex' },
    ],
  })
  rt.submit({
    decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Review flow', objective: 'Verify approval + pinning', constraints: [], acceptance: ['ok'], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
  }, 'run-rev')
  const wExec = rt.startExecution('run-rev', 'task-1', { memberId: 'w1', connectorId: 'codex' })
  assert.equal(wExec.ok, true)
  const v1 = rt.publishViewObject('run-rev', {
    id: 'api-contract', type: 'table', title: 'API', taskId: 'task-1', executionId: wExec.executionId,
    data: { columns: ['Route', 'Ver'], rows: [['/a', 'v1']] },
  }, { kind: 'member', id: 'w1', role: 'worker' })
  assert.equal(v1.version, 1)
  rt.settleExecution('run-rev', 'task-1', wExec.executionId, { status: 'completed', text: 'candidate ready' })
  const taskAfterWorker = rt.getTask({ taskId: 'task-1' }, 'run-rev').task
  assert.equal(taskAfterWorker.state, 'review')

  let resolveApprovalGate
  const approvalGate = new Promise((res) => { resolveApprovalGate = res })
  let deliveredAnswer = null
  const runner = createTaskRunner({
    runtime: rt,
    defaultCwd: 'F:\\CodingFolder\\Concerto',
    registry: {
      get: (id) => (id === 'codex' ? {
        id: 'codex',
        displayName: 'Codex',
        capabilities: { approval: true, dynamicTools: true },
        start({ onEvent, onToolCall }) {
          onEvent({ type: 'approval.requested', requestId: 'native-req-1', payload: { method: 'item/commandExecution/requestApproval', command: 'git diff --stat' } })
          const completion = (async () => {
            await approvalGate
            const readV1 = await onToolCall('read_view_object', { id: 'api-contract' })
            assert.equal(readV1.version, 1)
            // While reviewer is running, api-contract is updated to v2!
            const v2 = rt.patchViewObject('run-rev', {
              id: 'api-contract', expectedVersion: 1, op: 'upsert_rows', rows: [['/a', 'v2']],
            }, { kind: 'member', id: 'w1', role: 'worker' })
            assert.equal(v2.version, 2)
            // Reviewer publishes review artifact WITHOUT explicit executionId -> binds review executionId!
            const revArt = await onToolCall('publish_view_object', {
              id: 'rev-notes', type: 'table', title: 'Review Notes',
              data: { columns: ['Check', 'Result'], rows: [['v1 diff', 'ok']] },
            })
            assert.equal(revArt.ok, true)
            assert.notEqual(revArt.executionId, null)
            assert.notEqual(revArt.executionId, wExec.executionId)
            // Passing Worker's executionId to reviewer's publish_view_object must be rejected
            const wrongExecArt = await onToolCall('publish_view_object', {
              id: 'rev-notes-bad', type: 'table', title: 'Bad', executionId: wExec.executionId,
              data: { columns: ['A'], rows: [['1']] },
            })
            assert.equal(wrongExecArt.ok, false)
            assert.equal(wrongExecArt.code, 'unauthorized')
            // Reviewer submits review citing api-contract@v1 and Worker's executionId
            const revOut = await onToolCall('submit_review', {
              taskId: 'task-1',
              executionId: wExec.executionId,
              resultId: taskAfterWorker.result.resultId,
              verdict: 'pass',
              reason: 'Reviewed v1 before v2 edit',
              evidenceRefs: ['table:api-contract@v1'],
            })
            assert.equal(revOut.ok, true)
            return { ok: true, status: 'completed', text: 'review complete' }
          })()
          return {
            completion,
            async respond(reqId, ans) {
              deliveredAnswer = { reqId, ans }
              resolveApprovalGate()
            },
            cancel() {},
          }
        },
      } : null),
    },
  })

  const revDisp = runner.dispatchReview({ scope: 'run-rev', taskId: 'task-1', memberId: 'r1', connector: 'codex', commandId: 'rev-1' })
  assert.equal(revDisp.ok, true)
  const snapWaiting = rt.getStatus('run-rev')
  const revReq = snapWaiting.requests.find((r) => r.executionId === revDisp.executionId)
  assert.ok(revReq, 'reviewer approval request recorded')
  assert.equal(snapWaiting.executions.find((e) => e.executionId === revDisp.executionId).state, 'waiting_approval')

  const answered = await runner.answer('run-rev', {
    requestId: revReq.requestId,
    commandId: 'ans-rev-1',
    answer: { decision: 'accept' },
  }, { kind: 'user', id: 'local-owner' })
  assert.equal(answered.ok, true)
  assert.deepEqual(deliveredAnswer, { reqId: 'native-req-1', ans: { decision: 'accept' } })

  await new Promise((r) => setTimeout(r, 40))
  const finalSnap = rt.getStatus('run-rev')
  const finalTask = finalSnap.tasks[0]
  assert.equal(finalTask.state, 'completed')
  assert.equal(finalTask.viewObjectVersions['api-contract'], 1)
  const pinnedApi = finalTask.review.pinnedObjectVersions.filter((p) => p.id === 'api-contract')
  assert.equal(pinnedApi.length, 1)
  assert.equal(pinnedApi[0].version, 1)
  assert.equal(finalSnap.viewObjects.find((o) => o.id === 'api-contract').version, 2)
  assert.equal(rt.readViewObject('run-rev', { id: 'api-contract', version: 1 }).data.rows[0][1], 'v1')
  // Reviewer artifact bound to review executionId
  assert.equal(finalSnap.viewObjects.find((o) => o.id === 'rev-notes').executionId, revDisp.executionId)

  // 2) Review execution settles as unknown -> sets task.needsAdjudication and supports isolated retry & confirm_failed
  const rtUnk = createTeamRuntime()
  rtUnk.bindSession('cmd-u', 'run-u', {
    projectId: 'p-u', teamId: 't-u', teamName: 'TU', commanderId: 'c1',
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted' }, { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' }],
  })
  rtUnk.submit({
    decisionId: 'du1', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Unk review', objective: 'Check', constraints: [], acceptance: ['ok'], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
  }, 'run-u')
  const wu = rtUnk.startExecution('run-u', 'task-1', { memberId: 'w1', connectorId: 'hosted:w1' })
  rtUnk.settleExecution('run-u', 'task-1', wu.executionId, { status: 'completed', text: 'candidate' })
  const ru1 = rtUnk.startReviewExecution('run-u', 'task-1', { memberId: 'r1', connectorId: 'hosted:r1', writeScope: 'F:\\repo' })
  assert.equal(ru1.ok, true)
  const settledUnk = rtUnk.settleExecution('run-u', 'task-1', ru1.executionId, { status: 'unknown', detail: 'review timed out' })
  assert.equal(settledUnk.ok, true)
  assert.equal(rtUnk.getTask({ taskId: 'task-1' }, 'run-u').task.needsAdjudication, true)
  assert.equal(rtUnk.getTask({ taskId: 'task-1' }, 'run-u').task.state, 'review')

  const adjRetry = rtUnk.adjudicate('run-u', {
    taskId: 'task-1', executionId: ru1.executionId, commandId: 'adj-iso', action: 'retry_isolated',
    reason: 'retry review in clean dir', externalEffectsReviewed: true,
  }, { kind: 'user', id: 'local-owner' }, { kind: 'fresh_directory', cwd: 'F:\\isolated-rev' })
  assert.equal(adjRetry.ok, true)
  assert.equal(adjRetry.state, 'review')
  assert.equal(rtUnk.getTask({ taskId: 'task-1' }, 'run-u').task.needsAdjudication, false)

  // Retry in quarantined dir must fail; retry in isolated dir succeeds
  const badRetry = rtUnk.startReviewExecution('run-u', 'task-1', { memberId: 'r1', connectorId: 'hosted:r1', writeScope: 'F:\\repo', commandId: 'rev-bad' })
  assert.equal(badRetry.code, 'precondition_failed')
  const ru2 = rtUnk.startReviewExecution('run-u', 'task-1', { memberId: 'r1', connectorId: 'hosted:r1', writeScope: 'F:\\isolated-rev', commandId: 'rev-iso' })
  assert.equal(ru2.ok, true)
  rtUnk.settleExecution('run-u', 'task-1', ru2.executionId, { status: 'unknown', detail: 'lost again' })
  const adjStop = rtUnk.adjudicate('run-u', {
    taskId: 'task-1', executionId: ru2.executionId, commandId: 'adj-stop', action: 'confirm_failed',
    reason: 'confirmed hosted idle',
  }, { kind: 'user', id: 'local-owner' }, { kind: 'hosted_idle', verified: true })
  assert.equal(adjStop.ok, true)
  assert.equal(adjStop.state, 'review')
  assert.equal(adjStop.executionState, 'stopped')
  assert.equal(rtUnk.getTask({ taskId: 'task-1' }, 'run-u').task.needsAdjudication, false)
})

test('P1 fixes: nonexistent evidence version rejected cleanly and quarantined/superseded reviewer R1 cannot submit review after R2 takes over', async () => {
  const root = mkdtempSync(join(tmpdir(), 'concerto-rev-guard-'))
  const team = {
    id: 'guardteam',
    name: 'GuardTeam',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
      { id: 'r2', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
    ],
  }

  const memberSessions = new Map()
  let r1GateResolve = null
  const r1Gate = new Promise((res) => { r1GateResolve = res })

  const h = createHarness({
    root,
    team,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h.sessions.size + 1}`
        h.sessions.set(sid, { id: sid, preset: agentPreset, header: cwd ? { cwd } : {} })
        h.agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        memberSessions.set(agentPreset, sid)
        return { sessionId: sid }
      },
      async prompt() {},
    },
  })

  try {
    h.sessions.set('cmd-g', { id: 'cmd-g', preset: 'guardteam', header: { cwd: root } })
    await h.request('/concerto/session?sessionId=cmd-g')

    const planRevision = await approveFixturePlan(h.callTool, h.request, 'cmd-g')
    await h.callTool('submit_decision', 'cmd-g', {
      decisionId: 'dg1', expectedPlanRevision: planRevision, action: 'create_task',
      payload: {
        title: 'Guard check', objective: 'Test evidence and reviewer authority',
        constraints: [], acceptance: ['all pass'], dependsOn: [], assigneeRole: 'worker', requiresReview: true,
      },
    })

    const dispW = await h.callTool('dispatch_task', 'cmd-g', { taskId: 'task-1', commandId: 'dw-1', memberId: 'w1' })
    assert.equal(dispW.ok, true)
    const wSid = memberSessions.get('guardteam--w1')
    await h.callTool('publish_view_object', wSid, {
      id: 'api-contract', type: 'table', title: 'API Contract',
      data: { columns: ['Route', 'Ver'], rows: [['/login', 'v1']] },
    })
    await h.callTool('submit_result', wSid, {
      taskId: 'task-1', executionId: dispW.executionId, summary: 'Ready v1', checksPassed: true, artifactRefs: ['table:api-contract@v1'],
    })
    await new Promise((r) => setTimeout(r, 20))

    // 1) Nonexistent explicit evidence version MUST fail without changing task or review state
    const snapReady = (await h.request('/concerto/session?sessionId=cmd-g')).value.snapshot
    assert.equal(snapReady.tasks[0].reviewDispatch.status, 'needs_assignment')
    assert.equal(snapReady.executions.filter((row) => row.kind === 'review').length, 0)
    const badVerReview = await h.callTool('submit_review', 'cmd-g', {
      taskId: 'task-1',
      executionId: dispW.executionId,
      resultId: snapReady.tasks[0].result.resultId,
      verdict: 'pass',
      reason: 'Claimed v999',
      evidenceRefs: ['table:api-contract@v999'],
    })
    assert.equal(badVerReview.ok, false)
    assert.equal(badVerReview.code, 'unauthorized')
    const snapAfterBadVer = (await h.request('/concerto/session?sessionId=cmd-g')).value.snapshot
    assert.equal(snapAfterBadVer.tasks[0].state, 'review')
    assert.equal(snapAfterBadVer.tasks[0].review, null)

    // 2) R1 starts review, goes unknown -> retry_isolated -> R2 takes over -> late R1 submit_review MUST be rejected, R2 succeeds
    const origGetAgent = h.agents.get.bind(h.agents)
    h.agents.get = (id) => {
      if (id === memberSessions.get('guardteam--r1')) {
        return { id, status: 'running', whenIdle: () => r1Gate }
      }
      return origGetAgent(id)
    }

    const dispR1 = await h.callTool('dispatch_review', 'cmd-g', { taskId: 'task-1', commandId: 'dr-1', memberId: 'r1' })
    assert.equal(dispR1.ok, true)
    const r1Sid = memberSessions.get('guardteam--r1')
    assert.ok(r1Sid)
    const forgedVersion = await h.callTool('submit_review', r1Sid, {
      taskId: 'task-1', executionId: dispW.executionId, resultId: snapReady.tasks[0].result.resultId,
      verdict: 'pass', reason: 'Claimed v999', evidenceRefs: ['table:api-contract@v999'],
    })
    assert.equal(forgedVersion.code, 'precondition_failed')

    // Simulate R1 disconnecting/timing out (unknown) while R1's host session still exists
    const r1FailExec = await h.request('/concerto/recovery/unknown')
    assert.equal(r1FailExec.status, 200)
    // Settle R1 as unknown via runtime or abort: call adjudicate after settling via cancel/unknown
    // Trigger unknown cleanly by failing R1's agent wait
    r1GateResolve(Promise.reject(new Error('r1_connection_lost')))
    await new Promise((r) => setTimeout(r, 25))

    const snapUnk = (await h.request('/concerto/session?sessionId=cmd-g')).value.snapshot
    assert.equal(snapUnk.executions.find((e) => e.executionId === dispR1.executionId).state, 'unknown')
    assert.equal(snapUnk.tasks[0].needsAdjudication, true)

    // Isolate R1 so R2 can take over
    const adjIso = await h.request('/concerto/executions/adjudicate', {
      sessionId: 'cmd-g',
      taskId: 'task-1',
      executionId: dispR1.executionId,
      commandId: 'adj-r1-iso',
      action: 'retry_isolated',
      reason: 'R1 lost connection; retry with R2 in isolated dir',
      externalEffectsReviewed: true,
    })
    assert.equal(adjIso.status, 200)
    assert.equal(adjIso.value.ok, true)
    const isolatedDir = adjIso.value.retryCwd

    // Dispatch R2
    const dispR2 = await h.callTool('dispatch_review', 'cmd-g', { taskId: 'task-1', commandId: 'dr-2', memberId: 'r2' })
    assert.equal(dispR2.ok, true)
    const r2Sid = memberSessions.get('guardteam--r2')
    assert.ok(r2Sid)

    // Late R1 attempt to submit_review or publish_view_object MUST be rejected!
    const lateR1Review = await h.callTool('submit_review', r1Sid, {
      taskId: 'task-1',
      executionId: dispW.executionId,
      resultId: snapReady.tasks[0].result.resultId,
      verdict: 'pass',
      reason: 'Late R1 verdict',
      evidenceRefs: ['table:api-contract@v1'],
    })
    assert.equal(lateR1Review.ok, false)
    assert.equal(lateR1Review.code, 'stale')

    const lateR1Artifact = await h.callTool('publish_view_object', r1Sid, {
      id: 'late-r1-note',
      type: 'table',
      title: 'Late R1',
      data: { columns: ['A'], rows: [['1']] },
    })
    assert.equal(lateR1Artifact.ok, false)
    assert.equal(lateR1Artifact.code, 'stale')

    const snapMid = (await h.request('/concerto/session?sessionId=cmd-g')).value.snapshot
    assert.equal(snapMid.tasks[0].state, 'review')
    assert.equal(snapMid.tasks[0].review, null)

    // R2 validly submits review with v1 evidence -> succeeds and gets review-1!
    const r2Review = await h.callTool('submit_review', r2Sid, {
      taskId: 'task-1',
      executionId: dispW.executionId,
      resultId: snapReady.tasks[0].result.resultId,
      verdict: 'pass',
      reason: 'R2 verified v1 contract',
      evidenceRefs: ['table:api-contract@v1'],
    })
    assert.equal(r2Review.ok, true)
    assert.equal(r2Review.state, 'completed')
    assert.equal(r2Review.reviewId, 'review-1')

    const snapFinal = (await h.request('/concerto/session?sessionId=cmd-g')).value.snapshot
    assert.equal(snapFinal.tasks[0].review.actor.id, 'r2')
    assert.equal(snapFinal.tasks[0].review.pinnedObjectVersions[0].version, 1)

    h.dispose()
    if (isolatedDir) rmSync(isolatedDir, { recursive: true, force: true })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Fix #1 & #2: Commander prompt enforces coordinator-only boundary and propose_plan offers native userQuestions kickoff confirmation', async (t) => {
  const prompt = buildMemberSystemPrompt({
    roleKind: 'commander',
    capabilities: { coordinatorOnly: true, fileRead: false, fileWrite: false, shell: false, search: false },
  })
  assert.match(prompt, /HARD BOUNDARY \(Coordinator Only\)/)
  assert.match(prompt, /Do NOT substitute browser downloads, DrawIO\/whiteboard exports, game-engine\/IDE APIs/)

  const root = mkdtempSync(join(tmpdir(), 'concerto-native-plan-gate-'))
  let mode = 'approve'
  const promptsAsked = []
  const team = {
    id: 'plan-prompt-team',
    name: 'Plan Prompt Team',
    requirePlanApproval: true,
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' }],
  }
  const h = createHarness({
    root,
    team,
    askUser: async ({ agent, questions }) => {
      promptsAsked.push({ agentId: agent.id, questions })
      if (mode === 'cancel') {
        const err = new Error('user cancelled')
        err.code = 'ASK_CANCELLED'
        throw err
      }
      return {
        answers: [{ id: questions[0].id, selected: ['确认开工 v1'], custom: false }],
      }
    },
  })
  t.after(() => { h.dispose(); rmSync(root, { recursive: true, force: true }) })

  h.sessions.set('cmd-plan', { id: 'cmd-plan', preset: team.id, header: { cwd: root } })
  assert.equal((await h.request('/concerto/session?sessionId=cmd-plan')).status, 200)
  const bp = await h.callTool('publish_view_object', 'cmd-plan', {
    id: 'plan-main',
    type: 'checklist',
    title: '实施蓝图',
    semanticKind: 'blueprint',
    data: { items: [{ label: '委托 worker-1 写入文件' }] },
  })
  assert.equal(bp.ok, true)

  mode = 'cancel'
  const deferred = await h.callTool('submit_decision', 'cmd-plan', {
    decisionId: 'prop-cancel',
    expectedPlanRevision: 1,
    action: 'propose_plan',
    payload: { planId: 'plan-main', planVersion: 1 },
  })
  assert.equal(deferred.ok, true)
  assert.equal(deferred.result.status, 'pending')
  assert.equal(deferred.confirmedViaNativePrompt, false)
  assert.equal(promptsAsked.length, 1)

  mode = 'approve'
  const bp2 = await h.callTool('publish_view_object', 'cmd-plan', {
    id: 'plan-main-v2',
    type: 'checklist',
    title: '实施蓝图',
    semanticKind: 'blueprint',
    data: { items: [{ label: '确认通过原生弹窗直接开工' }] },
  })
  assert.equal(bp2.ok, true)

  const approved = await h.callTool('submit_decision', 'cmd-plan', {
    decisionId: 'prop-approve',
    expectedPlanRevision: deferred.planRevision,
    action: 'propose_plan',
    payload: { planId: 'plan-main-v2', planVersion: 1 },
  })
  assert.equal(approved.ok, true)
  assert.equal(approved.confirmedViaNativePrompt, true)
  assert.equal(approved.result.status, 'approved')
  assert.equal(promptsAsked.length, 2)
  assert.match(promptsAsked[1].questions[0].detail, /plan-main-v2@v1/)

  const created = await h.callTool('submit_decision', 'cmd-plan', {
    decisionId: 'create-after-native-approve',
    expectedPlanRevision: approved.planRevision,
    action: 'create_task',
    payload: { title: 'Write file', objective: 'Let worker write file', constraints: [], acceptance: ['file created'], dependsOn: [], assigneeRole: 'worker' },
  })
  assert.equal(created.ok, true)
})

test('Commander wakes on execution settlement, self-reviews requiresReview=false tasks, and allows optional pass reason', async (t) => {
  const promptText = buildMemberSystemPrompt({
    roleKind: 'commander',
    capabilities: { coordinatorOnly: true, fileRead: false, fileWrite: false, shell: false, search: false },
  })
  assert.match(promptText, /requiresReview === false/)
  assert.match(promptText, /submit_review\(pass \| fail\) yourself/)
  assert.match(promptText, /patch_view_object.*checked: true/)

  // 1) requiresReview=false: worker settlement wakes Commander with submit_review directive & manual review pass allows blank reason
  const root1 = mkdtempSync(join(tmpdir(), 'concerto-autowake-'))
  const team1 = {
    id: 'auto-wake',
    name: 'Auto Wake',
    commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' }],
  }
  const cmdWakes = []
  const w1WakePromise = Promise.withResolvers()
  const userReviewWakePromise = Promise.withResolvers()
  const h1 = createHarness({
    root: root1,
    team: team1,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h1.sessions.size + 1}`
        h1.sessions.set(sid, { id: sid, preset: agentPreset, header: { cwd } })
        h1.agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        return { sessionId: sid }
      },
      async prompt(input) {
        if (input.sessionId === 'cmd-1') {
          cmdWakes.push(input)
          if (input.requestId.startsWith('req-exec-settled-')) w1WakePromise.resolve(input)
          if (input.requestId.startsWith('req-user-review-')) userReviewWakePromise.resolve(input)
          return { accepted: true }
        }
        if (input.agentPreset === 'auto-wake--w1' || h1.sessions.get(input.sessionId)?.preset === 'auto-wake--w1') {
          writeFileSync(join(root1, 'out.txt'), 'hello', 'utf8')
          const snap = await h1.callTool('get_team_status', 'cmd-1')
          const execId = snap.executions.at(-1).executionId
          assert.equal((await h1.callTool('submit_result', input.sessionId, {
            taskId: 'task-1', executionId: execId, summary: 'wrote out.txt', artifactRefs: ['out.txt'], checksPassed: true,
          })).ok, true)
        }
      },
    },
  })
  t.after(() => { h1.dispose(); rmSync(root1, { recursive: true, force: true }) })

  h1.sessions.set('cmd-1', { id: 'cmd-1', preset: team1.id, header: { cwd: root1 } })
  assert.equal((await h1.request('/concerto/session?sessionId=cmd-1')).status, 200)
  const rev1 = await approveFixturePlan(h1.callTool, h1.request, 'cmd-1')
  await h1.callTool('submit_decision', 'cmd-1', {
    decisionId: 'd1', expectedPlanRevision: rev1, action: 'create_task',
    payload: { title: 'Write out.txt', objective: 'Create out.txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })

  const disp1 = await h1.callTool('dispatch_task', 'cmd-1', { taskId: 'task-1', commandId: 'disp-1', memberId: 'w1' })
  assert.equal(disp1.ok, true)
  const settledWake = await w1WakePromise.promise
  assert.equal(settledWake.requestId, `req-exec-settled-${disp1.executionId}`)
  assert.match(settledWake.content[0].text, /自动完成确定性交付验收.*无需独立审查/)

  const snapAfterW1 = await h1.callTool('get_team_status', 'cmd-1')
  assert.equal(snapAfterW1.tasks[0].state, 'completed')
  assert.equal(snapAfterW1.tasks[0].review.verdict, 'pass')
  const cmdReview = await h1.callTool('submit_review', 'cmd-1', {
    taskId: 'task-1',
    executionId: disp1.executionId,
    resultId: snapAfterW1.tasks[0].result.resultId,
    verdict: 'pass',
    reason: 'verified out.txt',
    evidenceRefs: ['out.txt', 'event-nonblocking-note'],
  })
  assert.equal(cmdReview.ok, true)
  assert.equal(cmdReview.state, 'completed')
  assert.equal((await h1.callTool('get_team_status', 'cmd-1')).tasks[0].review.reason, 'verified out.txt')

  // 2) requiresReview=true with independent Reviewer: skips intermediate wake while Reviewer runs, wakes once Reviewer settles
  const root2 = mkdtempSync(join(tmpdir(), 'concerto-autowake-rev-'))
  const team2 = {
    id: 'auto-wake-rev',
    name: 'Auto Wake Rev',
    policyRequiresReview: true,
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' },
      { id: 'r1', roleKind: 'reviewer', source: 'hosted', toolProfile: 'readonly' },
    ],
  }
  const revCmdWakes = []
  const revDoneWake = Promise.withResolvers()
  const reviewerStarted = Promise.withResolvers()
  const releaseReviewer = Promise.withResolvers()
  const h2 = createHarness({
    root: root2,
    team: team2,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h2.sessions.size + 1}`
        h2.sessions.set(sid, { id: sid, preset: agentPreset, header: { cwd } })
        h2.agents.set(sid, {
          id: sid,
          status: agentPreset.endsWith('--r1') ? 'running' : 'idle',
          whenIdle() {
            return agentPreset.endsWith('--r1') ? releaseReviewer.promise : Promise.resolve()
          },
        })
        return { sessionId: sid }
      },
      async prompt(input) {
        if (input.sessionId === 'cmd-2') {
          revCmdWakes.push(input)
          if (input.requestId.startsWith('req-exec-settled-')) revDoneWake.resolve(input)
          return { accepted: true }
        }
        const preset = h2.sessions.get(input.sessionId)?.preset || ''
        if (preset.endsWith('--w1')) {
          writeFileSync(join(root2, 'deliverable.txt'), 'ok', 'utf8')
          const st = await h2.callTool('get_team_status', 'cmd-2')
          await h2.callTool('submit_result', input.sessionId, {
            taskId: 'task-1', executionId: st.executions[0].executionId, summary: 'delivered', artifactRefs: ['deliverable.txt'], checksPassed: true,
          })
        } else if (preset.endsWith('--r1')) {
          reviewerStarted.resolve(input.sessionId)
        }
      },
    },
  })
  t.after(() => { releaseReviewer.resolve(); h2.dispose(); rmSync(root2, { recursive: true, force: true }) })

  h2.sessions.set('cmd-2', { id: 'cmd-2', preset: team2.id, header: { cwd: root2 } })
  assert.equal((await h2.request('/concerto/session?sessionId=cmd-2')).status, 200)
  const rev2 = await approveFixturePlan(h2.callTool, h2.request, 'cmd-2')
  await h2.callTool('submit_decision', 'cmd-2', {
    decisionId: 'd-rev', expectedPlanRevision: rev2, action: 'create_task',
    payload: { title: 'Reviewed task', objective: 'Create deliverable.txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
  })
  const dw = await h2.callTool('dispatch_task', 'cmd-2', { taskId: 'task-1', commandId: 'dw-rev', memberId: 'w1' })
  assert.equal(dw.ok, true)
  const rSid = await reviewerStarted.promise
  assert.equal(revCmdWakes.filter((w) => w.requestId.startsWith('req-exec-settled-')).length, 0)

  const stMid = await h2.callTool('get_team_status', 'cmd-2')
  assert.equal((await h2.callTool('submit_review', rSid, {
    taskId: 'task-1', executionId: dw.executionId, resultId: stMid.tasks[0].result.resultId,
    verdict: 'pass', reason: 'r1 checked deliverable.txt', evidenceRefs: ['deliverable.txt'],
  })).ok, true)
  releaseReviewer.resolve()

  const wakeAfterReviewer = await revDoneWake.promise
  assert.match(wakeAfterReviewer.content[0].text, /独立审查者 r1 已结束本次执行.*taskState=completed/)

  // Also test manual user review pass with empty reason + wake on a second task in h2
  const createdManual = await h2.callTool('submit_decision', 'cmd-2', {
    decisionId: 'd-manual', expectedPlanRevision: stMid.planRevision, action: 'create_task',
    payload: { title: 'Manual pass task', objective: 'Manual check', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
  })
  assert.equal(createdManual.ok, true)
  const h3Root = mkdtempSync(join(tmpdir(), 'concerto-manual-review-pass-'))
  const team3 = {
    id: 'manual-pass', name: 'Manual Pass', commander: { id: 'c1', source: 'hosted' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'hosted', toolProfile: 'coding' }],
  }
  const manualWakes = []
  const h3 = createHarness({
    root: h3Root,
    team: team3,
    controllerImpl: {
      async create({ cwd, agentPreset }) {
        const sid = `sess-${h3.sessions.size + 1}`
        h3.sessions.set(sid, { id: sid, preset: agentPreset, header: { cwd } })
        h3.agents.set(sid, { id: sid, status: 'idle', async whenIdle() {} })
        return { sessionId: sid }
      },
      async prompt(input) {
        if (input.sessionId === 'cmd-3') { manualWakes.push(input); return { accepted: true } }
        writeFileSync(join(h3Root, 'm.txt'), 'manual', 'utf8')
        const st = await h3.callTool('get_team_status', 'cmd-3')
        await h3.callTool('submit_result', input.sessionId, {
          taskId: 'task-1', executionId: st.executions[0].executionId, summary: 'm ok', artifactRefs: ['m.txt'], checksPassed: true,
        })
      },
    },
  })
  t.after(() => { h3.dispose(); rmSync(h3Root, { recursive: true, force: true }) })
  h3.sessions.set('cmd-3', { id: 'cmd-3', preset: team3.id, header: { cwd: h3Root } })
  assert.equal((await h3.request('/concerto/session?sessionId=cmd-3')).status, 200)
  const rev3 = await approveFixturePlan(h3.callTool, h3.request, 'cmd-3')
  await h3.callTool('submit_decision', 'cmd-3', {
    decisionId: 'dm-1', expectedPlanRevision: rev3, action: 'create_task',
    payload: { title: 'Manual task', objective: 'Create m.txt', acceptance: ['exists'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  })
  const dw3 = await h3.callTool('dispatch_task', 'cmd-3', { taskId: 'task-1', commandId: 'dm-d1', memberId: 'w1' })
  let st3 = await h3.callTool('get_team_status', 'cmd-3')
  for (let i = 0; i < 20 && st3.executions[0].state !== 'finished'; i += 1) {
    await new Promise((r) => setTimeout(r, 15))
    st3 = await h3.callTool('get_team_status', 'cmd-3')
  }
  const failBlank = await h3.request('/concerto/tasks/review', {
    sessionId: 'cmd-3', taskId: 'task-1', executionId: dw3.executionId, resultId: st3.tasks[0].result.resultId,
    commandId: 'rev-fail-blank', verdict: 'fail', reason: '   ',
  })
  assert.equal(failBlank.status, 400)
  assert.equal(failBlank.value.code, 'invalid')

  const passBlank = await h3.request('/concerto/tasks/review', {
    sessionId: 'cmd-3', taskId: 'task-1', executionId: dw3.executionId, resultId: st3.tasks[0].result.resultId,
    commandId: 'rev-pass-blank', verdict: 'pass', reason: '', evidenceRefs: ['m.txt'],
  })
  assert.equal(passBlank.status, 200)
  assert.equal(passBlank.value.state, 'completed')
  await new Promise((r) => setTimeout(r, 10))
  const finalSt3 = await h3.callTool('get_team_status', 'cmd-3')
  assert.equal(finalSt3.tasks[0].review.reason, '用户确认验收通过')
  assert.ok(manualWakes.some((w) => w.requestId === 'req-user-review-rev-pass-blank'))
})
