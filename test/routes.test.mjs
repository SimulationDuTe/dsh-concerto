import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { registerConcertoRoutes } from '../packages/dsh-concerto/lib/routes.mjs'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'

function setup(deps = {}) {
  const routes = new Map()
  registerConcertoRoutes({ register: ({ path, handler }) => { routes.set(path, handler); return () => {} } }, '/concerto', {
    store: {},
    sessionInfo: (sessionId) => sessionId === 'owned' ? { ok: true, snapshot: { teamSessionId: 'run-owned', tasks: [{ taskId: 'mine' }] } } : { ok: false },
    memberActivity: (sessionId, opts) => ({ ok: true, sessionId, ...opts, items: [{ activityId: 'act-1', kind: 'message', summary: 'hello' }], hasMore: false }),
    saveUserLayout: (sessionId, body) => ({ ok: true, id: body.id, version: 1, userLayoutVersion: 1 }),
    saveUserViewPreferences: (sessionId, body) => ({ ok: true, userPinnedRefs: body.pinnedRefs ?? (body.toggleRef ? [body.toggleRef] : []) }),
    tasks: { answer: async (body) => body.sessionId === 'owned' ? { ok: true, requestId: body.requestId } : { ok: false, code: 'unauthorized' } },
    ...deps,
  })
  const request = async (path, { method = 'GET', body, address = '127.0.0.1', origin = 'http://localhost:1234', headers = {} } = {}) => {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method, url: path, socket: { remoteAddress: address }, headers: { host: 'localhost:1234', origin, 'content-type': 'application/json', ...headers } })
    let status, responseHeaders = {}, rawBody = ''
    await routes.get(path.split('?')[0])(req, {
      writeHead(code, hdrs = {}) { status = code; responseHeaders = hdrs },
      end(value) { rawBody = typeof value === 'string' ? value : Buffer.from(value || '').toString('utf8') },
    })
    let parsed
    try { parsed = JSON.parse(rawBody) } catch { parsed = rawBody }
    return { status, headers: responseHeaders, body: parsed, rawBody }
  }
  request.has = (path) => routes.has(path)
  return request
}

test('connection check distinguishes host catalog, native handshake, and incompatible protocol', async () => {
  let probes = 0
  let probeResult = { ok: true, userAgent: 'codex/test' }
  const request = setup({
    checkHostedConnection: ({ provider, model }) => {
      assert.equal(provider, 'custom')
      assert.equal(model, 'model')
      return { state: 'configured', checked: ['config', 'provider', 'model'] }
    },
    connectors: { defaultCwd: 'configured-cwd', registry: { get: (name) => name === 'codex' ? {
      probe: ({ cwd }) => {
        assert.equal(cwd, 'configured-cwd')
        probes++
        return probeResult
      },
    } : undefined } },
  })
  const route = '/concerto/connection/check'
  const check = (member) => request(route, { method: 'POST', body: { member, cwd: 'client-cwd' } })
  assert.equal((await check({ source: 'bogus' })).status, 400)
  assert.equal((await check({ source: 'hosted', provider: 'custom' })).body.reason, 'model_config_missing')
  assert.equal((await check({ source: 'hosted', provider: ' custom ', model: ' model ' })).body.state, 'configured')
  assert.equal((await check({ source: 'external', connector: 'missing' })).body.reason, 'connector_missing')
  assert.equal((await request(route, { method: 'POST', origin: 'http://other.test', body: { member: { source: 'external', connector: 'codex' } } })).status, 401)
  assert.equal(probes, 0)
  assert.deepEqual((await check({ source: 'external', connector: 'codex' })).body, {
    state: 'reachable', checked: ['config', 'handshake'], version: 'codex/test',
  })
  probeResult = { ok: false, code: 'version_mismatch', detail: 'initialize unavailable' }
  assert.equal((await check({ source: 'external', connector: 'codex' })).body.state, 'versionMismatch')
  assert.equal(probes, 2)
})

