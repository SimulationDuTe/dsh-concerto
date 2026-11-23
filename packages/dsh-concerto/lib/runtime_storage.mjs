import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const DEFAULT_RUNTIME_PATH = join(homedir(), '.concerto', 'runtime.sqlite')

const require = createRequire(import.meta.url)
const APPLICATION_ID = 0x434f4e43
const FACT_KEYS = {
  tasks: 'taskId',
  executions: 'executionId',
  requests: 'requestId',
  decisions: 'id',
  viewObjects: 'id',
}
const SCHEMA = `
  PRAGMA application_id = ${APPLICATION_ID};
  CREATE TABLE runtime_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    revision INTEGER NOT NULL,
    payload TEXT NOT NULL
  ) STRICT;
  CREATE TABLE runtime_runs (
    id TEXT PRIMARY KEY,
    list_order INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    payload TEXT NOT NULL
  ) STRICT;
  CREATE TABLE runtime_facts (
    run_id TEXT NOT NULL REFERENCES runtime_runs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    list_order INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (run_id, kind, id)
  ) STRICT;
`

const isSqlite = (path) => /\.sqlite$/i.test(path)
const legacyPath = (path) => path.replace(/\.sqlite$/i, '.json')

function fileExists(path) {
  try {
    statSync(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

function withDatabase(path, readOnly, work) {
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(path, { readOnly })
  try {
    db.exec('PRAGMA busy_timeout = 2000')
    return work(db)
  } finally {
    db.close()
  }
}

function sqliteInitialized(db) {
  const { application_id: appId } = db.prepare('PRAGMA application_id').get()
  if (appId === APPLICATION_ID) return true
  if (appId === 0 && !db.prepare('SELECT 1 FROM sqlite_schema LIMIT 1').get()) return false
  throw new Error('File is not a Concerto runtime database')
}

function readDatabase(path) {
  return withDatabase(path, true, (db) => {
    db.exec('BEGIN')
    if (!sqliteInitialized(db)) return null
    const { revision, payload } = db.prepare('SELECT revision, payload FROM runtime_state WHERE id = 1').get()
    const snapshot = JSON.parse(payload)
    const runs = new Map(db.prepare('SELECT id, payload FROM runtime_runs ORDER BY list_order').all().map(({ id, payload }) => {
      const run = JSON.parse(payload)
      for (const key of Object.keys(FACT_KEYS)) run[key] = []
      return [id, run]
    }))
    for (const fact of db.prepare('SELECT run_id, kind, payload FROM runtime_facts ORDER BY run_id, kind, list_order').iterate()) {
      runs.get(fact.run_id)[fact.kind].push(JSON.parse(fact.payload))
    }
    return { revision, snapshot: { ...snapshot, sessions: [...runs.values()] } }
  })
}

function writeDatabase(path, expectedRevision, snapshot) {
  mkdirSync(dirname(path), { recursive: true })
  return withDatabase(path, false, (db) => {
    db.exec('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE')
    if (!sqliteInitialized(db)) db.exec(SCHEMA)
    const savedState = db.prepare('SELECT revision, payload FROM runtime_state WHERE id = 1').get()
    const current = savedState?.revision ?? 0
    if (current !== expectedRevision) throw new Error('Runtime database changed since it was opened. Reload Concerto before writing.')

    const { sessions, ...metadata } = snapshot
    const metadataJson = JSON.stringify(metadata)
    let changed = metadataJson !== savedState?.payload
    const stored = new Map(db.prepare('SELECT id, list_order, fingerprint FROM runtime_runs').all().map((row) => [row.id, row]))
    const upsertRun = db.prepare(`
      INSERT INTO runtime_runs VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE
      SET list_order = excluded.list_order, fingerprint = excluded.fingerprint, payload = excluded.payload
    `)
    const deleteFacts = db.prepare('DELETE FROM runtime_facts WHERE run_id = ?')
    const insertFact = db.prepare('INSERT INTO runtime_facts VALUES (?, ?, ?, ?, ?)')
    for (const [index, run] of sessions.entries()) {
      const fingerprint = createHash('sha256').update(JSON.stringify(run)).digest('hex')
      const previous = stored.get(run.sessionId)
      stored.delete(run.sessionId)
      if (previous?.fingerprint === fingerprint && previous.list_order === index) continue

      changed = true
      const data = { ...run }
      for (const key of Object.keys(FACT_KEYS)) delete data[key]
      upsertRun.run(run.sessionId, index, fingerprint, JSON.stringify(data))
      deleteFacts.run(run.sessionId)
      for (const [kind, key] of Object.entries(FACT_KEYS)) {
        for (const [position, fact] of run[kind].entries()) {
          insertFact.run(run.sessionId, kind, fact[key], position, JSON.stringify(fact))
        }
      }
    }
    const deleteRun = db.prepare('DELETE FROM runtime_runs WHERE id = ?')
    for (const id of stored.keys()) deleteRun.run(id)
    if (!changed && stored.size === 0) {
      db.exec('COMMIT')
      return current
    }

    const next = current + 1
    db.prepare(`
      INSERT INTO runtime_state VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, payload = excluded.payload
    `).run(next, metadataJson)
    db.exec('COMMIT')
    return next
  })
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function readRuntimeSnapshot(path) {
  if (!isSqlite(path)) return readJson(path)
  const database = fileExists(path) ? readDatabase(path) : null
  return database ? database.snapshot : readJson(legacyPath(path))
}

export function openRuntimeStorage(path) {
  const sqlite = isSqlite(path)
  let revision = 0
  return {
    load() {
      if (sqlite && fileExists(path)) {
        const database = readDatabase(path)
        if (database) {
          revision = database.revision
          return { snapshot: database.snapshot, needsMigration: false }
        }
      }
      try {
        return { snapshot: readJson(sqlite ? legacyPath(path) : path), needsMigration: sqlite }
      } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
    },
    save(snapshot) {
      if (sqlite) {
        revision = writeDatabase(path, revision, snapshot)
        return
      }
      mkdirSync(dirname(path), { recursive: true })
      const tmp = `${path}.tmp`
      writeFileSync(tmp, JSON.stringify(snapshot, null, 2), 'utf8')
      renameSync(tmp, path)
    },
  }
}
