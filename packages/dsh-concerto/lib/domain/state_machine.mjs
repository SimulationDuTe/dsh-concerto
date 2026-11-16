/**
 * Concerto Domain 状态机 —— 唯一权威。
 * 零依赖、零宿主 import、纯函数。
 * 设计：docs/Concerto-Design-v0.3.2.md §7.6
 */

/** Task 状态（§7.1） */
export const TASK_STATE = Object.freeze({
  pending: 'pending',// 待派发  
  running: 'running',// 运行中
  review: 'review',// 待评审
  completed: 'completed',
  blocked: 'blocked',// 已阻塞
  cancelled: 'cancelled',// 已取消
  failed: 'failed',// 已失败
})

/** Execution 状态（§7.1） */
export const EXEC_STATE = Object.freeze({
  running: 'running', // 执行中
  waiting_input: 'waiting_input',// 等待用户输入
  waiting_approval: 'waiting_approval',// 等待审批
  interrupting: 'interrupting',// 正在中断
  stopped: 'stopped',// 已停止
  finished: 'finished',// 已结束
  unknown: 'unknown',// 状态未知
})

// Task 终止态集合
const TERMINAL_TASK = new Set([TASK_STATE.completed, TASK_STATE.cancelled, TASK_STATE.failed])

/** 拒绝码：UI 与测试据此断言，不要用自由文本 */
export const REJECT = Object.freeze({
  invalidTransition: 'invalid_transition',// 非法状态转移
  preconditionFailed: 'precondition_failed',// 前置条件不满足
  missingEvidence: 'missing_evidence',// 缺少必要证据
  unsafeRetry: 'unsafe_retry',// 不安全重试
})

const ok = (next, effects = []) => ({ kind: 'ok', next, effects })
const no = (code, detail) => ({ kind: 'rejected', code, detail })

export function isTerminalTask(state) {
  return TERMINAL_TASK.has(state)
}

/**
 * Task 转移。
 * @param {{ state: string, attempt?: number, needsAdjudication?: boolean }} task
 * @param {{ type: string, [k: string]: any }} event
 * @returns {{kind:'ok', next:string, effects:object[]} | {kind:'rejected', code:string, detail?:string}}
 */
