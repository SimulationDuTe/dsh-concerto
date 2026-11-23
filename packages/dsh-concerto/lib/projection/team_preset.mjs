/**
 * Team -> preset bundle 投影器。
 *
 * 职责：
 * 1. 把「团队领域数据」投影成「部署产物文件内容」。
 * 2. 不写盘、不安装、不碰 IO，只产出字符串。
 *
 * 角色模型：
 * - roleKind：运行时封闭语义，只能是 commander / worker / reviewer。
 * - roleId：用户/插件自定义目录项，开放取值，仅要求非空。
 *   运行时只读 roleKind，roleId 用于展示与目录管理。
 *
 * 设计：docs/Concerto-Design-v0.3.2.md §10.2 / §17.3
 */

import { validateDispatchLimits } from '../domain/dispatch_limits.mjs'

/** 成员来源枚举：决定成员怎么运行 */
export const MEMBER_SOURCE = Object.freeze({
  hosted: 'hosted',     // 平台托管：真实挂载，需要 provider/model/config
  api: 'api',           // 自定义 OpenAI 兼容 API（baseUrl + apiKey + model）
  external: 'external', // 外部 agent：描述行，由 Connector 执行
  web: 'web',           // 网页 agent：描述行，由 Connector 执行
})

/**
 * 运行时只认这三种语义角色（roleKind）。
 * roleId（用户/插件自定义）是目录项，必须映射到这里的 kind。
 * 注意：members 只能是 worker / reviewer；commander 由 team.commander 单独表达。
 */
export const ROLE_KIND = Object.freeze({
  commander: 'commander', // 团队唯一指挥官
  worker: 'worker',       // 执行成员
  reviewer: 'reviewer',   // 评审成员
})

/** 投影错误码：UI 与测试据此断言 */
const ERR = Object.freeze({
  invalidTeam: 'invalid_team',         // 团队整体结构不合法
  invalidMember: 'invalid_member',     // 单个成员不合法
  duplicateTeam: 'duplicate_team',     // 多团队之间 id 重复
  duplicateMember: 'duplicate_member', // 同一团队内 member id 重复
  missingModule: 'missing_module',     // 成员来源没有配置对应模块
})

/**
 * 默认选项：可被 rawOptions 覆盖。
 * memberModules 是嵌套对象，合并时需单独浅合并，避免整体被替换。
 */
const DEFAULT_OPTIONS = Object.freeze({
  presetModule: '@deepseek-ai/dsh-agent-preset', // preset 行挂载的模块名
  memberModules: Object.freeze({
    hosted: 'dsh-concerto/member',   // 成员行统一由本 bundle 的子路径提供
    api: 'dsh-concerto/member',      // 自定义 API 描述行（不把 apiKey 写入 YAML）
    external: 'dsh-concerto/member', // 外部成员只作描述行，不注入人设
    web: 'dsh-concerto/member',      // 同上
  }),
  bundleName: '@local/concerto-teams',           // 生成的 bundle 包名
  version: '0.0.1',                              // 生成的 bundle 版本
  patchPath: './cordis.patch.yml',               // package.json 里 dsh.bundle.patch 路径
})

/**
 * 团队 id 规范化：任意输入 -> kebab-case。
 *
 * 步骤：小写 → 非字母数字转连字符 → 合并连字符 → 去首尾 → 空/超长返回 null。
 * 注意：中文字符会被全部过滤，中文团队名返回 null。
 *
 * @param {*} rawId 原始团队 id
 * @returns {string|null} 规范化 id，或 null 表示不可用
 */
export function normalizeTeamId(rawId) {
  const id = String(rawId ?? '')       // null/undefined → ''，其他 → 字符串
    .toLowerCase()                     // 统一小写
    .replace(/[^a-z0-9]+/g, '-')      // 非字母数字片段 → 单个连字符
    .replace(/-+/g, '-')              // 连续连字符 → 单个
    .replace(/^-|-$/g, '')            // 去掉首尾连字符
  if (id === '') return null           // 空 id 不可用
  if (id.length > 64) return null      // 超长 id 不可用
  return id
}

