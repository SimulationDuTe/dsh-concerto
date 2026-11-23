/**
 * 通用 Headless CLI 外部 Agent 适配器（兜底模式，覆盖 Aider / 自定义脚本 / 任意命令行 Agent）。
 *
 * 用户只需填一条启动命令：
 * - 带 `{{prompt}}` 占位符：例如 `aider --yes --message {{prompt}}`，任务文本自动替换到对应参数位；
 * - 不带 `{{prompt}}`：例如 `my-agent run`，任务文本自动通过 stdin 传入并关闭 stdin。
 *
 * 诚实声明能力：streaming + cancel（不支持 approval / dynamicTools / resume），
 * 结束后如工作区是 Git 仓库，自动扫描新增/修改文件并归一化为 `file.changed` 事件。
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import { CONNECTOR_EVENT, CONNECTOR_CAPABILITY } from './contract.mjs'
import { findBinaryOnPath, spawnCrossPlatform } from './acp-adapter.mjs'

function safeKill(child) {
  try {
    if (child && Number.isInteger(child.pid) && child.exitCode === null && !child.killed) {
      child.kill()
    }
  } catch { /* ignore */ }
}

/**
 * 将一行命令行拆分为 [bin, ...args]，支持单引号与双引号（兼容 Windows 带空格路径）。
 * @param {string} commandLine
 * @returns {{ bin: string, args: string[] } | null}
 */
export function parseCommandLine(commandLine) {
  if (typeof commandLine !== 'string') return null
  const input = commandLine.trim()
  if (!input) return null
  const tokens = []
  let current = ''
  let quote = null
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (quote) return null
  if (current.length > 0) tokens.push(current)
  if (tokens.length === 0) return null
  return { bin: tokens[0], args: tokens.slice(1) }
}

function readGitStatusFiles(cwd) {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const set = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (line.length > 3) {
        const file = line.slice(3).trim().replace(/^"|"$/g, '')
        if (file) set.add(file)
      }
    }
    return set
  } catch {
    return null
  }
}

