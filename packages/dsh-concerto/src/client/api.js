import React from 'react'
import {
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  HOST_FALLBACK_CSS_VARS,
  parseCssColor,
  relativeLuminance,
  resolveReadableSurfaceAndInk,
} from '../../lib/domain/theme_contrast.mjs'

export { HOST_FALLBACK_CSS_VARS }

export const h = React.createElement
export const NS = 'concerto'
export const API = '/concerto'

export const TEAM_TOOLS = [
  'get_team_status',
  'submit_decision',
  'dispatch_task',
  'dispatch_review',
  'list_skills',
  'read_skill',
  'publish_project_skill',
  'manage_member_duties',
  'read_project_skill',
  'get_task',
  'report_progress',
  'submit_result',
  'submit_review',
  'publish_view_object',
  'patch_view_object',
  'list_view_objects',
  'read_view_object',
  'update_team_view',
]

export function formatCapabilitySummary(cap) {
  if (!cap) return { badge: '未核验', tone: 'neutral', summary: '尚未收集能力清单', tools: [] }
  if (cap.coordinatorOnly || cap.profile === 'none') {
    return { badge: '仅协调', tone: 'neutral', summary: '协调角色（无工作区文件/Shell 工具）', tools: [] }
  }
  switch (cap.verificationStatus) {
    case 'preset_unreloaded':
      return { badge: '未重载', tone: 'warn', summary: cap.detail || '预设未注册到宿主，请先重载团队', tools: [] }
    case 'preset_stale':
      return { badge: '需重载', tone: 'warn', summary: cap.detail || '预设工具插件过期，请重新生成并重载', tools: [] }
    case 'preset_broken':
      return { badge: '预设异常', tone: 'danger', summary: cap.detail || '预设加载异常', tools: [] }
    case 'connector_missing':
      return { badge: '连接器缺失', tone: 'danger', summary: cap.detail || '外部连接器未注册', tools: [] }
    case 'connector_registered':
      return { badge: `外部 · ${cap.connector || 'connector'}`, tone: 'ok', summary: '由外部连接器按沙盒与审批策略执行', tools: [] }
    default: {
      const tools = Array.isArray(cap.actualTools) && cap.actualTools.length > 0 ? cap.actualTools : (cap.expectedTools || [])
      if (cap.profile === 'readonly') {
        return {
          badge: cap.liveVerified ? '只读 · 已实证' : '只读文件',
          tone: 'ok',
          summary: '支持读取与代码搜索（禁写入与命令）',
          tools,
        }
      }
      return {
        badge: cap.liveVerified ? '编码+Shell · 已实证' : '编码+Shell',
        tone: 'ok',
        summary: '支持工作区读写、代码搜索与 Shell 命令执行',
        tools,
      }
    }
  }
}

