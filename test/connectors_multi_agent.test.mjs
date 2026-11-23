import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { startExecutionMcpBridge, MCP_STDIO_PROXY_PATH } from '../packages/dsh-concerto/lib/connector/mcp-bridge.mjs'
import { createAcpAdapter } from '../packages/dsh-concerto/lib/connector/acp-adapter.mjs'
import { createClaudeAdapter } from '../packages/dsh-concerto/lib/connector/claude-adapter.mjs'
import { createCliAdapter, parseCommandLine } from '../packages/dsh-concerto/lib/connector/cli-adapter.mjs'
import { createWebAdapter } from '../packages/dsh-concerto/lib/connector/web-adapter.mjs'
import { checkApiEndpoint, runApiCommanderTurn } from '../packages/dsh-concerto/lib/connector/commander-runner.mjs'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { createTaskRunner } from '../packages/dsh-concerto/lib/runner.mjs'
import { createConnectorRegistry } from '../packages/dsh-concerto/lib/connector/registry.mjs'
import { presetRowFromTeam } from '../packages/dsh-concerto/lib/projection/team_preset.mjs'
import { createGitWorktree, inspectGitWorktreeDiff, mergeGitWorktree, removeGitWorktree } from '../packages/dsh-concerto/lib/workspace_scope.mjs'
import { execFileSync } from 'node:child_process'
import http from 'node:http'
import { apply } from '../packages/dsh-concerto/lib/index.js'

test('MCP bridge + stdio proxy exposes execution-scoped Concerto tools and enforces bearer auth', async (t) => {
  const calls = []
  const bridge = await startExecutionMcpBridge({
    dynamicTools: [
      {
        name: 'submit_result',
        description: 'Submit task result',
        inputSchema: { type: 'object', required: ['summary'], properties: { summary: { type: 'string' } } },
      },
    ],
    onToolCall: async (name, args) => {
      calls.push({ name, args })
      return { ok: true, state: 'completed', echoed: args.summary }
    },
  })
  t.after(() => bridge.close())

  // Unauthorized HTTP request rejected with 401
  const unauth = await fetch(bridge.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer wrong-token' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  })
  assert.equal(unauth.status, 401)

  // Real stdio proxy child process talking to bridge
  const acpCfg = bridge.toAcpServerConfig()
  const env = { ...process.env }
  for (const e of acpCfg.env) env[e.name] = e.value
  const proxy = spawn(acpCfg.command, acpCfg.args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
  t.after(() => { try { proxy.kill() } catch { /* ignore */ } })

  const rl = readline.createInterface({ input: proxy.stdout, crlfDelay: Infinity })
  const responses = []
  const waiters = []
  rl.on('line', (line) => {
    const parsed = JSON.parse(line)
    if (waiters.length > 0) waiters.shift()(parsed)
    else responses.push(parsed)
  })
  const nextResponse = () => responses.length > 0
    ? Promise.resolve(responses.shift())
    : new Promise((resolve) => waiters.push(resolve))

  proxy.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } })}\n`)
  const initRes = await nextResponse()
  assert.equal(initRes.id, 1)
  assert.equal(initRes.result.serverInfo.name, 'concerto-team-tools')

  proxy.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`)
  const listRes = await nextResponse()
  assert.equal(listRes.result.tools.length, 1)
  assert.equal(listRes.result.tools[0].name, 'submit_result')

  proxy.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'submit_result', arguments: { summary: 'done via mcp' } } })}\n`)
  const callRes = await nextResponse()
  assert.equal(callRes.result.isError, false)
  const payload = JSON.parse(callRes.result.content[0].text)
  assert.equal(payload.ok, true)
  assert.equal(payload.echoed, 'done via mcp')
  assert.equal(calls.length, 1)

  proxy.stdin.end()
  rl.close()
})

test('ACP adapter (Antigravity) probes, injects MCP bridge, normalizes events, and enforces permissions', async (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'concerto-acp-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))

  // Write a mock ACP server script that simulates `agy acp`
  const mockServerScript = join(dir, 'mock-acp-server.mjs')
  writeFileSync(mockServerScript, `
import readline from 'node:readline'
import { spawn } from 'node:child_process'

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
let mcpConfig = null
let pendingPerm = null

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n')
}

async function callMcpTool(cfg, name, args) {
  const env = { ...process.env }
  for (const e of cfg.env || []) env[e.name] = e.value
  const p = spawn(cfg.command, cfg.args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
  const prl = readline.createInterface({ input: p.stdout, crlfDelay: Infinity })
  const next = () => new Promise((resolve) => prl.once('line', (l) => resolve(JSON.parse(l))))
  p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) + '\\n')
  const res = await next()
  p.stdin.end()
  prl.close()
  try { p.kill() } catch { /* ignore */ }
  return res
}