/**
 * preset 行的 Loader 行 id 约定：preset-<teamId>。
 * 与成员行 member-<memberId> 前缀区分，避免 id 冲突。
 *
 * @param {string} normalizedTeamId 已规范化的团队 id
 * @returns {string} preset 行 id
 */
export function presetRowId(normalizedTeamId) {
  return `preset-${normalizedTeamId}`
}

/**
 * 单成员 -> 一行 plugin 配置。
 *
 * 角色由调用方传入 role = { roleId, roleKind }，本函数不自行推断：
 * - hosted：真实挂载行，带 provider/model/config。
 * - external / web：描述行，只带 connector，实际执行由 Connector 负责。
 *
 * 注意：本函数会向外部传入的 errors 数组 push 错误（借用共享数组，非严格纯函数）。
 * 缺 module 时返回 null，调用方需检查 errors。
 *
 * @param {object} member 成员数据
 * @param {{ roleId: string, roleKind: string }} role 已解析的角色
 * @param {object} options 已合并的选项，至少含 memberModules
 * @param {object[]} errors 错误收集数组，会被本函数追加
 * @returns {object|null} plugin 行，或 null 表示无法构造
 */
function memberRow(member, role, options, errors) {
  const moduleName = options.memberModules?.[member.source]
  if (!moduleName) {
    // 该来源没有配置对应模块：无法生成行，记录错误并返回 null
    errors.push({ code: ERR.missingModule, detail: `no module configured for source ${member.source}` })
    return null
  }

  if (member.source === MEMBER_SOURCE.api) {
    // 自定义 API：描述行（仅保留非敏感 baseUrl/model，apiKey 不落入 YAML）
    return {
      id: `member-${member.id}`,
      name: moduleName,
      config: {
        memberId: member.id,
        roleId: role.roleId,
        roleKind: role.roleKind,
        source: member.source,
        baseUrl: member.baseUrl,
        model: member.model,
      },
    }
  }

  if (member.source !== MEMBER_SOURCE.hosted) {
    // 外部 / 网页来源：描述行，真正执行由对应 Connector 完成
    return {
      id: `member-${member.id}`,
      name: moduleName,
      config: {
        memberId: member.id,
        roleId: role.roleId,     // 目录角色，开放
        roleKind: role.roleKind, // 语义角色，封闭
        source: member.source,   // 成员挂载时据此决定是否注入人设
        connector: member.connector,
      },
    }
  }

  // Hosted：真实挂载行，需要 provider/model，以及用户自定义 config
  // 注意：...(member.config ?? {}) 在最后展开，用户 config 可覆盖前面的默认值
  return {
    id: `member-${member.id}`,
    name: moduleName,
    config: {
      memberId: member.id,
      roleId: role.roleId,     // 目录角色，开放
      roleKind: role.roleKind, // 语义角色，封闭
      source: member.source,   // hosted 才注入人设
      persona: member.persona ?? '',
      provider: member.provider ?? null,
      model: member.model ?? null,
      ...(member.config ?? {}),
    },
  }
}

/**
 * 单支团队 -> 一条 preset 声明（数据形状）。
 *
 * 校验分四段：
 * 1. 团队结构：id / name / commander / members 数组。
 * 2. 成员基础：id 必填、id 不重复、source 合法、非 hosted 必须有 connector。
 * 3. 角色语义：members 的 roleKind 只能是 worker/reviewer；roleId 出现时必须非空。
 * 4. 构造行：commander 强制 roleKind=commander，members 按数组顺序。
 *
 * 任何阶段出错都返回 { ok: false, errors }，不抛异常。
 *
 * @param {object} team 团队数据
 * @param {object} rawOptions 用户选项，会与 DEFAULT_OPTIONS 合并
 * @returns {{ok:true, row:object} | {ok:false, errors:object[]}}
 */
