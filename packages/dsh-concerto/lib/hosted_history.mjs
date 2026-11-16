/**
 * Projection & cursor-stable pagination helpers for DSH Hosted member sessions.
 *
 * Uses supported `dsh-session` contracts ONLY (`ctx.on('session/event', ...)` and
 * `session.deriveMessages()`); never calls deprecated `snapshotEvents()`, `eventAt()`,
 * or `ownEvents()`.
 *
 * Source boundary:
 * - Raw activity log (`ctx.on('session/event', ...)`): append-origin timeline +
 *   tool calls/results + approval/command events + replacement surfaceOps.
 * - Model surface (`session.deriveMessages()`): current LLM context after any
 *   compaction/replacement (`surfaceOp.op === 'replace'`). Backfills only items
 *   missing by canonical host identity (`message.id` / `callId`), never by
 *   array-length subtraction or mutable array indices.
 */

import { createHash } from 'node:crypto'

function parseIsoMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || !value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toIsoTime(ev) {
  if (typeof ev?.recordedAt === 'string' && ev.recordedAt) return ev.recordedAt
  if (typeof ev?.timestamp === 'string' && ev.timestamp) return ev.timestamp
  if (typeof ev?.time === 'number' && Number.isFinite(ev.time)) return new Date(ev.time).toISOString()
  if (typeof ev?.data?.recordedAt === 'string' && ev.data.recordedAt) return ev.data.recordedAt
  return null
}

function extractContentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) {
    return typeof content?.text === 'string' ? content.text : ''
  }
  const parts = []
  for (const block of content) {
    if (!block) continue
    if (typeof block === 'string') {
      parts.push(block)
    } else if ((block.kind === 'text' || block.type === 'text') && typeof block.text === 'string') {
      parts.push(block.text)
    } else if (block.type === 'thinking' && typeof block.thinking === 'string') {
      parts.push('[思考] ' + block.thinking)
    }
  }
  return parts.join('\n').trim()
}

function extractToolBlocks(content) {
  if (!Array.isArray(content)) return []
  const calls = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'tool_use' || block.type === 'tool-call' || block.type === 'toolCall') {
      const name = String(block.name || block.toolName || 'tool')
      const callId = block.id ?? block.callId ?? null
      const args = block.input ?? block.arguments
      const rawArgs = typeof args === 'string'
        ? args
        : (args !== undefined ? JSON.stringify(args, null, 2) : '')
      calls.push({ name, callId, rawArgs })
    }
  }
  return calls
}

function buildTextFields(rawText, maxTextLength) {
  const full = typeof rawText === 'string' ? rawText : ''
  if (!full) return {}
  const truncated = full.length > maxTextLength
  return {
    text: truncated ? full.slice(0, maxTextLength) : full,
    ...(truncated ? { truncated: true, fullLength: full.length } : {}),
  }
}

function padNum(n, width = 12) {
  const v = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0
  return String(v).padStart(width, '0')
}

function digestMessage(role, name, content) {
  const payload = JSON.stringify([String(role || ''), name ?? null, content ?? ''])
  return createHash('sha256').update(payload).digest('base64url').slice(0, 16)
}

function nextOccurrenceKey(occMap, baseKey) {
  if (!occMap) return `${baseKey}:0`
  const n = occMap.get(baseKey) || 0
  occMap.set(baseKey, n + 1)
  return `${baseKey}:${n}`
}

/**
 * Derive one stable canonical identity key shared between live `session/event`
 * and `session.deriveMessages()`, avoiding array indices.
 */
function resolveMessageCanonicalKey(role, msg, occMap, fallbackContent) {
  if (typeof msg?.id === 'string' && msg.id) return `m:${msg.id}`
  if (role === 'tool') {
    const callId = msg?.toolCallId ?? msg?.source?.callId ?? msg?.callId
    if (typeof callId === 'string' && callId) return `tr:${callId}`
  }
  const base = `h:${digestMessage(role, msg?.name, msg?.content ?? msg?.text ?? fallbackContent ?? '')}`
  return nextOccurrenceKey(occMap, base)
}

