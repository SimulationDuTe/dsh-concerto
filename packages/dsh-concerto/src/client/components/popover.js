export function showAnchoredPopover(trigger, panel, { width = 420, maxHeight = 360 } = {}) {
  if (!trigger || !panel || typeof panel.showPopover !== 'function') return false
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth
  const viewportHeight = window.innerHeight
  const actualWidth = Math.min(width, Math.max(240, viewportWidth - 32))
  const rect = trigger.getBoundingClientRect()
  const left = Math.max(16, Math.min(rect.right - actualWidth, viewportWidth - actualWidth - 16))
  const estimatedHeight = Math.min(maxHeight, panel.scrollHeight || maxHeight)
  let top = rect.bottom + 8
  let availableHeight = viewportHeight - top - 16
  if (availableHeight < 180 && rect.top > viewportHeight / 2) {
    top = Math.max(16, rect.top - estimatedHeight - 8)
    availableHeight = rect.top - 24
  }
  panel.style.width = `${actualWidth}px`
  panel.style.maxHeight = `${Math.max(120, Math.min(maxHeight, availableHeight))}px`
  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
  panel.showPopover()
  return true
}

export function hideAnchoredPopover(panel) {
  if (panel && typeof panel.hidePopover === 'function') panel.hidePopover()
}