rl.on('line', async (line) => {
  const msg = JSON.parse(line)
  if (msg.id && !msg.method && pendingPerm && msg.id === pendingPerm.id) {
    pendingPerm.resolve(msg.result)
    pendingPerm = null
    return
  }
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: 1, agentInfo: { name: 'antigravity-mock', version: '2.0.0' }, agentCapabilities: {} } })
    return
  }
  if (msg.method === 'session/new') {
    mcpConfig = msg.params?.mcpServers?.[0] || null
    send({ jsonrpc: '2.0', id: msg.id, result: { sessionId: 'acp-sess-1' } })
    return
  }
  if (msg.method === 'session/prompt') {
    // Emit streaming delta
    send({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: 'acp-sess-1', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Working on task...' } } } })

    // Request permission for a write tool
    const permRes = await new Promise((resolve) => {
      pendingPerm = { id: 99, resolve }
      send({
        jsonrpc: '2.0', id: 99, method: 'session/request_permission',
        params: {
          sessionId: 'acp-sess-1',
          toolCall: { toolCallId: 'tc-1', title: 'Write test.txt', kind: 'edit' },
          options: [
            { optionId: 'opt-allow', kind: 'allow_once', name: 'Allow' },
            { optionId: 'opt-reject', kind: 'reject_once', name: 'Reject' },
          ],
        },
      })
    })

    // Emit tool completion + file change if allowed
    if (permRes?.outcome?.optionId === 'opt-allow') {
      send({
        jsonrpc: '2.0', method: 'session/update',
        params: {
          sessionId: 'acp-sess-1',
          update: { sessionUpdate: 'tool_call_update', toolCallId: 'tc-1', title: 'Write test.txt', kind: 'edit', status: 'completed', locations: [{ path: 'test.txt' }] },
        },
      })
    }

    // Call Concerto MCP tool if bridge was injected
    if (mcpConfig) {
      await callMcpTool(mcpConfig, 'report_progress', { note: 'mcp-from-acp:' + (permRes?.outcome?.optionId || 'none') })
    }

    send({ jsonrpc: '2.0', id: msg.id, result: { stopReason: 'end_turn' } })
  }
})
`)

  const adapter = createAcpAdapter({
    id: 'antigravity',
    displayName: 'Antigravity (agy)',
    bin: process.execPath,
    args: [mockServerScript],
    defaultCwd: dir,
  })

  // 1. Probe
  const probed = await adapter.probe({ cwd: dir })
  assert.equal(probed.ok, true, JSON.stringify(probed))
  assert.match(probed.userAgent, /antigravity-mock\/2\.0\.0/)

  // 2. Start with workspace-write + approvals: 'ask' -> responds via handle.respond() and calls MCP tool
  const events = []
  const mcpCalls = []
  let handle
  handle = adapter.start({
    cwd: dir,
    prompt: 'Create test.txt',
    sandbox: 'workspace-write',
    approvals: 'ask',
    dynamicTools: [{ name: 'report_progress', description: 'Report progress', inputSchema: { type: 'object', properties: { note: { type: 'string' } } } }],
    onToolCall: async (name, args) => {
      mcpCalls.push({ name, args })
      return { ok: true }
    },
    onEvent: (ev) => {
      events.push(ev)
      if (ev.type === 'approval.requested') {
        handle.respond(ev.requestId, { decision: 'accept' })
      }
    },
  })
  const out = await handle.completion
  assert.equal(out.ok, true, JSON.stringify(out))
  assert.equal(out.status, 'completed')
  assert.ok(events.some((e) => e.type === 'execution.started' && e.nativeSessionRef.backend === 'antigravity'))
  assert.ok(events.some((e) => e.type === 'output.delta' && e.delta.includes('Working on task')))
  assert.ok(events.some((e) => e.type === 'file.changed' && e.path === 'test.txt'))
  assert.equal(mcpCalls.length, 1)
  assert.equal(mcpCalls[0].args.note, 'mcp-from-acp:opt-allow')

  // 3. Start with sandbox: 'read-only' -> auto-declines write permission without user approval
  const roMcpCalls = []
  const roEvents = []
  const roHandle = adapter.start({
    cwd: dir,
    prompt: 'Read only check',
    sandbox: 'read-only',
    approvals: 'ask',
    dynamicTools: [{ name: 'report_progress', description: 'Report progress', inputSchema: { type: 'object', properties: { note: { type: 'string' } } } }],
    onToolCall: async (name, args) => {
      roMcpCalls.push({ name, args })
      return { ok: true }
    },
    onEvent: (ev) => roEvents.push(ev),
  })
  const roOut = await roHandle.completion
  assert.equal(roOut.ok, true)
  assert.ok(roEvents.some((e) => e.type === 'approval.resolved' && e.decision === 'decline'))
  assert.equal(roMcpCalls[0].args.note, 'mcp-from-acp:opt-reject')
})

test('Claude Code adapter parses stream-json, maps permission-mode, and invokes Concerto MCP bridge', async (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'concerto-claude-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))

  // Write a mock claude CLI executable (.cmd on Windows, .mjs via node)
  const mockClaudeScript = join(dir, 'mock-claude.mjs')
  writeFileSync(mockClaudeScript, `
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import readline from 'node:readline'

const args = process.argv.slice(2)
if (args.includes('--version')) {
  process.stdout.write('2.1.0 (Claude Code mock)\\n')
  process.exit(0)
}

