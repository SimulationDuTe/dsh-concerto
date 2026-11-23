/**
 * 通用 ACP（Agent Client Protocol）外部 Agent 适配器。
 *
 * 通过标准 ACP（JSON-RPC 2.0 over stdio）协议接入任意支持 ACP 的原生 Coding Agent：
 * - Antigravity CLI：`agy acp`
 * - Gemini CLI：`gemini --experimental-acp`
 * - OpenCode：`opencode acp`
 *
 * 特性：
 * - 一步到位自动注入 Concerto 本地 MCP Bridge（`session/new.mcpServers`），让外部 Agent 直接调用团队工具；
 * - 完整归一化事件：`execution.started` / `output.delta` / `output.message` / `command.completed` / `file.changed` / `approval.requested` / `execution.completed` / `execution.failed`；
 * - 完整支持 `approval`（`session/request_permission` → DSH 审批流）、`cancel`（`session/cancel`）、`nextTurnQuestion`（同会话多轮追问）和同启动周期 `reconcile`。
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { CONNECTOR_EVENT, CONNECTOR_CAPABILITY } from './contract.mjs'
import { startExecutionMcpBridge } from './mcp-bridge.mjs'

const PATH_EXTS = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', '.ps1', ''] : ['']

export function findBinaryOnPath(names = [], extraCandidates = []) {
  for (const candidate of extraCandidates) {
    if (typeof candidate === 'string' && candidate.trim() && existsSync(candidate.trim())) {
      return candidate.trim()
    }
  }
  const pathEnv = (process.env.PATH || process.env.Path || '').split(process.platform === 'win32' ? ';' : ':').filter(Boolean)
  for (const name of names) {
    if (!name) continue
    if (existsSync(name)) return name
    const hasExt = Boolean(extname(name))
    for (const dir of pathEnv) {
      if (hasExt) {
        const full = join(dir, name)
        if (existsSync(full)) return full
      } else {
        for (const ext of PATH_EXTS) {
          const full = join(dir, `${name}${ext}`)
          if (existsSync(full)) return full
        }
      }
    }
  }
  return null
}

export function spawnCrossPlatform(bin, args, options) {
  if (process.platform === 'win32') {
    const ext = extname(bin).toLowerCase()
    if (ext === '.ps1') {
      return spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', bin, ...args], options)
    }
    if (ext === '.cmd' || ext === '.bat') {
      return spawn('cmd.exe', ['/d', '/s', '/c', bin, ...args], options)
    }
  }
  return spawn(bin, args, options)
}

function safeKill(child) {
  try {
    if (child && Number.isInteger(child.pid) && child.exitCode === null && !child.killed) {
      child.kill()
    }
  } catch { /* ignore */ }
}

function defaultExtraCandidates(id) {
  const home = os.homedir()
  const localApp = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local')
  if (id === 'antigravity') {
    return [
      join(localApp, 'Programs', 'Antigravity', 'agy.exe'),
      join(localApp, 'Programs', 'Antigravity', 'bin', 'agy.exe'),
      join(localApp, 'Programs', 'Antigravity', 'bin', 'agy.cmd'),
      join(home, '.gemini', 'antigravity-cli', 'bin', 'agy.exe'),
      join(home, '.gemini', 'antigravity-cli', 'bin', 'agy'),
      join(home, '.local', 'bin', 'agy'),
    ]
  }
  if (id === 'opencode') {
    return [
      join(home, '.opencode', 'bin', 'opencode.exe'),
      join(home, '.opencode', 'bin', 'opencode'),
      join(home, '.local', 'bin', 'opencode'),
    ]
  }
  return []
}

function selectPermissionOption(options = [], decision) {
  const list = Array.isArray(options) ? options : []
  const wantAllow = decision === 'accept' || decision === 'allow'
  const preferredKinds = wantAllow
    ? ['allow_once', 'allow_always']
    : ['reject_once', 'reject_always']
  for (const kind of preferredKinds) {
    const match = list.find((o) => o?.kind === kind && o?.optionId)
    if (match) return match.optionId
  }
  const fallback = wantAllow
    ? list.find((o) => /allow|approve|accept/i.test(String(o?.kind || o?.name || o?.optionId || '')))
    : list.find((o) => /reject|deny|decline|cancel/i.test(String(o?.kind || o?.name || o?.optionId || '')))
  return fallback?.optionId ?? null
}

