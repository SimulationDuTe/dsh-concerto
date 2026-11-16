/**
 * Team Tools：模型可调用的受管工具（按角色注入）。
 *
 * 角色来自 Runtime 的 Host Session 绑定；成员 preset 本身不是任务授权。
 *
 * `@deepseek-ai/dsh-tools` 只随 DSH 安装分发，link: 安装下解析不到，
 * 因此直接构造 ToolDefinition 注册。
 *
 * 设计：§7.3（六个工具与权限）、§5.1（角色差异）
 */

const renderJson = (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }]
const jsonOutput = Object.freeze({ schema: { type: 'object' }, render: renderJson })

/** 工具 → 允许的角色。 */
const ROLES = Object.freeze({
  get_team_status: ['commander'],
  submit_decision: ['commander'],
  dispatch_task: ['commander'],
  get_task: ['commander', 'worker', 'reviewer'],
  report_progress: ['commander', 'worker'],
  submit_result: ['commander', 'worker'],
  submit_review: ['commander', 'reviewer'],
  publish_view_object: ['commander', 'worker', 'reviewer'],
  patch_view_object: ['commander', 'worker', 'reviewer'],
  list_view_objects: ['commander', 'worker', 'reviewer'],
  read_view_object: ['commander', 'worker', 'reviewer'],
  update_team_view: ['commander'],
})

