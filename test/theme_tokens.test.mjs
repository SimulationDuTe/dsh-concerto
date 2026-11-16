import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import vm from 'node:vm'
import {
  resolveReadableSurfaceAndInk,
  contrastRatio,
  relativeLuminance,
} from '../packages/dsh-concerto/lib/domain/theme_contrast.mjs'

function walkJsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walkJsFiles(p))
    else if (p.endsWith('.js')) out.push(p)
  }
  return out
}

function extractMountedTeamCssFromBundle() {
  let plugin
  const registrations = []
  const appendedStyles = []
  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: (fn) => { fn() },
    useRef: (v) => ({ current: v }),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useLayoutEffect: () => {},
  }
  const fakeStyle = () => ({ id: '', textContent: '', remove() {} })
  const fakeDoc = {
    head: {
      appendChild(el) { appendedStyles.push(el) },
    },
    getElementById(id) {
      return appendedStyles.find((el) => el.id === id) || null
    },
    createElement: (tag) => (tag === 'style' ? fakeStyle() : { style: {}, setAttribute() {}, remove() {}, appendChild() {} }),
    documentElement: null,
    body: null,
  }
  vm.runInNewContext(readFileSync(new URL('../packages/dsh-concerto/lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(() => React) } } },
    document: fakeDoc,
  })
  plugin.apply({
    effect(fn) { return fn() },
    locale: { register() {} },
    slots: {
      inject: (_slot, fn) => fn(),
      register: (options, component) => { registrations.push({ options, component }); return () => {} },
    },
  })
  const toolCard = registrations.find((r) => r.options.name === 'tool.call.toolview')?.component
  assert.ok(toolCard, 'toolCard component must register')
  toolCard({ callId: 'c1', toolName: 'get_task', phase: 'result', block: { content: [{ type: 'text', text: '{}' }] } })
  const styleNode = appendedStyles.find((s) => s.id === 'concerto-team-css')
  assert.ok(styleNode?.textContent, 'useTeamCss must mount #concerto-team-css')
  return styleNode.textContent
}

test('zero hardcoded color literals, opaque menu header fill, or hardcoded px typography across src/client', () => {
  const clientDir = resolve('packages/dsh-concerto/src/client')
  const files = walkJsFiles(clientDir)
  assert.ok(files.length >= 10, 'expected client JS files')

  const forbidden = []
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, idx) => {
      if (/#[0-9a-fA-F]{3,8}\b/.test(line)) forbidden.push(`${file}:${idx + 1}: hex color literal -> ${line.trim()}`)
      if (/\brgba?\s*\(/.test(line)) forbidden.push(`${file}:${idx + 1}: rgb/rgba color literal -> ${line.trim()}`)
      if (/--dsw-alias-menu-group-header-fill/.test(line)) forbidden.push(`${file}:${idx + 1}: opaque menu header token -> ${line.trim()}`)
      if (/font-size\s*:\s*\d+(?:\.\d+)?px/i.test(line)) forbidden.push(`${file}:${idx + 1}: hardcoded font-size px -> ${line.trim()}`)
      if (/\bfontSize\s*:\s*\d+/.test(line) && !file.endsWith('MemberSprite.js')) {
        forbidden.push(`${file}:${idx + 1}: hardcoded numeric fontSize -> ${line.trim()}`)
      }
    })
  }
  assert.deepEqual(forbidden, [], `Found forbidden hardcoded style literals:\n${forbidden.join('\n')}`)
})