function extractTextFromContent(content) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(extractTextFromContent).filter(Boolean).join('')
  if (typeof content.text === 'string') return content.text
  if (content.content) return extractTextFromContent(content.content)
  return ''
}

function isWritePermissionRequest(params) {
  const kind = String(params?.toolCall?.kind || '').toLowerCase()
  const title = String(params?.toolCall?.title || '').toLowerCase()
  return ['edit', 'write', 'delete', 'move', 'execute'].includes(kind)
    || /\b(write|edit|delete|remove|run|exec|bash|powershell|shell|terminal)\b/.test(title)
}

function startAcpClient(bin, args, cwd, { env = process.env } = {}) {
  const child = spawnCrossPlatform(bin, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
  const pending = new Map()
  const serverRequests = new Map()
  let nextId = 1
  let closed = false
  let stderrBuf = ''
  const notifHandlers = []
  const requestHandlers = []

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderrBuf = (stderrBuf + chunk).slice(-8192)
  })

  const exitPromise = new Promise((resolve) => {
    child.once('error', (err) => resolve({ code: null, signal: null, error: err }))
    child.once('exit', (code, signal) => resolve({ code, signal, error: null }))
  })

  const write = (payload) => new Promise((resolve, reject) => {
    if (closed || !child.stdin?.writable) return reject(new Error('ACP process stdin is closed'))
    child.stdin.write(`${JSON.stringify(payload)}\n`, (err) => (err ? reject(err) : resolve()))
  })

  const call = (method, params, timeoutMs = 600000) => {
    const id = nextId++
    return new Promise((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => {
            pending.delete(id)
            reject(new Error(`ACP ${method} timed out after ${timeoutMs}ms`))
          }, timeoutMs)
        : null
      pending.set(id, {
        resolve: (val) => { if (timer) clearTimeout(timer); resolve(val) },
        reject: (err) => { if (timer) clearTimeout(timer); reject(err) },
      })
      write({ jsonrpc: '2.0', id, method, params }).catch((err) => {
        if (timer) clearTimeout(timer)
        pending.delete(id)
        reject(err)
      })
    })
  }

  const notify = (method, params) => write({ jsonrpc: '2.0', method, params }).catch(() => {})

  const respond = async (id, result) => {
    const key = String(id)
    const req = serverRequests.get(key)
    if (!req) throw new Error('ACP backend request is no longer pending')
    serverRequests.delete(key)
    await write({ jsonrpc: '2.0', id: req.id, result })
  }

  const respondError = async (id, code, message) => {
    const key = String(id)
    const req = serverRequests.get(key)
    if (req) serverRequests.delete(key)
    await write({ jsonrpc: '2.0', id: req ? req.id : id, error: { code, message } })
  }

  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let msg
    try { msg = JSON.parse(trimmed) } catch { return }

    // Response to our request
    if (Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== null && !msg.method) {
      const slot = pending.get(msg.id)
      if (!slot) return
      pending.delete(msg.id)
      if (msg.error) {
        slot.reject(new Error(msg.error.message || JSON.stringify(msg.error)))
      } else {
        slot.resolve(msg.result)
      }
      return
    }

    // Server -> Client request (has id and method)
    if (Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== null && msg.method) {
      serverRequests.set(String(msg.id), msg)
      for (const fn of requestHandlers) {
        Promise.resolve(fn(msg)).catch(() => {})
      }
      return
    }

    // Notification
    if (msg.method) {
      for (const fn of notifHandlers) {
        try { fn(msg) } catch { /* ignore */ }
      }
    }
  })

  exitPromise.then(({ code, signal, error }) => {
    closed = true
    const detail = error
      ? String(error.message || error)
      : `ACP process exited (code=${code}, signal=${signal})${stderrBuf ? `: ${stderrBuf.trim()}` : ''}`
    for (const slot of pending.values()) {
      slot.reject(new Error(detail))
    }
    pending.clear()
  })

  return {
    child,
    exitPromise,
    call,
    notify,
    respond,
    respondError,
    hasPendingRequest: (id) => serverRequests.has(String(id)),
    getPendingRequest: (id) => serverRequests.get(String(id)) ?? null,
    onNotification: (fn) => notifHandlers.push(fn),
    onRequest: (fn) => requestHandlers.push(fn),
    getStderr: () => stderrBuf,
    close() {
      if (closed) return
      closed = true
      try { rl.close() } catch { /* ignore */ }
      try { child.stdin?.end() } catch { /* ignore */ }
      safeKill(child)
    },
  }
}