export function transitionTask(task, event) {
  const s = task?.state
  const e = event?.type
  if (!s || !e) return no(REJECT.invalidTransition, 'missing state/event')
  if (TERMINAL_TASK.has(s)) return no(REJECT.invalidTransition, `terminal state: ${s}`)

  switch (e) {
    case 'dispatch': {
      if (s !== TASK_STATE.pending) return no(REJECT.invalidTransition)
      const attempt = (task.attempt ?? 0) + 1
      return ok(TASK_STATE.running, [{ type: 'create_execution', attempt }])
    }

    case 'result_submitted': {
      if (s !== TASK_STATE.running) return no(REJECT.invalidTransition)
      if (event.requiresReview === true) return ok(TASK_STATE.review)
      if (event.basicChecksPassed === true) return ok(TASK_STATE.completed)
      return ok(TASK_STATE.blocked, [
        { type: 'record_block_reason', reason: event.reason ?? 'basic_checks_failed' },
      ])
    }

    case 'review_passed': {
      if (s !== TASK_STATE.review) return no(REJECT.invalidTransition)
      if (!event.reviewId) return no(REJECT.missingEvidence, 'review_must_bind_current_result')
      return ok(TASK_STATE.completed)
    }

    case 'review_failed': {
      if (s !== TASK_STATE.review) return no(REJECT.invalidTransition)
      return ok(TASK_STATE.pending, [
        { type: 'record_rework_reason', reason: event.reason ?? null },
      ])
    }

    case 'cancel_requested': {
      if (s === TASK_STATE.pending) {
        if (event.hasActiveExecution) return no(REJECT.invalidTransition)
        return ok(TASK_STATE.cancelled)
      }
      if (s === TASK_STATE.running) {
        if (!event.hasActiveExecution) return no(REJECT.invalidTransition, 'no_active_execution')
        // Task 状态不变：只把当前 Execution 置 interrupting
        return ok(TASK_STATE.running, [
          { type: 'execution_event', event: { type: 'cancel_requested' } },
        ])
      }
      return no(REJECT.invalidTransition)
    }

    case 'cancel_confirmed': {
      if (s !== TASK_STATE.running && s !== TASK_STATE.review) return no(REJECT.invalidTransition)
      if (event.backendStopped !== true) {
        return no(REJECT.missingEvidence, 'stop_confirmation_required')
      }
      const effects = s === TASK_STATE.review ? [{ type: 'invalidate_review' }] : []
      return ok(TASK_STATE.cancelled, effects)
    }

    case 'dispatch_blocked': {
      if (s !== TASK_STATE.pending) return no(REJECT.invalidTransition)
      return ok(TASK_STATE.blocked, [
        { type: 'record_block_reason', reason: event.reason ?? 'dispatch_blocked' },
      ])
    }

    case 'execution_failed': {
      if (s !== TASK_STATE.running) return no(REJECT.invalidTransition)
      if (event.hasUnconfirmedSideEffects === true) {
        return no(REJECT.preconditionFailed, 'unconfirmed_side_effects')
      }
      return ok(TASK_STATE.failed)
    }

    case 'approval_denied': {
      if (![TASK_STATE.running, TASK_STATE.review, TASK_STATE.blocked].includes(s)) return no(REJECT.invalidTransition)
      return ok(TASK_STATE.blocked)
    }

    case 'unblock': {
      if (s !== TASK_STATE.blocked) return no(REJECT.invalidTransition)
      return ok(TASK_STATE.pending)
    }

    case 'execution_unknown': {
      if (s !== TASK_STATE.running) return no(REJECT.invalidTransition)
      return ok(TASK_STATE.running, [{ type: 'mark_needs_adjudication' }])
    }

    case 'adjudicate_accept': {
      if (![TASK_STATE.running, TASK_STATE.review].includes(s) || task.needsAdjudication !== true) {
        return no(REJECT.invalidTransition, 'no_pending_adjudication')
      }
      if (event.hasVerifiedArtifact !== true) {
        return no(REJECT.missingEvidence, 'verified_artifact_required')
      }
      return ok(event.requiresReview === true ? TASK_STATE.review : TASK_STATE.completed)
    }

    case 'adjudicate_abandon': {
      if (![TASK_STATE.running, TASK_STATE.review].includes(s) || task.needsAdjudication !== true) {
        return no(REJECT.invalidTransition, 'no_pending_adjudication')
      }
      if (event.stopConfirmedOrIsolated !== true) {
        return no(REJECT.preconditionFailed, 'stop_or_isolation_required')
      }
      return ok(TASK_STATE.failed)
    }

    case 'adjudicate_retry': {
      if (![TASK_STATE.running, TASK_STATE.review].includes(s) || task.needsAdjudication !== true) {
        return no(REJECT.invalidTransition, 'no_pending_adjudication')
      }
      if (event.isolated !== true) return no(REJECT.preconditionFailed, 'isolation_required')
      return ok(TASK_STATE.pending, [{ type: 'clear_adjudication' }])
    }

    default:
      return no(REJECT.invalidTransition, `unknown event: ${e}`)
  }
}





/**
 * Execution 转移。
 * @param {{ state?: string|null }} exec  state 为空表示「尚未创建」
 * @param {{ type: string, [k: string]: any }} event
 */