export const TOOL_PROFILE = Object.freeze({
  coding: 'coding',
  readonly: 'readonly',
  none: 'none',
})

const TOOL_PROFILE_VALUES = new Set(Object.values(TOOL_PROFILE))

export function resolveMemberToolProfile(member) {
  if (member && typeof member.toolProfile === 'string' && TOOL_PROFILE_VALUES.has(member.toolProfile)) {
    return member.toolProfile
  }
  if (member?.roleKind === ROLE_KIND.commander) return TOOL_PROFILE.none
  if (member?.source === MEMBER_SOURCE.hosted) {
    return member?.roleKind === ROLE_KIND.reviewer ? TOOL_PROFILE.readonly : TOOL_PROFILE.coding
  }
  return TOOL_PROFILE.coding
}

export function expectedCapabilitiesForMember(member, options = {}) {
  const platform = options.platform ?? process.platform
  const source = member?.source === MEMBER_SOURCE.hosted ? MEMBER_SOURCE.hosted : MEMBER_SOURCE.external
  const profile = resolveMemberToolProfile(member)
  if (source === MEMBER_SOURCE.external) {
    const connector = member?.connector ?? null
    return {
      source,
      connector,
      profile: 'external',
      coordinatorOnly: false,
      fileRead: true,
      fileWrite: true,
      fileEdit: true,
      search: true,
      shell: true,
      instructions: false,
      expectedPluginNames: [],
      expectedTools: [],
    }
  }
  const shellTool = platform === 'win32' ? 'pwsh' : 'bash'
  const shellPlugin = platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash'
  if (profile === TOOL_PROFILE.none) {
    return {
      source,
      connector: null,
      profile,
      coordinatorOnly: true,
      fileRead: false,
      fileWrite: false,
      fileEdit: false,
      search: false,
      shell: false,
      instructions: false,
      expectedPluginNames: [],
      expectedTools: [],
    }
  }
  if (profile === TOOL_PROFILE.readonly) {
    return {
      source,
      connector: null,
      profile,
      coordinatorOnly: false,
      fileRead: true,
      fileWrite: false,
      fileEdit: false,
      search: true,
      shell: false,
      instructions: true,
      expectedPluginNames: [
        '@deepseek-ai/dsh-agent-instructions',
        '@deepseek-ai/dsh-tool-fs',
        '@deepseek-ai/dsh-tool-fs-search',
      ],
      expectedTools: ['read', 'glob', 'grep'],
    }
  }
  return {
    source,
    connector: null,
    profile: TOOL_PROFILE.coding,
    coordinatorOnly: false,
    fileRead: true,
    fileWrite: true,
    fileEdit: true,
    search: true,
    shell: true,
    instructions: true,
    expectedPluginNames: [
      '@deepseek-ai/dsh-agent-instructions',
      shellPlugin,
      '@deepseek-ai/dsh-tool-fs',
      '@deepseek-ai/dsh-tool-fs-search',
    ],
    expectedTools: ['read', 'write', 'edit', 'glob', 'grep', shellTool],
  }
}

