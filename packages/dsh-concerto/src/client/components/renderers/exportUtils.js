import { STATUS_TOKENS, DEPTH_PALETTE } from '../../../../lib/domain/view_layout.mjs'
import { readResolvedHostTheme, resolveCssExpression, resolveCssValue } from '../../api.js'

export { DEPTH_PALETTE }
export const STATUS_COLORS = STATUS_TOKENS

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function findMatchingVarEnd(text, openParenIndex) {
  let depth = 0
  let quote = ''
  for (let i = openParenIndex; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function parseVarInner(inner) {
  let depth = 0
  let quote = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (quote) {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      return {
        varName: inner.slice(0, i).trim(),
        fallbackExpr: inner.slice(i + 1).trim(),
      }
    }
  }
  return { varName: inner.trim(), fallbackExpr: '' }
}

function replaceBalancedCssVars(text, resolver) {
  let cur = String(text ?? '')
  for (let pass = 0; pass < 4 && cur.includes('var(--'); pass++) {
    let out = ''
    let idx = 0
    let changed = false
    while (idx < cur.length) {
      const hit = cur.indexOf('var(--', idx)
      if (hit < 0) {
        out += cur.slice(idx)
        break
      }
      const openIdx = hit + 3 // points to '('
      const closeIdx = findMatchingVarEnd(cur, openIdx)
      if (closeIdx < 0) {
        out += cur.slice(idx)
        break
      }
      out += cur.slice(idx, hit)
      const fullExpr = cur.slice(hit, closeIdx + 1)
      const { varName, fallbackExpr } = parseVarInner(cur.slice(openIdx + 1, closeIdx))
      const replacement = resolver(varName, fullExpr, fallbackExpr, hit, cur)
      if (typeof replacement === 'string' && replacement !== fullExpr) {
        out += replacement
        changed = true
      } else {
        out += fullExpr
      }
      idx = closeIdx + 1
    }
    cur = out
    if (!changed) break
  }
  return cur
}

function extractCssPropertyContext(text, varStartIndex) {
  const before = text.slice(Math.max(0, varStartIndex - 220), varStartIndex)
  const sepIdx = Math.max(before.lastIndexOf(';'), before.lastIndexOf('{'))
  const stmt = sepIdx >= 0 ? before.slice(sepIdx + 1) : before
  const colonIdx = stmt.indexOf(':')
  if (colonIdx < 0) return ''
  return stmt.slice(0, colonIdx).trim().toLowerCase()
}

function buildExportTypographyMap(theme) {
  const px = (n) => `${Number(Number(n).toFixed(2))}px`
  const baseFs = Number(theme?.fontSize) > 0 ? Number(theme.fontSize) : 14
  const metaFs = Number(theme?.secondaryFontSize) > 0 ? Number(theme.secondaryFontSize) : Math.max(12, baseFs - 1)
  const codeFs = Number(theme?.codeFontSize) > 0 ? Number(theme.codeFontSize) : Math.max(11, baseFs - 3)
  const termFs = Number(theme?.terminalFontSize) > 0 ? Number(theme.terminalFontSize) : metaFs
  const sans = theme?.fontFamily || 'system-ui, sans-serif'
  const mono = theme?.codeFontFamily || 'ui-monospace, monospace'
  return {
    '--cc-font-sans': sans,
    '--dsw-font-family': sans,
    '--dsh-font-family-text-default': sans,
    '--cc-font-mono': mono,
    '--ds-font-family-code': mono,
    '--dsh-font-family-code-default': mono,
    '--cc-font-size': px(baseFs),
    '--cc-fs-body': px(baseFs),
    '--dsh-content-font-size': px(baseFs),
    '--cc-font-size-secondary': px(metaFs),
    '--cc-fs-meta': px(metaFs),
    '--dsh-content-font-size-secondary': px(metaFs),
    '--cc-fs-caption': px(baseFs * 0.85),
    '--cc-fs-micro': px(baseFs * 0.72),
    '--cc-fs-title': px(baseFs * 1.07),
    '--cc-fs-display': px(baseFs * 1.25),
    '--cc-fs-code': px(codeFs),
    '--dsh-code-font-size': px(codeFs),
    '--cc-fs-terminal': px(termFs),
    '--dsh-terminal-font-size': px(termFs),
  }
}

function isColorPropertyOrToken(propName, varName) {
  if (/^(?:color|background|background-color|fill|stroke|stop-color|border-color|border-top-color|border-right-color|border-bottom-color|border-left-color|outline-color|text-decoration-color)$/.test(propName)) {
    return true
  }
  if (/^--(?:markmap-.*(?:color|bg)|cc-(?:card|panel|canvas|overlay|text|border|accent|on-accent|state|branch)|dsw-alias-(?:bg|label|border|state|brand|link))/.test(propName)) {
    return true
  }
  if (/^--(?:cc-(?:card|panel|canvas|overlay|text|border|accent|on-accent|state|branch)|dsw-alias-(?:bg|label|border|state|brand|link))/.test(varName)) {
    return true
  }
  return false
}

function extractDeclaredCustomProps(cssText, typoMap, hostEl, exp) {
  const locals = {}
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+?)\s*(?=[;}])/g
  let m
  while ((m = re.exec(cssText)) !== null) {
    const [, prop, rawVal] = m
    if (!rawVal.includes('var(--')) {
      locals[prop] = rawVal.trim()
      continue
    }
    const resolvedVal = replaceBalancedCssVars(rawVal, (varName, fullExpr, fallbackExpr) => {
      if (Object.prototype.hasOwnProperty.call(typoMap, varName)) return typoMap[varName]
      if (Object.prototype.hasOwnProperty.call(locals, varName)) return locals[varName]
      if (/font|sans|mono|size|width|border|table/.test(prop)) {
        if (varName.includes('mono') || varName.includes('code')) return typoMap['--cc-font-mono']
        if (varName.includes('sans') || varName.includes('family')) return typoMap['--cc-font-sans']
        if (varName.includes('size') || varName.includes('fs-')) return resolveCssValue('font-size', fullExpr, typoMap['--cc-font-size'], hostEl)
        return fallbackExpr || fullExpr
      }
      return resolveCssExpression(fullExpr, exp.textPrimary, hostEl)
    })
    locals[prop] = resolvedVal
  }
  return locals
}