export function toTeamId(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const STATUS_LABEL = {
  pending: '待派发',
  running: '执行中',
  review: '待验收',
  completed: '已验收',
  done: '已验收',
  blocked: '阻塞',
  failed: '失败',
  cancelled: '已取消',
  waiting_input: '等待回答',
  waiting_approval: '等待审批',
  cancelling: '取消中',
  unknown: '状态未知',
  finished: '本轮已结束',
  stopped: '已停止',
  idle: '空闲',
  attention: '等你处理',
  decided: '决定已保存',
  delivered: '已送达',
  delivery_failed: '送达失败',
  expired: '已失效',
  协调: '指挥中',
}

export const EVENT_LABEL = {
  'session.bound': '会话已关联',
  'decision.applied': '计划已更新',
  'execution.dispatched': '任务已派发',
  'execution.started': '开始执行',
  'execution.phase': '执行阶段',
  'execution.completed': '执行完成',
  'execution.failed': '执行失败',
  'execution.unknown': '执行未知',
  'output.message': '成员输出',
  'command.completed': '命令执行',
  'file.changed': '文件变更',
  'task.progress': '进度汇报',
  'approval.requested': '请求审批',
  'approval.decided': '审批已决定',
  'approval.delivered': '审批已送达',
  'approval.delivery_failed': '审批送达失败',
  'question.requested': '向你提问',
  'question.decided': '已提交回答',
  'question.delivered': '回答已送达',
  'question.delivery_failed': '回答送达失败',
  'result.submitted': '提交结果',
  'review.submitted': '验收结论',
  'review.feedback_created': '添加审查意见',
  'review.feedback_reply': '补交修订证据',
  'review.feedback_close': '关闭审查意见',
  'review.feedback_reopen': '重新打开审查意见',
  'execution.settled': '执行结束',
  'task.blocked': '任务阻塞',
  'task.cancelled': '任务取消',
  'task.unblocked': '任务解除阻塞',
  'worktree.prepared': '已创建隔离 Worktree',
  'worktree.dirty_detected': '检测到未提交工作区变更',
  'worktree.fallback_shared': '回退共享目录执行',
  'view.object.published': '发布对象',
  'view.object.patched': '更新对象',
  'checklist.edited': '用户编辑验收清单',
  'shared_artifact.edited': '用户编辑共编成果',
  'team.view.updated': '更新指挥台',
  'project.skill.published': '发布项目方法',
  'skill.loaded': '加载方法',
  'skill.delivered': '派发冻结方法',
  'user.suggestion': '用户中途建议',
  'task.auto_cascaded': '⚡ 自动瀑布接力',
  'race.started': '🏁 启动双解赛马',
  'race.winner_selected': '🏆 采纳赛马胜者',
}

export const STATE_META = {
  running: { cls: 'concerto-state-running', icon: '⟳', label: '执行中' },
  in_progress: { cls: 'concerto-state-running', icon: '⟳', label: '进行中' },
  waiting_input: { cls: 'concerto-state-attention', icon: '●', label: '等待回答' },
  waiting_approval: { cls: 'concerto-state-attention', icon: '●', label: '等待审批' },
  attention: { cls: 'concerto-state-attention', icon: '●', label: '等你处理' },
  review: { cls: 'concerto-state-review', icon: '◐', label: '待验收' },
  completed: { cls: 'concerto-state-done', icon: '✓', label: '已验收' },
  done: { cls: 'concerto-state-done', icon: '✓', label: '已验收' },
  blocked: { cls: 'concerto-state-blocked', icon: '!', label: '阻塞' },
  failed: { cls: 'concerto-state-blocked', icon: '!', label: '失败' },
  unknown: { cls: 'concerto-state-unknown', icon: '?', label: '未知' },
  idle: { cls: 'concerto-state-idle', icon: '○', label: '空闲' },
  pending: { cls: 'concerto-state-idle', icon: '○', label: '待派发' },
  协调: { cls: 'concerto-state-running', icon: '♪', label: '指挥中' },
}

export const label = (state) => STATUS_LABEL[state] || state

export const styles = {
  wrap: {
    padding: 12,
    border: '1px solid var(--cc-border)',
    borderRadius: 'var(--cc-radius-card)',
    background: 'var(--cc-card-bg)',
    backdropFilter: 'var(--cc-backdrop-blur, none)',
    WebkitBackdropFilter: 'var(--cc-backdrop-blur, none)',
    boxShadow: 'var(--cc-shadow-soft)',
    color: 'var(--cc-text-primary)',
    fontFamily: 'var(--cc-font-sans)',
    fontSize: 'var(--cc-font-size)',
    lineHeight: 1.6,
  },
  title: { fontWeight: 'var(--cc-fw-heading, 600)', marginBottom: 8 },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  input: {
    padding: '6px 10px',
    borderRadius: 'var(--cc-radius-ctrl)',
    border: '1px solid var(--cc-border)',
    background: 'var(--cc-input-bg, var(--cc-card-nested-bg))',
    color: 'var(--cc-text-primary)',
    minWidth: 160,
  },
  button: {
    padding: '5px 12px',
    borderRadius: 'var(--cc-radius-ctrl)',
    border: '1px solid var(--cc-border)',
    background: 'var(--dsw-alias-button-elevated-fill, var(--cc-card-nested-bg))',
    color: 'var(--cc-text-primary)',
    fontWeight: 'var(--cc-fw-strong, 500)',
    cursor: 'pointer',
  },
  primary: {
    padding: '5px 12px',
    borderRadius: 'var(--cc-radius-ctrl)',
    border: '1px solid transparent',
    background: 'var(--cc-primary-fill, var(--cc-accent-fill))',
    color: 'var(--cc-on-primary, var(--cc-on-accent))',
    fontWeight: 'var(--cc-fw-strong, 500)',
    cursor: 'pointer',
  },
  item: { padding: '6px 8px', borderTop: '1px solid var(--cc-border-subtle)' },
  muted: { color: 'var(--cc-text-muted)' },
  error: { color: 'var(--cc-state-blocked)' },
  dock: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '4px 10px',
    fontSize: 'var(--cc-font-size-secondary)',
    color: 'var(--cc-text-muted)',
    flexWrap: 'wrap',
  },
  inline: {
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: 'var(--cc-fs-caption)',
    color: 'var(--cc-text-muted)',
    cursor: 'pointer',
  },
  inlineDot: { width: 6, height: 6, borderRadius: 'var(--cc-radius-pill)', background: 'var(--cc-state-done)', display: 'inline-block' },
  inlineChip: { padding: '0 6px', borderRadius: 'var(--cc-radius-pill)', border: '1px solid transparent', background: 'var(--cc-accent-soft)', color: 'var(--cc-accent-text)' },
  inlineCard: {
    marginTop: 4,
    padding: '6px 10px',
    borderRadius: 'var(--cc-radius-ctrl)',
    border: '1px solid var(--cc-border-subtle)',
    background: 'var(--cc-card-bg)',
    backdropFilter: 'var(--cc-backdrop-blur, none)',
    WebkitBackdropFilter: 'var(--cc-backdrop-blur, none)',
    boxShadow: 'var(--cc-shadow-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 'var(--cc-font-size-secondary)',
    color: 'var(--cc-text-secondary)',
  },
  inlineRow: { display: 'flex', gap: 6, alignItems: 'center' },
  dockTeam: { color: 'var(--cc-text-secondary)' },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 6px',
    borderRadius: 'var(--cc-radius-pill)',
    border: '1px solid var(--cc-border)',
    background: 'var(--cc-card-bg)',
    color: 'var(--cc-text-secondary)',
  },
  chipCurrent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 6px',
    borderRadius: 'var(--cc-radius-pill)',
    border: '1px solid var(--cc-accent)',
    background: 'var(--cc-accent-soft)',
    color: 'var(--cc-accent-text)',
  },
  avatar: {
    width: '1.2em',
    height: '1.2em',
    borderRadius: 'var(--cc-radius-pill)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--cc-fs-micro)',
    fontWeight: 600,
    color: 'var(--cc-on-accent)',
    background: 'var(--cc-accent-fill, var(--cc-accent))',
  },
  avatarMember: {
    width: '1.2em',
    height: '1.2em',
    borderRadius: 'var(--cc-radius-pill)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--cc-fs-micro)',
    fontWeight: 600,
    color: 'var(--cc-text-primary)',
    background: 'var(--cc-card-nested-bg)',
  },
}

