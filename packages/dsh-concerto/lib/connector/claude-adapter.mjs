/**
 * Claude Code CLI 原生适配器（`claude -p --output-format stream-json` + Concerto MCP Bridge）。
 *
 * 特性：
 * - 通过 stdin 传递多行中文 TaskAssignment，避免 Windows 命令行长度/引号转义限制；
 * - 一步到位通过 `--mcp-config` 注入 Concerto 本地 MCP Bridge，让 Claude Code 直接调用团队工具；
 * - 归一化 `stream-json` NDJSON 事件为 `execution.started` / `output.delta` / `output.message` /
 *   `command.completed` / `file.changed` / `execution.completed` / `execution.failed`；
 * - 将 Concerto 的 `sandbox` / `approvals` 映射为 `--permission-mode`（`plan` / `acceptEdits` / `bypassPermissions`）。
 */
import { existsSync } from 'node:fs'
import os from 'node:os'
import readline from 'node:readline'
import { CONNECTOR_EVENT, CONNECTOR_CAPABILITY } from './contract.mjs'
import { startExecutionMcpBridge } from './mcp-bridge.mjs'
import { findBinaryOnPath, spawnCrossPlatform } from './acp-adapter.mjs'

function safeKill(child) {
  try {
    if (child && Number.isInteger(child.pid) && child.exitCode === null && !child.killed) {
      child.kill()
    }
  } catch { /* ignore */ }
}

function mapPermissionMode(sandbox, approvals) {
  if (sandbox === 'read-only') return 'plan'
  if (sandbox === 'danger-full-access') return 'bypassPermissions'
  return approvals === 'accept' ? 'bypassPermissions' : 'acceptEdits'
}