/**
 * 创建通用 ACP 外部 Agent 适配器。
 * @param {{
 *   id: string,
 *   displayName: string,
 *   bin?: string,
 *   binNames?: string[],
 *   args?: string[],
 *   defaultCwd?: string,
 *   extraCandidates?: string[],
 *   description?: string,
 *   probeTimeoutMs?: number,
 * }} config
 */
export function createAcpAdapter({
  id,
  displayName,
  bin = '',
  binNames = [id],
  args = ['acp'],
  defaultCwd = '',
  extraCandidates = defaultExtraCandidates(id),
  description = '',
  probeTimeoutMs = 8000,
} = {}) {
  const resolveBin = () => {
    if (typeof bin === 'string' && bin.trim()) {
      return existsSync(bin.trim()) ? bin.trim() : findBinaryOnPath([bin.trim()], [])
    }
    return findBinaryOnPath(binNames, extraCandidates)
  }

  return {
    id,
    displayName: displayName || id,
    protocol: 'acp',
    description,
    capabilities: Object.freeze({
      [CONNECTOR_CAPABILITY.midTurnQuestion]: false,
      [CONNECTOR_CAPABILITY.nextTurnQuestion]: true,
      [CONNECTOR_CAPABILITY.approval]: true,
      [CONNECTOR_CAPABILITY.cancel]: true,
      [CONNECTOR_CAPABILITY.resume]: true,
      [CONNECTOR_CAPABILITY.dynamicTools]: true,
      [CONNECTOR_CAPABILITY.streaming]: true,
    }),

    async probe({ cwd } = {}) {
      const resolved = resolveBin()
      if (!resolved) {
        return {
          ok: false,
          code: 'binary_missing',
          detail: `未找到 ${displayName || id} 可执行文件（尝试查找：${binNames.join(', ')}）`,
        }
      }
      const workdir = cwd || defaultCwd || os.tmpdir()
      const client = startAcpClient(resolved, args, workdir)
      try {
        const init = await client.call('initialize', {
          protocolVersion: 1,
          clientInfo: { name: 'dsh-concerto', version: '0.0.6' },
          clientCapabilities: {},
        }, probeTimeoutMs)
        const name = init?.agentInfo?.name || displayName || id
        const version = init?.agentInfo?.version ? `/${init.agentInfo.version}` : ''
        return {
          ok: true,
          userAgent: `${name}${version} (ACP v${init?.protocolVersion ?? 1})`,
          bin: resolved,
          protocolVersion: init?.protocolVersion ?? 1,
          agentCapabilities: init?.agentCapabilities ?? {},
        }
      } catch (error) {
        return {
          ok: false,
          code: 'handshake_failed',
          detail: String(error?.message || error),
          bin: resolved,
        }
      } finally {
        client.close()
      }
    },

    async reconcile(nativeSessionRef, { sameHostBoot = false } = {}) {
      const pid = Number.isInteger(nativeSessionRef?.pid) ? nativeSessionRef.pid : null
      if (pid !== null && sameHostBoot) {
        let alive = false
        try {
          process.kill(pid, 0)
          alive = true
        } catch (err) {
          if (err?.code === 'EPERM') alive = true
        }
        if (!alive) {
          return {
            checked: true,
            confirmedStopped: true,
            kind: 'pid_exited',
            reason: `ACP 进程 PID ${pid} 已退出`,
            evidence: { kind: 'pid_exited', backend: id, pid, observedAt: new Date().toISOString() },
          }
        }
        return {
          checked: true,
          confirmedStopped: false,
          pidAlive: true,
          kind: 'pid_alive',
          reason: `ACP 进程 PID ${pid} 仍在运行`,
        }
      }
      return {
        checked: false,
        confirmedStopped: false,
        kind: 'cross_boot_unverifiable',
        reason: '跨重启无法直接核对 ACP 子进程存活状态，保留 unknown',
      }
    },

    start({ cwd, prompt, sandbox = 'read-only', approvals = 'ask', dynamicTools, onToolCall, onEvent, afterTurn, resumeSessionId = null } = {}) {
      const resolved = resolveBin()
      if (!resolved) {
        throw new Error(`未找到 ${displayName || id} 可执行文件，请先安装或在插件配置中指定路径`)
      }
      const workdir = cwd || defaultCwd
      if (!workdir) throw new Error('cwd required')

      const emit = (event) => {
        try { onEvent?.(event) } catch { /* ignore */ }
      }

      const client = startAcpClient(resolved, args, workdir)
      let mcpBridge = null
      let acpSessionId = null
      let cancelRequested = false
      let accumulatedText = ''
      let disposed = false

      const pendingPermissions = new Map()

      client.onNotification((msg) => {
        if (msg.method !== 'session/update') return
        const update = msg.params?.update
        if (!update || typeof update !== 'object') return
        const kind = update.sessionUpdate || update.type || ''

        if (kind === 'agent_message_chunk') {
          const delta = extractTextFromContent(update.content)
          if (delta) {
            accumulatedText += delta
            emit({ type: CONNECTOR_EVENT.outputDelta, delta })
          }
          return
        }

        if (kind === 'tool_call' || kind === 'tool_call_update') {
          const status = String(update.status || '')
          const toolKind = String(update.kind || '')
          const title = String(update.title || update.toolCallId || 'tool')
          if (status === 'completed' || status === 'failed') {
            emit({
              type: CONNECTOR_EVENT.commandCompleted,
              command: title,
              toolCallId: update.toolCallId ?? null,
              kind: toolKind || 'tool',
              exitCode: status === 'completed' ? 0 : 1,
            })
            if (Array.isArray(update.locations) && update.locations.length > 0) {
              for (const loc of update.locations) {
                if (loc?.path) {
                  emit({ type: CONNECTOR_EVENT.fileChanged, path: loc.path, kind: toolKind || 'edit' })
                }
              }
            }
          }
        }
      })

      client.onRequest(async (msg) => {
        const { id: reqId, method, params } = msg
        if (method === 'session/request_permission') {
          const key = String(reqId)
          const options = Array.isArray(params?.options) ? params.options : []
          pendingPermissions.set(key, options)

          // Enforce read-only sandbox on write/exec permission requests
          if (sandbox === 'read-only' && isWritePermissionRequest(params)) {
            const optionId = selectPermissionOption(options, 'decline')
            pendingPermissions.delete(key)
            await client.respond(reqId, optionId
              ? { outcome: { outcome: 'selected', optionId } }
              : { outcome: { outcome: 'cancelled' } })
            emit({ type: 'approval.resolved', requestId: key, decision: 'decline', actor: { kind: 'policy', id: 'read-only-sandbox' } })
            return
          }

          emit({
            type: CONNECTOR_EVENT.approvalRequested,
            requestId: key,
            payload: {
              method,
              toolCall: params?.toolCall ?? null,
              title: params?.toolCall?.title || '外部 Agent 请求操作授权',
              options,
            },
          })

          if (approvals !== 'ask') {
            const optionId = selectPermissionOption(options, approvals)
            pendingPermissions.delete(key)
            await client.respond(reqId, optionId
              ? { outcome: { outcome: 'selected', optionId } }
              : { outcome: { outcome: 'cancelled' } })
            emit({ type: 'approval.resolved', requestId: key, decision: approvals, actor: { kind: 'policy', id: approvals } })
          }
          return
        }

        await client.respondError(reqId, -32601, `Unsupported ACP client method: ${method}`)
      })

      const completion = (async () => {
        try {
          if (Array.isArray(dynamicTools) && dynamicTools.length > 0 && typeof onToolCall === 'function') {
            mcpBridge = await startExecutionMcpBridge({ dynamicTools, onToolCall, serverName: 'concerto' })
          }

          emit({ type: 'execution.phase', phase: 'initialize.sent' })
          const initRes = await client.call('initialize', {
            protocolVersion: 1,
            clientInfo: { name: 'dsh-concerto', version: '0.0.6' },
            clientCapabilities: {},
          }, 15000)

          const mcpServers = mcpBridge ? [mcpBridge.toAcpServerConfig()] : []
          let resumed = false
          if (typeof resumeSessionId === 'string' && resumeSessionId.trim() && initRes?.agentCapabilities?.loadSession !== false) {
            try {
              emit({ type: 'execution.phase', phase: 'session.load' })
              await client.call('session/load', {
                sessionId: resumeSessionId.trim(),
                cwd: workdir,
                mcpServers,
              }, 20000)
              acpSessionId = resumeSessionId.trim()
              resumed = true
              emit({ type: 'execution.phase', phase: 'session.resumed' })
            } catch {
              resumed = false
            }
          }
          if (!resumed) {
            emit({ type: 'execution.phase', phase: 'session.new' })
            const sessionRes = await client.call('session/new', {
              cwd: workdir,
              mcpServers,
            }, 20000)
            acpSessionId = sessionRes?.sessionId || `acp-${Date.now()}`
          }

          emit({
            type: CONNECTOR_EVENT.started,
            nativeSessionRef: {
              backend: id,
              sessionId: acpSessionId,
              pid: client.child.pid ?? null,
            },
          })

          let currentPrompt = prompt
          while (true) {
            accumulatedText = ''
            emit({ type: 'execution.phase', phase: 'session.prompt' })
            const turnRes = await client.call('session/prompt', {
              sessionId: acpSessionId,
              prompt: [{ type: 'text', text: currentPrompt }],
            }, 600000)

            if (accumulatedText.trim()) {
              emit({ type: CONNECTOR_EVENT.outputMessage, text: accumulatedText })
            }

            const stopReason = String(turnRes?.stopReason || 'end_turn')
            if (cancelRequested || stopReason === 'cancelled') {
              return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
            }

            if (typeof afterTurn === 'function') {
              const next = await afterTurn({ backend: id, sessionId: acpSessionId })
              if (next?.prompt) {
                next.accepted?.()
                currentPrompt = next.prompt
                continue
              }
            }

            emit({ type: CONNECTOR_EVENT.completed, text: accumulatedText, stopReason })
            return { ok: true, status: 'completed', text: accumulatedText }
          }
        } catch (error) {
          if (cancelRequested || disposed) {
            return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
          }
          const detail = String(error?.message || error)
          emit({ type: CONNECTOR_EVENT.failed, detail })
          return { ok: false, status: 'failed', detail, text: accumulatedText }
        } finally {
          client.close()
          if (mcpBridge) mcpBridge.close()
          await Promise.race([client.exitPromise, new Promise((r) => setTimeout(r, 250))])
        }
      })()

      return {
        completion,
        async respond(requestId, answer) {
          const key = String(requestId)
          const options = pendingPermissions.get(key)
          if (!options) throw new Error('ACP permission request is no longer pending')
          pendingPermissions.delete(key)
          const decision = typeof answer === 'string' ? answer : (answer?.decision ?? 'decline')
          const optionId = selectPermissionOption(options, decision)
          await client.respond(requestId, optionId
            ? { outcome: { outcome: 'selected', optionId } }
            : { outcome: { outcome: 'cancelled' } })
        },
        async cancel() {
          cancelRequested = true
          if (acpSessionId) {
            await client.notify('session/cancel', { sessionId: acpSessionId })
          }
          setTimeout(() => client.close(), 300).unref?.()
        },
        dispose() {
          disposed = true
          client.close()
          if (mcpBridge) mcpBridge.close()
        },
      }
    },
  }
}
