import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createCodexAdapter } from '../packages/dsh-concerto/lib/connector/codex-adapter.mjs'

const fixture = fileURLToPath(new URL('./fixtures/app-server.mjs', import.meta.url))
function adapterFor(method) {
  return createCodexAdapter({ timeoutMs: 3000,
    spawnProcess: (_bin, _args, options) => spawn(process.execPath, [fixture, method], options) })
}
for (const method of ['item/commandExecution/requestApproval', 'item/fileChange/requestApproval']) {
  for (const approvals of ['accept', 'decline']) {
    test(`${method}: ${approvals} reaches the JSON-RPC response`, async () => {
      const adapter = createCodexAdapter({
        timeoutMs: 3000,
        spawnProcess: (_bin, _args, options) => spawn(process.execPath, [fixture, method], options),
      })
      const result = await adapter.start({ cwd: process.cwd(), prompt: 'fixture', approvals }).completion
      assert.equal(result.ok, true, result.detail)
      assert.deepEqual(JSON.parse(result.text), { decision: approvals })
    })
  }
}

for (const method of ['item/commandExecution/requestApproval', 'item/tool/requestUserInput']) {
  test(`${method}: waits for explicit response instead of selecting an answer`, async () => {
    const event = Promise.withResolvers()
    const handle = adapterFor(method).start({ cwd: process.cwd(), prompt: 'fixture', onEvent: (value) => {
      if (value.requestId) event.resolve(value)
    } })
    let settled = false
    handle.completion.then(() => { settled = true })
    const request = await event.promise
    assert.equal(settled, false)
    assert.equal(request.payload.threadId, 'thread-fixture')
    const answer = method.includes('Approval') ? { decision: 'decline' } : { answers: { q1: { answers: ['My answer'] } } }
    await handle.respond(request.requestId, answer)
    const result = await handle.completion
    assert.equal(result.status, 'completed')
    assert.deepEqual(JSON.parse(result.text), answer)
  })
}

test('interrupt waits for confirmed interrupted terminal status', async () => {
  const ready = Promise.withResolvers()
  const handle = adapterFor('item/commandExecution/requestApproval').start({ cwd: process.cwd(), prompt: 'fixture',
    onEvent: (event) => { if (event.requestId) ready.resolve() } })
  await ready.promise
  await handle.cancel()
  const out = await handle.completion
  assert.equal(out.status, 'interrupted')
  assert.equal(out.ok, false)
})

test('failed terminal notice is not success; abrupt process exit remains unknown', async () => {
  for (const [method, status] of [['failed', 'failed'], ['exit', 'unknown']]) {
    const result = await adapterFor(method).start({ cwd: process.cwd(), prompt: 'fixture' }).completion
    assert.equal(result.ok, false)
    assert.equal(result.status, status)
  }
})

test('waiting for human input suspends completion timeout', async () => {
  const ready = Promise.withResolvers()
  const adapter = createCodexAdapter({ timeoutMs: 500,
    spawnProcess: (_bin, _args, options) => spawn(process.execPath, [fixture, 'item/tool/requestUserInput'], options) })
  const handle = adapter.start({ cwd: process.cwd(), prompt: 'fixture', onEvent: (event) => { if (event.requestId) ready.resolve(event) } })
  const request = await ready.promise
  let settled = false
  handle.completion.then(() => { settled = true })
  await new Promise((done) => setTimeout(done, 650))
  assert.equal(settled, false)
  await handle.respond(request.requestId, { answers: { q1: { answers: ['User choice'] } } })
  assert.equal((await handle.completion).status, 'completed')
})

test('adapter timestamps request receipt and separates handshake / turn phases', async () => {
  const events = [], ready = Promise.withResolvers()
  const handle = adapterFor('item/commandExecution/requestApproval').start({cwd:process.cwd(),prompt:'fixture',onEvent:event=>{
    events.push(event)
    if(event.type==='approval.requested') ready.resolve(event)
  }})
  const request = await ready.promise
  assert.ok(Number.isFinite(Date.parse(request.observedAt)))
  assert.ok(request.elapsedMs >= events.find(e=>e.phase==='turn.sent').elapsedMs)
  assert.ok(events.some(e=>e.phase==='initialize.ack'))
  assert.ok(events.some(e=>e.phase==='thread.ack'))
  await handle.respond(request.requestId,{decision:'decline'})
  await handle.completion
  assert.ok(events.every(e=>!e.type.includes('/')))
})


test('item/tool/call invokes onToolCall and replies with DynamicToolCallResponse', async () => {
  let receivedTool = null
  const result = await adapterFor('item/tool/call').start({
    cwd: process.cwd(),
    prompt: 'fixture',
    dynamicTools: [{ name: 'publish_view_object', description: 'publish', inputSchema: { type: 'object' } }],
    onToolCall: async (name, args) => {
      receivedTool = { name, args }
      return { ok: true, id: args.id, version: 1 }
    },
  }).completion

  assert.equal(result.ok, true, result.detail)
  assert.equal(receivedTool.name, 'publish_view_object')
  assert.equal(receivedTool.args.id, 'worker-dag')
  const toolResp = JSON.parse(result.text)
  assert.equal(toolResp.success, true)
  assert.equal(toolResp.contentItems[0].type, 'inputText')
  assert.equal(JSON.parse(toolResp.contentItems[0].text).version, 1)
})

test('codex adapter normalizes commandExecution and fileChange item/completed events', async () => {
  const events = []
  const result = await adapterFor('command_and_file').start({
    cwd: process.cwd(),
    prompt: 'fixture',
    onEvent: (ev) => events.push(ev),
  }).completion

  assert.equal(result.ok, true)
  const cmd = events.find((e) => e.type === 'command.completed')
  assert.ok(cmd)
  assert.equal(cmd.command, 'npm test')
  assert.equal(cmd.exitCode, 0)
  assert.equal(cmd.truncated, true)
  assert.equal(cmd.output.length, 2000)

  const file = events.find((e) => e.type === 'file.changed')
  assert.ok(file)
  assert.deepEqual(file.changes, [{ path: 'lib/client.js', kind: 'modify', added: 12, removed: 3 }])
})
