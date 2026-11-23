/**
 * Codex 适配器：把 `codex app-server` 的私有 JSON-RPC 翻译成归一化 Connector 事件。
 *
 * 私有协议（已实测，见 docs/a1.5-codex/CAPABILITY-MATRIX.md）：
 * - initialize / initialized、thread/start、turn/start
 * - 服务端反向请求：item/*Approval、item/tool/requestUserInput、item/tool/call
 * - 通知：item/agentMessage/delta、item.agentMessage、turn/completed
 *
 * 这些形状只允许出现在本文件；Runtime 只看 contract.mjs 里的归一化事件。
 * 设计：§2.1（后端适配）、§17.1（本版唯一可用通道）、§5.2（提问要能回到 Runtime）
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import readline from 'node:readline'
import { CONNECTOR_EVENT } from './contract.mjs'

const CLIENT_INFO = { name: 'concerto-connector', title: 'Concerto Connector', version: '0.0.3' }

/**
 * 定位 codex 可执行文件：显式配置优先，其次扫描 Codex 安装目录，最后回落到 PATH。
 * 不写死某台机器的绝对路径。
 */
export function resolveCodexBin(configured = '') {
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()

  const local = process.env.LOCALAPPDATA
  if (local) {
    const base = join(local, 'OpenAI', 'Codex', 'bin')
    if (existsSync(base)) {
      const candidates = readdirSync(base, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(base, entry.name, 'codex.exe'))
        .filter((path) => existsSync(path))
      if (candidates.length > 0) {
        candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
        return candidates[0]
      }
    }
  }
  return 'codex'
}

