/**
 * Concerto Host 插件入口。
 * 职责：声明服务依赖、建存储、生成 teams bundle、挂路由。
 * 业务规则在 domain/ 与 projection/。
 */
import z from '@deepseek-ai/schemastery'
import os from 'node:os'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync, realpathSync } from 'node:fs'
import { createTeamStore } from './team_store.mjs'
import { createTeamRuntime } from './team_runtime.mjs'
import { registerConcertoTools, COMMANDER_TOOL_SCHEMAS, executeMemberToolCall } from './tools.mjs'
import { buildMemberSystemPrompt } from './domain/runtime_skills.mjs'
import { checkApiEndpoint, runApiCommanderTurn, runExternalCommanderTurn } from './connector/commander-runner.mjs'
import { DEFAULT_RUNTIME_PATH } from './runtime_storage.mjs'
import { buildTeamBundleFiles, hashFiles, readTeamBundleFiles, writeTeamBundle } from './team_bundle.mjs'
import { registerConcertoRoutes } from './routes.mjs'
import { createConnectorRegistry } from './connector/registry.mjs'
import { createCodexAdapter } from './connector/codex-adapter.mjs'
import { createAcpAdapter } from './connector/acp-adapter.mjs'
import { createClaudeAdapter } from './connector/claude-adapter.mjs'
import { createWebAdapter } from './connector/web-adapter.mjs'
import { createCustomConnectorStore, validateCustomConnectorInput, buildCustomConnectorAdapter } from './connector/custom-store.mjs'
import { createTaskRunner } from './runner.mjs'
import {
  createGitWorktree,
  createGitWorktreeWithHost,
  inspectGitWorkspace,
  inspectGitWorktreeDiff,
  mergeGitWorktree,
  removeGitWorktree,
  scopesOverlap,
} from './workspace_scope.mjs'
import { expectedCapabilitiesForMember } from './projection/team_preset.mjs'
import {
  createHostedSessionEventLog,
  projectHostedSessionActivities,
  mergeAndPaginateActivities,
} from './hosted_history.mjs'

export const name = 'dsh-concerto'

/** 未声明的服务在 apply 里读取会直接抛错（Cordis 行为） */
export const inject = {
  required: ['webServer', 'pluginManager', 'tools', 'agentPresets', 'agents', 'sessions', 'sessionController'],
  optional: ['llm', 'workspaceRegistry', 'userQuestions'],
}

/** 机器无关的默认生成目录：~/.concerto/teams */
const DEFAULT_TEAMS_DIR = join(os.homedir(), '.concerto', 'teams')

export const Config = z.object({
  apiBase: z.string().default('/concerto'),
  maxTeams: z.number().step(1).min(1).max(256).default(64),
  // 默认值由代码算出（机器无关），不是漏填的占位；设置页会直接显示这个路径
  teamsBundleDir: z.string().default(DEFAULT_TEAMS_DIR),
  // Team/Profile 级 Review 下限；Commander 只能上调（§7.0）
  policyRequiresReview: z.boolean().default(false),
  // 团队配置的持久化文件（跨重启保留）；默认在用户目录
  statePath: z.string().default(join(os.homedir(), '.concerto', 'teams.json')),
  // 运行态默认使用 SQLite；已有的显式 JSON 路径继续可读写。
  runtimePath: z.string().default(DEFAULT_RUNTIME_PATH),
  // Antigravity CLI (`agy`) 可执行文件；留空则自动探测
  antigravityBin: z.string().default(''),
  // Claude Code CLI (`claude`) 可执行文件；留空则自动探测
  claudeBin: z.string().default(''),
  // Codex 可执行文件；留空则自动探测（Codex 安装目录 → PATH）
  codexBin: z.string().default(''),
  // Gemini CLI (`gemini`) 可执行文件；留空则自动探测
  geminiBin: z.string().default(''),
  // OpenCode (`opencode`) 可执行文件；留空则自动探测
  opencodeBin: z.string().default(''),
  // Opt in to a Codex Plan turn before execution with a configured native model.
  codexPlanModel: z.string().default(''),
  // 外部执行的默认工作目录；留空则要求调用方显式传入
  codexCwd: z.string().default(''),
  hostedTimeoutMs: z.number().min(1000).default(180000),
})

