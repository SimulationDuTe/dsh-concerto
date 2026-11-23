/**
 * Team Tools：模型可调用的受管工具（按角色注入）。
 *
 * 角色来自 Runtime 的 Host Session 绑定；成员 preset 本身不是任务授权。
 *
 * `@deepseek-ai/dsh-tools` 只随 DSH 安装分发，link: 安装下解析不到，
 * 因此直接构造 ToolDefinition 注册。
 *
 * 设计：§4.4（流程/项目 Skill 发现读取与受管发布）、§7.3（团队工具与权限）、§9.2/§9.6（分层结构化成果）
 */

import { PUBLISH_VIEW_SCHEMA, PATCH_VIEW_SCHEMA } from './domain/view_publication.mjs'
import { PROJECT_CONTEXT_KINDS } from './domain/project_context.mjs'
import { EXPERIENCE_EVIDENCE_LIMIT, EXPERIENCE_FIELDS, EXPERIENCE_KINDS } from './domain/project_experience.mjs'

const renderJson = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
const jsonOutput = Object.freeze({ schema: { type: 'object' }, render: renderJson })

/** 工具 → 允许的角色。 */
const ROLES = Object.freeze({
  get_team_status: ['commander'],
  submit_decision: ['commander'],
  dispatch_task: ['commander'],
  dispatch_review: ['commander'],
  search_project_context: ['commander', 'worker', 'reviewer'],
  search_experience: ['commander', 'worker', 'reviewer'],
  record_experience: ['commander', 'worker', 'reviewer'],
  list_skills: ['commander', 'worker', 'reviewer'],
  read_skill: ['commander', 'worker', 'reviewer'],
  publish_project_skill: ['commander'],
  offer_project_skill: ['commander'],
  manage_member_duties: ['commander'],
  read_project_skill: ['commander', 'worker', 'reviewer'],
  get_task: ['commander', 'worker', 'reviewer'],
  ask_task_question: ['worker', 'reviewer'],
  request_review_exemption: ['commander'],
  ask_member_question_user: ['commander'],
  report_progress: ['commander', 'worker'],
  submit_result: ['commander', 'worker'],
  submit_review: ['commander', 'reviewer'],
  manage_review_feedback: ['worker', 'reviewer'],
  publish_view_object: ['commander', 'worker', 'reviewer'],
  patch_view_object: ['commander', 'worker', 'reviewer'],
  list_view_objects: ['commander', 'worker', 'reviewer'],
  read_view_object: ['commander', 'worker', 'reviewer'],
  update_team_view: ['commander'],
})

const WORKER_SCOPED_TASK_TOOLS = new Set(['get_task', 'report_progress', 'submit_result', 'publish_view_object', 'patch_view_object', 'manage_review_feedback', 'record_experience'])
const WORKER_SCOPED_EXEC_TOOLS = new Set(['report_progress', 'submit_result', 'publish_view_object', 'patch_view_object'])
const REVIEWER_SCOPED_TASK_TOOLS = new Set(['get_task', 'submit_review', 'publish_view_object', 'patch_view_object', 'manage_review_feedback', 'record_experience'])
const REVIEWER_SCOPED_EXEC_TOOLS = new Set(['publish_view_object', 'patch_view_object'])

function bindScopedTaskArgs(scope, toolName, rawArgs) {
  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {}
  if (scope?.roleKind === 'worker') {
    if (scope.taskId && WORKER_SCOPED_TASK_TOOLS.has(toolName)) {
      if (args.taskId !== undefined && args.taskId !== scope.taskId) {
        return { ok: false, error: { ok: false, code: 'unauthorized', detail: 'taskId out of execution scope' } }
      }
      args.taskId ??= scope.taskId
    }
    if (scope.executionId && WORKER_SCOPED_EXEC_TOOLS.has(toolName)) {
      if (args.executionId !== undefined && args.executionId !== scope.executionId) {
        return { ok: false, error: { ok: false, code: 'unauthorized', detail: 'executionId out of execution scope' } }
      }
      args.executionId ??= scope.executionId
    }
  } else if (scope?.roleKind === 'reviewer') {
    if (scope.taskId && REVIEWER_SCOPED_TASK_TOOLS.has(toolName)) {
      if (args.taskId !== undefined && args.taskId !== scope.taskId) {
        return { ok: false, error: { ok: false, code: 'unauthorized', detail: 'taskId out of review execution scope' } }
      }
      args.taskId ??= scope.taskId
    }
    if (scope.executionId && REVIEWER_SCOPED_EXEC_TOOLS.has(toolName)) {
      if (args.executionId !== undefined && args.executionId !== scope.executionId) {
        return { ok: false, error: { ok: false, code: 'unauthorized', detail: 'executionId out of review execution scope' } }
      }
      args.executionId ??= scope.executionId
    }
  }
  return { ok: true, args }
}