function canonicalActivityId(sid, canonicalKey) {
  const safeKey = String(canonicalKey).replace(/[^A-Za-z0-9_-]+/g, '-')
  return `dsh-${sid}-${safeKey}`
}

export function encodeActivityCursor(ts, tieId) {
  const safeTs = Number.isFinite(ts) ? Math.trunc(ts) : 0
  const encoded = Buffer.from(String(tieId ?? ''), 'utf8').toString('base64url')
  return `cur:${safeTs}:${encoded}`
}

export function decodeActivityCursor(cursor) {
  if (Number.isInteger(cursor) && cursor > 0) {
    return { kind: 'legacySeq', seq: cursor }
  }
  if (typeof cursor !== 'string' || !cursor) return null
  if (/^\d+$/.test(cursor)) {
    const parsed = Number.parseInt(cursor, 10)
    return parsed > 0 ? { kind: 'legacySeq', seq: parsed } : null
  }
  if (!cursor.startsWith('cur:')) return null
  const firstSep = 3
  const secondSep = cursor.indexOf(':', firstSep + 1)
  if (secondSep <= firstSep + 1) return null
  const tsStr = cursor.slice(firstSep + 1, secondSep)
  const b64 = cursor.slice(secondSep + 1)
  if (!/^-?\d+$/.test(tsStr) || !/^[A-Za-z0-9_-]+$/.test(b64)) return null
  const ts = Number.parseInt(tsStr, 10)
  if (!Number.isSafeInteger(ts)) return null
  const tieId = Buffer.from(b64, 'base64url').toString('utf8')
  if (!tieId) return null
  return { kind: 'composite', ts, tieId }
}

/**
 * Normalize a single live `dsh-session` event (`ctx.on('session/event', ...)`).
 * Attaches internal `_canonicalKey` so callers can align cleanly with `deriveMessages()`.
 */
