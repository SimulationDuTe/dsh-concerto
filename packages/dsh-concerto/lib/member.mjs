/**
 * Concerto 成员插件（Hosted / 描述行共用）。
 *
 * 作用：把成员的协作核心、角色职责、按需方法索引与用户人设组合注入当前会话系统提示。
 * 官方 API：`ctx.systemPrompt.section({ name, order, text })`
 *   —— 见已装插件 dsh-builtin-browser/lib/tool-browser/index.js 的实际调用。
 *
 * 设计：§4.4（协作核心常驻 + 角色职责 + 方法索引 + persona 分开组合）；
 *       §10.2（成员是 preset 里可自由组合的 entry 行）；§17.3（外部成员只能是描述行）。
 */
import z from '@deepseek-ai/schemastery'
import { expectedCapabilitiesForMember } from './projection/team_preset.mjs'
import { buildMemberSystemPrompt } from './domain/runtime_skills.mjs'

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

export { buildMemberSystemPrompt }

export function apply(ctx, config) {
  const memberId = typeof config?.memberId === 'string' ? config.memberId : ''
  const roleKind = typeof config?.roleKind === 'string' ? config.roleKind : 'worker'
  const roleId = typeof config?.roleId === 'string' ? config.roleId : ''
  const source = typeof config?.source === 'string' ? config.source : 'hosted'
  const persona = typeof config?.persona === 'string' ? config.persona : ''
  const toolProfile = typeof config?.toolProfile === 'string' ? config.toolProfile : ''

  // 外部成员只是描述行：不注入任何提示，避免冒充 DSH 托管
  if (source !== 'hosted' || config.descriptorOnly === true) return

  const capabilities = expectedCapabilitiesForMember({
    id: memberId,
    roleKind,
    source,
    ...(toolProfile ? { toolProfile } : {}),
  })

  const text = buildMemberSystemPrompt({
    memberId,
    roleKind,
    roleId,
    source,
    toolProfile: capabilities.profile,
    persona,
    capabilities,
  })

  ctx.effect(() => {
    const dispose = ctx.systemPrompt.section({
      name: `concerto:member:${memberId || 'anonymous'}`,
      order: 160,
      text,
    })
    return typeof dispose === 'function' ? dispose : undefined
  }, `concerto: member ${memberId || 'anonymous'}`)
}