let stdinText = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) stdinText += chunk

const permIdx = args.indexOf('--permission-mode')
const permMode = permIdx >= 0 ? args[permIdx + 1] : ''
const mcpIdx = args.indexOf('--mcp-config')
const mcpPath = mcpIdx >= 0 ? args[mcpIdx + 1] : ''

process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', session_id: 'claude-sess-1' }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'assistant', session_id: 'claude-sess-1', message: { content: [
  { type: 'text', text: 'mode=' + permMode + ' prompt=' + stdinText.trim() },
  { type: 'tool_use', id: 'tu-1', name: 'Write', input: { file_path: 'hello.txt' } },
] } }) + '\\n')
process.stdout.write(JSON.stringify({ type: 'user', message: { content: [
  { type: 'tool_result', tool_use_id: 'tu-1', is_error: false, content: 'ok' },
] } }) + '\\n')

if (mcpPath) {
  const cfg = JSON.parse(readFileSync(mcpPath, 'utf8')).mcpServers.concerto
  const p = spawn(cfg.command, cfg.args, { env: { ...process.env, ...cfg.env }, stdio: ['pipe', 'pipe', 'pipe'] })
  const prl = readline.createInterface({ input: p.stdout, crlfDelay: Infinity })
  p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'submit_result', arguments: { summary: 'claude-mcp-ok' } } }) + '\\n')
  await new Promise((resolve) => prl.once('line', resolve))
  p.stdin.end()
  prl.close()
}

process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'All done by Claude' }) + '\\n')
`)

  const wrapperBin = process.platform === 'win32'
    ? join(dir, 'claude-mock.cmd')
    : join(dir, 'claude-mock.sh')
  if (process.platform === 'win32') {
    writeFileSync(wrapperBin, `@echo off\r\n"${process.execPath}" "${mockClaudeScript}" %*\r\n`)
  } else {
    writeFileSync(wrapperBin, `#!/bin/sh\nexec "${process.execPath}" "${mockClaudeScript}" "$@"\n`, { mode: 0o755 })
  }

  const adapter = createClaudeAdapter({ bin: wrapperBin, defaultCwd: dir })
  const probed = await adapter.probe({ cwd: dir })
  assert.equal(probed.ok, true, JSON.stringify(probed))
  assert.match(probed.userAgent, /Claude Code mock/)

  const events = []
  const mcpCalls = []
  const handle = adapter.start({
    cwd: dir,
    prompt: 'Write hello.txt',
    sandbox: 'workspace-write',
    approvals: 'ask',
    dynamicTools: [{ name: 'submit_result', description: 'Submit result', inputSchema: { type: 'object', properties: { summary: { type: 'string' } } } }],
    onToolCall: async (name, args) => {
      mcpCalls.push({ name, args })
      return { ok: true }
    },
    onEvent: (ev) => events.push(ev),
  })
  const out = await handle.completion
  assert.equal(out.ok, true, JSON.stringify(out))
  assert.equal(out.text, 'All done by Claude')
  assert.ok(events.some((e) => e.type === 'execution.started' && e.nativeSessionRef.backend === 'claude'))
  assert.ok(events.some((e) => e.type === 'output.delta' && e.delta.includes('mode=acceptEdits')))
  assert.ok(events.some((e) => e.type === 'file.changed' && e.path === 'hello.txt'))
  assert.equal(mcpCalls.length, 1)
  assert.equal(mcpCalls[0].args.summary, 'claude-mcp-ok')
})

