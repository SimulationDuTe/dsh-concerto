import test from 'node:test'
import assert from 'node:assert/strict'
import { createConnectorRegistry } from '../packages/dsh-concerto/lib/connector/registry.mjs'
import { CONNECTOR_EVENT, CONNECTOR_CAPABILITY } from '../packages/dsh-concerto/lib/connector/contract.mjs'

function fakeAdapter(id = 'fake') {
  return {
    id,
    displayName: 'Fake Connector',
    capabilities: { streaming: true },
    async probe() { return { ok: true } },
    start() { return { completion: Promise.resolve({ ok: true, text: 'x' }), cancel() {} } },
  }
}

test('registry: register / get / list', () => {
  const registry = createConnectorRegistry()
  registry.register(fakeAdapter('fake'))

  assert.equal(registry.get('fake').id, 'fake')
  assert.deepEqual(registry.list(), [{ id: 'fake', displayName: 'Fake Connector', capabilities: { streaming: true } }])
})

test('registry: unknown id resolves to null', () => {
  const registry = createConnectorRegistry()
  assert.equal(registry.get('nope'), null)
})

test('registry: duplicate id is rejected, not silently overwritten', () => {
  const registry = createConnectorRegistry()
  registry.register(fakeAdapter('fake'))
  assert.throws(() => registry.register(fakeAdapter('fake')), /already registered/)
})

test('registry: adapter missing start() is rejected at registration', () => {
  const registry = createConnectorRegistry()
  const broken = { id: 'broken', capabilities: {}, async probe() { return { ok: true } } }
  assert.throws(() => registry.register(broken), /missing start\(\)/)
})

test('registry: adapter without capabilities is rejected', () => {
  const registry = createConnectorRegistry()
  const broken = { id: 'no-caps', async probe() { return { ok: true } }, start() {} }
  assert.throws(() => registry.register(broken), /must declare capabilities/)
})

test('contract: normalized event names are stable', () => {
  assert.equal(CONNECTOR_EVENT.started, 'execution.started')
  assert.equal(CONNECTOR_EVENT.approvalRequested, 'approval.requested')
  assert.equal(CONNECTOR_EVENT.questionRequested, 'question.requested')
  assert.equal(CONNECTOR_EVENT.completed, 'execution.completed')
  assert.equal(CONNECTOR_EVENT.failed, 'execution.failed')
  assert.equal(CONNECTOR_EVENT.unknown, 'execution.unknown')
  assert.equal(CONNECTOR_CAPABILITY.midTurnQuestion, 'midTurnQuestion')
})