export const cardStyle = {
  border: '1px solid var(--cc-border-subtle)',
  borderRadius: 'var(--cc-radius-card)',
  padding: 12,
  marginTop: 8,
  background: 'var(--cc-card-bg)',
  backdropFilter: 'var(--cc-backdrop-blur, none)',
  WebkitBackdropFilter: 'var(--cc-backdrop-blur, none)',
  boxShadow: 'var(--cc-shadow-soft)',
}
export const actionStyle = { ...styles.button, minHeight: 32, padding: '4px 10px' }

export function resolveCssValue(property, expr, fallback = '', hostElement = null) {
  if (!expr) return fallback
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return fallback || expr
  try {
    const parent = (hostElement && hostElement.isConnected ? hostElement : null) || document.body || document.documentElement
    if (!parent) return fallback || expr
    const probe = document.createElement('span')
    probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;'
    const prop = property || 'color'
    probe.style.setProperty(prop, expr)
    parent.appendChild(probe)
    const computed = getComputedStyle(probe).getPropertyValue(prop).trim()
    probe.remove()
    return computed || fallback || expr
  } catch {
    return fallback || expr
  }
}

export function resolveCssExpression(expr, fallback = '', hostElement = null) {
  return resolveCssValue('color', expr, fallback, hostElement)
}

function buildStaticDefaultHostTheme() {
  const solved = resolveReadableSurfaceAndInk({ isLight: true, isGlass: false })
  return Object.freeze({
    colorScheme: 'light',
    isLight: true,
    isGlass: false,
    hasWallpaper: false,
    backdropBlur: 'none',
    fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
    codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
    terminalFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
    fontSize: DEFAULT_LIGHT_THEME.fontSize,
    secondaryFontSize: DEFAULT_LIGHT_THEME.secondaryFontSize,
    codeFontSize: DEFAULT_LIGHT_THEME.codeFontSize,
    terminalFontSize: DEFAULT_LIGHT_THEME.terminalFontSize,
    bgBase: solved.bgBase,
    bgLayer1: solved.bgLayer1,
    bgLayer2: solved.bgLayer2,
    bgLayer3: solved.bgLayer3,
    bgOverlay: solved.bgOverlay,
    textPrimary: solved.textPrimary,
    textSecondary: solved.textSecondary,
    textTertiary: solved.textTertiary,
    borderColor: DEFAULT_LIGHT_THEME.borderColor,
    borderStrong: DEFAULT_LIGHT_THEME.borderStrong,
    accent: solved.accent,
    accentText: solved.accentText,
    accentBorder: solved.accentBorder,
    accentBg: DEFAULT_LIGHT_THEME.accentBg,
    onAccent: solved.onAccent,
    done: solved.done,
    warn: solved.warn,
    error: solved.error,
    review: solved.review,
    cssVars: solved.cssVars,
    contrastMetrics: solved.contrastMetrics,
    exportTheme: {
      ...solved.exportTheme,
      fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
      codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
      fontSize: DEFAULT_LIGHT_THEME.fontSize,
      secondaryFontSize: DEFAULT_LIGHT_THEME.secondaryFontSize,
      codeFontSize: DEFAULT_LIGHT_THEME.codeFontSize,
    },
  })
}

