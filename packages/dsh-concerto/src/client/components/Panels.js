import React from 'react'
import {
  h,
  request,
  styles,
  cardStyle,
  label,
  toTeamId,
  useHostTheme,
  formatCapabilitySummary,
  fetchRuns,
  launchTeamSession,
  openHostSession,
  fetchUnknownExecutions,
  reconcileUnknownExecution,
  adjudicateRecoveryExecution,
} from '../api.js'
import { useTeamCss } from '../styles.js'
import { UiIcon } from './UiIcon.js'
import { InspectorDialog } from './TaskInspectorDialog.js'
import { MemberGlyph } from './MemberSprite.js'

const ADJUDICATION_NOTES = {
  confirm_failed: '用户选择：确认执行已停止',
  retry_isolated: '用户选择：在隔离工作区重试',
  accept: '用户选择：接收已验证交付',
  force_release: '用户确认风险并强制解除工作目录占用（未取得后端停止证据）',
}

function ForceReleaseDialog({ row, busy, onClose, onConfirm }) {
  const descriptionId = React.useId()
  const [riskAccepted, setRiskAccepted] = React.useState(false)
  const cancelRef = React.useRef(null)
  React.useEffect(() => { cancelRef.current?.focus() }, [])
  return h(InspectorDialog, {
    title: `强制解除目录占用 · ${row.executionId}`,
    onClose: () => { if (!busy) onClose() },
    className: 'concerto-force-release-dialog',
    dialogProps: { 'aria-describedby': descriptionId },
  }, h('div', { className: 'concerto-drawer-body' },
    h('h3', null, `确认强制解除 ${row.executionId} 的目录占用？`),
    h('p', { id: descriptionId },
      `所属团队：${row.teamName || row.teamSessionId}（${row.teamSessionId}）`,
      row.writeScope ? ` · 工作目录：${row.writeScope}` : '',
      '。该操作不会等待后端停止证据；如果原执行仍在运行，可能导致文件并发写入冲突。若核对发现代理仍处于活跃状态，系统仍会拒绝释放。'),
    h('label', { className: 'concerto-set-check' },
      h('input', {
        type: 'checkbox',
        checked: riskAccepted,
        disabled: busy,
        onChange: (e) => setRiskAccepted(e.target.checked),
      }),
      h('span', null, '我已确认原任务不再运行或自行承担并发写入风险，强制释放工作目录锁定')),
    h('div', { className: 'concerto-set-actions-buttons' },
      h('button', { ref: cancelRef, type: 'button', className: 'concerto-btn', autoFocus: true, disabled: busy, onClick: onClose }, '取消'),
      h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--danger',
        disabled: busy || !riskAccepted,
        onClick: onConfirm,
      }, '确认风险并强制释放'))))
}

function DeliveryRecoveryNote({ delivery }) {
  return h('p', { className: 'concerto-field-hint' },
    `已验证交付：${delivery.artifactRefs.join('、')}。接收后原工作区继续保留占用，直到核对并确认原执行已停止。`,
    delivery.requiresReview && '确认停止后可继续独立审查。')
}

function RecoveryExecutionRow({ row, busy, onBusy, onDone, onError }) {
  const [reviewed, setReviewed] = React.useState(false)
  const [forceOpen, setForceOpen] = React.useState(false)
  const [recResult, setRecResult] = React.useState(row.lastReconcile || null)
  const isCrossRestart = row.isCurrentHostBoot === false

  async function onReconcile() {
    onBusy(true)
    try {
      const out = await reconcileUnknownExecution({
        teamSessionId: row.teamSessionId,
        taskId: row.taskId,
        executionId: row.executionId,
      })
      setRecResult(out)
      onDone(`后端核对结果：${out.reason || (out.confirmedStopped ? '已确认停止' : '未确认停止')}`)
    } catch (e) {
      onError('后端核对失败：' + e.message)
    } finally {
      onBusy(false)
    }
  }

  async function onAdjudicate(action) {
    onBusy(true)
    try {
      const out = await adjudicateRecoveryExecution({
        teamSessionId: row.teamSessionId,
        taskId: row.taskId,
        executionId: row.executionId,
        commandId: `rec-${row.executionId}-${action}-${Date.now()}`,
        action,
        reason: ADJUDICATION_NOTES[action],
        ...(action === 'retry_isolated' ? { externalEffectsReviewed: reviewed } : {}),
        ...(action === 'accept' ? { resultId: row.recoverableDelivery.resultId } : {}),
        ...(action === 'force_release' ? { confirmUnverifiedRelease: true } : {}),
      })
      const messages = {
        retry_isolated: `已在隔离新目录就绪（原工作区保留标记）：${out.retryCwd || ''}`,
        confirm_failed: `已确认后端停止并释放原工作区（任务状态：${out.state || 'failed'}）`,
        accept: '已接收交付。请在保留占用的列表中继续核对原执行。',
        force_release: out.forcedUnverified === false
          ? `已取得后端停止证据并释放原工作区（任务状态：${out.state || 'failed'}）`
          : `已按用户风险确认强制解除原工作区占用（任务状态：${out.state || 'failed'}）`,
      }
      if (action === 'force_release') setForceOpen(false)
      onDone(messages[action])
    } catch (e) {
      onError('恢复操作被拒绝：' + e.message)
    } finally {
      onBusy(false)
    }
  }

  return h('div', {
    key: row.executionId,
    className: 'concerto-set-item concerto-set-recovery',
    'data-concerto-recovery-exec': row.executionId,
  },
  h('div', { className: 'concerto-set-item-head' },
    h('div', { className: 'concerto-set-item-title' },
      h('strong', null, `${row.taskTitle || row.taskId}`),
      h('span', { className: 'concerto-badge concerto-id' }, row.executionId),
      row.memberId && h('span', { className: 'concerto-chip' }, row.memberId),
      row.connectorId && h('span', { className: 'concerto-tag' }, row.connectorId),
      isCrossRestart && h('span', { className: 'concerto-state-chip concerto-state-attention' }, '跨重启孤儿'),
      row.deliveryAccepted && h('span', { className: 'concerto-tag' }, '已接收交付'),
      row.quarantined && h('span', { className: 'concerto-tag' }, '原工作区已隔离保留')),
    h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: onReconcile }, '核对后端状态')),
  h('div', { className: 'concerto-set-meta' },
    h('span', null, `团队运行：${row.teamName || row.teamSessionId} (${row.teamSessionId})`),
    h('span', null, `原指挥会话：${row.originalCommanderSessionAlive ? '在线' : '未加载（重启/关闭后不阻断恢复）'}`)),
  row.writeScope && h('div', { className: 'concerto-set-meta' },
    h('span', { className: 'concerto-set-path' }, `占用工作目录：${row.writeScope}${row.sandbox ? ` · 沙盒：${row.sandbox}` : ''}`)),
  row.retryCwd && h('div', { className: 'concerto-set-meta' },
    h('span', { className: 'concerto-set-path' }, `隔离新目录：${row.retryCwd}`)),
  row.unknownReason && h('div', { className: 'concerto-set-reason' }, `阻塞原因：${row.unknownReason}`),
  recResult && h('div', {
    role: 'status',
    className: 'concerto-set-result',
    'data-ok': recResult.confirmedStopped ? 'true' : 'false',
  }, `核对结论：${recResult.confirmedStopped ? '已取得后端停止证据' : '未确认后端停止（不可释放原工作区）'} · ${recResult.reason || ''}`),
  row.recoverableDelivery && h(DeliveryRecoveryNote, { delivery: row.recoverableDelivery }),
  !row.quarantined && h('label', { className: 'concerto-set-check' },
    h('input', { type: 'checkbox', checked: reviewed, disabled: busy, onChange: (e) => setReviewed(e.target.checked) }),
    h('span', null, '已核查外部副作用（隔离新目录恢复必填；适用于外部连接器受限沙盒及 Hosted 非危险成员）')),
  h('div', { className: 'concerto-set-actions-buttons' },
    h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost',
      disabled: busy,
      onClick: () => onAdjudicate('confirm_failed'),
    }, '确认已停止并释放'),
    row.recoverableDelivery && h('button', {
      type: 'button',
      className: 'concerto-btn',
      disabled: busy,
      onClick: () => onAdjudicate('accept'),
    }, '接收已验证交付'),
    !row.quarantined && h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--primary',
      disabled: busy || !reviewed,
      onClick: () => onAdjudicate('retry_isolated'),
    }, '隔离目录恢复'),
    h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--danger',
      'data-concerto-force-release': row.executionId,
      disabled: busy,
      onClick: () => setForceOpen(true),
    }, '强制解除目录占用…')),
  forceOpen && h(ForceReleaseDialog, {
    row,
    busy,
    onClose: () => { if (!busy) setForceOpen(false) },
    onConfirm: () => onAdjudicate('force_release'),
  }))
}

export function DispatchLimitFields({ limits, disabled = false }) {
  const id = React.useId()
  return h('div', null,
    h('p', { id, className: 'concerto-field-hint' }, '按任务计算，留空时不限。执行次数包含首次执行。'),
    h('div', { className: 'concerto-set-grid' },
      [
        ['maxAttempts', '单任务执行上限', 1],
        ['maxReworks', '单任务返工上限', 0],
      ].map(([name, label, min]) => h('div', { key: name, className: 'concerto-field' },
        h('label', { htmlFor: `${id}-${name}` }, label),
        h('input', {
          id: `${id}-${name}`, name, type: 'number', min, max: Number.MAX_SAFE_INTEGER, step: 1,
          defaultValue: limits?.[name] ?? '', disabled, className: 'concerto-input',
          'aria-describedby': id,
        })))))
}

