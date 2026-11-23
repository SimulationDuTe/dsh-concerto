/**
 * submit_decision 的 payload 校验 + Review 策略合并。
 *
 * 职责：
 * 1. 校验决策 payload 的字段集合、字段类型、业务规则。
 * 2. 合并「策略 / Commander / 用户豁免」三方意见，得出最终是否要评审。
 */

/** 决策动作枚举：一次 submit_decision 想做什么 */
export const DECISION_ACTION = Object.freeze({
  proposePlan: 'propose_plan',
  createTask: 'create_task',       // 创建任务
  modifyTask: 'modify_task',       // 修改任务
  requestCancel: 'request_cancel', // 请求取消任务
  unblockTask: 'unblock_task',     // 记录阻塞解除
  finishGoal: 'finish_goal',       // 完成目标
  wait: 'wait',                    // 等待（不产生动作，只记录原因）
})

/**
 * 各 action 允许的字段白名单。
 * - required：必须出现，缺了报 missing_field。
 * - optional：可以出现，出现则校验类型。
 * - 不在 required/optional 里的字段一律拒绝（unknown_field），采用白名单而非黑名单。
 *
 * 用计算属性名 [DECISION_ACTION.xxx] 作为键，保证与枚举值永远同步。
 */
const FIELDS = Object.freeze({
  [DECISION_ACTION.proposePlan]: {
    required: ['planId', 'planVersion'],
    optional: [],
  },
  [DECISION_ACTION.createTask]: {
    required: ['title', 'objective', 'constraints', 'acceptance', 'dependsOn', 'assigneeRole'],
    optional: ['requiresReview', 'requiredViews'],
  },
  [DECISION_ACTION.modifyTask]: {
    required: ['taskId', 'patch'],
    optional: [],
  },
  [DECISION_ACTION.requestCancel]: {
    required: ['taskId'],
    optional: ['executionId', 'reason'],
  },
  [DECISION_ACTION.unblockTask]: {
    required: ['taskId', 'expectedUpdatedAt', 'reason'],
    optional: [],
  },
  [DECISION_ACTION.finishGoal]: {
    required: ['goalId', 'summary'],
    optional: ['artifactRefs'],
  },
  [DECISION_ACTION.wait]: {
    required: ['reason'],
    optional: ['wakeCondition'],
  },
})

/**
 * modify_task 的 patch 只允许这些键。
 * 不能通过 patch 改 state / id / attempt 等状态机管辖字段。
 */
const MODIFY_PATCH_KEYS = Object.freeze([
  'title', 'objective', 'constraints', 'acceptance', 'dependsOn', 'assigneeRole', 'requiredViews',
])

/**
 * 校验错误码。
 * 用稳定码而非自由文本，UI 与测试可直接断言。
 */
const ERR = Object.freeze({
  unknownAction: 'unknown_action',       // action 不在枚举内
  unknownField: 'unknown_field',         // payload / patch 出现白名单外的字段
  missingField: 'missing_field',         // 缺少 required 字段
  invalidType: 'invalid_type',           // 字段类型不对
  invalidValue: 'invalid_value',         // 类型对但取值不合法（如空数组）
  preconditionFailed: 'precondition_failed', // 对象前置条件不满足
})

// ---- 类型判断辅助函数：均为纯函数，不抛异常，返回布尔 ----

/** 是否纯对象：排除 null、数组、原始值 */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** 是否非空字符串：trim 后不能为空，排除纯空白 */
const isString = (v) => typeof v === 'string' && v.trim() !== ''

/** 是否字符串数组：每个元素都必须是非空字符串；空数组返回 true（数组本身合法） */
const isStringArray = (v) => Array.isArray(v) && v.every(isString)

/** 是否布尔值：只认 true/false，不认 'true' / 1 */
const isBool = (v) => typeof v === 'boolean'

const REQUIRED_VIEW_STRING_RE = /^(table|checklist|mindmap|diagram|board|html):([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})$/
const REQUIRED_VIEW_TYPES = new Set(['table', 'checklist', 'mindmap', 'diagram', 'board', 'html'])
const REQUIRED_VIEW_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/