export function buildToolDefinitions(runtime, deps = {}) {
  return [
    {
      name: 'get_team_status',
      roles: ROLES.get_team_status,
      description: 'Commander only: read the team status (planRevision, tasks, verified memberCapabilities, cwd, and viewObjectRefs metadata). Call before submit_decision or dispatch_task.',
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
      name: 'submit_decision',
      roles: ROLES.submit_decision,
      description: 'Commander only: submit one team decision. Idempotent by decisionId; rejected with stale when expectedPlanRevision is not current. Supports create_task (with optional requiredViews such as ["mindmap:plan", { type: "checklist", id: "accept", requiredForAcceptance: true }]), modify_task (pending only), and wait.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['decisionId', 'expectedPlanRevision', 'action', 'payload'],
        properties: {
          decisionId: { type: 'string', description: 'Client-chosen idempotency key; reuse only for identical content.' },
          expectedPlanRevision: { type: 'number', description: 'planRevision read from get_team_status, passed back verbatim.' },
          action: { type: 'string', description: 'create_task | modify_task | wait (others rejected as unsupported).' },
          payload: { type: 'object', description: 'Action payload; validated per action.' },
        },
      },
      run: (args, _exec, scope) => runtime.submit(args, scope.teamSessionId, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
    },
    {
      name: 'dispatch_task',
      roles: ROLES.dispatch_task,
      description: 'Commander only: dispatch one pending task to a team worker. Idempotent by commandId; checks member capabilities and rejects capability mismatches without silent fallback.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'commandId'],
        properties: {
          taskId: { type: 'string', description: 'Task id to dispatch.' },
          commandId: { type: 'string', description: 'Client-chosen idempotency key; reuse only for identical dispatch parameters.' },
          memberId: { type: 'string', description: 'Target worker memberId from team configuration (optional when uniquely determined).' },
          cwd: { type: 'string', description: 'Optional working directory; defaults to session cwd or isolated retry directory.' },
          sandbox: { type: 'string', description: 'read-only | workspace-write (for external connector; hosted workers use preset capabilities).' },
          approvals: { type: 'string', description: 'ask | accept | decline (defaults to ask).' },
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
      name: 'get_task',
      roles: ROLES.get_task,
      description: 'Read one managed task (state, attempt, result, progress).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId'],
        properties: { taskId: { type: 'string', description: 'Task id.' } },
      },
      isConcurrencySafe: () => true,
      run: (args, _exec, scope) => runtime.getTask(args, scope.teamSessionId, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
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
      run: (args, _exec, scope) => runtime.reportProgress(args, scope.teamSessionId, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
    },
    {
      name: 'submit_result',
      roles: ROLES.submit_result,
      description: 'Submit a candidate for the current execution. Member self-reports always await review; checksPassed is a claim and requires evidence.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['taskId', 'executionId', 'summary'],
        properties: {
          taskId: { type: 'string', description: 'Task id.' },
          executionId: { type: 'string', description: 'Current execution id from get_task.' },
          summary: { type: 'string', description: 'What was delivered, in one or two sentences.' },
          artifactRefs: { type: 'array', description: 'Paths or ids of produced artifacts.', items: { type: 'string' } },
          checksPassed: { type: 'boolean', description: 'Whether the acceptance checks actually passed.' },
          blockReason: { type: 'string', description: 'Why the task is blocked when checks failed.' },
        },
      },
      run: (args, _exec, scope) => runtime.submitResult(args, scope.teamSessionId, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
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
          evidenceRefs: { type: 'array', description: 'Artifact ids or paths.', items: { type: 'string' } },
        },
      },
      run: (args, _exec, scope) => runtime.submitReview(args, scope.teamSessionId, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
    },
    {
      name: 'publish_view_object',
      roles: ROLES.publish_view_object,
      description: [
        'Publish or update a structured artifact. Simple tasks may publish only a checklist or none; complex tasks may freely publish multiple objects of any compatible type+renderer.',
        'Keep the same stable id across turns and maintain incrementally via patch_view_object with expectedVersion.',
        'Types & examples:',
        '- table (html): metrics/comparisons, e.g. {columns:["Item","Status"],rows:[["API","OK"]]}',
        '- checklist (html): acceptance/verification steps, e.g. {items:[{id:"c1",label:"Unit tests",checked:true,taskId:"task-1"}]}',
        '- mindmap (markmap): plans/hierarchies/troubleshooting trees, e.g. {root:{id:"r",label:"Plan",children:[{id:"a",label:"Step 1"}]}}',
        '- diagram (svg): flows/dependencies/timelines (layout: dag|timeline|radial|swimlane), e.g. {layout:"dag",nodes:[{id:"n1",label:"Build",taskId:"task-1"}],edges:[{from:"n1",to:"n2",label:"next"}]}',
        '- board (excalidraw): architecture sketches / whiteboards, e.g. {diagram:{nodes:[...],edges:[...]}} or {excalidrawScene:{elements:[...]}}',
        '- html (sandbox-iframe): custom rich cards, e.g. {html:"<div>...</div>",css:"..."}',
        'Use semanticKind: blueprint (schematic), snapshot (historical capture, optional snapshotAt), or live_execution (diagram/mindmap/board nodes carrying taskId/executionId automatically reflect live Runtime state).',
      ].join(' '),
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'title', 'data'],
        properties: {
          id: { type: 'string', description: 'Stable scoped object id, e.g. plan, acceptance, arch, call-chain-1.' },
          type: { type: 'string', description: 'table | checklist | mindmap | diagram | board | html' },
          renderer: { type: 'string', description: 'Optional compatible renderer: html | markmap | svg | excalidraw | sandbox-iframe' },
          semanticKind: { type: 'string', description: 'Optional chart semantics: blueprint | snapshot | live_execution' },
          snapshotAt: { type: 'string', description: 'Optional ISO timestamp when semanticKind is snapshot.' },
          title: { type: 'string', description: 'Human-readable title.' },
          size: { type: 'string', description: 'Optional card size hint: s | m | l' },
          caption: { type: 'string', description: 'Optional one-line caption shown below title.' },
          layoutHints: { type: 'object', description: 'Optional layout hints such as { direction: "LR" | "TB", criticalPath: [] }.' },
          data: { type: 'object', description: 'Structured payload matching the chosen type.' },
          taskId: { type: 'string', description: 'Optional linked task id.' },
          executionId: { type: 'string', description: 'Optional linked execution id.' },
          expectedVersion: { type: 'number', description: 'CAS version (0 or omitted when creating; exact current version when replacing).' },
          mutationId: { type: 'string', description: 'Optional idempotency key.' },
          editableBy: { type: 'array', description: 'Optional member ids or roles permitted to patch this object.', items: { type: 'string' } },
        },
      },
      run: (args, _exec, scope) => runtime.publishViewObject(scope.teamSessionId, args, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
    },
    {
      name: 'patch_view_object',
      roles: ROLES.patch_view_object,
      description: 'Partially update an existing structured view object using its stable id and expectedVersion CAS (upsert_rows/delete_rows, upsert_items/delete_items, upsert_node/delete_node, upsert_elements/delete_elements). Prefer patching over creating duplicate ids.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'expectedVersion', 'op'],
        properties: {
          id: { type: 'string' },
          expectedVersion: { type: 'number' },
          op: { type: 'string' },
          mutationId: { type: 'string' },
          title: { type: 'string' },
          rows: { type: 'array' },
          keys: { type: 'array', items: { type: 'string' } },
          items: { type: 'array' },
          ids: { type: 'array', items: { type: 'string' } },
          parentId: { type: 'string' },
          node: { type: 'object' },
          nodeId: { type: 'string' },
          nodes: { type: 'array' },
          edges: { type: 'array' },
          nodeIds: { type: 'array', items: { type: 'string' } },
          edgeKeys: { type: 'array', items: { type: 'string' } },
          taskId: { type: 'string' },
          executionId: { type: 'string' },
        },
      },
      run: (args, _exec, scope) => runtime.patchViewObject(scope.teamSessionId, args, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
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
      description: 'Read one structured view object on demand, optionally at a pinned version, table/checklist/diagram range, or mindmap subtree.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: { type: 'string' },
          version: { type: 'number' },
          offset: { type: 'number' },
          limit: { type: 'number' },
          subtreeNodeId: { type: 'string' },
          maxDepth: { type: 'number' },
        },
      },
      isConcurrencySafe: () => true,
      run: (args, _exec, scope) => runtime.readViewObject(scope.teamSessionId, args),
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
      run: (args, _exec, scope) => runtime.updateTeamView(scope.teamSessionId, args, { kind: 'member', id: scope.memberId, role: scope.roleKind }),
    },
  ]
}

