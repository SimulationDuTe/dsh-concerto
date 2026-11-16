import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTeamId, presetRowId, presetRowFromTeam, buildPresetBundle,
} from '../packages/dsh-concerto/lib/projection/team_preset.mjs'

const team = {
  id: 'Team Alpha',
  name: 'Alpha',
  order: 10,
  commander: { id: 'm1', source: 'hosted', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
  members: [
    { id: 'm2', roleKind: 'worker', source: 'external', connector: 'codex' },
    { id: 'm3', roleKind: 'worker', roleId: 'godot-dev', source: 'hosted', provider: 'x-ds', model: 'deepseek-v4.1-flash' },
  ],
}

test('normalizeTeamId', () => {
  assert.equal(normalizeTeamId('Team Alpha'), 'team-alpha')
  assert.equal(normalizeTeamId('  A__B!! '), 'a-b')
  assert.equal(normalizeTeamId('!!!'), null)
})

test('preset row id convention', () => {
  assert.equal(presetRowId('team-alpha'), 'preset-team-alpha')
})

test('preset row: external member becomes descriptor row', () => {
  const r = presetRowFromTeam(team)
  assert.equal(r.ok, true)
  const external = r.row.config.plugins.find((p) => p.config.memberId === 'm2')
  assert.equal(external.config.connector, 'codex')
  assert.equal(external.config.provider, undefined)
})

test('preset row: external source requires a connector', () => {
  const bad = { ...team, members: [{ id: 'm9', roleKind: 'worker', source: 'external' }] }
  const r = presetRowFromTeam(bad)
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].code, 'invalid_member')
})

test('role: custom roleId passes through, defaults to roleKind', () => {
  const r = presetRowFromTeam(team)
  const custom = r.row.config.plugins.find((p) => p.config.memberId === 'm3')
  assert.equal(custom.config.roleKind, 'worker')
  assert.equal(custom.config.roleId, 'godot-dev')

  const plain = r.row.config.plugins.find((p) => p.config.memberId === 'm2')
  assert.equal(plain.config.roleId, 'worker')
  assert.equal(plain.config.roleKind, 'worker')
})

test('role: commander kind is forced, roleId stays custom', () => {
  const r = presetRowFromTeam({ ...team, commander: { ...team.commander, roleId: 'lead-architect' } })
  const commander = r.row.config.plugins[0]
  assert.equal(commander.config.roleKind, 'commander')
  assert.equal(commander.config.roleId, 'lead-architect')
})

test('role: unknown roleKind rejected', () => {
  const bad = { ...team, members: [{ id: 'm9', roleKind: 'planner', roleId: 'planner', source: 'hosted' }] }
  const r = presetRowFromTeam(bad)
  assert.equal(r.ok, false)
  assert.match(r.errors[0].detail, /roleKind/)
})

test('preset row: hosted member carries provider/model', () => {
  const r = presetRowFromTeam(team)
  const hosted = r.row.config.plugins.find((p) => p.config.memberId === 'm3')
  assert.equal(hosted.config.provider, 'x-ds')
})

test('duplicate member id rejected', () => {
  const bad = { ...team, members: [{ id: 'm1', roleKind: 'worker', source: 'external', connector: 'codex' }] }
  const r = presetRowFromTeam(bad)
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].code, 'duplicate_member')
})

test('bundle: multiple teams -> multiple insert blocks', () => {
  const b = buildPresetBundle([team, { ...team, id: 'beta', name: 'Beta', order: 20 }])
  assert.equal(b.ok, true)
  const patch = b.files['cordis.patch.yml']
  // 每个团队 1 条 preset + 每个 hosted 成员 1 条成员 preset（fixture 各 1 个）
  const hosted = (team.members ?? []).filter((m) => m.source === 'hosted').length
  assert.equal((patch.match(/- insert:/g) || []).length, 2 * (1 + hosted))
  assert.match(patch, /preset-team-alpha/)
  assert.match(patch, /preset-beta/)
  assert.match(patch, /team-alpha--m3/)
  JSON.parse(b.files['package.json'])
})

test('bundle: duplicate normalized ids rejected', () => {
  const b = buildPresetBundle([team, { ...team, id: 'team alpha' }])
  assert.equal(b.ok, false)
  assert.equal(b.errors[0].code, 'duplicate_team')
})

test('bundle: hosted members get their own preset rows', () => {
  const withMembers = {
    id: 'gamma', name: 'Gamma',
    commander: { id: 'c1', source: 'hosted' },
    members: [
      { id: 'w1', roleKind: 'worker', source: 'hosted', provider: 'p', model: 'm' },
      { id: 'w2', roleKind: 'worker', source: 'external', connector: 'codex' },
    ],
  }
  const b = buildPresetBundle([withMembers])
  assert.equal(b.ok, true)
  const patch = b.files['cordis.patch.yml']
  assert.match(patch, /gamma--w1/)
  assert.doesNotMatch(patch, /gamma--w2/) // 外部成员不单独成会话
  assert.match(patch, /id: 'preset-gamma'/) // 团队 preset 仍然存在
})

test('missing module for a source is reported', () => {
  const r = presetRowFromTeam(team, { memberModules: { hosted: null, external: null, web: null } })
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].code, 'missing_module')
})


test('commander roster descriptors do not inject worker personas', () => {
  const result = presetRowFromTeam(team)
  assert.equal(result.row.config.plugins[0].config.descriptorOnly, undefined)
  assert.ok(result.row.config.plugins.slice(1).every(row=>row.config.descriptorOnly === true))
})