/** 校验必需视图列表（'type:id' 或 { id, type, title?, requiredForAcceptance? }），非法项直接报错不静默丢弃 */
function pushRequiredViewErrors(v, fieldName, errors) {
  if (!Array.isArray(v)) {
    errors.push({ code: ERR.invalidType, field: fieldName })
    return
  }
  for (let i = 0; i < v.length; i += 1) {
    const item = v[i]
    if (typeof item === 'string') {
      if (!REQUIRED_VIEW_STRING_RE.test(item.trim())) {
        errors.push({
          code: ERR.invalidValue,
          field: fieldName,
          detail: `${fieldName}[${i}] must match (table|checklist|mindmap|diagram|board|html):<id>`,
        })
      }
      continue
    }
    if (!isPlainObject(item)) {
      errors.push({ code: ERR.invalidType, field: fieldName, detail: `${fieldName}[${i}] must be a string or object` })
      continue
    }
    if (typeof item.type !== 'string' || !REQUIRED_VIEW_TYPES.has(item.type)) {
      errors.push({ code: ERR.invalidValue, field: fieldName, detail: `${fieldName}[${i}].type must be table|checklist|mindmap|diagram|board|html` })
      continue
    }
    if (typeof item.id !== 'string' || !REQUIRED_VIEW_ID_RE.test(item.id)) {
      errors.push({ code: ERR.invalidValue, field: fieldName, detail: `${fieldName}[${i}].id must match /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/` })
      continue
    }
    if (item.title !== undefined && !isString(item.title)) {
      errors.push({ code: ERR.invalidType, field: fieldName, detail: `${fieldName}[${i}].title must be a non-empty string` })
    }
    if (item.requiredForAcceptance !== undefined && !isBool(item.requiredForAcceptance)) {
      errors.push({ code: ERR.invalidType, field: fieldName, detail: `${fieldName}[${i}].requiredForAcceptance must be boolean` })
    }
  }
}

/**
 * 校验一个 submit_decision payload。
 * 1. 入口守卫：action 是否合法、payload 是否纯对象。
 * 2. 字段集合校验：未知字段 + 缺失必填；有错立即返回（快速失败）。
 * 3. 按 action 做类型 + 业务规则校验；收集全部错误后统一返回。
 *
 * 采用「收集错误」而非「遇错即停」，让 UI 一次性标红所有问题。
 *
 * @param {string} action 决策动作，取值见 DECISION_ACTION
 * @param {object} payload 决策参数
 * @returns {{ ok: true } | { ok: false, errors: {code:string, field?:string, detail?:string}[] }}
 */