export function createClaudeAdapter({ bin = '', defaultCwd = '', probeTimeoutMs = 6000 } = {}) {
  const resolveBin = () => {
    if (typeof bin === 'string' && bin.trim()) {
      return existsSync(bin.trim()) ? bin.trim() : findBinaryOnPath([bin.trim()], [])
    }
    return findBinaryOnPath(['claude'], [])
  }

  return {
    id: 'claude',
    displayName: 'Claude Code',
    protocol: 'stream-json',
    description: 'Claude Code CLI（stream-json + Concerto MCP 工具桥接）',
    capabilities: Object.freeze({
      [CONNECTOR_CAPABILITY.midTurnQuestion]: false,
      [CONNECTOR_CAPABILITY.nextTurnQuestion]: true,
      [CONNECTOR_CAPABILITY.approval]: false,
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
          detail: '未找到 claude 可执行文件，请先安装 Claude Code CLI 或在配置中指定 claudeBin',
        }
      }
      const workdir = cwd || defaultCwd || os.tmpdir()
      return await new Promise((resolve) => {
        const child = spawnCrossPlatform(resolved, ['--version'], { cwd: workdir, stdio: ['ignore', 'pipe', 'pipe'] })
        let stdout = ''
        let stderr = ''
        let settled = false
        const done = (result) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          safeKill(child)
          resolve(result)
        }
        const timer = setTimeout(() => {
          done({ ok: false, code: 'timeout', detail: `claude --version timed out after ${probeTimeoutMs}ms`, bin: resolved })
        }, probeTimeoutMs)
        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (c) => { stdout += c })
        child.stderr.on('data', (c) => { stderr += c })
        child.once('error', (err) => done({ ok: false, code: 'handshake_failed', detail: String(err?.message || err), bin: resolved }))
        child.once('exit', (code) => {
          const text = (stdout || stderr).trim().split(/\r?\n/)[0] || ''
          if (code === 0 && text) {
            done({ ok: true, userAgent: text, bin: resolved })
          } else {
            done({ ok: false, code: 'handshake_failed', detail: text || `exit code ${code}`, bin: resolved })
          }
        })
      })
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
            reason: `Claude Code 进程 PID ${pid} 已退出`,
            evidence: { kind: 'pid_exited', backend: 'claude', pid, observedAt: new Date().toISOString() },
          }
        }
        return {
          checked: true,
          confirmedStopped: false,
          pidAlive: true,
          kind: 'pid_alive',
          reason: `Claude Code 进程 PID ${pid} 仍在运行`,
        }
      }
      return {
        checked: false,
        confirmedStopped: false,
        kind: 'cross_boot_unverifiable',
        reason: '跨重启无法直接核对 Claude Code 子进程存活状态，保留 unknown',
      }
    },

    start({ cwd, prompt, sandbox = 'read-only', approvals = 'ask', dynamicTools, onToolCall, onEvent, afterTurn, resumeSessionId = null } = {}) {
      const resolved = resolveBin()
      if (!resolved) {
        throw new Error('未找到 claude 可执行文件，请先安装 Claude Code CLI 或在插件配置中指定路径')
      }
      const workdir = cwd || defaultCwd
      if (!workdir) throw new Error('cwd required')

      const emit = (event) => {
        try { onEvent?.(event) } catch { /* ignore */ }
      }

      let child = null
      let mcpBridge = null
      let mcpConfigPath = null
      let cancelRequested = false
      let disposed = false
      let accumulatedText = ''
      let startedEmitted = false
      let lastSessionId = typeof resumeSessionId === 'string' && resumeSessionId.trim() ? resumeSessionId.trim() : null

      const completion = (async () => {
        try {
          if (Array.isArray(dynamicTools) && dynamicTools.length > 0 && typeof onToolCall === 'function') {
            mcpBridge = await startExecutionMcpBridge({ dynamicTools, onToolCall, serverName: 'concerto' })
            mcpConfigPath = mcpBridge.writeClaudeMcpConfigFile()
          }

          let currentPrompt = prompt
          while (true) {
            accumulatedText = ''
            let resultEvent = null
            const toolCalls = new Map()
            const cliArgs = [
              '-p',
              '--verbose',
              '--output-format', 'stream-json',
              '--permission-mode', mapPermissionMode(sandbox, approvals),
              ...(lastSessionId ? ['--resume', lastSessionId] : []),
              ...(mcpConfigPath ? ['--mcp-config', mcpConfigPath] : []),
            ]

            emit({ type: 'execution.phase', phase: lastSessionId ? 'spawn.resume' : 'spawn' })
            child = spawnCrossPlatform(resolved, cliArgs, {
              cwd: workdir,
              env: process.env,
              stdio: ['pipe', 'pipe', 'pipe'],
            })

            let stderrBuf = ''
            child.stderr.setEncoding('utf8')
            child.stderr.on('data', (chunk) => {
              stderrBuf = (stderrBuf + chunk).slice(-8192)
            })

            const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
            rl.on('line', (line) => {
              const trimmed = line.trim()
              if (!trimmed) return
              let msg
              try { msg = JSON.parse(trimmed) } catch { return }

              if (msg.session_id && typeof msg.session_id === 'string') {
                lastSessionId = msg.session_id
              }

              if (msg.type === 'system' && msg.subtype === 'init') {
                if (!startedEmitted) {
                  startedEmitted = true
                  emit({
                    type: CONNECTOR_EVENT.started,
                    nativeSessionRef: {
                      backend: 'claude',
                      sessionId: lastSessionId,
                      pid: child.pid ?? null,
                    },
                  })
                }
                return
              }

              if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
                if (!startedEmitted) {
                  startedEmitted = true
                  emit({
                    type: CONNECTOR_EVENT.started,
                    nativeSessionRef: { backend: 'claude', sessionId: lastSessionId, pid: child.pid ?? null },
                  })
                }
                for (const block of msg.message.content) {
                  if (block?.type === 'text' && typeof block.text === 'string' && block.text) {
                    accumulatedText += block.text
                    emit({ type: CONNECTOR_EVENT.outputDelta, delta: block.text })
                  } else if (block?.type === 'tool_use' && block.id) {
                    toolCalls.set(block.id, { name: block.name || 'tool', input: block.input ?? {} })
                  }
                }
                return
              }

              if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
                for (const block of msg.message.content) {
                  if (block?.type === 'tool_result' && block.tool_use_id) {
                    const call = toolCalls.get(block.tool_use_id)
                    const name = call?.name || 'tool'
                    emit({
                      type: CONNECTOR_EVENT.commandCompleted,
                      command: name,
                      toolCallId: block.tool_use_id,
                      exitCode: block.is_error ? 1 : 0,
                    })
                    if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(name)) {
                      const filePath = call?.input?.file_path || call?.input?.path
                      if (typeof filePath === 'string' && filePath) {
                        emit({ type: CONNECTOR_EVENT.fileChanged, path: filePath, kind: name.toLowerCase() })
                      }
                    }
                  }
                }
                return
              }

              if (msg.type === 'result') {
                resultEvent = msg
              }
            })

            if (child.stdin?.writable) {
              child.stdin.write(currentPrompt)
              child.stdin.end()
            }

            const { code, signal, error } = await new Promise((resolve) => {
              child.once('error', (err) => resolve({ code: null, signal: null, error: err }))
              child.once('exit', (c, s) => resolve({ code: c, signal: s, error: null }))
            })
            try { rl.close() } catch { /* ignore */ }

            if (cancelRequested || disposed) {
              return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
            }
            if (error) {
              const detail = String(error.message || error)
              emit({ type: CONNECTOR_EVENT.failed, detail })
              return { ok: false, status: 'failed', detail, text: accumulatedText }
            }

            const finalText = typeof resultEvent?.result === 'string' && resultEvent.result.trim()
              ? resultEvent.result
              : accumulatedText
            if (finalText.trim()) {
              emit({ type: CONNECTOR_EVENT.outputMessage, text: finalText })
            }

            if (resultEvent?.is_error || (code !== 0 && !resultEvent)) {
              const detail = resultEvent?.result || stderrBuf.trim() || `Claude Code exited with code=${code} signal=${signal}`
              emit({ type: CONNECTOR_EVENT.failed, detail })
              return { ok: false, status: 'failed', detail, text: finalText }
            }

            if (typeof afterTurn === 'function' && lastSessionId) {
              const next = await afterTurn({ backend: 'claude', sessionId: lastSessionId })
              if (next?.prompt) {
                next.accepted?.()
                currentPrompt = next.prompt
                continue
              }
            }

            emit({ type: CONNECTOR_EVENT.completed, text: finalText })
            return { ok: true, status: 'completed', text: finalText }
          }
        } catch (error) {
          if (cancelRequested || disposed) {
            return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
          }
          const detail = String(error?.message || error)
          emit({ type: CONNECTOR_EVENT.failed, detail })
          return { ok: false, status: 'failed', detail, text: accumulatedText }
        } finally {
          safeKill(child)
          if (mcpBridge) mcpBridge.close()
        }
      })()

      return {
        completion,
        async cancel() {
          cancelRequested = true
          safeKill(child)
        },
        dispose() {
          disposed = true
          safeKill(child)
          if (mcpBridge) mcpBridge.close()
        },
      }
    },
  }
}
