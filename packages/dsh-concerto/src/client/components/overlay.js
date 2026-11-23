import React from 'react'

/** Native dialogs own focus containment, background inertness and nested Escape. */
export function useModalDialog(dialogRef, onClose, active = true) {
  const closeRef = React.useRef(onClose)
  closeRef.current = onClose

  React.useEffect(() => {
    if (!active) return
    const dialog = dialogRef.current
    const closed = () => { if (!dialog.open) closeRef.current?.() }
    dialog.addEventListener('close', closed)

    // Older hosts keep native Escape; only light dismissal needs this fallback.
    const outside = (event) => {
      const r = dialog.getBoundingClientRect()
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom
    }
    let pressedOutside = false
    const pointerDown = (event) => { pressedOutside = outside(event) }
    const pointerUp = (event) => { if (pressedOutside && outside(event)) dialog.close() }
    if (!('closedBy' in dialog)) {
      dialog.addEventListener('pointerdown', pointerDown)
      dialog.addEventListener('pointerup', pointerUp)
    }
    dialog.showModal()
    return () => {
      dialog.removeEventListener('close', closed)
      dialog.removeEventListener('pointerdown', pointerDown)
      dialog.removeEventListener('pointerup', pointerUp)
      dialog.close()
    }
  }, [active])
}
