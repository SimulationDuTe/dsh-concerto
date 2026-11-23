/**
 * 团队配置、configVersion CAS 和写入回执。
 * 设计：§7.7。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { presetRowFromTeam } from './projection/team_preset.mjs'
import { fail } from './http.mjs'

const reject = (status, code, detail, extra) => ({ ok: false, status, body: { code, detail, ...extra } })
const saved = (body) => ({ ok: true, status: 200, body })

function versionConflict(expected, current) {
  return reject(409, 'conflict', `expected ${expected}, current ${current}`, { currentConfigVersion: current })
}

export function createTeamStore({ maxTeams = 64, statePath = '' } = {}) {
  let state = { teams: new Map(), deletedVersions: new Map(), requests: new Map() }

  if (statePath) {
    try {
      const parsed = JSON.parse(readFileSync(statePath, 'utf8'))
      if (!Array.isArray(parsed.teams)) throw new Error('teams must be an array')
      state = {
        teams: new Map(parsed.teams.map((record) => [record.id, record])),
        deletedVersions: new Map(parsed.deletedVersions ?? []),
        requests: new Map(parsed.requests ?? []),
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Cannot load Concerto team configuration', { cause: error })
    }
  }

  function write(requestId, content, change) {
    if (requestId !== undefined && (typeof requestId !== 'string' || !requestId.trim())) {
      return reject(400, 'invalid', 'requestId must be a non-empty string')
    }
    const hash = requestId === undefined ? null : createHash('sha256').update(JSON.stringify(content)).digest('hex')
    const previous = state.requests.get(requestId)
    if (previous) {
      return previous.hash === hash ? saved({ ...previous.body, replayed: true })
        : reject(409, 'conflict', 'idempotency_conflict')
    }

    const next = {
      teams: new Map(state.teams),
      deletedVersions: new Map(state.deletedVersions),
      requests: new Map(state.requests),
    }
    const result = change(next)
    if (!result.ok) return result
    const body = { ...result.body, persisted: Boolean(statePath) }
    if (requestId !== undefined) next.requests.set(requestId, { hash, body: { ...body } })
    if (statePath) {
      try {
        mkdirSync(dirname(statePath), { recursive: true })
        const tmp = `${statePath}.tmp`
        writeFileSync(tmp, JSON.stringify({
          teams: [...next.teams.values()],
          deletedVersions: [...next.deletedVersions],
          requests: [...next.requests],
        }, null, 2), 'utf8')
        renameSync(tmp, statePath)
      } catch (error) {
        return reject(500, 'precondition_failed', `Cannot persist Concerto team configuration: ${error.message}`)
      }
    }
    state = next
    return saved(body)
  }

  function listTeams() {
    return [...state.teams.values()].map((record) => ({
      id: record.id, name: record.name, configVersion: record.version, memberCount: 1 + record.team.members.length,
    }))
  }

  function saveTeam(input) {
    if (!input || typeof input !== 'object') return reject(400, 'invalid', 'body must be an object')
    const { requestId, team, expectedConfigVersion } = input
    return write(requestId, ['save', team, expectedConfigVersion], (next) => {
      if (expectedConfigVersion !== undefined && (!Number.isSafeInteger(expectedConfigVersion) || expectedConfigVersion < 0)) {
        return reject(400, 'invalid', 'expectedConfigVersion must be a non-negative integer')
      }
      const built = presetRowFromTeam(team)
      if (!built.ok) {
        const detail = built.errors.map((error) => error.detail).filter(Boolean).join(' | ')
        return reject(400, 'invalid', detail || 'invalid team configuration', { details: built.errors })
      }
      const id = built.row.config.id
      const current = next.teams.get(id)?.version ?? 0
      const expected = expectedConfigVersion ?? 0
      if (expected !== current) return versionConflict(expected, current)
      if (current === 0 && next.teams.size >= maxTeams) return reject(400, 'invalid', `at most ${maxTeams} teams`)

      // Reusing a deleted ID must not make a stale form match the new team.
      const version = (current || next.deletedVersions.get(id) || 0) + 1
      const storedTeam = { ...structuredClone(team), id }
      next.teams.set(id, { id, name: team.name, version, team: storedTeam })
      next.deletedVersions.delete(id)
      return saved({ teamId: id, configVersion: version })
    })
  }

  function deleteTeam(input) {
    const { teamId, expectedConfigVersion, requestId } = input ?? {}
    if (typeof teamId !== 'string' || !teamId.trim() || !Number.isSafeInteger(expectedConfigVersion) || expectedConfigVersion < 1) {
      return reject(400, 'invalid', 'teamId and a positive expectedConfigVersion are required')
    }
    return write(requestId, ['delete', teamId, expectedConfigVersion], (next) => {
      const current = next.teams.get(teamId)?.version
      if (current === undefined) return reject(404, 'not_found', `team "${teamId}" not found`)
      if (current !== expectedConfigVersion) return versionConflict(expectedConfigVersion, current)
      next.teams.delete(teamId)
      next.deletedVersions.set(teamId, current)
      return saved({ teamId, deleted: true, configVersion: current })
    })
  }

  function getTeam(id) {
    return state.teams.get(id) ?? null
  }

  /** 供 Preset 生成读取保存的配置。 */
  function allTeams() {
    return [...state.teams.values()].map((record) => record.team)
  }

  function getSnapshot() {
    return fail('not_found', 'team session not implemented yet')
  }

  return { listTeams, saveTeam, deleteTeam, getTeam, getSnapshot, allTeams }
}