export function normalizeHostedSessionEvent(
  ev,
  {
    memberId,
    taskId = null,
    executionId = null,
    hostSessionId = '',
    maxTextLength = 4000,
    fallbackSeq = 0,
    occMap = null,
    presetKeys = null,
  } = {},
) {
  if (!ev || typeof ev.type !== 'string') return { items: [], keys: [] }
  const sid = String(hostSessionId || 'hosted')
  const seqNum = Number.isInteger(ev.seq) && ev.seq >= 0 ? ev.seq : fallbackSeq
  const recordedAt = toIsoTime(ev)
  const sortTs = parseIsoMs(recordedAt)
  const tiePrefix = `1:${sid}:${padNum(seqNum, 12)}`
  const data = ev.data || {}
  const surfaceOp = ev.surfaceOp ?? null
  const items = []
  const keys = []
  let subIdx = 0

  const pushItem = (canonicalKey, fields) => {
    const k = Array.isArray(presetKeys) && presetKeys[keys.length] ? presetKeys[keys.length] : canonicalKey
    keys.push(k)
    items.push({
      activityId: canonicalActivityId(sid, k),
      memberId: String(memberId),
      taskId,
      executionId,
      hostSessionId: sid,
      source: 'dsh_session',
      recordedAt,
      sortTs,
      tieId: `${tiePrefix}:${padNum(subIdx, 4)}`,
      _canonicalKey: k,
      ...fields,
    })
    subIdx += 1
  }

  if (ev.type === 'user/message' || ev.type === 'assistant/message' || ev.type === 'system/message' || ev.type === 'developer/message') {
    const msg = data.message || data
    const content = msg.content ?? data.text ?? ''
    const text = extractContentText(content)
    const defaultRole = ev.type === 'user/message'
      ? 'user'
      : (ev.type === 'system/message' ? 'system' : (ev.type === 'developer/message' ? 'developer' : 'assistant'))
    const role = msg.role || defaultRole
    const msgKey = resolveMessageCanonicalKey(role, msg, occMap, content)
    const isReplacement = Boolean(surfaceOp && surfaceOp !== 'append')

    if (text) {
      const baseLabel = role === 'user' ? '用户输入' : (role === 'assistant' ? '模型输出' : `宿主消息(${role})`)
      const label = isReplacement ? `${baseLabel}(替换)` : baseLabel
      pushItem(msgKey, {
        kind: 'message',
        role,
        summary: `${label}：${text.slice(0, 100)}`,
        ...buildTextFields(text, maxTextLength),
        ...(surfaceOp ? { detail: { type: ev.type, surfaceOp } } : {}),
      })
    }
    if (role === 'assistant') {
      const toolBlocks = extractToolBlocks(content)
      for (let tIdx = 0; tIdx < toolBlocks.length; tIdx += 1) {
        const tb = toolBlocks[tIdx]
        const toolKey = tb.callId ? `tc:${tb.callId}` : nextOccurrenceKey(occMap, `tcb:${msgKey}`)
        pushItem(toolKey, {
          kind: 'tool',
          summary: `调用工具 ${tb.name}`,
          ...buildTextFields(tb.rawArgs, maxTextLength),
          detail: { type: ev.type, callId: tb.callId, name: tb.name, ...(surfaceOp ? { surfaceOp } : {}) },
        })
      }
    }
  } else if (ev.type === 'tool/call') {
    const toolName = String(data.name || data.toolName || 'tool')
    const callId = data.callId ?? data.id ?? null
    const toolKey = callId ? `tc:${callId}` : `ev:${seqNum}`
    const rawArgs = typeof data.arguments === 'string'
      ? data.arguments
      : (data.arguments !== undefined ? JSON.stringify(data.arguments, null, 2) : '')
    pushItem(toolKey, {
      kind: 'tool',
      summary: `调用工具 ${toolName}`,
      ...buildTextFields(rawArgs, maxTextLength),
      detail: { type: ev.type, callId, name: toolName },
    })
  } else if (ev.type === 'tool/result') {
    const msg = data.message || data
    const toolName = String(msg.name || data.name || msg.toolCallId || data.callId || 'tool')
    const text = extractContentText(msg.content ?? data.content ?? '')
    const callId = msg.toolCallId ?? msg.source?.callId ?? data.callId ?? null
    const isError = msg.isError === true || data.error !== undefined
    const resKey = typeof msg?.id === 'string' && msg.id
      ? `m:${msg.id}`
      : (callId ? `tr:${callId}` : resolveMessageCanonicalKey('tool', msg, occMap, text))
    pushItem(resKey, {
      kind: 'tool',
      summary: `${isError ? '工具失败' : '工具结果'} ${toolName}`,
      ...buildTextFields(text, maxTextLength),
      detail: {
        type: ev.type,
        callId,
        name: toolName,
        ...(isError ? { isError: true } : {}),
        ...(surfaceOp ? { surfaceOp } : {}),
      },
    })
  } else if (ev.type === 'approval/asked' || ev.type === 'approval/decided' || ev.type === 'command/run' || ev.type === 'command/done') {
    pushItem(`ev:${seqNum}`, {
      kind: ev.type.startsWith('approval/') ? 'request' : 'tool',
      summary: `宿主事件 ${ev.type}`,
      detail: structuredClone(data),
    })
  }

  return { items, keys }
}

/**
 * In-memory listener store fed by `ctx.on('session/event', ...)`.
 *
 * Keeps raw immutable event payloads bounded (`maxEventsPerSession`, default 2000)
 * while retaining compact canonical `(key -> { activityId, sortTs, tieId, recordedAt })`
 * anchors so messages falling back to `deriveMessages()` past the 2000-event window
 * preserve the EXACT same identity and cursor.
 */
