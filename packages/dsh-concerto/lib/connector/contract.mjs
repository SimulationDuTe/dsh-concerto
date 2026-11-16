/**
 * Connector 领域契约（零 DSH 依赖，可独立测试）。
 *
 * 设计：§2 表格「Member Connector = 领域接口 + 独立后端适配」；
 *       §2.1「先用真实能力验证共性，再固定可选接口」；
 *       §4.2 Connector 把 TaskAssignment 投影成成员原生的交互。
 *
 * 适配器只做协议翻译，Runtime 只消费归一化事件——后者的形状在这里定义。
 */

/** 归一化事件类型：Runtime / 面板只认这些，不认 Codex 的 item/* 私有形状。 */
export const CONNECTOR_EVENT = Object.freeze({
  started: 'execution.started',
  outputDelta: 'output.delta',
  outputMessage: 'output.message',
  commandCompleted: 'command.completed',
  fileChanged: 'file.changed',
  approvalRequested: 'approval.requested',
  questionRequested: 'question.requested',
  completed: 'execution.completed',
  failed: 'execution.failed',
  unknown: 'execution.unknown',
})

/** 能力标记：必须来自实测，不得假声明（§7.4 / §17.1）。 */
export const CONNECTOR_CAPABILITY = Object.freeze({
  midTurnQuestion: 'midTurnQuestion',
  approval: 'approval',
  cancel: 'cancel',
  resume: 'resume',
  dynamicTools: 'dynamicTools',
  streaming: 'streaming',
})

/** 适配器必须实现的方法；可选能力在 capabilities 里声明。 */
const REQUIRED_METHODS = Object.freeze(['probe', 'start'])

/**
 * 校验一个适配器是否满足接口（注册时调用，失败即显式报错，不静默降级）。
 * @param {object} adapter
 */
export function assertAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') throw new Error('connector adapter must be an object')
  if (typeof adapter.id !== 'string' || adapter.id === '') throw new Error('connector adapter needs a non-empty id')
  for (const method of REQUIRED_METHODS) {
    if (typeof adapter[method] !== 'function') throw new Error(`connector adapter ${adapter.id} is missing ${method}()`)
  }
  if (!adapter.capabilities || typeof adapter.capabilities !== 'object') {
    throw new Error(`connector adapter ${adapter.id} must declare capabilities`)
  }
}

// 0.0.2 compatibility is confined to ingress/storage migration. New consumers see dot names.
const LEGACY_EVENT = {"execution/started": "execution.started", "output/delta": "output.delta", "output/message": "output.message", "approval/requested": "approval.requested", "question/requested": "question.requested", "approval/resolved": "approval.resolved", "execution/completed": "execution.completed", "execution/failed": "execution.failed", "execution/unknown": "execution.unknown"}
export const normalizeEventType = (type) => LEGACY_EVENT[type] ?? type
