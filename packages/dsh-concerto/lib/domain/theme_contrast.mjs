/**
 * Pure CSS color parsing, WCAG 2.1 contrast calculation, alpha compositing,
 * and host-wallpaper surface/ink/accent reconciliation for Concerto (`0.0.5+`).
 *
 * All default host palette constants live here as structured baseline data so
 * `src/client/**` UI layers contain zero hardcoded color literals and consume
 * host design tokens exclusively.
 */

export const DEFAULT_LIGHT_THEME = Object.freeze({
  colorScheme: 'light',
  isLight: true,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  codeFontFamily: '"SF Mono", "JetBrains Mono", Consolas, monospace',
  fontSize: 14,
  secondaryFontSize: 13,
  codeFontSize: 11,
  terminalFontSize: 13,
  bgBase: '#ffffff',
  bgLayer1: '#f9fafb',
  bgLayer2: '#f5f7fa',
  bgLayer3: '#edf0f4',
  textPrimary: '#0f1115',
  textSecondary: '#61666b',
  textTertiary: '#81858c',
  borderColor: 'rgba(0, 0, 0, 0.10)',
  borderStrong: 'rgba(0, 0, 0, 0.20)',
  accent: '#4176e6',
  accentBg: '#e4edfd',
  done: '#22c55e',
  warn: '#dd8629',
  error: '#ec1313',
  review: '#7c3aed',
})

export const DEFAULT_DARK_THEME = Object.freeze({
  colorScheme: 'dark',
  isLight: false,
  fontFamily: DEFAULT_LIGHT_THEME.fontFamily,
  codeFontFamily: DEFAULT_LIGHT_THEME.codeFontFamily,
  fontSize: 14,
  secondaryFontSize: 13,
  codeFontSize: 11,
  terminalFontSize: 13,
  bgBase: '#151517',
  bgLayer1: '#232324',
  bgLayer2: '#2c2c2e',
  bgLayer3: '#353638',
  textPrimary: '#f9fafb',
  textSecondary: '#cfd3d6',
  textTertiary: '#adb2b8',
  borderColor: 'rgba(255, 255, 255, 0.12)',
  borderStrong: 'rgba(255, 255, 255, 0.20)',
  accent: '#7aaaff',
  accentBg: '#34415b',
  done: '#22c55e',
  warn: '#f59e0b',
  error: '#f25a5a',
  review: '#a78bfa',
})

/**
 * Baseline CSS variable defaults injected ONLY under `:where(:root)` so any
 * host `--dsw-*` / `--dsh-*` / `--we-*` token takes unconditional precedence
 * while minimal browser test harnesses missing optional tokens still render cleanly.
 */
export const HOST_FALLBACK_CSS_VARS = Object.freeze({
  '--cc-fb-bg-base': '#ffffff',
  '--cc-fb-bg-layer-1': '#f9fafb',
  '--cc-fb-bg-layer-2': '#f5f7fa',
  '--cc-fb-bg-layer-3': '#edf0f4',
  '--cc-fb-text-primary': '#0f1115',
  '--cc-fb-text-secondary': '#61666b',
  '--cc-fb-text-tertiary': '#81858c',
  '--cc-fb-text-inverted': '#ffffff',
  '--cc-fb-border-subtle': 'rgba(0, 0, 0, 0.08)',
  '--cc-fb-border': 'rgba(0, 0, 0, 0.12)',
  '--cc-fb-border-strong': 'rgba(0, 0, 0, 0.18)',
  '--cc-fb-mask': 'rgba(0, 0, 0, 0.45)',
  '--cc-fb-accent': '#4176e6',
  '--cc-fb-done': '#22c55e',
  '--cc-fb-warn': '#dd8629',
  '--cc-fb-error': '#ec1313',
  '--cc-fb-review': '#7c3aed',
  '--cc-fb-radius-sm': '8px',
  '--cc-fb-radius-md': '12px',
  '--cc-fb-radius-lg': '16px',
  '--cc-fb-radius-pill': '999px',
  '--cc-fb-shadow-soft': '0 1px 3px rgba(0, 0, 0, 0.06)',
  '--cc-fb-shadow-panel': '0 4px 16px rgba(0, 0, 0, 0.10)',
  '--cc-fb-shadow-prominent': '0 20px 64px rgba(0, 0, 0, 0.24)',
  '--cc-fb-member-1': '#38bdf8',
  '--cc-fb-member-2': '#a78bfa',
  '--cc-fb-member-3': '#34d399',
  '--cc-fb-member-4': '#f472b6',
  '--cc-fb-member-5': '#fbbf24',
  '--cc-fb-member-6': '#60a5fa',
  '--cc-fb-ink-dark': '#0f172a',
  '--cc-fb-ink-light': '#f8fafc',
  '--cc-fb-hat-fill': '#1e293b',
  '--cc-fb-gold-highlight': '#fde68a',
  '--cc-fb-gold-fill': '#b45309',
  '--cc-fb-gold-soft': '#fef3c7',
  '--cc-fb-sky-stroke': '#38bdf8',
  '--cc-fb-sky-soft': '#bae6fd',
  '--cc-fb-slate-stroke': '#e2e8f0',
  '--cc-fb-slate-muted': '#94a3b8',
})

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Parse `#hex`, `rgb(...)`, `rgba(...)`, or CSS Color 4 `color(srgb r g b / a)`
 * into normalized 0..255 sRGB + 0..1 alpha. Returns `null` for `transparent` / unparseable.
 */