export function createHostedSessionEventLog({ maxEventsPerSession = 2000, maxAnchorsPerSession = 50000 } = {}) {
  const bySession = new Map()

  function ensureEntry(sid) {
    let entry = bySession.get(sid)
    if (!entry) {
      entry = {
        events: [],
        seenSeqs: new Set(),
        maxEvictedSeq: -1,
        occMap: new Map(),
        anchors: new Map(),
        derivedSlotSeq: 0,
      }
      bySession.set(sid, entry)
    }
    return entry
  }

  function rememberAnchor(entry, key, anchor) {
    if (!key) return
    if (entry.anchors.has(key)) return
    entry.anchors.set(key, anchor)
    while (entry.anchors.size > maxAnchorsPerSession) {
      const oldestKey = entry.anchors.keys().next().value
      entry.anchors.delete(oldestKey)
    }
  }

  function record(hostSessionId, event) {
    if (!hostSessionId || !event || typeof event.type !== 'string') return false
    const sid = String(hostSessionId)
    const entry = ensureEntry(sid)
    const isIntSeq = Number.isInteger(event.seq)
    if (isIntSeq && event.seq <= entry.maxEvictedSeq) return false
    const seqKey = isIntSeq ? event.seq : `idx:${entry.events.length}:${event.type}`
    if (entry.seenSeqs.has(seqKey)) return false
    entry.seenSeqs.add(seqKey)

    const { items, keys } = normalizeHostedSessionEvent(event, {
      memberId: '',
      hostSessionId: sid,
      fallbackSeq: entry.events.length,
      occMap: entry.occMap,
    })
    for (const item of items) {
      rememberAnchor(entry, item._canonicalKey, {
        activityId: item.activityId,
        sortTs: item.sortTs,
        tieId: item.tieId,
        recordedAt: item.recordedAt,
      })
    }

    entry.events.push({ event: structuredClone(event), keys })
    while (entry.events.length > maxEventsPerSession) {
      const removed = entry.events.shift()
      if (removed && Number.isInteger(removed.event?.seq)) {
        entry.seenSeqs.delete(removed.event.seq)
        if (removed.event.seq > entry.maxEvictedSeq) entry.maxEvictedSeq = removed.event.seq
      }
    }
    return true
  }

  function getRecords(hostSessionId) {
    if (!hostSessionId) return []
    return bySession.get(String(hostSessionId))?.events || []
  }

  function getEvents(hostSessionId) {
    return getRecords(hostSessionId).map((r) => r.event)
  }

  function resolveDerivedAnchor(hostSessionId, key, activityId, baseAnchorMs = 0) {
    const sid = String(hostSessionId || 'hosted')
    const entry = ensureEntry(sid)
    const existing = entry.anchors.get(key)
    if (existing) return existing
    const slot = entry.derivedSlotSeq
    entry.derivedSlotSeq += 1
    const sortTs = baseAnchorMs > 0 ? baseAnchorMs + slot : slot
    const created = {
      activityId,
      sortTs,
      tieId: `2:${sid}:${key}`,
      recordedAt: null,
    }
    rememberAnchor(entry, key, created)
    return created
  }

  function clear() {
    bySession.clear()
  }

  return { record, getRecords, getEvents, resolveDerivedAnchor, clear }
}

/**
 * Project items from supported `hostSession.deriveMessages()` (current model surface).
 * Uses canonical keys (`message.id` / `callId` / digest) instead of array indices, and
 * skips any key already represented in `skipKeys` so replaced/compacted items never duplicate.
 */