export function readDispatchLimitsForm(form) {
  const data = new FormData(form)
  const maxAttempts = data.get('maxAttempts')
  const maxReworks = data.get('maxReworks')
  return { maxAttempts: maxAttempts ? Number(maxAttempts) : null, maxReworks: maxReworks ? Number(maxReworks) : null }
}

const CONNECTION_MESSAGES = {
  connector_missing: '连接器未注册',
  connector_unavailable: '连接器握手失败',
  version_mismatch: '连接器握手协议不兼容',
  model_config_missing: '请填写 provider 和 model',
  provider_missing: 'DSH 未注册此 provider',
  model_missing: 'DSH 模型目录没有此 model',
  host_catalog_unavailable: '暂时无法检查 DSH 模型目录',
}

function ConnectionCheck({ label, member, disabled }) {
  const [check, setCheck] = React.useState(null)
  const key = JSON.stringify(member)
  async function runCheck() {
    setCheck({ key, pending: true, message: `${label}检测中…` })
    try {
      const result = await request('/connection/check', { method: 'POST', body: JSON.stringify({ member }) })
      const summary = result.state === 'reachable' ? '握手成功'
        : result.state === 'configured' ? '模型已登记，实际调用待验证'
        : CONNECTION_MESSAGES[result.reason] || '无法确认连接'
      const detail = result.version || result.detail
      setCheck({ key, message: `${label}：${detail ? `${summary} · ${detail}` : summary}` })
    } catch (error) {
      setCheck({ key, message: `${label}检测失败：${error.message}` })
    }
  }
  return h('div', { className: 'concerto-set-connection' },
    h('button', {
      type: 'button', className: 'concerto-btn', disabled: disabled || check?.pending,
      'aria-label': `检测连接：${label}`, onClick: runCheck,
    }, '检测连接'),
    h('span', { className: 'concerto-field-hint', role: 'status', 'aria-atomic': 'true' }, check?.key === key ? check.message : ''))
}

function requiredViewRef(view) {
  return typeof view === 'string' ? view : `${view.type}:${view.id}`
}