export function validateDecisionPayload(action, payload) {
  // ---- 第 0 段：入口守卫 ----
  const spec = FIELDS[action]
  // action 不在白名单表里，直接拒绝，不再看 payload
  if (!spec) return { ok: false, errors: [{ code: ERR.unknownAction, field: 'action', detail: action }] }
  // payload 必须是纯对象，否则后续 Object.keys / in 判断都不可靠
  if (!isPlainObject(payload)) {
    return { ok: false, errors: [{ code: ERR.invalidType, field: 'payload', detail: 'must be object' }] }
  }

  // ---- 第 1 段：字段集合校验 ----
  const errors = []
  const allowed = new Set([...spec.required, ...spec.optional]) // 合并必填与可选，得到完整白名单

  // 1a. 未知字段：payload 里出现白名单外的键
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) errors.push({ code: ERR.unknownField, field: key })
  }
  // 1b. 缺失必填：required 里的键在 payload 中不存在
  for (const key of spec.required) {
    if (!(key in payload)) errors.push({ code: ERR.missingField, field: key })
  }
  // 1c. 字段集合有错就立即返回，不进入类型校验：字段都不对，谈类型没意义
  if (errors.length > 0) return { ok: false, errors }

  // ---- 第 2 段：按 action 做类型 + 业务规则校验 ----
  switch (action) {
    case DECISION_ACTION.proposePlan: {
      if (!isString(payload.planId)) errors.push({ code: ERR.invalidType, field: 'planId' })
      if (!Number.isInteger(payload.planVersion) || payload.planVersion < 1) {
        errors.push({ code: ERR.invalidValue, field: 'planVersion' })
      }
      break
    }

    case DECISION_ACTION.createTask: {
      // 逐字段类型校验
      if (!isString(payload.title)) errors.push({ code: ERR.invalidType, field: 'title' })
      if (!isString(payload.objective)) errors.push({ code: ERR.invalidType, field: 'objective' })
      if (!isStringArray(payload.constraints)) errors.push({ code: ERR.invalidType, field: 'constraints' })
      // acceptance 双重校验：类型对 + 至少一条（设计：验收标准至少一条且可判定）
      if (!isStringArray(payload.acceptance) || payload.acceptance.length === 0) {
        errors.push({ code: ERR.invalidValue, field: 'acceptance', detail: 'at least one criterion' })
      }
      if (!isStringArray(payload.dependsOn)) errors.push({ code: ERR.invalidType, field: 'dependsOn' })
      if (!isString(payload.assigneeRole)) errors.push({ code: ERR.invalidType, field: 'assigneeRole' })
      // optional 字段：出现才校验类型
      if ('requiresReview' in payload && !isBool(payload.requiresReview)) {
        errors.push({ code: ERR.invalidType, field: 'requiresReview' })
      }
      if ('requiredViews' in payload) {
        pushRequiredViewErrors(payload.requiredViews, 'requiredViews', errors)
      }
      break
    }

    case DECISION_ACTION.modifyTask: {
      if (!isString(payload.taskId)) errors.push({ code: ERR.invalidType, field: 'taskId' })
      // patch 必须是纯对象，否则 patch 内部校验无从谈起
      if (!isPlainObject(payload.patch)) {
        errors.push({ code: ERR.invalidType, field: 'patch' })
        break
      }
      // patch 白名单：出现不允许的键就拒绝
      for (const key of Object.keys(payload.patch)) {
        if (!MODIFY_PATCH_KEYS.includes(key)) errors.push({ code: ERR.unknownField, field: `patch.${key}` })
      }
      // patch 内部逐字段类型校验：只校验出现的键
      const p = payload.patch
      if ('title' in p && !isString(p.title)) errors.push({ code: ERR.invalidType, field: 'patch.title' })
      if ('objective' in p && !isString(p.objective)) errors.push({ code: ERR.invalidType, field: 'patch.objective' })
      if ('constraints' in p && !isStringArray(p.constraints)) errors.push({ code: ERR.invalidType, field: 'patch.constraints' })
      if ('acceptance' in p && !isStringArray(p.acceptance)) errors.push({ code: ERR.invalidType, field: 'patch.acceptance' })
      if ('dependsOn' in p && !isStringArray(p.dependsOn)) errors.push({ code: ERR.invalidType, field: 'patch.dependsOn' })
      if ('assigneeRole' in p && !isString(p.assigneeRole)) errors.push({ code: ERR.invalidType, field: 'patch.assigneeRole' })
      if ('requiredViews' in p) {
        pushRequiredViewErrors(p.requiredViews, 'patch.requiredViews', errors)
      }
      break
    }

    case DECISION_ACTION.requestCancel: {
      if (!isString(payload.taskId)) errors.push({ code: ERR.invalidType, field: 'taskId' })
      // optional：出现才校验
      if ('executionId' in payload && !isString(payload.executionId)) errors.push({ code: ERR.invalidType, field: 'executionId' })
      if ('reason' in payload && !isString(payload.reason)) errors.push({ code: ERR.invalidType, field: 'reason' })
      break
    }

    case DECISION_ACTION.unblockTask: {
      for (const field of ['taskId', 'expectedUpdatedAt', 'reason']) {
        if (!isString(payload[field]) || !payload[field].trim()) errors.push({ code: ERR.invalidType, field })
      }
      break
    }

    case DECISION_ACTION.finishGoal: {
      if (!isString(payload.goalId)) errors.push({ code: ERR.invalidType, field: 'goalId' })
      if (!isString(payload.summary)) errors.push({ code: ERR.invalidType, field: 'summary' })
      if ('artifactRefs' in payload && !isStringArray(payload.artifactRefs)) {
        errors.push({ code: ERR.invalidType, field: 'artifactRefs' })
      }
      break
    }

    case DECISION_ACTION.wait: {
      if (!isString(payload.reason)) errors.push({ code: ERR.invalidType, field: 'reason' })
      if ('wakeCondition' in payload && !isString(payload.wakeCondition)) {
        errors.push({ code: ERR.invalidType, field: 'wakeCondition' })
      }
      break
    }
  }

  // ---- 收尾：有错返回错误列表，无错返回成功 ----
  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