export function readResolvedHostTheme() {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
    return buildStaticDefaultHostTheme()
  }
  const hostEl = document.body || document.documentElement
  const rootEl = document.documentElement
  let serviceScheme = ''
  try {
    const svc = hostContext?.theme || (typeof hostContext?.get === 'function' ? hostContext.get('theme') : null)
    const snap = typeof svc?.getTheme === 'function' ? svc.getTheme() : null
    if (snap?.active?.colorScheme === 'dark' || snap?.active?.colorScheme === 'light') {
      serviceScheme = snap.active.colorScheme
    }
  } catch { serviceScheme = '' }

  const hasDarkBody = Boolean(document.body?.hasAttribute('data-ds-dark-theme'))
  const hasHostLight = Boolean(document.body?.hasAttribute('data-host-light'))
  const attrTheme = document.body?.getAttribute('data-theme') || rootEl?.getAttribute('data-theme') || ''
  const attrThemeSource = rootEl?.getAttribute('data-ds-theme-source') || ''

  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;'
  ;(hostEl || rootEl).appendChild(probe)

  const readColor = (expr, fb) => {
    probe.style.color = ''
    probe.style.color = expr
    return getComputedStyle(probe).color || fb
  }
  const readSize = (expr, fb) => {
    probe.style.fontSize = ''
    probe.style.fontSize = expr
    const px = Number.parseFloat(getComputedStyle(probe).fontSize)
    return Number.isFinite(px) && px > 0 ? px : fb
  }

  let resolvedBgBase = ''
  let colorScheme = serviceScheme
  try {
    const bodyCS = getComputedStyle(hostEl)
    const rootCS = rootEl ? getComputedStyle(rootEl) : bodyCS
    resolvedBgBase = readColor('var(--dsw-alias-bg-base)', '')
    if (!colorScheme) {
      if (hasDarkBody) colorScheme = 'dark'
      else if (hasHostLight || attrTheme === 'light') colorScheme = 'light'
      else if (attrTheme === 'dark') colorScheme = 'dark'
      else if (attrThemeSource === 'dark') colorScheme = 'dark'
      else if (attrThemeSource === 'light') colorScheme = 'light'
      else if (attrThemeSource === 'system') {
        const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)')?.matches
        colorScheme = prefersDark ? 'dark' : 'light'
      } else {
        const parsedBase = parseCssColor(resolvedBgBase)
        if (parsedBase && parsedBase.a > 0) {
          const lum = relativeLuminance(parsedBase)
          colorScheme = lum !== null && lum < 0.45 ? 'dark' : 'light'
        } else {
          colorScheme = 'light'
        }
      }
    }

    const isLight = colorScheme !== 'dark'
    const fb = isLight ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME
    const fontSize = readSize('var(--dsh-content-font-size, 14px)', 14)
    const secondaryFontSize = readSize(
      'var(--dsh-content-font-size-secondary, 13px)',
      fontSize <= 14 ? Math.max(10, fontSize - 1) : Math.max(13, fontSize - 2),
    )
    const codeFontSize = readSize('var(--dsh-code-font-size, 11px)', 11)
    const terminalFontSize = readSize('var(--dsh-terminal-font-size, 13px)', 13)

    const textFamilyOverride = bodyCS.getPropertyValue('--dsh-font-family-text')?.trim()
    const codeFamilyOverride = bodyCS.getPropertyValue('--dsh-font-family-code')?.trim()
    const termFamilyOverride = bodyCS.getPropertyValue('--dsh-font-family-terminal')?.trim()
    probe.style.fontFamily = textFamilyOverride
      ? `var(--dsh-font-family-text), var(--dsh-font-family-text-default, ${fb.fontFamily})`
      : `var(--dsw-font-family, var(--dsh-font-family-text-default, ${fb.fontFamily}))`
    const fontFamily = getComputedStyle(probe).fontFamily || fb.fontFamily
    probe.style.fontFamily = codeFamilyOverride
      ? `var(--dsh-font-family-code), var(--dsh-font-family-code-default, ${fb.codeFontFamily})`
      : `var(--ds-font-family-code, var(--dsh-font-family-code-default, ${fb.codeFontFamily}))`
    const codeFontFamily = getComputedStyle(probe).fontFamily || fb.codeFontFamily
    probe.style.fontFamily = termFamilyOverride
      ? `var(--dsh-font-family-terminal), var(--ds-font-family-code, ${codeFontFamily})`
      : codeFontFamily
    const terminalFontFamily = getComputedStyle(probe).fontFamily || codeFontFamily

    const backdropBlur = bodyCS.getPropertyValue('--dsw-mask-blur')?.trim() || 'none'
    const rawBgLayer1 = readColor(`var(--dsw-alias-bg-layer-1, ${fb.bgLayer1})`, fb.bgLayer1)
    const rawBgLayer2 = readColor(`var(--dsw-alias-bg-layer-2, ${fb.bgLayer2})`, fb.bgLayer2)
    const rawBgLayer3 = readColor(`var(--dsw-alias-bg-layer-3, ${fb.bgLayer3})`, fb.bgLayer3)
    // Floating surfaces follow DSH popovers (layer-2); --dsw-alias-bg-overlay is a mid-grey press fill in DSH.
    const rawBgOverlay = rawBgLayer2

    const glassAttr = document.body?.getAttribute('data-we-glass-page') === 'on'
    const isGlass = glassAttr || (backdropBlur !== 'none' && backdropBlur !== '')
    const wallpaperUnderlay = rootCS.getPropertyValue('--we-wallpaper-underlay')?.trim()
      || bodyCS.getPropertyValue('--we-wallpaper-underlay')?.trim()
      || ''
    const hasWallpaper = Boolean(document.body?.getAttribute('data-we-wallpaper') === 'on' || wallpaperUnderlay)
    const readabilityBase = bodyCS.getPropertyValue('--we-readability-base')?.trim() || ''

    const solved = resolveReadableSurfaceAndInk({
      isLight,
      isGlass,
      bgBase: resolvedBgBase,
      bgLayer1: rawBgLayer1,
      bgLayer2: rawBgLayer2,
      bgLayer3: rawBgLayer3,
      bgOverlay: rawBgOverlay,
      wallpaperUnderlay: wallpaperUnderlay ? readColor('var(--we-wallpaper-underlay)', wallpaperUnderlay) : '',
      readabilityBase: readabilityBase ? readColor('var(--we-readability-base)', readabilityBase) : '',
      textPrimary: readColor(`var(--dsw-alias-label-primary, ${fb.textPrimary})`, fb.textPrimary),
      textSecondary: readColor(`var(--dsw-alias-label-secondary, ${fb.textSecondary})`, fb.textSecondary),
      textTertiary: readColor(`var(--dsw-alias-label-tertiary, ${fb.textTertiary})`, fb.textTertiary),
      hostTextPrimary: rootCS.getPropertyValue('--we-host-dsw-alias-label-primary')?.trim() || '',
      hostTextSecondary: rootCS.getPropertyValue('--we-host-dsw-alias-label-secondary')?.trim() || '',
      hostTextTertiary: rootCS.getPropertyValue('--we-host-dsw-alias-label-tertiary')?.trim() || '',
      accent: readColor(`var(--dsw-alias-state-business-primary, var(--we-accent, var(--dsw-alias-link, ${fb.accent})))`, fb.accent),
      accentInk: readColor(`var(--we-accent-ink, var(--dsw-alias-label-primary-foreground, ${fb.textPrimary}))`, ''),
      done: readColor(`var(--dsw-alias-state-success-primary, ${fb.done})`, fb.done),
      warn: readColor(`var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, ${fb.warn}))`, fb.warn),
      error: readColor(`var(--dsw-alias-state-error-primary, ${fb.error})`, fb.error),
      review: readColor(`var(--dsw-alias-state-done-primary, ${fb.review})`, fb.review),
    })

    return Object.freeze({
      colorScheme: isLight ? 'light' : 'dark',
      isLight,
      isGlass,
      hasWallpaper,
      backdropBlur,
      fontFamily,
      codeFontFamily,
      terminalFontFamily,
      fontSize,
      secondaryFontSize,
      codeFontSize,
      terminalFontSize,
      bgBase: solved.bgBase,
      bgLayer1: solved.bgLayer1,
      bgLayer2: solved.bgLayer2,
      bgLayer3: solved.bgLayer3,
      bgOverlay: solved.bgOverlay,
      textPrimary: solved.textPrimary,
      textSecondary: solved.textSecondary,
      textTertiary: solved.textTertiary,
      borderColor: readColor(`var(--dsw-alias-border-l2, ${fb.borderColor})`, fb.borderColor),
      borderStrong: readColor(`var(--dsw-alias-border-l3, ${fb.borderStrong})`, fb.borderStrong),
      accent: solved.accent,
      accentText: solved.accentText,
      accentBorder: solved.accentBorder,
      accentBg: readColor(`var(--dsw-alias-state-business-tertiary, ${fb.accentBg})`, fb.accentBg),
      onAccent: solved.onAccent,
      done: solved.done,
      warn: solved.warn,
      error: solved.error,
      review: solved.review,
      cssVars: solved.cssVars,
      contrastMetrics: solved.contrastMetrics,
      exportTheme: {
        ...solved.exportTheme,
        fontFamily,
        codeFontFamily,
        fontSize,
        secondaryFontSize,
        codeFontSize,
      },
    })
  } finally {
    probe.remove()
  }
}