function actorFromScope(scope) {
  return { kind: 'member', id: scope.memberId, role: scope.roleKind }
}

const SKILL_REF_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', description: 'Workflow or project skill id.' },
    version: { type: 'number', description: 'Optional pinned integer version (project skills default to latest and freeze at dispatch).' },
    kind: { type: 'string', description: 'Optional: workflow | project.' },
  },
}

export function buildToolDefinitions(runtime, deps = {}) {
  const resolveCaps = async (scope) => (typeof deps.inspectMemberCapability === 'function'
    ? await deps.inspectMemberCapability(scope)
    : (scope?.capabilities ?? null))

  return [
    {
      name: 'get_team_status',
      roles: ROLES.get_team_status,
      description: 'Commander only: read team status, including pending member requests, goalId, goalCompletion and its skillOffer, planRevision, planGate, paused, dispatchLimits, task dispatchBudget, verified memberCapabilities, cwd, and viewObjectRefs. When planGate is present, it must be approved before creating or dispatching work. The user confirms the plan and controls pause and dispatch limits.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      isConcurrencySafe: () => true,
      run: async (_args, _exec, scope) => {
        const status = runtime.getModelStatus(scope.teamSessionId)
        const fullSnapshot = runtime.getStatus(scope.teamSessionId)
        const capabilities = typeof deps.inspectTeamCapabilities === 'function'
          ? await deps.inspectTeamCapabilities(scope.teamId, fullSnapshot)
          : null
        return {
          ...status,
          ...(fullSnapshot?.metadata?.cwd ? { cwd: fullSnapshot.metadata.cwd } : {}),
          ...(capabilities ? { memberCapabilities: capabilities } : {}),
        }
      },
    },
    {
      name: 'ask_member_question_user',
      roles: ROLES.ask_member_question_user,
      description: 'Commander only: get an explicit native user answer for a pending member question in this run. Read its requestId from get_team_status. The recorded answer is delivered to the original bound member.',
      parameters: { type: 'object', additionalProperties: false, required: ['requestId'], properties: { requestId: { type: 'string' } } },
      run: (args, exec, scope) => deps.askMemberQuestionUser?.(args, exec, scope) ?? { ok: false, code: 'precondition_failed', detail: 'native user question channel unavailable' },
    },
    {
      name: 'ask_task_question',
      roles: ROLES.ask_task_question,
      description: 'Ask a blocking question for your bound execution. Once accepted, end this native turn without submitting a result. Concerto starts another turn with the answer. Set reuseConfirmedAnswer only for the exact same fact in this task; omit it for anything requiring a fresh user decision. Provide artifactCell only to look up one cell in a pinned shared project table.',
      parameters: {
        type: 'object', additionalProperties: false, required: ['question'],
        properties: {
          question: { type: 'string', description: 'A single question, up to 600 characters.' },
          reuseConfirmedAnswer: { type: 'boolean' },
          artifactCell: {
            type: 'object', additionalProperties: false, required: ['teamSessionId', 'id', 'version', 'row', 'column'],
            properties: {
              teamSessionId: { type: 'string' }, id: { type: 'string' }, version: { type: 'integer' },
              row: { type: 'integer', description: '1-based row number.' }, column: { type: 'string', description: 'Exact column name.' },
            },
          },
        },
      },
      whenBound: true,
      run: (args, _exec, scope) => deps.askQuestion?.(args, scope) ?? { ok: false, code: 'precondition_failed', detail: 'next-turn question channel unavailable' },
    },
    {
      name: 'request_review_exemption',
      roles: ROLES.request_review_exemption,
      description: 'Commander only: ask the user in a native DSH confirmation to exempt one pending task from the Team/Profile review floor before first dispatch. Explain the reason. The tool never grants approval itself. Respect a declined answer.',
      parameters: {
        type: 'object', additionalProperties: false, required: ['taskId', 'reason', 'commandId'],
        properties: {
          taskId: { type: 'string' }, reason: { type: 'string', description: 'Reason shown to the user, up to 1200 characters.' },
          commandId: { type: 'string', description: 'Stable idempotency key for this request.' },
        },
      },
      run: (args, exec, scope) => deps.requestReviewExemption?.(args, exec, scope) ??
        { ok: false, code: 'host_unavailable', detail: 'native review exemption confirmation is unavailable' },
    },
    {
      name: 'submit_decision',
      roles: ROLES.submit_decision,
      description: 'Commander only: submit one team decision with the current planRevision. Idempotent by decisionId. Use request_cancel for a pending task or to request interruption of a current execution. Use unblock_task with taskId, expectedUpdatedAt from get_team_status, and a reason that explains how the blocker was resolved. Other actions are propose_plan, create_task, modify_task, finish_goal and wait.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['decisionId', 'expectedPlanRevision', 'action', 'payload'],
        properties: {
          decisionId: { type: 'string', description: 'Unique in the project. Reuse only to retry the same decision with identical content in its original run.' },
          expectedPlanRevision: { type: 'number', description: 'planRevision read from get_team_status, passed back verbatim.' },
          action: { type: 'string', description: 'propose_plan | create_task | modify_task | request_cancel | unblock_task | finish_goal | wait' },
          payload: { type: 'object', description: 'Action payload validated per action. For propose_plan, provide planId and the current integer planVersion from publication. For finish_goal, provide goalId from get_team_status, summary, and optional artifactRefs.' },
        },
      },
      run: (args, exec, scope) => (deps.submitDecision ?? runtime.submit)(args, scope.teamSessionId, actorFromScope(scope), exec, scope),
    },
    {
      name: 'dispatch_task',
      roles: ROLES.dispatch_task,
      description: 'Commander only: dispatch one pending task to a team worker. Freezes optional skillRefs and delivers temporary taskContext. A recorded capability mismatch blocks the task. After resolving it, use unblock_task and dispatch with a new commandId. Replays return the original outcome.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'commandId'],
        properties: {
          taskId: { type: 'string', description: 'Task id to dispatch.' },
          commandId: { type: 'string', description: 'Client-chosen idempotency key; reuse only for identical dispatch parameters.' },
          memberId: { type: 'string', description: 'Target worker memberId from team configuration (optional when uniquely determined).' },
          cwd: { type: 'string', description: 'Optional working directory; defaults to session cwd or isolated retry directory.' },
          sandbox: { type: 'string', description: 'read-only | workspace-write (for external connector; write tasks for external workers default to workspace-write, read-only tasks and reviewers default to read-only; hosted workers use preset capabilities).' },
          approvals: { type: 'string', description: 'ask | accept | decline (defaults to ask).' },
          worktreeMode: { type: 'string', enum: ['auto', 'worktree', 'isolated_clean', 'shared'], description: 'Git write isolation mode: auto prefers an isolated worktree when clean and rejects dirty repos; isolated_clean checks out clean HEAD without copying uncommitted/untracked files; shared runs sequentially in the shared workspace.' },
          skillRefs: { type: 'array', description: 'Optional workflow/project skill references to freeze and deliver to the member.', items: SKILL_REF_ITEM_SCHEMA },
          taskContext: { type: 'string', description: 'Optional temporary task-specific guidance for this dispatch only (use instead of creating one-off skills).' },
        },
      },
      run: async (args, exec, scope) => {
        if (typeof deps.dispatchTask !== 'function') {
          return { ok: false, code: 'unavailable', detail: 'dispatch_task host service unavailable' }
        }
        return await deps.dispatchTask({
          sessionId: scope.sessionId,
          taskId: args.taskId,
          commandId: args.commandId,
          ...(args.memberId !== undefined ? { memberId: args.memberId } : {}),
          ...(args.cwd !== undefined ? { cwd: args.cwd } : {}),
          ...(args.sandbox !== undefined ? { sandbox: args.sandbox } : {}),
          ...(args.approvals !== undefined ? { approvals: args.approvals } : {}),
          ...(args.worktreeMode !== undefined ? { worktreeMode: args.worktreeMode } : {}),
          ...(args.skillRefs !== undefined ? { skillRefs: args.skillRefs } : {}),
          ...(args.taskContext !== undefined ? { taskContext: args.taskContext } : {}),
        }, {
          kind: 'model',
          actorId: scope.memberId || 'commander',
          roleKind: scope.roleKind,
          callId: exec?.callId ?? null,
          hostSessionId: scope.sessionId,
        })
      },
    },
    {
      name: 'dispatch_review',
      roles: ROLES.dispatch_review,
      description: 'Commander only: dispatch a configured reviewer member to independently verify a task currently in review state. Freezes optional skillRefs and delivers read-only task context.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'commandId'],
        properties: {
          taskId: { type: 'string', description: 'Task id in review state.' },
          commandId: { type: 'string', description: 'Client-chosen idempotency key.' },
          memberId: { type: 'string', description: 'Target reviewer memberId from team configuration (optional when uniquely determined).' },
          skillRefs: { type: 'array', description: 'Optional workflow/project skill references to freeze and deliver to the reviewer.', items: SKILL_REF_ITEM_SCHEMA },
          taskContext: { type: 'string', description: 'Optional temporary review guidance for this dispatch.' },
        },
      },
      run: async (args, exec, scope) => {
        if (typeof deps.dispatchReview !== 'function') {
          return { ok: false, code: 'unavailable', detail: 'dispatch_review host service unavailable' }
        }
        return await deps.dispatchReview({
          sessionId: scope.sessionId,
          taskId: args.taskId,
          commandId: args.commandId,
          ...(args.memberId !== undefined ? { memberId: args.memberId } : {}),
          ...(args.skillRefs !== undefined ? { skillRefs: args.skillRefs } : {}),
          ...(args.taskContext !== undefined ? { taskContext: args.taskContext } : {}),
        }, {
          kind: 'model',
          actorId: scope.memberId || 'commander',
          roleKind: scope.roleKind,
          callId: exec?.callId ?? null,
          hostSessionId: scope.sessionId,
        })
      },
    },
    {
      name: 'search_project_context',
      roles: ROLES.search_project_context,
      description: 'Find short entries for the current project objective, confirmed decisions, shared artifacts, or eligible project skills. Use returned read tool arguments to open a pinned version.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', maxLength: 240, description: 'Optional keywords from a title, ID, or summary.' },
          kind: { type: 'string', enum: PROJECT_CONTEXT_KINDS, description: 'Optional entry kind.' },
        },
      },
      isConcurrencySafe: () => true,
      run: async (args, _exec, scope) => runtime.searchProjectContext(scope.teamSessionId, args, {
        roleKind: scope.roleKind,
        capabilities: await resolveCaps(scope),
      }),
    },
    {
      name: 'search_experience',
      roles: ROLES.search_experience,
      description: 'Find up to three evidence-backed short experiences or eligible project skills. Short hits include applicability, method, outcome, and proof. Read longer methods by their returned skill version.',
      parameters: {
        type: 'object', additionalProperties: false,
        properties: {
          query: { type: 'string', maxLength: 240, description: 'Problem, error, environment, or planned action.' },
          kind: { type: 'string', enum: [...EXPERIENCE_KINDS, 'skill'] },
        },
      },
      isConcurrencySafe: () => true,
      run: async (args, _exec, scope) => runtime.searchExperience(scope.teamSessionId, args, {
        roleKind: scope.roleKind, capabilities: await resolveCaps(scope),
      }),
    },
    {
      name: 'record_experience',
      roles: ROLES.record_experience,
      description: 'Append a reusable success or reproducible failure to the bound task. Verified native command facts or independently reviewed observations become searchable in the project. Use a new mutationId per observation.',
      parameters: {
        type: 'object', additionalProperties: false,
        required: ['mutationId', 'kind', ...Object.keys(EXPERIENCE_FIELDS), 'evidenceRefs'],
        properties: {
          taskId: { type: 'string', description: 'Bound automatically for dispatched members. Commander supplies the task ID.' },
          mutationId: { type: 'string', maxLength: 120 },
          kind: { type: 'string', enum: EXPERIENCE_KINDS },
          ...Object.fromEntries(Object.entries(EXPERIENCE_FIELDS).map(([name, maxLength]) => [name, { type: 'string', maxLength }])),
          evidenceRefs: {
            type: 'array', minItems: 1, maxItems: EXPERIENCE_EVIDENCE_LIMIT, items: { type: 'string', maxLength: 240 },
            description: 'Task artifact version, result:<resultId>, or event:<eventId>. Use native_command with method equal to the executed command and result formatted as exit code N. Other refs stay in task notes until supported by bound evidence.',
          },
          basedOn: {
            type: 'object', additionalProperties: false, required: ['kind', 'id', 'version'],
            properties: {
              kind: { type: 'string', enum: ['experience', 'skill'] },
              id: { type: 'string' },
              version: { type: 'integer' },
            },
          },
        },
      },
      run: async (args, _exec, scope) => {
        const capabilities = args.basedOn?.kind === 'skill' ? await resolveCaps(scope) : null
        return runtime.recordExperience(scope.teamSessionId, args, scope, capabilities)
      },
    },
    {
      name: 'list_skills',
      roles: ROLES.list_skills,
      description: 'List allowed workflow and project-scoped skills (short index only, filtered by caller role and actual capabilities).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', description: 'all | workflow | project (default all).' },
          includeIneligible: { type: 'boolean', description: 'Include ineligible entries with reasons (default false).' },
        },
      },
      isConcurrencySafe: () => true,
      run: async (args, _exec, scope) => {
        const capabilities = await resolveCaps(scope)
        return runtime.listSkills(scope.teamSessionId, args, {
          roleKind: scope.roleKind,
          capabilities,
          executionId: scope.executionId ?? null,
        })
      },
    },
    {
      name: 'read_skill',
      roles: ROLES.read_skill,
      description: 'Read a workflow or project skill on demand (optionally at a specific version or reference topic, e.g. topic="table" for structured-artifact-publishing).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Skill id from list_skills.' },
          kind: { type: 'string', description: 'Optional: workflow | project.' },
          version: { type: 'number', description: 'Optional positive integer version.' },
          topic: { type: 'string', description: 'Optional reference topic within the skill (avoids loading all tutorials).' },
        },
      },
      isConcurrencySafe: () => true,
      run: async (args, _exec, scope) => {
        const capabilities = await resolveCaps(scope)
        return runtime.readSkill(scope.teamSessionId, args, actorFromScope(scope), {
          roleKind: scope.roleKind,
          capabilities,
          executionId: scope.executionId ?? null,
        })
      },
    },
    {
      name: 'publish_project_skill',
      roles: ROLES.publish_project_skill,
      description: 'Commander only: create or revise a project-scoped reusable method after loading "project-skill-authoring". After goal completion, requires user approval from offer_project_skill and sourceRefs. Enforces expectedVersion CAS and mutationId idempotency.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'body'],
        properties: {
          id: { type: 'string', description: 'Project skill id matching /^[a-z0-9][a-z0-9._-]{0,63}$/.' },
          title: { type: 'string', description: 'Human-readable skill title.' },
          description: { type: 'string', description: 'Concise 1-line applicability summary for the discovery index.' },
          body: { type: 'string', description: 'Executable method markdown (inputs, steps, stop conditions, evidence, sources).' },
          whenToUse: { type: 'string', description: 'Optional explicit applicability condition.' },
          whenNotToUse: { type: 'string', description: 'Optional explicit non-applicability condition.' },
          requiredCapabilities: { type: 'array', description: 'Optional capability tags required: fileRead|fileWrite|fileEdit|search|shell|readonly|coding.', items: { type: 'string' } },
          sourceRefs: { type: 'array', description: 'Optional project file/doc references cited by this method.', items: { type: 'string' } },
          references: { type: 'object', description: 'Optional map of topic -> detailed reference markdown.' },
          expectedVersion: { type: 'number', description: 'CAS version (0 or omitted when creating; exact latestVersion when revising).' },
          mutationId: { type: 'string', description: 'Optional idempotency key.' },
        },
      },
      run: (args, _exec, scope) => runtime.publishProjectSkill(scope.teamSessionId, args, actorFromScope(scope)),
    },
    {
      name: 'offer_project_skill',
      roles: ROLES.offer_project_skill,
      description: 'Commander only: after finish_goal, ask the user once in this DSH conversation whether to retain verified closeout experience. Include a concise summary and evidence. Returns the existing offer on repeat calls. Only an approved answer allows publishing closeout skills.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'sourceRefs'],
        properties: {
          summary: { type: 'string', description: 'Reusable successful methods, applicability and how they were verified, up to 1200 characters.' },
          sourceRefs: { type: 'array', items: { type: 'string' }, description: '1 to 12 references to verified evidence, each up to 240 characters.' },
        },
      },
      run: (args, exec, scope) => deps.offerProjectSkill
        ? deps.offerProjectSkill(args, exec, scope)
        : { ok: false, code: 'host_unavailable', detail: 'DSH userQuestions is unavailable' },
    },
    {
      name: 'manage_member_duties',
      roles: ROLES.manage_member_duties,
      description: 'Read, save, or revoke project-specific guidance for a worker or reviewer in the current team. Changes apply to future dispatches. Guidance preserves base roles, user persona, permissions, approvals, review and acceptance rules.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['memberId', 'action'],
        properties: {
          memberId: { type: 'string', description: 'Target worker or reviewer in the current team.' },
          action: { type: 'string', enum: ['read', 'save', 'revoke'] },
          body: { type: 'string', description: 'Required for save. Project responsibilities, conventions, or deliverables.' },
          expectedVersion: { type: 'number', description: 'Required for save and revoke. Use the latest version, or 0 when creating.' },
        },
      },
      run: (args, _exec, scope) => {
        const result = args.action === 'read'
          ? runtime.readMemberDuties(scope.teamSessionId, args.memberId)
          : runtime.updateMemberDuties(scope.teamSessionId, args, actorFromScope(scope))
        return result.ok ? { ok: true, current: result.current } : result
      },
    },
    {
      name: 'read_project_skill',
      roles: ROLES.read_project_skill,
      description: 'Read a project-scoped skill in the current project, optionally pinned to a specific version.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Project skill id.' },
          version: { type: 'number', description: 'Optional pinned positive integer version.' },
        },
      },
      isConcurrencySafe: () => true,
      run: async (args, _exec, scope) => {
        const capabilities = await resolveCaps(scope)
        return runtime.readProjectSkill(scope.teamSessionId, args, actorFromScope(scope), {
          roleKind: scope.roleKind,
          capabilities,
          executionId: scope.executionId ?? null,
        })
      },
    },
    {
      name: 'get_task',
      roles: ROLES.get_task,
      description: 'Read one managed task, including reviewFeedback and checklistChanges (user edits on shared task checklists, tables, or diagrams/mindmaps). Reading records which member execution received the current changes.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: { taskId: { type: 'string', description: 'Task id.' } },
      },
      run: (args, _exec, scope) => runtime.readMemberTask(args, scope.teamSessionId, scope),
    },
    {
      name: 'manage_review_feedback',
      roles: ROLES.manage_review_feedback,
      description: 'Follow up on task feedback. Workers reply with revision evidence. Reviewers can also create, close, or reopen feedback. Closing feedback does not change formal review or acceptance.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: {
          taskId: { type: 'string', description: 'Task id, defaults to the bound task.' },
          action: { type: 'string', enum: ['create', 'reply', 'close', 'reopen'] },
          feedbackId: { type: 'string', description: 'Existing feedback to reply to, close, or reopen.' },
          expectedVersion: { type: 'number', description: 'Current feedback version from get_task, required for updates.' },
          text: { type: 'string', description: 'Feedback or revision summary, required for create and reply.' },
          targetExecutionId: { type: 'string', description: 'Execution ID of the current result when creating feedback.' },
          targetResultId: { type: 'string', description: 'Current result ID when creating feedback.' },
          targetRef: { type: 'string', description: 'Optional artifact target, using type:id@vN.' },
          itemId: { type: 'string', description: 'Optional checklist item, graph node, or table row-N in the target version.' },
          evidenceRefs: { type: 'array', items: { type: 'string' }, description: 'Reply evidence, such as tests.log or checklist:acceptance@v2.' },
          commandId: { type: 'string', description: 'Optional idempotency key. Reuse only for identical input.' },
        },
      },
      run: (args, _exec, scope) => runtime.reviewFeedback(scope.teamSessionId, args,
        { ...actorFromScope(scope), executionId: scope.executionId }),
    },
    {
      name: 'report_progress',
      roles: ROLES.report_progress,
      description: 'Record progress on a task. Informational only: it does not change the task state; pass blockedReason to record a blocker.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: {
          taskId: { type: 'string', description: 'Task id.' },
          executionId: { type: 'string', description: 'Current execution id from get_task; required for assigned members.' },
          note: { type: 'string', description: 'What was done or is being investigated.' },
          blockedReason: { type: 'string', description: 'Set when the task is blocked.' },
        },
      },
      run: (args, _exec, scope) => runtime.reportProgress(args, scope.teamSessionId, actorFromScope(scope)),
    },
    {
      name: 'submit_result',
      roles: ROLES.submit_result,
      description: 'Submit a candidate for the current execution. Use checklistEvidence to report checks for user edits read via get_task. Member self-reports await review.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'executionId', 'summary'],
        properties: {
          taskId: { type: 'string', description: 'Task id.' },
          executionId: { type: 'string', description: 'Current execution id from get_task.' },
          summary: { type: 'string', description: 'What was delivered, in one or two sentences.' },
          artifactRefs: { type: 'array', description: 'Pin produced artifacts as type:id@vN, cite a native event:eventId, or use a readable file path within the execution workspace.', items: { type: 'string' } },
          checklistEvidence: {
            type: 'array',
            description: 'Verification evidence for current user edits (checklists, tables, diagrams, or mindmaps) read via get_task. Include the exact artifact version you checked.',
            items: {
              type: 'object', additionalProperties: false, required: ['changeId', 'version', 'evidenceRefs'],
              properties: {
                changeId: { type: 'string' },
                version: { type: 'integer', description: 'Current artifact version used for verification.' },
                evidenceRefs: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          checksPassed: { type: 'boolean', description: 'Whether the acceptance checks actually passed.' },
          blockReason: { type: 'string', description: 'Why the task is blocked when checks failed.' },
          skillFeedback: {
            type: 'array',
            description: 'Optional member-reported feedback on delivered skills (does not replace verified acceptance evidence).',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id'],
              properties: {
                id: { type: 'string' },
                version: { type: 'number' },
                outcome: { type: 'string', description: 'used | not_needed | issue' },
                note: { type: 'string' },
              },
            },
          },
        },
      },
      run: (args, _exec, scope) => runtime.submitResult(args, scope.teamSessionId, actorFromScope(scope)),
    },
    {
      name: 'submit_review',
      roles: ROLES.submit_review,
      description: 'Review a task result. Only tasks in review state qualify. pass completes (bound to a review id); fail returns it to pending; unable is rejected.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'executionId', 'resultId', 'verdict'],
        properties: {
          taskId: { type: 'string', description: 'Task id under review.' },
          executionId: { type: 'string' },
          resultId: { type: 'string', description: 'Exact result id under review.' },
          verdict: { type: 'string', description: 'pass | fail | unable' },
          reason: { type: 'string', description: 'Why this verdict, citing checked evidence.' },
          evidenceRefs: { type: 'array', description: 'Artifact ids (e.g. table:data@v1) or paths.', items: { type: 'string' } },
          verifiedExperienceRefs: {
            type: 'array', maxItems: EXPERIENCE_EVIDENCE_LIMIT, items: { type: 'string' },
            description: 'Optional exact observations from get_task that you independently verified. Cite their bound sources in evidenceRefs.',
          },
        },
      },
      run: (args, _exec, scope) => runtime.submitReview(args, scope.teamSessionId, actorFromScope(scope), scope),
    },
    {
      name: 'publish_view_object',
      roles: ROLES.publish_view_object,
      description: 'Publish a semantic artifact with a stable scoped id and data matching type. Compatible renderers: table/checklist → html, mindmap → markmap|svg|html|excalidraw, diagram → svg|excalidraw, board → excalidraw. Concerto computes layout. Raw HTML/CSS/SVG, coordinates and Excalidraw scenes are rejected. On replacement pass the exact expectedVersion. Read structured-artifact-publishing by topic for examples.',
      parameters: PUBLISH_VIEW_SCHEMA,
      run: (args, _exec, scope) => runtime.publishViewObject(scope.teamSessionId, args, actorFromScope(scope)),
    },
    {
      name: 'patch_view_object',
      roles: ROLES.patch_view_object,
      description: 'Patch an existing table, checklist, mindmap or diagram by id and expectedVersion. Send the semantic fields for the selected operation. Raw source, coordinates and scene fields are rejected.',
      parameters: PATCH_VIEW_SCHEMA,
      run: (args, _exec, scope) => runtime.patchViewObject(scope.teamSessionId, args, actorFromScope(scope)),
    },
    {
      name: 'list_view_objects',
      roles: ROLES.list_view_objects,
      description: 'List metadata summaries of structured view objects without full payloads.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          authorId: { type: 'string' },
          type: { type: 'string' },
        },
      },
      isConcurrencySafe: () => true,
      run: (args, _exec, scope) => runtime.listViewObjects(scope.teamSessionId, args),
    },
    {
      name: 'read_view_object',
      roles: ROLES.read_view_object,
      description: 'Read a structured object in this run. For a project index reference, pass its teamSessionId and exact version. Supports table/checklist/diagram ranges and mindmap subtrees.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: { type: 'string' },
          version: { type: 'number' },
          teamSessionId: { type: 'string', description: 'Source run from search_project_context. Requires a pinned version and project-shared object.' },
          offset: { type: 'number' },
          limit: { type: 'number' },
          subtreeNodeId: { type: 'string' },
          maxDepth: { type: 'number' },
        },
      },
      isConcurrencySafe: () => true,
      run: (args, _exec, scope) => args.teamSessionId === undefined
        ? runtime.readViewObject(scope.teamSessionId, args)
        : runtime.readProjectViewObject(scope.teamSessionId, args),
    },
    {
      name: 'update_team_view',
      roles: ROLES.update_team_view,
      description: 'Commander only: organize the public team briefing (addressing 当前进展, 关键问题, 下一步), grouped sections, and Commander-recommended pinnedRefs using artifact references. Never overwrites user-pinned preferences (userPinnedRefs).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string', description: 'Public team plan or status note shown on Team Home.' },
          pinnedRefs: {
            type: 'array',
            description: 'Ordered references to display on Team Home Stage.',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['type', 'id'],
              properties: {
                type: { type: 'string', description: 'table | checklist | mindmap | diagram | board | html' },
                id: { type: 'string', description: 'Scoped view object id.' },
                size: { type: 'string', description: 'Optional Bento card size: s | m | l' },
              },
            },
          },
          sections: {
            type: 'array',
            description: 'Optional named Bento groups [{ title?, refs: [{ type, id, size? }] }].',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['refs'],
              properties: {
                title: { type: 'string' },
                refs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'id'],
                    properties: {
                      type: { type: 'string', description: 'table | checklist | mindmap | diagram | board | html' },
                      id: { type: 'string' },
                      size: { type: 'string', description: 's | m | l' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      run: (args, _exec, scope) => runtime.updateTeamView(scope.teamSessionId, args, actorFromScope(scope)),
    },
  ]
}

