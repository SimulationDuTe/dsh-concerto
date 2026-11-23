import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamStore } from '../packages/dsh-concerto/lib/team_store.mjs'

const teamA = {
  id: 'alpha',
  name: 'Alpha',
  commander: { id: 'm1', source: 'hosted', provider: 'p', model: 'm' },
  members: [{ id: 'm2', roleKind: 'worker', source: 'hosted', provider: 'p', model: 'm' }],
}

test('saveTeam: first save -> configVersion 1', () => {
  const s = createTeamStore()
  const r = s.saveTeam({ team: teamA })
  assert.equal(r.ok, true)
  assert.equal(r.body.teamId, 'alpha')
  assert.equal(r.body.configVersion, 1)
  assert.equal(r.body.persisted, false) // 未配置 statePath 时纯内存
})

test('saveTeam: stale expectedConfigVersion -> conflict', () => {
  const s = createTeamStore()
  s.saveTeam({ team: teamA })
  const r = s.saveTeam({ team: teamA, expectedConfigVersion: 0 })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'conflict')
})

test('saveTeam: matching expectedConfigVersion -> version+1', () => {
  const s = createTeamStore()
  s.saveTeam({ team: teamA })
  const r = s.saveTeam({ team: { ...teamA, name: 'Alpha v2' }, expectedConfigVersion: 1 })
  assert.equal(r.ok, true)
  assert.equal(r.body.configVersion, 2)
})

test('saveTeam: requestId replay returns same result with replayed flag', () => {
  const s = createTeamStore()
  const first = s.saveTeam({ team: teamA, requestId: 'r1' })
  const second = s.saveTeam({ team: teamA, requestId: 'r1' })
  assert.equal(second.ok, true)
  assert.equal(second.body.replayed, true)
  assert.equal(second.body.configVersion, first.body.configVersion)
})

test('saveTeam: same requestId different payload -> idempotency_conflict', () => {
  const s = createTeamStore()
  s.saveTeam({ team: teamA, requestId: 'r1' })
  const r = s.saveTeam({ team: { ...teamA, name: 'Other' }, requestId: 'r1' })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'conflict')
  assert.equal(r.body.detail, 'idempotency_conflict')
})

test('saveTeam: empty requestId rejected', () => {
  const s = createTeamStore()
  const r = s.saveTeam({ team: teamA, requestId: '' })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'invalid')
})

test('saveTeam: invalid team rejected', () => {
  const s = createTeamStore()
  const r = s.saveTeam({ team: { id: 'x', name: 'X' } })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'invalid')
})

test('saveTeam: external member without connector rejected', () => {
  const s = createTeamStore()
  const r = s.saveTeam({
    team: { ...teamA, members: [{ id: 'm2', roleKind: 'worker', source: 'external' }] },
  })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'invalid')
})

test('saveTeam: maxTeams limit from config', () => {
  const s = createTeamStore({ maxTeams: 1 })
  assert.equal(s.saveTeam({ team: teamA }).ok, true)
  const r = s.saveTeam({ team: { ...teamA, id: 'beta', name: 'Beta' } })
  assert.equal(r.ok, false)
  assert.equal(r.body.code, 'invalid')
})

test('listTeams: returns summaries', () => {
  const s = createTeamStore()
  s.saveTeam({ team: teamA })
  const list = s.listTeams()
  assert.equal(list.length, 1)
  assert.deepEqual(list[0], { id: 'alpha', name: 'Alpha', configVersion: 1, memberCount: 2 })
})

test('getTeam: returns stored record', () => {
  const s = createTeamStore()
  s.saveTeam({ team: teamA })
  const rec = s.getTeam('alpha')
  assert.equal(rec.id, 'alpha')
  assert.equal(rec.version, 1)
  assert.equal(s.getTeam('missing'), null)
})

test('getSnapshot: not implemented yet -> not_found', () => {
  const s = createTeamStore()
  const r = s.getSnapshot('any')
  assert.equal(r.ok, false)
  assert.equal(r.code, 'not_found')
})

test('saveTeam: persists across store instances when statePath is set', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-state-'))
  const statePath = join(dir, 'teams.json')

  const first = createTeamStore({ statePath })
  const saved = first.saveTeam({ team: teamA })
  assert.equal(saved.body.persisted, true)

  const second = createTeamStore({ statePath })
  const list = second.listTeams()
  assert.equal(list.length, 1)
  assert.equal(list[0].id, 'alpha')
  assert.equal(list[0].configVersion, 1)
})

test('team edits keep identity and reject writes to deleted or recreated versions across reopen', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-team-edits-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const statePath = join(dir, 'teams.json')
  let store = createTeamStore({ statePath })
  assert.equal(store.saveTeam({ team: teamA }).ok, true)
  assert.equal(store.saveTeam({ team: teamA }).status, 409)

  const edit = { team: { ...teamA, name: '甲组' }, expectedConfigVersion: 1, requestId: 'rename' }
  assert.deepEqual(store.saveTeam(edit).body, { teamId: 'alpha', configVersion: 2, persisted: true })
  assert.equal(store.getTeam('alpha').team.name, '甲组')
  const oldDelete = { teamId: 'alpha', expectedConfigVersion: 1, requestId: 'delete-old' }
  assert.equal(store.deleteTeam(oldDelete).body.currentConfigVersion, 2)
  const deletion = { ...oldDelete, expectedConfigVersion: 2, requestId: 'delete-current' }
  assert.equal(store.deleteTeam(deletion).ok, true)

  store = createTeamStore({ statePath })
  assert.equal(store.getTeam('alpha'), null)
  assert.equal(store.deleteTeam(deletion).body.replayed, true)
  assert.equal(store.saveTeam(edit).body.replayed, true)
  assert.equal(store.getTeam('alpha'), null)
  assert.equal(store.saveTeam({ team: teamA, expectedConfigVersion: 2 }).status, 409)
  assert.equal(store.saveTeam({ team: teamA, expectedConfigVersion: 0 }).body.configVersion, 3)
  assert.equal(store.deleteTeam(deletion).body.replayed, true)
  assert.equal(store.getTeam('alpha').version, 3)
  assert.equal(store.deleteTeam({ ...deletion, requestId: 'delete-again' }).body.currentConfigVersion, 3)
})

test('failed deletion leaves the team and receipt available for a safe retry', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-team-delete-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const statePath = join(dir, 'teams.json')
  const store = createTeamStore({ statePath })
  assert.equal(store.saveTeam({ team: teamA }).ok, true)
  const before = await readFile(statePath)
  await mkdir(statePath + '.tmp')
  const mutation = { teamId: 'alpha', expectedConfigVersion: 1, requestId: 'delete-after-failure' }
  assert.equal(store.deleteTeam(mutation).status, 500)
  assert.equal(store.getTeam('alpha').version, 1)
  assert.deepEqual(await readFile(statePath), before)
  await rm(statePath + '.tmp', { recursive: true })
  assert.equal(store.deleteTeam(mutation).body.replayed, undefined)
  assert.equal(store.getTeam('alpha'), null)
})