export function createCliAdapter({
  id,
  displayName,
  command,
  defaultCwd = '',
  description = '',
  custom = false,
} = {}) {
  const parsed = parseCommandLine(command)
  if (!parsed) throw new Error(`Invalid CLI command template for connector "${id}"`)

  const resolveBin = () => (existsSync(parsed.bin) ? parsed.bin : findBinaryOnPath([parsed.bin], []))

  return {
    id,
    displayName: displayName || id,
    protocol: 'cli',
    description: description || `自定义命令行 Agent（${parsed.bin}）`,
    custom: Boolean(custom),
    command,
    capabilities: Object.freeze({
      [CONNECTOR_CAPABILITY.midTurnQuestion]: false,
      [CONNECTOR_CAPABILITY.nextTurnQuestion]: false,
      [CONNECTOR_CAPABILITY.approval]: false,
      [CONNECTOR_CAPABILITY.cancel]: true,
      [CONNECTOR_CAPABILITY.resume]: false,
      [CONNECTOR_CAPABILITY.dynamicTools]: false,
      [CONNECTOR_CAPABILITY.streaming]: true,
    }),

    async probe() {
      const resolved = resolveBin()
      if (!resolved) {
        return {
          ok: false,
          code: 'binary_missing',
          detail: `未找到可执行文件 "${parsed.bin}"，请确认已安装或在 PATH 中，或填写完整路径`,
        }
      }
      return {
        ok: true,
        userAgent: `${displayName || id} (CLI: ${parsed.bin})`,
        bin: resolved,
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
            reason: `CLI 进程 PID ${pid} 已退出`,
            evidence: { kind: 'pid_exited', backend: id, pid, observedAt: new Date().toISOString() },
          }
        }
        return {
          checked: true,
          confirmedStopped: false,
          pidAlive: true,
          kind: 'pid_alive',
          reason: `CLI 进程 PID ${pid} 仍在运行`,
        }
      }
      return {
        checked: false,
        confirmedStopped: false,
        kind: 'cross_boot_unverifiable',
        reason: '跨重启无法直接核对 CLI 子进程存活状态，保留 unknown',
      }
    },

    start({ cwd, prompt, onEvent } = {}) {
      const resolved = resolveBin()
      if (!resolved) {
        throw new Error(`未找到可执行文件 "${parsed.bin}"`)
      }
      const workdir = cwd || defaultCwd || os.tmpdir()
      const emit = (event) => {
        try { onEvent?.(event) } catch { /* ignore */ }
      }

      const hasPlaceholder = parsed.args.some((a) => a.includes('{{prompt}}'))
      const finalArgs = hasPlaceholder
        ? parsed.args.map((a) => a.replaceAll('{{prompt}}', prompt ?? ''))
        : [...parsed.args]

      let child = null
      let cancelRequested = false
      let disposed = false
      let accumulatedText = ''

      const completion = (async () => {
        const beforeFiles = readGitStatusFiles(workdir)
        try {
          emit({ type: 'execution.phase', phase: 'spawn' })
          child = spawnCrossPlatform(resolved, finalArgs, {
            cwd: workdir,
            env: process.env,
            stdio: [hasPlaceholder ? 'ignore' : 'pipe', 'pipe', 'pipe'],
          })

          emit({
            type: CONNECTOR_EVENT.started,
            nativeSessionRef: { backend: id, sessionId: null, pid: child.pid ?? null },
          })

          let stderrBuf = ''
          child.stdout.setEncoding('utf8')
          child.stderr.setEncoding('utf8')
          child.stdout.on('data', (chunk) => {
            if (!chunk) return
            accumulatedText += chunk
            emit({ type: CONNECTOR_EVENT.outputDelta, delta: chunk })
          })
          child.stderr.on('data', (chunk) => {
            stderrBuf = (stderrBuf + chunk).slice(-8192)
          })

          if (!hasPlaceholder && child.stdin?.writable) {
            child.stdin.write(prompt ?? '')
            child.stdin.end()
          }

          const { code, signal, error } = await new Promise((resolve) => {
            child.once('error', (err) => resolve({ code: null, signal: null, error: err }))
            child.once('exit', (c, s) => resolve({ code: c, signal: s, error: null }))
          })

          if (cancelRequested || disposed) {
            return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
          }
          if (error) {
            const detail = String(error.message || error)
            emit({ type: CONNECTOR_EVENT.failed, detail })
            return { ok: false, status: 'failed', detail, text: accumulatedText }
          }

          if (beforeFiles !== null) {
            const afterFiles = readGitStatusFiles(workdir)
            if (afterFiles) {
              for (const file of afterFiles) {
                if (!beforeFiles.has(file)) {
                  emit({ type: CONNECTOR_EVENT.fileChanged, path: file, kind: 'edit' })
                }
              }
            }
          }

          if (accumulatedText.trim()) {
            emit({ type: CONNECTOR_EVENT.outputMessage, text: accumulatedText })
          }

          if (code !== 0) {
            const detail = stderrBuf.trim() || `${parsed.bin} exited with code=${code} signal=${signal}`
            emit({ type: CONNECTOR_EVENT.failed, detail })
            return { ok: false, status: 'failed', detail, text: accumulatedText }
          }

          emit({ type: CONNECTOR_EVENT.completed, text: accumulatedText })
          return { ok: true, status: 'completed', text: accumulatedText }
        } catch (error) {
          if (cancelRequested || disposed) {
            return { ok: false, status: 'interrupted', text: accumulatedText, detail: 'cancelled' }
          }
          const detail = String(error?.message || error)
          emit({ type: CONNECTOR_EVENT.failed, detail })
          return { ok: false, status: 'failed', detail, text: accumulatedText }
        } finally {
          safeKill(child)
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
        },
      }
    },
  }
}
