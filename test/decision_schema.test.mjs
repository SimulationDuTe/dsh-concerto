import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateDecisionPayload, checkModifyPrecondition,
  effectiveRequiresReview, resolvePolicyFloor,
  DECISION_ACTION,
} from '../packages/dsh-concerto/lib/domain/decision_schema.mjs'

const validCreate = {
  title: 't',
  objective: 'o',
  constraints: ['c'],
  acceptance: ['npm test passes'],
  dependsOn: [],
  assigneeRole: 'worker',
}

test('create_task: minimal valid payload', () => {
  assert.deepEqual(validateDecisionPayload(DECISION_ACTION.createTask, validCreate), { ok: true })
})

test('create_task: unknown field rejected', () => {
  const r = validateDecisionPayload(DECISION_ACTION.createTask, { ...validCreate, sneaky: 1 })
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].code, 'unknown_field')
})

test('create_task: empty acceptance rejected', () => {
  const r = validateDecisionPayload(DECISION_ACTION.createTask, { ...validCreate, acceptance: [] })
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].field, 'acceptance')
})

test('modify_task: patch unknown key rejected', () => {
  const r = validateDecisionPayload(DECISION_ACTION.modifyTask, { taskId: 't1', patch: { priority: 3 } })
  assert.equal(r.ok, false)
  assert.equal(r.errors[0].code, 'unknown_field')
})

test('modify_task: precondition requires pending and no execution', () => {
  assert.equal(checkModifyPrecondition({ state: 'running' }).ok, false)
  assert.equal(checkModifyPrecondition({ state: 'pending', hasActiveExecution: true }).ok, false)
  assert.equal(checkModifyPrecondition({ state: 'pending', hasActiveExecution: false }).ok, true)
})

test('review floor is OR and cannot be lowered silently', () => {
  assert.equal(effectiveRequiresReview(false, true), true)
  assert.equal(effectiveRequiresReview(true, false), true)
  assert.equal(effectiveRequiresReview(false, false), false)
})

test('policy floor: exemption needs trace and fresh version', () => {
  const policy = { requiresReview: true, version: 'p1' }
  assert.equal(resolvePolicyFloor(policy, { actor: 'u' }).ok, false)
  assert.equal(resolvePolicyFloor(policy, { actor: 'u', at: 'now', reason: 'r', policyVersion: 'p0' }).ok, false)
  const ok = resolvePolicyFloor(policy, { actor: 'u', at: 'now', reason: 'r', policyVersion: 'p1' })
  assert.equal(ok.ok, true)
  assert.equal(ok.requiresReview, false)
})

test('requiredViews: accepts string or object entries on create_task and modify_task', () => {
  const valid = validateDecisionPayload(DECISION_ACTION.createTask, {
    ...validCreate,
    requiredViews: ['mindmap:plan', { type: 'checklist', id: 'accept', title: '验收清单', requiredForAcceptance: true }],
  })
  assert.equal(valid.ok, true)

  const invalid = validateDecisionPayload(DECISION_ACTION.createTask, {
    ...validCreate,
    requiredViews: [{ id: 'x', type: 'checklist', requiredForAcceptance: 'yes' }],
  })
  assert.equal(invalid.ok, false)
  assert.equal(invalid.errors[0].field, 'requiredViews')

  const invalidStringFormat = validateDecisionPayload(DECISION_ACTION.createTask, {
    ...validCreate,
    requiredViews: ['foo:bar'],
  })
  assert.equal(invalidStringFormat.ok, false)
  assert.equal(invalidStringFormat.errors[0].field, 'requiredViews')

  const invalidObjType = validateDecisionPayload(DECISION_ACTION.createTask, {
    ...validCreate,
    requiredViews: [{ id: 'arch', type: 'unknown' }],
  })
  assert.equal(invalidObjType.ok, false)
  assert.equal(invalidObjType.errors[0].field, 'requiredViews')

  const mod = validateDecisionPayload(DECISION_ACTION.modifyTask, {
    taskId: 'task-1',
    patch: { requiredViews: ['table:summary'] },
  })
  assert.equal(mod.ok, true)
})