test('Host registers Antigravity, Claude, Codex, Gemini, and OpenCode connectors via /concerto/connectors', async (t) => {
  const root = mkdtempSync(join(os.tmpdir(), 'concerto-conn-list-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const routes = new Map()
  const cleanups = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    sessions: { get: () => null, list: async () => [] },
    agents: { get: () => null, list: async () => [] },
    agentPresets: { presetForSession: () => null },
    sessionController: { async create() { return { sessionId: 'unused' } }, async prompt() {} },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register() { return () => {} }, get: () => null },
  }
  apply(ctx, {
    statePath: join(root, 'teams.json'),
    runtimePath: join(root, 'runtime.json'),
    teamsBundleDir: join(root, 'teams'),
  })
  t.after(() => { for (const c of cleanups) if (typeof c === 'function') c() })

  const reqStream = Readable.from([])
  Object.assign(reqStream, { method: 'GET', url: '/concerto/connectors', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost' } })
  let status, body
  await routes.get('/concerto/connectors')(reqStream, { writeHead(s) { status = s }, end(txt) { body = JSON.parse(txt) } })
  assert.equal(status, 200)
  const ids = body.connectors.map((c) => c.id)
  assert.deepEqual(ids, ['antigravity', 'claude', 'codex', 'gemini', 'opencode', 'web-chatgpt', 'web-claude', 'web-gemini'])
  const agy = body.connectors.find((c) => c.id === 'antigravity')
  assert.equal(agy.protocol, 'acp')
  assert.equal(agy.capabilities.dynamicTools, true)
  assert.equal(agy.capabilities.approval, true)
})

test('Generic CLI adapter supports {{prompt}} substitution and stdin piping with streaming output', async (t) => {
  const dir = mkdtempSync(join(os.tmpdir(), 'concerto-cli-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))

  assert.deepEqual(parseCommandLine('"C:\\Program Files\\agent.exe" --flag "hello world"'), {
    bin: 'C:\\Program Files\\agent.exe',
    args: ['--flag', 'hello world'],
  })

  // Script 1: prints argv[2]
  const argScript = join(dir, 'echo-arg.mjs')
  writeFileSync(argScript, 'process.stdout.write("ARG:" + process.argv.slice(2).join("|"))\n')
  const argAdapter = createCliAdapter({
    id: 'custom-arg',
    displayName: 'Arg CLI',
    command: `"${process.execPath}" "${argScript}" --msg {{prompt}}`,
    defaultCwd: dir,
    custom: true,
  })
  assert.equal((await argAdapter.probe()).ok, true)
  const argEvents = []
  const argOut = await argAdapter.start({ cwd: dir, prompt: '你好 Concerto', onEvent: (e) => argEvents.push(e) }).completion
  assert.equal(argOut.ok, true)
  assert.equal(argOut.text, 'ARG:--msg|你好 Concerto')
  assert.ok(argEvents.some((e) => e.type === 'output.delta' && e.delta.includes('你好 Concerto')))

  // Script 2: reads stdin
  const stdinScript = join(dir, 'echo-stdin.mjs')
  writeFileSync(stdinScript, 'let s=""; process.stdin.setEncoding("utf8"); for await (const c of process.stdin) s+=c; process.stdout.write("STDIN:" + s)\n')
  const stdinAdapter = createCliAdapter({
    id: 'custom-stdin',
    displayName: 'Stdin CLI',
    command: `"${process.execPath}" "${stdinScript}"`,
    defaultCwd: dir,
    custom: true,
  })
  const stdinOut = await stdinAdapter.start({ cwd: dir, prompt: 'multiline\nprompt' }).completion
  assert.equal(stdinOut.ok, true)
  assert.equal(stdinOut.text, 'STDIN:multiline\nprompt')
})

test('Custom CLI Agent CRUD API hot-registers, probes drafts, persists across reload, and deletes cleanly', async (t) => {
  const root = mkdtempSync(join(os.tmpdir(), 'concerto-custom-crud-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))
  const statePath = join(root, 'teams.json')
  const runtimePath = join(root, 'runtime.json')
  const teamsBundleDir = join(root, 'teams')

  function bootHost() {
    const routes = new Map()
    const cleanups = []
    const ctx = {
      logger: { info() {}, warn() {}, error() {} },
      sessions: { get: () => null, list: async () => [] },
      agents: { get: () => null, list: async () => [] },
      agentPresets: { presetForSession: () => null },
      sessionController: { async create() { return { sessionId: 'unused' } }, async prompt() {} },
      get(name) { return this[name] },
      effect(fn) { cleanups.push(fn()) },
      webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
      tools: { register() { return () => {} }, get: () => null },
    }
    apply(ctx, { statePath, runtimePath, teamsBundleDir })
    async function req(method, path, body) {
      const stream = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
      Object.assign(stream, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
      let status, value
      await routes.get(path.split('?')[0])(stream, { writeHead(s) { status = s }, end(txt) { value = txt ? JSON.parse(txt) : null } })
      return { status, value }
    }
    return { req, dispose: () => { for (const c of cleanups) if (typeof c === 'function') c() } }
  }

  const h1 = bootHost()
  t.after(() => h1.dispose())

  // 1. Draft probe before saving
  const draftProbe = await h1.req('POST', '/concerto/connectors/probe', {
    displayName: 'My Node CLI',
    mode: 'cli',
    command: `"${process.execPath}" -e "console.log('ok')"`,
  })
  assert.equal(draftProbe.status, 200, JSON.stringify(draftProbe.value))
  assert.equal(draftProbe.value.ok, true)

  // 2. Save custom connector -> immediately hot-registered in GET /concerto/connectors
  const saved = await h1.req('POST', '/concerto/connectors/custom', {
    displayName: 'My Aider',
    mode: 'cli',
    command: `"${process.execPath}" -e "console.log('ok')"`,
  })
  assert.equal(saved.status, 200, JSON.stringify(saved.value))
  assert.equal(saved.value.connector.id, 'custom-my-aider')
  assert.equal(saved.value.connector.custom, true)
  const listed = await h1.req('GET', '/concerto/connectors')
  assert.ok(listed.value.connectors.some((c) => c.id === 'custom-my-aider'))

  // 3. Built-in connector cannot be deleted
  const delBuiltin = await h1.req('DELETE', '/concerto/connectors/custom?id=antigravity')
  assert.equal(delBuiltin.status, 403)
  h1.dispose()

  // 4. Reload host -> custom connector persisted and auto-registered on startup
  const h2 = bootHost()
  t.after(() => h2.dispose())
  const listedAfterReload = await h2.req('GET', '/concerto/connectors')
  assert.ok(listedAfterReload.value.connectors.some((c) => c.id === 'custom-my-aider' && c.custom === true))

  // 5. Delete custom connector -> unregistered immediately
  const deleted = await h2.req('DELETE', '/concerto/connectors/custom?id=custom-my-aider')
  assert.equal(deleted.status, 200, JSON.stringify(deleted.value))
  assert.ok(!deleted.value.connectors.some((c) => c.id === 'custom-my-aider'))
})

test('Commander supports DSH LLM catalog dropdown, Custom API (OpenAI-compatible) tool loop, and External connector', async (t) => {
  // 1. Preset projection allows api and external commander without leaking apiKey to YAML config
  const apiPreset = presetRowFromTeam({
    id: 'api-team',
    name: 'API Team',
    commander: { id: 'commander', source: 'api', baseUrl: 'https://api.example.com/v1', apiKey: 'sk-secret-123', model: 'gpt-4o' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'external', connector: 'antigravity' }],
  })
  assert.equal(apiPreset.ok, true, JSON.stringify(apiPreset))
  assert.equal(apiPreset.row.config.plugins[0].config.source, 'api')
  assert.equal(apiPreset.row.config.plugins[0].config.apiKey, undefined)

  const extPreset = presetRowFromTeam({
    id: 'ext-team',
    name: 'Ext Team',
    commander: { id: 'commander', source: 'external', connector: 'antigravity' },
    members: [{ id: 'w1', roleKind: 'worker', source: 'external', connector: 'claude' }],
  })
  assert.equal(extPreset.ok, true, JSON.stringify(extPreset))
  assert.equal(extPreset.row.config.plugins[0].config.connector, 'antigravity')

  // 2. Mock OpenAI-compatible HTTP server for connection check & tool-calling loop
  let turnCount = 0
  const apiServer = http.createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer sk-test-key') {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
    if (req.method === 'GET' && req.url === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'my-model' }] }))
      return
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      let body = ''
      req.setEncoding('utf8')
      req.on('data', (c) => { body += c })
      req.on('end', () => {
        turnCount += 1
        res.writeHead(200, { 'content-type': 'application/json' })
        if (turnCount === 1) {
          res.end(JSON.stringify({
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_team_status', arguments: '{}' } }],
              },
            }],
          }))
        } else {
          const parsed = JSON.parse(body)
          const toolMsg = parsed.messages.find((m) => m.role === 'tool')
          res.end(JSON.stringify({
            choices: [{
              message: {
                role: 'assistant',
                content: '已读取团队状态：' + toolMsg.content,
              },
            }],
          }))
        }
      })
      return
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve))
  t.after(() => apiServer.close())
  const baseUrl = `http://127.0.0.1:${apiServer.address().port}/v1`

  const badAuth = await checkApiEndpoint({ baseUrl, apiKey: 'wrong', model: 'my-model' })
  assert.equal(badAuth.state, 'unreachable')
  assert.equal(badAuth.reason, 'auth_failed')

  const goodAuth = await checkApiEndpoint({ baseUrl, apiKey: 'sk-test-key', model: 'my-model' })
  assert.equal(goodAuth.state, 'reachable', JSON.stringify(goodAuth))

  const called = []
  const turnRes = await runApiCommanderTurn({
    commander: { baseUrl, apiKey: 'sk-test-key', model: 'my-model' },
    prompt: '查看团队状态',
    tools: [{ name: 'get_team_status', description: 'status', inputSchema: { type: 'object', properties: {} } }],
    onToolCall: async (name) => {
      called.push(name)
      return { ok: true, planRevision: 1 }
    },
  })
  assert.equal(turnRes.ok, true, JSON.stringify(turnRes))
  assert.deepEqual(called, ['get_team_status'])
  assert.match(turnRes.text, /planRevision/)

  // 3. GET /concerto/llm/catalog returns DSH providers & models
  const root = mkdtempSync(join(os.tmpdir(), 'concerto-llm-cat-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))
  const routes = new Map()
  const cleanups = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    sessions: { get: () => null, list: async () => [] },
    agents: { get: () => null, list: async () => [] },
    agentPresets: { presetForSession: () => null },
    sessionController: { async create() { return { sessionId: 'unused' } }, async prompt() {} },
    llm: {
      listProviders: () => [{ id: 'x-ds', name: 'DeepSeek' }, { id: 'openai', name: 'OpenAI' }],
      listModels: async (p) => (p === 'x-ds' ? [{ id: 'deepseek-v4.1-flash', name: 'V4.1 Flash' }] : [{ id: 'gpt-4o', name: 'GPT-4o' }]),
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register() { return () => {} }, get: () => null },
  }
  apply(ctx, { statePath: join(root, 'teams.json'), runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'teams') })
  t.after(() => { for (const c of cleanups) if (typeof c === 'function') c() })

  const reqStream = Readable.from([])
  Object.assign(reqStream, { method: 'GET', url: '/concerto/llm/catalog', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost' } })
  let status, cat
  await routes.get('/concerto/llm/catalog')(reqStream, { writeHead(s) { status = s }, end(txt) { cat = JSON.parse(txt) } })
  assert.equal(status, 200)
  assert.equal(cat.available, true)
  assert.equal(cat.providers.length, 2)
  assert.equal(cat.providers[0].models[0].id, 'deepseek-v4.1-flash')
})