test('teams RPC opens a saved configuration and protects versioned edits and deletion', async () => {
  const store = createTeamStore()
  let generations = 0
  const request = setup({ store, generate: () => {
    generations++
    return { ok: true, hash: `hash-${generations}` }
  } })
  const path = '/concerto/teams'
  const team = { id: 'alpha', name: 'Alpha', commander: { id: 'c', source: 'hosted' }, members: [] }
  const post = (body) => request(path, { method: 'POST', body })
  assert.equal((await post({ team, expectedConfigVersion: 0 })).body.generatedHash, 'hash-1')
  const detail = await request(`${path}?teamId=alpha`)
  assert.deepEqual(detail.body, { team, configVersion: 1 })
  const renamed = { ...team, name: 'Renamed', description: 'Updated' }
  assert.equal((await post({ team: renamed, expectedConfigVersion: 1, requestId: 'rename' })).body.configVersion, 2)
  assert.equal((await post({ team, expectedConfigVersion: detail.body.configVersion })).status, 409)
  const staleDelete = { teamId: 'alpha', expectedConfigVersion: 1 }
  assert.equal((await request(path, { method: 'DELETE', origin: 'http://other.test', body: staleDelete })).status, 401)
  assert.equal((await request(path, { method: 'DELETE', body: staleDelete })).status, 409)
  assert.equal(generations, 2)
  const deleted = await request(path, { method: 'DELETE', body: { ...staleDelete, expectedConfigVersion: 2, requestId: 'delete' } })
  assert.equal(deleted.body.generatedHash, 'hash-3')
  assert.equal((await request(`${path}?teamId=alpha`)).status, 404)
  assert.deepEqual((await request(path)).body.teams, [])
})

test('status requires a managed session instead of exposing all scopes', async () => {
  const request = setup()
  assert.equal((await request('/concerto/status')).status, 400)
  assert.equal((await request('/concerto/status?sessionId=unknown')).status, 404)
  const owned = await request('/concerto/status?sessionId=owned&teamId=forged')
  assert.equal(owned.status, 200)
  assert.equal(owned.body.teamSessionId, 'run-owned')
  assert.equal(owned.body.sessions, undefined)
})

test('team snapshot routes cap the complete UTF-8 response at 256 KiB', async () => {
  const limit = 256 * 1024
  const task = { taskId: 'task-1', title: '审查“证据”\n', objective: '' }
  const snapshot = { teamSessionId: 'run-owned', serverTime: '2026-11-21T00:00:00.000Z', tasks: [task] }
  const info = { ok: true, teamName: '协作团队', snapshot }
  const request = setup({ sessionInfo: (id) => id === 'owned' ? info : { ok: false } })

  for (const route of ['session', 'status']) {
    const path = `/concerto/${route}?sessionId=owned`
    task.objective = ''
    const base = await request(path)
    assert.equal(base.status, 200)
    assert.deepEqual(base.body, route === 'session' ? info : { ok: true, ...snapshot })
    const padding = limit - Buffer.byteLength(base.rawBody, 'utf8')
    task.objective = '证'.repeat(Math.floor(padding / 3)) + 'a'.repeat(padding % 3)

    const exact = await request(path)
    assert.equal(exact.status, 200)
    assert.equal(Buffer.byteLength(exact.rawBody, 'utf8'), limit)
    assert.equal(exact.headers['cache-control'], 'no-store')
    const returned = route === 'session' ? exact.body.snapshot : exact.body
    assert.deepEqual(returned.tasks, [task])

    task.objective += 'a'
    if (route === 'session') {
      assert.ok(Buffer.byteLength(JSON.stringify(snapshot), 'utf8') < limit)
    }
    const excess = await request(path)
    assert.equal(excess.status, 412)
    assert.deepEqual(excess.body, { code: 'precondition_failed', detail: 'Team snapshot exceeds the 256 KiB response limit' })
    assert.ok(Buffer.byteLength(excess.rawBody, 'utf8') < limit)
    assert.equal(excess.headers['cache-control'], 'no-store')
    assert.equal((await request(path, { origin: 'http://elsewhere.test' })).status, 401)

    task.objective = task.objective.slice(0, -1)
    assert.equal((await request(path)).rawBody, exact.rawBody)
  }
})