function resolveCssVarsInDeclarations(cssText, theme, exp, hostEl) {
  const typoMap = buildExportTypographyMap(theme)
  const localProps = cssText.includes('--') ? extractDeclaredCustomProps(cssText, typoMap, hostEl, exp) : {}
  return replaceBalancedCssVars(cssText, (varName, fullExpr, fallbackExpr, hitIndex, currentText) => {
    if (Object.prototype.hasOwnProperty.call(typoMap, varName)) {
      return typoMap[varName]
    }
    const propName = extractCssPropertyContext(currentText, hitIndex)
    if (Object.prototype.hasOwnProperty.call(localProps, varName) && propName !== varName) {
      return localProps[varName]
    }
    if (propName === 'font-family') {
      return varName.includes('mono') || varName.includes('code') ? theme.codeFontFamily : theme.fontFamily
    }
    if (/^(?:font-size|line-height|stroke-width|border-radius|width|height|padding|margin|gap|letter-spacing)/.test(propName)) {
      const probeProp = propName === 'stroke-width' || propName === 'gap' ? 'width' : propName
      return resolveCssValue(probeProp, fullExpr, fallbackExpr || fullExpr, hostEl)
    }
    if (propName === 'font') {
      if (varName.includes('mono') || varName.includes('code')) return theme.codeFontFamily
      if (varName.includes('sans') || varName.includes('family')) return theme.fontFamily
      if (varName.includes('size') || varName.includes('fs-')) {
        return resolveCssValue('font-size', fullExpr, `${theme.fontSize}px`, hostEl)
      }
      return fallbackExpr || `${typoMap['--cc-font-size']}/1.45 ${theme.fontFamily}`
    }
    if (isColorPropertyOrToken(propName, varName)) {
      return resolveCssExpression(fullExpr, exp.textPrimary, hostEl)
    }
    return fallbackExpr || resolveCssExpression(fullExpr, exp.textPrimary, hostEl)
  })
}