test('built client bundle mounts 100% host-tokenized CSS covering glass, accent, borders, focus, radii, and typography', () => {
  const css = extractMountedTeamCssFromBundle()
  const requiredTokens = [
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-overlay',
    '--dsw-alias-bg-module-platform',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-border-l3',
    '--dsw-alias-settings-card-stroke',
    '--dsw-mask-blur',
    '--dsw-elevation-soft',
    '--dsw-elevation-panel',
    '--dsw-elevation-prominent',
    '--dsw-radius-sm',
    '--dsw-radius-md',
    '--dsw-radius-lg',
    '--dsw-font-family',
    '--ds-font-family-code',
    '--dsh-content-font-size',
    '--dsh-content-font-size-secondary',
    '--dsh-code-font-size',
    '--dsh-terminal-font-size',
    '--dsw-focus-ring-color',
    '--dsw-focus-ring-width',
    '--dsw-alias-state-business-primary',
    '--we-accent',
    '--dsw-alias-link',
    '--we-accent-ink',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-label-tertiary',
  ]
  const missingTokens = requiredTokens.filter((t) => !css.includes(t))
  assert.deepEqual(missingTokens, [], `Missing host tokens in #concerto-team-css: ${missingTokens.join(', ')}`)

  const blurSelectors = [
    '.concerto-hero',
    '.concerto-card',
    '.concerto-turn-card',
    '.concerto-tool-card',
    '.concerto-panel',
    '.concerto-dock',
    '.concerto-drawer',
    '.concerto-canvas-modal',
    '.concerto-attn-card',
    '.concerto-task-module',
    '.concerto-kcard',
    '.concerto-briefing-cell',
    '.concerto-filter-bar',
    '.concerto-sprite',
  ]
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const findRuleBlock = (sel) => {
    const m = new RegExp(`(?:^|\\n)\\s*${escapeRe(sel)}\\s*\\{([^}]*)\\}`, 'm').exec(css)
    return m ? m[1] : null
  }
  for (const sel of blurSelectors) {
    const block = findRuleBlock(sel)
    assert.ok(block !== null, `missing standalone rule ${sel}`)
    assert.match(block, /backdrop-filter:\s*var\(--cc-backdrop-blur\)/, `${sel} must bind backdrop-filter to --cc-backdrop-blur`)
    assert.match(
      block,
      /background:\s*var\(--cc-(?:card|card-nested|panel|overlay|canvas)-bg\)/,
      `${sel} must consume --cc-* surface token instead of bypassing contrast rescue`
    )
  }

  const apiText = readFileSync(resolve('packages/dsh-concerto/src/client/api.js'), 'utf8')
  assert.doesNotMatch(
    apiText,
    /background:\s*['"]var\(--dsw-alias-bg-layer-/,
    'api.js inline styles must not prioritize raw --dsw-alias-bg-layer-* ahead of --cc-card-bg'
  )

  for (const sel of [
    '.concerto-tab-btn[aria-selected="true"]',
    '.concerto-seg-btn[aria-pressed="true"]',
    '.concerto-btn--primary',
    '.concerto-chip',
    '.concerto-badge',
    '.concerto-link',
    '.concerto-filter-bar select[data-active="true"]',
  ]) {
    const block = findRuleBlock(sel)
    assert.ok(block !== null, `missing standalone accent rule ${sel}`)
    assert.match(block, /--cc-accent/, `${sel} must consume --cc-accent`)
  }
})

test('extreme theme+wallpaper contrast solver guarantees >=4.5:1 text & light export coherence', () => {
  const darkOnLightWp = resolveReadableSurfaceAndInk({
    isLight: false,
    isGlass: true,
    bgBase: 'transparent',
    bgLayer1: 'color(srgb 0.0509804 0.0823529 0.141176 / 0.268822)',
    bgLayer2: 'color(srgb 0.0509804 0.082353 0.141176 / 0.28558)',
    wallpaperUnderlay: 'rgb(245, 248, 255)',
    textPrimary: '#ffffff',
    textSecondary: '#cfd3d6',
    textTertiary: '#adb2b8',
    accent: '#67DCE7',
    accentInk: '#0f1115',
  })
  assert.equal(darkOnLightWp.contrastMetrics.surfaceRescued, true)
  assert.ok(darkOnLightWp.contrastMetrics.primaryRatio >= 4.5)
  assert.ok(darkOnLightWp.cssVars['--cc-contrast-card-bg'])

  const lightCollision = resolveReadableSurfaceAndInk({
    isLight: true,
    isGlass: true,
    bgBase: 'transparent',
    bgLayer1: 'color(srgb 0.223529 0.247059 0.298039 / 0.24561)',
    bgLayer2: 'color(srgb 0.223529 0.247059 0.298039 / 0.2629)',
    wallpaperUnderlay: 'rgb(19, 58, 88)',
    textPrimary: '#ffffff',
    textSecondary: '#fafafa',
    textTertiary: '#75e6f5',
    hostTextPrimary: '#0f1115',
    accent: '#67DCE7',
    accentInk: '#0f1115',
  })
  assert.ok(lightCollision.contrastMetrics.primaryRatio >= 4.5)
  assert.ok(lightCollision.contrastMetrics.accentTextRatio >= 4.5)
  assert.ok(lightCollision.contrastMetrics.onAccentRatio >= 4.5)
  assert.ok(relativeLuminance(lightCollision.exportTheme.bgLayer1) > 0.7, 'light mode SVG export must stay light')
  assert.ok(contrastRatio(lightCollision.exportTheme.textPrimary, lightCollision.exportTheme.bgLayer1) >= 4.5)
})
