/**
 * Concerto 成员插件（Hosted / 描述行共用）。
 *
 * 作用：把成员的人设注入当前会话的系统提示，使 preset 里的成员行不只是占位。
 * 官方 API：`ctx.systemPrompt.section({ name, order, text })`
 *   —— 见已装插件 dsh-builtin-browser/lib/tool-browser/index.js 的实际调用。
 *
 * 设计：§10.2（成员是 preset 里可自由组合的 entry 行）；§17.3（外部成员只能是描述行）。
 */
import z from '@deepseek-ai/schemastery'

export const name = 'concerto-member'

/** 未声明就读会抛 `cannot get property "systemPrompt" without inject` */
export const inject = ['systemPrompt']

export const Config = z.object({
  memberId: z.string().default(''),
  descriptorOnly: z.boolean().default(false),
  roleKind: z.string().default('worker'),
  roleId: z.string().default(''),
  source: z.string().default('hosted'),
  persona: z.string().default(''),
  toolProfile: z.string().default(''),
})

export function apply(ctx, config) {
  const memberId = typeof config?.memberId === 'string' ? config.memberId : ''
  const roleKind = typeof config?.roleKind === 'string' ? config.roleKind : 'worker'
  const roleId = typeof config?.roleId === 'string' ? config.roleId : ''
  const source = typeof config?.source === 'string' ? config.source : 'hosted'
  const persona = typeof config?.persona === 'string' ? config.persona : ''

  // 外部成员只是描述行：不注入任何提示，避免冒充 DSH 托管
  if (source !== 'hosted' || config.descriptorOnly === true) return

  const defaultText = roleKind === 'commander'
    ? `You are team commander ${memberId || '(unnamed)'}. Inspect memberCapabilities and tasks via get_team_status, plan and create tasks via submit_decision (including requiredViews when needed), dispatch pending tasks to qualified workers via dispatch_task (without falling back silently if capabilities mismatch), arrange reviews via submit_review, discover/read structured objects via list_view_objects/read_view_object, publish or patch objects via publish_view_object/patch_view_object using stable IDs, and maintain the public team briefing via update_team_view covering 当前进展, 关键问题, and 下一步 with recommended pinnedRefs. Choose artifact types/renderers freely as the task requires (0 to many), and use semanticKind=live_execution when nodes link taskId/executionId. Delegate execution to workers instead of doing worker tasks yourself.`
    : `You are team member ${memberId || '(unnamed)'}, acting as ${roleKind}${roleId ? ` (${roleId})` : ''}. Use your mounted workspace tools for coding/verification when assigned, maintain any requiredViews for your task, report progress or results with executionId, and freely publish or patch helpful structured artifacts via publish_view_object/patch_view_object keeping stable IDs.`

  const text = persona !== '' ? persona : defaultText

  ctx.effect(() => {
    const dispose = ctx.systemPrompt.section({
      name: `concerto:member:${memberId || 'anonymous'}`,
      order: 160,
      text,
    })
    return typeof dispose === 'function' ? dispose : undefined
  }, `concerto: member ${memberId || 'anonymous'}`)
}