function replaceVarExpressions(value, hostEl, fallback = '') {
  const str = String(value ?? '')
  if (!str.includes('var(--')) return str
  const trimmed = str.trim()
  if (/^(?:var|color-mix)\(/.test(trimmed)) {
    const resolved = resolveCssExpression(trimmed, fallback, hostEl)
    if (resolved && !resolved.includes('var(--')) return resolved
  }
  return replaceBalancedCssVars(str, (_varName, full) => {
    const resolved = resolveCssExpression(full, fallback, hostEl)
    return resolved && !resolved.includes('var(--') ? resolved : full
  })
}

function createExportResolutionHost(theme, fallbackParent) {
  if (!fallbackParent || typeof document === 'undefined') return null
  const exp = theme?.exportTheme || theme
  const typoMap = buildExportTypographyMap(theme)
  const host = document.createElement('span')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;'
  const vars = {
    ...typoMap,
    '--cc-card-bg': exp.bgLayer1,
    '--cc-card-nested-bg': exp.bgLayer2,
    '--cc-panel-bg': exp.bgLayer2,
    '--cc-canvas-bg': exp.bgLayer1,
    '--cc-overlay-bg': exp.bgLayer2,
    '--cc-text-primary': exp.textPrimary,
    '--cc-text-secondary': exp.textSecondary,
    '--cc-text-muted': exp.textTertiary,
    '--cc-border': exp.borderColor,
    '--cc-border-subtle': exp.borderColor,
    '--cc-border-strong': exp.borderStrong,
    '--cc-accent': exp.accent,
    '--cc-accent-text': exp.accent,
    '--cc-on-accent': exp.onAccent || exp.textPrimary,
    '--cc-state-running': exp.accent,
    '--cc-state-attention': exp.warn,
    '--cc-state-review': exp.review,
    '--cc-state-done': exp.done,
    '--cc-state-blocked': exp.error,
    '--cc-state-unknown': exp.textTertiary,
    '--cc-branch-1': exp.accent,
    '--cc-branch-2': `color-mix(in srgb, ${exp.accent} 72%, ${exp.textSecondary})`,
    '--cc-branch-3': `color-mix(in srgb, ${exp.accent} 52%, ${exp.textSecondary})`,
    '--cc-branch-4': `color-mix(in srgb, ${exp.accent} 36%, ${exp.textSecondary})`,
    '--dsw-alias-bg-base': exp.bgLayer1,
    '--dsw-alias-bg-layer-1': exp.bgLayer1,
    '--dsw-alias-bg-layer-2': exp.bgLayer2,
    '--dsw-alias-label-primary': exp.textPrimary,
    '--dsw-alias-label-secondary': exp.textSecondary,
    '--dsw-alias-label-tertiary': exp.textTertiary,
    '--dsw-alias-state-business-primary': exp.accent,
    '--dsw-alias-border-l1': exp.borderColor,
    '--dsw-alias-border-l2': exp.borderColor,
    '--dsw-alias-border-l3': exp.borderStrong,
  }
  for (const [k, v] of Object.entries(vars)) {
    if (v) host.style.setProperty(k, v)
  }
  fallbackParent.appendChild(host)
  return host
}

/**
 * Resolve CSS variables (`var(--dsw-*)` / `var(--cc-*)`) per CSS property type
 * (typography, lengths, and colors) onto an exported SVG clone using coherent opaque
 * theme colors so standalone SVG/PNG files keep exact fonts, sizes, and backgrounds.
 */
export function resolveSvgStylesForExport(svgClone, sourceSvg = null) {
  if (!svgClone || typeof document === 'undefined') return svgClone
  const fallbackParent = sourceSvg?.parentElement || document.body || document.documentElement
  const theme = readResolvedHostTheme()
  const exp = theme.exportTheme || theme
  const hostEl = createExportResolutionHost(theme, fallbackParent) || fallbackParent

  try {
    svgClone.setAttribute('font-family', theme.fontFamily)
    svgClone.setAttribute('font-size', `${theme.fontSize}px`)
    if (!svgClone.style.fontFamily) svgClone.style.fontFamily = theme.fontFamily
    if (!svgClone.style.fontSize) svgClone.style.fontSize = `${theme.fontSize}px`
    if (!svgClone.style.color) svgClone.style.color = exp.textPrimary
    svgClone.style.backgroundColor = exp.bgLayer1
    svgClone.setAttribute('data-concerto-export-bg', exp.bgLayer1)
    svgClone.setAttribute('data-concerto-export-scheme', exp.colorScheme || theme.colorScheme)

    if (!svgClone.querySelector('[data-concerto-export-backdrop]')) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('data-concerto-export-backdrop', '1')
      rect.setAttribute('x', '0')
      rect.setAttribute('y', '0')
      rect.setAttribute('width', '100%')
      rect.setAttribute('height', '100%')
      rect.setAttribute('fill', exp.bgLayer1)
      const insertRef = [...svgClone.children].find((c) => c.tagName?.toLowerCase() !== 'defs' && c.tagName?.toLowerCase() !== 'style') || null
      svgClone.insertBefore(rect, insertRef)
    }

    const COLOR_ATTRS = ['fill', 'stroke', 'color', 'stop-color']
    const allNodes = [svgClone, ...svgClone.querySelectorAll('*')]
    for (const node of allNodes) {
      if (node.tagName?.toLowerCase() === 'style' && node.textContent?.includes('var(--')) {
        node.textContent = resolveCssVarsInDeclarations(node.textContent, theme, exp, hostEl)
        continue
      }
      for (const attr of COLOR_ATTRS) {
        const val = node.getAttribute?.(attr)
        if (val && val.includes('var(--')) {
          node.setAttribute(attr, replaceVarExpressions(val, hostEl, exp.textPrimary))
        } else if (attr === 'fill' && val && val !== 'none' && val !== 'transparent' && node.closest?.('[data-concerto-rough-layer]')) {
          node.setAttribute('fill', exp.bgLayer2)
        }
      }
      const inlineStyle = node.getAttribute?.('style')
      if (inlineStyle && inlineStyle.includes('var(--')) {
        node.setAttribute('style', resolveCssVarsInDeclarations(inlineStyle, theme, exp, hostEl))
      }
      if (node.tagName?.toLowerCase() === 'text') {
        if (!node.getAttribute('font-family')) node.setAttribute('font-family', theme.fontFamily)
        const fs = node.getAttribute('font-size')
        if (!fs || fs.includes('var(--')) {
          node.setAttribute('font-size', String(theme.secondaryFontSize || theme.fontSize))
        }
      }
    }
    return svgClone
  } finally {
    if (hostEl !== fallbackParent) hostEl?.remove?.()
  }
}

export function serializeSvgElement(svgEl, width = 800, height = 500) {
  if (!svgEl) return ''
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  resolveSvgStylesForExport(clone, svgEl)
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)
}

export function exportSvgElement(svgEl, filename, width, height) {
  const xml = serializeSvgElement(svgEl, width, height)
  if (xml) downloadTextFile(filename, xml, 'image/svg+xml;charset=utf-8')
}

export function exportPngFromSvgElement(svgEl, filename, width = 960, height = 600) {
  if (!svgEl || typeof document === 'undefined') return
  const theme = readResolvedHostTheme()
  const fillBg = theme.exportTheme?.bgLayer1 || theme.bgLayer1 || theme.bgBase
  const xml = serializeSvgElement(svgEl, width, height)
  if (!xml) return
  const img = new Image()
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  img.onload = () => {
    try {
      const vb = svgEl.viewBox?.baseVal
      const w = Math.max(320, Math.round(vb?.width || width || 960))
      const hPx = Math.max(200, Math.round(vb?.height || height || 600))
      const canvas = document.createElement('canvas')
      canvas.width = w * 2
      canvas.height = hPx * 2
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = fillBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, w, hPx)
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return
        const pngUrl = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000)
      }, 'image/png')
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}
