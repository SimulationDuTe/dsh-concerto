/**
 * 受管 RPC（§7.7 MVP 子集）+ 两段式的两个动作。
 * 路由只做：信任判定 → 方法判定 → 解析 → 调依赖 → 统一应答。
 */
import { sendJson, readJsonBody, sameOrigin, STATUS_OF } from './http.mjs'

export function registerConcertoRoutes(webServer, base, deps) {
  const { store, probe, generate, reload } = deps

  const disposers = []
  const add = (path, handler) => disposers.push(webServer.register({ kind: 'exact', path, handler }))
  const replyError = (res, status, code, detail) => sendJson(res, status, { code, ...(detail === undefined ? {} : { detail }) })
  const statusForError = (code) => STATUS_OF[code] ?? (code === 'capability_mismatch' ? 412 : (code === 'stale' ? 409 : (code === 'host_unavailable' ? 503 : 400)))

  // 接口 1：团队列表 / 保存（保存后生成文件，但不安装）
  add(`${base}/teams`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'GET') {
      const teams = typeof deps.listTeamsWithCapabilities === 'function' ? deps.listTeamsWithCapabilities() : store.listTeams()
      return sendJson(res, 200, { teams })
    }
    if (method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')

    let body
    try {
      body = await readJsonBody(req)
    } catch (err) {
      return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err))
    }

    const result = store.saveTeam(body)
    if (!result.ok) return sendJson(res, result.status, result.body)

    // 保存成功即生成文件（无副作用）；安装仍然要等重载
    let generatedHash
    let generationError
    if (typeof generate === 'function') {
      const gen = await generate()
      if (gen.ok) generatedHash = gen.hash
      else generationError = gen.errors
    }

    return sendJson(res, result.status, {
      ...result.body,
      ...(generatedHash === undefined ? {} : { generatedHash }),
      ...(generationError === undefined ? {} : { generationError }),
    })
  })

  // 接口 2：连通性探活（仅配置层）
  add(`${base}/connection/check`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')

    let body
    try {
      body = await readJsonBody(req)
    } catch (err) {
      return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err))
    }

    const member = body && body.member
    if (!member || typeof member !== 'object') return replyError(res, 400, 'invalid', 'member required')
    if (typeof member.source !== 'string') return replyError(res, 400, 'invalid', 'member.source required')

    const needsConnector = member.source === 'external' || member.source === 'web'
    if (needsConnector && (typeof member.connector !== 'string' || member.connector === '')) {
      return sendJson(res, 200, { state: 'unreachable', reason: 'connector_missing', checked: ['config'] })
    }
    return sendJson(res, 200, { state: 'reachable', checked: ['config'], handshake: 'not_implemented' })
  })

  // 接口 3：快照（会话未实现）
  add(`${base}/snapshot`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')

    const url = new URL(req.url || '/', 'http://localhost')
    const teamSessionId = url.searchParams.get('teamSessionId')
    if (!teamSessionId) return replyError(res, 400, 'invalid', 'teamSessionId required')

    const result = store.getSnapshot(teamSessionId)
    if (!result.ok) return sendJson(res, STATUS_OF[result.code] ?? 400, { code: result.code, detail: result.detail })
    return sendJson(res, 200, result)
  })

  // 接口 4：重载（唯一有副作用的动作；固定 spec、不传 approvedBuilds）
  add(`${base}/teams/reload`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof reload !== 'function') return replyError(res, 500, 'invalid', 'reload not wired')

    let body
    try {
      body = await readJsonBody(req)
    } catch (err) {
      return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err))
    }

    const expectedHash = body && body.expectedHash
    if (typeof expectedHash !== 'string' || expectedHash === '') {
      return replyError(res, 400, 'invalid', 'expectedHash required')
    }

    const out = await reload(expectedHash)
    return sendJson(res, out.status, out.body)
  })

  // Connector：列表 / 探针 / 执行（后端由适配器决定，路由不认具体品牌）
  add(`${base}/connectors`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    return sendJson(res, 200, { connectors: deps.connectors.registry.list() })
  })

  add(`${base}/connectors/probe`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }

    const adapter = deps.connectors.registry.get(body?.connector)
    if (!adapter) return replyError(res, 404, 'unsupported_connector', String(body?.connector ?? ''))
    const out = await adapter.probe({ cwd: body?.cwd || deps.connectors.defaultCwd })
    return sendJson(res, out.ok ? 200 : 503, out)
  })

  add(`${base}/connectors/execute`, async (_req, res) => replyError(res, 410, 'precondition_failed', 'Use a managed task dispatch; direct execution is disabled'))

  // 任务派发：把任务交给外部/托管成员异步执行（状态先迁移，执行不占请求事务）
  add(`${base}/tasks/dispatch`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const caller = { kind: body?.callerKind === 'ui' ? 'ui' : 'http_api', actorId: 'local-owner' }
    const out = await deps.tasks.dispatch(body, caller)
    return sendJson(res, out.ok ? 202 : statusForError(out.code), out)
  })

  add(`${base}/tasks/cancel`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const out = await deps.tasks.cancel(body)
    return sendJson(res, out.ok ? 200 : 400, out)
  })

  add(`${base}/tasks/review`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.tasks.review(body)
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  // 开发用：外部 Agent 作为 Commander / 程序化创建 Hosted Agent 的 spike
  add(`${base}/executions/adjudicate`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.tasks.adjudicate(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 本地所有者孤儿/unknown 执行恢复入口：不依赖原指挥者 live session（重启/丢会话仍可达）
  add(`${base}/recovery/unknown`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.recovery?.listUnknown !== 'function') return replyError(res, 500, 'invalid', 'recovery service unavailable')
    return sendJson(res, 200, { runs: deps.recovery.listUnknown() })
  })

  add(`${base}/recovery/reconcile`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.recovery?.reconcile !== 'function') return replyError(res, 500, 'invalid', 'recovery service unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.recovery.reconcile(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/recovery/adjudicate`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.recovery?.adjudicate !== 'function') return replyError(res, 500, 'invalid', 'recovery service unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.recovery.adjudicate(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 团队运行实例与桌面工作区会话启动/定位（§5.1：不让团队会话消失于侧栏外）
  add(`${base}/runs`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const runs = typeof deps.listRuns === 'function' ? deps.listRuns() : (deps.runtime?.listRuns?.() ?? [])
    return sendJson(res, 200, { runs })
  })

  add(`${base}/teams/launch`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.launchTeamSession !== 'function') return replyError(res, 500, 'invalid', 'launchTeamSession unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.launchTeamSession(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/sessions/reveal`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.revealSession !== 'function') return replyError(res, 500, 'invalid', 'revealSession unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.revealSession(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // Explicit development spike, not a product prompt endpoint.
  add(`${base}/host/spawn-spike`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body = {}
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    if (typeof deps.spawnSpike !== 'function') return replyError(res, 500, 'invalid', 'spike unavailable')
    const out = await deps.spawnSpike(body)
    return sendJson(res, out.ok ? 200 : 502, out)
  })

  // 只读：会话 → 团队/角色（dock 组件用）
  add(`${base}/session`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId') ?? ''
    if (sessionId === '') return replyError(res, 400, 'invalid', 'sessionId required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const out = deps.sessionInfo(sessionId)
    return sendJson(res, out.ok ? 200 : 404, out)
  })

  // Run data is resolved through a real Host session binding, never a supplied team id.
  add(`${base}/status`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'GET') return replyError(res, 405, 'invalid')
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId')
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    return sendJson(res, 200, { ok: true, ...info.snapshot })
  })

  // Tool cards read the durable Host result; the obsolete global cache is not a data API.
  add(`${base}/structured`, async (_req, res) => replyError(res, 410, 'precondition_failed', 'Read the toolview result block'))

  add(`${base}/requests/respond`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.tasks.answer(body)
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  // 成员活动流分页查询（§6.1：不把全量塞进 /session 256KB 快照）
  add(`${base}/members/activity`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const url = new URL(req.url, 'http://localhost')
    const sessionId = url.searchParams.get('sessionId') ?? ''
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    if (typeof deps.memberActivity !== 'function') return replyError(res, 500, 'invalid', 'memberActivity unavailable')
    const memberId = url.searchParams.get('memberId') ?? ''
    const beforeRaw = url.searchParams.get('before')
    let before = null
    if (beforeRaw !== null && beforeRaw !== '') {
      before = /^\d+$/.test(beforeRaw) ? Number.parseInt(beforeRaw, 10) : beforeRaw
    }
    const limitRaw = url.searchParams.get('limit')
    const limit = limitRaw !== null && limitRaw !== '' ? Number.parseInt(limitRaw, 10) : 30
    const out = deps.memberActivity(sessionId, { memberId, before, limit })
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  // 用户白板布局层持久化（§4.3：与语义 data 分开保存、分开版本）
  add(`${base}/view-objects/user-layout`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const sessionId = String(body?.sessionId ?? '')
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    if (typeof deps.saveUserLayout !== 'function') return replyError(res, 500, 'invalid', 'saveUserLayout unavailable')
    const out = deps.saveUserLayout(sessionId, body)
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  // 用户个人置顶与查看偏好持久化（与指挥者 publicView 隔离，模型更新不覆盖）
  add(`${base}/view-preferences`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const sessionId = String(body?.sessionId ?? '')
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    if (typeof deps.saveUserViewPreferences !== 'function') return replyError(res, 500, 'invalid', 'saveUserViewPreferences unavailable')
    const out = deps.saveUserViewPreferences(sessionId, body)
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  // 白名单只读懒加载静态资源分块（P2/P4：Markmap / RoughJS；path traversal impossible via exact allowlist）
  const STATIC_ASSETS = new Map([
    ['markmap.js', new URL('./vendor/markmap.js', import.meta.url)],
    ['rough.js', new URL('./vendor/rough.js', import.meta.url)],
  ])
  for (const [assetName, assetUrl] of STATIC_ASSETS.entries()) {
    add(`${base}/assets/${assetName}`, async (req, res) => {
      if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
      if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
      try {
        const { readFile } = await import('node:fs/promises')
        const content = await readFile(assetUrl)
        res.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
          'x-content-type-options': 'nosniff',
        })
        res.end(content)
      } catch (err) {
        return replyError(res, err?.code === 'ENOENT' ? 404 : 500, err?.code === 'ENOENT' ? 'not_found' : 'invalid', err?.message || 'asset unavailable')
      }
    })
  }

  // 只读探针
  if (typeof probe === 'function') {
    add(`${base}/probe`, async (req, res) => {
      if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
      if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
      try {
        return sendJson(res, 200, await probe())
      } catch (err) {
        return sendJson(res, 500, { code: 'invalid', detail: String(err && err.message ? err.message : err) })
      }
    })
  }

  return disposers
}