export function transitionExecution(exec, event) {
  const e = event?.type
  if (!e) return no(REJECT.invalidTransition, 'missing event')

  if (e === 'dispatch') {
    if (exec?.state) return no(REJECT.invalidTransition, 'execution_already_exists')
    return ok(EXEC_STATE.running)
  }

  const s = exec?.state
  if (!s) return no(REJECT.invalidTransition, 'missing state')

  switch (e) {
    case 'question_persisted':
      if (s !== EXEC_STATE.running) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.waiting_input)

    case 'answer_delivered':
      if (s !== EXEC_STATE.waiting_input) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.running)

    case 'approval_requested':
      if (s !== EXEC_STATE.running) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.waiting_approval)

    case 'approval_decided':
      if (s !== EXEC_STATE.waiting_approval) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.running)

    case 'cancel_requested':
      if (s !== EXEC_STATE.running && s !== EXEC_STATE.waiting_input && s !== EXEC_STATE.waiting_approval) {
        return no(REJECT.invalidTransition)
      }
      return ok(EXEC_STATE.interrupting)

    case 'stop_confirmed':
      if (![EXEC_STATE.running, EXEC_STATE.waiting_input, EXEC_STATE.waiting_approval, EXEC_STATE.interrupting].includes(s)) {
        return no(REJECT.invalidTransition)
      }
      if (event.backendStopped !== true) return no(REJECT.missingEvidence, 'stop_confirmation_required')
      return ok(EXEC_STATE.stopped)

    case 'turn_settled':
      if (![EXEC_STATE.running, EXEC_STATE.waiting_input, EXEC_STATE.waiting_approval].includes(s)) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.finished)

    case 'disconnected':
      if (![EXEC_STATE.running, EXEC_STATE.waiting_input, EXEC_STATE.waiting_approval, EXEC_STATE.interrupting].includes(s)) {
        return no(REJECT.invalidTransition)
      }
      return ok(EXEC_STATE.unknown)

    case 'reconcile_running':
      if (s !== EXEC_STATE.unknown) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.running)

    case 'reconcile_finished':
      if (s !== EXEC_STATE.unknown) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.finished)

    case 'reconcile_stopped':
      if (s !== EXEC_STATE.unknown) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.stopped)

    case 'reconcile_unresolved':
      if (s !== EXEC_STATE.unknown) return no(REJECT.invalidTransition)
      return ok(EXEC_STATE.unknown)

    // 表外事件：unknown 不允许无隔离重试
    case 'retry_without_isolation':
      return no(REJECT.unsafeRetry)

    default:
      return no(REJECT.invalidTransition, `unknown event: ${e}`)
  }
}



/**
 * 界面展示用的「任务此刻在等什么」视图状态。
 *
 * 设计约束：
 * 纯派生：只读 task / activeExecution，不写任何状态。
 * 不参与 transitionTask / transitionExecution 的合法性判定。
 * 仅用于 UI 展示与按钮可用性判断，禁止作为业务状态回写。
 * 与 TASK_STATE、EXEC_STATE 是三个独立枚举，不要混用。
 */
export const TASK_VIEW = Object.freeze({
  waiting_approval: 'waiting_approval',
  waiting_input: 'waiting_input',
  cancelling:'cancelling',
  unknown: 'unknown',
})


/**
 * 派生「任务视图状态」：把 Task 与当前 Execution 合并成 UI 可直接用的状态。
 * @param {{ state: string }} task 当前任务快照，至少含 state
 * @param {{ state: string } | null | undefined} activeExecution
 *        当前有效 Execution；没有则传 null / undefined
 * @returns {string} 视图状态字符串，取值来自 TASK_STATE 或 TASK_VIEW
 */
export function taskViewState(task,activeExecution){
  const t = task?.state
  // Task 不在 running，Execution 不参与展示，原样返回 Task 状态
  if(activeExecution?.state === EXEC_STATE.unknown && task.needsAdjudication) return TASK_VIEW.unknown
  if(t !== TASK_STATE.running) return t

  // Task 在 running，用 Execution 状态细化 UI 展示
  switch(activeExecution?.state){
    case EXEC_STATE.waiting_approval: return TASK_VIEW.waiting_approval
    case EXEC_STATE.waiting_input: return TASK_VIEW.waiting_input
    case EXEC_STATE.interrupting: return TASK_VIEW.cancelling
    case EXEC_STATE.unknown: return TASK_VIEW.unknown
    default: return t
  }
}