function TeamDeleteDialog({ team, onClose, onConfirm }) {
  const descriptionId = React.useId()
  return h(InspectorDialog, {
    title: `删除团队 ${team.name}`, onClose, className: 'concerto-team-delete-dialog',
    dialogProps: { 'aria-describedby': descriptionId },
  }, h('div', { className: 'concerto-drawer-body' },
    h('h3', null, `删除团队「${team.name}」？`),
    h('p', { id: descriptionId }, '运行历史仍可查看。点击「重载团队」后应用预设变更。'),
    h('div', { className: 'concerto-set-actions-buttons' },
      h('button', { type: 'button', className: 'concerto-btn', autoFocus: true, onClick: onClose }, '取消'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--danger', onClick: onConfirm }, '确认删除'))))
}

export function ConcertoPanel() {
  useTeamCss()
  const hostTheme = useHostTheme()
  const [teams, setTeams] = React.useState([])
  const [connectors, setConnectors] = React.useState([])
  const [llmProviders, setLlmProviders] = React.useState([])
  const [runs, setRuns] = React.useState([])
  const [projects, setProjects] = React.useState([])
  const [projectId, setProjectId] = React.useState('')
  const [continuationTeamId, setContinuationTeamId] = React.useState('')
  const [unknowns, setUnknowns] = React.useState([])
  const [editing, setEditing] = React.useState(null)
  const [deleteTarget, setDeleteTarget] = React.useState(null)
  const [draftRevision, setDraftRevision] = React.useState(0)
  const [name, setName] = React.useState('My Team')
  const [description, setDescription] = React.useState('')
  const [commanderSource, setCommanderSource] = React.useState('hosted')
  const [provider, setProvider] = React.useState('x-ds')
  const [model, setModel] = React.useState('deepseek-v4.1-flash')
  const [commanderBaseUrl, setCommanderBaseUrl] = React.useState('')
  const [commanderApiKey, setCommanderApiKey] = React.useState('')
  const [commanderConnector, setCommanderConnector] = React.useState('antigravity')
  const [requiredViewsInput, setRequiredViewsInput] = React.useState('')
  const [launchCwd, setLaunchCwd] = React.useState('')
  const [membersDraft, setMembersDraft] = React.useState([])
  const [selectedStageNode, setSelectedStageNode] = React.useState(null)
  const [hash, setHash] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const nameInput = React.useRef(null)
  const focusName = React.useRef(false)
  const unnamedTeamId = React.useRef(null)
  const pendingWrite = React.useRef(null)

  const refresh = React.useCallback(async () => {
    try {
      const [teamsRes, runsRes, unkRes, connRes, llmRes] = await Promise.allSettled([
        request('/teams'),
        fetchRuns(),
        fetchUnknownExecutions(),
        request('/connectors'),
        request('/llm/catalog'),
      ])
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value?.teams ?? [])
      else setStatus('读取团队失败：' + teamsRes.reason?.message)
      if (runsRes.status === 'fulfilled') {
        setRuns(runsRes.value?.runs ?? [])
        setProjects(runsRes.value?.projects ?? [])
      } else if (teamsRes.status === 'fulfilled') setStatus('读取项目和运行失败：' + runsRes.reason?.message)
      if (unkRes.status === 'fulfilled') setUnknowns(unkRes.value?.runs ?? [])
      if (connRes.status === 'fulfilled' && Array.isArray(connRes.value?.connectors)) {
        setConnectors(connRes.value.connectors)
        // 后台异步探测本机已安装连接器，自动在下拉框和舞台角标展示「已就绪 / 未安装」
        request('/connectors?probe=1').then((probed) => {
          if (Array.isArray(probed?.connectors)) setConnectors(probed.connectors)
        }).catch(() => {})
      }
      if (llmRes.status === 'fulfilled' && Array.isArray(llmRes.value?.providers)) {
        setLlmProviders(llmRes.value.providers)
      }
    } catch (e) {
      setStatus('读取失败：' + e.message)
    }
  }, [])

  React.useEffect(() => { refresh() }, [refresh])
  React.useEffect(() => {
    if (!busy && focusName.current) {
      focusName.current = false
      nameInput.current?.focus()
    }
  }, [busy, draftRevision])

  function loadDraft(record) {
    const team = record?.team
    const cmd = team?.commander
    setEditing(record)
    setName(team?.name ?? 'My Team')
    setDescription(team?.description ?? '')
    setCommanderSource(cmd?.source || 'hosted')
    setProvider(cmd ? cmd.provider ?? '' : 'x-ds')
    setModel(cmd ? cmd.model ?? '' : 'deepseek-v4.1-flash')
    setCommanderBaseUrl(cmd?.baseUrl ?? '')
    setCommanderApiKey(cmd?.apiKey ?? '')
    setCommanderConnector(cmd?.connector || connectors[0]?.id || 'antigravity')
    setMembersDraft(team?.members ?? [])
    setSelectedStageNode(null)
    setRequiredViewsInput((team?.requiredViews ?? []).map(requiredViewRef).join(', '))
    setDraftRevision((version) => version + 1)
    unnamedTeamId.current = null
    pendingWrite.current = null
  }

  async function onEditTeam(teamId) {
    setBusy(true)
    setStatus('读取团队配置中…')
    try {
      const params = new URLSearchParams({ teamId })
      const record = await request(`/teams?${params}`)
      focusName.current = true
      loadDraft(record)
      setStatus('')
    } catch (error) {
      setStatus('读取团队配置失败：' + error.message)
    } finally {
      setBusy(false)
    }
  }

  async function writeTeam(method, payload) {
    const key = JSON.stringify([method, payload])
    if (pendingWrite.current?.key !== key) pendingWrite.current = { key, id: crypto.randomUUID() }
    const response = await request('/teams', {
      method, body: JSON.stringify({ ...payload, requestId: pendingWrite.current.id }),
    })
    pendingWrite.current = null
    return response
  }

  function showWriteResult(result, message) {
    setHash(result.generatedHash || result.expectedHash || '')
    if (result.generationError?.length) {
      const detail = result.generationError.map((error) => error.detail || error.code).join('；')
      setStatus(`${message}，预设生成失败：${detail}${result.expectedHash ? '。可点击「重载团队」重试。' : ''}`)
    } else {
      setStatus(result.generatedHash ? `${message}，点击「重载团队」应用预设变更` : message)
    }
  }

  async function onWriteError(error, message) {
    if (error.status === 409 || error.status === 404) {
      setStatus(`${message}：团队配置已变化。草稿已保留，请从列表重新读取最新配置。`)
      await refresh()
    } else {
      setStatus(`${message}：${error.message}`)
    }
  }

  React.useEffect(() => {
    if (!selectedStageNode) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedStageNode(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedStageNode])

  function applyStageTemplate(kind) {
    const readyExternal = connectors.find((c) => c.protocol !== 'web' && c.probe?.ok)?.id || connectors[0]?.id || 'antigravity'
    if (kind === 'solo') {
      setName((cur) => (cur && cur !== 'My Team' ? cur : 'Solo Strike'))
      setMembersDraft([
        { id: 'worker-1', source: 'external', connector: readyExternal, roleKind: 'worker', toolProfile: 'coding', provider, model },
      ])
      setSelectedStageNode('member:0')
    } else if (kind === 'duo') {
      setName((cur) => (cur && cur !== 'My Team' ? cur : 'Dual Core Team'))
      setMembersDraft([
        { id: 'worker-1', source: 'hosted', connector: readyExternal, roleKind: 'worker', toolProfile: 'coding', provider, model },
        { id: 'worker-2', source: 'external', connector: readyExternal, roleKind: 'worker', toolProfile: 'coding', provider, model },
        { id: 'reviewer-1', source: 'hosted', connector: readyExternal, roleKind: 'reviewer', toolProfile: 'readonly', provider, model },
      ])
      setSelectedStageNode('commander')
    } else if (kind === 'hetero') {
      setName((cur) => (cur && cur !== 'My Team' ? cur : 'Heterogeneous Orchestra'))
      setMembersDraft([
        { id: 'worker-agy', source: 'external', connector: 'antigravity', roleKind: 'worker', toolProfile: 'coding', provider, model },
        { id: 'worker-claude', source: 'external', connector: 'claude', roleKind: 'worker', toolProfile: 'coding', provider, model },
        { id: 'reviewer-1', source: 'hosted', connector: readyExternal, roleKind: 'reviewer', toolProfile: 'readonly', provider, model },
      ])
      setSelectedStageNode('commander')
    }
  }

  function addMemberDraft(roleKind = 'worker') {
    const prefix = roleKind === 'reviewer' ? 'reviewer' : 'worker'
    const ids = new Set(membersDraft.map((member) => member.id))
    let idx = membersDraft.filter((m) => m.roleKind === roleKind).length + 1
    while (ids.has(`${prefix}-${idx}`)) idx++
    const defaultConnector = connectors[0]?.id || 'antigravity'
    const nextIdx = membersDraft.length
    setMembersDraft([
      ...membersDraft,
      {
        id: `${prefix}-${idx}`,
        source: 'hosted',
        connector: defaultConnector,
        roleKind,
        toolProfile: roleKind === 'reviewer' ? 'readonly' : 'coding',
        provider,
        model,
      },
    ])
    setSelectedStageNode(`member:${nextIdx}`)
  }

  function updateMemberDraft(index, patch) {
    setMembersDraft(membersDraft.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function removeMemberDraft(index) {
    setMembersDraft(membersDraft.filter((_, i) => i !== index))
    setSelectedStageNode(null)
  }

  function cloneMemberDraft(index) {
    const src = membersDraft[index]
    if (!src) return
    const prefix = src.roleKind === 'reviewer' ? 'reviewer' : 'worker'
    const ids = new Set(membersDraft.map((m) => m.id))
    let n = membersDraft.filter((m) => m.roleKind === src.roleKind).length + 1
    while (ids.has(`${prefix}-${n}`)) n++
    const copy = { ...src, id: `${prefix}-${n}` }
    const next = [...membersDraft]
    next.splice(index + 1, 0, copy)
    setMembersDraft(next)
    setSelectedStageNode(`member:${index + 1}`)
  }

  async function onSave(event) {
    event.preventDefault()
    const dispatchLimits = readDispatchLimitsForm(event.currentTarget)
    setBusy(true)
    setStatus('保存中…')
    try {
      const previous = editing?.team
      const draftId = toTeamId(name).slice(0, 64).replace(/-$/, '')
      const teamId = previous?.id || draftId || (unnamedTeamId.current ??= `team-${crypto.randomUUID()}`)
      const savedViews = new Map((previous?.requiredViews ?? []).map((view) => [requiredViewRef(view), view]))
      const parsedRequiredViews = requiredViewsInput
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((ref) => savedViews.get(ref) ?? ref)
      const normalizedMembers = membersDraft
        .filter((m) => typeof m.id === 'string' && m.id.trim() !== '')
        .map(({ provider: workerProvider, model: workerModel, connector, toolProfile, baseUrl, apiKey, ...member }) => ({
          ...member, id: member.id.trim(),
          ...(member.source === 'hosted'
            ? { provider: workerProvider?.trim() || undefined, model: workerModel?.trim() || undefined, toolProfile }
            : (member.source === 'api'
              ? { baseUrl: (baseUrl || '').trim(), apiKey: (apiKey || '').trim() || undefined, model: (workerModel || '').trim() }
              : { connector: (connector || 'antigravity').trim() })),
        }))
      const commanderConfig = commanderSource === 'api'
        ? {
            id: previous?.commander?.id || 'commander',
            source: 'api',
            baseUrl: commanderBaseUrl.trim(),
            apiKey: commanderApiKey.trim() || undefined,
            model: model.trim(),
          }
        : (commanderSource === 'external'
          ? {
              id: previous?.commander?.id || 'commander',
              source: 'external',
              connector: (commanderConnector || connectors[0]?.id || 'antigravity').trim(),
            }
          : {
              id: 'commander', ...previous?.commander,
              source: 'hosted',
              provider: provider.trim() || undefined, model: model.trim() || undefined,
            })
      const team = {
        ...previous, id: teamId, name: name.trim(), description: description.trim() || undefined,
        commander: commanderConfig,
        members: normalizedMembers,
        requiredViews: parsedRequiredViews.length > 0 ? parsedRequiredViews : undefined,
        dispatchLimits: dispatchLimits.maxAttempts !== null || dispatchLimits.maxReworks !== null ? dispatchLimits : undefined,
      }
      const body = await writeTeam('POST', { team, expectedConfigVersion: editing?.configVersion ?? 0 })
      loadDraft({ team, configVersion: body.configVersion })
      showWriteResult(body, `已保存 ${team.name} v${body.configVersion}`)
      await refresh()
    } catch (error) {
      await onWriteError(error, '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteTeam(target) {
    setDeleteTarget(null)
    setBusy(true)
    setStatus('删除团队配置中…')
    try {
      const body = await writeTeam('DELETE', { teamId: target.id, expectedConfigVersion: target.configVersion })
      if (editing?.team.id === target.id) loadDraft(null)
      showWriteResult(body, `已删除团队配置 ${target.name}`)
      await refresh()
      focusName.current = true
    } catch (error) {
      await onWriteError(error, '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function onReload() {
    if (!hash) { setStatus('先保存，再重载'); return }
    setBusy(true)
    setStatus('重载中…')
    try {
      const body = await request('/teams/reload', {
        method: 'POST',
        body: JSON.stringify({ expectedHash: hash }),
      })
      setStatus('重载结果：' + body.application)
      await refresh()
    } catch (e) {
      setStatus('重载失败：' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onLaunchTeam(teamId, selectedProjectId) {
    setBusy(true)
    setStatus(selectedProjectId ? '正在打开项目…' : '正在启动新项目…')
    try {
      const launched = await launchTeamSession({
        teamId,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        ...(launchCwd.trim() ? { cwd: launchCwd.trim() } : {}),
      })
      const opened = await openHostSession(launched.sessionId, {
        teamSessionId: launched.teamSessionId,
        openTeamTab: true,
      })
      setStatus(opened.navigated
        ? `已打开团队会话 ${launched.sessionId}（工作目录：${launched.cwd || '默认工作区'}）`
        : `团队会话 ${launched.sessionId}（运行 ${launched.teamSessionId}）可从侧栏工作区打开`)
      await refresh()
    } catch (e) {
      setStatus('启动团队会话失败：' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onOpenRun(run) {
    if (!run?.commanderSessionId) {
      setStatus('该运行缺少关联的桌面会话 ID')
      return
    }
    setBusy(true)
    try {
      const opened = await openHostSession(run.commanderSessionId, {
        teamSessionId: run.teamSessionId,
        openTeamTab: true,
      })
      setStatus(opened.navigated
        ? `已切换到团队会话 ${run.commanderSessionId}`
        : `已确保工作区关联会话 ${run.commanderSessionId}（live=${opened.live}），请从侧栏查看`)
      await refresh()
    } catch (e) {
      setStatus('定位会话失败：' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const pendingUnknowns = unknowns.filter((r) => !r.quarantined)
  const quarantinedUnknowns = unknowns.filter((r) => r.quarantined)
  const recoveryRow = (row) => h(RecoveryExecutionRow, {
    key: row.executionId,
    row,
    busy,
    onBusy: setBusy,
    onDone: async (msg) => { setStatus(msg); await refresh() },
    onError: setStatus,
  })
  const statusTone = /失败|被拒绝|错误|缺少/.test(status) ? 'error' : (/中…$/.test(status) ? 'busy' : 'info')
  const visibleRuns = runs.slice().reverse().slice(0, 8)
  const selectedProject = projects.find((project) => project.projectId === projectId)
  const needsTeam = selectedProject?.completed && !teams.some((team) => team.id === selectedProject.teamId)
  const teamForContinuation = needsTeam ? teams.find((team) => team.id === continuationTeamId)?.id : selectedProject?.teamId

  return h('div', {
    className: 'concerto-surface concerto-settings',
    'data-concerto-theme': hostTheme.colorScheme,
    style: hostTheme.cssVars || undefined,
  },
  h('header', { className: 'concerto-set-head' },
    h('div', { className: 'concerto-set-head-main' },
      h('h2', null, 'Concerto 团队'),
      h('p', { className: 'concerto-set-lead' }, '配置指挥者与成员，保存后重载使其生效，再从下方启动桌面会话。')),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: busy, onClick: refresh },
      h(UiIcon, { name: 'refresh' }), '刷新状态')),

  deleteTarget && h(TeamDeleteDialog, {
    team: deleteTarget, onClose: () => setDeleteTarget(null), onConfirm: () => onDeleteTeam(deleteTarget),
  }),

  status !== '' && h('div', { className: 'concerto-set-status', role: 'status', 'data-tone': statusTone },
    h('span', null, status),
    h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost concerto-btn--icon', 'aria-label': '关闭提示', onClick: () => setStatus('') },
      h(UiIcon, { name: 'close' }))),

  // ① 乐团编排舞台（新建 / 编辑团队）
  h(SettingsSection, { as: 'form', onSubmit: onSave, method: 'post', action: '/concerto/teams',
    title: editing ? '编辑团队' : '新建团队',
    hint: editing ? `配置版本 v${editing.configVersion} · ${editing.team.id}` : '点击小精灵展开配置，点击「+」添加执行者或审查者。' },
    (() => {
      const connectorOptions = connectors.length > 0
        ? connectors
        : [
            { id: 'antigravity', displayName: 'Antigravity (agy)', protocol: 'acp' },
            { id: 'claude', displayName: 'Claude Code', protocol: 'stream-json' },
            { id: 'codex', displayName: 'Codex', protocol: 'native' },
            { id: 'gemini', displayName: 'Gemini CLI', protocol: 'acp' },
            { id: 'opencode', displayName: 'OpenCode', protocol: 'acp' },
          ]
      const formatConnOption = (c) => {
        const proto = c.protocol && c.protocol !== 'native' ? ` (${c.protocol.toUpperCase()})` : ''
        const badge = c.probe ? (c.probe.ok ? ' · ✓ 已就绪' : ' · ○ 未安装') : ''
        return `${c.displayName || c.id}${proto}${badge}`
      }
      const connStatusMark = (id) => {
        const c = connectorOptions.find((x) => x.id === id)
        if (!c?.probe) return ''
        return c.probe.ok ? ' ✓' : ' ○'
      }
      const commanderPreview = {
        id: 'commander',
        roleKind: 'commander',
        source: commanderSource,
        connector: commanderSource === 'external' ? (commanderConnector || connectorOptions[0]?.id || 'antigravity') : null,
      }
      const commanderSub = commanderSource === 'api'
        ? `API · ${model || '未填模型'}`
        : (commanderSource === 'external'
          ? `${connectorOptions.find((c) => c.id === commanderConnector)?.displayName || commanderConnector || '外部 Agent'}${connStatusMark(commanderConnector)}`
          : (model || provider || 'DSH 托管'))
      const workerEntries = membersDraft.map((m, idx) => ({ m, idx })).filter(({ m }) => m.roleKind !== 'reviewer')
      const reviewerEntries = membersDraft.map((m, idx) => ({ m, idx })).filter(({ m }) => m.roleKind === 'reviewer')
      const selectedMemberIdx = typeof selectedStageNode === 'string' && selectedStageNode.startsWith('member:')
        ? Number(selectedStageNode.slice(7))
        : -1
      const selectedMember = selectedMemberIdx >= 0 ? membersDraft[selectedMemberIdx] : null
      const memberSub = (m) => (m.source === 'hosted'
        ? (m.model || m.provider || 'DSH 托管')
        : (m.source === 'api'
          ? `API · ${m.model || '未填模型'}`
          : `${connectorOptions.find((c) => c.id === m.connector)?.displayName || m.connector || '外部'}${connStatusMark(m.connector)}`))

      const toggleNode = (key) => setSelectedStageNode((cur) => (cur === key ? null : key))

      return h(React.Fragment, null,
        // 一键预设编排模板条
        !editing && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }, 'data-concerto-stage-templates': 'true' },
          h('span', { className: 'concerto-field-hint' }, '一键模板：'),
          h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: () => applyStageTemplate('solo') }, '⚡ 单兵突击（1+1）'),
          h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: () => applyStageTemplate('duo') }, '🎸 双核开发（1+2+1审）'),
          h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: () => applyStageTemplate('hetero') }, '🌐 异构联军（Agy + Claude）')),
        h('div', { className: 'concerto-stage', 'data-concerto-orchestra-stage': 'true' },
          // 最顶部：可替换团队名
          h('div', { className: 'concerto-stage-title-wrap' },
            h('input', {
              ref: nameInput,
              required: true,
              disabled: busy,
              'aria-label': '团队名',
              className: 'concerto-stage-title-input',
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: '输入团队名',
            }),
            h('span', { className: 'concerto-stage-title-pen', 'aria-hidden': true }, '✎')),

          // 居中：指挥者小精灵
          h('div', { className: 'concerto-stage-commander-zone' },
            h('button', {
              type: 'button',
              className: 'concerto-stage-node concerto-stage-node--commander',
              'data-selected': selectedStageNode === 'commander' ? 'true' : undefined,
              'aria-expanded': selectedStageNode === 'commander',
              onClick: () => toggleNode('commander'),
            },
              h(MemberGlyph, { member: commanderPreview, state: selectedStageNode === 'commander' ? '协调' : 'idle', size: 64 }),
              h('span', { className: 'concerto-stage-node-name' }, '指挥者 · Commander'),
              h('span', { className: 'concerto-stage-node-sub' }, commanderSub))),

          // 发光弧形连线（指挥者 → 左下执行者 / 右下审查者）
          h('svg', { className: 'concerto-stage-svg', viewBox: '0 0 400 52', preserveAspectRatio: 'none', 'aria-hidden': true },
            h('path', {
              className: 'concerto-stage-arc',
              'data-active': (selectedStageNode === 'commander' || (selectedMember && selectedMember.roleKind !== 'reviewer')) ? 'true' : undefined,
              d: 'M 200 2 C 200 28, 100 22, 100 50',
            }),
            h('path', {
              className: 'concerto-stage-arc',
              'data-active': (selectedStageNode === 'commander' || (selectedMember && selectedMember.roleKind === 'reviewer')) ? 'true' : undefined,
              d: 'M 200 2 C 200 28, 300 22, 300 50',
            })),

          // 左下 Worker / 右下 Reviewer 双区
          h('div', { className: 'concerto-stage-lanes' },
            // 左下：执行者 Worker
            h('div', { className: 'concerto-stage-lane', 'data-stage-lane': 'worker' },
              h('div', { className: 'concerto-stage-lane-head' },
                h('span', null, '执行者 · Worker'),
                h('span', { className: 'concerto-count-pill concerto-num' }, String(workerEntries.length))),
              h('div', { className: 'concerto-stage-roster' },
                workerEntries.map(({ m, idx }) => h('button', {
                  key: idx,
                  type: 'button',
                  className: 'concerto-stage-node',
                  'data-selected': selectedStageNode === `member:${idx}` ? 'true' : undefined,
                  'aria-expanded': selectedStageNode === `member:${idx}`,
                  onClick: () => toggleNode(`member:${idx}`),
                },
                  h(MemberGlyph, { member: m, state: selectedStageNode === `member:${idx}` ? 'running' : 'idle', size: 46 }),
                  h('span', { className: 'concerto-stage-node-name' }, m.id || `worker-${idx + 1}`),
                  h('span', { className: 'concerto-stage-node-sub' }, memberSub(m)))),
                h('button', {
                  type: 'button',
                  className: 'concerto-stage-add',
                  disabled: busy,
                  onClick: () => addMemberDraft('worker'),
                },
                  h('span', { className: 'concerto-stage-add-plus', 'aria-hidden': true }, '+'),
                  h('span', null, '添加执行者')))),

            // 右下：审查者 Reviewer
            h('div', { className: 'concerto-stage-lane', 'data-stage-lane': 'reviewer' },
              h('div', { className: 'concerto-stage-lane-head' },
                h('span', null, '审查者 · Reviewer'),
                h('span', { className: 'concerto-count-pill concerto-num' }, String(reviewerEntries.length))),
              h('div', { className: 'concerto-stage-roster' },
                reviewerEntries.map(({ m, idx }) => h('button', {
                  key: idx,
                  type: 'button',
                  className: 'concerto-stage-node',
                  'data-selected': selectedStageNode === `member:${idx}` ? 'true' : undefined,
                  'aria-expanded': selectedStageNode === `member:${idx}`,
                  onClick: () => toggleNode(`member:${idx}`),
                },
                  h(MemberGlyph, { member: m, state: selectedStageNode === `member:${idx}` ? 'review' : 'idle', size: 46 }),
                  h('span', { className: 'concerto-stage-node-name' }, m.id || `reviewer-${idx + 1}`),
                  h('span', { className: 'concerto-stage-node-sub' }, memberSub(m)))),
                h('button', {
                  type: 'button',
                  className: 'concerto-stage-add',
                  disabled: busy,
                  onClick: () => addMemberDraft('reviewer'),
                },
                  h('span', { className: 'concerto-stage-add-plus', 'aria-hidden': true }, '+'),
                  h('span', null, '添加审查者')))))),

        // 点击小精灵后平滑展开的配置面板：指挥者
        selectedStageNode === 'commander' && h('div', { key: 'insp-commander', className: 'concerto-stage-inspector' },
          h('div', { className: 'concerto-stage-inspector-head' },
            h('div', { className: 'concerto-stage-inspector-title' },
              h(MemberGlyph, { member: commanderPreview, state: '协调', size: 28 }),
              h('span', null, '指挥者配置')),
            h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost concerto-btn--icon', 'aria-label': '收起配置', onClick: () => setSelectedStageNode(null) },
              h(UiIcon, { name: 'close' }))),
          h('div', { className: 'concerto-set-grid' },
            h(SettingsField, { label: '指挥者来源' },
              h('select', {
                disabled: busy,
                className: 'concerto-input',
                value: commanderSource,
                onChange: (e) => setCommanderSource(e.target.value),
              },
                h('option', { value: 'hosted' }, 'DSH 托管模型'),
                h('option', { value: 'api' }, '自定义 API（OpenAI 兼容）'),
                h('option', { value: 'external' }, '外部 Agent（Connector）'))),
            commanderSource === 'hosted' && h(ProviderModelFields, {
              disabled: busy,
              providers: llmProviders,
              provider,
              model,
              providerLabel: '指挥者 provider',
              modelLabel: '指挥者 model',
              onChangeProvider: setProvider,
              onChangeModel: setModel,
            }),
            commanderSource === 'api' && h(ApiEndpointFields, {
              disabled: busy,
              baseUrl: commanderBaseUrl,
              apiKey: commanderApiKey,
              model,
              onChangeBaseUrl: setCommanderBaseUrl,
              onChangeApiKey: setCommanderApiKey,
              onChangeModel: setModel,
            }),
            commanderSource === 'external' && h(SettingsField, { label: '指挥者 Connector' },
              (() => {
                const currentVal = commanderConnector || connectorOptions[0]?.id || 'antigravity'
                const hasCurrent = connectorOptions.some((c) => c.id === currentVal)
                return h('select', {
                  disabled: busy,
                  className: 'concerto-input concerto-id',
                  value: currentVal,
                  onChange: (e) => setCommanderConnector(e.target.value),
                },
                  connectorOptions.map((c) => h('option', { key: c.id, value: c.id }, formatConnOption(c))),
                  !hasCurrent && h('option', { value: currentVal }, `${currentVal} (自定义)`))
              })())),
          h(ConnectionCheck, {
            label: '指挥者',
            member: commanderSource === 'api'
              ? { source: 'api', baseUrl: commanderBaseUrl, apiKey: commanderApiKey, model }
              : (commanderSource === 'external'
                ? { source: 'external', connector: commanderConnector || connectorOptions[0]?.id || 'antigravity' }
                : { source: 'hosted', provider, model }),
            disabled: busy,
          })),

        // 点击小精灵后平滑展开的配置面板：执行者 / 审查者
        selectedMember && h('div', { key: `insp-member-${selectedMemberIdx}`, className: 'concerto-stage-inspector' },
          h('div', { className: 'concerto-stage-inspector-head' },
            h('div', { className: 'concerto-stage-inspector-title' },
              h(MemberGlyph, { member: selectedMember, state: 'idle', size: 28 }),
              h('span', null, `${selectedMember.id || '成员'} · ${selectedMember.roleKind === 'reviewer' ? '审查者配置' : '执行者配置'}`)),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              h('button', {
                type: 'button',
                className: 'concerto-btn',
                disabled: busy,
                onClick: () => cloneMemberDraft(selectedMemberIdx),
              }, '复制成员'),
              h('button', {
                type: 'button',
                className: 'concerto-btn concerto-btn--danger',
                disabled: busy,
                'aria-label': `移除成员 ${selectedMember.id || selectedMemberIdx + 1}`,
                onClick: () => removeMemberDraft(selectedMemberIdx),
              }, '移除'),
              h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost concerto-btn--icon', 'aria-label': '收起配置', onClick: () => setSelectedStageNode(null) },
                h(UiIcon, { name: 'close' })))),
          h('div', { className: 'concerto-set-grid' },
            h(SettingsField, { label: '成员 ID' },
              h('input', { disabled: busy, className: 'concerto-input concerto-id', value: selectedMember.id, placeholder: 'worker-1', onChange: (e) => updateMemberDraft(selectedMemberIdx, { id: e.target.value }) })),
            h(SettingsField, { label: '来源' },
              h('select', { disabled: busy, className: 'concerto-input', value: selectedMember.source, onChange: (e) => updateMemberDraft(selectedMemberIdx, { source: e.target.value }) },
                h('option', { value: 'hosted' }, 'DSH Hosted'),
                h('option', { value: 'api' }, '自定义 API（OpenAI 兼容）'),
                h('option', { value: 'external' }, 'External Connector'),
                h('option', { value: 'web' }, 'Web Connector（网页版 Agent）'))),
            h(SettingsField, { label: '角色' },
              h('select', { disabled: busy, className: 'concerto-input', value: selectedMember.roleKind, onChange: (e) => updateMemberDraft(selectedMemberIdx, { roleKind: e.target.value }) },
                h('option', { value: 'worker' }, '执行者 worker'),
                h('option', { value: 'reviewer' }, '审查者 reviewer'))),
            selectedMember.source === 'hosted'
              ? h(SettingsField, { label: '工具权限' },
                  h('select', { disabled: busy, className: 'concerto-input', value: selectedMember.toolProfile ?? (selectedMember.roleKind === 'reviewer' ? 'readonly' : 'coding'), onChange: (e) => updateMemberDraft(selectedMemberIdx, { toolProfile: e.target.value }) },
                    h('option', { value: 'coding' }, '编码+Shell (coding)'),
                    h('option', { value: 'readonly' }, '只读文件 (readonly)'),
                    h('option', { value: 'none' }, '仅协调 (none)')))
              : (selectedMember.source === 'api'
                ? h(ApiEndpointFields, {
                    disabled: busy,
                    baseUrl: selectedMember.baseUrl ?? '',
                    apiKey: selectedMember.apiKey ?? '',
                    model: selectedMember.model ?? '',
                    onChangeBaseUrl: (val) => updateMemberDraft(selectedMemberIdx, { baseUrl: val }),
                    onChangeApiKey: (val) => updateMemberDraft(selectedMemberIdx, { apiKey: val }),
                    onChangeModel: (val) => updateMemberDraft(selectedMemberIdx, { model: val }),
                  })
                : h(SettingsField, { label: 'Connector' },
                    (() => {
                      const filtered = selectedMember.source === 'web'
                        ? connectorOptions.filter((c) => c.protocol === 'web' || String(c.id).startsWith('web-'))
                        : connectorOptions.filter((c) => c.protocol !== 'web' && !String(c.id).startsWith('web-'))
                      const list = filtered.length > 0 ? filtered : connectorOptions
                      const currentVal = selectedMember.connector || list[0]?.id || (selectedMember.source === 'web' ? 'web-chatgpt' : 'antigravity')
                      const hasCurrent = list.some((c) => c.id === currentVal)
                      return h('select', {
                        disabled: busy,
                        className: 'concerto-input concerto-id',
                        value: currentVal,
                        onChange: (e) => updateMemberDraft(selectedMemberIdx, { connector: e.target.value }),
                      },
                        list.map((c) => h('option', { key: c.id, value: c.id }, formatConnOption(c))),
                        !hasCurrent && h('option', { value: currentVal }, `${currentVal} (自定义)`))
                    })())),
            selectedMember.source === 'hosted' && h(ProviderModelFields, {
              disabled: busy,
              providers: llmProviders,
              provider: selectedMember.provider ?? '',
              model: selectedMember.model ?? '',
              providerLabel: '成员 provider',
              modelLabel: '成员 model',
              allowEmpty: true,
              onChangeProvider: (val) => updateMemberDraft(selectedMemberIdx, { provider: val }),
              onChangeModel: (val) => updateMemberDraft(selectedMemberIdx, { model: val }),
            })),
          h(SettingsField, { label: '专长 / 人设（供指挥者智能分工）' },
            h('input', {
              disabled: busy,
              className: 'concerto-input',
              value: selectedMember.persona ?? '',
              placeholder: '例如：前端 UI 专家、严格单测审查员、只负责文档整理',
              onChange: (e) => updateMemberDraft(selectedMemberIdx, { persona: e.target.value }),
            }),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 } },
              ['前端 UI 专家', '后端逻辑开发', '严格测试验收', '架构与代码审查', '文档与总结'].map((tag) => h('button', {
                key: tag,
                type: 'button',
                className: 'concerto-chip',
                disabled: busy,
                onClick: () => updateMemberDraft(selectedMemberIdx, { persona: tag }),
              }, tag)))),
          h(ConnectionCheck, {
            label: selectedMember.id || `成员 ${selectedMemberIdx + 1}`,
            disabled: busy,
            member: selectedMember.source === 'hosted'
              ? { source: 'hosted', provider: selectedMember.provider ?? '', model: selectedMember.model ?? '' }
              : (selectedMember.source === 'api'
                ? { source: 'api', baseUrl: selectedMember.baseUrl ?? '', apiKey: selectedMember.apiKey ?? '', model: selectedMember.model ?? '' }
                : { source: selectedMember.source, connector: selectedMember.connector || connectorOptions[0]?.id || 'antigravity' }),
          })),

        // 折叠的高级团队选项，让舞台成为视觉主角
        h('details', { className: 'concerto-set-fold' },
          h('summary', null, '更多团队选项（简介、固定视图、派发上限）'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--cc-space-3)', marginTop: 6 } },
            h(SettingsField, { label: '团队简介' },
              h('input', { disabled: busy, className: 'concerto-input', value: description, onChange: (e) => setDescription(e.target.value) })),
            h(SettingsField, {
              label: '固定视图要求',
              hint: '可选。写法为「类型:ID」，多个用逗号分隔，例如 mindmap:plan, checklist:accept',
            }, h('input', { disabled: busy, className: 'concerto-input concerto-id', value: requiredViewsInput, onChange: (e) => setRequiredViewsInput(e.target.value), placeholder: 'mindmap:plan, checklist:accept' })),
            h(DispatchLimitFields, { key: draftRevision, limits: editing?.team.dispatchLimits, disabled: busy }))))
    })(),
    h('footer', { className: 'concerto-set-actions' },
      h('span', { className: 'concerto-set-actions-hint' }, hash
        ? '预设变更可通过「重载团队」应用。'
        : ''),
      h('div', { className: 'concerto-set-actions-buttons' },
        editing && h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: () => {
          focusName.current = true
          loadDraft(null)
          setStatus('')
        } }, '新建团队'),
        h('button', { type: 'button', className: 'concerto-btn', disabled: busy || !hash, onClick: onReload }, '重载团队'),
        h('button', { type: 'submit', className: 'concerto-btn concerto-btn--primary', disabled: busy }, '保存配置')))),
  // ② 已保存的团队
  h(SettingsSection, { title: '已保存的团队', count: teams.length },
    h(SettingsField, { label: '桌面启动目录', hint: '续开一轮时留空沿用项目最近目录。' },
      h('input', { className: 'concerto-input', value: launchCwd, onChange: (e) => setLaunchCwd(e.target.value), placeholder: '例如 D:\\projects\\my-app' })),
    projects.length > 0 && h('div', { className: 'concerto-set-actions' },
      h(SettingsField, { label: '继续已有项目' },
        h('select', {
          className: 'concerto-input', value: selectedProject ? projectId : '', disabled: busy,
          onChange: (e) => {
            setProjectId(e.target.value)
            setContinuationTeamId('')
          },
        },
        h('option', { value: '', disabled: true }, '请选择项目'),
        projects.map((project) => h('option', { key: project.projectId, value: project.projectId },
          `${project.objective || project.teamName} · ${project.projectId.slice(-8)} · ${project.completed ? '已收尾' : '进行中'}`)))),
      needsTeam && h(SettingsField, { label: '续开使用的团队', hint: teams.length === 0 ? '请先保存一个团队。' : '原团队配置已移除。' },
        h('select', {
          className: 'concerto-input', value: teamForContinuation ?? '', disabled: busy || teams.length === 0,
          onChange: (e) => setContinuationTeamId(e.target.value),
        },
        h('option', { value: '', disabled: true }, '请选择团队'),
        teams.map((team) => h('option', { key: team.id, value: team.id }, team.name)))),
      h('button', {
        type: 'button', className: 'concerto-btn', disabled: busy || !teamForContinuation,
        onClick: () => onLaunchTeam(teamForContinuation, projectId),
      }, '继续项目')),
    teams.length === 0
      ? h('p', { className: 'concerto-set-empty' }, '还没有团队。在上方配置并保存后，团队会出现在这里。')
      : h('ul', { className: 'concerto-set-list' }, teams.map((t) => {
          const caps = Array.isArray(t.memberCapabilities) ? t.memberCapabilities : []
          return h('li', { key: t.id, className: 'concerto-set-item', 'data-concerto-team-row': t.id },
            h('div', { className: 'concerto-set-item-head' },
              h('div', { className: 'concerto-set-item-title' },
                h('strong', null, t.name),
                h('span', { className: 'concerto-badge concerto-id' }, t.id),
                h('span', { className: 'concerto-quiet concerto-num' }, `v${t.configVersion} · ${t.memberCount} 名成员`)),
              h('div', { className: 'concerto-set-actions-buttons' },
                h('button', { type: 'button', className: 'concerto-btn', disabled: busy,
                  'aria-label': `编辑团队 ${t.name}`, onClick: () => onEditTeam(t.id),
                }, '编辑'),
                h('button', { type: 'button', className: 'concerto-btn concerto-btn--danger', disabled: busy,
                  'aria-label': `删除团队 ${t.name}`, onClick: () => setDeleteTarget(t),
                }, '删除'),
                h('button', {
                  type: 'button',
                  className: 'concerto-btn concerto-btn--primary',
                  disabled: busy,
                  'data-concerto-launch-team': t.id,
                  onClick: () => onLaunchTeam(t.id),
                }, '新建项目'))),
            caps.length > 0 && h('div', { className: 'concerto-set-caps', 'aria-label': '成员能力' }, caps.map((cap) => {
              const cs = formatCapabilitySummary(cap)
              return h('span', {
                key: cap.memberId,
                className: 'concerto-chip',
                'data-tone': cs.tone || 'neutral',
                title: `${cs.summary}${cs.tools.length ? ` · 工具：${cs.tools.join(', ')}` : ''}`,
              }, `${cap.memberId} · ${cs.badge}`)
            })))
        }))),

  // ②½ 自定义外部 Agent（极简 3 字段 + 一键测试，保存即刻生效）
  h(CustomConnectorsSection, {
    connectors,
    disabled: busy,
    onChange: (nextList) => setConnectors(Array.isArray(nextList) ? nextList : connectors),
  }),

  // ④ 孤儿 / 阻塞执行恢复
  h(SettingsSection, {
    title: '异常执行恢复',
    count: pendingUnknowns.length,
    tone: pendingUnknowns.length > 0 ? 'attention' : undefined,
    hint: '孤儿或状态未知的执行，不依赖原指挥会话即可核对与处理。',
    'data-concerto-recovery-section': 'true',
  },
    pendingUnknowns.length === 0
      ? h('p', { className: 'concerto-set-empty' }, '当前没有需要恢复的 unknown 执行。')
      : pendingUnknowns.map(recoveryRow),
    quarantinedUnknowns.length > 0 && h('details', { className: 'concerto-set-fold' },
      h('summary', null, `原工作区仍保留占用（${quarantinedUnknowns.length} 条）`),
      quarantinedUnknowns.map(recoveryRow))))
}

