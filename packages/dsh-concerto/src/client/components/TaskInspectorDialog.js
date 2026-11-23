import React from 'react'
import { createPortal } from 'react-dom'
import { h, useHostTheme } from '../api.js'
import { useTeamCss } from '../styles.js'
import { useModalDialog } from './overlay.js'

export function InspectorDialog({ title, onClose, className = '', dialogProps = {}, children }) {
  useTeamCss()
  const hostTheme = useHostTheme()
  const dialogRef = React.useRef(null)
  useModalDialog(dialogRef, onClose)

  const dialog = h('dialog', {
    ref: dialogRef,
    className: `concerto-drawer concerto-surface ${className}`.trim(),
    'data-concerto-theme': hostTheme.colorScheme,
    closedby: 'any',
    ...dialogProps,
    'aria-label': title,
    style: hostTheme.cssVars,
  }, children)

  return typeof document !== 'undefined' && document.body ? createPortal(dialog, document.body) : dialog
}

export function TaskInspectorDialog({ title, onClose, children }) {
  return h(InspectorDialog, {
    title: `任务详情：${title}`,
    onClose,
    className: 'concerto-task-inspector-dialog',
    dialogProps: { 'data-concerto-task-inspector-dialog': 'true' },
  }, h('div', { className: 'concerto-drawer-body' }, children))
}