export function parseCssColor(input) {
  const raw = String(input || '').trim()
  if (!raw || raw === 'none') return null
  if (raw === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  if (raw.startsWith('#')) {
    const hex = raw.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1
      if ([r, g, b, a].some(Number.isNaN)) return null
      return { r, g, b, a }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      if ([r, g, b, a].some(Number.isNaN)) return null
      return { r, g, b, a }
    }
    return null
  }

  const srgbMatch = /^color\(\s*srgb\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?)(?:\s*\/\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i.exec(raw)
  if (srgbMatch) {
    const parseUnit = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))
    return {
      r: clamp(parseUnit(srgbMatch[1]) * 255, 0, 255),
      g: clamp(parseUnit(srgbMatch[2]) * 255, 0, 255),
      b: clamp(parseUnit(srgbMatch[3]) * 255, 0, 255),
      a: srgbMatch[4] !== undefined ? clamp(parseUnit(srgbMatch[4]), 0, 1) : 1,
    }
  }

  const rgbMatch = /^rgba?\(\s*([+-]?\d+(?:\.\d+)?%?)(?:\s*,\s*|\s+)([+-]?\d+(?:\.\d+)?%?)(?:\s*,\s*|\s+)([+-]?\d+(?:\.\d+)?%?)(?:\s*(?:,|\/)\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i.exec(raw)
  if (rgbMatch) {
    const ch = (s) => clamp(s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s), 0, 255)
    let a = 1
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4])
    }
    return { r: ch(rgbMatch[1]), g: ch(rgbMatch[2]), b: ch(rgbMatch[3]), a: clamp(a, 0, 1) }
  }

  return null
}

