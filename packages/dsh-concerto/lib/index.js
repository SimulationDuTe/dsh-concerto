/**
 * Concerto Host 插件入口。
 * 职责：声明服务依赖、建存储、生成 teams bundle、挂路由。
 * 业务规则在 domain/ 与 projection/。
 */
import z from '@deepseek-ai/schemastery'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { mkdtempSync, realpathSync } from 'node:fs'
import { createTeamStore } from './team_store.mjs'
import { createTeamRuntime } from './team_runtime.mjs'
import { registerConcertoTools } from './tools.mjs'
import { buildTeamBundleFiles, hashFiles, readTeamBundleFiles, writeTeamBundle } from './team_bundle.mjs'
import { registerConcertoRoutes } from './routes.mjs'
import { createConnectorRegistry } from './connector/registry.mjs'
import { createCodexAdapter } from './connector/codex-adapter.mjs'
import { createTaskRunner } from './runner.mjs'
import { scopesOverlap } from './workspace_scope.mjs'
import { expectedCapabilitiesForMember } from './projection/team_preset.mjs'
import {
  createHostedSessionEventLog,
  projectHostedSessionActivities,
  mergeAndPaginateActivities,
} from './hosted_history.mjs'

export const name = 'dsh-concerto'

/** 未声明的服务在 apply 里读取会直接抛错（Cordis 行为） */
export const inject = ['webServer', 'pluginManager', 'tools', 'agentPresets', 'agents', 'sessions', 'sessionController']

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
  // 运行态（planRevision / 任务 / 决策幂等）的持久化文件
  runtimePath: z.string().default(join(os.homedir(), '.concerto', 'runtime.json')),
  // Codex 可执行文件；留空则自动探测（Codex 安装目录 → PATH）
  codexBin: z.string().default(''),
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

  const codexBin = typeof config?.codexBin === 'string' ? config.codexBin : ''
  const defaultCwd = typeof config?.codexCwd === 'string' ? config.codexCwd : ''

  /** Connector 注册表：Runtime 只按 id 取适配器，不认具体后端。 */
  const connectorRegistry = createConnectorRegistry()
  connectorRegistry.register(createCodexAdapter({ bin: codexBin, defaultCwd }))

  const safeGet = (serviceName) => {
    try { return ctx.get(serviceName) } catch { return undefined }
  }
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
  const startHosted = async ({ cwd, agentPreset, prompt, scope, executionId, memberId, signal, onPhase }) => {
    const controller = ctx.get('sessionController')
    const agents = ctx.get('agents')
    if (!controller || !agents) return { ok: false, code: 'host_unavailable', detail: 'sessionController/agents service missing' }
    try {
      signal.throwIfAborted()
      onPhase('hosted.create')
      // 若工作目录已有宿主 Workspace（非隔离 tmpdir），附着其 workspaceId 保持工作区语义一致；不与 cwd 同时传
      const existingWs = cwd && !scopesOverlap(cwd, os.tmpdir()) ? findWorkspaceForCwd(cwd) : null
      const createReq = existingWs?.id ? { workspaceId: existingWs.id, agentPreset } : { ...(cwd ? { cwd } : {}), agentPreset }
      const created = await controller.create(createReq)
      signal.throwIfAborted()
      const sessionId = created?.sessionId ?? created?.value?.sessionId ?? created?.session?.id
      if (!sessionId) return { ok: false, code: 'create_failed', detail: JSON.stringify(created ?? null) }
      const binding = runtime.bindSession(String(sessionId), scope, runtime.getStatus(scope).metadata, { memberId, roleKind: 'worker', executionId })
      if (!binding.ok) return binding
      onPhase('hosted.prompt')
      await controller.prompt({
        requestId: `req-${randomUUID()}`,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: prompt }],
      }, signal)
      signal.throwIfAborted()
      onPhase('hosted.wait_idle')
      await agents.get(sessionId).whenIdle()
      signal.throwIfAborted()
      return { ok: true, sessionId: String(sessionId) }
    } catch (error) {
      return { ok: false, code: 'hosted_failed', detail: String(error && error.message ? error.message : error) }
    }
  }

  const runner = createTaskRunner({ runtime, registry: connectorRegistry, defaultCwd, hostedStart: startHosted, hostedTimeoutMs: config.hostedTimeoutMs ?? 180000, onError: (error) => ctx.logger.error(error) })

  const commanderHostSessionByRun = new Map()
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

  const listTeamsWithCapabilities = () => store.listTeams().map((t) => ({
    ...t,
    memberCapabilities: inspectTeamCapabilitiesSync(t.id, null),
  }))

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
    const record = store.getTeam(teamId)
    if (!record) return null
    // Until explicit project selection is implemented, each commander entry starts its own project/run.
    // A native cwd is not used as an implicit project identity.
    const scope = `run-${sessionId}`
    const sessionCwd = resolveSessionCwd(session)
    const ws = sessionCwd ? findWorkspaceForCwd(sessionCwd) : null
    const created = runtime.bindSession(sessionId, scope, {
      projectId: `project-${sessionId}`,
      teamId,
      configVersion: record.version,
      teamName: record.name,
      commanderId: record.team.commander.id,
      ...(sessionCwd ? { cwd: sessionCwd } : {}),
      ...(ws?.id ? { workspaceId: ws.id } : {}),
      members: structuredClone(record.team.members),
      commander: structuredClone(record.team.commander),
      ...(typeof record.team.objective === 'string' && record.team.objective.trim() ? { objective: record.team.objective.trim() } : {}),
      ...(Array.isArray(record.team.requiredViews) && record.team.requiredViews.length > 0 ? { requiredViews: structuredClone(record.team.requiredViews) } : {}),
    }).binding
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
      : (member?.source === 'hosted'
        ? (hostedSessionSupported ? 'hosted_session' : 'hosted_partial')
        : 'runtime_only')

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

    if (execution?.connectorId === 'codex' || ref?.backend === 'codex') {
      const adapter = connectorRegistry.get('codex')
      if (!adapter || typeof adapter.reconcile !== 'function') {
        return { checked: false, confirmedStopped: false, kind: 'codex_unavailable', reason: 'codex adapter reconcile unavailable' }
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
    if (input.action === 'retry_isolated') {
      const isHosted = String(execution.connectorId || '').startsWith('hosted:') || execution.nativeSessionRef?.backend === 'hosted'
      const isBoundedCodex = execution.connectorId === 'codex' && ['read-only', 'workspace-write'].includes(execution.sandbox)
      const isBoundedHosted = isHosted && execution.sandbox !== 'danger-full-access'
      if ((!isBoundedCodex && !isBoundedHosted) || input.externalEffectsReviewed !== true || typeof input.reason !== 'string' || !input.reason.trim()) {
        return { ok: false, code: 'precondition_failed', detail: 'bounded sandbox, reason and externalEffectsReviewed required' }
      }
      const iso = establishIsolatedDirectory(execution.writeScope)
      if (!iso.ok) return { ok: false, code: 'precondition_failed', detail: iso.detail }
      evidence = iso.evidence
    }
    return runtime.adjudicate(scope, input, actor, evidence)
  }

  const ownedRun = (input) => {
    const scope = scopeOf(ctx.sessions.get(String(input?.sessionId ?? '')))
    if (!scope || scope.roleKind !== 'commander') return { ok: false, code: 'unauthorized', detail: 'a managed commander session is required' }
    if (typeof input.commandId !== 'string' || !input.commandId) return { ok: false, code: 'invalid', detail: 'commandId required' }
    return { ok: true, scope, metadata: runtime.getStatus(scope.teamSessionId).metadata }
  }

  const detectTaskRequiresWrite = (task, input) => {
    if (input?.sandbox === 'workspace-write' || input?.sandbox === 'danger-full-access') return true
    if (input?.sandbox === 'read-only') return false
    const reqCaps = Array.isArray(task?.requiredCapabilities) ? task.requiredCapabilities : []
    if (reqCaps.some((c) => ['write', 'edit', 'shell', 'exec'].includes(String(c).toLowerCase()))) return true
    const text = `${task?.title ?? ''} ${task?.objective ?? ''}`
    return /\b(write|create|edit|modify|fix|implement|patch|delete|run|execute)\b|写入|修改|编辑|创建|新建|修复|实现|运行|执行/i.test(text)
  }

  const tasks = {
    async dispatch(input, caller = { kind: 'http_api', actorId: 'local-owner' }) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      const { scope, metadata } = owned
      const members = metadata.members
      if (input.member && input.memberId && input.member !== input.memberId) return { ok: false, code: 'invalid', detail: 'member and memberId conflict' }
      for (const field of ['memberId', 'member']) if (input[field] !== undefined && (typeof input[field] !== 'string' || !input[field].trim())) return { ok: false, code: 'invalid', detail: `${field} must be a non-empty string` }
      const wantedMember = input.memberId ?? input.member ?? ''
      const target = wantedMember ? members.find((m) => m.id === wantedMember)
        : members.find((m) => m.roleKind === 'worker' && (!input.connector || m.connector === input.connector))
      if (!target) return { ok: false, code: 'invalid', detail: 'member is not in the frozen team configuration' }
      if (target.roleKind !== 'worker') return { ok: false, code: 'unsupported', detail: 'automatic reviewer dispatch is not implemented' }
      if (input.connector && target.connector !== input.connector) return { ok: false, code: 'invalid', detail: 'connector does not match member' }

      const foundTask = runtime.getTask({ taskId: input.taskId }, scope.teamSessionId)
      if (!foundTask.ok) return foundTask

      const snapshot = runtime.getStatus(scope.teamSessionId)
      const cap = inspectMemberCapabilitySync(scope.teamId, target, snapshot)
      if (target.source === 'hosted') {
        if (cap.coordinatorOnly || cap.profile === 'none') {
          return { ok: false, code: 'capability_mismatch', detail: `成员 "${target.id}" 配置为仅协调（toolProfile: none），不具备任务执行能力，拒绝派发` }
        }
        if (['preset_unreloaded', 'preset_stale', 'preset_broken'].includes(cap.verificationStatus)) {
          return { ok: false, code: 'capability_mismatch', detail: `成员 "${target.id}" 预设工具能力未就绪（${cap.verificationStatus}${cap.detail ? `: ${cap.detail}` : ''}），请先在设置 -> Concerto 重新生成并重载` }
        }
        if (!cap.fileWrite && detectTaskRequiresWrite(foundTask.task, input)) {
          return { ok: false, code: 'capability_mismatch', detail: `成员 "${target.id}" 当前仅具备只读权限（toolProfile: readonly），无法执行写入/修改/执行类任务，拒绝静默回退` }
        }
      } else if (!connectorRegistry.get(target.connector)) {
        return { ok: false, code: 'capability_mismatch', detail: `外部成员 "${target.id}" 所需连接器 "${target.connector}" 未注册` }
      }

      const liveCmdCwd = resolveSessionCwd(ctx.sessions.get(scope.sessionId))
      const resolvedCwd = (typeof input.cwd === 'string' && input.cwd.trim() !== '')
        ? input.cwd.trim()
        : (foundTask.task.retryCwd || metadata.cwd || liveCmdCwd || defaultCwd)

      return runner.dispatch({
        scope: scope.teamSessionId,
        taskId: input.taskId,
        memberId: target.id,
        commandId: input.commandId,
        cwd: resolvedCwd,
        sandbox: input.sandbox ?? 'read-only',
        approvals: input.approvals ?? 'ask',
        dispatchedBy: {
          kind: caller?.kind || 'http_api',
          actorId: caller?.actorId || scope.memberId || 'local-owner',
          ...(caller?.callId ? { callId: caller.callId } : {}),
        },
        ...(target.source === 'hosted' ? { hosted: { agentPreset: `${scope.teamId}--${target.id}`, memberId: target.id } } : { connector: target.connector }),
      })
    },
    cancel(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      if (!input.executionId) return { ok: false, code: 'invalid', detail: 'executionId required' }
      return runner.cancel(owned.scope.teamSessionId, input.taskId, { kind: 'user', id: 'local-owner' }, input)
    },
    review(input) {
      const owned = ownedRun(input)
      if (!owned.ok) return owned
      const scope = owned.scope.teamSessionId
      const access = runtime.authorizeTask(scope, input, owned.scope, 'submit_review')
      if (!access.ok) return access
      if (typeof input.reason !== 'string' || !input.reason.trim()) return { ok: false, code: 'invalid', detail: 'review evidence/reason required' }
      return runtime.submitReview(input, scope, { kind: 'user', id: 'local-owner' })
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

  const launchTeamSession = async (input = {}) => {
    const teamId = typeof input?.teamId === 'string' ? input.teamId.trim() : ''
    if (!teamId) return { ok: false, code: 'invalid', detail: 'teamId required' }
    const record = store.getTeam(teamId)
    if (!record) return { ok: false, code: 'not_found', detail: `team "${teamId}" not found` }
    const controller = safeGet('sessionController')
    if (!controller || typeof controller.create !== 'function') {
      return { ok: false, code: 'host_unavailable', detail: 'sessionController unavailable' }
    }
    const wsReg = safeGet('workspaceRegistry')
    let ws = null
    if (typeof input.workspaceId === 'string' && input.workspaceId.trim() !== '') {
      ws = wsReg?.get?.(input.workspaceId.trim()) ?? null
      if (!ws && wsReg) return { ok: false, code: 'not_found', detail: `workspace "${input.workspaceId}" not found` }
    } else if (typeof input.cwd === 'string' && input.cwd.trim() !== '') {
      ws = await ensureWorkspaceForCwd(input.cwd.trim())
      if (!ws && wsReg && typeof wsReg.create === 'function') {
        return { ok: false, code: 'invalid', detail: `目录不可用作工作区: ${input.cwd}` }
      }
    } else if (typeof wsReg?.list === 'function') {
      const existing = wsReg.list()
      if (Array.isArray(existing) && existing.length > 0) ws = existing[0]
    }
    const fallbackCwd = typeof input.cwd === 'string' && input.cwd.trim() !== '' ? input.cwd.trim() : (defaultCwd || undefined)
    try {
      const createReq = ws?.id
        ? { workspaceId: ws.id, agentPreset: record.id }
        : { ...(fallbackCwd ? { cwd: fallbackCwd } : {}), agentPreset: record.id }
      const created = await controller.create(createReq)
      const sessionId = created?.sessionId ?? created?.value?.sessionId ?? created?.session?.id
      if (!sessionId) return { ok: false, code: 'create_failed', detail: JSON.stringify(created ?? null) }
      const sid = String(sessionId)
      if (ws?.attachSession && !(ws.sessionIds ?? []).includes(sid)) {
        try { await ws.attachSession(sid) } catch { /* ignore */ }
      }
      const sessionCwd = ws?.path ?? fallbackCwd ?? null
      const teamSessionId = `run-${sid}`
      runtime.bindSession(sid, teamSessionId, {
        projectId: `project-${sid}`,
        teamId: record.id,
        configVersion: record.version,
        teamName: record.name,
        commanderId: record.team.commander.id,
        ...(sessionCwd ? { cwd: sessionCwd } : {}),
        ...(ws?.id ? { workspaceId: ws.id } : {}),
        members: structuredClone(record.team.members),
        commander: structuredClone(record.team.commander),
        ...(typeof record.team.objective === 'string' && record.team.objective.trim() ? { objective: record.team.objective.trim() } : {}),
        ...(Array.isArray(record.team.requiredViews) && record.team.requiredViews.length > 0 ? { requiredViews: structuredClone(record.team.requiredViews) } : {}),
      })
      commanderHostSessionByRun.set(teamSessionId, sid)
      if (typeof input.initialPrompt === 'string' && input.initialPrompt.trim() !== '' && typeof controller.prompt === 'function') {
        await controller.prompt({
          requestId: `req-${randomUUID()}`,
          sessionId: sid,
          mode: 'queue',
          content: [{ type: 'text', text: input.initialPrompt.trim() }],
        })
      }
      return { ok: true, sessionId: sid, teamSessionId, teamId: record.id, workspaceId: ws?.id ?? null, cwd: sessionCwd }
    } catch (error) {
      return { ok: false, code: 'launch_failed', detail: String(error?.message || error) }
    }
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

  // 生成：只写工作区文件，不安装。
  const generate = async () => {
    if (!teamsBundleDir) {
      return { ok: false, errors: [{ code: 'invalid', detail: 'teamsBundleDir not configured' }] }
    }
    const built = buildTeamBundleFiles(store.allTeams())
    if (!built.ok) return built
    await writeTeamBundle(teamsBundleDir, built.files)
    return { ok: true, dir: teamsBundleDir, hash: built.hash }
  }

  // 重载：唯一有副作用的动作。固定 spec、不传 approvedBuilds、hash 校验。
  const reload = async (expectedHash) => {
    if (!teamsBundleDir) return { status: 400, body: { code: 'invalid', detail: 'teamsBundleDir not configured' } }

    const built = buildTeamBundleFiles(store.allTeams())
    if (!built.ok) return { status: 400, body: { code: 'invalid', details: built.errors } }

    if (expectedHash !== built.hash) {
      return {
        status: 409,
        body: { code: 'conflict', detail: `expected ${String(expectedHash)}, current ${built.hash}` },
      }
    }

    // 防御：hash 只是我们自己的记忆；bundle 可能被外部移除（插件页/命令行）。
    const bundleName = JSON.parse(built.files['package.json']).name
    const isInstalled = async () => {
      try {
        const bundles = await ctx.pluginManager.listBundles()
        return Array.isArray(bundles) && bundles.some((b) => b && b.name === bundleName)
      } catch { return false }
    }

    if (built.hash === lastInstalledHash && await isInstalled()) {
      return { status: 200, body: { application: 'unchanged', hash: built.hash } }
    }

    await writeTeamBundle(teamsBundleDir, built.files)

    const onDisk = await readTeamBundleFiles(teamsBundleDir, Object.keys(built.files))
    if (onDisk === null || hashFiles(onDisk) !== built.hash) {
      return { status: 500, body: { code: 'invalid', detail: 'generated files did not persist' } }
    }

    try {
      // 服务拒绝重复安装已存在的包：先移除再装（官方错误提示即此路径）
      if (await isInstalled()) {
        await ctx.pluginManager.removeBundle(bundleName)
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
  }

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
        get_task: Boolean(ctx.tools.get('get_task')),
        report_progress: Boolean(ctx.tools.get('report_progress')),
        submit_result: Boolean(ctx.tools.get('submit_result')),
        submit_review: Boolean(ctx.tools.get('submit_review')),
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

  ctx.effect(() => {
    const routeDisposers = registerConcertoRoutes(ctx.webServer, base, {
      store,
      probe,
      generate,
      reload,
      runtime,
      spawnSpike,
      tasks,
      recovery,
      listRuns,
      launchTeamSession,
      revealSession,
      listTeamsWithCapabilities,
      sessionInfo,
      memberActivity,
      saveUserLayout,
      saveUserViewPreferences,
      structured: (callId) => runtime.getStructured(callId),
      structuredList: () => runtime.listStructured(),
      connectors: { registry: connectorRegistry, defaultCwd },
    })
    const toolDisposers = registerConcertoTools(ctx, runtime, {
      scopeOf,
      dispatchTask: (input, caller) => tasks.dispatch(input, caller),
      inspectTeamCapabilities,
    })
    return () => {
      runner.dispose()
      try { if (typeof disposeHostedSessionObserver === 'function') disposeHostedSessionObserver() } catch { /* ignore */ }
      hostedEventLog.clear()
      for (const dispose of [...routeDisposers, ...toolDisposers]) {
        try { dispose() } catch { /* 单个卸载失败不影响其它 */ }
      }
    }
  }, 'concerto: routes + tools')
}
