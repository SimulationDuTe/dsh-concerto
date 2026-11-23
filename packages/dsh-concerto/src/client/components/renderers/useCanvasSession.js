import React from 'react'
import { readCanvasViewport, writeCanvasViewport } from '../../api.js'

function normalizeViewport(value) {
  return {
    scale: Number.isFinite(value?.scale) && value.scale > 0 ? value.scale : 1,
    panX: Number.isFinite(value?.panX) ? value.panX : 0,
    panY: Number.isFinite(value?.panY) ? value.panY : 0,
  }
}

function initialViewports(saved) {
  return {
    preview: normalizeViewport(saved),
    modal: saved.modalTransform
      ? normalizeViewport({ scale: saved.modalTransform.k, panX: saved.modalTransform.x, panY: saved.modalTransform.y })
      : null,
  }
}

export function useCanvasSession(sessionId, objectId, defaultCollapsedIds = []) {
  const defaultsRef = React.useRef(defaultCollapsedIds)
  defaultsRef.current = defaultCollapsedIds
  const saved = React.useMemo(() => readCanvasViewport(sessionId, objectId), [sessionId, objectId])
  const [collapsedIds, setCollapsedIdsState] = React.useState(() => (
    Array.isArray(saved.collapsedIds) ? new Set(saved.collapsedIds) : new Set(defaultsRef.current)
  ))
  const [viewports, setViewports] = React.useState(() => initialViewports(saved))

  React.useEffect(() => {
    setCollapsedIdsState(Array.isArray(saved.collapsedIds) ? new Set(saved.collapsedIds) : new Set(defaultsRef.current))
    setViewports(initialViewports(saved))
  }, [saved])

  const setCollapsedIds = React.useCallback((nextValue) => {
    setCollapsedIdsState((current) => {
      const candidate = typeof nextValue === 'function' ? nextValue(current) : nextValue
      const next = new Set(candidate || [])
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current
      writeCanvasViewport(sessionId, objectId, { collapsedIds: [...next].sort() })
      return next
    })
  }, [sessionId, objectId])

  const setViewport = React.useCallback((mode, value) => {
    if (mode !== 'preview' && mode !== 'modal') return
    setViewports((current) => {
      const nextViewport = value == null ? null : normalizeViewport(value)
      if (mode === 'modal') {
        writeCanvasViewport(sessionId, objectId, {
          modalTransform: nextViewport ? { k: nextViewport.scale, x: nextViewport.panX, y: nextViewport.panY } : null,
        })
      } else {
        const next = nextViewport || normalizeViewport()
        writeCanvasViewport(sessionId, objectId, { scale: next.scale, panX: next.panX, panY: next.panY })
      }
      return { ...current, [mode]: nextViewport }
    })
  }, [sessionId, objectId])

  return React.useMemo(() => ({ collapsedIds, viewports, setCollapsedIds, setViewport }), [collapsedIds, viewports, setCollapsedIds, setViewport])
}