export function formatCssColor(c) {
  if (!c) return ''
  const r = clamp(Math.round(c.r), 0, 255)
  const g = clamp(Math.round(c.g), 0, 255)
  const b = clamp(Math.round(c.b), 0, 255)
  const a = c.a === undefined ? 1 : clamp(Number(c.a), 0, 1)
  if (a >= 0.995) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`
}

export function relativeLuminance(color) {
  const c = typeof color === 'string' ? parseCssColor(color) : color
  if (!c) return null
  const lin = (v) => {
    const s = clamp(v / 255, 0, 1)
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

export function compositeOver(fgInput, bgInput) {
  const fg = typeof fgInput === 'string' ? parseCssColor(fgInput) : fgInput
  const bg = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput
  if (!fg && !bg) return null
  if (!fg) return bg ? { ...bg, a: 1 } : null
  if (!bg || fg.a >= 0.995) return { r: fg.r, g: fg.g, b: fg.b, a: 1 }
  const a = clamp(fg.a ?? 1, 0, 1)
  const bgA = clamp(bg.a ?? 1, 0, 1)
  const outA = a + bgA * (1 - a)
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 }
  return {
    r: (fg.r * a + bg.r * bgA * (1 - a)) / outA,
    g: (fg.g * a + bg.g * bgA * (1 - a)) / outA,
    b: (fg.b * a + bg.b * bgA * (1 - a)) / outA,
    a: outA,
  }
}

export function contrastRatio(fgInput, bgInput) {
  const bg = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput
  const fgRaw = typeof fgInput === 'string' ? parseCssColor(fgInput) : fgInput
  if (!fgRaw || !bg) return 1
  const fg = fgRaw.a < 0.995 ? compositeOver(fgRaw, bg) : fgRaw
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  if (l1 === null || l2 === null) return 1
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

export function blendRgb(aInput, bInput, t) {
  const a = typeof aInput === 'string' ? parseCssColor(aInput) : aInput
  const b = typeof bInput === 'string' ? parseCssColor(bInput) : bInput
  if (!a || !b) return a || b
  const k = clamp(t, 0, 1)
  return {
    r: a.r * (1 - k) + b.r * k,
    g: a.g * (1 - k) + b.g * k,
    b: a.b * (1 - k) + b.b * k,
    a: 1,
  }
}

const DARK_INK = Object.freeze({ r: 15, g: 17, b: 21, a: 1 })
const LIGHT_INK = Object.freeze({ r: 255, g: 255, b: 255, a: 1 })
const DARK_PAPER = Object.freeze({ r: 24, g: 26, b: 32, a: 1 })
const LIGHT_PAPER = Object.freeze({ r: 249, g: 250, b: 251, a: 1 })

export function pickHighContrastInk(bgInput, preferredInput = null, minRatio = 4.5) {
  const bg = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput
  if (!bg) return LIGHT_INK
  const pref = typeof preferredInput === 'string' ? parseCssColor(preferredInput) : preferredInput
  if (pref && pref.a >= 0.85 && contrastRatio(pref, bg) >= minRatio) {
    return { ...pref, a: 1 }
  }
  const cDark = contrastRatio(DARK_INK, bg)
  const cLight = contrastRatio(LIGHT_INK, bg)
  return cDark >= cLight ? { ...DARK_INK } : { ...LIGHT_INK }
}

/**
 * Shift a chromatic ink color slightly toward high-contrast neutral ink along sRGB
 * while preserving hue recognizability until WCAG `minRatio` is met.
 */
export function ensureInkContrast(fgInput, bgInput, minRatio = 4.5) {
  const fg = typeof fgInput === 'string' ? parseCssColor(fgInput) : fgInput
  const bg = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput
  if (!bg) return fg || LIGHT_INK
  const quantized = (c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: c.a ?? 1 })
  if (fg && contrastRatio(quantized(fg), bg) >= minRatio) {
    return { ...fg, a: fg.a ?? 1 }
  }
  const targetInk = pickHighContrastInk(bg, null, minRatio)
  if (!fg) return targetInk
  const targetMin = minRatio + 0.05
  let lo = 0
  let hi = 1
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    const candidate = quantized(blendRgb(fg, targetInk, mid))
    if (contrastRatio(candidate, bg) >= targetMin) hi = mid
    else lo = mid
  }
  const resolved = quantized(blendRgb(fg, targetInk, hi))
  return contrastRatio(resolved, bg) >= minRatio ? resolved : targetInk
}

/**
 * Raise translucent glass surface opacity ONLY when wallpaper bleeding underneath
 * drops text contrast below `minRatio`. When contrast already holds cleanly, returns `null`.
 */
export function computeSafeSurfaceAlpha(surfaceColor, backdropColor, textColor, minRatio = 4.5) {
  const surf = typeof surfaceColor === 'string' ? parseCssColor(surfaceColor) : surfaceColor
  const back = typeof backdropColor === 'string' ? parseCssColor(backdropColor) : backdropColor
  const text = typeof textColor === 'string' ? parseCssColor(textColor) : textColor
  if (!surf || !back || !text) return null
  if (surf.a >= 0.995) return null
  if (contrastRatio(text, compositeOver(surf, back)) >= minRatio) return null
  const opaqueTest = contrastRatio(text, { ...surf, a: 1 })
  if (opaqueTest < minRatio) return null
  let lo = surf.a
  let hi = 0.96
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    const testBg = compositeOver({ ...surf, a: mid }, back)
    if (contrastRatio(text, testBg) >= minRatio) hi = mid
    else lo = mid
  }
  return { r: surf.r, g: surf.g, b: surf.b, a: clamp(Math.ceil(hi * 100) / 100, surf.a, 0.96) }
}

/**
 * Evaluate host tokens, wallpaper underlay, glass translucency, and color scheme;
 * return contrast-guaranteed tokens plus optional `.concerto-surface` CSS rescue
 * overrides (`cssVars`) active ONLY when a polarity or contrast violation occurs.
 */
export function resolveReadableSurfaceAndInk(input = {}) {
  const isLight = Boolean(input.isLight)
  const fb = isLight ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME
  const isGlass = Boolean(input.isGlass)

  const parsedLayer1 = parseCssColor(input.bgLayer1) || parseCssColor(fb.bgLayer1)
  const parsedLayer2 = parseCssColor(input.bgLayer2) || parseCssColor(fb.bgLayer2)
  const parsedLayer3 = parseCssColor(input.bgLayer3) || parseCssColor(fb.bgLayer3)
  const parsedOverlay = parseCssColor(input.bgOverlay) || parsedLayer2
  const parsedBase = parseCssColor(input.bgBase)

  const parsedText1 = parseCssColor(input.textPrimary) || parseCssColor(fb.textPrimary)
  const parsedText2 = parseCssColor(input.textSecondary) || parseCssColor(fb.textSecondary)
  const parsedText3 = parseCssColor(input.textTertiary) || parseCssColor(fb.textTertiary)
  const parsedAccent = parseCssColor(input.accent) || parseCssColor(fb.accent)
  const parsedAccentInk = parseCssColor(input.accentInk)

  const parsedDone = parseCssColor(input.done) || parseCssColor(fb.done)
  const parsedWarn = parseCssColor(input.warn) || parseCssColor(fb.warn)
  const parsedError = parseCssColor(input.error) || parseCssColor(fb.error)
  const parsedReview = parseCssColor(input.review) || parseCssColor(fb.review)

  // Determine effective opaque backdrop underneath glass layers
  const explicitUnderlay = parseCssColor(input.wallpaperUnderlay)
  const explicitReadabilityBase = parseCssColor(input.readabilityBase)
  const opaqueBase = (parsedBase && parsedBase.a >= 0.9) ? parsedBase : null
  const inferredBackdrop = explicitUnderlay
    || (explicitReadabilityBase && explicitReadabilityBase.a >= 0.9 ? explicitReadabilityBase : null)
    || opaqueBase
    || (relativeLuminance(parsedLayer1) < 0.35 ? { ...DARK_PAPER } : { ...LIGHT_PAPER })

  const effectiveBg1 = compositeOver(parsedLayer1, inferredBackdrop)
  const effectiveBg2 = compositeOver(parsedLayer2, inferredBackdrop)
  const effectiveOverlay = compositeOver(parsedOverlay, inferredBackdrop)

  // Check primary ink against composited surface
  let finalLayer1 = parsedLayer1
  let finalLayer2 = parsedLayer2
  let finalOverlay = parsedOverlay
  let finalText1 = parsedText1
  let surfaceRescued = false
  let textRescued = false

  const crPrimary = contrastRatio(parsedText1, effectiveBg1)
  if (crPrimary < 4.5) {
    // Try tightening frosted glass opacity first if solid surface tint itself would pass
    const boosted1 = isGlass ? computeSafeSurfaceAlpha(parsedLayer1, inferredBackdrop, parsedText1, 4.5) : null
    if (boosted1) {
      finalLayer1 = boosted1
      finalLayer2 = computeSafeSurfaceAlpha(parsedLayer2, inferredBackdrop, parsedText1, 4.5) || { ...parsedLayer2, a: boosted1.a }
      finalOverlay = computeSafeSurfaceAlpha(parsedOverlay, inferredBackdrop, parsedText1, 4.5) || { ...parsedOverlay, a: boosted1.a }
      surfaceRescued = true
    } else {
      finalText1 = pickHighContrastInk(effectiveBg1, parsedText1, 4.5)
      textRescued = true
    }
  }

  const finalEffectiveBg1 = compositeOver(finalLayer1, inferredBackdrop)
  const finalEffectiveBg2 = compositeOver(finalLayer2, inferredBackdrop)
  const finalEffectiveOverlay = compositeOver(finalOverlay, inferredBackdrop)

  const finalText2 = ensureInkContrast(parsedText2, finalEffectiveBg1, 4.5)
  const finalText3 = ensureInkContrast(parsedText3, finalEffectiveBg1, 4.5)
  const text2Rescued = textRescued || contrastRatio(parsedText2, finalEffectiveBg1) < 4.5
  const text3Rescued = textRescued || contrastRatio(parsedText3, finalEffectiveBg1) < 4.5

  let finalAccentFill = parsedAccent
  let finalOnAccent = pickHighContrastInk(parsedAccent, parsedAccentInk, 4.5)
  if (contrastRatio(finalOnAccent, parsedAccent) < 4.5) {
    // Mid-tone blues like #4176e6 sit right at 4.46:1 vs white and 4.27:1 vs #0f1115;
    // nudge solid button fill imperceptibly darker along sRGB so white label hits >= 4.55:1.
    finalOnAccent = { ...LIGHT_INK }
    finalAccentFill = ensureInkContrast(parsedAccent, LIGHT_INK, 4.55)
  }
  const finalAccentText = ensureInkContrast(parsedAccent, finalEffectiveBg1, 4.5)
  const finalAccentBorder = ensureInkContrast(parsedAccent, finalEffectiveBg1, 3.0)

  const finalDone = ensureInkContrast(parsedDone, finalEffectiveBg1, 4.5)
  const finalWarn = ensureInkContrast(parsedWarn, finalEffectiveBg1, 4.5)
  const finalError = ensureInkContrast(parsedError, finalEffectiveBg1, 4.5)
  const finalReview = ensureInkContrast(parsedReview, finalEffectiveBg1, 4.5)

  // Only emit surface/text CSS overrides when contrast rescue actually kicked in,
  // preserving zero-lag synchronous CSS custom property inheritance in standard themes.
  const cssVars = {}
  if (finalOnAccent) cssVars['--cc-on-accent'] = formatCssColor(finalOnAccent)
  if (finalAccentFill !== parsedAccent) cssVars['--cc-accent-fill'] = formatCssColor(finalAccentFill)
  if (contrastRatio(parsedAccent, finalEffectiveBg1) < 4.5) {
    cssVars['--cc-contrast-accent-text'] = formatCssColor(finalAccentText)
  }
  if (contrastRatio(parsedAccent, finalEffectiveBg1) < 3.0) {
    cssVars['--cc-contrast-accent-border'] = formatCssColor(finalAccentBorder)
  }
  if (surfaceRescued) {
    cssVars['--cc-contrast-card-bg'] = formatCssColor(finalLayer1)
    cssVars['--cc-contrast-nested-bg'] = formatCssColor(finalLayer2)
    cssVars['--cc-contrast-panel-bg'] = formatCssColor(finalLayer2)
    cssVars['--cc-contrast-canvas-bg'] = formatCssColor(finalLayer1)
    cssVars['--cc-contrast-overlay-bg'] = formatCssColor(finalOverlay)
  }
  if (textRescued) cssVars['--cc-contrast-text-primary'] = formatCssColor(finalText1)
  if (text2Rescued) cssVars['--cc-contrast-text-secondary'] = formatCssColor(finalText2)
  if (text3Rescued) cssVars['--cc-contrast-text-tertiary'] = formatCssColor(finalText3)
  if (contrastRatio(parsedDone, finalEffectiveBg1) < 4.5) cssVars['--cc-contrast-done'] = formatCssColor(finalDone)
  if (contrastRatio(parsedWarn, finalEffectiveBg1) < 4.5) cssVars['--cc-contrast-warn'] = formatCssColor(finalWarn)
  if (contrastRatio(parsedError, finalEffectiveBg1) < 4.5) cssVars['--cc-contrast-error'] = formatCssColor(finalError)
  if (contrastRatio(parsedReview, finalEffectiveBg1) < 4.5) cssVars['--cc-contrast-review'] = formatCssColor(finalReview)

  // Export theme: standalone SVG/PNG must NEVER turn translucent or invert Light -> Dark
  let exportBg1 = (parsedLayer1.a >= 0.99) ? parsedLayer1 : finalEffectiveBg1
  let exportBg2 = (parsedLayer2.a >= 0.99) ? parsedLayer2 : finalEffectiveBg2
  let exportText1 = finalText1
  let exportText2 = finalText2
  let exportText3 = finalText3
  if (isLight && (parsedLayer1.a < 0.99 || relativeLuminance(exportBg1) < 0.5)) {
    exportBg1 = parseCssColor(DEFAULT_LIGHT_THEME.bgLayer1)
    exportBg2 = parseCssColor(DEFAULT_LIGHT_THEME.bgLayer2)
    exportText1 = parseCssColor(input.hostTextPrimary) || parseCssColor(DEFAULT_LIGHT_THEME.textPrimary)
    exportText2 = parseCssColor(input.hostTextSecondary) || parseCssColor(DEFAULT_LIGHT_THEME.textSecondary)
    exportText3 = parseCssColor(input.hostTextTertiary) || parseCssColor(DEFAULT_LIGHT_THEME.textTertiary)
    exportText1 = ensureInkContrast(exportText1, exportBg1, 4.5)
    exportText2 = ensureInkContrast(exportText2, exportBg1, 4.5)
    exportText3 = ensureInkContrast(exportText3, exportBg1, 4.5)
  } else if (!isLight && relativeLuminance(exportBg1) > 0.5) {
    exportBg1 = parseCssColor(DEFAULT_DARK_THEME.bgLayer1)
    exportBg2 = parseCssColor(DEFAULT_DARK_THEME.bgLayer2)
    exportText1 = pickHighContrastInk(exportBg1, parsedText1, 4.5)
    exportText2 = ensureInkContrast(parsedText2, exportBg1, 4.5)
    exportText3 = ensureInkContrast(parsedText3, exportBg1, 4.5)
  }

  const exportTheme = Object.freeze({
    colorScheme: isLight ? 'light' : 'dark',
    isLight,
    bgLayer1: formatCssColor(exportBg1),
    bgLayer2: formatCssColor(exportBg2),
    textPrimary: formatCssColor(exportText1),
    textSecondary: formatCssColor(exportText2),
    textTertiary: formatCssColor(exportText3),
    borderColor: isLight ? DEFAULT_LIGHT_THEME.borderColor : DEFAULT_DARK_THEME.borderColor,
    borderStrong: isLight ? DEFAULT_LIGHT_THEME.borderStrong : DEFAULT_DARK_THEME.borderStrong,
    accent: formatCssColor(ensureInkContrast(parsedAccent, exportBg1, 4.5)),
    onAccent: formatCssColor(finalOnAccent),
    done: formatCssColor(ensureInkContrast(parsedDone, exportBg1, 4.5)),
    warn: formatCssColor(ensureInkContrast(parsedWarn, exportBg1, 4.5)),
    error: formatCssColor(ensureInkContrast(parsedError, exportBg1, 4.5)),
    review: formatCssColor(ensureInkContrast(parsedReview, exportBg1, 4.5)),
  })

  return {
    bgBase: (parsedBase && parsedBase.a > 0) ? formatCssColor(parsedBase) : fb.bgBase,
    bgLayer1: formatCssColor(finalLayer1),
    bgLayer2: formatCssColor(finalLayer2),
    bgLayer3: formatCssColor(parsedLayer3),
    bgOverlay: formatCssColor(finalOverlay),
    compositedBg1: formatCssColor(finalEffectiveBg1),
    compositedBg2: formatCssColor(finalEffectiveBg2),
    compositedOverlay: formatCssColor(finalEffectiveOverlay),
    textPrimary: formatCssColor(finalText1),
    textSecondary: formatCssColor(finalText2),
    textTertiary: formatCssColor(finalText3),
    accent: formatCssColor(parsedAccent),
    accentFill: formatCssColor(finalAccentFill),
    accentText: formatCssColor(finalAccentText),
    accentBorder: formatCssColor(finalAccentBorder),
    onAccent: formatCssColor(finalOnAccent),
    done: formatCssColor(finalDone),
    warn: formatCssColor(finalWarn),
    error: formatCssColor(finalError),
    review: formatCssColor(finalReview),
    contrastMetrics: {
      surfaceRescued,
      textRescued,
      primaryRatio: Number(contrastRatio(finalText1, finalEffectiveBg1).toFixed(2)),
      secondaryRatio: Number(contrastRatio(finalText2, finalEffectiveBg1).toFixed(2)),
      tertiaryRatio: Number(contrastRatio(finalText3, finalEffectiveBg1).toFixed(2)),
      accentTextRatio: Number(contrastRatio(finalAccentText, finalEffectiveBg1).toFixed(2)),
      onAccentRatio: Number(contrastRatio(finalOnAccent, finalAccentFill).toFixed(2)),
    },
    cssVars,
    exportTheme,
  }
}