export function useHostTheme() {
  if (typeof React.useState !== 'function' || typeof React.useEffect !== 'function') {
    return readResolvedHostTheme()
  }
  const [theme, setTheme] = React.useState(() => readResolvedHostTheme())
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    let raf = 0
    const apply = () => {
      const next = readResolvedHostTheme()
      setTheme((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    const refresh = () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
      if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(apply)
      else apply()
    }
    refresh()
    const observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(refresh) : null
    if (observer && document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-ds-theme-source', 'data-theme', 'data-input-modality', 'style', 'class'],
      })
    }
    if (observer && document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: [
          'data-ds-dark-theme',
          'data-theme',
          'data-host-light',
          'data-we-glass-page',
          'data-we-glass-chat',
          'data-we-glass-window',
          'data-we-wallpaper',
          'style',
          'class',
        ],
      })
    }
    let unsubTheme = null
    if (typeof hostContext?.on === 'function') {
      try {
        unsubTheme = hostContext.on('theme/change', refresh)
      } catch { /* ignore */ }
    }
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
    media?.addEventListener?.('change', refresh)
    if (typeof window !== 'undefined') window?.addEventListener?.('storage', refresh)
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
      observer?.disconnect()
      if (typeof unsubTheme === 'function') unsubTheme()
      media?.removeEventListener?.('change', refresh)
      if (typeof window !== 'undefined') window?.removeEventListener?.('storage', refresh)
    }
  }, [])
  return theme
}

let hostContext = null
export function setHostContext(ctx) {
  hostContext = ctx || null
}
export function getHostContext() {
  return hostContext
}

// Pending drawer deep-link across tabs (set when user clicks message avatar in chat)
const pendingDrawerOpen = new Map()
const drawerListeners = new Set()
export function requestMemberDrawerOpen(sessionId, memberId, extra = {}) {
  pendingDrawerOpen.set(sessionId, { memberId, ...extra, at: Date.now() })
  drawerListeners.forEach((fn) => fn(sessionId))
}
export function consumeMemberDrawerOpen(sessionId) {
  const val = pendingDrawerOpen.get(sessionId) || null
  if (val) pendingDrawerOpen.delete(sessionId)
  return val
}
export function onMemberDrawerRequest(listener) {
  drawerListeners.add(listener)
  return () => drawerListeners.delete(listener)
}

