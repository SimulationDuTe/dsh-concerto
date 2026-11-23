/**
 * 自定义外部 Agent 持久化与工厂模块（~/.concerto/connectors.json）。
 *
 * 只存极简 3 字段：name (displayName) + mode ('acp' | 'cli') + command（一行启动命令）。
 * 保存后即时热注册到 connectorRegistry，无需重启 DSH。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createAcpAdapter } from './acp-adapter.mjs'
import { createCliAdapter, parseCommandLine } from './cli-adapter.mjs'

const VALID_MODES = new Set(['acp', 'cli'])

export function slugifyConnectorId(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return base ? `custom-${base}` : `custom-agent-${Date.now().toString(36)}`
}

export function validateCustomConnectorInput(input, builtinIds = new Set()) {
  if (!input || typeof input !== 'object') {
    return { ok: false, code: 'invalid', detail: 'connector configuration object required' }
  }
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : ''
  if (!displayName || displayName.length > 64) {
    return { ok: false, code: 'invalid', detail: '请填写 1~64 字的 Agent 名称' }
  }
  const mode = typeof input.mode === 'string' ? input.mode.trim().toLowerCase() : 'acp'
  if (!VALID_MODES.has(mode)) {
    return { ok: false, code: 'invalid', detail: '接入方式仅支持 acp 或 cli' }
  }
  const command = typeof input.command === 'string' ? input.command.trim() : ''
  const parsed = parseCommandLine(command)
  if (!parsed) {
    return { ok: false, code: 'invalid', detail: '请填写有效的启动命令（注意引号需成对闭合）' }
  }
  const rawId = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : slugifyConnectorId(displayName)
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(rawId)) {
    return { ok: false, code: 'invalid', detail: '连接器 ID 仅允许小写字母、数字、- 和 _' }
  }
  if (builtinIds.has(rawId)) {
    return { ok: false, code: 'conflict', detail: `ID "${rawId}" 与内置连接器重名，请更换名称` }
  }
  return {
    ok: true,
    record: {
      id: rawId,
      displayName,
      mode,
      command,
      updatedAt: new Date().toISOString(),
    },
  }
}

export function buildCustomConnectorAdapter(record, { defaultCwd = '' } = {}) {
  const parsed = parseCommandLine(record.command)
  if (!parsed) throw new Error(`Invalid command for custom connector ${record.id}`)
  if (record.mode === 'acp') {
    const adapter = createAcpAdapter({
      id: record.id,
      displayName: record.displayName,
      bin: parsed.bin,
      binNames: [parsed.bin],
      args: parsed.args,
      defaultCwd,
      extraCandidates: [],
      description: `自定义 ACP Agent（${record.command}）`,
    })
    return { ...adapter, custom: true, mode: 'acp', command: record.command }
  }
  const adapter = createCliAdapter({
    id: record.id,
    displayName: record.displayName,
    command: record.command,
    defaultCwd,
    custom: true,
  })
  return { ...adapter, custom: true, mode: 'cli', command: record.command }
}

export function createCustomConnectorStore({ filePath = '' } = {}) {
  let records = new Map()

  function load() {
    if (!filePath || !existsSync(filePath)) return
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf8'))
      const list = Array.isArray(raw?.connectors) ? raw.connectors : []
      records = new Map()
      for (const item of list) {
        if (item && typeof item.id === 'string' && typeof item.command === 'string') {
          records.set(item.id, item)
        }
      }
    } catch { /* ignore malformed custom file */ }
  }

  function save() {
    if (!filePath) return
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify({
      schemaVersion: 1,
      connectors: [...records.values()],
    }, null, 2))
  }

  load()

  return {
    list() {
      return [...records.values()].map((r) => ({ ...r }))
    },
    get(id) {
      const r = records.get(id)
      return r ? { ...r } : null
    },
    upsert(record) {
      const existing = records.get(record.id)
      const next = {
        ...record,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      records.set(next.id, next)
      save()
      return { ...next }
    },
    remove(id) {
      const existed = records.delete(id)
      if (existed) save()
      return existed
    },
  }
}
