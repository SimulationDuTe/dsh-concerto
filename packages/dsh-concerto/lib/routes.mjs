/**
 * 受管 RPC（§7.7 MVP 子集）+ 两段式的两个动作。
 * 路由只做：信任判定 → 方法判定 → 解析 → 调依赖 → 统一应答。
 */
import { sendJson, sendJsonText, readJsonBody, sameOrigin, STATUS_OF } from './http.mjs'
import { EXCALIDRAW_IMPORT_MAX_BYTES } from './domain/excalidraw_import.mjs'

const TEAM_SNAPSHOT_MAX_BYTES = 256 * 1024

export function registerConcertoRoutes(webServer, base, deps) {
  const { store, probe, generate, reload } = deps

  const disposers = []
  const add = (path, handler) => disposers.push(webServer.register({ kind: 'exact', path, handler }))
  const replyError = (res, status, code, detail) => sendJson(res, status, { code, ...(detail === undefined ? {} : { detail }) })
  const statusForError = (code) => STATUS_OF[code] ?? (code === 'forbidden' ? 403 : (code === 'capability_mismatch' ? 412 : (code === 'stale' ? 409 : (code === 'host_unavailable' ? 503 : 400))))

  function sendTeamSnapshot(res, body) {
    const json = JSON.stringify(body)
    if (Buffer.byteLength(json, 'utf8') > TEAM_SNAPSHOT_MAX_BYTES) {
      return replyError(res, STATUS_OF.precondition_failed, 'precondition_failed', 'Team snapshot exceeds the 256 KiB response limit')
    }
    return sendJsonText(res, 200, json)
  }

  // 配置变更先落盘，再生成供显式重载使用的 Preset。
  add(`${base}/teams`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'GET') {
      const params = new URL(req.url || '/', 'http://localhost').searchParams
      if (params.has('teamId')) {
        const teamId = params.get('teamId').trim()
        if (!teamId) return replyError(res, 400, 'invalid', 'teamId required')
        const record = store.getTeam(teamId)
        if (!record) return replyError(res, 404, 'not_found', 'team not found')
        return sendJson(res, 200, { team: { ...record.team, id: record.id }, configVersion: record.version })
      }
      const teams = typeof deps.listTeamsWithCapabilities === 'function' ? deps.listTeamsWithCapabilities() : store.listTeams()
      return sendJson(res, 200, { teams })
    }
    if (method !== 'POST' && method !== 'DELETE') return replyError(res, 405, 'invalid', 'method not allowed')

    let body
    try {
      body = await readJsonBody(req)
    } catch (err) {
      return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err))
    }

    const result = method === 'DELETE' ? store.deleteTeam(body) : store.saveTeam(body)
    if (!result.ok) return sendJson(res, result.status, result.body)

    if (typeof generate !== 'function') return sendJson(res, result.status, result.body)
    try {
      const gen = await generate()
      const generation = gen.ok ? { generatedHash: gen.hash }
        : { generationError: gen.errors, expectedHash: gen.expectedHash }
      return sendJson(res, result.status, { ...result.body, ...generation })
    } catch (error) {
      return sendJson(res, result.status, {
        ...result.body, generationError: [{ code: 'precondition_failed', detail: error.message }],
      })
    }
  })

  // 接口 2：探测草稿配置及外部连接器握手。
  add(`${base}/connection/check`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')

    let body
    try {
      body = await readJsonBody(req)
    } catch (err) {
      return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err))
    }

    const member = body?.member
    if (!member || typeof member !== 'object') return replyError(res, 400, 'invalid', 'member required')
    if (member.source === 'hosted') {
      const provider = typeof member.provider === 'string' ? member.provider.trim() : ''
      const model = typeof member.model === 'string' ? member.model.trim() : ''
      if (!provider || !model) return sendJson(res, 200, { state: 'unreachable', reason: 'model_config_missing', checked: ['config'] })
      return sendJson(res, 200, await deps.checkHostedConnection({ provider, model }))
    }
    if (member.source === 'api') {
      const baseUrl = typeof member.baseUrl === 'string' ? member.baseUrl.trim() : ''
      const apiKey = typeof member.apiKey === 'string' ? member.apiKey.trim() : ''
      const model = typeof member.model === 'string' ? member.model.trim() : ''
      if (!baseUrl || !model) return sendJson(res, 200, { state: 'unreachable', reason: 'api_config_missing', checked: ['config'] })
      if (typeof deps.checkApiConnection !== 'function') {
        return sendJson(res, 200, { state: 'unknown', reason: 'api_check_unavailable', checked: ['config'] })
      }
      return sendJson(res, 200, await deps.checkApiConnection({ baseUrl, apiKey, model }))
    }
    if (!['external', 'web'].includes(member.source)) return replyError(res, 400, 'invalid', 'unknown member.source')
    const connector = typeof member.connector === 'string' ? member.connector.trim() : ''
    const adapter = deps.connectors.registry.get(connector)
    if (!adapter) {
      return sendJson(res, 200, { state: 'unreachable', reason: 'connector_missing', checked: ['config'] })
    }
    const probe = await adapter.probe({ cwd: deps.connectors.defaultCwd })
    const checked = ['config', 'handshake']
    if (probe.ok) return sendJson(res, 200, { state: 'reachable', checked, version: probe.userAgent })
    const state = probe.code === 'version_mismatch' ? 'versionMismatch' : 'unreachable'
    return sendJson(res, 200, { state, checked, reason: probe.code, detail: probe.detail })
  })

  // 接口 3：按 teamSessionId 获取真实运行快照（替代旧占位实现）
  add(`${base}/snapshot`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')

    const url = new URL(req.url || '/', 'http://localhost')
    const teamSessionId = url.searchParams.get('teamSessionId')
    if (!teamSessionId) return replyError(res, 400, 'invalid', 'teamSessionId required')

    const result = typeof deps.getSnapshot === 'function'
      ? deps.getSnapshot(teamSessionId)
      : store.getSnapshot(teamSessionId)
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

  // 非 Hosted 指挥者（自定义 API / 外部 Agent）指令入口
  add(`${base}/commander/prompt`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.commanderPrompt !== 'function') return replyError(res, 503, 'host_unavailable', 'commander prompt unavailable')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const out = await deps.commanderPrompt(body)
    return out?.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out?.code), out?.code || 'invalid', out?.detail)
  })

  // 自定义 OpenAI 兼容 API 模型列表拉取
  add(`${base}/api/models`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.listApiModels !== 'function') return replyError(res, 503, 'host_unavailable', 'api model listing unavailable')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const out = await deps.listApiModels(body)
    return out?.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out?.code), out?.code || 'invalid', out?.detail)
  })

  // DSH LLM 提供商与模型目录（供团队配置页下拉选择，免手动输入）
  add(`${base}/llm/catalog`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.listLlmCatalog !== 'function') return sendJson(res, 200, { ok: true, available: false, providers: [] })
    return sendJson(res, 200, await deps.listLlmCatalog())
  })

  // Connector：列表 / 探针 / 执行（后端由适配器决定，路由不认具体品牌）
  add(`${base}/connectors`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const url = new URL(req.url || '/', 'http://localhost')
    if (url.searchParams.get('probe') === '1' && typeof deps.connectors.listWithProbe === 'function') {
      return sendJson(res, 200, { connectors: await deps.connectors.listWithProbe() })
    }
    return sendJson(res, 200, { connectors: deps.connectors.registry.list() })
  })

  add(`${base}/connectors/probe`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }

    if (typeof body?.command === 'string' && body.command.trim() && typeof deps.connectors.probeDraft === 'function') {
      const out = await deps.connectors.probeDraft(body)
      return sendJson(res, out.ok ? 200 : (out.code === 'invalid' ? 400 : 503), out)
    }

    const adapter = deps.connectors.registry.get(body?.connector)
    if (!adapter) return replyError(res, 404, 'unsupported_connector', String(body?.connector ?? ''))
    const out = await adapter.probe({ cwd: body?.cwd || deps.connectors.defaultCwd })
    return sendJson(res, out.ok ? 200 : 503, out)
  })

  add(`${base}/connectors/custom`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    const method = (req.method || 'GET').toUpperCase()
    if (method === 'POST') {
      if (typeof deps.connectors.saveCustom !== 'function') return replyError(res, 503, 'host_unavailable', 'custom connectors unavailable')
      let body
      try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
      const out = deps.connectors.saveCustom(body)
      return out.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out.code), out.code, out.detail)
    }
    if (method === 'DELETE') {
      if (typeof deps.connectors.deleteCustom !== 'function') return replyError(res, 503, 'host_unavailable', 'custom connectors unavailable')
      const url = new URL(req.url || '/', 'http://localhost')
      let id = url.searchParams.get('id') || ''
      if (!id) {
        try {
          const body = await readJsonBody(req)
          id = typeof body?.id === 'string' ? body.id : ''
        } catch { /* ignore empty delete body */ }
      }
      const out = deps.connectors.deleteCustom(id)
      return out.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out.code), out.code, out.detail)
    }
    return replyError(res, 405, 'invalid', 'method not allowed')
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

  add(`${base}/tasks/dispatch-review`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.tasks?.dispatchReview !== 'function') return replyError(res, 500, 'invalid', 'dispatchReview unavailable')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const caller = { kind: body?.callerKind === 'ui' ? 'ui' : 'http_api', actorId: 'local-owner' }
    const out = await deps.tasks.dispatchReview(body, caller)
    return sendJson(res, out.ok ? 202 : statusForError(out.code), out)
  })

  add(`${base}/tasks/cancel`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const out = await deps.tasks.cancel(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/tasks/unblock`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.tasks.unblock(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 异构双解赛马（A/B Compare）：临时对单个任务发起双成员并行对比，并一键采纳胜者
  add(`${base}/tasks/race`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    if (typeof deps.tasks?.race !== 'function') return replyError(res, 503, 'host_unavailable', 'task race unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.tasks.race(body)
    return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
  })

  add(`${base}/tasks/race/pick`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    if (typeof deps.tasks?.pickRaceWinner !== 'function') return replyError(res, 503, 'host_unavailable', 'task race pick unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.tasks.pickRaceWinner(body)
    return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
  })

  add(`${base}/tasks/review`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.tasks.review(body)
    return sendJson(res, out.ok ? 200 : (STATUS_OF[out.code] ?? 400), out)
  })

  add(`${base}/tasks/review-feedback`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.tasks.reviewFeedback(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
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
  add(`${base}/runs/halt`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.haltRun(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 团队自主运行时，用户在团队页实时“插话 / 提建议”给指挥者
  add(`${base}/runs/suggest`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.suggestRun !== 'function') return replyError(res, 503, 'host_unavailable', 'run suggestion unavailable')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.suggestRun(body)
    return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
  })

  // 结项交付复盘单（一键复制 / 导出 Markdown 报告）
  add(`${base}/runs/report`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.exportRunReport !== 'function') return replyError(res, 503, 'host_unavailable', 'run report unavailable')
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const sessionId = url.searchParams.get('sessionId') || ''
    const runId = url.searchParams.get('runId') || ''
    const out = await deps.exportRunReport({ sessionId, runId })
    return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
  })

  // 团队记忆 / 经验库（查看、编辑、删除、导出/导入跨项目复用）
  add(`${base}/memory`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.teamMemory?.get !== 'function') return replyError(res, 503, 'host_unavailable', 'team memory unavailable')
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const sessionId = url.searchParams.get('sessionId') || ''
    const out = await deps.teamMemory.get({ sessionId })
    return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
  })

  for (const [sub, fnKey] of [
    ['/memory/skill', 'upsertSkill'],
    ['/memory/skill/delete', 'deleteSkill'],
    ['/memory/experience', 'upsertExperience'],
    ['/memory/experience/delete', 'deleteExperience'],
    ['/memory/import', 'importMemory'],
  ]) {
    add(`${base}${sub}`, async (req, res) => {
      if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
      if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
      if (typeof deps.teamMemory?.[fnKey] !== 'function') return replyError(res, 503, 'host_unavailable', 'team memory unavailable')
      let body
      try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
      const out = await deps.teamMemory[fnKey](body)
      return sendJson(res, out?.ok ? 200 : statusForError(out?.code), out)
    })
  }

  add(`${base}/runs/approve-plan`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = await deps.approveRunPlan(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/runs/dispatch-limits`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let body
    try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    const out = deps.setRunDispatchLimits(body)
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/runs`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const runs = typeof deps.listRuns === 'function' ? deps.listRuns() : (deps.runtime?.listRuns?.() ?? [])
    return sendJson(res, 200, { runs, projects: deps.listProjects?.(runs) ?? [] })
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
    return out.ok ? sendTeamSnapshot(res, out) : sendJson(res, 404, out)
  })

  // 工作区交付文件只读预览（严格限制在当前运行工作区 / Worktree 目录内）
  add(`${base}/files/preview`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.previewFile !== 'function') return replyError(res, 503, 'host_unavailable', 'file preview unavailable')
    let body
    try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
    const out = deps.previewFile(body)
    return out?.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out?.code), out?.code || 'invalid', out?.detail)
  })

  // Git Worktree 成果一键查看 Diff / 合并回主分支 / 清理临时工作树
  for (const [sub, fnName] of [['diff', 'diff'], ['merge', 'merge'], ['cleanup', 'cleanup']]) {
    add(`${base}/worktree/${sub}`, async (req, res) => {
      if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
      if ((req.method || 'GET').toUpperCase() !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
      if (typeof deps.worktree?.[fnName] !== 'function') return replyError(res, 503, 'host_unavailable', 'worktree service unavailable')
      let body
      try { body = await readJsonBody(req) } catch (err) { return replyError(res, 400, 'invalid', String(err && err.message ? err.message : err)) }
      const out = deps.worktree[fnName](body)
      return out?.ok ? sendJson(res, 200, out) : replyError(res, statusForError(out?.code), out?.code || 'invalid', out?.detail)
    })
  }

  // 团队页轻量 SSE 实时事件流（Runtime 写事件毫秒级推送，替代高频轮询）
  add(`${base}/events`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    if (typeof deps.subscribeSessionEvents !== 'function') return replyError(res, 503, 'host_unavailable', 'event stream unavailable')
    const sessionId = new URL(req.url || '/', 'http://localhost').searchParams.get('sessionId') ?? ''
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    })
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, sessionId })}\n\n`)
    const unsubscribe = deps.subscribeSessionEvents(sessionId, (ev) => {
      try {
        res.write(`event: update\ndata: ${JSON.stringify({
          type: ev.type,
          seq: ev.seq,
          taskId: ev.taskId ?? null,
          teamSessionId: ev.teamSessionId ?? null,
          recordedAt: ev.recordedAt ?? null,
        })}\n\n`)
      } catch { /* ignore closed stream */ }
    })
    const heartbeat = setInterval(() => {
      try { res.write(': keepalive\n\n') } catch { /* ignore */ }
    }, 25000)
    heartbeat.unref?.()
    const cleanup = () => {
      clearInterval(heartbeat)
      try { unsubscribe() } catch { /* ignore */ }
    }
    req.on('close', cleanup)
    res.on?.('close', cleanup)
  })

  // Run data is resolved through a real Host session binding, never a supplied team id.
  add(`${base}/status`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'GET') return replyError(res, 405, 'invalid')
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId')
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    return sendTeamSnapshot(res, { ok: true, ...info.snapshot })
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

  add(`${base}/members/duties`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    const method = req.method || 'GET'
    if (method !== 'GET' && method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    let input
    if (method === 'GET') {
      const { searchParams } = new URL(req.url, 'http://localhost')
      input = { sessionId: searchParams.get('sessionId'), memberId: searchParams.get('memberId') }
    } else {
      try { input = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
    }
    const out = deps.memberDutiesRequest(input ?? {}, method === 'POST')
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  add(`${base}/view-objects/import-excalidraw`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if (req.method !== 'POST') return replyError(res, 405, 'invalid', 'method not allowed')
    const { searchParams } = new URL(req.url, 'http://localhost')
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    let scene
    try {
      scene = await readJsonBody(req, EXCALIDRAW_IMPORT_MAX_BYTES)
    } catch {
      return replyError(res, 400, 'invalid', '请选择有效的 .excalidraw 文件（最大 1 MiB）。')
    }
    const out = deps.importExcalidrawBoard(sessionId, searchParams.get('filename'), scene)
    return sendJson(res, out.ok ? 201 : statusForError(out.code), out)
  })

  // 用户共编任务声明的结构化成果（验收清单 / 交付表格 / 图节点与关系）
  for (const sharedPath of [`${base}/view-objects/acceptance-checklist`, `${base}/view-objects/shared-artifact`]) {
    add(sharedPath, async (req, res) => {
      if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
      if (req.method !== 'POST') return replyError(res, 405, 'invalid')
      let body
      try { body = await readJsonBody(req) } catch (error) { return replyError(res, 400, 'invalid', error.message) }
      const out = deps.editAcceptanceChecklist(body)
      return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
    })
  }

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

  // 按需读取结构化产物（含固定版本回溯，供 Review / 验收证据弹窗查看）
  add(`${base}/view-objects/read`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const url = new URL(req.url, 'http://localhost')
    const sessionId = url.searchParams.get('sessionId') ?? ''
    const id = url.searchParams.get('id') ?? ''
    if (!sessionId || !id) return replyError(res, 400, 'invalid', 'sessionId and id required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    if (typeof deps.readViewObject !== 'function') return replyError(res, 500, 'invalid', 'readViewObject unavailable')
    const versionRaw = url.searchParams.get('version')
    const version = versionRaw !== null && versionRaw !== '' ? Number.parseInt(versionRaw, 10) : undefined
    const out = deps.readViewObject(sessionId, { id, ...(version !== undefined ? { version } : {}) })
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 只读查看当前受管会话的可用流程/项目 Skill 索引与四阶段交付/反馈/验收台账
  add(`${base}/skills`, async (req, res) => {
    if (!sameOrigin(req)) return replyError(res, 401, 'unauthorized')
    if ((req.method || 'GET').toUpperCase() !== 'GET') return replyError(res, 405, 'invalid', 'method not allowed')
    const url = new URL(req.url, 'http://localhost')
    const sessionId = url.searchParams.get('sessionId') ?? ''
    if (!sessionId) return replyError(res, 400, 'invalid', 'sessionId required')
    if (typeof deps.sessionInfo !== 'function') return replyError(res, 500, 'invalid', 'sessionInfo unavailable')
    const info = deps.sessionInfo(sessionId)
    if (!info.ok) return replyError(res, 404, 'not_found')
    if (typeof deps.getSkillsInfo !== 'function') return replyError(res, 500, 'invalid', 'getSkillsInfo unavailable')
    const kind = url.searchParams.get('kind') ?? 'all'
    const includeIneligible = url.searchParams.get('includeIneligible') === 'true'
    const out = await deps.getSkillsInfo(sessionId, { kind, includeIneligible })
    return sendJson(res, out.ok ? 200 : statusForError(out.code), out)
  })

  // 白名单只读懒加载静态资源分块（P2/P4：RoughJS；path traversal impossible via exact allowlist）
  const STATIC_ASSETS = new Map([
    ['rough.js', new URL('./vendor/rough.js', import.meta.url)],
    ['focusgroup.js', new URL('./vendor/focusgroup.js', import.meta.url)],
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