export const WORKER_TOOL_SCHEMAS = Object.freeze(
  buildToolDefinitions(null)
    .filter((def) => def.roles.includes('worker'))
    .map((def) => ({
      type: 'function',
      name: def.name,
      description: def.description,
      inputSchema: def.parameters,
    })),
)

export async function executeMemberToolCall(runtime, scope, toolName, rawArgs = {}) {
  const def = buildToolDefinitions(runtime).find((d) => d.name === toolName)
  if (!def) return { ok: false, code: 'unknown_tool', detail: String(toolName) }
  if (!scope || !def.roles.includes(scope.roleKind)) return { ok: false, code: 'unauthorized' }
  const args = rawArgs && typeof rawArgs === 'object' ? { ...rawArgs } : {}
  if (scope.taskId && ['get_task', 'report_progress', 'submit_result', 'publish_view_object', 'patch_view_object'].includes(toolName)) {
    if (args.taskId !== undefined && args.taskId !== scope.taskId) return { ok: false, code: 'unauthorized', detail: 'taskId out of execution scope' }
    args.taskId ??= scope.taskId
  }
  if (scope.executionId && ['report_progress', 'submit_result', 'publish_view_object', 'patch_view_object'].includes(toolName)) {
    if (args.executionId !== undefined && args.executionId !== scope.executionId) return { ok: false, code: 'unauthorized', detail: 'executionId out of execution scope' }
    args.executionId ??= scope.executionId
  }
  if (args.taskId) {
    const access = runtime.authorizeTask(scope.teamSessionId, args, scope, def.name)
    if (!access.ok) return access
  }
  return await def.run(args, null, scope)
}

export function registerConcertoTools(ctx, runtime, { scopeOf, dispatchTask, inspectTeamCapabilities } = {}) {
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

  const definitions = buildToolDefinitions(runtime, { dispatchTask, inspectTeamCapabilities })

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
        if (!scope || !def.roles.includes(scope.roleKind)) return { ok: false, code: 'unauthorized' }
        if (args.taskId) {
          const access = runtime.authorizeTask(scope.teamSessionId, args, scope, def.name)
          if (!access.ok) return access
        }
        const result = await def.run(args, exec, scope)
        // 宿主诊断记录；客户端从 toolview 的持久化 result block 渲染。
        runtime.recordStructured(scope.teamSessionId, exec && exec.callId, { tool: def.name, payload: result })
        return result
      },
    }
    try {
      const dispose = ctx.tools.register(definition, {
        when: (activation) => {
          const scope = scopeFor(activation)
          return Boolean(scope) && def.roles.includes(scope.roleKind)
        },
      })
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      ctx.logger?.warn?.(`dsh-concerto: could not register ${def.name}: ${error && error.message ? error.message : error}`)
    }
  }
  return disposers
}