export function projectDerivedMessages(
  hostSession,
  {
    memberId,
    taskId = null,
    executionId = null,
    hostSessionId = '',
    maxTextLength = 4000,
    anchorMs = 0,
    skipKeys = null,
    eventLog = null,
  } = {},
) {
  if (!hostSession || typeof hostSession.deriveMessages !== 'function') {
    return { supported: false, items: [] }
  }
  const sid = String(hostSessionId || hostSession.id || 'hosted')
  const messages = hostSession.deriveMessages() || []
  const items = []
  const occMap = new Map()

  const emit = (canonicalKey, baseFields, fallbackIdx) => {
    if (skipKeys && skipKeys.has(canonicalKey)) return
    const actId = canonicalActivityId(sid, canonicalKey)
    const anchor = eventLog
      ? eventLog.resolveDerivedAnchor(sid, canonicalKey, actId, anchorMs)
      : {
          activityId: actId,
          sortTs: anchorMs > 0 ? anchorMs + fallbackIdx : fallbackIdx,
          tieId: `2:${sid}:${canonicalKey}`,
          recordedAt: null,
        }
    items.push({
      activityId: anchor.activityId,
      memberId: String(memberId),
      taskId,
      executionId,
      hostSessionId: sid,
      source: 'dsh_derived',
      recordedAt: anchor.recordedAt,
      sortTs: anchor.sortTs,
      tieId: anchor.tieId,
      _canonicalKey: canonicalKey,
      ...baseFields,
    })
  }

  for (let idx = 0; idx < messages.length; idx += 1) {
    const msg = messages[idx]
    if (!msg) continue
    const role = String(msg.role || 'assistant')

    if (role === 'tool') {
      const toolName = String(msg.name || msg.toolName || msg.toolCallId || 'tool')
      const text = extractContentText(msg.content ?? msg.text ?? '')
      const callId = msg.toolCallId ?? msg.source?.callId ?? msg.callId ?? null
      const resKey = resolveMessageCanonicalKey('tool', msg, occMap, text)
      emit(resKey, {
        kind: 'tool',
        summary: `${msg.isError ? '工具失败' : '工具结果'} ${toolName}`,
        ...buildTextFields(text, maxTextLength),
        detail: { type: 'derived:tool', callId, name: toolName, ...(msg.isError ? { isError: true } : {}) },
      }, idx)
      continue
    }

    const content = msg.content ?? msg.text ?? ''
    const msgKey = resolveMessageCanonicalKey(role, msg, occMap, content)
    const text = extractContentText(content)
    if (text && (role === 'user' || role === 'assistant' || role === 'system' || role === 'developer')) {
      const label = role === 'user' ? '用户输入' : (role === 'assistant' ? '模型输出' : `宿主消息(${role})`)
      emit(msgKey, {
        kind: 'message',
        role,
        summary: `${label}：${text.slice(0, 100)}`,
        ...buildTextFields(text, maxTextLength),
      }, idx)
    }

    if (role === 'assistant') {
      const toolBlocks = extractToolBlocks(content)
      for (let tIdx = 0; tIdx < toolBlocks.length; tIdx += 1) {
        const tb = toolBlocks[tIdx]
        const toolKey = tb.callId ? `tc:${tb.callId}` : nextOccurrenceKey(occMap, `tcb:${msgKey}`)
        emit(toolKey, {
          kind: 'tool',
          summary: `调用工具 ${tb.name}`,
          ...buildTextFields(tb.rawArgs, maxTextLength),
          detail: { type: 'derived:tool_use', callId: tb.callId, name: tb.name },
        }, idx)
      }
    }
  }

  return { supported: true, items }
}

/**
 * Combine live raw `session/event` activity log with `session.deriveMessages()` backfill,
 * aligned strictly by canonical host identity (`message.id` / `callId`) with zero length heuristics.
 */
export function projectHostedSessionActivities(
  hostSession,
  {
    memberId,
    taskId = null,
    executionId = null,
    hostSessionId = '',
    maxTextLength = 4000,
    liveEvents = null,
    eventLog = null,
    anchorMs = 0,
  } = {},
) {
  const sid = String(hostSessionId || hostSession?.id || 'hosted')
  const hasDeriveMessages = Boolean(hostSession && typeof hostSession.deriveMessages === 'function')
  const records = eventLog
    ? eventLog.getRecords(sid)
    : (Array.isArray(liveEvents) ? liveEvents.map((ev) => ({ event: ev, keys: null })) : [])
  const hasLiveEvents = records.length > 0
  if (!hasDeriveMessages && !hasLiveEvents) {
    return {
      supported: false,
      items: [],
      sources: { dshSessionEvents: false, dshDerivedMessages: false },
    }
  }

  const liveItems = []
  const liveKeys = new Set()
  const occMap = new Map()
  for (let idx = 0; idx < records.length; idx += 1) {
    const rec = records[idx]
    const out = normalizeHostedSessionEvent(rec.event, {
      memberId,
      taskId,
      executionId,
      hostSessionId: sid,
      maxTextLength,
      fallbackSeq: idx,
      occMap,
      presetKeys: rec.keys,
    })
    for (const item of out.items) {
      if (liveKeys.has(item._canonicalKey)) continue
      liveKeys.add(item._canonicalKey)
      liveItems.push(item)
    }
  }

  let derivedItems = []
  if (hasDeriveMessages) {
    const derived = projectDerivedMessages(hostSession, {
      memberId,
      taskId,
      executionId,
      hostSessionId: sid,
      maxTextLength,
      anchorMs,
      skipKeys: liveKeys,
      eventLog,
    })
    derivedItems = derived.items
  }

  const clean = (item) => {
    const copy = { ...item }
    delete copy._canonicalKey
    return copy
  }

  return {
    supported: true,
    items: [...derivedItems.map(clean), ...liveItems.map(clean)],
    sources: {
      dshSessionEvents: liveItems.length > 0,
      dshDerivedMessages: derivedItems.length > 0,
    },
  }
}

