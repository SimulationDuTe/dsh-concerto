import React from 'react'
import { h, importExcalidrawBoard } from '../api.js'
import { EXCALIDRAW_IMPORT_MAX_BYTES } from '../../../lib/domain/excalidraw_import.mjs'

export function ExcalidrawImport({ sessionId, disabled, viewObjects, refresh, onLocate }) {
  const picker = React.useRef(null)
  const [status, setStatus] = React.useState(null)
  const busy = status?.kind === 'busy'
  const imported = status?.id && viewObjects.find((object) => object.id === status.id)

  async function handleFile(event) {
    const input = event.currentTarget
    const file = input.files[0]
    if (!file) return
    input.value = ''
    if (file.size > EXCALIDRAW_IMPORT_MAX_BYTES) {
      setStatus({ kind: 'error', message: '请选择不超过 1 MiB 的 .excalidraw 文件。' })
      return
    }
    setStatus({ kind: 'busy', message: '正在导入白板…' })
    try {
      const result = await importExcalidrawBoard(sessionId, file)
      const omitted = result.omittedCount ? `，已跳过 ${result.omittedCount} 个不支持的元素` : ''
      setStatus({ kind: 'success', id: result.id, message: `已导入「${result.title}」${omitted}。` })
      refresh()
    } catch (error) {
      setStatus({ kind: 'error', message: `导入失败：${error.message}` })
    }
  }

  return h('div', { className: 'concerto-import-actions' },
    h('button', {
      type: 'button',
      className: 'concerto-btn',
      disabled: disabled || busy,
      onClick: () => picker.current.click(),
    }, '导入 .excalidraw'),
    h('input', { ref: picker, type: 'file', accept: '.excalidraw', hidden: true, onChange: handleFile }),
    h('span', { role: 'status', className: 'concerto-quiet', style: { overflowWrap: 'anywhere' } }, status?.message),
    imported && h('button', {
      type: 'button',
      className: 'concerto-link',
      onClick: () => onLocate(imported),
    }, '查看白板'))
}