test('Live user suggestion, real /concerto/snapshot, API Worker execution, and Web Connector handoff', async (t) => {
  const root = mkdtempSync(join(os.tmpdir(), 'concerto-sec1-all-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))

  // 1. Web Connector handoff (without opening real browser)
  const web = createWebAdapter({ id: 'web-chatgpt', displayName: 'ChatGPT 网页端', url: 'https://chatgpt.com', openBrowser: false })
  assert.equal((await web.probe()).ok, true)
  const webEvents = []
  let webHandle
  webHandle = web.start({
    prompt: 'Summarize README',
    onEvent: (ev) => {
      webEvents.push(ev)
      if (ev.type === 'question.requested') {
        webHandle.respond(ev.requestId, { answers: { web_reply: { answers: ['Web agent reply summary'] } } })
      }
    },
  })
  const webOut = await webHandle.completion
  assert.equal(webOut.ok, true)
  assert.equal(webOut.text, 'Web agent reply summary')
  assert.ok(webEvents.some((e) => e.type === 'output.message' && e.text === 'Web agent reply summary'))

  // 2. API Worker execution via runner.dispatch
  let workerTurn = 0
  const apiServer = http.createServer((req, res) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      workerTurn += 1
      res.writeHead(200, { 'content-type': 'application/json' })
      if (workerTurn === 1) {
        res.end(JSON.stringify({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: 'wcall_1', type: 'function', function: { name: 'submit_result', arguments: JSON.stringify({ summary: 'api worker delivered', checksPassed: true }) } }],
            },
          }],
        }))
      } else {
        res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'Done by API worker' } }] }))
      }
    })
  })
  await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve))
  t.after(() => apiServer.close())

  const rt = createTeamRuntime()
  rt.bindSession('cmd-api-w', 'run-api-w', { teamId: 't1', commanderId: 'c1', cwd: root })
  rt.submit({
    decisionId: 'd1', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'API Task', objective: 'Run via API worker', acceptance: ['done'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  }, 'run-api-w')
  const settled = Promise.withResolvers()
  const runner = createTaskRunner({
    runtime: rt,
    registry: createConnectorRegistry(),
    defaultCwd: root,
    onExecutionSettled: (_scope, info) => settled.resolve(info),
  })
  const disp = runner.dispatch({
    scope: 'run-api-w',
    taskId: 'task-1',
    memberId: 'w-api',
    commandId: 'cmd-w-api-1',
    cwd: root,
    apiMember: { baseUrl: `http://127.0.0.1:${apiServer.address().port}/v1`, apiKey: 'sk-x', model: 'm-worker' },
  })
  assert.equal(disp.ok, true, JSON.stringify(disp))
  await settled.promise
  const afterWorker = rt.getTask({ taskId: 'task-1' }, 'run-api-w').task
  assert.equal(afterWorker.state, 'review')
  assert.equal(afterWorker.result?.summary, 'api worker delivered')

  // 3. POST /concerto/runs/suggest + real GET /concerto/snapshot
  const routes = new Map()
  const sessions = new Map()
  const promptsSent = []
  const cleanups = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    sessions: { get: (id) => sessions.get(id), list: async () => [...sessions.values()] },
    agents: { get: () => null, list: async () => [] },
    agentPresets: { presetForSession: (s) => s?.preset ?? null },
    sessionController: {
      async create() { return { sessionId: 'unused' } },
      async prompt(req) { promptsSent.push(req) },
    },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register() { return () => {} }, get: () => null },
  }
  const statePath = join(root, 'teams.json')
  writeFileSync(statePath, JSON.stringify({
    teams: [{
      id: 'sug-team', name: 'Sug Team', version: 1,
      team: { id: 'sug-team', name: 'Sug Team', commander: { id: 'commander', source: 'hosted', provider: 'x', model: 'm' }, members: [] },
    }],
    deletedVersions: [], requests: [],
  }))
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'teams') })
  t.after(() => { for (const c of cleanups) if (typeof c === 'function') c() })

  async function req(method, path, body) {
    const stream = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
    Object.assign(stream, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(stream, { writeHead(s) { status = s }, end(txt) { value = txt ? JSON.parse(txt) : null } })
    return { status, value }
  }

  sessions.set('s-live', { id: 's-live', preset: 'sug-team', header: { cwd: root } })
  const sessRes = await req('GET', '/concerto/session?sessionId=s-live')
  assert.equal(sessRes.status, 200)
  const teamSessionId = sessRes.value.teamSessionId

  const sugRes = await req('POST', '/concerto/runs/suggest', { sessionId: 's-live', text: '优先写单元测试', commandId: 'sug-1' })
  assert.equal(sugRes.status, 200, JSON.stringify(sugRes.value))
  assert.equal(sugRes.value.delivery, 'queued_commander')
  assert.equal(promptsSent.length, 1)
  assert.match(promptsSent[0].content[0].text, /优先写单元测试/)

  const snapRes = await req('GET', `/concerto/snapshot?teamSessionId=${encodeURIComponent(teamSessionId)}`)
  assert.equal(snapRes.status, 200, JSON.stringify(snapRes.value))
  assert.equal(snapRes.value.teamSessionId, teamSessionId)
  assert.ok(snapRes.value.snapshot.events.some((e) => e.type === 'user.suggestion'))
})

