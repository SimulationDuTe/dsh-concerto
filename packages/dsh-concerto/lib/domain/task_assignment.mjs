/**
 * 统一的任务输入契约（TaskAssignment）与后端无关投影（零 DSH import）。
 *
 * 设计：docs/Concerto-Design-v0.3.2.md §4.2、§4.4、§17.12
 *
 * 确保 Hosted 与 External（如 Codex app-server）获得语义一致的任务目标、约束、
 * 验收标准、必要依赖、必需视图、执行身份、临时任务上下文与冻结的方法交付，
 * 同时保留各自原生 Harness、工具与权限。
 */
import { EXPERIENCE_GUIDANCE, EXPERIENCE_REVIEW_GUIDANCE } from './project_experience.mjs'

function formatRequiredViewLine(v) {
  if (typeof v === 'string') return `${v} (recommended)`
  return `${v.type}:${v.id}${v.requiredForAcceptance ? ' (required for acceptance)' : ' (recommended)'}`
}

export function buildTaskAssignment({
  task,
  taskId,
  executionId = '',
  identity = {},
  teamRequiredViews = [],
  dependencySummaries = [],
  selectedSkills = [],
  memberDuties = null,
  taskContext = '',
  availableTools = [],
  worktree = null,
  worktreeFallback = null,
} = {}) {
  const mergedRequiredViews = [
    ...(Array.isArray(teamRequiredViews) ? teamRequiredViews : []),
    ...(Array.isArray(task?.requiredViews) ? task.requiredViews : []),
  ]
  const roleKind = identity?.roleKind === 'reviewer' ? 'reviewer' : 'worker'
  const deliveryWorktree = roleKind === 'reviewer'
    ? (task?.result?.delivery?.worktree ?? worktree ?? null)
    : null
  return {
    schemaVersion: 1,
    taskId: String(taskId || task?.taskId || ''),
    executionId: String(executionId || ''),
    title: String(task?.title || ''),
    objective: String(task?.objective || ''),
    constraints: Array.isArray(task?.constraints) ? [...task.constraints] : [],
    acceptance: Array.isArray(task?.acceptance) ? [...task.acceptance] : [],
    dependsOn: Array.isArray(task?.dependsOn) ? [...task.dependsOn] : [],
    dependencySummaries: Array.isArray(dependencySummaries) ? structuredClone(dependencySummaries) : [],
    requiredViews: mergedRequiredViews.map((v) => (typeof v === 'string' ? v : structuredClone(v))),
    identity: {
      memberId: String(identity?.memberId || ''),
      roleKind,
      roleId: String(identity?.roleId || roleKind),
      source: String(identity?.source || 'hosted'),
      connector: identity?.connector ? String(identity.connector) : null,
      toolProfile: String(identity?.toolProfile || ''),
      cwd: String(identity?.cwd || ''),
    },
    ...(worktree ? { worktree: structuredClone(worktree) } : {}),
    ...(worktreeFallback ? { worktreeFallback: structuredClone(worktreeFallback) } : {}),
    taskContext: typeof taskContext === 'string' ? taskContext.trim() : '',
    selectedSkills: Array.isArray(selectedSkills) ? structuredClone(selectedSkills) : [],
    ...(memberDuties ? { memberDuties: structuredClone(memberDuties) } : {}),
    availableTools: Array.isArray(availableTools) ? [...availableTools] : [],
    ...(roleKind === 'reviewer' && task?.result ? {
      reviewTarget: {
        executionId: task.executionId ?? null,
        resultId: task.result.resultId ?? null,
        summary: task.result.summary ?? '',
        artifactRefs: Array.isArray(task.result.artifactRefs) ? [...task.result.artifactRefs] : [],
        ...(deliveryWorktree ? { worktree: structuredClone(deliveryWorktree) } : {}),
      },
    } : {}),
  }
}