/**
 * modify_task 的对象前置条件：目标 Task 必须仍是 pending 且无有效 Execution。
 *
 * - validateDecisionPayload 只关心 payload 自身格式，不关心目标对象状态。
 * - 前置条件需要读取当前 Task 快照，属于另一层职责。
 * - 调用方应先 validateDecisionPayload，再 checkModifyPrecondition。
 *
 * @param {{ state: string, hasActiveExecution?: boolean }} task 当前任务快照
 * @returns {{ ok: true } | { ok: false, errors: {code:string, detail?:string}[] }}
 */
export function checkModifyPrecondition(task) {
  // 只有 pending 可以修改：running / review / blocked 等状态不允许改
  if (task?.state !== 'pending') {
    return { ok: false, errors: [{ code: ERR.preconditionFailed, detail: `task state is ${task?.state}` }] }
  }
  // 已有活跃执行时不允许修改：避免改到正在执行的任务
  if (task.hasActiveExecution === true) {
    return { ok: false, errors: [{ code: ERR.preconditionFailed, detail: 'task already has an execution' }] }
  }
  return { ok: true }
}

/**
 * Review 下限：策略与 Commander 取或。
 *
 * 规则（§7.0）：
 * - Commander 只能上调评审要求，不能下调。
 * - 用 === true 而非直接 ||，防止 'true' / 1 等脏值被误判。
 *
 * @param {boolean} policyRequiresReview 策略要求的评审
 * @param {boolean} commanderRequiresReview Commander 要求的评审
 * @returns {boolean} 合并后的评审要求
 */
export function effectiveRequiresReview(policyRequiresReview, commanderRequiresReview) {
  return policyRequiresReview === true || commanderRequiresReview === true
}

/**
 * 用户显式豁免降低策略下限。
 *
 * 规则（§7.0）：
 * - 无 override：直接沿用策略的 requiresReview。
 * - 有 override：必须携带可追溯字段（actor / at / reason / policyVersion），
 *   且 policyVersion 必须与当前策略版本一致，否则拒绝。
 * - 满足条件后返回 requiresReview: false（豁免生效，降低下限）。
 *
 *
 * @param {{ requiresReview: boolean, version: string }} policy 当前策略
 * @param {{ actor: string, at: string, reason: string, policyVersion: string } | undefined} override 用户豁免记录
 * @returns {{ ok: true, requiresReview: boolean } | { ok: false, errors: {code:string, detail?:string}[] }}
 */
export function resolvePolicyFloor(policy, override) {
  // 无豁免：直接沿用策略意见
  if (override === undefined) return { ok: true, requiresReview: policy.requiresReview === true }

  // 豁免必须带齐四个可追溯字段，缺一不可
  const missing = ['actor', 'at', 'reason', 'policyVersion'].filter((k) => !isString(override?.[k]))
  if (missing.length > 0) {
    return { ok: false, errors: [{ code: ERR.preconditionFailed, detail: `exemption missing: ${missing.join(',')}` }] }
  }
  // 豁免必须基于当前策略版本，防止过期豁免绕过新策略
  if (override.policyVersion !== policy.version) {
    return { ok: false, errors: [{ code: ERR.preconditionFailed, detail: 'stale policyVersion' }] }
  }
  // 满足条件：豁免生效，强制 requiresReview: false
  return { ok: true, requiresReview: false }
}
