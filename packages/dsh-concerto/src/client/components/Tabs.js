import React from 'react'
import { h } from '../api.js'

/** Manual activation avoids rendering expensive canvases while arrowing through tabs. */
export function TabList({ id, label, tabs, value, onChange, className = 'concerto-tabs' }) {
  const nativeFocusGroup = typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'focusGroup')
  const groupRef = React.useRef(null)
  const [polyfilled, setPolyfilled] = React.useState(false)
  React.useEffect(() => {
    if (nativeFocusGroup) return
    let cancelled = false
    import('@microsoft/focusgroup-polyfill').then(({ polyfill }) => {
      if (cancelled) return
      polyfill(groupRef.current)
      setPolyfilled(true)
    }).catch((err) => console.error('[Concerto] focusgroup unavailable; keeping keyboard fallback', err))
    return () => { cancelled = true }
  }, [nativeFocusGroup])
  return h('div', {
    ref: groupRef,
    className,
    role: 'tablist',
    'aria-label': label,
    focusgroup: 'tablist nomemory',
    onKeyDown: (event) => {
      if (nativeFocusGroup || polyfilled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')]
      const index = buttons.indexOf(document.activeElement)
      const direction = getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1
      const step = event.key === 'ArrowRight' ? direction : -direction
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + step + buttons.length) % buttons.length
      event.preventDefault()
      buttons[next].focus()
    },
  }, tabs.map((tab) => h('button', {
    key: tab.value,
    id: `${id}-tab-${tab.value}`,
    type: 'button',
    role: 'tab',
    className: 'concerto-tab-btn',
    'data-concerto-tab': tab.value,
    'aria-selected': value === tab.value,
    'aria-label': tab.attentionCount > 0 ? `${tab.label}，${tab.attentionCount} 项待处理` : undefined,
    focusgroupstart: value === tab.value ? '' : undefined,
    tabIndex: nativeFocusGroup || polyfilled ? undefined : (value === tab.value ? 0 : -1),
    onClick: () => onChange(tab.value),
  }, tab.label, tab.count > 0 && h('span', { className: 'concerto-tag concerto-num' }, String(tab.count)),
  tab.attentionCount > 0 && h('span', { className: 'concerto-tab-attention concerto-num', 'aria-hidden': 'true' }, String(tab.attentionCount)))))
}

export function tabPanelProps(id, value) {
  return { id: `${id}-panel-${value}`, role: 'tabpanel', 'aria-labelledby': `${id}-tab-${value}`, tabIndex: 0 }
}

export function focusAndReveal(element, block = 'center') {
  if (!element) return
  element.focus({ preventScroll: true })
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block })
}
