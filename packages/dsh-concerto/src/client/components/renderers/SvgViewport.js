import React from 'react'
import { h } from '../../api.js'

// Keep one SVG unit at one CSS pixel at 100%; large graphs scroll instead of shrinking labels.
export function SvgViewport({ width, height, zoom, pan, onViewportChange, inModal, label, tools, children }) {
  const stageRef = React.useRef(null)
  const dragRef = React.useRef(null)
  const [overflowing, setOverflowing] = React.useState(false)
  const [hintVisible, setHintVisible] = React.useState(false)
  const wasOverflowing = React.useRef(false)

  React.useEffect(() => {
    if (overflowing && !wasOverflowing.current) {
      setHintVisible(true)
      const timer = setTimeout(() => setHintVisible(false), 3000)
      wasOverflowing.current = true
      return () => clearTimeout(timer)
    }
    if (!overflowing) {
      setHintVisible(false)
      wasOverflowing.current = false
    }
  }, [overflowing])
  React.useLayoutEffect(() => {
    const stage = stageRef.current
    stage.scrollLeft = -pan.x
    stage.scrollTop = -pan.y
  }, [pan.x, pan.y, zoom, width, height])

  React.useLayoutEffect(() => {
    const stage = stageRef.current
    const update = () => setOverflowing(stage.scrollWidth > stage.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [zoom, width, height])

  return h('div', {
    className: 'concerto-graph-frame',
    style: inModal ? { flex: 1, minHeight: 0 } : { height: Math.min(380, Math.max(160, height + 24)) },
  },
  h('div', {
    ref: stageRef,
    className: 'concerto-canvas-stage concerto-canvas-stage--readable',
    tabIndex: 0,
    role: 'region',
    'aria-label': label + '，可滚动查看',
    onScroll: (event) => {
      const { scrollLeft, scrollTop } = event.currentTarget
      if (Math.abs(pan.x + scrollLeft) > 1 || Math.abs(pan.y + scrollTop) > 1) {
        onViewportChange(zoom, { x: -scrollLeft, y: -scrollTop })
      }
    },
    onPointerDown: (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, [role="button"]')) return
      const stage = event.currentTarget
      dragRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop }
      stage.focus({ preventScroll: true })
      stage.setPointerCapture(event.pointerId)
      event.preventDefault()
    },
    onPointerMove: (event) => {
      const drag = dragRef.current
      if (!drag) return
      event.currentTarget.scrollLeft = drag.left + drag.x - event.clientX
      event.currentTarget.scrollTop = drag.top + drag.y - event.clientY
    },
    onPointerUp: () => { dragRef.current = null },
    onPointerCancel: () => { dragRef.current = null },
    onLostPointerCapture: () => { dragRef.current = null },
  },
  h('div', {
    className: 'concerto-graph-content',
    style: { width: Math.ceil(width * zoom), height: Math.ceil(height * zoom) },
  }, children)),
  overflowing && hintVisible && h('span', { className: 'concerto-graph-scroll-hint', 'aria-hidden': true }, '滚动画布查看更多'),
  tools && h('div', { className: 'concerto-stage-tools' }, tools))
}
