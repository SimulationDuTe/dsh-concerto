import React from 'react'
import { h, styles, useHostTheme } from '../../api.js'
import { CONCERTO_HTML_CSP } from '../../../../lib/domain/view_objects.mjs'

function buildSrcDoc(data, hostTheme) {
  const colorScheme = hostTheme?.colorScheme === 'dark' ? 'dark' : 'light'
  const vars = [
    `color-scheme:${colorScheme}`,
    `--bg-base:${hostTheme.bgBase}`,
    `--bg-layer:${hostTheme.bgLayer1}`,
    `--bg-layer-2:${hostTheme.bgLayer2}`,
    `--text-primary:${hostTheme.textPrimary}`,
    `--text-secondary:${hostTheme.textSecondary}`,
    `--text-tertiary:${hostTheme.textTertiary}`,
    `--border-color:${hostTheme.borderColor}`,
    `--brand:${hostTheme.accent}`,
    `--brand-text:${hostTheme.accentText || hostTheme.accent}`,
    `--on-brand:${hostTheme.onAccent || hostTheme.textPrimary}`,
    `--font-sans:${hostTheme.fontFamily}`,
    `--font-mono:${hostTheme.codeFontFamily}`,
    `--font-size:${hostTheme.fontSize}px`,
    `--code-font-size:${hostTheme.codeFontSize}px`,
    `--terminal-font-size:${hostTheme.terminalFontSize || hostTheme.codeFontSize}px`,
  ].join(';') + ';'
  const baseCss = `
    :root { ${vars} }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: transparent; color: var(--text-primary); }
    body { padding: 12px; font-family: var(--font-sans); font-size: var(--font-size); line-height: 1.55; }
    a { color: var(--brand-text); }
    code, pre { font-family: var(--font-mono); font-size: var(--code-font-size); }
  `
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${CONCERTO_HTML_CSP}">`,
    `<style>${baseCss}\n${data?.css || ''}</style></head>`,
    `<body>${data?.html || ''}</body></html>`,
  ].join('')
}

function estimateHtmlHeight(data) {
  if (Number.isFinite(Number(data?.height)) && Number(data.height) > 0) {
    return Math.min(480, Math.max(88, Math.round(Number(data.height))))
  }
  const html = String(data?.html || '')
  const blockCount = (html.match(/<\s*(?:div|p|li|tr|h[1-6]|section|article|br)\b/gi) || []).length
  const textLen = html.replace(/<[^>]+>/g, '').trim().length
  const estimated = 44 + Math.max(1, blockCount) * 22 + Math.floor(textLen / 48) * 18
  return Math.min(360, Math.max(96, estimated))
}

/**
 * Sandboxed HTML+CSS card (`sandbox=""` without `allow-scripts` + strict CSP, §4.2).
 * Explicitly receives host theme colors, color-scheme, font-family, and font-size.
 */
export function HtmlSandboxRenderer({ object, inModal = false }) {
  const hostTheme = useHostTheme()
  const srcDoc = React.useMemo(() => buildSrcDoc(object?.data, hostTheme), [object?.data, hostTheme])
  if (!object?.data?.html) return h('p', { style: styles.muted }, 'HTML 卡片内容为空。')
  const cardH = estimateHtmlHeight(object?.data)
  const cappedH = Math.min(240, cardH)
  const clipped = !inModal && cardH > 220

  return h('div', {
    'data-concerto-renderer-root': 'sandbox-iframe',
    style: inModal ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined,
  },
  h('div', {
    style: {
      position: 'relative',
      flex: inModal ? 1 : undefined,
      borderRadius: 'var(--cc-radius-ctrl)',
      background: 'var(--cc-card-nested-bg)',
      overflow: 'hidden',
      minHeight: inModal ? 420 : cappedH,
    },
  },
  h('iframe', {
    sandbox: '',
    scrolling: inModal ? 'auto' : 'no',
    title: object.title || 'Concerto 沙箱 HTML 视图',
    srcDoc,
    style: {
      width: '100%',
      height: inModal ? '100%' : cappedH,
      minHeight: inModal ? 420 : cappedH,
      border: 0,
      background: 'transparent',
      display: 'block',
    },
  }),
  clipped && h('div', { className: 'concerto-html-fade', 'aria-hidden': true })),
  !inModal && h('div', { className: 'concerto-canvas-foot' },
    h('span', null, clipped ? '沙箱内容已截断 · 点击右上角全屏查看' : '沙箱内容预览')))
}