function ApiEndpointFields({
  disabled = false,
  baseUrl = '',
  apiKey = '',
  model = '',
  onChangeBaseUrl,
  onChangeApiKey,
  onChangeModel,
}) {
  const listId = React.useId()
  const [models, setModels] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [hint, setHint] = React.useState('')

  async function fetchModels() {
    if (!baseUrl.trim() || loading) return
    setLoading(true)
    setHint('')
    try {
      const res = await request('/api/models', {
        method: 'POST',
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      })
      const list = Array.isArray(res?.models) ? res.models : []
      setModels(list)
      if (list.length > 0 && !model.trim()) onChangeModel?.(list[0])
      setHint(list.length > 0 ? `已拉取 ${list.length} 个模型` : '端点未返回模型列表，可手动输入')
    } catch (error) {
      setHint(error.message || '拉取失败')
    } finally {
      setLoading(false)
    }
  }

  return h(React.Fragment, null,
    h(SettingsField, { label: 'API Base URL' },
      h('input', {
        disabled,
        className: 'concerto-input concerto-id',
        value: baseUrl,
        placeholder: 'https://api.deepseek.com/v1',
        onChange: (e) => onChangeBaseUrl?.(e.target.value),
      })),
    h(SettingsField, { label: 'API Key' },
      h('input', {
        type: 'password',
        disabled,
        className: 'concerto-input concerto-id',
        value: apiKey,
        placeholder: 'sk-...（本地 Ollama 可留空）',
        onChange: (e) => onChangeApiKey?.(e.target.value),
      })),
    h(SettingsField, { label: 'Model', hint: hint || undefined },
      h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
        h('input', {
          disabled,
          list: models.length > 0 ? listId : undefined,
          className: 'concerto-input concerto-id',
          style: { flex: 1, minWidth: 0 },
          value: model,
          placeholder: 'deepseek-chat / gpt-4o',
          onChange: (e) => onChangeModel?.(e.target.value),
        }),
        h('button', {
          type: 'button',
          className: 'concerto-btn',
          disabled: disabled || loading || !baseUrl.trim(),
          onClick: fetchModels,
        }, loading ? '拉取中…' : '拉取模型')),
      models.length > 0 && h('datalist', { id: listId },
        models.map((m) => h('option', { key: m, value: m })))))
}