test('SSE runtime subscription, Git Worktree diff/merge/cleanup, and /concerto/connectors?probe=1', async (t) => {
  // 1. Runtime SSE subscribe receives appended events immediately
  const rt = createTeamRuntime()
  const received = []
  const unsub = rt.subscribe((ev) => received.push(ev))
  rt.bindSession('cmd-sse', 'run-sse', { teamId: 't1', commanderId: 'c1' })
  await new Promise((r) => setTimeout(r, 20))
  unsub()
  assert.ok(received.some((e) => e.type === 'session.bound' && e.teamSessionId === 'run-sse'))

  // 2. Git Worktree diff -> merge -> cleanup end-to-end
  const repoDir = mkdtempSync(join(os.tmpdir(), 'concerto-wt-merge-'))
  t.after(() => rmSync(repoDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))
  execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir, stdio: 'ignore' })
  writeFileSync(join(repoDir, 'base.txt'), 'hello\n')
  execFileSync('git', ['add', '-A'], { cwd: repoDir, stdio: 'ignore' })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' })
  const baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).trim()

  const created = createGitWorktree({ repositoryRoot: repoDir, baseCommit, taskId: 'task-1', executionId: 'exec-wt-1' })
  assert.equal(created.ok, true, JSON.stringify(created))
  writeFileSync(join(created.worktree.path, 'base.txt'), 'hello\nfrom worktree\n')
  writeFileSync(join(created.worktree.path, 'new-file.txt'), 'added\n')

  const diffOut = inspectGitWorktreeDiff(created.worktree)
  assert.equal(diffOut.ok, true, JSON.stringify(diffOut))
  assert.match(diffOut.diff, /from worktree/)
  assert.ok(diffOut.untrackedFiles.includes('new-file.txt'))

  const mergeOut = mergeGitWorktree(created.worktree)
  assert.equal(mergeOut.ok, true, JSON.stringify(mergeOut))
  assert.ok(mergeOut.mergedCommit && mergeOut.mergedCommit !== baseCommit)

  const cleaned = removeGitWorktree(created.worktree)
  assert.equal(cleaned, true)
})

