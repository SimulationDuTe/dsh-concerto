import { h, label } from '../api.js'

const MEMBER_PALETTE = [
  'var(--dsw-static-blue-400, var(--cc-fb-member-1))',
  'var(--dsw-static-violet-400, var(--cc-fb-member-2))',
  'var(--dsw-static-green-400, var(--cc-fb-member-3))',
  'var(--dsw-static-red-400, var(--cc-fb-member-4))',
  'var(--dsw-static-amber-400, var(--cc-fb-member-5))',
  'var(--dsw-static-blue-500, var(--cc-fb-member-6))',
]

export function memberColor(id) {
  let hash = 0
  for (const ch of String(id || 'm')) {
    hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  }
  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length]
}

function stateRingColor(state) {
  if (state === 'running' || state === '协调') return 'var(--cc-state-running)'
  if (state === 'waiting_input' || state === 'waiting_approval' || state === 'attention') return 'var(--cc-state-attention)'
  if (state === 'review') return 'var(--cc-state-review)'
  if (state === 'blocked' || state === 'failed') return 'var(--cc-state-blocked)'
  if (state === 'completed' || state === 'done') return 'var(--cc-state-done)'
  if (state === 'unknown') return 'var(--cc-state-unknown)'
  return 'var(--cc-border)'
}

function resolveInstrument(member) {
  if (member?.instrument) return member.instrument
  if (member?.roleKind === 'reviewer') return 'magnifier'
  if (member?.roleKind === 'writer' || /writer|author|doc/i.test(String(member?.role || member?.id || ''))) return 'quill'
  const hash = Array.from(String(member?.id || 'w')).reduce((s, ch) => s + ch.codePointAt(0), 0)
  const instruments = ['keyboard', 'violin', 'quill']
  return instruments[hash % instruments.length]
}

/**
 * Orchestra-themed 64x64 rounded SVG mascot (`MemberSprite` v2):
 * - Commander: top hat + conducting baton
 * - Workers: keyboard / violin / quill (feather pen) silhouettes
 * - Reviewer: magnifying lens
 * - Corner badge: C (Codex) / D (DSH Hosted) / W (External Worker)
 * - Outer state halo ring
 * - Standard sizes (§2.4): 20 (Kanban card) / 32 (Roster) / 48 (Chat avatar) / 72 (Drawer header)
 */