export async function request(path, init) {
  const res = await fetch(API + path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...init,
  })
  const text = await res.text()
  const body = text === '' ? null : JSON.parse(text)
  if (!res.ok) {
    const detail = body && body.detail ? body.detail : res.status
    throw Object.assign(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)), { status: res.status })
  }
  return body
}

export async function fetchMemberActivity(sessionId, memberId, { before = null, limit = 30 } = {}) {
  const params = new URLSearchParams({ sessionId, limit: String(limit) })
  if (memberId) params.set('memberId', memberId)
  if (before !== null && before !== undefined && String(before) !== '') params.set('before', String(before))
  return await request('/members/activity?' + params.toString())
}

export function fetchMemberDuties(sessionId, memberId) {
  return request('/members/duties?' + new URLSearchParams({ sessionId, memberId }))
}

export function updateMemberDuties(sessionId, memberId, change) {
  return request('/members/duties', {
    method: 'POST',
    body: JSON.stringify({ sessionId, memberId, ...change }),
  })
}

export async function saveViewObjectUserLayout(sessionId, payload) {
  return await request('/view-objects/user-layout', {
    method: 'POST',
    body: JSON.stringify({ ...payload, sessionId }),
  })
}

export async function importExcalidrawBoard(sessionId, file) {
  const params = new URLSearchParams({ sessionId, filename: file.name })
  return await request('/view-objects/import-excalidraw?' + params.toString(), {
    method: 'POST',
    body: file,
  })
}

export async function saveUserViewPreferences(sessionId, payload) {
  return await request('/view-preferences', {
    method: 'POST',
    body: JSON.stringify({ ...payload, sessionId }),
  })
}

export async function fetchRuns() {
  return await request('/runs')
}

