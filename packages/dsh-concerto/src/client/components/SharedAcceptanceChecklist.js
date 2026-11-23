import React from 'react'
import { h } from '../api.js'
import { isTerminalTask } from '../../../lib/domain/state_machine.mjs'
import { isSharedTaskArtifact } from '../../../lib/domain/view_objects.mjs'

const TYPE_LABEL = {
  checklist: '清单',
  table: '表格',
  diagram: '关系图',
  mindmap: '导图',
}

function flattenMindmap(node, depth = 0, out = []) {
  if (!node || typeof node !== 'object') return out
  if (node.id && node.label) out.push({ id: node.id, label: node.label, depth })
  for (const child of node.children ?? []) flattenMindmap(child, depth + 1, out)
  return out
}

function imeSafeKeyDown(event) {
  if (event.key === 'Enter' && (event.isComposing || event.nativeEvent?.isComposing)) {
    event.preventDefault()
  }
}

export function SharedAcceptanceChecklist({ task, taskObjects, canWrite, disabled, onSave, onOpenVersion }) {
  const [draft, setDraft] = React.useState(null)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const sharedObjects = taskObjects.filter((object) => isSharedTaskArtifact(task, object))
  const changes = task.checklistChanges ?? []
  if (sharedObjects.length === 0 && changes.length === 0) return null
  const editable = canWrite && !isTerminalTask(task.state)
  const draftObject = draft && sharedObjects.find((object) => object.id === draft.id)
  const hasNonChecklist = sharedObjects.some((object) => object.type !== 'checklist')
    || changes.some((change) => change.viewType && change.viewType !== 'checklist')

  function startChecklist(object, item) {
    setError('')
    setMessage('')
    setDraft({ kind: 'checklist', id: object.id, expectedVersion: object.version, itemId: item?.id, label: item?.label ?? '' })
  }

  function startTableCell(object, rowIndex, row, column, value) {
    setError('')
    setMessage('')
    setDraft({
      kind: 'table_cell', id: object.id, expectedVersion: object.version,
      rowIndex, rowKey: String(row?.[0] ?? ''), column, value: value == null ? '' : String(value),
    })
  }

  function startTableRow(object) {
    setError('')
    setMessage('')
    const cols = Array.isArray(object.data?.columns) ? object.data.columns : []
    setDraft({ kind: 'table_row', id: object.id, expectedVersion: object.version, columns: cols, cells: cols.map(() => '') })
  }

  function startGraphNode(object, node = null) {
    setError('')
    setMessage('')
    setDraft({
      kind: 'graph_node', id: object.id, viewType: object.type, expectedVersion: object.version,
      itemId: node?.id, parentId: object.type === 'mindmap' ? (object.data?.root?.id || 'root') : '',
      label: node?.label ?? '',
    })
  }

  function startDiagramEdge(object, edge = null) {
    setError('')
    setMessage('')
    const firstNode = object.data?.nodes?.[0]?.id ?? ''
    const secondNode = object.data?.nodes?.[1]?.id ?? firstNode
    setDraft({
      kind: 'diagram_edge', id: object.id, expectedVersion: object.version,
      isEdit: Boolean(edge), from: edge?.from ?? firstNode, to: edge?.to ?? secondNode,
      label: edge?.label ?? '', edgeKind: edge?.kind ?? 'normal',
    })
  }

  async function save(event) {
    event.preventDefault()
    if (!editable || disabled || !draft) return
    let payload
    let successText = '改动已保存。'
    if (draft.kind === 'checklist') {
      if (!draft.label.trim()) { setError('请输入条目内容。'); return }
      payload = { id: draft.id, expectedVersion: draft.expectedVersion, ...(draft.itemId ? { itemId: draft.itemId } : {}), label: draft.label }
      successText = '清单已保存。'
    } else if (draft.kind === 'table_cell') {
      if (!draft.value.trim()) { setError('请输入单元格内容。'); return }
      payload = {
        id: draft.id, expectedVersion: draft.expectedVersion,
        rowIndex: draft.rowIndex, rowKey: draft.rowKey, column: draft.column, value: draft.value,
      }
      successText = '表格单元格已保存。'
    } else if (draft.kind === 'table_row') {
      if (draft.cells.every((cell) => !cell.trim())) { setError('请至少填写一列内容。'); return }
      payload = { id: draft.id, expectedVersion: draft.expectedVersion, cells: draft.cells }
      successText = '表格行已保存。'
    } else if (draft.kind === 'graph_node') {
      if (!draft.label.trim()) { setError('请输入节点名称。'); return }
      payload = {
        id: draft.id, expectedVersion: draft.expectedVersion,
        ...(draft.itemId ? { itemId: draft.itemId } : {}),
        ...(draft.parentId ? { parentId: draft.parentId } : {}),
        label: draft.label,
      }
      successText = '图节点已保存。'
    } else if (draft.kind === 'diagram_edge') {
      if (!draft.from || !draft.to) { setError('请选择起点与终点节点。'); return }
      payload = {
        id: draft.id, expectedVersion: draft.expectedVersion,
        targetKind: 'edge', from: draft.from, to: draft.to, label: draft.label, edgeKind: draft.edgeKind,
      }
      successText = '图关系已保存。'
    } else {
      return
    }
    setError('')
    setMessage('')
    if (await onSave({ ...payload, taskId: task.taskId }, setError)) {
      setMessage(successText)
      setDraft(null)
    }
  }

  function versionButton(id, version, text, typeLabel = '验收清单') {
    return h('button', {
      type: 'button', className: 'concerto-link',
      onClick: () => onOpenVersion(id, version, text, typeLabel),
    }, text)
  }

  function renderStaleNotice(noun) {
    if (!draftObject || draftObject.version === draft.expectedVersion) return null
    return h('p', { className: 'concerto-quiet' },
      `${noun}已有新版。`,
      versionButton(draftObject.id, draftObject.version, `查看 v${draftObject.version}`, TYPE_LABEL[draftObject.type] || '共编成果'),
      ' ',
      h('button', {
        type: 'button', className: 'concerto-link', disabled,
        onClick: () => setDraft({ ...draft, expectedVersion: draftObject.version }),
      }, '按新版重新编辑'))
  }

  function renderFormActions(submitLabel) {
    return h('div', { className: 'concerto-review-heading' },
      h('button', { type: 'submit', className: 'concerto-btn concerto-btn--primary', disabled: disabled || !draftObject }, submitLabel),
      h('button', { type: 'button', className: 'concerto-btn', onClick: () => { setDraft(null); setError('') } }, '取消'))
  }

  function renderSharedObject(object) {
    const typeLabel = TYPE_LABEL[object.type] || object.type
    if (object.type === 'checklist') {
      return h('div', { key: object.id, 'data-concerto-shared-object': `${object.type}:${object.id}` },
        h('div', { className: 'concerto-review-heading' },
          h('strong', null, object.title),
          versionButton(object.id, object.version, `v${object.version}`, typeLabel),
          editable && h('button', { type: 'button', className: 'concerto-btn', disabled, onClick: () => startChecklist(object) }, '新增条目')),
        h('ul', { className: 'concerto-review-updates' }, object.data.items.map((item, index) =>
          h('li', { key: `${item.id}-${index}` },
            h('div', { className: 'concerto-review-heading' },
              h('span', null, item.label),
              editable && h('button', {
                type: 'button', className: 'concerto-link', disabled, 'aria-label': `编辑条目 ${item.label}`,
                onClick: () => startChecklist(object, item),
              }, '编辑'))))))
    }

    if (object.type === 'table') {
      const cols = Array.isArray(object.data?.columns) ? object.data.columns : []
      const rows = Array.isArray(object.data?.rows) ? object.data.rows : []
      return h('div', { key: object.id, 'data-concerto-shared-object': `${object.type}:${object.id}` },
        h('div', { className: 'concerto-review-heading' },
          h('strong', null, object.title),
          h('span', { className: 'concerto-tag' }, typeLabel),
          versionButton(object.id, object.version, `v${object.version}`, typeLabel),
          editable && h('button', { type: 'button', className: 'concerto-btn', disabled, onClick: () => startTableRow(object) }, '新增行')),
        h('div', { className: 'concerto-table-wrap', tabIndex: 0, role: 'region', 'aria-label': `${object.title} 共编表格` },
          h('table', { className: 'concerto-table' },
            h('thead', null, h('tr', null, cols.map((col, cIdx) => h('th', { key: cIdx, scope: 'col' }, String(col))))),
            h('tbody', null, rows.map((row, rIdx) =>
              h('tr', { key: rIdx }, cols.map((col, cIdx) => {
                const val = row[cIdx]
                const CellTag = cIdx === 0 ? 'th' : 'td'
                return h(CellTag, { key: cIdx, ...(cIdx === 0 ? { scope: 'row' } : {}) },
                  h('div', { className: 'concerto-shared-cell' },
                    h('span', null, String(val ?? '')),
                    editable && h('button', {
                      type: 'button', className: 'concerto-link', disabled,
                      'aria-label': `编辑单元格 第 ${rIdx + 1} 行 ${col}`,
                      onClick: () => startTableCell(object, rIdx, row, col, val),
                    }, '编辑')))
              })))))))
    }

    const nodes = object.type === 'diagram'
      ? (Array.isArray(object.data?.nodes) ? object.data.nodes : [])
      : flattenMindmap(object.data?.root)
    const edges = object.type === 'diagram' && Array.isArray(object.data?.edges) ? object.data.edges : []
    return h('div', { key: object.id, 'data-concerto-shared-object': `${object.type}:${object.id}` },
      h('div', { className: 'concerto-review-heading' },
        h('strong', null, object.title),
        h('span', { className: 'concerto-tag' }, typeLabel),
        versionButton(object.id, object.version, `v${object.version}`, typeLabel),
        editable && h('button', { type: 'button', className: 'concerto-btn', disabled, onClick: () => startGraphNode(object) }, '新增节点'),
        editable && object.type === 'diagram' && nodes.length > 0 && h('button', {
          type: 'button', className: 'concerto-btn', disabled, onClick: () => startDiagramEdge(object),
        }, '新增关系')),
      h('ul', { className: 'concerto-review-updates' }, nodes.map((node, index) =>
        h('li', { key: `${node.id}-${index}` },
          h('div', { className: 'concerto-review-heading' },
            h('span', null, node.depth ? `${'· '.repeat(node.depth)}${node.label}` : `${node.label} (${node.id})`),
            editable && h('button', {
              type: 'button', className: 'concerto-link', disabled, 'aria-label': `编辑节点 ${node.label}`,
              onClick: () => startGraphNode(object, node),
            }, '编辑'))))),
      edges.length > 0 && h('ul', { className: 'concerto-review-updates' }, edges.map((edge, index) =>
        h('li', { key: `${edge.from}-${edge.to}-${index}` },
          h('div', { className: 'concerto-review-heading' },
            h('span', null, `${edge.from} → ${edge.to}${edge.label ? `：${edge.label}` : ''}`),
            editable && h('button', {
              type: 'button', className: 'concerto-link', disabled, 'aria-label': `编辑关系 ${edge.from} 到 ${edge.to}`,
              onClick: () => startDiagramEdge(object, edge),
            }, '编辑关系'))))))
  }

  function renderDraftForm() {
    if (!draft || !editable) return null
    if (draft.kind === 'checklist') {
      return h('form', { onSubmit: save, 'aria-label': draft.itemId ? '编辑验收条目' : '新增验收条目' },
        h('div', { className: 'concerto-field' },
          h('label', null, `${draft.itemId ? '修改' : '新增'}条目 · 基于 v${draft.expectedVersion}`,
            h('input', {
              className: 'concerto-input', autoFocus: true, disabled, value: draft.label, required: true, maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value }),
            }))),
        renderStaleNotice('清单'),
        renderFormActions('保存条目'))
    }
    if (draft.kind === 'table_cell') {
      return h('form', { onSubmit: save, 'aria-label': '编辑表格单元格' },
        h('div', { className: 'concerto-field' },
          h('label', null, `第 ${draft.rowIndex + 1} 行 · ${draft.column} · 基于 v${draft.expectedVersion}`,
            h('input', {
              className: 'concerto-input', autoFocus: true, disabled, value: draft.value, required: true, maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, value: event.target.value }),
            }))),
        renderStaleNotice('表格'),
        renderFormActions('保存单元格'))
    }
    if (draft.kind === 'table_row') {
      return h('form', { onSubmit: save, 'aria-label': '新增表格行' },
        h('p', { className: 'concerto-quiet' }, `新增行 · 基于 v${draft.expectedVersion}`),
        draft.columns.map((col, idx) => h('div', { key: col, className: 'concerto-field' },
          h('label', null, String(col),
            h('input', {
              className: 'concerto-input', autoFocus: idx === 0, disabled, value: draft.cells[idx] ?? '', maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => {
                const nextCells = [...draft.cells]
                nextCells[idx] = event.target.value
                setDraft({ ...draft, cells: nextCells })
              },
            })))),
        renderStaleNotice('表格'),
        renderFormActions('保存新行'))
    }
    if (draft.kind === 'graph_node') {
      const mmNodes = draftObject?.type === 'mindmap' ? flattenMindmap(draftObject.data?.root) : []
      return h('form', { onSubmit: save, 'aria-label': draft.itemId ? '编辑图节点' : '新增图节点' },
        !draft.itemId && draftObject?.type === 'mindmap' && mmNodes.length > 0 && h('div', { className: 'concerto-field' },
          h('label', null, '父节点',
            h('select', {
              className: 'concerto-input', disabled, value: draft.parentId,
              onChange: (event) => setDraft({ ...draft, parentId: event.target.value }),
            }, mmNodes.map((n) => h('option', { key: n.id, value: n.id }, n.label))))),
        h('div', { className: 'concerto-field' },
          h('label', null, `${draft.itemId ? '修改' : '新增'}节点 · 基于 v${draft.expectedVersion}`,
            h('input', {
              className: 'concerto-input', autoFocus: true, disabled, value: draft.label, required: true, maxLength: 500,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value }),
            }))),
        renderStaleNotice('图表'),
        renderFormActions('保存节点'))
    }
    if (draft.kind === 'diagram_edge') {
      const dgNodes = draftObject?.type === 'diagram' ? (draftObject.data?.nodes ?? []) : []
      return h('form', { onSubmit: save, 'aria-label': '编辑图关系' },
        !draft.isEdit && dgNodes.length > 0 && h(React.Fragment, null,
          h('div', { className: 'concerto-field' },
            h('label', null, '起点节点',
              h('select', {
                className: 'concerto-input', disabled, value: draft.from,
                onChange: (event) => setDraft({ ...draft, from: event.target.value }),
              }, dgNodes.map((n) => h('option', { key: n.id, value: n.id }, `${n.label} (${n.id})`))))),
          h('div', { className: 'concerto-field' },
            h('label', null, '终点节点',
              h('select', {
                className: 'concerto-input', disabled, value: draft.to,
                onChange: (event) => setDraft({ ...draft, to: event.target.value }),
              }, dgNodes.map((n) => h('option', { key: n.id, value: n.id }, `${n.label} (${n.id})`)))))),
        h('div', { className: 'concerto-field' },
          h('label', null, `关系说明 (${draft.from} → ${draft.to}) · 基于 v${draft.expectedVersion}`,
            h('input', {
              className: 'concerto-input', autoFocus: true, disabled, value: draft.label, maxLength: 240,
              onKeyDown: imeSafeKeyDown,
              onChange: (event) => setDraft({ ...draft, label: event.target.value }),
            }))),
        h('div', { className: 'concerto-field' },
          h('label', null, '关系语义',
            h('select', {
              className: 'concerto-input', disabled, value: draft.edgeKind,
              onChange: (event) => setDraft({ ...draft, edgeKind: event.target.value }),
            },
            h('option', { value: 'normal' }, '普通关系'),
            h('option', { value: 'critical' }, '强调路径'),
            h('option', { value: 'error' }, '异常阻断')))),
        renderStaleNotice('图表'),
        renderFormActions('保存关系'))
    }
    return null
  }

  return h('section', { className: 'concerto-acc-box concerto-shared-checklist', 'aria-label': '共编验收清单' },
    h('strong', null, hasNonChecklist ? '共编验收清单与交付成果' : '共编验收清单'),
    sharedObjects.map(renderSharedObject),
    renderDraftForm(),
    error && h('p', { role: 'alert', className: 'concerto-field-error' }, error),
    h('span', { role: 'status', className: 'concerto-quiet' }, message),
    changes.length > 0 && h('ol', { className: 'concerto-review-threads', 'aria-label': '清单改动' }, changes.slice().reverse().map((change) => {
      const reader = change.reads.at(-1)
      const report = change.reports.at(-1)
      const typeLabel = TYPE_LABEL[change.viewType] || '清单'
      const status = !change.current ? '历史改动'
        : report?.verification ? '已验证'
          : report ? '已提交证据'
            : reader ? '成员已读取' : '已保存'
      return h('li', { key: change.changeId, className: 'concerto-review-thread' },
        h('div', { className: 'concerto-review-heading' },
          h('strong', null, change.label), h('span', { className: 'concerto-tag' }, status)),
        h('div', { className: 'concerto-review-heading concerto-quiet' },
          h('time', { dateTime: change.at }, `用户 · ${new Date(change.at).toLocaleString()}`),
          versionButton(change.viewId, change.fromVersion, `v${change.fromVersion}`, typeLabel), '→',
          versionButton(change.viewId, change.version, `v${change.version}`, typeLabel)),
        change.previousLabel && h('p', { className: 'concerto-review-text concerto-quiet' },
          `${change.viewType && change.viewType !== 'checklist' ? '原内容' : '原条目'} · `, change.previousLabel),
        reader && h('div', { className: 'concerto-quiet' }, `${reader.memberId} · ${new Date(reader.at).toLocaleString()} 读取`),
        report && h('div', { className: 'concerto-review-heading' },
          h('span', { className: 'concerto-quiet' }, `${report.memberId} 提交证据`),
          versionButton(report.viewId, report.version, `${typeLabel} v${report.version}`, typeLabel),
          report.evidence.map((entry, index) => h('span', { key: index },
            entry.artifact ? versionButton(entry.artifact.id, entry.artifact.version, `${entry.artifact.title} v${entry.artifact.version}`) : entry.ref)),
          report.verification && h('span', { className: 'concerto-quiet' }, `验收 ${report.verification.reviewId}`)))
    })))
}