function schemasForRole(role) {
  return Object.freeze(
    buildToolDefinitions(null)
      .filter((def) => def.roles.includes(role))
      .map((def) => ({
        type: 'function',
        name: def.name,
        description: def.description,
        inputSchema: def.parameters,
      })),
  )
}

export const COMMANDER_TOOL_SCHEMAS = schemasForRole('commander')
export const WORKER_TOOL_SCHEMAS = schemasForRole('worker')
export const REVIEWER_TOOL_SCHEMAS = schemasForRole('reviewer')

function canUseTool(def, scope) {
  return Boolean(scope && def.roles.includes(scope.roleKind) && (!def.whenBound || (scope.taskId && scope.executionId)))
}

export async function executeMemberToolCall(runtime, scope, toolName, rawArgs = {}, deps = {}) {
  const def = buildToolDefinitions(runtime, deps).find((d) => d.name === toolName)
  if (!def) return { ok: false, code: 'unknown_tool', detail: String(toolName) }
  if (!canUseTool(def, scope)) return { ok: false, code: 'unauthorized' }
  const bound = bindScopedTaskArgs(scope, toolName, rawArgs)
  if (!bound.ok) return bound.error
  const args = bound.args
  if (args.taskId) {
    const access = runtime.authorizeTask(scope.teamSessionId, args, scope, def.name)
    if (!access.ok) return access
  }
  return await def.run(args, null, scope)
}