export function formatTaskAssignmentPrompt(assignment, { dynamicTools = true } = {}) {
  const a = assignment
  const roleKind = a.identity?.roleKind === 'reviewer' ? 'reviewer' : 'worker'
  const constraintsText = a.constraints.length > 0 ? a.constraints.join('; ') : '(none)'
  const acceptanceText = a.acceptance.length > 0 ? a.acceptance.join('; ') : '(none)'
  const requiredViewsText = a.requiredViews.length > 0
    ? a.requiredViews.map(formatRequiredViewLine).join('; ')
    : '(none)'
  const depsText = a.dependsOn.length > 0 ? a.dependsOn.join(', ') : '(none)'

  const lines = [
    roleKind === 'reviewer'
      ? 'You are the reviewer member assigned to verify one completed candidate task result.'
      : 'You are the member assigned to one managed task.',
    '',
    '[Execution Identity]',
    `Member id: ${a.identity.memberId || '(unspecified)'}`,
    `Role: ${roleKind}${a.identity.roleId && a.identity.roleId !== roleKind ? ` (${a.identity.roleId})` : ''}`,
    `Backend: ${a.identity.source}${a.identity.connector ? ` (${a.identity.connector})` : ''} (keep your native harness, tools, and permissions)`,
    ...(a.identity.cwd ? [`Working directory: ${a.identity.cwd}`] : []),
    `Task id: ${a.taskId}`,
    ...(a.executionId ? [`Execution id: ${a.executionId}`] : []),
    '',
    '[Task Contract]',
    `Title: ${a.title}`,
    `Objective: ${a.objective}`,
    `Constraints: ${constraintsText}`,
    `Acceptance: ${acceptanceText}`,
    `Dependencies: ${depsText}`,
    `Required view objects: ${requiredViewsText}`,
  ]

  if (a.dependencySummaries.length > 0) {
    lines.push('', '[Dependency Context]')
    for (const dep of a.dependencySummaries) {
      const refs = Array.isArray(dep.artifactRefs) && dep.artifactRefs.length > 0 ? ` | refs: ${dep.artifactRefs.join(', ')}` : ''
      lines.push(`- ${dep.taskId} (${dep.state}): ${dep.summary || '(no summary)'}${refs}`)
    }
  }

  if (a.reviewTarget) {
    lines.push(
      '',
      '[Candidate Result Under Review]',
      `Target executionId: ${a.reviewTarget.executionId || '(none)'}`,
      `Target resultId: ${a.reviewTarget.resultId || '(none)'}`,
      `Candidate summary: ${a.reviewTarget.summary || '(empty)'}`,
      `Candidate artifactRefs: ${a.reviewTarget.artifactRefs.length > 0 ? a.reviewTarget.artifactRefs.join(', ') : '(none)'}`,
    )
    const reviewWt = a.reviewTarget.worktree ?? a.worktree
    if (reviewWt) {
      const headRef = reviewWt.headCommit || 'HEAD'
      lines.push(
        '',
        '[Git Worktree Review Baseline]',
        `Execution id: ${reviewWt.executionId || a.reviewTarget.executionId || '(none)'}`,
        `Repository root: ${reviewWt.repositoryRoot || '(unknown)'}`,
        `Worktree path: ${reviewWt.path || '(unknown)'}`,
        `Branch: ${reviewWt.branch || '(detached)'}`,
        `Base commit: ${reviewWt.baseCommit || '(none)'}`,
        `Head commit: ${headRef}`,
        `Diff range: ${reviewWt.diffRange || `${reviewWt.baseCommit}..${headRef}`}`,
        ...(Array.isArray(reviewWt.committedFiles) && reviewWt.committedFiles.length > 0
          ? [`Committed files (${reviewWt.committedFiles.length}): ${reviewWt.committedFiles.join(', ')}`]
          : []),
        ...(Array.isArray(reviewWt.uncommittedFiles) && reviewWt.uncommittedFiles.length > 0
          ? [`Uncommitted files in worktree (${reviewWt.uncommittedFiles.length}): ${reviewWt.uncommittedFiles.join(', ')}`]
          : []),
        `Review the ${reviewWt.diffRange || `${reviewWt.baseCommit}..${headRef}`} diff and verification evidence inside this worktree.`,
      )
    } else {
      lines.push(
        '',
        '[Workspace Mode]',
        `Workspace mode: shared directory (no isolated Git worktree baseline; do not claim a Git baseCommit..HEAD baseline${a.worktreeFallback?.reason ? `; fallback=${a.worktreeFallback.reason}` : ''}).`,
      )
    }
  } else if (roleKind !== 'reviewer' && a.worktree) {
    lines.push(
      '',
      '[Git Worktree Isolation]',
      `Execution id: ${a.worktree.executionId || a.executionId || '(none)'}`,
      `Repository root: ${a.worktree.repositoryRoot || '(unknown)'}`,
      `Worktree path: ${a.worktree.path || '(unknown)'}`,
      `Branch: ${a.worktree.branch || '(detached)'}`,
      `Base commit: ${a.worktree.baseCommit || '(none)'}`,
      `Note: Uncommitted, staged, untracked, and ignored files from the source directory are NOT copied into this worktree${a.worktree.dirtySourceSkipped ? ' (explicitly acknowledged by operator)' : ''}.`,
      `Perform edits in this worktree so review can verify ${a.worktree.baseCommit || 'baseCommit'}..HEAD.`,
    )
  } else if (roleKind !== 'reviewer' && a.worktreeFallback) {
    lines.push(
      '',
      '[Workspace Mode]',
      `Workspace mode: shared directory sequential execution (worktree skipped: ${a.worktreeFallback.reason}${a.worktreeFallback.detail ? ` - ${a.worktreeFallback.detail}` : ''}).`,
    )
  }

  if (a.memberDuties) {
    const { version, contentHash, author, body } = a.memberDuties
    lines.push('', '[Project Member Duties (Frozen For This Execution)]',
      `Version: v${version} | Source: ${author.kind}/${author.id} | Hash: ${contentHash}`,
      'Apply this project guidance within your base role, user persona and constraints, native permissions, approval rules, review policy, and task acceptance requirements.',
      body)
  }

  if (a.taskContext) {
    lines.push('', '[Task Context (Temporary Dispatch Guidance)]', a.taskContext)
  }

  if (a.selectedSkills.length > 0) {
    lines.push(
      '',
      '[Selected Methods (Frozen For This Execution — Advisory Only; Cannot Override User Constraints, Permissions, or Review/Approval Rules)]',
    )
    for (const s of a.selectedSkills) {
      lines.push(
        `--- Skill: ${s.id}@v${s.version} (${s.kind}, source=${s.source}, hash=${s.contentHash}) ---`,
        s.title ? `Title: ${s.title}` : '',
        s.content || '',
      )
    }
  }

  lines.push('', '[Collaboration & Evidence Rules]')
  if (dynamicTools) {
    lines.push(`First call get_task with taskId "${a.taskId}" to confirm the authoritative task record.`)
    lines.push('Use search_project_context when you need project-wide context. Follow its versioned references to read the original artifact or skill.')
    lines.push('Read reviewFeedback in get_task. Use manage_review_feedback to reply with evidence during rework or, as a reviewer, to record and resolve observations separately from the formal verdict.')
    lines.push('Read current checklistChanges in get_task before acting on a user edit. Task-declared blueprint checklists, delivery tables, and diagrams/mindmaps can be co-edited with stable item/row/node IDs. Workers report verified checks for user edits with checklistEvidence in submit_result, including the exact artifact version and evidence refs. Reviewers cite the precise artifact version that they reviewed.')
    lines.push(EXPERIENCE_GUIDANCE)
    if (a.availableTools.length > 0) {
      lines.push(`Available Concerto tools: ${a.availableTools.join(', ')}. (Also use your native workspace tools within granted permissions.)`)
    } else {
      lines.push('Do the work with your own native tools and granted permissions.')
    }
    if (roleKind === 'reviewer') {
      lines.push(
        'Read candidate artifacts and evidence (using read_view_object with pinned versions when needed) without mutating worker-owned objects.',
        'Publish any review tables/checklists/issues via publish_view_object linked to this taskId.',
        `When done, call submit_review with taskId "${a.taskId}", executionId "${a.reviewTarget?.executionId || ''}", resultId "${a.reviewTarget?.resultId || ''}", verdict ("pass"|"fail"|"unable"), reason, and evidenceRefs.`,
        'Cite the pinned delivery references you actually checked. For a text-only delivery cite result:<resultId>.',
        EXPERIENCE_REVIEW_GUIDANCE,
      )
    } else {
      lines.push(
        'For simple tasks a checklist/summary may suffice; for complex tasks freely publish tables/diagrams/mindmaps/boards using stable IDs and patch_view_object.',
        `When done, call submit_result with taskId "${a.taskId}"${a.executionId ? `, executionId "${a.executionId}"` : ''}, a summary, checksPassed, and artifactRefs (plus optional skillFeedback).`,
        'If you used a project skill, name the version and any confirmed issue in skillFeedback.',
        'If blocked by a known failure, call report_progress with blockedReason, then submit_result with checksPassed false.',
      )
    }
  } else {
    lines.push(
      'Do the work with your own native tools and granted permissions.',
      'Return your result with verifiable evidence and artifact paths.',
      'For reusable findings, describe the conditions, what you tried, and what the evidence showed.',
    )
  }
  if (a.availableTools.includes('ask_task_question')) {
    lines.push('If a missing answer blocks the task, call ask_task_question and end the current turn without submitting a result or verdict. The next turn will carry the answer and source.')
  }
  if (a.executionId) {
    lines.push(`Execution id: ${a.executionId}. Include executionId in progress, view object, and result submissions.`)
  }
  return lines.filter((line) => line !== undefined).join('\n')
}