function compareEntries(a, b) {
  if (a.ts !== b.ts) return a.ts - b.ts
  if (a.tieId !== b.tieId) return a.tieId < b.tieId ? -1 : 1
  return 0
}

/**
 * Merge Runtime activities + Hosted session activities cleanly and paginate
 * using an immutable composite cursor `(sortTs, stableSourceTieId)`.
 */
export function mergeAndPaginateActivities(runtimeItems, hostedItems, { memberId = null, before = null, limit = 30 } = {}) {
  const clampedLimit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : Number.parseInt(limit, 10) || 30))
  const byId = new Map()

  for (let idx = 0; idx < (hostedItems || []).length; idx += 1) {
    const item = hostedItems[idx]
    if (!item) continue
    const ts = Number.isFinite(item.sortTs) ? Math.trunc(item.sortTs) : parseIsoMs(item.recordedAt)
    const tieId = typeof item.tieId === 'string' && item.tieId
      ? item.tieId
      : `1:${String(item.activityId || item.hostSessionId || idx)}`
    const key = String(item.activityId || tieId)
    if (!byId.has(key)) byId.set(key, { item, ts, tieId })
  }

  for (let idx = 0; idx < (runtimeItems || []).length; idx += 1) {
    const item = runtimeItems[idx]
    if (!item) continue
    const ts = parseIsoMs(item.recordedAt)
    const seqPart = Number.isSafeInteger(item.seq) ? padNum(item.seq, 12) : `raw-${String(item.activityId || idx)}`
    const tieId = `0:${seqPart}`
    const key = String(item.activityId || tieId)
    if (!byId.has(key)) byId.set(key, { item, ts, tieId })
  }

  const sorted = [...byId.values()].sort(compareEntries)
  const decoded = decodeActivityCursor(before)

  let filtered = sorted
  if (decoded?.kind === 'composite') {
    filtered = sorted.filter((entry) => entry.ts < decoded.ts || (entry.ts === decoded.ts && entry.tieId < decoded.tieId))
  } else if (decoded?.kind === 'legacySeq') {
    const targetEntry = sorted.find((entry) => Number.isInteger(entry.item.seq) && entry.item.seq === decoded.seq)
    if (targetEntry) {
      filtered = sorted.filter((entry) => entry.ts < targetEntry.ts || (entry.ts === targetEntry.ts && entry.tieId < targetEntry.tieId))
    } else {
      filtered = sorted.filter((entry) => Number.isInteger(entry.item.seq) && entry.item.seq < decoded.seq)
    }
  }

  const start = Math.max(0, filtered.length - clampedLimit)
  const sliced = filtered.slice(start)
  const items = sliced.map((entry) => {
    const clone = structuredClone(entry.item)
    delete clone.sortTs
    delete clone.tieId
    clone.cursor = encodeActivityCursor(entry.ts, entry.tieId)
    return clone
  })

  return {
    ok: true,
    memberId: memberId || null,
    items,
    hasMore: start > 0,
    nextBefore: items.length > 0 ? items[0].cursor : null,
    total: sorted.length,
  }
}