function ProviderModelFields({
  disabled = false,
  providers = [],
  provider = '',
  model = '',
  providerLabel = 'provider',
  modelLabel = 'model',
  allowEmpty = false,
  onChangeProvider,
  onChangeModel,
}) {
  const hasCatalog = Array.isArray(providers) && providers.length > 0
  const selectedProvider = hasCatalog ? providers.find((p) => p.id === provider) : null
  const models = selectedProvider?.models ?? []
  const hasModelList = models.length > 0

  function handleProviderChange(nextProvider) {
    onChangeProvider?.(nextProvider)
    if (hasCatalog && nextProvider) {
      const target = providers.find((p) => p.id === nextProvider)
      if (target?.models?.length > 0 && !target.models.some((m) => m.id === model)) {
        onChangeModel?.(target.models[0].id)
      }
    }
  }

  return h(React.Fragment, null,
    h(SettingsField, { label: providerLabel },
      hasCatalog
        ? h('select', {
            disabled,
            className: 'concerto-input concerto-id',
            value: provider,
            onChange: (e) => handleProviderChange(e.target.value),
          },
            allowEmpty && h('option', { value: '' }, 'DSH 默认'),
            providers.map((p) => h('option', { key: p.id, value: p.id }, p.name && p.name !== p.id ? `${p.name} (${p.id})` : p.id)),
            provider && !providers.some((p) => p.id === provider) && h('option', { value: provider }, `${provider} (当前)`))
        : h('input', {
            disabled,
            className: 'concerto-input concerto-id',
            value: provider,
            placeholder: allowEmpty ? 'DSH 默认' : 'x-ds',
            onChange: (e) => onChangeProvider?.(e.target.value),
          })),
    h(SettingsField, { label: modelLabel },
      hasModelList
        ? h('select', {
            disabled,
            className: 'concerto-input concerto-id',
            value: model,
            onChange: (e) => onChangeModel?.(e.target.value),
          },
            allowEmpty && h('option', { value: '' }, 'DSH 默认'),
            models.map((m) => h('option', { key: m.id, value: m.id }, m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id)),
            model && !models.some((m) => m.id === model) && h('option', { value: model }, `${model} (当前)`))
        : h('input', {
            disabled,
            className: 'concerto-input concerto-id',
            value: model,
            placeholder: allowEmpty ? 'DSH 默认' : 'deepseek-v4.1-flash',
            onChange: (e) => onChangeModel?.(e.target.value),
          })))
}

