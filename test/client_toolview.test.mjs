import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

test('toolview uses wire keys and durable block content without a structured-cache request', () => {
  let plugin
  const registrations = []
  const injectedSlots = []
  const registeredLocales = []
  const KNOWN_SLOTS = new Set([
    'conversation.view',
    'settings.section',
    'conversation.composer.dock',
    'conversation.chat.turnTail',
    'tool.call.toolview',
  ])
  const React = { createElement: (type, props, ...children) => ({ type, props, children }) }
  vm.runInNewContext(readFileSync(new URL('../packages/dsh-concerto/lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React) } } },
  })
  plugin.apply({
    effect(fn) { return fn() },
    locale: { register: (ns, dict) => registeredLocales.push({ ns, dict }) },
    slots: {
      inject: (slotName, fn) => {
        assert.notEqual(slotName, 'locale', 'must pass concrete slot name to slots.inject, never locale service')
        assert.ok(KNOWN_SLOTS.has(slotName), 'unexpected slot name: ' + slotName)
        injectedSlots.push(slotName)
        return fn()
      },
      register: (options, component) => {
        assert.equal(options.name, injectedSlots.at(-1), 'registered spec.name must match injected slot')
        registrations.push({ options, component })
        return () => {}
      },
    },
  })
  assert.equal(registeredLocales.length, 1)
  assert.equal(registeredLocales[0].ns, 'concerto')
  const cards = registrations.filter((r) => r.options.name === 'tool.call.toolview')
  assert.equal(cards.length, 12)
  for (const name of ['dispatch_task', 'patch_view_object', 'list_view_objects', 'read_view_object']) {
    assert.ok(cards.some((c) => c.options.key === name), 'missing toolview registration: ' + name)
  }
  assert.equal(registrations.filter((r) => r.options.name === 'conversation.view' && r.options.id === 'concerto.team').length, 1)
  assert.ok(!registrations.some((r) => r.options.name === 'conversation.chat.assistant-actions'))
  assert.equal(registrations.filter((r) => r.options.name === 'conversation.chat.turnTail').length, 1)
  assert.ok(!registrations.some((r) => r.options.name === 'conversation.chat.node'), 'keep host message renderers')
  const { component } = cards.find((r) => r.options.key === 'get_task')
  const tree = component({ callId: 'call-proof', toolName: 'get_task', phase: 'result', block: {
    content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'not_found' }) }],
  } })
  assert.equal(tree.props['data-concerto-call-id'], 'call-proof')
  assert.match(JSON.stringify(tree), /未成功/)
  assert.match(JSON.stringify(tree), /not_found/)
})