test('raw HTTP refuses remote, forwarded and cross-origin callers', async () => {
  const request = setup()
  for (const options of [{ address: '192.168.1.2' }, { origin: 'http://evil.test' }, { headers: { 'x-forwarded-for': '192.168.1.2' } }]) {
    assert.equal((await request('/concerto/status?sessionId=owned', options)).status, 401)
  }
})

test('respond awaits completion and preserves authorization failure', async () => {
  const request = setup()
  assert.equal((await request('/concerto/requests/respond', { method: 'POST', body: { sessionId: 'other' } })).status, 401)
  assert.equal((await request('/concerto/requests/respond', { method: 'POST', body: { sessionId: 'owned', requestId: 'req' } })).body.requestId, 'req')
})

test('obsolete global structured cache and unmanaged execution endpoints are retired', async () => {
  const request = setup()
  assert.equal((await request('/concerto/structured?callId=other')).status, 410)
  assert.equal((await request('/concerto/connectors/execute', { method: 'POST' })).status, 410)
})

test('member activity, view user-layout, and allowlisted vendor assets routes behave safely', async () => {
  const request = setup()
  assert.equal((await request('/concerto/members/activity')).status, 400)
  assert.equal((await request('/concerto/members/activity?sessionId=unknown&memberId=w1')).status, 404)
  const act = await request('/concerto/members/activity?sessionId=owned&memberId=w1&before=5&limit=10')
  assert.equal(act.status, 200)
  assert.equal(act.body.memberId, 'w1')
  assert.equal(act.body.before, 5)
  assert.equal(act.body.limit, 10)
  assert.equal(act.body.items[0].activityId, 'act-1')

  const opaqueAct = await request('/concerto/members/activity?sessionId=owned&memberId=w1&before=cur%3A1700000000000%3AMTpjbWQtMTow&limit=5')
  assert.equal(opaqueAct.status, 200)
  assert.equal(opaqueAct.body.before, 'cur:1700000000000:MTpjbWQtMTow')

  assert.equal((await request('/concerto/view-objects/user-layout', { method: 'POST', body: { id: 'b' } })).status, 400)
  assert.equal((await request('/concerto/view-objects/user-layout', { method: 'POST', body: { sessionId: 'other', id: 'b' } })).status, 404)
  const ul = await request('/concerto/view-objects/user-layout', { method: 'POST', body: { sessionId: 'owned', id: 'b', layout: { offsets: { n1: { dx: 10, dy: 20 } } } } })
  assert.equal(ul.status, 200)
  assert.equal(ul.body.userLayoutVersion, 1)

  assert.equal(request.has('/concerto/assets/markmap.js'), false)

  const roughAsset = await request('/concerto/assets/rough.js')
  assert.equal(roughAsset.status, 200)
  assert.match(roughAsset.headers['content-type'], /javascript/)
  assert.equal((await request('/concerto/assets/rough.js', { origin: 'http://evil.test' })).status, 401)

  assert.equal((await request('/concerto/view-preferences', { method: 'POST', body: { toggleRef: 'table:data' } })).status, 400)
  assert.equal((await request('/concerto/view-preferences', { method: 'POST', body: { sessionId: 'other', toggleRef: 'table:data' } })).status, 404)
  const vp = await request('/concerto/view-preferences', { method: 'POST', body: { sessionId: 'owned', toggleRef: 'diagram:live-flow' } })
  assert.equal(vp.status, 200)
  assert.deepEqual(vp.body.userPinnedRefs, ['diagram:live-flow'])
})