test('Custom API model auto-fetch, workspace file preview with traversal guard, and persona capability context', async (t) => {
  const root = mkdtempSync(join(os.tmpdir(), 'concerto-preview-api-'))
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }))
  const workDir = join(root, 'workspace')
  const outsideFile = join(root, 'secret.txt')
  writeFileSync(outsideFile, 'TOP SECRET')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(workDir, { recursive: true })
  writeFileSync(join(workDir, 'deliverable.txt'), 'hello preview world\nline 2\n')

  const apiServer = http.createServer((req, res) => {
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'model-alpha' }, { id: 'model-beta' }] }))
      return
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise((resolve) => apiServer.listen(0, '127.0.0.1', resolve))
  t.after(() => apiServer.close())

  const routes = new Map()
  const sessions = new Map()
  const cleanups = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    sessions: { get: (id) => sessions.get(id), list: async () => [...sessions.values()] },
    agents: { get: () => null, list: async () => [] },
    agentPresets: { presetForSession: (s) => s?.preset ?? null },
    sessionController: { async create() { return { sessionId: 'unused' } }, async prompt() {} },
    get(name) { return this[name] },
    effect(fn) { cleanups.push(fn()) },
    webServer: { register({ path, handler }) { routes.set(path, handler); return () => {} } },
    tools: { register() { return () => {} }, get: () => null },
  }
  const statePath = join(root, 'teams.json')
  writeFileSync(statePath, JSON.stringify({
    teams: [{
      id: 'spec-team', name: 'Spec Team', version: 1,
      team: {
        id: 'spec-team', name: 'Spec Team',
        commander: { id: 'commander', source: 'hosted', provider: 'x', model: 'm' },
        members: [{ id: 'w-fe', roleKind: 'worker', source: 'external', connector: 'antigravity', persona: '前端 UI 专家' }],
      },
    }],
    deletedVersions: [], requests: [],
  }))
  apply(ctx, { statePath, runtimePath: join(root, 'runtime.json'), teamsBundleDir: join(root, 'teams') })
  t.after(() => { for (const c of cleanups) if (typeof c === 'function') c() })

  async function req(method, path, body) {
    const stream = Readable.from(body !== undefined ? [JSON.stringify(body)] : [])
    Object.assign(stream, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' } })
    let status, value
    await routes.get(path.split('?')[0])(stream, { writeHead(s) { status = s }, end(txt) { value = txt ? JSON.parse(txt) : null } })
    return { status, value }
  }

  // 1. /concerto/api/models fetches OpenAI-compatible model list
  const modelsRes = await req('POST', '/concerto/api/models', { baseUrl: `http://127.0.0.1:${apiServer.address().port}/v1` })
  assert.equal(modelsRes.status, 200, JSON.stringify(modelsRes.value))
  assert.deepEqual(modelsRes.value.models, ['model-alpha', 'model-beta'])

  // 2. Session capabilities include member persona for smart routing
  sessions.set('s-spec', { id: 's-spec', preset: 'spec-team', header: { cwd: workDir } })
  const sessRes = await req('GET', '/concerto/session?sessionId=s-spec')
  assert.equal(sessRes.status, 200)
  const wCap = sessRes.value.memberCapabilities.find((c) => c.memberId === 'w-fe')
  assert.equal(wCap.persona, '前端 UI 专家')

  // 3. /concerto/files/preview reads workspace file and blocks path traversal
  const okPrev = await req('POST', '/concerto/files/preview', { sessionId: 's-spec', path: 'deliverable.txt' })
  assert.equal(okPrev.status, 200, JSON.stringify(okPrev.value))
  assert.match(okPrev.value.content, /hello preview world/)

  const badPrev = await req('POST', '/concerto/files/preview', { sessionId: 's-spec', path: '../secret.txt' })
  assert.equal(badPrev.status, 404)
})