export async function launchTeamSession(payload) {
  return await request('/teams/launch', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export async function revealSession(payload) {
  return await request('/sessions/reveal', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export async function fetchUnknownExecutions() {
  return await request('/recovery/unknown')
}

export async function reconcileUnknownExecution(payload) {
  return await request('/recovery/reconcile', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export async function adjudicateRecoveryExecution(payload) {
  return await request('/recovery/adjudicate', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export async function openHostSession(sessionId, { teamSessionId = '', openTeamTab = true } = {}) {
  const revealed = await revealSession({ sessionId, teamSessionId })
  const targetSid = revealed?.sessionId || sessionId
  const hostCtx = getHostContext()
  let uiWs = null
  try { uiWs = hostCtx?.get?.('uiWorkspace') ?? null } catch { uiWs = null }
  let navigated = false
  if (uiWs && typeof uiWs.openSession === 'function') {
    await uiWs.openSession(targetSid)
    navigated = true
  }
  if (typeof document !== 'undefined') {
    const settingsCloseBtn = [...document.querySelectorAll('.AnXs9G_overlay button')].find((btn) =>
      /关闭|Close/i.test(`${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''} ${btn.textContent || ''}`))
    if (settingsCloseBtn) settingsCloseBtn.click()
  }
  if (openTeamTab && typeof document !== 'undefined' && targetSid) {
    setTimeout(() => { selectHostTeamTab(targetSid, true) }, 160)
    setTimeout(() => { selectHostTeamTab(targetSid, true) }, 480)
  }
  return { ...revealed, navigated }
}

const sessionViewStates = new Map()
const VIEW_STATE_KEY_PREFIX = 'concerto.viewState.'

function defaultViewState() {
  return {
    activeTab: 'overview',
    selectedTaskId: '',
    artifactFilters: { taskId: 'all', memberId: 'all', type: 'all' },
    scrollTop: 0,
    canvasViewports: {},
  }
}

function selectedTaskFromState(state) {
  if (typeof state?.selectedTaskId === 'string') return state.selectedTaskId
  return Array.isArray(state?.expandedTaskIds) && state.expandedTaskIds.length > 0
    ? String(state.expandedTaskIds.at(-1))
    : ''
}

export function readSessionViewState(sessionId) {
  const key = String(sessionId || '')
  if (!key) return defaultViewState()
  if (sessionViewStates.has(key)) {
    const cached = sessionViewStates.get(key)
    return {
      ...defaultViewState(),
      ...cached,
      selectedTaskId: selectedTaskFromState(cached),
      artifactFilters: { ...defaultViewState().artifactFilters, ...(cached.artifactFilters || {}) },
      canvasViewports: { ...(cached.canvasViewports || {}) },
    }
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(VIEW_STATE_KEY_PREFIX + key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          const merged = {
            ...defaultViewState(),
            ...parsed,
            selectedTaskId: selectedTaskFromState(parsed),
            artifactFilters: { ...defaultViewState().artifactFilters, ...(parsed.artifactFilters || {}) },
            canvasViewports: parsed.canvasViewports && typeof parsed.canvasViewports === 'object' ? parsed.canvasViewports : {},
          }
          sessionViewStates.set(key, merged)
          return merged
        }
      }
    }
  } catch { /* ignore storage errors */ }
  const init = defaultViewState()
  sessionViewStates.set(key, init)
  return init
}

export function writeSessionViewState(sessionId, patch = {}) {
  const key = String(sessionId || '')
  if (!key || !patch || typeof patch !== 'object') return defaultViewState()
  const cur = readSessionViewState(key)
  const next = {
    ...cur,
    ...patch,
    ...(typeof patch.selectedTaskId === 'string' ? { selectedTaskId: patch.selectedTaskId } : {}),
    ...(patch.artifactFilters ? { artifactFilters: { ...cur.artifactFilters, ...patch.artifactFilters } } : {}),
    ...(patch.canvasViewports ? { canvasViewports: { ...cur.canvasViewports, ...patch.canvasViewports } } : {}),
  }
  sessionViewStates.set(key, next)
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(VIEW_STATE_KEY_PREFIX + key, JSON.stringify(next))
    }
  } catch { /* ignore storage errors */ }
  return next
}

export function readCanvasViewport(sessionId, objectId) {
  if (!sessionId || !objectId) return { scale: 1, panX: 0, panY: 0, collapsedIds: [], modalTransform: null }
  const vs = readSessionViewState(sessionId)
  const vp = vs.canvasViewports?.[objectId]
  const mt = vp?.modalTransform
  return {
    scale: typeof vp?.scale === 'number' && Number.isFinite(vp.scale) ? vp.scale : 1,
    panX: typeof vp?.panX === 'number' && Number.isFinite(vp.panX) ? vp.panX : 0,
    panY: typeof vp?.panY === 'number' && Number.isFinite(vp.panY) ? vp.panY : 0,
    collapsedIds: Array.isArray(vp?.collapsedIds) ? [...vp.collapsedIds] : null,
    modalTransform: mt && typeof mt === 'object' && Number.isFinite(mt.k) && mt.k > 0
      ? { k: mt.k, x: Number.isFinite(mt.x) ? mt.x : 0, y: Number.isFinite(mt.y) ? mt.y : 0 }
      : null,
  }
}

export function writeCanvasViewport(sessionId, objectId, patch) {
  if (!sessionId || !objectId) return null
  const prev = readCanvasViewport(sessionId, objectId)
  const next = {
    ...prev,
    ...patch,
    ...(patch.collapsedIds !== undefined ? { collapsedIds: Array.isArray(patch.collapsedIds) ? [...patch.collapsedIds] : null } : {}),
  }
  writeSessionViewState(sessionId, {
    canvasViewports: { [objectId]: next },
  })
  return next
}

// Read Commander visible replies from host uiConversation chat target when available (§6.2).
export function readHostChatMessages(sessionId) {
  try {
    const uiConv = hostContext?.uiConversation
    if (!uiConv || typeof uiConv.binding !== 'function') return { supported: false, messages: [] }
    const binding = uiConv.binding(sessionId)
    const chatTarget = typeof binding?.target === 'function' ? binding.target('chat') : null
    if (!chatTarget) return { supported: false, messages: [] }
    const rawTurns = Array.isArray(chatTarget.turns)
      ? chatTarget.turns
      : (typeof chatTarget.getSnapshot === 'function' ? (chatTarget.getSnapshot()?.turns ?? []) : [])
    if (!Array.isArray(rawTurns)) return { supported: true, messages: [] }
    const messages = []
    for (const turn of rawTurns) {
      if (!turn) continue
      const steps = Array.isArray(turn.steps) ? turn.steps : [turn]
      for (const step of steps) {
        const text = typeof step?.text === 'string'
          ? step.text
          : (Array.isArray(step?.content) ? step.content.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n') : '')
        if (text && text.trim()) {
          messages.push({
            id: step.id || turn.id || `turn-${messages.length}`,
            role: step.role || 'assistant',
            text: text.trim(),
            recordedAt: step.createdAt || turn.createdAt || null,
          })
        }
      }
    }
    return { supported: true, messages }
  } catch {
    return { supported: false, messages: [] }
  }
}

const sessionReaders = new Map()
export function sessionReader(sessionId) {
  if (sessionReaders.has(sessionId)) return sessionReaders.get(sessionId)
  let value = { info: null, error: '', loaded: false }
  const listeners = new Set()
  let stop
  let refresh = () => {}
  const publish = (next) => {
    value = next
    listeners.forEach((notify) => notify())
  }
  function start() {
    let disposed = false
    let timer
    let sseTimer
    let sseConnected = false
    let eventSource = null
    let inFlight = false
    const controller = new AbortController()
    async function load() {
      if (disposed || inFlight) return
      inFlight = true
      try {
        const info = await request('/session?sessionId=' + encodeURIComponent(sessionId), { signal: controller.signal })
        if (!disposed) {
          publish({
            info: value.info && value.info.snapshot?.serverTime > info.snapshot?.serverTime ? value.info : info,
            error: '',
            loaded: true,
          })
        }
      } catch (error) {
        if (!disposed) {
          publish(error.status === 404
            ? { info: null, error: '', loaded: true }
            : { ...value, error: '同步失败：' + error.message, loaded: true })
        }
      } finally {
        inFlight = false
        if (!disposed) {
          const fallbackDelay = typeof document !== 'undefined' && document.hidden ? 15000 : (sseConnected ? 12000 : 2000)
          timer = setTimeout(load, fallbackDelay)
        }
      }
    }
    refresh = () => {
      clearTimeout(timer)
      load()
    }
    if (typeof EventSource === 'function' && sessionId) {
      try {
        eventSource = new EventSource(API + '/events?sessionId=' + encodeURIComponent(sessionId))
        eventSource.addEventListener('ready', () => { sseConnected = true })
        eventSource.addEventListener('update', () => {
          sseConnected = true
          clearTimeout(sseTimer)
          sseTimer = setTimeout(refresh, 40)
        })
        eventSource.onerror = () => { sseConnected = false }
      } catch {
        sseConnected = false
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refresh)
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', refresh)
    }
    load()
    return () => {
      disposed = true
      clearTimeout(timer)
      clearTimeout(sseTimer)
      try { eventSource?.close() } catch { /* ignore */ }
      controller.abort()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refresh)
      }
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('online', refresh)
      }
    }
  }
  const reader = {
    getSnapshot: () => value,
    refresh: () => refresh(),
    subscribe(notify) {
      listeners.add(notify)
      if (listeners.size === 1) stop = start()
      return () => {
        listeners.delete(notify)
        if (listeners.size === 0) stop?.()
      }
    },
  }
  sessionReaders.set(sessionId, reader)
  return reader
}

export function useTeamSession(sessionId) {
  const reader = React.useMemo(() => sessionReader(sessionId), [sessionId])
  return { ...React.useSyncExternalStore(reader.subscribe, reader.getSnapshot), refresh: reader.refresh }
}

export const roster = (snapshot) => {
  if (!snapshot?.metadata) return []
  return [{ ...snapshot.metadata.commander, roleKind: 'commander' }, ...(snapshot.metadata.members || [])]
}

export const pendingRequests = (snapshot) =>
  (snapshot?.requests || []).filter((r) => ['pending', 'decided', 'delivery_failed'].includes(r.status))

export function memberState(snapshot, member) {
  if (!snapshot || !member) return 'idle'
  const execution = (snapshot.executions || []).filter((e) => e.memberId === member.id).at(-1)
  const task = execution && (snapshot.tasks || []).find((t) => t.executionId === execution.executionId)
  if (execution?.state === 'unknown') return 'unknown'
  if (execution?.kind === 'review') {
    if (execution.state === 'running' || execution.state === 'waiting_input' || execution.state === 'waiting_approval') {
      return execution.state
    }
    if (execution.state === 'interrupting') return 'cancelling'
    return 'idle'
  }
  if (task?.viewState) return task.viewState
  return member.roleKind === 'commander' ? '协调' : 'idle'
}

export async function fetchViewObjectVersion(sessionId, id, version) {
  const params = new URLSearchParams({ sessionId: String(sessionId || ''), id: String(id || '') })
  if (Number.isInteger(version)) params.set('version', String(version))
  return request('/view-objects/read?' + params.toString())
}

export async function fetchSkillsInfo(sessionId) {
  const params = new URLSearchParams({ sessionId: String(sessionId || '') })
  return request('/skills?' + params.toString())
}

export function readGlassFloor() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('concerto.glassOpacity') : null
    const val = raw ? Number(raw) : 0.82
    return Number.isFinite(val) ? Math.min(1, Math.max(0.72, val)) : 0.82
  } catch {
    return 0.82
  }
}