export function hostedToolPluginsForMember(member, options = {}) {
  const platform = options.platform ?? process.platform
  const profile = resolveMemberToolProfile(member)
  if (profile === TOOL_PROFILE.none) return []
  if (profile === TOOL_PROFILE.readonly) {
    return [
      { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
      { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { read: true, readImage: true, write: false, edit: false, applyPatch: false } },
      { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: { sampleOverCapGlobResults: false } },
    ]
  }
  return [
    { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
    { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: platform === 'win32', config: {} },
    { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: platform !== 'win32', config: {} },
    { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { read: true, readImage: true, write: true, edit: true, applyPatch: false } },
    { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: { sampleOverCapGlobResults: false } },
  ]
}

const REQUIRED_VIEW_STRING_RE = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/
const REQUIRED_VIEW_TYPES = new Set(['table', 'checklist', 'mindmap', 'diagram', 'board', 'html'])
const REQUIRED_VIEW_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/

function validateTeamRequiredViews(rawList, errors) {
  if (rawList === undefined) return
  if (!Array.isArray(rawList)) {
    errors.push({ code: ERR.invalidTeam, detail: 'team.requiredViews must be an array' })
    return
  }
  for (let i = 0; i < rawList.length; i += 1) {
    const item = rawList[i]
    if (typeof item === 'string') {
      if (!REQUIRED_VIEW_STRING_RE.test(item.trim())) {
        errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}] must match (table|checklist|mindmap|diagram|board|html):<id>` })
      }
      continue
    }
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}] must be a string or object` })
      continue
    }
    if (typeof item.type !== 'string' || !REQUIRED_VIEW_TYPES.has(item.type)) {
      errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}].type is invalid` })
      continue
    }
    if (typeof item.id !== 'string' || !REQUIRED_VIEW_ID_RE.test(item.id)) {
      errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}].id is invalid` })
      continue
    }
    if (item.title !== undefined && (typeof item.title !== 'string' || item.title.trim() === '')) {
      errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}].title must be a non-empty string` })
    }
    if (item.requiredForAcceptance !== undefined && typeof item.requiredForAcceptance !== 'boolean') {
      errors.push({ code: ERR.invalidTeam, detail: `team.requiredViews[${i}].requiredForAcceptance must be boolean` })
    }
  }
}

export function presetRowFromTeam(team, rawOptions = {}) {
  // 合并选项：外层浅合并 + memberModules 内层浅合并，避免用户只覆盖部分来源时丢默认值
  const options = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
    memberModules: { ...DEFAULT_OPTIONS.memberModules, ...(rawOptions.memberModules ?? {}) },
  }
  const errors = []

  // ---- 第 1 段：团队结构校验 ----
  const teamId = normalizeTeamId(team?.id)
  if (!teamId) errors.push({ code: ERR.invalidTeam, detail: `team id ${JSON.stringify(team?.id)} is not usable` })
  if (typeof team?.name !== 'string' || team.name.trim() === '') {
    errors.push({ code: ERR.invalidTeam, detail: 'team name is required' })
  }
  if (team?.objective !== undefined && (typeof team.objective !== 'string' || team.objective.trim() === '')) {
    errors.push({ code: ERR.invalidTeam, detail: 'team.objective must be a non-empty string when provided' })
  }
  validateTeamRequiredViews(team?.requiredViews, errors)
  if (team?.policyRequiresReview !== undefined && typeof team.policyRequiresReview !== 'boolean') {
    errors.push({ code: ERR.invalidTeam, detail: 'policyRequiresReview must be a boolean' })
  }
  if (team?.dispatchLimits !== undefined) {
    const checked = validateDispatchLimits(team.dispatchLimits)
    if (!checked.ok) errors.push({ code: ERR.invalidTeam, detail: checked.detail })
  }
  if (team?.verificationCommand !== undefined) {
    if (typeof team.verificationCommand !== 'string' || team.verificationCommand.length > 400) {
      errors.push({ code: ERR.invalidTeam, detail: 'verificationCommand must be a string up to 400 chars' })
    }
  }
  if (team?.verificationTimeoutMs !== undefined) {
    if (!Number.isSafeInteger(team.verificationTimeoutMs) || team.verificationTimeoutMs < 1000 || team.verificationTimeoutMs > 600000) {
      errors.push({ code: ERR.invalidTeam, detail: 'verificationTimeoutMs must be an integer between 1000 and 600000' })
    }
  }
  if (!team?.commander || !team.commander.id) {
    errors.push({ code: ERR.invalidTeam, detail: 'commander is required' })
  }
  if (!Array.isArray(team?.members)) {
    errors.push({ code: ERR.invalidTeam, detail: 'members must be an array' })
  }
  if (errors.length > 0) return { ok: false, errors } // 结构不对，不再看成员

  for (const m of [team.commander, ...team.members]) {
    if (m?.toolProfile !== undefined && (typeof m.toolProfile !== 'string' || !TOOL_PROFILE_VALUES.has(m.toolProfile))) {
      errors.push({ code: ERR.invalidMember, detail: `member "${m?.id ?? ''}" toolProfile must be coding, readonly, or none` })
    }
  }

  // ---- 第 2 段：成员基础校验 ----
  const seen = new Set()
  // commander 与 members 一起遍历，统一查重与来源校验
  for (const m of [team.commander, ...team.members]) {
    if (!m?.id) {
      errors.push({ code: ERR.invalidMember, detail: 'member id is required' })
      continue // 没有 id 无法查重，跳过后续检查
    }
    if (seen.has(m.id)) errors.push({ code: ERR.duplicateMember, detail: m.id })
    seen.add(m.id)

    const knownSources = [MEMBER_SOURCE.hosted, MEMBER_SOURCE.api, MEMBER_SOURCE.external, MEMBER_SOURCE.web]
    if (!knownSources.includes(m.source)) {
      // source 不在白名单
      errors.push({ code: ERR.invalidMember, detail: `${m.id}: unknown source ${m.source}` })
    } else if (m.source === MEMBER_SOURCE.api) {
      if (typeof m.baseUrl !== 'string' || !/^https?:\/\/\S+/.test(m.baseUrl.trim())) {
        errors.push({ code: ERR.invalidMember, detail: `${m.id}: valid http(s) baseUrl is required for api` })
      }
      if (typeof m.model !== 'string' || m.model.trim() === '') {
        errors.push({ code: ERR.invalidMember, detail: `${m.id}: model is required for api` })
      }
    } else if (m.source !== MEMBER_SOURCE.hosted && (typeof m.connector !== 'string' || m.connector.trim() === '')) {
      // 非 hosted/api 必须有非空 connector，否则描述行无法定位执行体
      errors.push({ code: ERR.invalidMember, detail: `${m.id}: connector is required for ${m.source}` })
    }
  }

  // ---- 第 3 段：角色语义校验（仅 members） ----
  // roleKind 是封闭语义：Commander 之外只能是 worker / reviewer。
  // roleId 开放（用户/插件自定义），这里不校验其取值，只要求出现时非空。
  // 注意：第一个循环里缺 id 的成员已记录错误，这里用 !m?.id 跳过，避免重复报错或崩溃。
  for (const m of team.members) {
    if (!m?.id) continue // 已在前一段报过 member id is required，不重复校验

    if (![ROLE_KIND.worker, ROLE_KIND.reviewer].includes(m.roleKind)) {
      errors.push({
        code: ERR.invalidMember,
        detail: `${m.id}: roleKind must be 'worker' or 'reviewer', got ${JSON.stringify(m.roleKind)}`,
      })
    }
    // roleId 可选；出现时必须是非空字符串（防止空串污染 YAML）
    if ('roleId' in m && (typeof m.roleId !== 'string' || m.roleId.trim() === '')) {
      errors.push({ code: ERR.invalidMember, detail: `${m.id}: roleId must be a non-empty string when present` })
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  // ---- 第 4 段：构造行 ----
  // commander：roleKind 强制 commander；roleId 允许自定义，缺省用 'commander'。
  // 用显式空串检查，避免 roleId='' 时 ?? 不生效（?? 只对 null/undefined 兜底）。
  const commanderRoleId =
    typeof team.commander.roleId === 'string' && team.commander.roleId.trim() !== ''
      ? team.commander.roleId
      : ROLE_KIND.commander

  const commanderRow = memberRow(
    team.commander,
    { roleKind: ROLE_KIND.commander, roleId: commanderRoleId },
    options,
    errors,
  )
  // members：roleKind 来自校验过的 m.roleKind；roleId 缺省回落到 roleKind
  const memberRows = team.members.map((m) =>
    memberRow(m, { roleKind: m.roleKind, roleId: m.roleId ?? m.roleKind }, options, errors),
  )
  // memberRow 可能追加 missing_module 错误，这里要再查一次
  if (errors.length > 0) return { ok: false, errors }
  // Team roster entries are descriptors; only the native member preset owns its persona.
  for (const row of memberRows) row.config.descriptorOnly = true

  return {
    ok: true,
    row: {
      id: presetRowId(teamId),
      name: options.presetModule,
      config: {
        id: teamId,
        name: team.name,
        // description 缺省时自动生成，保证 YAML 字段始终存在
        description: team.description ?? `${team.name} — managed by Concerto`,
        // order 只接受整数，否则默认 100（字符串 '10'、浮点 10.5 都落到默认）
        order: Number.isInteger(team.order) ? team.order : 100,
        // plugin 顺序：commander 永远第一个，之后按 members 数组顺序
        plugins: [commanderRow, ...memberRows],
      },
    },
  }
}

// ---------- 极简 YAML 发射器（只覆盖本投影的固定形状） ----------

/**
 * 把字符串序列化为 YAML 单引号标量。
 * 单引号内只需把 ' 转义为 ''，其他字符无需转义。
 *
 * @param {*} s 任意值，会被 String() 转换
 * @returns {string} 带单引号的 YAML 字符串
 */
function quote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

/**
 * 标量序列化：只处理字符串 / 数字 / 布尔 / null，其他走 JSON。
 * JSON 是合法的 YAML flow 风格，作为兜底可读性差但能跑。
 *
 * @param {*} value
 * @returns {string} YAML 片段
 */
function scalar(value) {
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  // 非标量走 YAML flow 风格；JSON 是合法 YAML
  return JSON.stringify(value)
}

/**
 * 一条 preset 行 -> 一段 YAML 文本。
 *
 * 缩进约定（- 占 2 字符，push 的 indent 是 - 后的列号）：
 * - insert:           0
 *   - id:             4（- 后 id 在 6）
 *     name:           6
 *     config:         6
 *       id:           8
 *       ...
 *       plugins:      8
 *       - id:         10（- 后 id 在 12）
 *         name:       12
 *         config:     12
 *           key:      14
 *
 * 前提：row.config.plugins 至少有一个元素（由 presetRowFromTeam 保证）。
 *
 * @param {object} row preset 行数据
 * @returns {string} YAML 文本（不含文件头）
 */
function emitPresetRow(row) {
  const lines = []
  // 辅助函数：按缩进追加一行
  const push = (indent, text) => lines.push(`${' '.repeat(indent)}${text}`)

  push(0, '- insert:')
  push(4, `- id: ${scalar(row.id)}`)
  push(6, `name: ${scalar(row.name)}`)
  push(6, 'config:')
  push(8, `id: ${scalar(row.config.id)}`)
  push(8, `name: ${scalar(row.config.name)}`)
  push(8, `description: ${scalar(row.config.description)}`)
  push(8, `order: ${scalar(row.config.order)}`)
  push(8, 'plugins:')

  for (const plugin of row.config.plugins) {
    push(10, `- id: ${scalar(plugin.id)}`)
    push(12, `name: ${scalar(plugin.name)}`)
    if (plugin.disabled !== undefined) {
      push(12, `disabled: ${scalar(plugin.disabled)}`)
    }
    // plugin.config 的键按 Object.entries 顺序输出（插入顺序）
    const cfgEntries = Object.entries(plugin.config ?? {})
    if (cfgEntries.length > 0) {
      push(12, 'config:')
      for (const [key, value] of cfgEntries) {
        push(14, `${key}: ${scalar(value)}`)
      }
    }
  }
  return lines.join('\n')
}

/**
 * 多条 preset 行 -> 一个 patch 文件内容。
 * 文件头注释提示“生成物，勿手改”，结尾补换行符合 POSIX 文本规范。
 *
 * @param {object[]} rows preset 行数组
 * @returns {string} cordis.patch.yml 的完整内容
 */
export function emitPatch(rows) {
  const body = rows.length === 0 ? '[]' : rows.map(emitPresetRow).join('\n')
  return `# 由 Concerto 生成，请勿手工编辑。团队数据变更后重新生成并重装。\n${body}\n`
}

