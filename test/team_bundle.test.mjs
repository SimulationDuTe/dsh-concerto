import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildTeamBundleFiles, hashFiles, readTeamBundleFiles, writeTeamBundle,
} from '../packages/dsh-concerto/lib/team_bundle.mjs'

const teamA = {
  id: 'alpha', name: 'Alpha',
  commander: { id: 'm1', source: 'hosted', provider: 'p', model: 'm' },
  members: [{ id: 'm2', roleKind: 'worker', source: 'hosted', provider: 'p', model: 'm' }],
}
const teamB = { ...teamA, id: 'beta', name: 'Beta' }

test('buildTeamBundleFiles: two teams -> two inserts and stable hash', () => {
  const a = buildTeamBundleFiles([teamA, teamB])
  const b = buildTeamBundleFiles([teamA, teamB])
  assert.equal(a.ok, true)
  assert.match(a.files['cordis.patch.yml'], /preset-alpha/)
  assert.match(a.files['cordis.patch.yml'], /preset-beta/)
  assert.equal(a.hash, b.hash)
})

test('buildTeamBundleFiles: invalid teams rejected', () => {
  const r = buildTeamBundleFiles([{ id: 'x', name: 'X' }])
  assert.equal(r.ok, false)
})

test('hashFiles: order independent, content sensitive', () => {
  const f1 = { 'a.yml': 'one', 'b.json': 'two' }
  const f2 = { 'b.json': 'two', 'a.yml': 'one' }
  assert.equal(hashFiles(f1), hashFiles(f2))
  assert.notEqual(hashFiles(f1), hashFiles({ ...f1, 'a.yml': 'changed' }))
})

test('writeTeamBundle + readTeamBundleFiles round-trip', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-teams-'))
  const built = buildTeamBundleFiles([teamA])
  await writeTeamBundle(dir, built.files)

  const names = (await readdir(dir)).sort()
  assert.deepEqual(names, ['cordis.patch.yml', 'package.json'])

  const back = await readTeamBundleFiles(dir, Object.keys(built.files))
  assert.equal(hashFiles(back), built.hash)

  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  assert.equal(pkg.name, '@local/concerto-teams')
})

test('readTeamBundleFiles: missing file -> null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'concerto-teams-'))
  const back = await readTeamBundleFiles(dir, ['package.json'])
  assert.equal(back, null)
})