export function MemberGlyph({ member, state = 'idle', size = 32 }) {
  const color = member?.roleKind === 'commander' ? 'var(--cc-accent)' : memberColor(member?.id)
  const ring = stateRingColor(state)
  const instrument = resolveInstrument(member)
  const isRunning = state === 'running' || state === '协调'
  const CONNECTOR_BADGE = { antigravity: 'A', claude: 'C', codex: 'C', gemini: 'G', opencode: 'O' }
  const sourceBadge = member?.connector
    ? (CONNECTOR_BADGE[member.connector] || 'W')
    : (member?.source === 'hosted' ? 'D' : 'W')

  return h('svg', {
    className: 'concerto-pixel',
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    'aria-hidden': true,
    style: { flex: 'none' },
  },
  h('circle', {
    cx: 32,
    cy: 32,
    r: 28,
    fill: 'none',
    stroke: ring,
    strokeWidth: 2.5,
    className: isRunning ? 'concerto-halo-pulse' : undefined,
    strokeDasharray: state === 'unknown' ? '4 3' : undefined,
  }),
  h('circle', { cx: 32, cy: 34, r: 16, fill: color }),
  h('circle', { cx: 26.5, cy: 32, r: 2.8, fill: 'var(--cc-fb-ink-dark)' }),
  h('circle', { cx: 27.2, cy: 31.2, r: 1, fill: 'var(--cc-fb-ink-light)' }),
  h('circle', { cx: 37.5, cy: 32, r: 2.8, fill: 'var(--cc-fb-ink-dark)' }),
  h('circle', { cx: 38.2, cy: 31.2, r: 1, fill: 'var(--cc-fb-ink-light)' }),
  h('path', {
    d: 'M28 38.5 Q32 41.5 36 38.5',
    fill: 'none',
    stroke: 'var(--cc-fb-ink-dark)',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
  }),
  member?.roleKind === 'commander'
    ? h('g', null,
        h('path', { d: 'M21 20 L43 20 L40 12 L24 12 Z', fill: 'var(--cc-fb-hat-fill)', stroke: color, strokeWidth: 1.5 }),
        h('line', { x1: 48, y1: 36, x2: 57, y2: 20, stroke: 'var(--cc-fb-gold-highlight)', strokeWidth: 2, strokeLinecap: 'round' }),
        h('circle', { cx: 57.5, cy: 19.5, r: 2, fill: 'var(--cc-fb-ink-light)' }))
    : instrument === 'keyboard'
      ? h('g', null,
          h('rect', { x: 14, y: 45, width: 24, height: 9, rx: 2, fill: 'var(--cc-fb-ink-dark)', stroke: 'var(--cc-fb-slate-stroke)', strokeWidth: 1.2 }),
          h('line', { x1: 18, y1: 49.5, x2: 34, y2: 49.5, stroke: 'var(--cc-fb-slate-muted)', strokeDasharray: '2 2', strokeWidth: 2 }))
      : instrument === 'violin'
        ? h('g', null,
            h('ellipse', { cx: 47, cy: 40, rx: 5, ry: 8, transform: 'rotate(-20 47 40)', fill: 'var(--cc-fb-gold-fill)', stroke: 'var(--cc-fb-gold-highlight)', strokeWidth: 1.2 }),
            h('line', { x1: 42, y1: 30, x2: 54, y2: 46, stroke: 'var(--cc-fb-gold-soft)', strokeWidth: 1.4 }))
        : instrument === 'quill'
          ? h('g', null,
              h('path', { d: 'M43 47 C45 36, 52 28, 57 25 C55 33, 50 41, 43 47 Z', fill: 'var(--cc-fb-ink-light)', stroke: 'var(--cc-fb-sky-stroke)', strokeWidth: 1.3 }),
              h('line', { x1: 41, y1: 49, x2: 55, y2: 27, stroke: 'var(--cc-fb-sky-soft)', strokeWidth: 1.4, strokeLinecap: 'round' }))
          : h('g', null,
              h('circle', { cx: 48, cy: 40, r: 6, fill: 'none', stroke: 'var(--cc-fb-slate-stroke)', strokeWidth: 1.8 }),
              h('line', { x1: 52, y1: 45, x2: 57, y2: 50, stroke: 'var(--cc-fb-slate-stroke)', strokeWidth: 2, strokeLinecap: 'round' })),
  h('g', { transform: 'translate(45,45)' },
    h('circle', { cx: 8, cy: 8, r: 8, fill: 'var(--cc-fb-ink-dark)', stroke: ring, strokeWidth: 1.5 }),
    h('text', { x: 8, y: 11, textAnchor: 'middle', fontSize: 9, fontWeight: 700, fill: 'var(--cc-fb-ink-light)' }, sourceBadge)))
}

export function MemberSprite({ member, state, activityLine, count = 0, selected = false, onClick }) {
  const subtitle = activityLine || label(state)
  return h('button', {
    type: 'button',
    className: 'concerto-sprite',
    'data-state': state,
    'data-concerto-member-id': member.id,
    'aria-pressed': selected,
    'aria-label': member.id + ' · ' + label(state) + (count ? ' · ' + count + ' 项待办' : ''),
    onClick,
  },
  h(MemberGlyph, { member, state, size: 32 }),
  h('span', { className: 'concerto-sprite-meta' },
    h('strong', null, member.id + (member.roleKind === 'commander' ? ' · 指挥者' : '')),
    h('small', { title: subtitle }, subtitle)),
  count > 0 && h('span', {
    className: 'concerto-count-pill',
    style: { background: 'var(--cc-state-attention-bg)', color: 'var(--cc-state-attention)' },
  }, count))
}