test('Auto-Cascade DAG finds ready downstream tasks and A/B Compare Race creates pair, picks winner, and cancels loser', async () => {
  const rt = createTeamRuntime()
  rt.bindSession('cmd-dag', 'run-dag', {
    teamId: 't-dag',
    commanderId: 'c1',
    requirePlanApproval: false,
    members: [
      { id: 'w-agy', roleKind: 'worker', source: 'external', connector: 'antigravity' },
      { id: 'w-claude', roleKind: 'worker', source: 'external', connector: 'claude' },
    ],
  })

  // Create task-1 and dependent task-2 (dependsOn: ['task-1'])
  const t1 = rt.submit({
    decisionId: 'd-dag-1', expectedPlanRevision: 1, action: 'create_task',
    payload: { title: 'Step 1', objective: 'Build base', acceptance: ['done'], constraints: [], dependsOn: [], assigneeRole: 'worker' },
  }, 'run-dag')
  assert.equal(t1.ok, true)
  const t2 = rt.submit({
    decisionId: 'd-dag-2', expectedPlanRevision: t1.planRevision, action: 'create_task',
    payload: { title: 'Step 2', objective: 'Build feature on base', acceptance: ['done'], constraints: [], dependsOn: ['task-1'], assigneeRole: 'worker' },
  }, 'run-dag')
  assert.equal(t2.ok, true)

  // Before task-1 completes, task-2 is NOT an auto-cascade candidate
  assert.deepEqual(rt.findAutoCascadeCandidates('run-dag'), [])

  // Complete task-1 -> task-2 immediately becomes an auto-cascade candidate
  assert.equal(rt.submitResult({ taskId: 'task-1', summary: 'base ready', checksPassed: true }, 'run-dag').state, 'completed')
  const ready = rt.findAutoCascadeCandidates('run-dag')
  assert.equal(ready.length, 1)
  assert.equal(ready[0].taskId, 'task-2')
  assert.deepEqual(ready[0].dependsOn, ['task-1'])

  // Launch A/B Compare Race on task-2 between w-agy and w-claude
  const race = rt.createRacePair('run-dag', {
    sourceTaskId: 'task-2',
    memberA: 'w-agy',
    memberB: 'w-claude',
    commandId: 'race-cmd-1',
  })
  assert.equal(race.ok, true, JSON.stringify(race))
  assert.equal(race.taskA.memberId, 'w-agy')
  assert.equal(race.taskB.memberId, 'w-claude')
  assert.equal(race.taskA.raceGroup.label, 'A')
  assert.equal(race.taskB.raceGroup.label, 'B')

  // Both candidates submit results
  rt.submitResult({ taskId: race.taskA.taskId, summary: 'Antigravity solution A', checksPassed: true }, 'run-dag')
  rt.submitResult({ taskId: race.taskB.taskId, summary: 'Claude solution B', checksPassed: true }, 'run-dag')

  // Pick Scheme B as winner -> parent task-2 completes with B's result, Scheme A is discarded/cancelled
  const picked = rt.resolveRaceWinner('run-dag', {
    raceId: race.raceId,
    winnerTaskId: race.taskB.taskId,
    commandId: 'race-pick-1',
  })
  assert.equal(picked.ok, true, JSON.stringify(picked))
  assert.equal(picked.winnerMemberId, 'w-claude')
  const parentAfter = rt.getTask({ taskId: 'task-2' }, 'run-dag').task
  assert.equal(parentAfter.state, 'completed')
  assert.equal(parentAfter.result.summary, 'Claude solution B')
  assert.equal(parentAfter.raceGroup.status, 'resolved')
  assert.equal(rt.getTask({ taskId: race.taskA.taskId }, 'run-dag').task.raceGroup.status, 'discarded')
})






