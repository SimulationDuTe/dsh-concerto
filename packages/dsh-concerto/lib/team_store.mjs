/**
 * 团队配置存储。
 * 语义：configVersion CAS、写请求 requestId 幂等；可选的 JSON 文件持久化
 * （A1 要求「重启后配置保留」，任务数据仍留内存）。
 * 设计：§3.1 配置版本、§7.7 saveTeam 用 configVersion CAS、写请求幂等。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { presetRowFromTeam } from './projection/team_preset.mjs'
import { fail } from './http.mjs'

export function createTeamStore({ maxTeams = 64, statePath = '' } = {}) {
  /** @type {Map<string, { id: string, name: string, version: number, team: object }>} */
  const teams = new Map()
  /** requestId -> { method, hash, body } */
  const requests = new Map()

  // 启动时载入；文件缺失或损坏就按空状态开始（不阻断插件激活）
  if (statePath) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, 'utf8'))
      for (const record of parsed?.teams ?? []) {
        if (record && typeof record.id === 'string') teams.set(record.id, record)
      }
    } catch { /* 首次运行/损坏：从空开始 */ }
  }

  /** 原子写：临时文件 + rename，避免半截 JSON。返回是否落盘成功。 */
  function persist() {
    if (!statePath) return false
    try {
      mkdirSync(dirname(statePath), { recursive: true })
      const tmp = `${statePath}.tmp`
      writeFileSync(tmp, JSON.stringify({ teams: [...teams.values()] }, null, 2), 'utf8')
      renameSync(tmp, statePath)
      return true
    } catch {
      return false
    }
  }

  function summarize(record) {
    return { id: record.id, name: record.name, configVersion: record.version, memberCount: 1 + record.team.members.length }
  }

  function listTeams() {
    return [...teams.values()].map(summarize)
  }

  /**
   * 保存团队。
   * @param {{ requestId?: string, team: object, expectedConfigVersion?: number }} input
   * @returns {{ok:true, body:object} | {ok:false, status:number, body:object}}
   */
  function saveTeam(input) {
    if (!input || typeof input !== 'object') {
      return { ok: false, status: 400, body: { code: 'invalid', detail: 'body must be an object' } }
    }
    const { requestId, team, expectedConfigVersion } = input

    // 1) 幂等：同 requestId 同内容回放首次结果；同 id 不同内容拒绝
    if (requestId !== undefined) {
      if (typeof requestId !== 'string' || requestId === '') {
        return { ok: false, status: 400, body: { code: 'invalid', detail: 'requestId must be a non-empty string' } }
      }
      const hash = JSON.stringify({ team, expectedConfigVersion })
      const seen = requests.get(requestId)
      if (seen) {
        if (seen.hash !== hash) {
          return { ok: false, status: 409, body: { code: 'conflict', detail: 'idempotency_conflict' } }
        }
        return { ok: true, status: 200, body: { ...seen.body, replayed: true } }
      }
    }

    // 2) 校验：复用投影器，团队数据必须是能生成 preset 的形状
    const built = presetRowFromTeam(team)
    if (!built.ok) {
      const detail = built.errors.map((e) => e.detail).filter(Boolean).join('; ')
      return { ok: false, status: 400, body: { code: 'invalid', ...(detail ? { detail } : {}), details: built.errors } }
    }
    const id = built.row.config.id

    // 3) 容量上限：MVP 单 profile 不做无限团队
    if (!teams.has(id) && teams.size >= maxTeams) {
      return { ok: false, status: 400, body: { code: 'invalid', detail: `at most ${maxTeams} teams` } }
    }

    // 4) CAS：版本不符即 conflict，不覆盖别人刚写的配置
    const existing = teams.get(id)
    const current = existing?.version ?? 0
    const expected = expectedConfigVersion === undefined ? current : expectedConfigVersion
    if (expected !== current) {
      return { ok: false, status: 409, body: { code: 'conflict', detail: `expected ${expected}, current ${current}` } }
    }

    // 5) 提交
    const version = current + 1
    const storedTeam = structuredClone(team)
    teams.set(id, { id, name: team.name, version, team: storedTeam })
    const persisted = persist()
    const body = { teamId: id, configVersion: version, persisted }
    if (requestId !== undefined) requests.set(requestId, { hash: JSON.stringify({ team, expectedConfigVersion }), body })
    return { ok: true, status: 200, body }
  }

  function getTeam(id) {
    return teams.get(id) ?? null
  }

  /** 生成用：返回完整团队数据（只读副本）。 */
  function allTeams() {
    return [...teams.values()].map((record) => record.team)
  }

  /** 会话快照的读取面；会话本身还没实现，先返回 not_found。 */
  function getSnapshot() {
    return fail('not_found', 'team session not implemented yet')
  }

  return { listTeams, saveTeam, getTeam, getSnapshot, allTeams }
}