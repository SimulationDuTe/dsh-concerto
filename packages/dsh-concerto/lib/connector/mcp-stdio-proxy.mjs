#!/usr/bin/env node
/**
 * Concerto MCP Stdio Proxy — 供支持 stdio MCP 的外部 Agent（Antigravity/ACP、Claude Code、Gemini CLI、OpenCode 等）使用。
 *
 * 从 stdin 读取 JSON-RPC 2.0 行消息，通过单次执行令牌转发到 Concerto Host 的本地回环 MCP 端点，
 * 再将 JSON-RPC 响应逐行写回 stdout。零外部依赖，跨平台一致。
 */
import readline from 'node:readline'

const url = process.env.CONCERTO_MCP_URL
const token = process.env.CONCERTO_MCP_TOKEN

if (!url || !token) {
  process.stderr.write('[concerto-mcp-proxy] CONCERTO_MCP_URL and CONCERTO_MCP_TOKEN are required\n')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })

async function forward(line) {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch {
    return
  }
  const hasId = Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== undefined && msg.id !== null
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(msg),
    })
    if (res.status === 204) return
    const text = await res.text()
    if (text.trim()) {
      process.stdout.write(`${text.trim()}\n`)
    } else if (hasId) {
      process.stdout.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32603, message: `Empty MCP bridge response (HTTP ${res.status})` },
      })}\n`)
    }
  } catch (error) {
    if (hasId) {
      process.stdout.write(`${JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32603, message: String(error?.message || error) },
      })}\n`)
    }
  }
}

let queue = Promise.resolve()
rl.on('line', (line) => {
  queue = queue.then(() => forward(line))
})
rl.on('close', () => {
  queue.finally(() => process.exit(0))
})