export function writeGlassFloor(opacity) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('concerto.glassOpacity', String(opacity))
  } catch { /* ignore */ }
}

// Host tab degraded switcher (DSH conversation module reads localStorage["dsh.conversation." + sessionId] with no selectView API).
const autoOpenedSessions = new Set()
export function findTeamTab() {
  if (typeof document === 'undefined') return null
  const tabs = [...document.querySelectorAll('[data-conversation-tabs] [role="tab"]')]
  return tabs.find((el) => /团队|Team/i.test(el.textContent || '')) || null
}

export function syncHostTeamTabVisibility(visible) {
  if (typeof document === 'undefined') return
  const tab = findTeamTab()
  if (!tab) return
  if (visible) {
    tab.hidden = false
    if (tab.style.display === 'none') tab.style.display = ''
    return
  }
  tab.hidden = true
  tab.style.display = 'none'
  if (tab.getAttribute('aria-selected') === 'true') {
    const tabs = [...document.querySelectorAll('[data-conversation-tabs] [role="tab"]')]
    const chatTab = tabs.find((el) => el !== tab && !el.hidden && el.style.display !== 'none')
    if (chatTab) chatTab.click()
  }
}

export function selectHostTeamTab(sessionId, force = false) {
  if (typeof document === 'undefined' || !sessionId) return false
  if (!force && autoOpenedSessions.has(sessionId)) return false
  let saved = null
  try { saved = localStorage.getItem('dsh.conversation.' + sessionId) } catch { saved = null }
  if (!force && saved && !saved.includes('"chat"')) return false
  const tab = findTeamTab()
  if (!tab) return false
  autoOpenedSessions.add(sessionId)
  if (tab.getAttribute('aria-selected') !== 'true') {
    tab.click()
  }
  return true
}
