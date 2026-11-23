/**
 * 结项交付复盘报告生成器（纯领域函数，零 DSH / IO 依赖）。
 *
 * 汇总一次团队运行的：
 * - 目标、团队、总耗时、任务统计、总返工次数；
 * - 所有改动文件清单（合并 delivery.files / changedFiles / worktree committed+uncommitted / file.changed 事件）；
 * - 逐任务明细表（负责人、终态、耗时、返工次数、自动验证门禁结果、交付摘要）；
 * - 自动验证门禁执行记录；
 * - 结项总结与结构化视图产物清单。
 */

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  if (min < 60) return rem > 0 ? `${min}m ${rem}s` : `${min}m`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`
}

function parseTimeMs(iso) {
  if (!iso || typeof iso !== 'string') return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function escapeCell(value) {
  return String(value ?? '—')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim() || '—'
}

function collectModifiedFiles(snapshot) {
  const files = new Set()
  const add = (f) => {
    if (typeof f === 'string' && f.trim()) files.add(f.trim())
  }
  for (const task of snapshot?.tasks ?? []) {
    for (const f of task?.result?.changedFiles ?? []) add(f)
    for (const f of task?.result?.delivery?.files ?? []) add(f)
    for (const f of task?.result?.artifactRefs ?? []) {
      if (typeof f === 'string' && !/^(table|checklist|mindmap|diagram|board|html):|^event-|^view-/i.test(f)) add(f)
    }
    for (const ev of task?.result?.delivery?.evidence ?? []) {
      if (typeof ev?.path === 'string') add(ev.path)
      if (typeof ev?.file === 'string') add(ev.file)
    }
  }
  for (const exec of snapshot?.executions ?? []) {
    for (const f of exec?.worktree?.committedFiles ?? []) add(f)
    for (const f of exec?.worktree?.uncommittedFiles ?? []) add(f)
    for (const f of exec?.changedFiles ?? []) add(f)
  }
  const evList = Array.isArray(snapshot?.events) ? snapshot.events : (Array.isArray(snapshot?.recentEvents) ? snapshot.recentEvents : [])
  for (const ev of evList) {
    if (ev?.type === 'file.changed') {
      add(ev?.payload?.path || ev?.payload?.file)
      if (Array.isArray(ev?.payload?.files)) {
        for (const f of ev.payload.files) add(f)
      }
    }
  }
  return [...files].sort((a, b) => a.localeCompare(b))
}

function taskDurationMs(task, executions) {
  const taskExecs = (executions ?? []).filter((e) => e.taskId === task.taskId && e.kind !== 'reviewer')
  let total = 0
  for (const e of taskExecs) {
    const start = parseTimeMs(e.startedAt || e.createdAt)
    const end = parseTimeMs(e.finishedAt || e.settledAt || e.updatedAt)
    if (start !== null && end !== null && end >= start) {
      total += (end - start)
    }
  }
  if (total > 0) return total
  const tStart = parseTimeMs(task.createdAt)
  const tEnd = parseTimeMs(task.completedAt || task.updatedAt)
  return (tStart !== null && tEnd !== null && tEnd >= tStart) ? (tEnd - tStart) : null
}

function taskReworkCount(task, executions, events) {
  const workerExecs = (executions ?? []).filter((e) => e.taskId === task.taskId && e.kind !== 'reviewer')
  if (workerExecs.length > 1) return workerExecs.length - 1
  const failReviews = (events ?? []).filter(
    (ev) => ev?.type === 'review.submitted' && ev?.taskId === task.taskId && ev?.payload?.verdict === 'fail',
  )
  return failReviews.length
}

function taskOwner(task, executions) {
  if (task?.assignedMemberId) return task.assignedMemberId
  const lastWorker = [...(executions ?? [])]
    .reverse()
    .find((e) => e.taskId === task.taskId && e.kind !== 'reviewer' && e.memberId)
  return lastWorker?.memberId || task?.raceGroup?.memberId || '—'
}

function formatVerificationBadge(v) {
  if (!v) return '—'
  if (v.ok) return `✅ 通过 (${formatDuration(v.durationMs)})`
  return `❌ 失败 (exit ${v.exitCode})`
}

/**
 * 根据运行快照生成可复制/导出的 Markdown 结项交付复盘单。
 * @param {{ snapshot: object, team?: object|null, generatedAt?: string }} input
 */
export function buildCloseoutReport({ snapshot, team = null, generatedAt = new Date().toISOString() } = {}) {
  const run = snapshot || {}
  const tasks = Array.isArray(run.tasks) ? run.tasks : []
  const executions = Array.isArray(run.executions) ? run.executions : []
  const events = Array.isArray(run.events) ? run.events : (Array.isArray(run.recentEvents) ? run.recentEvents : [])
  const viewObjects = Array.isArray(run.viewObjects) ? run.viewObjects : []

  const teamName = team?.name || run.metadata?.teamName || run.metadata?.teamId || 'Concerto Team'
  const goalTitle = run.goalTitle || run.metadata?.goalTitle || run.goalId || '团队任务交付'
  const runId = run.teamSessionId || run.metadata?.teamSessionId || run.goalId || 'run'
  const goalState = run.goalCompletion?.state === 'completed' ? '已结项' : (run.paused ? '已暂停' : '进行中')

  const startMs = parseTimeMs(run.createdAt || run.metadata?.createdAt || events[0]?.timestamp)
  const endMs = parseTimeMs(run.goalCompletion?.completedAt || generatedAt)
  const totalElapsedMs = (startMs !== null && endMs !== null && endMs >= startMs) ? (endMs - startMs) : null

  const completedCount = tasks.filter((t) => t.state === 'completed').length
  const failedCount = tasks.filter((t) => t.state === 'failed' || t.state === 'blocked').length
  const cancelledCount = tasks.filter((t) => t.state === 'cancelled').length
  const modifiedFiles = collectModifiedFiles(run)

  const taskRows = tasks.map((task) => {
    const owner = taskOwner(task, executions)
    const durMs = taskDurationMs(task, executions)
    const reworks = taskReworkCount(task, executions, events)
    const v = task.lastVerification || null
    const summaryText = task.result?.summary || task.blockedReason || ''
    return {
      taskId: task.taskId,
      title: task.title || task.taskId,
      owner,
      state: task.state,
      durationMs: durMs,
      reworks,
      verification: v,
      summary: summaryText.slice(0, 160),
    }
  })

  const totalReworks = taskRows.reduce((sum, r) => sum + r.reworks, 0)
  const verificationEvents = events.filter((e) => e?.type === 'verification.passed' || e?.type === 'verification.failed')
  const verificationPassed = verificationEvents.filter((e) => e.type === 'verification.passed').length
  const verificationFailed = verificationEvents.filter((e) => e.type === 'verification.failed').length

  const lines = [
    `# Concerto 结项交付复盘单`,
    '',
    `- **团队**：${teamName}`,
    `- **目标**：${goalTitle}`,
    `- **运行 ID**：\`${runId}\``,
    `- **状态**：${goalState}`,
    `- **总耗时**：${formatDuration(totalElapsedMs)}`,
    `- **任务统计**：共 ${tasks.length} 项（完成 ${completedCount} / 阻塞或失败 ${failedCount} / 取消 ${cancelledCount}），累计返工 ${totalReworks} 次`,
    ...(team?.verificationCommand ? [`- **自动验证门禁**：\`${team.verificationCommand}\`（通过 ${verificationPassed} 次 / 失败 ${verificationFailed} 次）`] : []),
    `- **生成时间**：${generatedAt}`,
    '',
  ]

  if (run.goalCompletion?.summary) {
    lines.push('## 结项摘要', '', String(run.goalCompletion.summary).trim(), '')
  }

  lines.push('## 任务执行明细', '')
  if (taskRows.length === 0) {
    lines.push('_本次运行暂无任务记录。_', '')
  } else {
    lines.push('| 任务 ID | 标题 | 负责人 | 状态 | 耗时 | 返工 | 验证门禁 | 交付摘要 |')
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const row of taskRows) {
      lines.push(
        `| \`${escapeCell(row.taskId)}\` | ${escapeCell(row.title)} | ${escapeCell(row.owner)} | ${escapeCell(row.state)} | ${escapeCell(formatDuration(row.durationMs))} | ${row.reworks} | ${escapeCell(formatVerificationBadge(row.verification))} | ${escapeCell(row.summary)} |`,
      )
    }
    lines.push('')
  }

  lines.push(`## 改动文件清单（${modifiedFiles.length}）`, '')
  if (modifiedFiles.length === 0) {
    lines.push('_未记录到显式文件改动路径。_', '')
  } else {
    for (const f of modifiedFiles) {
      lines.push(`- \`${f}\``)
    }
    lines.push('')
  }

  if (verificationEvents.length > 0) {
    lines.push('## 自动验证门禁记录', '')
    for (const ev of verificationEvents) {
      const p = ev.payload || {}
      const icon = ev.type === 'verification.passed' ? '✅' : '❌'
      lines.push(`- ${icon} **${ev.taskId || 'task'}** \`${p.command || ''}\` → exit ${p.exitCode ?? '?'} (${formatDuration(p.durationMs)})`)
    }
    lines.push('')
  }

  if (viewObjects.length > 0) {
    lines.push(`## 产出结构化视图（${viewObjects.length}）`, '')
    for (const obj of viewObjects) {
      lines.push(`- \`${obj.type}:${obj.id}\` — ${obj.title || obj.id} (v${obj.version ?? 1})`)
    }
    lines.push('')
  }

  const safeSlug = String(runId).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48) || 'run'
  return {
    ok: true,
    runId,
    filename: `concerto-report-${safeSlug}.md`,
    generatedAt,
    markdown: lines.join('\n'),
    summary: {
      teamName,
      goalTitle,
      goalState,
      totalElapsedMs,
      totalTasks: tasks.length,
      completedTasks: completedCount,
      failedTasks: failedCount,
      cancelledTasks: cancelledCount,
      totalReworks,
      modifiedFileCount: modifiedFiles.length,
      verificationPassed,
      verificationFailed,
    },
  }
}