/**
 * 多支团队 -> 一个 bundle 的全部文件（一次安装装完所有团队）。
 *
 * 流程：
 * 1. 校验 teams 是数组，允许最后一支团队删除后的空配置。
 * 2. 逐团队调用 presetRowFromTeam；单个团队失败不阻断其他团队收集错误。
 * 3. 跨团队 id 查重（member 级查重在 presetRowFromTeam 内完成）。
 * 4. 生成 package.json 与 cordis.patch.yml 两个文件内容。
 *
 * 不写盘：返回 { files } 由调用方决定如何落盘。
 *
 * @param {object[]} teams 团队数组
 * @param {object} rawOptions 用户选项
 * @returns {{ok:true, files: Record<string,string>} | {ok:false, errors:object[]}}
 */
export function buildPresetBundle(teams, rawOptions = {}) {
  // 合并选项：与 presetRowFromTeam 内部同样的合并逻辑
  const options = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
    memberModules: { ...DEFAULT_OPTIONS.memberModules, ...(rawOptions.memberModules ?? {}) },
  }

  if (!Array.isArray(teams)) {
    return { ok: false, errors: [{ code: ERR.invalidTeam, detail: 'teams must be an array' }] }
  }

  const rows = []
  const errors = []
  const seenIds = new Set() // 跨团队 id 查重

  for (const team of teams) {
    const built = presetRowFromTeam(team, options)
    if (!built.ok) {
      // 单团队失败：错误附上 team 标识，continue 收集其他团队错误
      errors.push(...built.errors.map((e) => ({ ...e, team: team?.id })))
      continue
    }
    const id = built.row.config.id
    if (seenIds.has(id)) {
      // 跨团队 id 重复：规范化后撞车（如 'My Team' 与 'my-team'）
      errors.push({ code: ERR.duplicateTeam, detail: id })
      continue
    }
    seenIds.add(id)
    rows.push(built.row)

    // 每个 hosted 成员再生成一条独立 preset：成员各自一个会话，才能真正多 Agent
    for (const member of team?.members ?? []) {
      if (!member || member.source !== MEMBER_SOURCE.hosted || typeof member.id !== 'string' || member.id === '') continue
      const memberPresetId = `${id}--${member.id}`
      if (seenIds.has(memberPresetId)) {
        errors.push({ code: ERR.duplicateTeam, detail: memberPresetId })
        continue
      }
      seenIds.add(memberPresetId)
      rows.push({
        id: presetRowId(memberPresetId),
        name: options.presetModule,
        config: {
          id: memberPresetId,
          name: `${team.name} · ${member.id}`,
          description: `Concerto member preset for ${member.id}`,
          order: 101,
          plugins: [
            {
              id: `member-${member.id}`,
              name: options.memberModules.hosted,
              config: {
                memberId: member.id,
                roleId: member.roleId ?? '',
                roleKind: member.roleKind ?? 'worker',
                source: MEMBER_SOURCE.hosted,
                persona: member.persona ?? '',
                provider: member.provider ?? null,
                model: member.model ?? null,
                toolProfile: resolveMemberToolProfile(member),
                ...(member.config ?? {}),
              },
            },
            ...hostedToolPluginsForMember(member, options),
          ],
        },
      })
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  // package.json：标准 npm 私有包，dsh.bundle.patch 指向 patch 文件
  const packageJson = {
    name: options.bundleName,
    version: options.version,
    private: true, // 防止误发布到公共 registry
    type: 'module',
    dsh: { bundle: { patch: options.patchPath } },
  }

  return {
    ok: true,
    files: {
      // JSON.stringify + 结尾换行：符合 npm 包文本文件规范
      'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
      'cordis.patch.yml': emitPatch(rows),
    },
  }
}
