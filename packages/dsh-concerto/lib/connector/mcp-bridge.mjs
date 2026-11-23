/**
 * Concerto 本地 MCP 桥接服务端（零外部依赖，单次执行隔离）。
 *
 * 为单次外部 Agent 执行启动一个临时回环 HTTP JSON-RPC MCP 端点（127.0.0.1:0 + 随机 Bearer Token），
 * 并提供标准 stdio MCP Server 配置，兼容：
 * - ACP `session/new.mcpServers`（Antigravity `agy acp`、Gemini CLI、OpenCode 等）
 * - Claude Code `--mcp-config <file>`
 *
 * 所有工具调用直接回调 Runner 注入的 `onToolCall(name, args)`，复用 Concerto 既有的
 * `executeMemberToolCall` 权限与 taskId/executionId 绑定，任务结束自动关闭端口并清理临时文件。
 */
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import os from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
export const MCP_STDIO_PROXY_PATH = join(HERE, 'mcp-stdio-proxy.mjs')

const SUPPORTED_PROTOCOL_VERSION = '2024-11-05'

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  }
}

function normalizeTools(dynamicTools = []) {
  return (Array.isArray(dynamicTools) ? dynamicTools : [])
    .filter((t) => t && typeof t.name === 'string' && t.name.trim() !== '')
    .map((t) => ({
      name: t.name,
      description: typeof t.description === 'string' ? t.description : '',
      inputSchema: t.inputSchema && typeof t.inputSchema === 'object'
        ? t.inputSchema
        : { type: 'object', properties: {} },
    }))
}

/**
 * 启动单次执行的 MCP 桥接服务。
 * @param {{ dynamicTools?: Array<object>, onToolCall?: (name: string, args: object) => Promise<any>|any, serverName?: string }} options
 */
export async function startExecutionMcpBridge({ dynamicTools = [], onToolCall, serverName = 'concerto' } = {}) {
  const token = randomBytes(24).toString('hex')
  const tools = normalizeTools(dynamicTools)
  const toolSet = new Set(tools.map((t) => t.name))
  let closed = false
  let tempConfigDir = null

  async function handleRpc(msg) {
    if (!msg || typeof msg !== 'object') {
      return { status: 400, body: jsonRpcError(null, -32600, 'Invalid Request') }
    }
    const hasId = Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== undefined && msg.id !== null
    const method = msg.method
    const params = msg.params ?? {}

    // Notifications (no id)
    if (!hasId) {
      return { status: 204, body: null }
    }

    if (method === 'initialize') {
      const protocolVersion = typeof params?.protocolVersion === 'string' && params.protocolVersion.trim()
        ? params.protocolVersion.trim()
        : SUPPORTED_PROTOCOL_VERSION
      return {
        status: 200,
        body: jsonRpcResult(msg.id, {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: 'concerto-team-tools', version: '0.0.6' },
        }),
      }
    }

    if (method === 'ping') {
      return { status: 200, body: jsonRpcResult(msg.id, {}) }
    }

    if (method === 'tools/list') {
      return { status: 200, body: jsonRpcResult(msg.id, { tools }) }
    }

    if (method === 'tools/call') {
      const name = typeof params?.name === 'string' ? params.name : ''
      const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {}
      if (!name || !toolSet.has(name)) {
        return {
          status: 200,
          body: jsonRpcResult(msg.id, {
            content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'unknown_tool', detail: name }) }],
            isError: true,
          }),
        }
      }
      if (typeof onToolCall !== 'function') {
        return {
          status: 200,
          body: jsonRpcResult(msg.id, {
            content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'unavailable', detail: 'tool handler unavailable' }) }],
            isError: true,
          }),
        }
      }
      try {
        const result = await onToolCall(name, args)
        const text = typeof result === 'string' ? result : JSON.stringify(result ?? { ok: true })
        return {
          status: 200,
          body: jsonRpcResult(msg.id, {
            content: [{ type: 'text', text }],
            isError: result?.ok === false,
          }),
        }
      } catch (error) {
        return {
          status: 200,
          body: jsonRpcResult(msg.id, {
            content: [{ type: 'text', text: JSON.stringify({ ok: false, code: 'tool_error', detail: String(error?.message || error) }) }],
            isError: true,
          }),
        }
      }
    }

    return { status: 200, body: jsonRpcError(msg.id, -32601, `Method not found: ${String(method)}`) }
  }

  const server = http.createServer((req, res) => {
    if (closed) {
      res.writeHead(503, { 'content-type': 'application/json' })
      res.end(JSON.stringify(jsonRpcError(null, -32000, 'MCP bridge closed')))
      return
    }
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${token}`) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify(jsonRpcError(null, -32001, 'Unauthorized')))
      return
    }
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', async () => {
      let msg
      try {
        msg = JSON.parse(raw)
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')))
        return
      }
      const { status, body } = await handleRpc(msg)
      if (status === 204 || body === null) {
        res.writeHead(204)
        res.end()
        return
      }
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const addr = server.address()
  const url = `http://127.0.0.1:${addr.port}/mcp`

  return {
    url,
    token,
    serverName,
    /** ACP `session/new.mcpServers` 元素格式 */
    toAcpServerConfig() {
      return {
        name: serverName,
        command: process.execPath,
        args: [MCP_STDIO_PROXY_PATH],
        env: [
          { name: 'CONCERTO_MCP_URL', value: url },
          { name: 'CONCERTO_MCP_TOKEN', value: token },
        ],
      }
    },
    /** Claude Code `--mcp-config <file>` 临时配置文件 */
    writeClaudeMcpConfigFile() {
      if (!tempConfigDir) {
        tempConfigDir = mkdtempSync(join(os.tmpdir(), 'concerto-mcp-'))
      }
      const configPath = join(tempConfigDir, 'mcp-config.json')
      writeFileSync(configPath, JSON.stringify({
        mcpServers: {
          [serverName]: {
            type: 'stdio',
            command: process.execPath,
            args: [MCP_STDIO_PROXY_PATH],
            env: {
              CONCERTO_MCP_URL: url,
              CONCERTO_MCP_TOKEN: token,
            },
          },
        },
      }, null, 2))
      return configPath
    },
    close() {
      if (closed) return
      closed = true
      try { server.close() } catch { /* ignore */ }
      if (tempConfigDir) {
        try { rmSync(tempConfigDir, { recursive: true, force: true }) } catch { /* ignore */ }
        tempConfigDir = null
      }
    },
  }
}
