import React from 'react'

const overlayStack = []
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Shared accessible modal/drawer lifecycle hook:
 * - Prevents background polling re-renders from stealing focus via unstable `onClose` closures
 * - Maintains an Esc stack so only the topmost overlay closes
 * - Traps Tab / Shift+Tab inside `containerRef` and restores prior focus on unmount
 */
export function useOverlay(containerRef, initialFocusRef, onClose, active = true) {
  const closeRef = React.useRef(onClose)
  closeRef.current = onClose

  React.useEffect(() => {
    if (!active || typeof document === 'undefined') return
    const token = {}
    overlayStack.push(token)
    const prevFocus = document.activeElement
    initialFocusRef?.current?.focus?.()

    const onKeyDown = (e) => {
      if (overlayStack[overlayStack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key === 'Tab' && containerRef?.current) {
        const focusables = [...containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      const idx = overlayStack.indexOf(token)
      if (idx >= 0) overlayStack.splice(idx, 1)
      document.removeEventListener('keydown', onKeyDown, true)
      if (prevFocus && typeof prevFocus.focus === 'function' && prevFocus.isConnected) {
        prevFocus.focus()
      }
    }
  }, [active])
}
