import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { registerConcertoRoutes } from '../packages/dsh-concerto/lib/routes.mjs'

function setup() {
  const routes = new Map()
  registerConcertoRoutes({ register: ({ path, handler }) => { routes.set(path, handler); return () => {} } }, '/concerto', {
    store: {},
    sessionInfo: (sessionId) => sessionId === 'owned' ? { ok: true, snapshot: { teamSessionId: 'run-owned', tasks: [{ taskId: 'mine' }] } } : { ok: false },
    memberActivity: (sessionId, opts) => ({ ok: true, sessionId, ...opts, items: [{ activityId: 'act-1', kind: 'message', summary: 'hello' }], hasMore: false }),
    saveUserLayout: (sessionId, body) => ({ ok: true, id: body.id, version: 1, userLayoutVersion: 1 }),
    saveUserViewPreferences: (sessionId, body) => ({ ok: true, userPinnedRefs: body.pinnedRefs ?? (body.toggleRef ? [body.toggleRef] : []) }),
    tasks: { answer: async (body) => body.sessionId === 'owned' ? { ok: true, requestId: body.requestId } : { ok: false, code: 'unauthorized' } },
  })
  return async (path, { method = 'GET', body, address = '127.0.0.1', origin = 'http://localhost:1234', headers = {} } = {}) => {
    const req = Readable.from(body ? [JSON.stringify(body)] : [])
    Object.assign(req, { method, url: path, socket: { remoteAddress: address }, headers: { host: 'localhost:1234', origin, 'content-type': 'application/json', ...headers } })
    let status, responseHeaders = {}, rawBody = ''
    await routes.get(path.split('?')[0])(req, {
      writeHead(code, hdrs = {}) { status = code; responseHeaders = hdrs },
      end(value) { rawBody = typeof value === 'string' ? value : Buffer.from(value || '').toString('utf8') },
    })
    let parsed
    try { parsed = JSON.parse(rawBody) } catch { parsed = rawBody }
    return { status, headers: responseHeaders, body: parsed }
  }
}

test('status requires a managed session instead of exposing all scopes', async () => {
  const request = setup()
  assert.equal((await request('/concerto/status')).status, 400)
  assert.equal((await request('/concerto/status?sessionId=unknown')).status, 404)
  const owned = await request('/concerto/status?sessionId=owned&teamId=forged')
  assert.equal(owned.status, 200)
  assert.equal(owned.body.teamSessionId, 'run-owned')
  assert.equal(owned.body.sessions, undefined)
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

  const mmAsset = await request('/concerto/assets/markmap.js')
  assert.equal(mmAsset.status, 200)
  assert.match(mmAsset.headers['content-type'], /javascript/)
  assert.equal(mmAsset.headers['x-content-type-options'], 'nosniff')

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