function CustomConnectorsSection({ connectors = [], disabled = false, onChange }) {
  const [displayName, setDisplayName] = React.useState('')
  const [mode, setMode] = React.useState('acp')
  const [command, setCommand] = React.useState('')
  const [probeState, setProbeState] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [testingId, setTestingId] = React.useState('')
  const [rowProbes, setRowProbes] = React.useState({})

  const customList = connectors.filter((c) => c.custom)
  const busy = disabled || saving

  async function onTestDraft() {
    if (!command.trim()) {
      setProbeState({ ok: false, text: '请先填写启动命令' })
      return
    }
    setProbeState({ pending: true, text: '测试连接中…' })
    try {
      const res = await request('/connectors/probe', {
        method: 'POST',
        body: JSON.stringify({ displayName: displayName.trim() || '测试 Agent', mode, command: command.trim() }),
      })
      setProbeState({ ok: Boolean(res?.ok), text: res?.ok ? `已就绪：${res.userAgent || res.bin || 'OK'}` : `未连通：${res?.detail || res?.code || '失败'}` })
    } catch (error) {
      setProbeState({ ok: false, text: `未连通：${error.message}` })
    }
  }

  async function onAdd(event) {
    event?.preventDefault?.()
    if (!displayName.trim() || !command.trim()) {
      setProbeState({ ok: false, text: '请填写名称和启动命令' })
      return
    }
    setSaving(true)
    try {
      const res = await request('/connectors/custom', {
        method: 'POST',
        body: JSON.stringify({ displayName: displayName.trim(), mode, command: command.trim() }),
      })
      if (res?.connectors) onChange?.(res.connectors)
      setDisplayName('')
      setCommand('')
      setProbeState({ ok: true, text: `已添加「${res?.connector?.displayName || displayName}」，现在可以直接在上方成员列表选用` })
    } catch (error) {
      setProbeState({ ok: false, text: `保存失败：${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function onTestSaved(id) {
    setTestingId(id)
    try {
      const res = await request('/connectors/probe', {
        method: 'POST',
        body: JSON.stringify({ connector: id }),
      })
      setRowProbes((prev) => ({
        ...prev,
        [id]: { ok: Boolean(res?.ok), text: res?.ok ? `已就绪 · ${res.userAgent || 'OK'}` : `未连通 · ${res?.detail || res?.code || '失败'}` },
      }))
    } catch (error) {
      setRowProbes((prev) => ({ ...prev, [id]: { ok: false, text: `未连通 · ${error.message}` } }))
    } finally {
      setTestingId('')
    }
  }

  async function onDelete(id) {
    setSaving(true)
    try {
      const res = await request(`/connectors/custom?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res?.connectors) onChange?.(res.connectors)
      setRowProbes((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (error) {
      setProbeState({ ok: false, text: `删除失败：${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  return h(SettingsSection, {
    title: '自定义外部 Agent',
    count: customList.length,
    hint: '填名称和启动命令即可接入任意 CLI Agent，保存后立即生效、无需重启 DSH。',
    'data-concerto-custom-connectors': 'true',
  },
    h('div', { className: 'concerto-set-grid' },
      h(SettingsField, { label: '名称' },
        h('input', {
          className: 'concerto-input',
          disabled: busy,
          value: displayName,
          placeholder: mode === 'acp' ? '例如：My ACP Agent' : '例如：Aider',
          onChange: (e) => setDisplayName(e.target.value),
        })),
      h(SettingsField, { label: '接入方式' },
        h('select', {
          className: 'concerto-input',
          disabled: busy,
          value: mode,
          onChange: (e) => { setMode(e.target.value); setProbeState(null) },
        },
          h('option', { value: 'acp' }, 'ACP 协议（推荐，支持团队工具与审批）'),
          h('option', { value: 'cli' }, '普通命令行（通用兜底）')))),
    h(SettingsField, {
      label: '启动命令',
      hint: mode === 'acp'
        ? '例如：my-agent acp 或 "C:\\path\\to\\agent.exe" acp'
        : '例如：aider --yes --message {{prompt}}（不写 {{prompt}} 时自动通过标准输入传入任务）',
    },
      h('input', {
        className: 'concerto-input concerto-id',
        disabled: busy,
        value: command,
        placeholder: mode === 'acp' ? 'my-agent acp' : 'aider --yes --message {{prompt}}',
        onChange: (e) => { setCommand(e.target.value); setProbeState(null) },
      })),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 } },
      h('button', {
        type: 'button',
        className: 'concerto-btn',
        disabled: busy || !command.trim(),
        onClick: onTestDraft,
      }, probeState?.pending ? '测试中…' : '测试连接'),
      h('button', {
        type: 'button',
        className: 'concerto-btn concerto-btn--primary',
        disabled: busy || !displayName.trim() || !command.trim(),
        onClick: onAdd,
      }, '添加连接器'),
      probeState && h('span', {
        className: 'concerto-field-hint',
        style: { color: probeState.pending ? 'var(--cc-text-secondary)' : (probeState.ok ? 'var(--cc-ok)' : 'var(--cc-danger)') },
      }, probeState.text)),
    customList.length > 0 && h('ul', { className: 'concerto-set-list', style: { marginTop: 10 } },
      customList.map((item) => {
        const rowProbe = rowProbes[item.id]
        return h('li', { key: item.id, className: 'concerto-set-item' },
          h('div', { className: 'concerto-set-item-head' },
            h('div', { className: 'concerto-set-item-title' },
              h('strong', null, item.displayName || item.id),
              h('span', { className: 'concerto-badge concerto-id' }, item.id),
              h('span', { className: 'concerto-tag' }, (item.protocol || item.mode || 'cli').toUpperCase())),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', {
                type: 'button',
                className: 'concerto-btn',
                disabled: busy || testingId === item.id,
                onClick: () => onTestSaved(item.id),
              }, testingId === item.id ? '测试中…' : '测试'),
              h('button', {
                type: 'button',
                className: 'concerto-btn concerto-btn--danger',
                disabled: busy,
                onClick: () => onDelete(item.id),
              }, '删除'))),
          h('div', { className: 'concerto-set-meta' },
            h('span', { className: 'concerto-id' }, item.command || ''),
            rowProbe && h('span', {
              style: { color: rowProbe.ok ? 'var(--cc-ok)' : 'var(--cc-danger)' },
            }, rowProbe.text)))
      })))
}

function SettingsSection({ as = 'section', title, hint, count, tone, children, ...rest }) {
  return h(as, { className: 'concerto-set-card', 'data-tone': tone, ...rest },
    h('div', { className: 'concerto-set-card-head' },
      h('h3', null, title, count != null && h('span', { className: 'concerto-count-pill concerto-num' }, String(count))),
      hint && h('p', { className: 'concerto-set-hint' }, hint)),
    children)
}

function SettingsField({ label: fieldLabel, hint, children }) {
  return h('label', { className: 'concerto-set-field' },
    h('span', { className: 'concerto-set-label' }, fieldLabel),
    children,
    hint && h('span', { className: 'concerto-field-hint' }, hint))
}

const APPROVAL_METHOD_LABEL = {
  'item/commandExecution/requestApproval': '命令执行审批',
  'item/fileChange/requestApproval': '文件修改审批',
}

function RequiredReasonField({ label: fieldLabel, value, onChange, disabled, hint, maxLength }) {
  const id = React.useId()
  const [invalid, setInvalid] = React.useState(false)
  return h('div', { className: 'concerto-field' },
    h('label', { htmlFor: id }, fieldLabel, h('span', { className: 'concerto-quiet' }, ' · 必填')),
    hint && h('p', { id: `${id}-hint`, className: 'concerto-field-hint' }, hint),
    h('textarea', {
      id, value, disabled, required: true, rows: 2, maxLength,
      'aria-invalid': invalid || undefined,
      'aria-describedby': [hint && `${id}-hint`, invalid && `${id}-error`].filter(Boolean).join(' ') || undefined,
      onInvalid: () => setInvalid(true),
      onChange: (event) => {
        const text = event.target.value
        event.target.setCustomValidity(text.trim() ? '' : `请填写${fieldLabel}。`)
        if (text.trim()) setInvalid(false)
        onChange(text)
      },
      className: 'concerto-textarea',
    }),
    invalid && h('p', { id: `${id}-error`, className: 'concerto-field-error' }, `请填写${fieldLabel}。`))
}

export function UnblockTaskForm({ task, disabled, onSubmit }) {
  const [reason, setReason] = React.useState('')
  const [expectedUpdatedAt] = React.useState(task.updatedAt)
  const stale = task.updatedAt !== expectedUpdatedAt
  return h('form', {
    'aria-label': '解除任务阻塞',
    onSubmit: (event) => {
      event.preventDefault()
      if (disabled || stale || !reason.trim()) return
      onSubmit({ taskId: task.taskId, expectedUpdatedAt, reason: reason.trim() })
    },
  },
    h(RequiredReasonField, {
      label: '阻塞解除依据',
      value: reason, onChange: setReason, disabled, maxLength: 1200,
      hint: '说明阻塞如何解除。提交后任务回到待派发。',
    }),
    stale && h('p', { role: 'status' }, '任务已更新。重新打开详情后再提交。'),
    h('button', { type: 'submit', className: 'concerto-btn', disabled: disabled || stale }, '解除阻塞'))
}

export function RequestCard({ item, disabled, onAnswer, bare = false }) {
  const [draft, setDraft] = React.useState({})
  const inputId = React.useId()
  const [invalidQuestions, setInvalidQuestions] = React.useState({})
  const questions = item.payload?.questions || []
  const answerOf = (q) => (draft[q.id] ?? '')
  const set = (id, value) => setDraft({ ...draft, [id]: value })
  const rawSeq = item.sequenceIndex ?? item.payload?.sequenceIndex
  const seq = Number.isInteger(rawSeq) ? rawSeq : null
  const methodLabel = APPROVAL_METHOD_LABEL[item.payload?.method] || item.payload?.method || ''
  const files = Array.isArray(item.payload?.files) ? item.payload.files : []
  const rawDiff = item.diffFromPrevious ?? item.payload?.diffFromPrevious
  const diffText = Array.isArray(rawDiff) ? rawDiff.join(' · ') : (rawDiff ? String(rawDiff) : '')
  const isDuplicate = Boolean(item.duplicateOfRequestId ?? item.payload?.duplicateOfRequestId)
  const questionMode = item.responseMode === 'next_turn' ? '本轮结束后，成员将在下一轮收到答复。'
    : item.responseMode === 'same_turn' ? '答复将送回成员当前轮。' : ''

  return h('div', { style: bare ? undefined : cardStyle },
    !bare && h('strong', null, (item.kind === 'approval' ? '请求批准' : '向你提问') + ' · ' + (item.memberId || '成员')),
    !bare && h('div', { style: styles.muted }, item.taskId + ' · ' + label(item.status)),
    item.kind === 'approval' && (seq || methodLabel || diffText) && h('div', {
      style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 4 },
      'data-concerto-approval-meta': item.requestId,
    },
    seq && h('span', { className: 'concerto-badge concerto-num' }, `第 ${seq} 次审批`),
    methodLabel && h('span', { className: 'concerto-chip' }, methodLabel),
    diffText && h('span', {
      className: 'concerto-tag',
      style: { color: isDuplicate ? 'var(--cc-state-blocked)' : 'var(--cc-accent)' },
    }, isDuplicate ? `重复警告：${diffText}` : `与前次差异：${diffText}`)),
    item.detail && h('p', { role: 'status' }, item.detail),
    item.payload?.command && h('pre', {
      style: {
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        margin: '4px 0',
        padding: '6px 10px',
        borderRadius: 'var(--cc-radius-ctrl)',
        background: 'var(--cc-card-nested-bg)',
      },
    }, item.payload.command),
    files.length > 0 && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', marginTop: 2, overflowWrap: 'anywhere' } },
      '涉及文件：' + files.join('、')),
    item.payload?.cwd && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } }, '工作目录：' + item.payload.cwd),
    item.payload?.decisionScope && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)' } }, '决策范围：' + String(item.payload.decisionScope)),
    item.payload?.reason && h('p', { style: { fontSize: 'var(--cc-fs-meta)', margin: '2px 0' } }, item.payload.reason),
    item.kind === 'approval' && h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: disabled || item.status !== 'pending',
        onClick: () => onAnswer(item, { decision: 'decline' }) }, '拒绝'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: disabled || item.status !== 'pending',
        onClick: () => onAnswer(item, { decision: 'accept' }) }, '批准这次')),
    item.kind === 'question' && h('form', {
      'aria-label': `回答 ${item.memberId || '成员'} 的问题`,
      'aria-describedby': questionMode ? `${inputId}-mode` : undefined,
      onSubmit: (event) => {
        event.preventDefault()
        if (disabled || item.status !== 'pending') return
        onAnswer(item, { answers: Object.fromEntries(questions.map((q) => [q.id, { answers: [answerOf(q).trim()] }])) })
      },
    },
      questionMode && h('p', { id: `${inputId}-mode`, className: 'concerto-field-hint' }, questionMode),
      questions.map((q, index) => h('div', { key: q.id, className: 'concerto-field' },
        h('label', { htmlFor: `${inputId}-${index}` }, q.question, h('span', { className: 'concerto-quiet' }, ' · 必填')),
        q.options?.length > 0 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 } },
          q.options.map((opt) => h('button', { key: opt.label, type: 'button', className: 'concerto-btn', 'aria-pressed': answerOf(q) === opt.label, disabled: disabled || item.status !== 'pending',
            onClick: () => set(q.id, opt.label) }, opt.label))),
        h('input', { id: `${inputId}-${index}`, value: answerOf(q), disabled: disabled || item.status !== 'pending', required: true, pattern: '.*\\S.*',
          'aria-invalid': (invalidQuestions[q.id] && !answerOf(q).trim()) || undefined,
          'aria-describedby': invalidQuestions[q.id] && !answerOf(q).trim() ? `${inputId}-${index}-error` : undefined,
          onInvalid: () => setInvalidQuestions((prev) => ({ ...prev, [q.id]: true })),
          onChange: (event) => set(q.id, event.target.value), placeholder: '选择上方选项，或输入回答',
          className: 'concerto-input' }),
        invalidQuestions[q.id] && !answerOf(q).trim() && h('p', { id: `${inputId}-${index}-error`, className: 'concerto-field-error' }, '请填写回答或选择一个选项。'))),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } },
        h('button', { type: 'submit', className: 'concerto-btn concerto-btn--primary', disabled: disabled || item.status !== 'pending' || questions.length === 0 }, '提交回答'))))
}

export function ReviewCard({ task, disabled, onReview, bare = false }) {
  const [reason, setReason] = React.useState('')
  const [failError, setFailError] = React.useState('')
  const reasonRef = React.useRef(null)
  const inputId = React.useId()
  return h('form', {
    style: { marginTop: bare ? 4 : 8 },
    'aria-label': `验收 ${task.title || task.taskId}`,
    onSubmit: (event) => {
      event.preventDefault()
      if (disabled) return
      const verdict = event.nativeEvent.submitter?.value
      if (!['pass', 'fail'].includes(verdict)) return
      const trimmed = reason.trim()
      if (verdict === 'fail' && !trimmed) {
        setFailError('退回重做时请填写修改原因。')
        reasonRef.current?.focus()
        return
      }
      setFailError('')
      onReview(task, verdict, trimmed || '用户确认验收通过')
    },
  },
    h('div', { className: 'concerto-field' },
      h('label', { htmlFor: inputId }, '验收说明', h('span', { className: 'concerto-quiet' }, ' · 通过选填，退回重做必填')),
      h('textarea', {
        ref: reasonRef,
        id: inputId,
        className: 'concerto-input',
        rows: 2,
        value: reason,
        disabled,
        placeholder: '直接点击“验收通过”即可；如需退回重做，请说明原因。',
        'aria-invalid': Boolean(failError) || undefined,
        'aria-describedby': failError ? `${inputId}-error` : undefined,
        onChange: (event) => {
          setReason(event.target.value)
          if (failError && event.target.value.trim()) setFailError('')
        },
      }),
      failError && h('p', { id: `${inputId}-error`, className: 'concerto-field-error', role: 'alert' }, failError)),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      h('button', { type: 'submit', value: 'fail', className: 'concerto-btn concerto-btn--ghost', disabled }, '退回重做'),
      h('button', { type: 'submit', value: 'pass', className: 'concerto-btn concerto-btn--primary', disabled }, '验收通过')))
}

export function AdjudicationCard({ execution, disabled, onSubmit, bare = false }) {
  const [reviewed, setReviewed] = React.useState(false)
  const delivery = execution.recoverableDelivery
  return h('form', { style: bare ? undefined : cardStyle, 'aria-label': `裁决 ${execution.taskId}`,
    onSubmit: (event) => {
      event.preventDefault()
      if (disabled) return
      const action = event.nativeEvent.submitter?.value
      if (!action || (action === 'retry_isolated' && !reviewed) || (action === 'accept' && !delivery)) return
      onSubmit({
        taskId: execution.taskId, executionId: execution.executionId, action, reason: ADJUDICATION_NOTES[action],
        ...(action === 'retry_isolated' ? { externalEffectsReviewed: true } : {}),
        ...(action === 'accept' ? { resultId: delivery.resultId } : {}),
      })
    },
  },
    !bare && h('strong', null, '需要你裁决 · ' + execution.taskId),
    h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-meta)' } }, (execution.memberId || '') + ' · 状态未知（上次运行结果尚未确认）'),
    execution.writeScope && h('p', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } }, '工作目录被上次未确认的运行占用：' + execution.writeScope),
    delivery && h(DeliveryRecoveryNote, { delivery }),
    h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 'var(--cc-fs-meta)' } },
      h('input', { type: 'checkbox', checked: reviewed, disabled, onChange: (e) => setReviewed(e.target.checked) }),
      '已核查上次运行的外部改动，允许在隔离工作区重试'),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      h('button', { type: 'submit', value: 'confirm_failed', className: 'concerto-btn concerto-btn--ghost', disabled }, '确认已停止并改派'),
      delivery && h('button', { type: 'submit', value: 'accept', className: 'concerto-btn', disabled }, '接收已验证交付'),
      h('button', { type: 'submit', value: 'retry_isolated', className: 'concerto-btn concerto-btn--primary', disabled: disabled || !reviewed }, '带隔离重试')))
}