export function registerConcertoTools(ctx, runtime, { scopeOf, submitDecision, dispatchTask, dispatchReview, inspectTeamCapabilities, inspectMemberCapability, offerProjectSkill, requestReviewExemption, askQuestion, askMemberQuestionUser } = {}) {
  const scopeFor = (activation, note = true) => {
    const session = activation?.agent?.session
    const scope = typeof scopeOf === 'function' ? scopeOf(session) : null
    if (note) {
      runtime.noteActivation({
        preset: scope?.preset ?? null,
        agentId: activation?.agent?.id ?? null,
        matched: Boolean(scope),
        roleKind: scope?.roleKind ?? null,
      })
    }
    return scope
  }

  const definitions = buildToolDefinitions(runtime, {
    submitDecision,
    dispatchTask,
    dispatchReview,
    inspectTeamCapabilities,
    inspectMemberCapability,
    offerProjectSkill,
    requestReviewExemption,
    askQuestion,
    askMemberQuestionUser,
  })

  const disposers = []
  for (const def of definitions) {
    const definition = {
      name: def.name,
      description: def.description,
      parameters: def.parameters,
      output: jsonOutput,
      isConcurrencySafe: def.isConcurrencySafe ?? (() => false),
      async execute(args, exec) {
        const scope = scopeFor(exec, false)
        if (!canUseTool(def, scope)) return { ok: false, code: 'unauthorized' }
        const bound = bindScopedTaskArgs(scope, def.name, args)
        if (!bound.ok) return bound.error
        const scopedArgs = bound.args
        if (scopedArgs.taskId) {
          const access = runtime.authorizeTask(scope.teamSessionId, scopedArgs, scope, def.name)
          if (!access.ok) return access
        }
        const rawResult = await def.run(scopedArgs, exec, scope)
        const result = rawResult !== undefined ? JSON.parse(JSON.stringify(rawResult)) : null
        // 宿主诊断记录；客户端从 toolview 的持久化 result block 渲染。
        runtime.recordStructured(scope.teamSessionId, exec && exec.callId, { tool: def.name, payload: result })
        return result
      },
    }
    try {
      const dispose = ctx.tools.register(definition, {
        when: (activation) => {
          const scope = scopeFor(activation)
          return canUseTool(def, scope)
        },
      })
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      ctx.logger?.warn?.(`dsh-concerto: could not register ${def.name}: ${error && error.message ? error.message : error}`)
    }
  }
  return disposers
}
