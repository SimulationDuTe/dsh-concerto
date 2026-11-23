import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { readRuntimeSnapshot } from '../packages/dsh-concerto/lib/runtime_storage.mjs'

const script = fileURLToPath(new URL('../packages/dsh-concerto/scripts/export-run-metrics.mjs', import.meta.url))
const compareScript = fileURLToPath(new URL('../packages/dsh-concerto/scripts/compare-run-metrics.mjs', import.meta.url))
const header = 'runId,endToEndMs,accepted,reworks,manualOps'

function fixturePath(t) {
  const dir = mkdtempSync(join(tmpdir(), 'concerto-run-metrics-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return join(dir, 'runtime.json')
}

function runExport(path, ...args) {
  return spawnSync(process.execPath, [script, path, ...args], { encoding: 'utf8' })
}

function runComparison(runtimePath, manualCsv, concertoCsv) {
  const manualPath = join(dirname(runtimePath), 'manual.csv')
  const concertoPath = join(dirname(runtimePath), 'concerto.csv')
  writeFileSync(manualPath, manualCsv)
  writeFileSync(concertoPath, concertoCsv)
  return spawnSync(process.execPath, [compareScript, manualPath, concertoPath], { encoding: 'utf8' })
}

test('Gate E export reads a persisted accepted run and counts only the started rework', (t) => {
  const path = fixturePath(t)
  const runtime = createTeamRuntime({ statePath: path })
  const scope = 'run-export'
  const taskId = 'task-1'
  assert.equal(runtime.bindSession('commander', scope, { teamId: 'team', projectId: 'project', commanderId: 'c1' }).ok, true)
  assert.equal(runtime.submit({
    decisionId: 'create', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Verify', objective: 'Deliver', constraints: [], acceptance: ['Checked'], dependsOn: [], assigneeRole: 'worker', requiresReview: true },
  }, scope).ok, true)

  for (const verdict of ['fail', 'pass']) {
    const attempt = runtime.startExecution(scope, taskId, { memberId: 'w1', commandId: `dispatch-${verdict}` })
    assert.equal(attempt.ok, true)
    assert.equal(runtime.submitResult({ taskId, executionId: attempt.executionId, summary: 'Candidate', checksPassed: true }, scope).ok, true)
    const { resultId } = runtime.getTask({ taskId }, scope).task.result
    assert.equal(runtime.submitReview({ taskId, executionId: attempt.executionId, resultId, verdict, reason: 'Reviewed' }, scope).ok, true)
    if (verdict === 'fail') {
      assert.equal(runExport(path, scope).stdout, `${header}\r\n${scope},unknown,unknown,0,unknown\r\n`)
    }
  }
  assert.equal(runtime.submit({
    decisionId: 'finish', expectedPlanRevision: 2, action: 'finish_goal',
    payload: { goalId: 'project', summary: 'Accepted' },
  }, scope).ok, true)

  const original = readFileSync(path, 'utf8')
  const [record] = JSON.parse(original).sessions
  const startedAt = record.events.find((event) => event.type === 'session.bound').recordedAt
  const elapsed = Date.parse(record.goalCompletion.finishedAt) - Date.parse(startedAt)
  const out = runExport(path, scope)
  assert.equal(out.status, 0, out.stderr)
  assert.equal(out.stdout, `${header}\r\n${scope},${elapsed},true,1,unknown\r\n`)
  assert.equal(readFileSync(path, 'utf8'), original)
})

test('Gate E export preserves legacy audits and distinguishes closed failure from missing evidence', (t) => {
  const path = fixturePath(t)
  const finish = { state: 'completed', finishedAt: '2026-11-20T00:00:02.000Z' }
  const events = [{ type: 'session.bound', payload: { roleKind: 'commander' }, recordedAt: '2026-11-20T00:00:00.000Z' }]
  writeFileSync(path, JSON.stringify({ schemaVersion: 2, sessions: [
    { sessionId: 'legacy,"failed"', goalCompletion: finish, events, tasks: [
      { state: 'failed', attempt: 2, events: [
        { type: 'review.submitted', payload: { input: { verdict: 'fail' } } },
        { type: 'execution.dispatched' },
      ] },
    ] },
    { sessionId: 'legacy-missing', goalCompletion: finish, tasks: [{ state: 'completed' }] },
    { sessionId: 'unfinished', events, tasks: [] },
  ] }))
  const out = runExport(path)
  assert.equal(out.status, 0, out.stderr)
  assert.deepEqual(out.stdout.trimEnd().split('\r\n'), [
    header,
    '"legacy,""failed""",2000,false,1,unknown',
    'legacy-missing,unknown,true,unknown,unknown',
    'unfinished,unknown,unknown,0,unknown',
  ])
  const absent = runExport(path, 'missing')
  assert.equal(absent.status, 1)
  assert.equal(absent.stdout, '')
  assert.match(absent.stderr, /run not found/)
})

test('SQLite migrates legacy runs, keeps decision receipts and recovery, and exports read-only', (t) => {
  const legacyPath = fixturePath(t)
  const path = join(dirname(legacyPath), 'runtime.sqlite')
  const scope = 'run-migrate'
  const create = {
    decisionId: 'create', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Verify', objective: 'Deliver', constraints: [], acceptance: ['Checked'], dependsOn: [], assigneeRole: 'worker' },
  }
  const legacy = createTeamRuntime({ statePath: legacyPath })
  assert.equal(legacy.bindSession('commander', scope, { teamId: 'team', projectId: 'project', commanderId: 'c1' }).ok, true)
  const created = legacy.submit(create, scope)
  assert.equal(created.ok, true)
  const execution = legacy.startExecution(scope, created.result.taskId, { memberId: 'w1' })
  assert.equal(execution.ok, true)
  const original = readFileSync(legacyPath)

  const runtime = createTeamRuntime({ statePath: path })
  const rival = createTeamRuntime({ statePath: path })
  assert.equal(runtime.getStatus(scope).executions.find((item) => item.executionId === execution.executionId).state, 'unknown')
  const beforeReplay = readFileSync(path)
  assert.deepEqual(runtime.submit(create, scope).result, created.result)
  assert.deepEqual(readFileSync(path), beforeReplay)
  assert.equal(runtime.getBinding('commander').teamSessionId, scope)
  assert.deepEqual(readFileSync(legacyPath), original)

  const decision = { decisionId: 'wait', expectedPlanRevision: 2, action: 'wait', payload: { reason: 'Wait for recovery' } }
  assert.equal(runtime.submit({ ...decision, decisionId: 'other-wait' }, scope).ok, true)
  const databaseBefore = readFileSync(path)
  assert.throws(() => rival.submit(decision, scope), (error) => {
    assert.match(error.cause.message, /changed since it was opened/)
    return true
  })
  assert.deepEqual(readFileSync(path), databaseBefore)
  const reopened = createTeamRuntime({ statePath: path })
  assert.equal(reopened.submit(decision, scope).replayed, false)
  assert.equal(createTeamRuntime({ statePath: path }).submit(decision, scope).replayed, true)

  const beforeExport = readFileSync(path)
  const [run] = readRuntimeSnapshot(path).sessions
  assert.equal(run.tasks[0].taskId, created.result.taskId)
  assert.equal(run.decisions.find((row) => row.id === 'create').result.taskId, created.result.taskId)
  const out = runExport(path, scope)
  assert.equal(out.status, 0, out.stderr)
  assert.equal(out.stdout, `${header}\r\n${scope},unknown,unknown,0,unknown\r\n`)
  assert.deepEqual(readFileSync(path), beforeExport)
})

test('Gate E comparison reads exported CSV and uses known denominators without dropping measured zeroes', (t) => {
  const path = fixturePath(t)
  writeFileSync(path, JSON.stringify({ sessions: [
    {
      sessionId: 'exported,"failed"\nrun',
      events: [{ type: 'session.bound', payload: { roleKind: 'commander' }, recordedAt: '2026-11-20T00:00:00Z' }],
      goalCompletion: { state: 'completed', finishedAt: '2026-11-20T00:00:02Z' },
      tasks: [{ state: 'failed', reworkCount: 1 }],
    },
    { sessionId: 'unfinished', tasks: [] },
  ] }))
  const exported = runExport(path)
  assert.equal(exported.status, 0, exported.stderr)
  const manual = `\uFEFF${header}\nm1,0,true,0,2\nm2,1000,false,2,0\nm3,unknown,unknown,unknown,`
  const out = runComparison(path, manual, exported.stdout)
  assert.equal(out.status, 0, out.stderr)
  assert.deepEqual(out.stdout.trimEnd().split('\n').slice(2), [
    '| 样本数 | 3 | 2 |',
    '| 端到端耗时均值（ms） | 500.0 · 已知 2 · 缺失 1/3 (33.3%) | 2000.0 · 已知 1 · 缺失 1/2 (50.0%) |',
    '| 通过率 | 50.0% (1/2) · 已知 2 · 缺失 1/3 (33.3%) | 0.0% (0/1) · 已知 1 · 缺失 1/2 (50.0%) |',
    '| 返工次数均值 | 1.0 · 已知 2 · 缺失 1/3 (33.3%) | 0.5 · 已知 2 · 缺失 0/2 (0.0%) |',
    '| 人工跨客户端操作次数均值 | 1.0 · 已知 2 · 缺失 1/3 (33.3%) | unknown · 已知 0 · 缺失 2/2 (100.0%) |',
  ])
})

test('Gate E comparison leaves rates unknown when a group has no samples', (t) => {
  const out = runComparison(fixturePath(t), `${header}\n`, `${header}\nm1,500,true,0,0\n`)
  assert.equal(out.status, 0, out.stderr)
  assert.match(out.stdout, /\| 样本数 \| 0 \| 1 \|/)
  assert.match(out.stdout, /\| 通过率 \| unknown · 已知 0 · 缺失 0\/0 \(unknown\) \| 100\.0% \(1\/1\)/)
})

test('Gate E comparison rejects invalid metrics and duplicate runs before reporting numbers', (t) => {
  const path = fixturePath(t)
  const goodRow = 'm1,500,true,0,0'
  for (const [rows, error] of [
    ['m1,500,maybe,0,0', /accepted must be true, false, or unknown/],
    ['m1,500,true,-1,0', /reworks must be a non-negative integer/],
    [`${goodRow}\n${goodRow}`, /duplicate runId/],
    ['"m1,500,true,0,0', /malformed CSV record 2/],
  ]) {
    const out = runComparison(path, `${header}\n${goodRow}\n`, `${header}\n${rows}\n`)
    assert.equal(out.status, 1)
    assert.equal(out.stdout, '')
    assert.match(out.stderr, error)
  }
})