export function apply(ctx, config) {
  const rawBase = typeof config?.apiBase === 'string' ? config.apiBase : '/concerto'
  const base = rawBase.startsWith('/') ? rawBase.replace(/\/+$/, '') : `/${rawBase}`
  const maxTeams = Number.isInteger(config?.maxTeams) ? config.maxTeams : 64
  const configuredDir = typeof config?.teamsBundleDir === 'string' ? config.teamsBundleDir.trim() : ''
  const teamsBundleDir = configuredDir === '' ? DEFAULT_TEAMS_DIR : configuredDir

  const store = createTeamStore({
    maxTeams,
    statePath: typeof config?.statePath === 'string' ? config.statePath : '',
  })
  const runtime = createTeamRuntime({
    policyRequiresReview: config?.policyRequiresReview === true,
    statePath: typeof config?.runtimePath === 'string' ? config.runtimePath : '',
  })

  const antigravityBin = typeof config?.antigravityBin === 'string' ? config.antigravityBin : ''
  const claudeBin = typeof config?.claudeBin === 'string' ? config.claudeBin : ''
  const codexBin = typeof config?.codexBin === 'string' ? config.codexBin : ''
  const geminiBin = typeof config?.geminiBin === 'string' ? config.geminiBin : ''
  const opencodeBin = typeof config?.opencodeBin === 'string' ? config.opencodeBin : ''
  const defaultCwd = typeof config?.codexCwd === 'string' ? config.codexCwd : ''

  /** Connector 注册表：Runtime 只按 id 取适配器，不认具体后端。 */
  const connectorRegistry = createConnectorRegistry()
  connectorRegistry.register(createAcpAdapter({
    id: 'antigravity',
    displayName: 'Antigravity (agy)',
    bin: antigravityBin,
    binNames: ['agy', 'antigravity'],
    args: ['acp'],
    defaultCwd,
    description: 'Google Antigravity CLI（ACP 协议 + Concerto MCP 工具桥接）',
  }))
  connectorRegistry.register(createClaudeAdapter({ bin: claudeBin, defaultCwd }))
  connectorRegistry.register(createCodexAdapter({ bin: codexBin, defaultCwd, planModel: config?.codexPlanModel?.trim() ?? '' }))
  connectorRegistry.register(createAcpAdapter({
    id: 'gemini',
    displayName: 'Gemini CLI',
    bin: geminiBin,
    binNames: ['gemini'],
    args: ['--experimental-acp'],
    defaultCwd,
    description: 'Gemini CLI（ACP 协议 + Concerto MCP 工具桥接）',
  }))
  connectorRegistry.register(createAcpAdapter({
    id: 'opencode',
    displayName: 'OpenCode',
    bin: opencodeBin,
    binNames: ['opencode'],
    args: ['acp'],
    defaultCwd,
    description: 'OpenCode（ACP 协议 + Concerto MCP 工具桥接）',
  }))
  connectorRegistry.register(createWebAdapter({
    id: 'web-chatgpt',
    displayName: 'ChatGPT 网页端',
    url: 'https://chatgpt.com',
  }))
  connectorRegistry.register(createWebAdapter({
    id: 'web-claude',
    displayName: 'Claude 网页端',
    url: 'https://claude.ai',
  }))
  connectorRegistry.register(createWebAdapter({
    id: 'web-gemini',
    displayName: 'Gemini 网页端',
    url: 'https://gemini.google.com',
  }))

  const builtinConnectorIds = new Set(connectorRegistry.list().map((c) => c.id))
  const statePathStr = typeof config?.statePath === 'string' ? config.statePath.trim() : ''
  const customConnectorStore = createCustomConnectorStore({
    filePath: statePathStr ? join(dirname(statePathStr), 'connectors.json') : '',
  })
  for (const record of customConnectorStore.list()) {
    if (builtinConnectorIds.has(record.id)) continue
    try {
      connectorRegistry.upsert(buildCustomConnectorAdapter(record, { defaultCwd }))
    } catch (error) {
      ctx.logger?.warn?.(`Skip invalid custom connector "${record.id}": ${error?.message || error}`)
    }
  }

  const saveCustomConnector = (input) => {
    const checked = validateCustomConnectorInput(input, builtinConnectorIds)
    if (!checked.ok) return checked
    try {
      const saved = customConnectorStore.upsert(checked.record)
      connectorRegistry.upsert(buildCustomConnectorAdapter(saved, { defaultCwd }))
      return {
        ok: true,
        connector: connectorRegistry.list().find((c) => c.id === saved.id) ?? saved,
        connectors: connectorRegistry.list(),
      }
    } catch (error) {
      return { ok: false, code: 'invalid', detail: String(error?.message || error) }
    }
  }

  const deleteCustomConnector = (id) => {
    const key = typeof id === 'string' ? id.trim() : ''
    if (!key) return { ok: false, code: 'invalid', detail: 'connector id required' }
    if (builtinConnectorIds.has(key)) {
      return { ok: false, code: 'forbidden', detail: '内置连接器不可删除' }
    }
    const removed = customConnectorStore.remove(key)
    connectorRegistry.unregister(key)
    if (!removed) return { ok: false, code: 'not_found', detail: `未找到自定义连接器 "${key}"` }
    return { ok: true, id: key, connectors: connectorRegistry.list() }
  }

  const connectorProbeCache = new Map()
  const listConnectorsWithProbe = async () => {
    const now = Date.now()
    const items = connectorRegistry.list()
    return await Promise.all(items.map(async (item) => {
      const cached = connectorProbeCache.get(item.id)
      if (cached && now - cached.at < 15000) {
        return { ...item, probe: cached.probe }
      }
      const adapter = connectorRegistry.get(item.id)
      if (!adapter || typeof adapter.probe !== 'function') {
        return { ...item, probe: { ok: false, code: 'unavailable' } }
      }
      let timer
      try {
        const probe = await Promise.race([
          adapter.probe({ cwd: defaultCwd }),
          new Promise((resolve) => { timer = setTimeout(() => resolve({ ok: false, code: 'timeout', detail: 'probe timeout' }), 3500) }),
        ])
        connectorProbeCache.set(item.id, { at: Date.now(), probe })
        return { ...item, probe }
      } catch (error) {
        const probe = { ok: false, code: 'error', detail: String(error?.message || error) }
        connectorProbeCache.set(item.id, { at: Date.now(), probe })
        return { ...item, probe }
      } finally {
        clearTimeout(timer)
      }
    }))
  }

  const probeCustomConnectorDraft = async (input) => {
    const checked = validateCustomConnectorInput({
      displayName: input?.displayName || '测试连接器',
      mode: input?.mode || 'acp',
      command: input?.command || '',
      id: 'draft-probe',
    }, new Set())
    if (!checked.ok) return checked
    try {
      const adapter = buildCustomConnectorAdapter(checked.record, { defaultCwd })
      return await adapter.probe({ cwd: input?.cwd || defaultCwd })
    } catch (error) {
      return { ok: false, code: 'invalid', detail: String(error?.message || error) }
    }
  }

  const safeGet = (serviceName) => {
    try { return ctx.get(serviceName) } catch { return undefined }
  }
  async function checkHostedConnection({ provider, model }) {
    const llm = safeGet('llm')
    if (typeof llm?.listProviders !== 'function' || typeof llm.listModels !== 'function') {
      return { state: 'unknown', reason: 'host_catalog_unavailable', checked: ['config'] }
    }
    let deadline
    try {
      if (!llm.listProviders().some((entry) => entry.id === provider)) {
        return { state: 'unreachable', reason: 'provider_missing', checked: ['config', 'provider'] }
      }
      const models = await Promise.race([
        llm.listModels(provider),
        new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('模型目录检测超时')), 5000) }),
      ])
      const checked = ['config', 'provider', 'model']
      return models.some((entry) => entry.id === model)
        ? { state: 'configured', checked }
        : { state: 'unreachable', reason: 'model_missing', checked }
    } catch (error) {
      return { state: 'unknown', reason: 'host_catalog_unavailable', checked: ['config'], detail: error.message }
    } finally {
      clearTimeout(deadline)
    }
  }
  async function listLlmCatalog() {
    const llm = safeGet('llm')
    if (typeof llm?.listProviders !== 'function') {
      return { ok: true, available: false, providers: [] }
    }
    try {
      const rawProviders = await Promise.resolve(llm.listProviders())
      const list = Array.isArray(rawProviders) ? rawProviders : []
      const providers = await Promise.all(list.map(async (p) => {
        const id = typeof p?.id === 'string' ? p.id : String(p || '')
        const name = typeof p?.name === 'string' && p.name.trim() ? p.name.trim() : id
        if (!id || typeof llm.listModels !== 'function') return { id, name, models: [] }
        let timer
        try {
          const rawModels = await Promise.race([
            Promise.resolve(llm.listModels(id)),
            new Promise((resolve) => { timer = setTimeout(() => resolve([]), 4000) }),
          ])
          const models = (Array.isArray(rawModels) ? rawModels : [])
            .map((m) => {
              const mid = typeof m?.id === 'string' ? m.id : (typeof m === 'string' ? m : '')
              const mname = typeof m?.name === 'string' && m.name.trim() ? m.name.trim() : mid
              return mid ? { id: mid, name: mname } : null
            })
            .filter(Boolean)
          return { id, name, models }
        } catch {
          return { id, name, models: [] }
        } finally {
          clearTimeout(timer)
        }
      }))
      return { ok: true, available: true, providers: providers.filter((p) => p.id) }
    } catch (error) {
      return { ok: true, available: false, providers: [], detail: String(error?.message || error) }
    }
  }
  const checkApiConnection = (input) => checkApiEndpoint(input)
  const apiCommanderHistoryByRun = new Map()
  const canonicalPath = (value) => {
    if (typeof value !== 'string' || !value.trim()) return ''
    try {
      const real = realpathSync(value.trim())
      return process.platform === 'win32' ? real.toLowerCase() : real
    } catch {
      return ''
    }
  }
  const findWorkspaceForCwd = (cwd) => {
    const key = canonicalPath(cwd)
    if (!key) return null
    const wsReg = safeGet('workspaceRegistry')
    const list = typeof wsReg?.list === 'function' ? wsReg.list() : []
    if (!Array.isArray(list)) return null
    return list.find((w) => w && canonicalPath(w.path) === key) ?? null
  }
  const ensureWorkspaceForCwd = async (cwd) => {
    if (typeof cwd !== 'string' || !cwd.trim()) return null
    const existing = findWorkspaceForCwd(cwd)
    if (existing) return existing
    const wsReg = safeGet('workspaceRegistry')
    if (!wsReg || typeof wsReg.create !== 'function') return null
    try {
      return await wsReg.create(realpathSync(cwd.trim()))
    } catch {
      return null
    }
  }

  /** 启动 hosted 成员会话：独立 preset + 一次任务 prompt，等成员结束。 */
  const startHosted = async ({ cwd, agentPreset, prompt, scope, taskId, executionId, memberId, roleKind = 'worker', signal, onPhase, afterTurn }) => {
    const controller = ctx.get('sessionController')
    const agents = ctx.get('agents')
    if (!controller || !agents) return { ok: false, code: 'host_unavailable', detail: 'sessionController/agents service missing' }
    try {
      signal.throwIfAborted()
      onPhase('hosted.create')
      // 若工作目录已有宿主 Workspace（非隔离 tmpdir），附着其 workspaceId 保持工作区语义一致；不与 cwd 同时传
      const tmpReal = canonicalPath(os.tmpdir())
      const inTemp = cwd && (scopesOverlap(cwd, os.tmpdir()) || (tmpReal && scopesOverlap(cwd, tmpReal)))
      const existingWs = cwd && !inTemp ? findWorkspaceForCwd(cwd) : null
      const createReq = existingWs?.id ? { workspaceId: existingWs.id, agentPreset } : { ...(cwd ? { cwd } : {}), agentPreset }
      const created = await controller.create(createReq)
      signal.throwIfAborted()
      const sessionId = created?.sessionId ?? created?.value?.sessionId ?? created?.session?.id
      if (!sessionId) return { ok: false, code: 'create_failed', detail: JSON.stringify(created ?? null) }
      const binding = runtime.bindSession(String(sessionId), scope, runtime.getStatus(scope).metadata, { memberId, roleKind, executionId, taskId })
      if (!binding.ok) return binding
      let next = { prompt }
      while (next) {
        signal.throwIfAborted()
        onPhase('hosted.prompt')
        const ack = await controller.prompt({
          requestId: `req-${randomUUID()}`,
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: next.prompt }],
        }, signal)
        signal.throwIfAborted()
        if (next.accepted) {
          if (ack?.accepted !== true) throw new Error('Host did not admit the answer into the member queue')
          next.accepted()
        }
        onPhase('hosted.wait_idle')
        await agents.get(sessionId).whenIdle()
        signal.throwIfAborted()
        next = await afterTurn({ threadId: String(sessionId) })
      }
      return { ok: true, sessionId: String(sessionId) }
    } catch (error) {
      return { ok: false, code: 'hosted_failed', detail: String(error && error.message ? error.message : error) }
    }
  }

  const commanderHostSessionByRun = new Map()
  const reviewWakeups = new Set()
  const settledCommanderWakes = new Set()
  const queuedSettlements = new Map()
  let disposing = false

  async function wakeCommanderAfterSettlement(teamSessionId, settled) {
    if (disposing || !settled?.executionId) return
    const sessionId = commanderHostSessionByRun.get(teamSessionId)
    let snapshot = runtime.getStatus(teamSessionId)
    if (!snapshot || snapshot.goalCompletion || snapshot.paused) return
    const commanderSource = snapshot.metadata?.commander?.source || 'hosted'
    const controller = safeGet('sessionController')
    if (commanderSource === 'hosted') {
      if (!sessionId || !ctx.sessions?.get?.(sessionId) || typeof controller?.prompt !== 'function') return
    }
    let task = snapshot.tasks.find((t) => t.taskId === settled.taskId)
    const exec = snapshot.executions.find((e) => e.executionId === settled.executionId)
    if (!task || task.state === 'cancelled') return
    if (task.state === 'review' && task.reviewExecutionId) {
      const activeReview = snapshot.executions.find((e) => e.executionId === task.reviewExecutionId)
      if (activeReview && ['running', 'waiting_input', 'waiting_approval', 'interrupting'].includes(activeReview.state)) {
        return
      }
    }
    const wakeKey = `${teamSessionId}:${settled.executionId}`
    if (settledCommanderWakes.has(wakeKey)) return
    settledCommanderWakes.add(wakeKey)

    const hasReviewerMember = Array.isArray(snapshot.metadata?.members) &&
      snapshot.metadata.members.some((m) => m?.roleKind === 'reviewer')
    if (task.state === 'review' && !task.reviewPolicy?.requiresReview && !hasReviewerMember &&
        exec?.state === 'finished' && !task.needsAdjudication && (task.result?.delivery?.evidence?.length > 0)) {
      const autoOut = runtime.submitReview({
        taskId: task.taskId,
        executionId: settled.executionId,
        resultId: task.result.resultId,
        verdict: 'pass',
        reason: '普通任务（requiresReview=false）交付物已通过受管确定性校验且原生执行正常结束，自动完成验收',
        evidenceRefs: task.result.artifactRefs ?? [],
        autoAccepted: true,
      }, teamSessionId, { kind: 'member', role: 'commander', id: snapshot.metadata?.commanderId || 'commander' })
      if (autoOut.ok) {
        snapshot = runtime.getStatus(teamSessionId)
        task = snapshot.tasks.find((t) => t.taskId === settled.taskId) ?? task
      }
    }

    const who = settled.memberId || exec?.memberId || '成员'
    const roleLabel = settled.roleKind === 'reviewer' ? '独立审查者' : '执行成员'
    let directive
    if (task.state === 'review') {
      if (task.reviewDispatch?.status === 'needs_assignment') {
        directive = `自动派审未就绪（${task.reviewDispatch.detail || task.reviewDispatch.code}）。请调用 get_team_status 查看原因，使用 dispatch_review 指定独立审查者或向用户说明阻塞。`
      } else if (!task.reviewPolicy?.requiresReview) {
        const resId = task.result?.resultId ?? ''
        const refsJson = JSON.stringify(task.result?.artifactRefs ?? [])
        const evidenceJson = JSON.stringify(task.result?.delivery?.evidence ?? [])
        const sumJson = JSON.stringify(task.result?.summary ?? '')
        const planInfo = snapshot.planGate?.planRef ? `planRef=${JSON.stringify(snapshot.planGate.planRef)}，` : ''
        directive = [
          `该任务无需独立审查且不需等待用户人工验收（Runtime 已完成交付物确定性校验：resultId="${resId}"，artifactRefs=${refsJson}，deliveryEvidence=${evidenceJson}，summary=${sumJson}，当前 planRevision=${snapshot.planRevision}，goalId="${snapshot.goalId}"，${planInfo}无需再调用 get_task 或 get_team_status）。`,
          `请直接在本轮一步连续调用：1) submit_review（taskId="${task.taskId}", executionId="${settled.executionId}", resultId="${resId}", verdict="pass", evidenceRefs=${refsJson}, reason="交付证据已核验通过"）；2) 用 patch_view_object（op: "upsert_items"）勾选计划清单对应完成项并调用 update_team_view；3) 若无后续待派任务，直接调用 submit_decision（action: "finish_goal", expectedPlanRevision: ${snapshot.planRevision}, payload: { goalId: "${snapshot.goalId}", summary: "...", artifactRefs: ${refsJson} }）结项。`,
        ].join('\n')
      } else {
        directive = '请调用 get_team_status 查看当前审查状态并按需处理。'
      }
    } else if (task.state === 'completed') {
      const refsJson = JSON.stringify(task.result?.artifactRefs ?? [])
      const planInfo = snapshot.planGate?.planRef ? `planRef=${JSON.stringify(snapshot.planGate.planRef)}，` : ''
      directive = `该任务已自动完成确定性交付验收（无需独立审查或用户手动验收，当前 planRevision=${snapshot.planRevision}，goalId="${snapshot.goalId}"，${planInfo}artifactRefs=${refsJson}，summary=${JSON.stringify(task.result?.summary ?? '')}）。无需再调用 get_task 或 submit_review（除非发现问题需记录），请直接在本轮一步调用：1) patch_view_object（op: "upsert_items"）勾选计划清单对应完成项并刷新 update_team_view；2) 如有后续任务继续派发，若全部完成则直接调用 submit_decision（action: "finish_goal", expectedPlanRevision: ${snapshot.planRevision}, payload: { goalId: "${snapshot.goalId}", summary: "...", artifactRefs: ${refsJson} }）结项。`
    } else if (task.state === 'pending') {
      directive = '该任务已退回 pending（例如审查未通过待返工）。请调用 get_team_status 与 get_task 查看审查意见和返工预算，重新派发或向用户说明情况。'
    } else {
      const reason = task.blockedReason || exec?.unknownReason || '未确认完成'
      directive = `任务当前处于 ${task.state}（${reason}）。请调用 get_team_status 核查原因、刷新 update_team_view，并按情况解除/调整或向用户汇报处理。`
    }

    const text = [
      `[Concerto 执行汇报] 任务 ${task.taskId}「${task.title}」的${roleLabel} ${who} 已结束本次执行（executionId=${settled.executionId}，executionState=${exec?.state ?? 'unknown'}，taskState=${task.state}）。`,
      directive,
    ].join('\n')

    try {
      if (commanderSource === 'api' || commanderSource === 'external') {
        await promptNonHostedCommander({
          sessionId: sessionId || snapshot.metadata?.commanderSessionId || teamSessionId,
          teamSessionId,
          teamId: snapshot.metadata?.teamId,
          roleKind: 'commander',
          memberId: snapshot.metadata?.commanderId || 'commander',
        }, text)
        return
      }
      await controller.prompt({
        requestId: `req-exec-settled-${settled.executionId}`,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
      }, new AbortController().signal)
    } catch (error) {
      ctx.logger?.warn?.(error)
    }
  }

  function wakeAutomaticReview(teamSessionId, settled = null) {
    if (disposing) return
    if (settled?.executionId) {
      const list = queuedSettlements.get(teamSessionId) ?? []
      list.push(settled)
      queuedSettlements.set(teamSessionId, list)
    }
    if (reviewWakeups.has(teamSessionId)) return
    reviewWakeups.add(teamSessionId)
    queueMicrotask(async () => {
      try {
        if (disposing) return
        const pending = runtime.nextAutomaticReview(teamSessionId)
        let autoDispatchedTaskId = null
        if (pending) {
          const { metadata } = runtime.getStatus(teamSessionId)
          const scope = { teamId: metadata.teamId, teamSessionId, sessionId: commanderHostSessionByRun.get(teamSessionId) }
          const out = await tasks.dispatchReview({
            taskId: pending.taskId, commandId: `auto-review-${pending.resultId}`,
          }, { kind: 'runtime', actorId: 'concerto' }, { scope, metadata, pending })
          if (out.ok) autoDispatchedTaskId = pending.taskId
          else runtime.recordReviewDispatchBlock(teamSessionId, pending, out)
        }
        const drained = queuedSettlements.get(teamSessionId) ?? []
        queuedSettlements.delete(teamSessionId)
        for (const item of drained) {
          if (autoDispatchedTaskId && item.taskId === autoDispatchedTaskId && item.roleKind !== 'reviewer') {
            continue
          }
          await wakeCommanderAfterSettlement(teamSessionId, item)
        }
      } catch (error) {
        ctx.logger.error(error)
      } finally {
        reviewWakeups.delete(teamSessionId)
        if (!disposing && queuedSettlements.get(teamSessionId)?.length) {
          wakeAutomaticReview(teamSessionId)
        }
      }
    })
  }
  const runner = createTaskRunner({
    runtime, registry: connectorRegistry, defaultCwd, hostedStart: startHosted, hostedTimeoutMs: config.hostedTimeoutMs ?? 180000,
    async notifyCommander(scope, requestId) {
      const sessionId = commanderHostSessionByRun.get(scope)
      if (!sessionId || !ctx.sessions.get(sessionId)) return
      await ctx.sessionController.prompt({
        requestId: `req-member-question-${requestId}`, sessionId, mode: 'queue',
        content: [{ type: 'text', text: `[Concerto 成员提问] 请调用 get_team_status 查看待回答问题 ${requestId}。需要用户确认时，调用 ask_member_question_user 交给用户。回答会走原成员的受管通道。` }],
      }, new AbortController().signal)
    },
    onExecutionSettled: wakeAutomaticReview,
    onError: (error) => ctx.logger.error(error),
  })
  const commanderLaunch = new AsyncLocalStorage()
  const startingProjects = new Set()
  const hostedEventLog = createHostedSessionEventLog({ maxEventsPerSession: 2000 })
  const disposeHostedSessionObserver = typeof ctx.on === 'function'
    ? ctx.on('session/event', (session, event) => {
        if (session?.id !== undefined) hostedEventLog.record(String(session.id), event)
      })
    : null

  const resolveSessionCwd = (session) => {
    if (!session || typeof session !== 'object') return null
    const raw = session?.header?.cwd ?? session?.cwd ?? session?.metadata?.cwd ?? null
    return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
  }

  const WORKSPACE_TOOL_NAMES = new Set(['read', 'write', 'edit', 'apply_patch', 'glob', 'grep', 'pwsh', 'bash'])

  const readScopeToolNames = (scopeKey) => {
    if (!scopeKey || typeof ctx.tools?.schemas !== 'function') return null
    try {
      const list = ctx.tools.schemas(scopeKey)
      if (Array.isArray(list)) {
        return list.map((s) => s?.name ?? s?.function?.name).filter((n) => typeof n === 'string' && n !== '')
      }
    } catch { /* ignore */ }
    return null
  }

  const readAgentToolNames = (agent) => {
    if (!agent || typeof ctx.tools?.schemas !== 'function') return null
    for (const candidateScope of [agent.scope, agent.key, agent]) {
      if (!candidateScope) continue
      const names = readScopeToolNames(candidateScope)
      if (Array.isArray(names) && names.length > 0) return names
    }
    return null
  }

  const inspectMemberCapabilitySync = (teamId, member, snapshot = null, roleKindOverride = null) => {
    const m = { ...member, roleKind: roleKindOverride ?? member?.roleKind ?? 'worker' }
    const expected = expectedCapabilitiesForMember(m)
    if (m.source === 'api') {
      const configured = Boolean(typeof m.baseUrl === 'string' && m.baseUrl.trim() && typeof m.model === 'string' && m.model.trim())
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: 'api',
        connector: `api:${m.model || 'custom'}`,
        ...expected,
        actualTools: [],
        verificationStatus: configured ? 'connector_registered' : 'connector_missing',
        verifiedAt: new Date().toISOString(),
        detail: configured ? null : `自定义 API 成员 "${m.id}" 缺少 baseUrl 或 model`,
      }
    }
    if (m.source !== 'hosted') {
      const adapter = connectorRegistry.get(m.connector)
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: m.source,
        connector: m.connector ?? null,
        ...expected,
        verificationStatus: adapter ? 'connector_registered' : 'connector_missing',
        liveVerified: false,
        actualTools: [],
        detail: adapter ? null : `外部连接器 "${m.connector ?? ''}" 未在 Host 注册`,
      }
    }

    const presetId = m.roleKind === 'commander' ? teamId : `${teamId}--${m.id}`
    const defs = ctx.agentPresets?.definitions
    const defRecord = defs instanceof Map ? defs.get(presetId) : null

    // 优先通过宿主预设 generation.key 查询 tools.schemas(presetScopeKey)：该作用域才包含预设内挂载的 tool-fs/pwsh/search。
    // 不要用 agent.ctx（根上下文）或未绑定 scope key 的 agent 对象代替预设作用域。
    let liveTools = readScopeToolNames(defRecord?.generation?.key)
    if (!liveTools && !defRecord?.generation?.key) {
      const liveSids = []
      if (snapshot) {
        if (m.roleKind === 'commander') {
          const cmdSid = commanderHostSessionByRun.get(snapshot.teamSessionId)
          if (cmdSid) liveSids.push(cmdSid)
        } else {
          for (const ex of (snapshot.executions ?? [])) {
            if (ex.memberId === m.id && ex.nativeSessionRef?.backend === 'hosted' && ex.nativeSessionRef?.sessionId) {
              liveSids.push(String(ex.nativeSessionRef.sessionId))
            }
          }
        }
      }
      for (const sid of liveSids) {
        const names = readAgentToolNames(ctx.agents?.get?.(sid))
        if (Array.isArray(names) && names.length > 0) {
          liveTools = names
          break
        }
      }
    }

    if (!(defs instanceof Map)) {
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: 'hosted',
        presetId,
        ...expected,
        verificationStatus: expected.coordinatorOnly ? 'coordinator_only' : 'mock_unverified',
        liveVerified: Boolean(liveTools),
        actualTools: liveTools ?? expected.expectedTools,
        detail: null,
      }
    }

    if (!defRecord) {
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: 'hosted',
        presetId,
        ...expected,
        fileRead: false,
        fileWrite: false,
        fileEdit: false,
        search: false,
        shell: false,
        verificationStatus: 'preset_unreloaded',
        liveVerified: false,
        actualTools: [],
        detail: `预设 "${presetId}" 尚未重载到宿主，请先执行团队生成与重载`,
      }
    }

    const broken = defRecord?.generation?.diagnostic
    if (broken) {
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: 'hosted',
        presetId,
        ...expected,
        fileRead: false,
        fileWrite: false,
        fileEdit: false,
        search: false,
        shell: false,
        verificationStatus: 'preset_broken',
        liveVerified: false,
        actualTools: [],
        detail: String(broken),
      }
    }

    const plugins = Array.isArray(defRecord?.config?.plugins) ? defRecord.config.plugins : []
    const activePlugins = plugins.filter((p) => p && p.disabled !== true)
    const activeNames = new Set(activePlugins.map((p) => p.name))
    const missingPlugins = expected.expectedPluginNames.filter((name) => !activeNames.has(name))
    const fsPlugin = activePlugins.find((p) => p.name === '@deepseek-ai/dsh-tool-fs')
    const writeBlocked = expected.fileWrite && (fsPlugin?.config?.write === false || fsPlugin?.config?.edit === false)
    const stale = missingPlugins.length > 0 || writeBlocked

    let actualTools = []
    if (Array.isArray(liveTools)) {
      actualTools = liveTools.filter((name) => expected.expectedTools.includes(name) || WORKSPACE_TOOL_NAMES.has(name))
    } else if (!stale && !expected.coordinatorOnly) {
      const derived = []
      if (fsPlugin) {
        if (fsPlugin.config?.read !== false) derived.push('read')
        if (fsPlugin.config?.write !== false) derived.push('write')
        if (fsPlugin.config?.edit !== false) derived.push('edit')
      }
      if (activeNames.has('@deepseek-ai/dsh-tool-fs-search')) derived.push('glob', 'grep')
      if (activeNames.has('@deepseek-ai/dsh-tool-pwsh')) derived.push('pwsh')
      if (activeNames.has('@deepseek-ai/dsh-tool-bash')) derived.push('bash')
      actualTools = derived
    }

    const liveMissing = Array.isArray(liveTools) && !expected.coordinatorOnly
      ? expected.expectedTools.filter((t) => !liveTools.includes(t))
      : []

    if (stale || liveMissing.length > 0) {
      return {
        memberId: m.id,
        roleKind: m.roleKind,
        source: 'hosted',
        presetId,
        ...expected,
        fileRead: Boolean(fsPlugin && fsPlugin.config?.read !== false) && !stale,
        fileWrite: Boolean(fsPlugin && fsPlugin.config?.write !== false && fsPlugin.config?.edit !== false) && !stale,
        fileEdit: Boolean(fsPlugin && fsPlugin.config?.edit !== false) && !stale,
        search: activeNames.has('@deepseek-ai/dsh-tool-fs-search'),
        shell: activeNames.has('@deepseek-ai/dsh-tool-pwsh') || activeNames.has('@deepseek-ai/dsh-tool-bash'),
        verificationStatus: 'preset_stale',
        liveVerified: Boolean(liveTools),
        actualTools,
        detail: liveMissing.length > 0
          ? `运行时缺少预期工具: ${liveMissing.join(', ')}`
          : `预设缺少期望工具插件 (${missingPlugins.join(', ') || 'fs write/edit'})，需要重新生成并重载`,
      }
    }

    return {
      memberId: m.id,
      roleKind: m.roleKind,
      source: 'hosted',
      presetId,
      ...expected,
      verificationStatus: expected.coordinatorOnly ? 'coordinator_only' : 'verified',
      liveVerified: Boolean(liveTools),
      actualTools,
      detail: null,
    }
  }

  const inspectTeamCapabilities = async (teamId, snapshot = null) => {
    const team = snapshot?.metadata ?? store.getTeam(teamId)?.team
    if (!team) return []
    const list = []
    if (team.commander) list.push(inspectMemberCapabilitySync(teamId, team.commander, snapshot, 'commander'))
    for (const member of (team.members ?? [])) {
      list.push(inspectMemberCapabilitySync(teamId, member, snapshot))
    }
    if (ctx.agentPresets?.definitions instanceof Map && typeof ctx.agentPresets?.diagnostic === 'function') {
      for (const item of list) {
        if (item.source === 'hosted' && item.presetId && item.verificationStatus === 'verified') {
          const rec = ctx.agentPresets.definitions.get(item.presetId)
          if (rec) {
            try {
              const diag = await ctx.agentPresets.diagnostic(rec)
              if (diag) {
                item.verificationStatus = 'preset_broken'
                item.detail = String(diag)
                item.fileRead = false
                item.fileWrite = false
                item.fileEdit = false
                item.search = false
                item.shell = false
              }
            } catch { /* ignore */ }
          }
        }
      }
    }
    return list
  }

  const inspectTeamCapabilitiesSync = (teamId, snapshot = null) => {
    const team = snapshot?.metadata ?? store.getTeam(teamId)?.team
    if (!team) return []
    const list = []
    if (team.commander) list.push(inspectMemberCapabilitySync(teamId, team.commander, snapshot, 'commander'))
    for (const member of (team.members ?? [])) list.push(inspectMemberCapabilitySync(teamId, member, snapshot))
    return list
  }

  const inspectMemberCapabilityForScope = async (scope) => {
    if (!scope?.teamSessionId || !scope?.memberId) return null
    const snapshot = runtime.getStatus(scope.teamSessionId)
    const meta = snapshot?.metadata
    if (!meta) return null
    const member = meta.commander?.id === scope.memberId
      ? { ...meta.commander, roleKind: 'commander' }
      : (meta.members ?? []).find((m) => m.id === scope.memberId)
    if (!member) return null
    return inspectMemberCapabilitySync(scope.teamId, member, snapshot, scope.roleKind)
  }

  const listTeamsWithCapabilities = () => store.listTeams().map((t) => ({
    ...t,
    memberCapabilities: inspectTeamCapabilitiesSync(t.id, null),
  }))

  const commanderMetadata = (record, projectId, cwd, workspaceId) => ({
    projectId,
    teamId: record.id,
    configVersion: record.version,
    teamName: record.name,
    commanderId: record.team.commander.id,
    requirePlanApproval: true,
    reviewPolicy: {
      version: `${record.id}@v${record.version}/profile-v1:${Number(config?.policyRequiresReview === true)}`,
      requiresReview: record.team.policyRequiresReview === true || config?.policyRequiresReview === true,
    },
    ...(cwd ? { cwd } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    members: structuredClone(record.team.members),
    commander: structuredClone(record.team.commander),
    ...(typeof record.team.objective === 'string' && record.team.objective.trim() ? { objective: record.team.objective.trim() } : {}),
    ...(Array.isArray(record.team.requiredViews) && record.team.requiredViews.length > 0 ? { requiredViews: structuredClone(record.team.requiredViews) } : {}),
    ...(record.team.dispatchLimits ? { dispatchLimits: structuredClone(record.team.dispatchLimits) } : {}),
  })

  /**
   * 会话 preset → 团队作用域与角色：
   * `<teamId>` = commander；`<teamId>--<memberId>` = 该成员。
   */
  const scopeOf = (session) => {
    if (!session) return null
    const sessionId = String(session.id)
    const bound = runtime.getBinding(sessionId)
    if (bound) {
      if (bound.roleKind === 'commander') commanderHostSessionByRun.set(bound.teamSessionId, sessionId)
      const sessionCwd = resolveSessionCwd(session)
      if (sessionCwd && !runtime.getStatus(bound.teamSessionId)?.metadata?.cwd) {
        const ws = findWorkspaceForCwd(sessionCwd)
        try {
          runtime.bindSession(sessionId, bound.teamSessionId, { cwd: sessionCwd, ...(ws?.id ? { workspaceId: ws.id } : {}) })
        } catch { /* ignore */ }
      }
      return bound
    }
    const preset = ctx.agentPresets.presetForSession(session)
    if (typeof preset !== 'string' || preset.includes('--')) return null
    const teamId = preset.replace(/^preset-/, '')
    const launch = commanderLaunch.getStore()
    const creating = launch?.creating && launch.record.id === teamId ? launch : null
    const record = creating?.record ?? store.getTeam(teamId)
    if (!record) return null
    const scope = `run-${sessionId}`
    const sessionCwd = creating?.cwd ?? resolveSessionCwd(session)
    const ws = sessionCwd ? findWorkspaceForCwd(sessionCwd) : null
    const created = runtime.bindSession(sessionId, scope, commanderMetadata(
      record, creating?.projectId ?? `project-${sessionId}`, sessionCwd, creating?.workspaceId ?? ws?.id,
    )).binding
    if (created?.roleKind === 'commander') commanderHostSessionByRun.set(created.teamSessionId, sessionId)
    return created
  }

  const sessionInfo = (sessionId) => {
    const liveSession = ctx.sessions.get(String(sessionId))
    const scope = scopeOf(liveSession)
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    const snapshot = runtime.getStatus(scope.teamSessionId)
    const liveCwd = resolveSessionCwd(liveSession)
    const effectiveCwd = snapshot.metadata?.cwd ?? liveCwd ?? null
    const memberCapabilities = inspectTeamCapabilitiesSync(scope.teamId, snapshot)
    return {
      ok: true,
      ...scope,
      ...snapshot.metadata,
      ...(effectiveCwd ? { cwd: effectiveCwd } : {}),
      memberCapabilities,
      snapshot: {
        ...snapshot,
        metadata: {
          ...snapshot.metadata,
          ...(effectiveCwd ? { cwd: effectiveCwd } : {}),
          memberCapabilities,
        },
      },
    }
  }

  const collectRuntimeActivities = (teamSessionId, memberId) => {
    const pages = []
    let before = null
    for (let guard = 0; guard < 10; guard += 1) {
      const page = runtime.getMemberActivity(teamSessionId, { memberId, before, limit: 100 })
      if (!page?.ok || !Array.isArray(page.items) || page.items.length === 0) break
      pages.unshift(...page.items)
      if (!page.hasMore || !page.nextBefore) break
      before = page.nextBefore
    }
    return pages
  }

  const memberActivity = (sessionId, query) => {
    const scope = scopeOf(ctx.sessions.get(String(sessionId)))
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    const snapshot = runtime.getStatus(scope.teamSessionId)
    const meta = snapshot.metadata
    const targetMemberId = query?.memberId ?? ''
    const member = targetMemberId && meta?.commander?.id === targetMemberId
      ? { ...meta.commander, roleKind: 'commander' }
      : meta?.members?.find((m) => m.id === targetMemberId)

    let hostedSessionSupported = false
    let usedSessionEvents = false
    let usedDerivedMessages = false
    const hostedItems = []
    if (member?.source === 'hosted') {
      const targets = []
      if (member.roleKind === 'commander') {
        const cmdSid = commanderHostSessionByRun.get(scope.teamSessionId) || (scope.roleKind === 'commander' ? String(sessionId) : null)
        if (cmdSid) targets.push({ hostSessionId: cmdSid, taskId: null, executionId: null, anchorMs: 0 })
      } else {
        for (const ex of (snapshot.executions || [])) {
          if (ex.memberId === member.id && ex.nativeSessionRef?.backend === 'hosted' && ex.nativeSessionRef?.sessionId) {
            const parsedStart = typeof ex.startedAt === 'string' ? Date.parse(ex.startedAt) : 0
            targets.push({
              hostSessionId: ex.nativeSessionRef.sessionId,
              taskId: ex.taskId ?? null,
              executionId: ex.executionId,
              anchorMs: Number.isFinite(parsedStart) ? parsedStart : 0,
            })
          }
        }
      }
      for (const target of targets) {
        const hostSession = ctx.sessions.get(String(target.hostSessionId))
        const projected = projectHostedSessionActivities(hostSession, {
          memberId: member.id,
          taskId: target.taskId,
          executionId: target.executionId,
          hostSessionId: target.hostSessionId,
          eventLog: hostedEventLog,
          anchorMs: target.anchorMs,
        })
        if (projected.supported) {
          hostedSessionSupported = true
          if (projected.sources?.dshSessionEvents) usedSessionEvents = true
          if (projected.sources?.dshDerivedMessages) usedDerivedMessages = true
          hostedItems.push(...projected.items)
        }
      }
    }

    const backendHistoryMode = member?.connector === 'codex'
      ? 'codex_normalized'
      : (member?.source === 'external' && member?.connector
        ? 'connector_normalized'
        : (member?.source === 'hosted'
          ? (hostedSessionSupported ? 'hosted_session' : 'hosted_partial')
          : 'runtime_only'))

    if (hostedSessionSupported) {
      const runtimeAll = collectRuntimeActivities(scope.teamSessionId, targetMemberId)
      const merged = mergeAndPaginateActivities(runtimeAll, hostedItems, query)
      return {
        ...merged,
        backendHistoryMode,
        historySources: {
          runtime: true,
          dshSessionEvents: usedSessionEvents,
          dshDerivedMessages: usedDerivedMessages,
          liveHostVerified: false,
        },
      }
    }

    const out = runtime.getMemberActivity(scope.teamSessionId, query)
    return {
      ...out,
      backendHistoryMode,
      historySources: {
        runtime: true,
        dshSessionEvents: false,
        dshDerivedMessages: false,
        liveHostVerified: false,
      },
    }
  }

  const readViewObject = (sessionId, query = {}) => {
    const scope = scopeOf(ctx.sessions.get(String(sessionId)))
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    return runtime.readViewObject(scope.teamSessionId, query)
  }

  const getSkillsInfo = async (sessionId, query = {}) => {
    const scope = scopeOf(ctx.sessions.get(String(sessionId)))
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    const caps = await inspectMemberCapabilityForScope(scope)
    const available = runtime.listSkills(scope.teamSessionId, { kind: query.kind || 'all', includeIneligible: query.includeIneligible === true }, {
      roleKind: scope.roleKind,
      capabilities: caps,
    })
    const ledger = runtime.getSkillLedger(scope.teamSessionId)
    return { ok: true, ...ledger, availableSkills: available.skills }
  }

  const importExcalidrawBoard = (sessionId, filename, scene) => {
    const scope = scopeOf(ctx.sessions.get(sessionId))
    if (!scope) return { ok: false, code: 'not_found', detail: '找不到受管团队会话。' }
    if (scope.roleKind !== 'commander') return { ok: false, code: 'unauthorized', detail: '请在指挥者会话的成果页导入白板。' }
    return runtime.importExcalidrawBoard(scope.teamSessionId, filename, scene)
  }

  const saveUserLayout = (sessionId, input) => {
    const scope = scopeOf(ctx.sessions.get(String(sessionId)))
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    return runtime.updateViewObjectUserLayout(scope.teamSessionId, input)
  }

  const saveUserViewPreferences = (sessionId, input) => {
    const scope = scopeOf(ctx.sessions.get(String(sessionId)))
    if (!scope) return { ok: false, code: 'not_found', detail: 'session is not a managed team entry' }
    return runtime.updateUserViewPreferences(scope.teamSessionId, input)
  }

  const reconcileCache = new Map()

  const verifyBackendStopped = async (execution) => {
    const ref = execution?.nativeSessionRef ?? null
    const isHosted = ref?.backend === 'hosted' || String(execution?.connectorId || '').startsWith('hosted:')
    if (isHosted) {
      const nativeSid = ref?.sessionId ? String(ref.sessionId) : ''
      if (!nativeSid) {
        return { checked: false, confirmedStopped: false, kind: 'hosted_unconfirmed', reason: '无 Hosted 原生会话引用，无法核对停止状态' }
      }
      // 严禁把 sessions.get(id) === undefined 视为原生执行已停止：重启后 sessions/agents 为空并不能证明后端已结束
      const agent = ctx.agents?.get?.(nativeSid)
      if (!agent) {
        return {
          checked: true,
          confirmedStopped: false,
          kind: 'hosted_unconfirmed',
          sessionId: nativeSid,
          reason: `Hosted 成员会话 "${nativeSid}" 未加载于当前宿主 agents（重启后未加载不代表已停止），请保留原工作区并使用隔离恢复`,
        }
      }
      const jobs = safeGet('jobs')
      let activeJob = false
      if (typeof jobs?.list === 'function') {
        try {
          const allJobs = jobs.list()
          if (Array.isArray(allJobs)) {
            activeJob = allJobs.some((j) => j && j.ownerSessionId === nativeSid && !['completed', 'failed', 'cancelled', 'settled'].includes(j.status))
          }
        } catch { /* ignore */ }
      }
      if (agent.status === 'idle' && !activeJob) {
        return {
          checked: true,
          confirmedStopped: true,
          kind: 'hosted_idle',
          sessionId: nativeSid,
          evidence: { kind: 'hosted_idle', verified: true, sessionId: nativeSid, observedAt: new Date().toISOString() },
          reason: `Hosted 成员代理 ${nativeSid} 已确认处于 idle 且无活跃后台作业`,
        }
      }
      return {
        checked: true,
        confirmedStopped: false,
        kind: 'hosted_active',
        sessionId: nativeSid,
        reason: `Hosted 成员代理 ${nativeSid} 状态为 ${String(agent.status)}${activeJob ? '（仍有活跃作业）' : ''}，未确认停止`,
      }
    }

    const backendId = ref?.backend && ref.backend !== 'hosted'
      ? ref.backend
      : (execution?.connectorId && !String(execution.connectorId).startsWith('hosted:') ? execution.connectorId : '')
    if (backendId) {
      const adapter = connectorRegistry.get(backendId)
      if (!adapter || typeof adapter.reconcile !== 'function') {
        return { checked: false, confirmedStopped: false, kind: `${backendId}_unavailable`, reason: `${backendId} adapter reconcile unavailable` }
      }
      const sameHostBoot = (execution?.hostBootId ?? ref?.hostBootId ?? null) === runtime.getHostBootId()
      const rec = await adapter.reconcile(ref, { cwd: execution?.writeScope, sameHostBoot })
      if (rec?.evidence) rec.evidence.verified = Boolean(rec.confirmedStopped)
      return rec
    }

    return { checked: false, confirmedStopped: false, kind: 'unsupported_backend', reason: '无可用的原生后端停止核对通道，保留 unknown' }
  }

  const establishIsolatedDirectory = (previousWriteScope) => {
    try {
      const root = realpathSync(os.tmpdir())
      let previous = ''
      if (typeof previousWriteScope === 'string' && previousWriteScope.trim() !== '') {
        try { previous = realpathSync(previousWriteScope) } catch { previous = previousWriteScope }
      }
      const gitInfo = previous ? inspectGitWorkspace(previous) : null
      if (gitInfo?.isGit && gitInfo.available) {
        const wt = createGitWorktree({
          repositoryRoot: gitInfo.repositoryRoot,
          baseCommit: gitInfo.baseCommit,
          taskId: 'retry',
          executionId: `iso-${randomUUID().slice(0, 8)}`,
        })
        if (wt.ok && (!previous || !scopesOverlap(previous, wt.worktree.path))) {
          return {
            ok: true,
            evidence: {
              kind: 'fresh_directory',
              cwd: wt.worktree.path,
              previous: previous || null,
              worktree: wt.worktree,
              observedAt: new Date().toISOString(),
            },
          }
        }
        if (wt.ok) removeGitWorktree(wt.worktree)
      }
      const probeCandidate = join(root, `concerto-isolated-${randomUUID().slice(0, 8)}`)
      if (previous && scopesOverlap(previous, probeCandidate)) {
        return { ok: false, detail: 'temporary isolation root overlaps the old workspace' }
      }
      const cwd = realpathSync(mkdtempSync(join(root, 'concerto-isolated-')))
      return { ok: true, evidence: { kind: 'fresh_directory', cwd, previous: previous || null, observedAt: new Date().toISOString() } }
    } catch (error) {
      return { ok: false, detail: `cannot establish isolation: ${error.message}` }
    }
  }

  const executeAdjudication = async (scope, input, actor = { kind: 'user', id: 'local-owner' }) => {
    const replay = runtime.replayCommand(scope, input.commandId, { type: 'adjudicate', input })
    if (replay) return replay
    const snapshot = runtime.getStatus(scope)
    const execution = snapshot.executions.find((e) => e.executionId === input.executionId && e.taskId === input.taskId)
    if (!execution || execution.state !== 'unknown') return { ok: false, code: 'precondition_failed', detail: 'unknown execution required' }
    let evidence
    if (input.action === 'confirm_failed') {
      const rec = await verifyBackendStopped(execution)
      reconcileCache.set(execution.executionId, { ...rec, checkedAt: new Date().toISOString() })
      if (rec?.confirmedStopped && rec?.evidence) {
        evidence = rec.evidence
      }
    }
    if (input.action === 'force_release') {
      if (input.confirmUnverifiedRelease !== true || typeof input.reason !== 'string' || !input.reason.trim()) {
        return { ok: false, code: 'precondition_failed', detail: 'confirmUnverifiedRelease and reason required' }
      }
      const rec = await verifyBackendStopped(execution)
      reconcileCache.set(execution.executionId, { ...rec, checkedAt: new Date().toISOString() })
      if (
        rec?.kind === 'hosted_active'
        || rec?.pidAlive === true
        || (rec?.checked === true && !rec?.confirmedStopped && /^codex thread .* is not terminal/.test(String(rec?.reason || '')))
      ) {
        return { ok: false, code: 'precondition_failed', detail: rec.reason || 'backend execution is still active; cannot force release' }
      }
      evidence = rec?.confirmedStopped && rec?.evidence
        ? rec.evidence
        : {
            kind: 'user_force_release',
            verified: false,
            acknowledgedUnverified: true,
            reconcileKind: rec?.kind ?? null,
            reconcileReason: rec?.reason ?? null,
            observedAt: new Date().toISOString(),
          }
    }
    if (input.action === 'retry_isolated') {
      if (execution.quarantined) return { ok: false, code: 'precondition_failed', detail: 'the original workspace already has an adjudication' }
      const isHosted = String(execution.connectorId || '').startsWith('hosted:') || execution.nativeSessionRef?.backend === 'hosted'
      const isBoundedExternal = !isHosted && Boolean(execution.connectorId) && ['read-only', 'workspace-write'].includes(execution.sandbox)
      const isBoundedHosted = isHosted && execution.sandbox !== 'danger-full-access'
      if ((!isBoundedExternal && !isBoundedHosted) || input.externalEffectsReviewed !== true || typeof input.reason !== 'string' || !input.reason.trim()) {
        return { ok: false, code: 'precondition_failed', detail: 'bounded sandbox, reason and externalEffectsReviewed required' }
      }
      const iso = establishIsolatedDirectory(execution.writeScope)
      if (!iso.ok) return { ok: false, code: 'precondition_failed', detail: iso.detail }
      evidence = iso.evidence
    }
    const out = runtime.adjudicate(scope, input, actor, evidence)
    if (out.ok && out.executionState === 'stopped') wakeAutomaticReview(scope)
    return out
  }

  const ownedRun = (input) => {
    const scope = scopeOf(ctx.sessions.get(String(input?.sessionId ?? '')))
    if (!scope || scope.roleKind !== 'commander') return { ok: false, code: 'unauthorized', detail: 'a managed commander session is required' }
    if (typeof input.commandId !== 'string' || !input.commandId) return { ok: false, code: 'invalid', detail: 'commandId required' }
    return { ok: true, scope, metadata: runtime.getStatus(scope.teamSessionId).metadata }
  }

  const haltRun = (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    const out = runtime.haltTeam(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
    if (out.ok && !out.paused) wakeAutomaticReview(owned.scope.teamSessionId)
    return out
  }

  const approveRunPlan = async (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    const { teamSessionId, sessionId } = owned.scope
    const approved = runtime.approvePlan(teamSessionId, input, { kind: 'user', id: 'local-owner' })
    if (!approved.confirmedNow || approved.replayed) return approved

    const { proposalId, planRef } = approved.planGate
    const ref = `${planRef.type}:${planRef.id}@v${planRef.version}`
    let commanderWake = 'manual'
    const controller = safeGet('sessionController')
    if (typeof controller?.prompt === 'function') {
      try {
        const ack = await controller.prompt({
          requestId: `req-kickoff-${proposalId}`,
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: `[Concerto 开工确认] 用户在团队页确认了计划 ${ref}（提案 ${proposalId}）。请先调用 get_team_status。只有 planGate.status 为 approved、proposalId 与本通知一致且目标尚未结项时，才按该计划继续创建和派发尚未安排的任务。请检查暂停状态。` }],
        }, new AbortController().signal)
        if (ack?.accepted === true) commanderWake = 'accepted'
      } catch (error) {
        ctx.logger.warn(error)
      }
    }
    const wake = runtime.recordPlanWake(teamSessionId, proposalId, commanderWake)
    return wake.ok ? { ...approved, planGate: wake.planGate } : approved
  }

  const setRunDispatchLimits = (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    return runtime.setDispatchLimits(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
  }

  const editAcceptanceChecklist = (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    return runtime.editAcceptanceChecklist(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
  }

  let askUserQuestions
  ctx.inject?.(['userQuestions'], (questionCtx) => {
    questionCtx.effect(() => {
      askUserQuestions = (request) => questionCtx.userQuestions.ask(request)
      return () => { askUserQuestions = undefined }
    }, 'concerto: native user questions')
  })

  const offerProjectSkill = async (input, exec, scope) => {
    const ask = askUserQuestions
    if (!ask) return { ok: false, code: 'host_unavailable', detail: 'DSH userQuestions is unavailable' }
    const { teamSessionId, memberId } = scope
    const offered = runtime.offerCloseoutSkill(teamSessionId, input, { kind: 'member', id: memberId, role: 'commander' })
    if (!offered.ok || offered.replayed) return offered

    const questionId = 'save-closeout-skill'
    const choices = { '保存为项目 Skill': 'approved', '不保存': 'declined', '暂不处理': 'deferred' }
    let status
    try {
      const result = await ask({
        agent: exec.agent,
        signal: exec.signal,
        questions: [{
          id: questionId,
          question: '是否将本项目中已验证的成功经验整理为项目 Skill？',
          detail: [offered.offer.summary, '', ...offered.offer.sourceRefs].join('\n'),
          options: Object.keys(choices).map((label) => ({ label })),
        }],
      })
      const answer = result.answers.find((item) => item.id === questionId)
      const choice = answer?.selected.length === 1 && !answer.custom ? answer.selected[0] : ''
      status = Object.hasOwn(choices, choice) ? choices[choice] : 'deferred'
    } catch (error) {
      status = error?.code === 'ASK_CANCELLED' ? 'deferred' : 'interrupted'
      if (status === 'interrupted') ctx.logger.warn(error)
    }
    const actor = status === 'interrupted' ? { kind: 'runtime', id: 'concerto' } : { kind: 'user', id: 'local-owner' }
    return runtime.settleCloseoutSkill(teamSessionId, status, actor)
  }

  const openPlanApprovals = new Set()
  const summarizePlanArtifactForPrompt = (obj) => {
    if (!obj) return []
    const lines = []
    if (typeof obj.summary === 'string' && obj.summary.trim()) lines.push(obj.summary.trim())
    const data = obj.data
    if (obj.type === 'checklist' && Array.isArray(data?.items)) {
      for (const item of data.items.slice(0, 6)) {
        const text = item?.title || item?.label || item?.text
        if (typeof text === 'string' && text.trim()) lines.push(`- ${text.trim()}`)
      }
    } else if (obj.type === 'table' && Array.isArray(data?.rows)) {
      for (const row of data.rows.slice(0, 6)) {
        if (Array.isArray(row) && row.length > 0) lines.push(`- ${row.slice(0, 3).map((cell) => String(cell ?? '')).join(' | ')}`)
      }
    } else if (obj.type === 'diagram' && Array.isArray(data?.nodes)) {
      for (const node of data.nodes.slice(0, 6)) {
        const text = node?.label || node?.title || node?.id
        if (typeof text === 'string' && text.trim()) lines.push(`- ${text.trim()}`)
      }
    } else if (obj.type === 'mindmap' && data?.root) {
      const rootLabel = data.root.label || data.root.text || data.root.title
      if (typeof rootLabel === 'string' && rootLabel.trim()) lines.push(`- ${rootLabel.trim()}`)
      for (const child of (Array.isArray(data.root.children) ? data.root.children : []).slice(0, 5)) {
        const text = child?.label || child?.text || child?.title
        if (typeof text === 'string' && text.trim()) lines.push(`  - ${text.trim()}`)
      }
    }
    return lines.slice(0, 7)
  }

  const submitDecision = async (args, teamSessionId, actor, exec, scope) => {
    let activeTeamSessionId = teamSessionId
    let continuedFrom = null
    const hostSessionId = scope?.sessionId ?? commanderHostSessionByRun.get(teamSessionId) ?? null
    if (
      hostSessionId
      && actor?.kind === 'member'
      && actor?.role === 'commander'
      && (args?.action === 'propose_plan' || args?.action === 'create_task')
    ) {
      const currentStatus = runtime.getStatus(activeTeamSessionId)
      if (currentStatus?.goalCompletion?.state === 'completed') {
        const continued = runtime.continueCompletedRun(hostSessionId, {
          decisionId: args?.decisionId,
          carryBlueprintId: args?.action === 'propose_plan' ? args?.payload?.planId : null,
        })
        if (continued?.ok && continued.rotated && continued.binding?.teamSessionId) {
          continuedFrom = activeTeamSessionId
          activeTeamSessionId = continued.binding.teamSessionId
          commanderHostSessionByRun.set(activeTeamSessionId, hostSessionId)
        }
      }
    }
    const out = await runner.submitDecision(args, activeTeamSessionId, actor)
    const withContinuation = (res) => (continuedFrom && res?.ok
      ? { ...res, continuedFromRun: continuedFrom, teamSessionId: activeTeamSessionId }
      : res)
    if (args?.action !== 'propose_plan' || !out?.ok || out.replayed || out.result?.status !== 'pending' || !out.result?.proposalId) {
      return withContinuation(out)
    }
    const ask = askUserQuestions
    if (!ask || !exec?.agent) return withContinuation(out)
    const { proposalId, planRef } = out.result
    if (openPlanApprovals.has(proposalId)) return withContinuation({ ...out, confirmationPrompt: 'already_open' })
    openPlanApprovals.add(proposalId)
    const snapshot = runtime.getStatus(activeTeamSessionId)
    const planObj = snapshot?.viewObjects?.find((item) => item.id === planRef?.id && item.version === planRef?.version)
      || snapshot?.viewObjects?.find((item) => item.id === planRef?.id)
    const summaryLines = summarizePlanArtifactForPrompt(planObj)
    const version = planRef?.version ?? args.planVersion ?? 1
    const title = planRef?.title || planRef?.id || '当前计划'
    const detail = [
      `计划：${planRef?.type || 'blueprint'}:${planRef?.id || args.planId}@v${version}`,
      ...summaryLines,
      '如已在对话卡片或团队页确认，可直接选择“暂缓”。',
    ].join('\n')
    const approveLabel = `确认开工 v${version}`
    const deferLabel = '暂缓 / 在聊天卡片或团队页确认'
    try {
      const response = await ask({
        agent: exec.agent,
        signal: exec.signal,
        questions: [{
          id: 'confirm-plan-kickoff',
          question: `是否确认按计划「${title}」(v${version}) 开工？`,
          detail,
          options: [{ label: approveLabel }, { label: deferLabel }],
        }],
      })
      if (disposing || exec.signal?.aborted) {
        return withContinuation({ ...out, result: runtime.getStatus(activeTeamSessionId).planGate ?? out.result, confirmedViaNativePrompt: false })
      }
      const answer = response?.answers?.find((entry) => entry.id === 'confirm-plan-kickoff')
      const pickedApprove = answer?.selected?.length === 1 && answer.selected[0] === approveLabel && !answer.custom
      if (!pickedApprove) {
        return withContinuation({ ...out, result: runtime.getStatus(activeTeamSessionId).planGate ?? out.result, confirmedViaNativePrompt: false })
      }
      const approved = runtime.approvePlan(
        activeTeamSessionId,
        { proposalId, commandId: `native-plan-${proposalId}` },
        { kind: 'user', id: 'local-owner' },
      )
      return withContinuation({
        ...out,
        result: approved.ok ? approved.planGate : (runtime.getStatus(activeTeamSessionId).planGate ?? out.result),
        confirmedViaNativePrompt: Boolean(approved.ok),
      })
    } catch (error) {
      if (error?.code !== 'ASK_CANCELLED') ctx.logger?.warn?.(error)
      return withContinuation({ ...out, result: runtime.getStatus(activeTeamSessionId).planGate ?? out.result, confirmedViaNativePrompt: false })
    } finally {
      openPlanApprovals.delete(proposalId)
    }
  }

  const openReviewExemptions = new Set()
  const requestReviewExemption = async (input, exec, { teamSessionId }) => {
    const prepared = runtime.prepareReviewExemption(teamSessionId, input)
    if (!prepared.ok || prepared.replayed) return prepared
    const ask = askUserQuestions
    if (!ask || !exec?.agent) return { ok: false, code: 'host_unavailable', detail: 'DSH userQuestions is unavailable' }
    const { request } = prepared
    const key = JSON.stringify([teamSessionId, request.taskId])
    if (openReviewExemptions.has(key)) return { ok: false, code: 'precondition_failed', detail: 'a review exemption confirmation is already open for this task' }
    openReviewExemptions.add(key)
    const questionId = 'confirm-task-review-exemption'
    const approveLabel = '豁免本任务的强制独立审查'
    try {
      let response
      try {
        response = await ask({
          agent: exec.agent, signal: exec.signal,
          questions: [{
            id: questionId,
            question: `是否豁免「${request.title}」的强制独立审查？`,
            detail: [
              `任务 ${request.taskId} · 策略 ${request.policyVersion}`,
              `申请理由：${request.reason}`,
              '仅适用于本任务。首次派发时冻结决定，交付证据仍须核对。',
            ].join('\n'),
            options: [{ label: '保留强制审查' }, { label: approveLabel }],
          }],
        })
      } catch (error) {
        return { ok: false, code: 'precondition_failed', detail: error.message }
      }
      if (disposing || exec.signal?.aborted) return { ok: false, code: 'precondition_failed', detail: 'the confirmation was interrupted' }
      const answer = response.answers.find((entry) => entry.id === questionId)
      const approved = answer?.selected.length === 1 && answer.selected[0] === approveLabel && !answer.custom
      return runtime.settleReviewExemption(teamSessionId, request, approved, { kind: 'user', id: 'local-owner' })
    } finally {
      openReviewExemptions.delete(key)
    }
  }

  const openMemberQuestions = new Set()
  const askMemberQuestionUser = async ({ requestId }, exec, scope) => {
    const { teamSessionId } = scope
    const request = runtime.getStatus(teamSessionId).requests.find((entry) => entry.requestId === requestId && entry.kind === 'question')
    if (!request || request.status !== 'pending') return { ok: false, code: 'precondition_failed', detail: 'member question is no longer pending in this run' }
    if (!askUserQuestions || !exec?.agent || openMemberQuestions.has(requestId)) {
      return { ok: false, code: 'precondition_failed', detail: 'Native question unavailable or already open. The pending question is also available in the task inspector.' }
    }
    openMemberQuestions.add(requestId)
    try {
      const response = await askUserQuestions({
        agent: exec.agent, signal: exec.signal,
        questions: request.payload.questions.map((question) => ({
          id: question.id, question: question.question,
          detail: `${request.taskId} · ${request.memberId}`,
          ...(question.options?.length ? { options: question.options.map(({ label, description }) => ({ label, ...(description ? { description } : {}) })) } : {}),
        })),
      })
      const answers = Object.fromEntries(response.answers.map(({ id, selected, custom }) => [id, {
        answers: [...selected, ...(custom?.trim() ? [custom.trim()] : [])],
      }]))
      return await runner.answer(teamSessionId, { requestId, commandId: `user-question-${requestId}`, answer: { answers } }, { kind: 'user', id: 'local-owner' })
    } catch (error) {
      return { ok: false, code: 'precondition_failed', detail: error.message }
    } finally {
      openMemberQuestions.delete(requestId)
    }
  }

  const memberDutiesRequest = (input, write) => {
    const scope = scopeOf(ctx.sessions.get(String(input.sessionId ?? '')))
    if (!scope || scope.roleKind !== 'commander') {
      return { ok: false, code: 'unauthorized', detail: '请在指挥者会话中管理成员职责。' }
    }
    return write
      ? runtime.updateMemberDuties(scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
      : runtime.readMemberDuties(scope.teamSessionId, input.memberId)
  }

  const detectTaskRequiresWrite = (task, input) => {
    if (input?.sandbox === 'workspace-write' || input?.sandbox === 'danger-full-access') return true
    if (input?.sandbox === 'read-only') return false
    const reqCaps = Array.isArray(task?.requiredCapabilities) ? task.requiredCapabilities : []
    if (reqCaps.some((c) => ['write', 'edit', 'shell', 'exec'].includes(String(c).toLowerCase()))) return true
    const text = `${task?.title ?? ''} ${task?.objective ?? ''}`
    return /\b(write|create|edit|modify|fix|implement|patch|delete|run|execute)\b|写入|修改|编辑|创建|新建|修复|实现|运行|执行/i.test(text)
  }

  const validateSkillAndTaskContextInput = (input) => {
    if (input.taskContext !== undefined && typeof input.taskContext !== 'string') {
      return { ok: false, error: { ok: false, code: 'invalid', detail: 'taskContext must be a string' } }
    }
    if (typeof input.taskContext === 'string' && Buffer.byteLength(input.taskContext, 'utf8') > 16 * 1024) {
      return { ok: false, error: { ok: false, code: 'invalid', detail: 'taskContext exceeds 16 KiB limit' } }
    }
    if (input.skillRefs !== undefined && !Array.isArray(input.skillRefs)) {
      return { ok: false, error: { ok: false, code: 'invalid', detail: 'skillRefs must be an array' } }
    }
    return { ok: true }
  }

  function dispatchBlockReason(target, cap, task, input) {
    if (target.source !== 'hosted') {
      return connectorRegistry.get(target.connector) ? null : `外部成员 "${target.id}" 所需连接器 "${target.connector}" 未注册`
    }
    if (cap.coordinatorOnly || cap.profile === 'none') {
      return `成员 "${target.id}" 配置为仅协调（toolProfile: none），不具备任务执行能力，拒绝派发`
    }
    if (['preset_unreloaded', 'preset_stale', 'preset_broken'].includes(cap.verificationStatus)) {
      return `成员 "${target.id}" 预设工具能力未就绪（${cap.verificationStatus}${cap.detail ? `: ${cap.detail}` : ''}），请先在设置 -> Concerto 重新生成并重载`
    }
    if (!cap.fileWrite && detectTaskRequiresWrite(task, input)) {
      return `成员 "${target.id}" 当前仅具备只读权限（toolProfile: readonly），无法执行写入/修改/执行类任务，拒绝静默回退`
    }
    return null
  }

  function dispatchResponse(result) {
    // Recording the blockage succeeded; the requested dispatch still failed.
    return result.ok && result.state === 'blocked'
      ? { ...result, ok: false, code: 'capability_mismatch', detail: result.blockedReason }
      : result
  }

  const tasks = {
    async dispatch(input, caller = { kind: 'http_api', actorId: 'local-owner' }) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      const { scope, metadata } = owned
      const members = metadata.members
      if (input.member && input.memberId && input.member !== input.memberId) return { ok: false, code: 'invalid', detail: 'member and memberId conflict' }
      for (const field of ['memberId', 'member']) if (input[field] !== undefined && (typeof input[field] !== 'string' || !input[field].trim())) return { ok: false, code: 'invalid', detail: `${field} must be a non-empty string` }
      const extraValid = validateSkillAndTaskContextInput(input)
      if (!extraValid.ok) return extraValid.error
      const wantedMember = input.memberId ?? input.member ?? ''
      const target = wantedMember ? members.find((m) => m.id === wantedMember)
        : members.find((m) => m.roleKind === 'worker' && (!input.connector || m.connector === input.connector))
      if (!target) return { ok: false, code: 'invalid', detail: 'member is not in the frozen team configuration' }
      if (target.roleKind !== 'worker') return { ok: false, code: 'unsupported', detail: 'use dispatch_review to dispatch a reviewer member' }
      if (input.connector && target.connector !== input.connector) return { ok: false, code: 'invalid', detail: 'connector does not match member' }

      const worktreeMode = input.worktreeMode ?? 'auto'
      if (!['auto', 'worktree', 'isolated_clean', 'shared'].includes(worktreeMode)) {
        return { ok: false, code: 'invalid', detail: 'worktreeMode must be auto | worktree | isolated_clean | shared' }
      }

      const foundTask = runtime.getTask({ taskId: input.taskId }, scope.teamSessionId)
      if (!foundTask.ok) return foundTask

      const liveCmdCwd = resolveSessionCwd(ctx.sessions.get(scope.sessionId))
      const resolvedCwd = (typeof input.cwd === 'string' && input.cwd.trim() !== '')
        ? input.cwd.trim()
        : (foundTask.task.retryCwd || metadata.cwd || liveCmdCwd || defaultCwd)
      const requestedWriteScope = resolvedCwd
        ? (process.platform === 'win32' ? resolve(resolvedCwd).toLowerCase() : resolve(resolvedCwd))
        : null

      const defaultExternalSandbox = target.roleKind === 'worker' && detectTaskRequiresWrite(foundTask.task, input)
        ? 'workspace-write'
        : 'read-only'
      const resolvedSandbox = target.source === 'hosted'
        ? (input.sandbox ?? 'read-only')
        : (input.sandbox ?? defaultExternalSandbox)
      const requestedSandbox = input.sandbox ?? (target.source === 'hosted' ? 'host-controlled' : resolvedSandbox)

      const replayPrecheck = input.commandId
        ? runtime.replayCommand(scope.teamSessionId, input.commandId, {
            type: 'dispatch',
            taskId: input.taskId,
            memberId: target.id,
            connectorId: target.source === 'hosted' ? `hosted:${target.id}` : target.connector,
            sandbox: requestedSandbox,
            approvals: input.approvals ?? 'ask',
            writeScope: requestedWriteScope,
            ...(input.worktreeMode !== undefined ? { worktreeMode: input.worktreeMode } : {}),
            taskContext: typeof input.taskContext === 'string' && input.taskContext.trim() !== '' ? input.taskContext.trim() : null,
            requestedSkillRefs: input.skillRefs ?? null,
          })
        : null
      if (replayPrecheck) return dispatchResponse(replayPrecheck)

      const snapshot = runtime.getStatus(scope.teamSessionId)
      const cap = inspectMemberCapabilitySync(scope.teamId, target, snapshot)
      const blockedReason = dispatchBlockReason(target, cap, foundTask.task, input)
      const skillResolved = blockedReason ? null : runtime.resolveSkillRefsForDispatch(scope.teamSessionId, input.skillRefs, {
        roleKind: target.roleKind, capabilities: cap,
      })
      if (skillResolved && !skillResolved.ok) return skillResolved

      let effectiveCwd = resolvedCwd
      let preboundExecutionId
      let worktree = null
      let worktreeFallback = null

      if (!blockedReason) {
        const usingQuarantinedRetry = Boolean(!input.cwd && foundTask.task.retryCwd &&
          snapshot.executions?.some((e) => e.state === 'unknown' && e.quarantined))
        if (usingQuarantinedRetry) {
          worktree = foundTask.task.retryWorktree ? structuredClone(foundTask.task.retryWorktree) : null
        } else {
          const isWriteExecution = target.source === 'hosted'
            ? (cap.fileWrite && input.sandbox !== 'read-only' && detectTaskRequiresWrite(foundTask.task, input))
            : (['workspace-write', 'danger-full-access'].includes(resolvedSandbox) ||
              (resolvedSandbox !== 'read-only' && detectTaskRequiresWrite(foundTask.task, input)))
          if (worktreeMode === 'shared') {
            const gitInfo = resolvedCwd ? inspectGitWorkspace(resolvedCwd) : null
            if (gitInfo?.isGit) {
              worktreeFallback = {
                reason: 'explicit_shared',
                detail: '使用共享目录顺序执行（未创建独立 Worktree）',
                repositoryRoot: gitInfo.repositoryRoot,
              }
            }
          } else if (isWriteExecution || worktreeMode === 'worktree' || worktreeMode === 'isolated_clean') {
            const ready = runtime.checkDispatchReady(scope.teamSessionId, input.taskId, {
              memberId: target.id,
              connectorId: target.source === 'hosted' ? `hosted:${target.id}` : target.connector,
              sandbox: target.source === 'hosted' ? 'host-controlled' : resolvedSandbox,
              requestedSandbox,
              approvals: input.approvals ?? 'ask',
              writeScope: requestedWriteScope,
            }, { checkWriteScope: false })
            if (!ready.ok) return ready
            const gitInfo = inspectGitWorkspace(resolvedCwd)
            if (!gitInfo.isGit || !gitInfo.available) {
              if (worktreeMode === 'worktree') {
                return { ok: false, code: 'precondition_failed', detail: gitInfo.detail || 'target directory is not an available Git repository' }
              }
              worktreeFallback = {
                reason: gitInfo.reason || 'not_git_repository',
                detail: gitInfo.detail || '',
                ...(gitInfo.repositoryRoot ? { repositoryRoot: gitInfo.repositoryRoot } : {}),
              }
            } else if (gitInfo.dirty && worktreeMode !== 'isolated_clean') {
              const warned = runtime.recordWorktreeDirtyWarning(scope.teamSessionId, input.taskId, gitInfo, {
                kind: caller?.kind || 'http_api',
                id: caller?.actorId || scope.memberId || 'local-owner',
              })
              if (!warned.ok) return warned
              return {
                ok: false,
                code: 'worktree_dirty',
                detail: warned.worktreeWarning.detail,
                worktreeWarning: warned.worktreeWarning,
              }
            } else {
              preboundExecutionId = `exec-${randomUUID()}`
              const hostWorktrees = safeGet('worktrees')
              const wt = hostWorktrees?.concertoVerified === true
                ? await createGitWorktreeWithHost({
                    repositoryRoot: gitInfo.repositoryRoot,
                    baseCommit: gitInfo.baseCommit,
                    taskId: input.taskId,
                    executionId: preboundExecutionId,
                    hostWorktrees,
                  })
                : createGitWorktree({
                    repositoryRoot: gitInfo.repositoryRoot,
                    baseCommit: gitInfo.baseCommit,
                    taskId: input.taskId,
                    executionId: preboundExecutionId,
                  })
              if (wt.ok && (!requestedWriteScope || !scopesOverlap(requestedWriteScope, wt.worktree.path))) {
                effectiveCwd = wt.worktree.path
                worktree = {
                  ...wt.worktree,
                  ...(gitInfo.dirty ? { dirtySourceSkipped: true } : {}),
                }
              } else {
                if (wt.ok) removeGitWorktree(wt.worktree)
                if (worktreeMode === 'worktree') {
                  return { ok: false, code: 'precondition_failed', detail: wt.ok ? 'worktree overlaps locked workspace' : (wt.detail || 'git worktree creation failed') }
                }
                worktreeFallback = {
                  reason: wt.ok ? 'worktree_overlaps_workspace' : (wt.reason || 'worktree_create_failed'),
                  detail: wt.ok ? 'temporary worktree overlaps source workspace' : (wt.detail || ''),
                  repositoryRoot: gitInfo.repositoryRoot,
                }
              }
            }
          } else {
            worktreeFallback = {
              reason: 'read_only_task',
              detail: '只读任务共享工作目录，不创建写入 Worktree',
            }
          }
        }
      }

      const out = runner.dispatch({
        scope: scope.teamSessionId,
        taskId: input.taskId,
        ...(preboundExecutionId ? { executionId: preboundExecutionId } : {}),
        memberId: target.id,
        roleKind: target.roleKind,
        identity: { roleId: target.roleId ?? target.roleKind, source: target.source, toolProfile: cap.profile },
        memberCapabilities: cap,
        commandId: input.commandId,
        cwd: effectiveCwd,
        requestedWriteScope,
        ...(input.worktreeMode !== undefined ? { worktreeMode: input.worktreeMode } : {}),
        ...(worktree ? { worktree } : {}),
        ...(worktreeFallback ? { worktreeFallback } : {}),
        sandbox: resolvedSandbox,
        requestedSandbox,
        approvals: input.approvals ?? 'ask',
        ...(blockedReason ? { dispatchBlockReason: blockedReason } : {}),
        ...(input.skillRefs !== undefined ? { requestedSkillRefs: input.skillRefs } : {}),
        ...(skillResolved?.deliveries.length > 0 ? { skillDeliveries: skillResolved.deliveries } : {}),
        ...(typeof input.taskContext === 'string' && input.taskContext.trim() !== '' ? { taskContext: input.taskContext.trim() } : {}),
        dispatchedBy: {
          kind: caller?.kind || 'http_api',
          actorId: caller?.actorId || scope.memberId || 'local-owner',
          ...(caller?.callId ? { callId: caller.callId } : {}),
        },
        ...(target.source === 'hosted'
          ? { hosted: { agentPreset: `${scope.teamId}--${target.id}`, memberId: target.id } }
          : (target.source === 'api'
            ? { apiMember: { baseUrl: target.baseUrl, apiKey: target.apiKey, model: target.model } }
            : { connector: target.connector })),
      })
      if (worktree && (!out?.ok || !out?.executionId)) {
        removeGitWorktree(worktree)
      }
      return dispatchResponse(out)
    },
    async dispatchReview(input, caller = { kind: 'http_api', actorId: 'local-owner' }, automatic = null) {
      const owned = automatic ?? ownedRun(input)
      if (!automatic && !owned.ok) return owned
      const { scope, metadata } = owned
      const members = metadata.members
      for (const field of ['memberId', 'member']) if (input[field] !== undefined && (typeof input[field] !== 'string' || !input[field].trim())) return { ok: false, code: 'invalid', detail: `${field} must be a non-empty string` }
      const extraValid = validateSkillAndTaskContextInput(input)
      if (!extraValid.ok) return extraValid.error
      const snapshot = runtime.getStatus(scope.teamSessionId)
      const capabilitiesFor = (member) => inspectMemberCapabilitySync(scope.teamId, member, snapshot, 'reviewer')
      let autoTarget
      if (automatic) {
        const candidates = members.filter((member) => member.roleKind === 'reviewer' && member.id !== automatic.pending.memberId)
          .filter((member) => {
            if (member.source !== 'hosted') return connectorRegistry.get(member.connector)?.capabilities.dynamicTools === true
            const cap = capabilitiesFor(member)
            return cap.profile === 'readonly' && cap.fileRead && !cap.fileWrite &&
              cap.actualTools.includes('read') && !cap.actualTools.some((tool) => ['write', 'edit', 'apply_patch', 'pwsh', 'bash'].includes(tool)) &&
              !['preset_unreloaded', 'preset_stale', 'preset_broken'].includes(cap.verificationStatus)
          })
        if (candidates.length !== 1) return { ok: false, code: 'capability_mismatch', detail: candidates.length
          ? '有多位可用的独立审查成员，请由指挥者选择。' : '没有可自动派发的只读独立审查成员，请检查团队配置。' }
        autoTarget = candidates[0]
      }
      const wantedMember = input.memberId ?? input.member ?? ''
      const target = autoTarget ?? (wantedMember
        ? members.find((m) => m.id === wantedMember)
        : members.find((m) => m.roleKind === 'reviewer'))
      if (!target) return { ok: false, code: 'invalid', detail: 'reviewer member is not in the frozen team configuration' }
      if (target.roleKind !== 'reviewer') return { ok: false, code: 'invalid', detail: `member "${target.id}" is ${target.roleKind}, not reviewer` }

      const foundTask = runtime.getTask({ taskId: input.taskId }, scope.teamSessionId)
      if (!foundTask.ok) return foundTask

      const cap = capabilitiesFor(target)
      if (target.source === 'hosted') {
        if (cap.coordinatorOnly || cap.profile === 'none') {
          return { ok: false, code: 'capability_mismatch', detail: `审查成员 "${target.id}" 配置为仅协调（toolProfile: none），无法读取工作区证据` }
        }
        if (['preset_unreloaded', 'preset_stale', 'preset_broken'].includes(cap.verificationStatus)) {
          return { ok: false, code: 'capability_mismatch', detail: `审查成员 "${target.id}" 预设未就绪（${cap.verificationStatus}），请先在设置 -> Concerto 重新生成并重载` }
        }
      } else if (target.source === 'api') {
        if (!target.baseUrl || !target.model) {
          return { ok: false, code: 'capability_mismatch', detail: `自定义 API 审查成员 "${target.id}" 缺少 baseUrl 或 model` }
        }
      } else if (!connectorRegistry.get(target.connector)) {
        return { ok: false, code: 'capability_mismatch', detail: `外部审查成员 "${target.id}" 所需连接器 "${target.connector}" 未注册` }
      }

      const skillResolved = runtime.resolveSkillRefsForDispatch(scope.teamSessionId, input.skillRefs, {
        roleKind: 'reviewer',
        capabilities: cap,
      })
      if (!skillResolved.ok) return skillResolved

      const liveCmdCwd = resolveSessionCwd(ctx.sessions.get(scope.sessionId))
      const targetExecId = automatic?.pending.executionId ?? foundTask.task.executionId ?? null
      const targetWorkerExec = targetExecId
        ? (snapshot.executions ?? []).find((e) => e.executionId === targetExecId)
        : null
      const resolvedCwd = foundTask.task.retryCwd || automatic?.pending.cwd || targetWorkerExec?.worktree?.path || targetWorkerExec?.writeScope || metadata.cwd || liveCmdCwd || defaultCwd
      const reviewWorktree = foundTask.task.retryCwd
        ? (foundTask.task.retryWorktree ?? targetWorkerExec?.worktree ?? null)
        : (targetWorkerExec?.worktree ?? foundTask.task.worktree ?? null)
      const reviewFallback = targetWorkerExec?.worktreeFallback ?? foundTask.task.worktreeFallback ?? null

      return runner.dispatchReview({
        scope: scope.teamSessionId,
        taskId: input.taskId,
        memberId: target.id,
        identity: { roleId: target.roleId ?? 'reviewer', source: target.source, toolProfile: cap.profile },
        memberCapabilities: cap,
        commandId: input.commandId,
        ...(automatic ? { targetExecutionId: automatic.pending.executionId, targetResultId: automatic.pending.resultId } : {}),
        cwd: resolvedCwd,
        ...(reviewWorktree ? { worktree: reviewWorktree } : {}),
        ...(reviewFallback ? { worktreeFallback: reviewFallback } : {}),
        approvals: input.approvals ?? 'ask',
        ...(input.skillRefs !== undefined ? { requestedSkillRefs: input.skillRefs } : {}),
        ...(skillResolved.deliveries.length > 0 ? { skillDeliveries: skillResolved.deliveries } : {}),
        ...(typeof input.taskContext === 'string' && input.taskContext.trim() !== '' ? { taskContext: input.taskContext.trim() } : {}),
        dispatchedBy: {
          kind: caller?.kind || 'http_api',
          actorId: caller?.actorId || scope.memberId || 'local-owner',
          ...(caller?.callId ? { callId: caller.callId } : {}),
        },
        ...(target.source === 'hosted'
          ? { hosted: { agentPreset: `${scope.teamId}--${target.id}`, memberId: target.id } }
          : (target.source === 'api'
            ? { apiMember: { baseUrl: target.baseUrl, apiKey: target.apiKey, model: target.model } }
            : { connector: target.connector })),
      })
    },
    cancel(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      if (input.executionId !== undefined && (typeof input.executionId !== 'string' || !input.executionId.trim())) return { ok: false, code: 'invalid', detail: 'executionId must be a non-empty string' }
      return runner.cancel(owned.scope.teamSessionId, input.taskId, { kind: 'user', id: 'local-owner' }, input)
    },
    unblock(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      return runtime.unblockTask(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
    },
    review(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      const scope = owned.scope.teamSessionId
      const access = runtime.authorizeTask(scope, input, owned.scope, 'submit_review')
      if (!access.ok) return access
      if (input.verdict === 'fail' && (typeof input.reason !== 'string' || !input.reason.trim())) {
        return { ok: false, code: 'invalid', detail: 'review fail reason required' }
      }
      const reason = typeof input.reason === 'string' && input.reason.trim()
        ? input.reason.trim()
        : (input.verdict === 'pass' ? '用户确认验收通过' : '')
      const out = runtime.submitReview({ ...input, reason }, scope, { kind: 'user', id: 'local-owner' })
      if (out.ok && !out.replayed) {
        const snapshot = runtime.getStatus(scope)
        const sessionId = owned.scope.sessionId
        const controller = safeGet('sessionController')
        if (!disposing && snapshot && !snapshot.goalCompletion && !snapshot.paused && sessionId && ctx.sessions?.get?.(sessionId) && typeof controller?.prompt === 'function') {
          const wakeKey = `${scope}:user-review:${input.commandId || out.reviewId || input.taskId}`
          if (!settledCommanderWakes.has(wakeKey)) {
            settledCommanderWakes.add(wakeKey)
            queueMicrotask(async () => {
              try {
                if (disposing) return
                await controller.prompt({
                  requestId: `req-user-review-${input.commandId || out.reviewId || input.taskId}`,
                  sessionId,
                  mode: 'queue',
                  content: [{ type: 'text', text: `[Concerto 用户验收结论] 任务 ${input.taskId} 已由用户提交验收结论（verdict=${input.verdict}，taskState=${out.state}）。请调用 get_team_status，同步勾选计划清单并刷新 update_team_view，然后继续派发后续任务或调用 submit_decision(finish_goal) 结项。` }],
                }, new AbortController().signal)
              } catch (error) {
                ctx.logger?.warn?.(error)
              }
            })
          }
        }
      }
      return out
    },
    reviewFeedback(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      return runtime.reviewFeedback(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
    },
    answer(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      return runner.answer(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
    },
    async adjudicate(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      return executeAdjudication(owned.scope.teamSessionId, input, { kind: 'user', id: 'local-owner' })
    },
  }

  const recovery = {
    listUnknown() {
      return runtime.listRecoveryRuns().map((row) => ({
        ...row,
        originalCommanderSessionAlive: Boolean(row.commanderSessionId && ctx.sessions?.get?.(row.commanderSessionId)),
        hostedAgentAlive: row.nativeSessionRef?.backend === 'hosted' && row.nativeSessionRef?.sessionId
          ? Boolean(ctx.agents?.get?.(String(row.nativeSessionRef.sessionId)))
          : false,
        lastReconcile: reconcileCache.get(row.executionId) ?? null,
      }))
    },
    async reconcile(input = {}) {
      const teamSessionId = typeof input.teamSessionId === 'string' && input.teamSessionId ? input.teamSessionId : ''
      const taskId = typeof input.taskId === 'string' && input.taskId ? input.taskId : ''
      const executionId = typeof input.executionId === 'string' && input.executionId ? input.executionId : ''
      if (!teamSessionId || !executionId) return { ok: false, code: 'invalid', detail: 'teamSessionId and executionId required' }
      if (!runtime.listRuns().some((r) => r.teamSessionId === teamSessionId)) return { ok: false, code: 'not_found', detail: 'persisted team run not found' }
      const snap = runtime.getStatus(teamSessionId)
      const ex = (snap.executions ?? []).find((e) => e.executionId === executionId && (!taskId || e.taskId === taskId))
      if (!ex) return { ok: false, code: 'not_found', detail: 'execution not found' }
      if (ex.state !== 'unknown') return { ok: false, code: 'precondition_failed', detail: `execution is in state ${ex.state}` }
      const rec = await verifyBackendStopped(ex)
      const recorded = { ...rec, checkedAt: new Date().toISOString() }
      reconcileCache.set(executionId, recorded)
      return { ok: true, teamSessionId, taskId: ex.taskId, executionId, ...recorded }
    },
    async adjudicate(input = {}) {
      if (typeof input?.commandId !== 'string' || !input.commandId) return { ok: false, code: 'invalid', detail: 'commandId required' }
      let scope = typeof input.teamSessionId === 'string' && input.teamSessionId ? input.teamSessionId : ''
      if (!scope && typeof input.executionId === 'string' && input.executionId) {
        const hit = runtime.listRecoveryRuns().find((r) => r.executionId === input.executionId)
        if (hit) scope = hit.teamSessionId
      }
      if (!scope && typeof input.sessionId === 'string' && input.sessionId) {
        const bound = scopeOf(ctx.sessions.get(input.sessionId))
        if (!bound || bound.roleKind !== 'commander') return { ok: false, code: 'unauthorized', detail: 'a managed commander session is required' }
        scope = bound.teamSessionId
      }
      if (!scope || !runtime.listRuns().some((r) => r.teamSessionId === scope)) {
        return { ok: false, code: 'not_found', detail: 'persisted team run not found in local runtime' }
      }
      return executeAdjudication(scope, input, { kind: 'user', id: 'local-owner-recovery' })
    },
  }

  const listRuns = () => runtime.listRuns().map((r) => ({
    ...r,
    commanderSessionAlive: Boolean(r.commanderSessionId && ctx.sessions?.get?.(r.commanderSessionId)),
  }))

  const listProjects = (runs = runtime.listRuns()) => {
    const projects = new Map()
    for (const run of runs.toReversed()) {
      if (!run.projectId || !run.commanderSessionId) continue
      const selected = projects.get(run.projectId)
      if (!selected || (selected.completed && !run.completed)) projects.set(run.projectId, run)
    }
    return [...projects.values()]
  }

  const createTeamSession = async (record, input, project = null) => {
    const controller = safeGet('sessionController')
    if (!controller || typeof controller.create !== 'function') {
      return { ok: false, code: 'host_unavailable', detail: 'sessionController unavailable' }
    }
    const wsReg = safeGet('workspaceRegistry')
    const cwd = (typeof input.cwd === 'string' && input.cwd.trim()) || project?.cwd || ''
    let ws = null
    if (typeof input.workspaceId === 'string' && input.workspaceId.trim() !== '') {
      ws = wsReg?.get?.(input.workspaceId.trim()) ?? null
      if (!ws && wsReg) return { ok: false, code: 'not_found', detail: `workspace "${input.workspaceId}" not found` }
    } else if (cwd) {
      ws = await ensureWorkspaceForCwd(cwd)
      if (!ws && wsReg && typeof wsReg.create === 'function') {
        return { ok: false, code: 'invalid', detail: `目录不可用作工作区：${cwd}` }
      }
    } else if (typeof wsReg?.list === 'function') {
      const existing = wsReg.list()
      if (Array.isArray(existing) && existing.length > 0) ws = existing[0]
    }
    const fallbackCwd = cwd || defaultCwd || undefined
    try {
      const createReq = ws?.id
        ? { workspaceId: ws.id, agentPreset: record.id }
        : { ...(fallbackCwd ? { cwd: fallbackCwd } : {}), agentPreset: record.id }
      const sessionCwd = ws?.path ?? fallbackCwd ?? null
      const launch = { record, projectId: project?.projectId, cwd: sessionCwd, workspaceId: ws?.id, creating: true }
      // DSH can evaluate tool scope during create, before it returns the new session ID.
      const created = await commanderLaunch.run(launch, async () => {
        try { return await controller.create(createReq) } finally { launch.creating = false }
      })
      const sessionId = created?.sessionId ?? created?.value?.sessionId ?? created?.session?.id
      if (!sessionId) return { ok: false, code: 'create_failed', detail: JSON.stringify(created ?? null) }
      const sid = String(sessionId)
      const teamSessionId = `run-${sid}`
      const projectId = project?.projectId ?? `project-${sid}`
      const bound = runtime.bindSession(sid, teamSessionId, commanderMetadata(record, projectId, sessionCwd, ws?.id))
      if (!bound.ok) return bound
      commanderHostSessionByRun.set(teamSessionId, sid)
      if (ws?.attachSession && !(ws.sessionIds ?? []).includes(sid)) {
        try { await ws.attachSession(sid) } catch { /* ignore */ }
      }
      if (typeof input.initialPrompt === 'string' && input.initialPrompt.trim() !== '' && typeof controller.prompt === 'function') {
        await controller.prompt({
          requestId: `req-${randomUUID()}`,
          sessionId: sid,
          mode: 'queue',
          content: [{ type: 'text', text: input.initialPrompt.trim() }],
        })
      }
      return { ok: true, sessionId: sid, teamSessionId, projectId, teamId: record.id, workspaceId: ws?.id ?? null, cwd: sessionCwd }
    } catch (error) {
      return { ok: false, code: 'launch_failed', detail: String(error?.message || error) }
    }
  }

  const launchTeamSession = async (input = {}) => {
    const teamId = typeof input?.teamId === 'string' ? input.teamId.trim() : ''
    if (!teamId) return { ok: false, code: 'invalid', detail: 'teamId required' }
    const record = store.getTeam(teamId)
    const projectId = input.projectId
    if (projectId === undefined) {
      return record ? createTeamSession(record, input) : { ok: false, code: 'not_found', detail: `team "${teamId}" not found` }
    }
    if (typeof projectId !== 'string' || !projectId.trim()) {
      return { ok: false, code: 'invalid', detail: 'projectId must identify an existing project' }
    }
    const project = listProjects().find((run) => run.projectId === projectId)
    if (!project) return { ok: false, code: 'not_found', detail: '找不到所选项目' }
    if (!project.completed) {
      return {
        ok: true, resumed: true, projectId, teamId: project.teamId,
        sessionId: project.commanderSessionId, teamSessionId: project.teamSessionId,
        cwd: project.cwd, workspaceId: project.workspaceId,
      }
    }
    if (!record) return { ok: false, code: 'not_found', detail: `team "${teamId}" not found` }
    if (startingProjects.has(projectId)) return { ok: false, code: 'conflict', detail: '项目正在启动，请稍后再试' }
    startingProjects.add(projectId)
    try { return await createTeamSession(record, input, project) } finally { startingProjects.delete(projectId) }
  }

  const revealSession = async (input = {}) => {
    const requestedRun = typeof input?.teamSessionId === 'string' && input.teamSessionId ? input.teamSessionId : ''
    let sessionId = typeof input?.sessionId === 'string' && input.sessionId ? input.sessionId : ''
    let run = null
    if (requestedRun) {
      run = runtime.listRuns().find((r) => r.teamSessionId === requestedRun) ?? null
      if (!sessionId && run?.commanderSessionId) sessionId = run.commanderSessionId
    } else if (sessionId) {
      const bound = runtime.getBinding(sessionId)
      if (bound) run = runtime.listRuns().find((r) => r.teamSessionId === bound.teamSessionId) ?? null
    }
    if (!sessionId) return { ok: false, code: 'not_found', detail: 'sessionId or teamSessionId required' }
    let attachedWorkspaceId = run?.workspaceId ?? null
    const targetCwd = run?.cwd ?? null
    if (targetCwd) {
      const ws = await ensureWorkspaceForCwd(targetCwd)
      if (ws?.id) {
        attachedWorkspaceId = ws.id
        if (typeof ws.attachSession === 'function' && !(ws.sessionIds ?? []).includes(sessionId)) {
          try { await ws.attachSession(sessionId) } catch { /* already attached or archival state */ }
        }
      }
    }
    return {
      ok: true,
      sessionId,
      teamSessionId: run?.teamSessionId ?? (requestedRun || `run-${sessionId}`),
      workspaceId: attachedWorkspaceId,
      cwd: targetCwd,
      live: Boolean(ctx.sessions?.get?.(sessionId)),
    }
  }
  /** 上次成功安装的 hash；用于「未变不装」。 */
  let lastInstalledHash = null
  let pendingBundleOperation = Promise.resolve()

  // 配置保存和宿主重载使用同一个 bundle 目录，写入及读回校验需要串行。
  const withTeamBundle = (operation) => {
    const result = pendingBundleOperation.then(operation)
    pendingBundleOperation = result.catch(() => {})
    return result
  }

  // 生成：只写工作区文件，不安装。
  const generate = () => withTeamBundle(async () => {
    if (!teamsBundleDir) {
      return { ok: false, errors: [{ code: 'invalid', detail: 'teamsBundleDir not configured' }] }
    }
    const built = buildTeamBundleFiles(store.allTeams())
    if (!built.ok) return built
    try {
      await writeTeamBundle(teamsBundleDir, built.files)
      return { ok: true, dir: teamsBundleDir, hash: built.hash }
    } catch (error) {
      return { ok: false, expectedHash: built.hash, errors: [{ code: 'precondition_failed', detail: error.message }] }
    }
  })

  // 重载：唯一有副作用的动作。固定 spec、不传 approvedBuilds、hash 校验。
  const reload = (expectedHash) => withTeamBundle(async () => {
    if (!teamsBundleDir) return { status: 400, body: { code: 'invalid', detail: 'teamsBundleDir not configured' } }

    const teams = store.allTeams()
    const built = buildTeamBundleFiles(teams)
    if (!built.ok) return { status: 400, body: { code: 'invalid', details: built.errors } }

    if (expectedHash !== built.hash) {
      return {
        status: 409,
        body: { code: 'conflict', detail: `expected ${String(expectedHash)}, current ${built.hash}` },
      }
    }

    // 防御：hash 只是我们自己的记忆；bundle 可能被外部移除（插件页/命令行）。
    const bundleName = JSON.parse(built.files['package.json']).name
    try {
      const bundles = await ctx.pluginManager.listBundles()
      const installed = Array.isArray(bundles) && bundles.some((bundle) => bundle?.name === bundleName)
      if (installed && teams.length > 0 && built.hash === lastInstalledHash) {
        return { status: 200, body: { application: 'unchanged', hash: built.hash } }
      }

      await writeTeamBundle(teamsBundleDir, built.files)
      const onDisk = await readTeamBundleFiles(teamsBundleDir, Object.keys(built.files))
      if (onDisk === null || hashFiles(onDisk) !== built.hash) {
        return { status: 500, body: { code: 'invalid', detail: 'generated files did not persist' } }
      }

      // 服务拒绝重复安装已存在的包：先移除再装（官方错误提示即此路径）
      const removal = installed ? await ctx.pluginManager.removeBundle(bundleName) : null
      if (['failed', 'cancelled'].includes(removal?.application)) {
        return { status: 500, body: {
          code: 'precondition_failed',
          detail: removal.error ?? removal.application,
        } }
      }
      if (teams.length === 0) {
        lastInstalledHash = null
        return { status: 200, body: {
          application: installed ? (removal?.application ?? 'unknown') : 'unchanged',
          warnings: removal?.warnings ?? [],
          hash: built.hash,
        } }
      }
      const result = await ctx.pluginManager.installBundle(teamsBundleDir, {
        enabled: true,
        requestId: `concerto-teams-${Date.now()}`,
      })
      const application = result?.application ?? 'unknown'
      // 只有真正 applied 才记住 hash；否则下次还会重试
      if (application === 'applied') lastInstalledHash = built.hash
      return {
        status: 200,
        body: {
          application,
          warnings: result?.warnings ?? [],
          hash: built.hash,
        },
      }
    } catch (e) {
      return { status: 500, body: { code: 'invalid', detail: String(e && e.message ? e.message : e) } }
    }
  })

  /**
   * 开发用 spike：验证第三方插件能否程序化创建「第二个 Hosted Agent」并让它跑一轮。
   * 只接受显式请求；会创建真实会话、产生一次模型调用。
   */
  const spawnSpike = async (input) => {
    const controller = ctx.get('sessionController')
    const agents = ctx.get('agents')
    const sessions = ctx.get('sessions')
    if (!controller || !agents) return { ok: false, code: 'host_unavailable', detail: 'sessionController/agents service missing' }

    const cwd = typeof input?.cwd === 'string' && input.cwd !== '' ? input.cwd : undefined
    const agentPreset = typeof input?.agentPreset === 'string' && input.agentPreset !== '' ? input.agentPreset : 'standard'
    const prompt = typeof input?.prompt === 'string' && input.prompt.trim() !== '' ? input.prompt.trim() : 'Reply with exactly: SPAWN_OK'

    let sessionId
    let agent
    try {
      // 正规路径：sessionController.create 会组合 preset（provider / 账号插件齐全）。
      // 直接 agents.create 不组合，实测模型调用报 TRANSPORT（DeepSeek Messages transport failed）。
      const created = await controller.create({ ...(cwd ? { cwd } : {}), agentPreset })
      sessionId = created?.sessionId ?? created?.value?.sessionId ?? created?.session?.id
      if (!sessionId) return { ok: false, code: 'create_failed', created }

      const promptAbort = new AbortController()
      await controller.prompt({
        requestId: `req-${randomUUID()}`,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      }, promptAbort.signal)
      agent = agents.get(sessionId)
      if (agent?.whenIdle) await agent.whenIdle()
    } catch (error) {
      return {
        ok: false,
        code: 'spawn_failed',
        detail: String(error && error.message ? error.message : error),
        stack: String(error && error.stack ? error.stack : '').split('\n').slice(0, 6),
      }
    }

    const session = sessions?.get(sessionId)
    const liveEvents = hostedEventLog.getEvents(String(sessionId))
    const derived = session && typeof session.deriveMessages === 'function' ? session.deriveMessages() : []
    const replies = []
    for (const event of liveEvents) {
      if (!event || typeof event.type !== 'string' || !event.type.startsWith('assistant')) continue
      const data = event.data ?? {}
      const content = data?.message?.content ?? data?.content
      if (!Array.isArray(content)) continue
      for (const block of content) if (block && block.type === 'text' && typeof block.text === 'string') replies.push(block.text)
    }
    if (replies.length === 0) {
      for (const msg of derived) {
        if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.content)) continue
        for (const block of msg.content) if (block && block.type === 'text' && typeof block.text === 'string') replies.push(block.text)
      }
    }
    return {
      ok: true,
      sessionId: String(sessionId),
      eventCount: liveEvents.length || derived.length,
      reply: replies.length ? replies[replies.length - 1] : null,
      sampleTypes: liveEvents.length > 0
        ? liveEvents.slice(-8).map((e) => e && e.type)
        : derived.slice(-8).map((m) => `derived:${m && m.role}`),
      sampleEvents: liveEvents.slice(-8).map((e) => ({ type: e && e.type, data: JSON.stringify(e && e.data ? e.data : {}).slice(0, 300) })),
    }
  }

  // 只读探针：确认宿主服务可注入（不入库、不安装）
  const probe = async () => {
    const pm = ctx.pluginManager
    const readList = async (name) => {
      try {
        const service = ctx.get(name)
        const value = await service.list()
        return Array.isArray(value) ? value.length : null
      } catch (error) {
        return `error: ${error && error.message ? error.message : error}`
      }
    }
    const inspect = (name) => {
      let service
      try { service = ctx.get(name) } catch { service = undefined }
      if (!service) return { present: false }
      const own = Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter((key) => key !== 'constructor')
      return { present: true, methods: own.sort() }
    }
    const host = {
      agents: { ...inspect('agents'), count: await readList('agents') },
      sessions: { ...inspect('sessions'), count: await readList('sessions') },
      sessionController: inspect('sessionController'),
      sessionStore: inspect('sessionStore'),
    }
    const report = {
      injected: ['webServer', 'pluginManager', 'tools', 'agentPresets', 'agents', 'sessions', 'sessionController'],
      hasService: Boolean(pm),
      apiBase: base,
      teamsBundleDir,
      tools: {
        get_team_status: Boolean(ctx.tools.get('get_team_status')),
        submit_decision: Boolean(ctx.tools.get('submit_decision')),
        dispatch_task: Boolean(ctx.tools.get('dispatch_task')),
        dispatch_review: Boolean(ctx.tools.get('dispatch_review')),
        search_project_context: Boolean(ctx.tools.get('search_project_context')),
        search_experience: Boolean(ctx.tools.get('search_experience')),
        record_experience: Boolean(ctx.tools.get('record_experience')),
        list_skills: Boolean(ctx.tools.get('list_skills')),
        read_skill: Boolean(ctx.tools.get('read_skill')),
        publish_project_skill: Boolean(ctx.tools.get('publish_project_skill')),
        manage_member_duties: Boolean(ctx.tools.get('manage_member_duties')),
        read_project_skill: Boolean(ctx.tools.get('read_project_skill')),
        get_task: Boolean(ctx.tools.get('get_task')),
        report_progress: Boolean(ctx.tools.get('report_progress')),
        submit_result: Boolean(ctx.tools.get('submit_result')),
        submit_review: Boolean(ctx.tools.get('submit_review')),
        publish_view_object: Boolean(ctx.tools.get('publish_view_object')),
        patch_view_object: Boolean(ctx.tools.get('patch_view_object')),
        list_view_objects: Boolean(ctx.tools.get('list_view_objects')),
        read_view_object: Boolean(ctx.tools.get('read_view_object')),
        update_team_view: Boolean(ctx.tools.get('update_team_view')),
      },
      activations: runtime.getActivations(),
      host,
    }
    if (!pm) return { ...report, error: 'pluginManager missing on ctx' }
    try {
      const bundles = await pm.listBundles()
      report.listBundles = {
        ok: true,
        shape: Array.isArray(bundles) ? 'array' : typeof bundles,
        total: Array.isArray(bundles) ? bundles.length : (bundles && typeof bundles === 'object' ? bundles.total ?? null : null),
      }
    } catch (e) {
      report.listBundles = { ok: false, error: String(e && e.message ? e.message : e) }
    }
    return report
  }

  async function promptNonHostedCommander(scope, promptText) {
    const text = typeof promptText === 'string' ? promptText.trim() : ''
    if (!text) return { ok: false, code: 'invalid', detail: 'prompt required' }
    const snapshot = runtime.getStatus(scope.teamSessionId)
    const commander = snapshot?.metadata?.commander
    if (!commander || !['api', 'external'].includes(commander.source)) {
      return { ok: false, code: 'precondition_failed', detail: '当前团队指挥者为 DSH Hosted 模式，请在聊天输入框直接对话' }
    }
    const commanderId = commander.id || snapshot.metadata?.commanderId || 'commander'
    const systemPrompt = buildMemberSystemPrompt({
      memberId: commanderId,
      roleKind: 'commander',
      roleId: commander.roleId || 'commander',
      source: commander.source,
      toolProfile: 'none',
      persona: commander.persona || '',
      capabilities: { profile: 'none', coordinatorOnly: true },
    })
    const onToolCall = (name, args) => executeMemberToolCall(
      runtime,
      {
        sessionId: scope.sessionId,
        teamSessionId: scope.teamSessionId,
        teamId: scope.teamId || snapshot.metadata?.teamId,
        memberId: commanderId,
        roleKind: 'commander',
      },
      name,
      args,
      {
        submitDecision,
        dispatchTask: (input, caller) => tasks.dispatch(input, caller),
        dispatchReview: (input, caller) => tasks.dispatchReview(input, caller),
        inspectTeamCapabilities,
        inspectMemberCapability: inspectMemberCapabilityForScope,
        offerProjectSkill,
        requestReviewExemption,
        askQuestion: runner.askQuestion,
      },
    )
    const onActivity = (act) => {
      runtime.recordActivity(scope.teamSessionId, {
        memberId: commanderId,
        kind: act.kind || 'output',
        summary: act.summary || '',
        ...(act.text ? { text: act.text } : {}),
        ...(act.detail ? { detail: act.detail } : {}),
      })
    }
    runtime.recordActivity(scope.teamSessionId, {
      memberId: commanderId,
      kind: 'message',
      summary: `收到用户指令：${text.slice(0, 120)}`,
      text,
    })

    if (commander.source === 'api') {
      const history = apiCommanderHistoryByRun.get(scope.teamSessionId) ?? []
      const res = await runApiCommanderTurn({
        commander,
        prompt: text,
        history,
        systemPrompt,
        tools: COMMANDER_TOOL_SCHEMAS,
        onToolCall,
        onActivity,
      })
      if (res.ok && Array.isArray(res.history)) {
        apiCommanderHistoryByRun.set(scope.teamSessionId, res.history.slice(-24))
      }
      return res
    }

    const adapter = connectorRegistry.get(commander.connector)
    if (!adapter) {
      return { ok: false, code: 'unsupported_connector', detail: `外部指挥者连接器 "${commander.connector}" 未注册` }
    }
    const cwd = snapshot.metadata?.cwd || defaultCwd || os.tmpdir()
    return await runExternalCommanderTurn({
      adapter,
      cwd,
      prompt: text,
      systemPrompt,
      tools: COMMANDER_TOOL_SCHEMAS,
      onToolCall,
      onActivity,
    })
  }

  const commanderPromptRequest = async (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    return await promptNonHostedCommander(owned.scope, input?.prompt)
  }

  const getRunSnapshot = (teamSessionId) => {
    const key = typeof teamSessionId === 'string' ? teamSessionId.trim() : ''
    if (!key || !runtime.listRuns().some((r) => r.teamSessionId === key)) {
      return { ok: false, code: 'not_found', detail: 'team session not found' }
    }
    return { ok: true, teamSessionId: key, snapshot: runtime.getStatus(key) }
  }

  const suggestRun = async (input) => {
    const owned = ownedRun(input)
    if (!owned.ok) return owned
    const { teamSessionId, sessionId } = owned.scope
    const saved = runtime.recordUserSuggestion(teamSessionId, {
      text: input?.text,
      taskId: typeof input?.taskId === 'string' && input.taskId.trim() ? input.taskId.trim() : null,
      commandId: input?.commandId,
    }, { kind: 'user', id: 'local-owner' })
    if (!saved.ok || saved.replayed) return saved

    const snapshot = runtime.getStatus(teamSessionId)
    const commanderSource = snapshot?.metadata?.commander?.source || 'hosted'
    const promptMsg = `[Concerto 用户团队页实时建议]${saved.suggestion.taskId ? `（关联任务 ${saved.suggestion.taskId}）` : ''} 用户在团队运行期间补充了以下建议，请在当前或下一步调度中采纳并在团队视图/回复中反馈：\n${saved.suggestion.text}`
    let delivery = 'recorded'
    if (commanderSource === 'api' || commanderSource === 'external') {
      promptNonHostedCommander(owned.scope, promptMsg).catch((err) => ctx.logger?.warn?.(err))
      delivery = 'dispatched_nonhosted'
    } else {
      const controller = safeGet('sessionController')
      if (sessionId && typeof controller?.prompt === 'function') {
        try {
          await controller.prompt({
            requestId: `req-suggest-${saved.suggestion.suggestionId}`,
            sessionId,
            mode: 'queue',
            content: [{ type: 'text', text: promptMsg }],
          }, new AbortController().signal)
          delivery = 'queued_commander'
        } catch (err) {
          ctx.logger?.warn?.(err)
          delivery = 'recorded'
        }
      }
    }
    return { ...saved, delivery }
  }

  const worktreeActions = {
    resolveWorktree(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      const taskId = typeof input?.taskId === 'string' ? input.taskId.trim() : ''
      if (!taskId) return { ok: false, code: 'invalid', detail: 'taskId required' }
      const found = runtime.getTask({ taskId }, owned.scope.teamSessionId)
      if (!found.ok) return found
      const wt = found.task?.worktree || null
      if (!wt?.path) return { ok: false, code: 'not_found', detail: '该任务未关联 Git Worktree' }
      return { ok: true, owned, task: found.task, worktree: wt }
    },
    diff(input) {
      const resolved = worktreeActions.resolveWorktree(input)
      if (!resolved.ok) return resolved
      return inspectGitWorktreeDiff(resolved.worktree)
    },
    merge(input) {
      const resolved = worktreeActions.resolveWorktree(input)
      if (!resolved.ok) return resolved
      return mergeGitWorktree(resolved.worktree)
    },
    cleanup(input) {
      const resolved = worktreeActions.resolveWorktree(input)
      if (!resolved.ok) return resolved
      const removed = removeGitWorktree(resolved.worktree)
      return removed
        ? { ok: true, cleaned: true, path: resolved.worktree.path }
        : { ok: false, code: 'invalid', detail: '清理 Worktree 失败（可能仍有进程占用该目录）' }
    },
  }

  const subscribeSessionEvents = (sessionId, listener) => {
    const sid = String(sessionId || '')
    return runtime.subscribe((ev) => {
      if (!ev) return
      const binding = runtime.getBinding(sid)
      if (!binding) return
      if (ev.teamSessionId === binding.teamSessionId) {
        listener(ev)
      }
    })
  }

  ctx.effect(() => {
    const routeDisposers = registerConcertoRoutes(ctx.webServer, base, {
      store,
      checkHostedConnection,
      checkApiConnection,
      listLlmCatalog,
      commanderPrompt: commanderPromptRequest,
      getSnapshot: getRunSnapshot,
      suggestRun,
      probe,
      generate,
      reload,
      runtime,
      spawnSpike,
      tasks,
      recovery,
      haltRun,
      approveRunPlan,
      setRunDispatchLimits,
      listRuns,
      listProjects,
      launchTeamSession,
      revealSession,
      listTeamsWithCapabilities,
      sessionInfo,
      subscribeSessionEvents,
      worktree: worktreeActions,
      memberActivity,
      readViewObject,
      getSkillsInfo,
      memberDutiesRequest,
      importExcalidrawBoard,
      saveUserLayout,
      editAcceptanceChecklist,
      saveUserViewPreferences,
      structured: (callId) => runtime.getStructured(callId),
      structuredList: () => runtime.listStructured(),
      connectors: {
        registry: connectorRegistry,
        defaultCwd,
        saveCustom: saveCustomConnector,
        deleteCustom: deleteCustomConnector,
        probeDraft: probeCustomConnectorDraft,
        listWithProbe: listConnectorsWithProbe,
      },
    })
    const toolDisposers = registerConcertoTools(ctx, runtime, {
      scopeOf,
      submitDecision,
      dispatchTask: (input, caller) => tasks.dispatch(input, caller),
      dispatchReview: (input, caller) => tasks.dispatchReview(input, caller),
      inspectTeamCapabilities,
      inspectMemberCapability: inspectMemberCapabilityForScope,
      offerProjectSkill,
      requestReviewExemption,
      askQuestion: runner.askQuestion,
      askMemberQuestionUser,
    })
    for (const teamSessionId of runtime.runsWithPendingAutomaticReview()) wakeAutomaticReview(teamSessionId)
    return () => {
      disposing = true
      runner.dispose()
      try { if (typeof disposeHostedSessionObserver === 'function') disposeHostedSessionObserver() } catch { /* ignore */ }
      hostedEventLog.clear()
      for (const dispose of [...routeDisposers, ...toolDisposers]) {
        try { dispose() } catch { /* 单个卸载失败不影响其它 */ }
      }
    }
  }, 'concerto: routes + tools')
}