/** One process owns its RPC correlation, pending input requests and completion evidence. */
function startAppServer({ bin, cwd, timeoutMs, onEvent, onRequest, spawnProcess }) {
  const child = spawnProcess(bin, ['app-server'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
  const pending = new Map(), requests = new Map(), waiters = [], events = []
  let nextId = 0, failure = null, cancelling = false
  const closed = Promise.withResolvers()
  function fail(error) {
    if (failure) return
    failure = error
    closed.resolve(error)
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error) }
    pending.clear()
    for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(error) }
  }
  function write(message) {
    return new Promise((resolve, reject) => {
      if (failure) return reject(failure)
      child.stdin.write(JSON.stringify(message) + '\n', (error) => error ? reject(error) : resolve())
    })
  }
  function call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout:${method}`)) }, timeoutMs)
      pending.set(id, { resolve, reject, timer })
      write({ jsonrpc: '2.0', id, method, params }).catch(fail)
    })
  }
  function waitFor(match) {
    const existing = events.find(match)
    if (existing) return Promise.resolve(existing)
    if (failure) return Promise.reject(failure)
    return new Promise((resolve, reject) => {
      const waiter = { match, resolve, reject, timer: null }
      waiters.push(waiter)
      resumeCompletionTimers()
    })
  }
  // Human input is not execution time. RPC handshakes still have their own timeout.
  function resumeCompletionTimers() {
    if (requests.size && !cancelling) return
    for (const waiter of waiters) {
      clearTimeout(waiter.timer)
      waiter.timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1)
        waiter.reject(new Error('timeout:turn/completed'))
      }, timeoutMs)
    }
  }
  async function respond(id, result) {
    if (!requests.has(String(id))) throw new Error('backend request is no longer pending')
    const request = requests.get(String(id))
    await write({ jsonrpc: '2.0', id: request.id, result })
    requests.delete(String(id))
    resumeCompletionTimers()
  }
  const rl = readline.createInterface({ input: child.stdout })
  rl.on('line', (line) => {
    if (!line.trim()) return
    try {
      const message = JSON.parse(line)
      if (message.method && message.id !== undefined) {
        requests.set(String(message.id), message)
        if (!cancelling) for (const waiter of waiters) clearTimeout(waiter.timer)
        const rejectRequest = async (response) => {
          await write(response)
          requests.delete(String(message.id))
          resumeCompletionTimers()
        }
        Promise.resolve(onRequest(message, respond, rejectRequest)).catch(fail)
      } else if (message.id !== undefined && pending.has(message.id)) {
        const entry = pending.get(message.id)
        pending.delete(message.id); clearTimeout(entry.timer)
        if (message.error) entry.reject(Object.assign(new Error(JSON.stringify(message.error)), { rpcCode: message.error.code }))
        else entry.resolve(message.result)
      } else if (message.method) {
        if (message.method === 'turn/completed' || message.method === 'serverRequest/resolved') events.push(message)
        onEvent(message)
        for (const waiter of [...waiters]) if (waiter.match(message)) {
          waiters.splice(waiters.indexOf(waiter), 1); clearTimeout(waiter.timer); waiter.resolve(message)
        }
      }
    } catch (error) { fail(error) }
  })
  child.on('error', fail)
  child.stdin.on('error', fail)
  child.stderr.resume()
  child.on('exit', (code, signal) => fail(new Error(`app-server exited: code=${code}, signal=${signal}`)))
  return { call, waitFor, respond, closed: closed.promise, notify: (method, params) => write({ jsonrpc: '2.0', method, params }),
    pid: Number.isInteger(child.pid) ? child.pid : null,
    expectStop() { cancelling = true; resumeCompletionTimers() },
    close() { fail(new Error('app-server closed')); rl.close(); if (Number.isInteger(child.pid) && child.exitCode === null && !child.killed) { try { child.kill() } catch { /* already exited */ } } } }
}

export function createCodexAdapter({ bin = '', defaultCwd = '', planModel = '', timeoutMs = 180000, spawnProcess = spawn } = {}) {
  const resolvedBin = resolveCodexBin(bin)
  const open = (cwd, onEvent, onRequest, deadline = timeoutMs) => startAppServer({
    bin: resolvedBin, cwd: cwd || defaultCwd || process.cwd(), timeoutMs: deadline, spawnProcess, onEvent, onRequest,
  })
  return {
    id: 'codex', displayName: 'Codex (app-server)',
    // Advertise the adapter, not every feature measured in a separate backend spike.
    capabilities: { approval: true, cancel: true, resume: false, dynamicTools: true, nextTurnQuestion: true, midTurnQuestion: Boolean(planModel), streaming: false },
    async probe({ cwd } = {}) {
      let server
      try {
        server = open(cwd, () => {}, async (request, _respond, write) => {
          await write({ id: request.id, error: { code: -32601, message: 'No tools exposed during probe' } })
        }, Math.min(timeoutMs, 5000))
        const init = await server.call('initialize', { clientInfo: CLIENT_INFO, capabilities: { experimentalApi: true } })
        await server.notify('initialized', {})
        return { ok: true, userAgent: init.userAgent, bin: resolvedBin }
      } catch (error) {
        const code = [-32601, -32602].includes(error.rpcCode) ? 'version_mismatch' : 'connector_unavailable'
        return { ok: false, code, detail: error.message }
      } finally {
        server?.close()
      }
    },
    async reconcile(nativeSessionRef, { cwd, sameHostBoot = false } = {}) {
      const pid = Number.isInteger(nativeSessionRef?.pid) ? nativeSessionRef.pid : null
      const threadId = typeof nativeSessionRef?.sessionId === 'string' ? nativeSessionRef.sessionId : ''
      const turnId = typeof nativeSessionRef?.turnId === 'string' ? nativeSessionRef.turnId : ''
      if (pid !== null && sameHostBoot) {
        let alive = false
        try {
          process.kill(pid, 0)
          alive = true
        } catch (err) {
          if (err?.code === 'EPERM') alive = true
        }
        if (alive) {
          return { checked: true, confirmedStopped: false, pidAlive: true, reason: `codex app-server pid ${pid} is still alive` }
        }
        return {
          checked: true,
          confirmedStopped: true,
          evidence: { kind: 'codex_reconcile_stopped', reason: 'process_exited', pid, ...(threadId ? { threadId } : {}), observedAt: new Date().toISOString() },
          reason: `codex app-server pid ${pid} exited in current host boot`,
        }
      }
      if (!threadId) {
        return {
          checked: false,
          confirmedStopped: false,
          reason: 'no threadId or current-boot pid recorded; cannot verify codex backend stop',
        }
      }
      let server
      try {
        server = open(cwd, () => {}, async (request, _respond, write) => {
          await write({ id: request.id, error: { code: -32601, message: 'No tools exposed during reconcile' } })
        })
        await server.call('initialize', { clientInfo: CLIENT_INFO, capabilities: { experimentalApi: true } })
        await server.notify('initialized', {})
        const readOut = await server.call('thread/read', { threadId, includeTurns: true })
        const turns = Array.isArray(readOut?.thread?.turns) ? readOut.thread.turns : []
        const targetTurn = turnId ? turns.find((t) => t?.id === turnId) : turns.at(-1)
        const status = targetTurn?.status ?? ''
        if (['completed', 'interrupted', 'failed'].includes(status)) {
          return {
            checked: true,
            confirmedStopped: true,
            evidence: {
              kind: 'codex_reconcile_stopped',
              reason: 'thread_turn_terminal',
              threadId,
              ...(targetTurn?.id ? { turnId: targetTurn.id } : {}),
              turnStatus: status,
              observedAt: new Date().toISOString(),
            },
            reason: `codex thread ${threadId} turn confirmed terminal (${status})`,
          }
        }
        return {
          checked: true,
          confirmedStopped: false,
          reason: `codex thread ${threadId} turn status "${status || 'unknown'}" is not terminal`,
        }
      } catch (error) {
        return {
          checked: false,
          confirmedStopped: false,
          reason: `codex thread/read reconcile unconfirmed (${error?.message || error}); keep unknown`,
        }
      } finally {
        try { server?.close?.() } catch { /* ignore */ }
      }
    },
    start({ cwd, prompt, sandbox = 'read-only', approvals = 'ask', dynamicTools = [], onToolCall = null, onEvent = () => {}, afterTurn = null }) {
      if (!['ask', 'accept', 'decline'].includes(approvals)) throw new Error('approvals must be ask, accept or decline')
      let threadId, turnId, activeTurn = false, cancelRequested = false, text = ''
      let planning = Boolean(planModel)
      const plannedQuestions = new Map()
      const began = performance.now()
      const emit = (event) => onEvent({ ...event, observedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - began) })
      const server = open(cwd, (message) => {
        const params = message.params ?? {}
        if (message.method === 'item/agentMessage/delta') {
          text += params.delta ?? ''
        } else if (message.method === 'item/completed' && params.item?.type === 'agentMessage') {
          text = params.item.text
          emit({ type: CONNECTOR_EVENT.outputMessage, text })
        } else if (message.method === 'item/completed' && params.item?.type === 'commandExecution') {
          const item = params.item
          const rawOut = typeof item.aggregatedOutput === 'string'
            ? item.aggregatedOutput
            : (typeof item.stdout === 'string' ? item.stdout : (typeof item.output === 'string' ? item.output : ''))
          emit({
            type: CONNECTOR_EVENT.commandCompleted,
            command: String(item.command ?? ''),
            cwd: item.cwd ?? null,
            exitCode: Number.isInteger(item.exitCode) ? item.exitCode : null,
            status: item.status ?? null,
            output: rawOut.slice(0, 2000),
            truncated: rawOut.length > 2000,
          })
        } else if (message.method === 'item/completed' && params.item?.type === 'fileChange') {
          const item = params.item
          const changes = Array.isArray(item.changes)
            ? item.changes.map((c) => ({
                path: String(c?.path ?? c?.file ?? ''),
                kind: String(c?.kind ?? c?.type ?? 'modify'),
                added: Number.isInteger(c?.added) ? c.added : null,
                removed: Number.isInteger(c?.removed) ? c.removed : null,
              }))
            : (item.path ? [{ path: String(item.path), kind: 'modify', added: null, removed: null }] : [])
          emit({
            type: CONNECTOR_EVENT.fileChanged,
            changes,
          })
        }
      }, async (request, respond, write) => {
        const { id, method, params } = request
        if (method === 'item/commandExecution/requestApproval' || method === 'item/fileChange/requestApproval') {
          const files = Array.isArray(params?.changes)
            ? params.changes.map((c) => String(c?.path ?? c?.file ?? '')).filter(Boolean)
            : (params?.path ? [String(params.path)] : [])
          const decisionScope = params?.decisionScope ?? (Array.isArray(params?.availableDecisions) ? params.availableDecisions.join(' | ') : 'per-request')
          emit({ type: CONNECTOR_EVENT.approvalRequested, requestId: String(id), payload: { ...params, method, ...(files.length > 0 ? { files } : {}), decisionScope } })
          if (approvals !== 'ask') {
            await respond(id, { decision: approvals })
            emit({ type: 'approval.resolved', requestId: String(id), decision: approvals, actor: { kind: 'policy', id: approvals } })
          }
        } else if (method === 'item/tool/requestUserInput') {
          if (planning) plannedQuestions.set(String(id), null)
          emit({ type: CONNECTOR_EVENT.questionRequested, requestId: String(id), responseMode: 'same_turn', payload: params })
        } else if (method === 'item/permissions/requestApproval') {
          await respond(id, { permissions: {}, scope: 'turn' })
          emit({ type: 'approval.unsupported', payload: { method, reason: 'granular permissions are not exposed by this adapter' } })
        } else if (method === 'item/tool/call') {
          if (typeof onToolCall === 'function') {
            const name = params?.name ?? params?.tool ?? ''
            const args = params?.arguments ?? params?.input ?? params?.args ?? {}
            let result
            try {
              result = planning && ['ask_task_question', 'submit_result', 'submit_review'].includes(name)
                ? { ok: false, code: 'precondition_failed', detail: 'Use native questions in the planning turn. Submit work after the task turn begins.' }
                : await onToolCall(name, args)
            } catch (error) {
              result = { ok: false, code: 'invalid', detail: error.message }
            }
            emit({ type: 'tool.called', tool: name, ok: result?.ok !== false })
            await respond(id, { success: result?.ok !== false, contentItems: [{ type: 'inputText', text: JSON.stringify(result ?? null) }] })
          } else {
            await respond(id, { success: false, contentItems: [{ type: 'inputText', text: 'Concerto dynamic tools are not configured.' }] })
          }
        } else {
          await write({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported server request: ${method}` } })
        }
      })
      const completion = (async () => {
        try {
          emit({ type: 'execution.phase', phase: 'initialize.sent' })
          await server.call('initialize', { clientInfo: CLIENT_INFO, capabilities: { experimentalApi: true } })
          emit({ type: 'execution.phase', phase: 'initialize.ack' })
          await server.notify('initialized', {})
          const thread = await server.call('thread/start', {
            cwd: cwd || defaultCwd,
            sandbox,
            approvalPolicy: approvals === 'decline' ? 'never' : 'on-request',
            ephemeral: true,
            ...(Array.isArray(dynamicTools) && dynamicTools.length > 0 ? { dynamicTools } : {}),
          })
          threadId = thread.thread.id
          emit({ type: 'execution.phase', phase: 'thread.ack' })
          emit({ type: CONNECTOR_EVENT.started, threadId, ...(server.pid !== null ? { pid: server.pid } : {}) })
          let next = { prompt: planning ? `Clarify any missing requirements for this task in Plan mode. Use native user input only if needed, then finish the planning turn. Concerto will start the task turn separately.\n\n${prompt}` : prompt }
          while (next && !cancelRequested) {
            text = ''
            emit({ type: 'execution.phase', phase: 'turn.sent' })
            const turn = await server.call('turn/start', {
              threadId, input: [{ type: 'text', text: next.prompt }], effort: 'low',
              ...(planModel ? { collaborationMode: { mode: planning ? 'plan' : 'default',
                settings: { model: planModel, reasoning_effort: null, developer_instructions: null } } } : {}),
            })
            turnId = turn.turn.id
            activeTurn = true
            emit({ type: 'execution.phase', phase: 'turn.ack', turnId })
            next.accepted?.()
            if (cancelRequested) await server.call('turn/interrupt', { threadId, turnId })
            const end = await server.waitFor((message) => message.method === 'turn/completed' && message.params.threadId === threadId && message.params.turn.id === turnId)
            activeTurn = false
            const status = end.params.turn.status
            if (!['completed', 'interrupted', 'failed'].includes(status)) throw new Error(`Unknown terminal status: ${status}`)
            if (status !== 'completed' || cancelRequested) return { ok: status === 'completed', status, text: text.trim(), threadId, turnId, detail: end.params.turn.error?.message }
            if (planning) {
              const replies = [...plannedQuestions.values()]
              if (replies.includes(null)) throw new Error('The native planning turn ended with an unanswered question')
              await Promise.all(replies)
              planning = false
              next = { prompt: `The planning turn has finished. Execute the original assignment now, using any confirmed answers in the conversation.\n\n${prompt}` }
            } else {
              next = afterTurn ? await Promise.race([
                afterTurn({ threadId, turnId }), server.closed.then((error) => { throw error }),
              ]) : null
              if (!next && !cancelRequested) return { ok: true, status, text: text.trim(), threadId, turnId }
            }
          }
          return { ok: false, status: 'interrupted', text: text.trim(), threadId, turnId }
        } catch (error) {
          return { ok: false, status: 'unknown', code: 'execution_unknown', detail: error.message, text }
        } finally { server.close() }
      })()
      return { completion,
        async respond(requestId, answer) {
          const key = String(requestId)
          if (!plannedQuestions.has(key)) return server.respond(requestId, answer)
          const reply = server.respond(requestId, answer).then(() => server.waitFor((message) =>
            message.method === 'serverRequest/resolved' && message.params.threadId === threadId && String(message.params.requestId) === key))
          plannedQuestions.set(key, reply)
          await reply
          plannedQuestions.delete(key)
        },
        async cancel() { cancelRequested = true; server.expectStop(); if (activeTurn) await server.call('turn/interrupt', { threadId, turnId }) },
        dispose() { server.close() },
      }
    },
  }
}
