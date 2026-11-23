export function validateDispatchLimits(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, detail: 'dispatchLimits must be an object' }
  }
  if (Object.keys(input).some((key) => key !== 'maxAttempts' && key !== 'maxReworks')) {
    return { ok: false, detail: 'dispatchLimits accepts maxAttempts and maxReworks' }
  }
  const { maxAttempts = null, maxReworks = null } = input
  if (maxAttempts !== null && (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1)) {
    return { ok: false, detail: 'maxAttempts 必须为大于等于 1 的整数，或留空。' }
  }
  if (maxReworks !== null && (!Number.isSafeInteger(maxReworks) || maxReworks < 0)) {
    return { ok: false, detail: 'maxReworks 必须为大于等于 0 的整数，或留空。' }
  }
  return { ok: true, limits: { maxAttempts, maxReworks } }
}

export function dispatchBudget(task, limits) {
  const attempts = task.attempt ?? 0
  const reworkPending = task.review?.verdict === 'fail' &&
    (task.review.executionId ?? null) === (task.executionId ?? null)
  // Older tasks already have the accepted review decisions in their audit history.
  const reworks = task.reworkCount ?? Math.max(0, (task.events ?? []).filter((event) =>
    event.type === 'review.submitted' && event.payload?.input?.verdict === 'fail').length - Number(reworkPending))
  const { maxAttempts, maxReworks } = limits
  let blockedReason = null
  if (task.state === 'pending') {
    if (maxAttempts !== null && attempts >= maxAttempts) {
      blockedReason = `执行次数已达上限（${attempts}/${maxAttempts}）。`
    } else if (reworkPending && maxReworks !== null && reworks >= maxReworks) {
      blockedReason = `返工次数已达上限（${reworks}/${maxReworks}）。`
    }
  }
  return { attempts, reworks, reworkPending, blockedReason }
}
