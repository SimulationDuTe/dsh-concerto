import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [workspace] = process.argv.slice(2)
assert.ok(workspace, 'Usage: node verify.mjs <workspace>')

const cwd = resolve(workspace)
const ticketFixture = fileURLToPath(new URL('./tickets.json', import.meta.url))
const alternateFixture = fileURLToPath(new URL('./alternate-tickets.json', import.meta.url))
const input = join(cwd, 'tickets.json')
const original = readFileSync(ticketFixture)
assert.deepEqual(readFileSync(input), original, 'Workspace tickets.json must match the original fixture')

function check(path, expected) {
  const result = spawnSync(process.execPath, [join(cwd, 'summarize.mjs'), path], {
    cwd, encoding: 'utf8', timeout: 5000,
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), expected)
}

check(input, [
  { owner: 'backend', count: 2, effort: 5 },
  { owner: 'client', count: 2, effort: 5 },
])
check(alternateFixture, [
  { owner: 'api', count: 1, effort: 7 },
  { owner: 'ops', count: 1, effort: 0 },
])
assert.deepEqual(readFileSync(input), original, 'summarize.mjs must leave tickets.json unchanged')
console.log('Gate E ticket summary checks passed')
