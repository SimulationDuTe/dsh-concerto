import { h, STATE_META } from '../api.js'

const STATUS_ICON = {
  running: 'refresh',
  in_progress: 'refresh',
  waiting_input: 'attention',
  waiting_approval: 'attention',
  attention: 'attention',
  review: 'review',
  completed: 'check',
  done: 'check',
  blocked: 'blocked',
  failed: 'blocked',
  unknown: 'unknown',
  idle: 'idle',
  pending: 'idle',
  协调: 'music',
}

function iconChildren(name, filled) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'close':
      return [h('path', { key: 'p', ...stroke, d: 'M4 4l8 8M12 4l-8 8' })]
    case 'check':
      return [h('path', { key: 'p', ...stroke, d: 'M3 8.5l3 3L13 4.5' })]
    case 'refresh':
      return [
        h('path', { key: 'a', ...stroke, d: 'M13 5V2l-2 2a5.5 5.5 0 1 0 1.4 6' }),
        h('path', { key: 'b', ...stroke, d: 'M10.5 2H13v2.5' }),
      ]
    case 'expand':
      return [h('path', { key: 'p', ...stroke, d: 'M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4M2 6l4-4M14 6l-4-4M2 10l4 4M14 10l-4 4' })]
    case 'pin':
      return [h('path', { key: 'p', ...stroke, fill: filled ? 'currentColor' : 'none', d: 'M5 2h6l-1 5 2.5 2.5v1h-9v-1L6 7V2zm3 8.5V14' })]
    case 'info':
      return [
        h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 6 }),
        h('path', { key: 'p', ...stroke, d: 'M8 7v4M8 4.5v.5' }),
      ]
    case 'attention':
      return [h('circle', { key: 'c', cx: 8, cy: 8, r: 4, fill: 'currentColor' })]
    case 'review':
      return [
        h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 6 }),
        h('path', { key: 'p', d: 'M8 2a6 6 0 0 1 0 12z', fill: 'currentColor' }),
      ]
    case 'blocked':
      return [
        h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 6 }),
        h('path', { key: 'p', ...stroke, d: 'M8 4v5M8 11.5v.5' }),
      ]
    case 'unknown':
      return [
        h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 6 }),
        h('path', { key: 'p', ...stroke, d: 'M6 6a2 2 0 0 1 4 0c0 1.5-2 1.5-2 3M8 11v.5' }),
      ]
    case 'idle':
      return [h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 5 })]
    case 'music':
      return [h('path', { key: 'p', ...stroke, d: 'M6 11V3l7-1v8M6 6l7-1' }), h('circle', { key: 'a', ...stroke, cx: 4.5, cy: 11.5, r: 1.5 }), h('circle', { key: 'b', ...stroke, cx: 11.5, cy: 10.5, r: 1.5 })]
    case 'checkbox':
      return [h('rect', { key: 'r', ...stroke, x: 2.5, y: 2.5, width: 11, height: 11, rx: 2 })]
    case 'checkbox-checked':
    case 'checklist':
      return [h('rect', { key: 'r', ...stroke, x: 2.5, y: 2.5, width: 11, height: 11, rx: 2 }), h('path', { key: 'p', ...stroke, d: 'M5 8l2 2 4-5' })]
    case 'table':
      return [h('rect', { key: 'r', ...stroke, x: 2, y: 3, width: 12, height: 10, rx: 1 }), h('path', { key: 'p', ...stroke, d: 'M2 7h12M6 3v10M10 3v10' })]
    case 'mindmap':
      return [h('circle', { key: 'a', ...stroke, cx: 4, cy: 8, r: 2 }), h('circle', { key: 'b', ...stroke, cx: 12, cy: 4, r: 2 }), h('circle', { key: 'c', ...stroke, cx: 12, cy: 12, r: 2 }), h('path', { key: 'p', ...stroke, d: 'M6 8h2a2 2 0 0 0 2-2M6 8h2a2 2 0 0 1 2 2' })]
    case 'diagram':
      return [h('path', { key: 'p', ...stroke, d: 'M2 8h10M9 4l4 4-4 4' })]
    case 'board':
      return [h('path', { key: 'p', ...stroke, d: 'M3 11l8-8 2 2-8 8H3v-2zm7-7 2 2M3 14h10' })]
    case 'html':
      return [h('rect', { key: 'r', ...stroke, x: 2, y: 2, width: 12, height: 12, rx: 2 }), h('path', { key: 'p', ...stroke, d: 'M6 6L4 8l2 2M10 6l2 2-2 2' })]
    default:
      return [h('circle', { key: 'c', ...stroke, cx: 8, cy: 8, r: 5 })]
  }
}

export function UiIcon({ name, size = 16, filled = false, className = '' }) {
  return h('svg', {
    className: `concerto-icon ${className}`.trim(),
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': 'true',
    focusable: 'false',
  }, iconChildren(name, filled))
}

export function StatusIcon({ status, size = 16 }) {
  return h(UiIcon, { name: STATUS_ICON[status] || 'idle', size })
}

export function StateChip({ status, text, className = '' }) {
  const meta = STATE_META[status] || STATE_META.idle
  return h('span', { className: `concerto-state-chip ${meta.cls} ${className}`.trim() },
    h(StatusIcon, { status }),
    h('span', null, text || meta.label))
}
