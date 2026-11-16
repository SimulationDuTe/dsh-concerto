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

const CAP_TONE_VAR = {
  ok: 'var(--cc-state-done)',
  warn: 'var(--cc-state-attention)',
  danger: 'var(--cc-state-blocked)',
  neutral: 'var(--cc-text-secondary)',
}

function RecoveryExecutionRow({ row, busy, onBusy, onDone, onError }) {
  const [reason, setReason] = React.useState('')
  const [reviewed, setReviewed] = React.useState(false)
  const [recResult, setRecResult] = React.useState(row.lastReconcile || null)
  const ready = reason.trim().length > 0
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
        reason,
        ...(action === 'retry_isolated' ? { externalEffectsReviewed: reviewed } : {}),
      })
      onDone(action === 'retry_isolated'
        ? `已在隔离新目录就绪（原工作区保留标记）：${out.retryCwd || ''}`
        : `已确认后端停止并释放任务 ${row.taskId}（状态：${out.state || 'failed'}）`)
    } catch (e) {
      onError('恢复操作被拒绝：' + e.message)
    } finally {
      onBusy(false)
    }
  }

  return h('div', {
    key: row.executionId,
    className: 'concerto-card',
    style: { marginTop: 8, padding: '10px 12px' },
    'data-concerto-recovery-exec': row.executionId,
  },
  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
      h('strong', null, `${row.taskTitle || row.taskId}`),
      h('span', { className: 'concerto-badge concerto-id' }, row.executionId),
      row.memberId && h('span', { className: 'concerto-chip' }, row.memberId),
      row.connectorId && h('span', { className: 'concerto-tag' }, row.connectorId),
      isCrossRestart && h('span', { className: 'concerto-tag', style: { color: 'var(--cc-state-attention)' } }, '跨重启孤儿'),
      row.quarantined && h('span', { className: 'concerto-tag' }, '原工作区已隔离保留')),
    h('button', { type: 'button', className: 'concerto-btn', disabled: busy, onClick: onReconcile }, '核对后端状态')),
  h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', marginTop: 4 } },
    `团队运行：${row.teamName || row.teamSessionId} (${row.teamSessionId}) · 原指挥会话：${row.originalCommanderSessionAlive ? '在线' : '未加载（重启/关闭后不阻断恢复）'}`),
  row.writeScope && h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', marginTop: 2, overflowWrap: 'anywhere' } },
    `占用工作目录：${row.writeScope}${row.sandbox ? ` · 沙盒：${row.sandbox}` : ''}`),
  row.unknownReason && h('div', { style: { fontSize: 'var(--cc-fs-meta)', marginTop: 4, color: 'var(--cc-state-blocked)' } },
    `阻塞原因：${row.unknownReason}`),
  recResult && h('div', {
    role: 'status',
    style: {
      fontSize: 'var(--cc-fs-caption)',
      marginTop: 6,
      padding: '4px 8px',
      borderRadius: 'var(--cc-radius-ctrl)',
      background: 'var(--cc-card-nested-bg)',
      color: recResult.confirmedStopped ? 'var(--cc-state-done)' : 'var(--cc-state-attention)',
    },
  }, `核对结论：${recResult.confirmedStopped ? '已取得后端停止证据' : '未确认后端停止（不可释放原工作区）'} · ${recResult.reason || ''}`),
  h('textarea', {
    value: reason,
    disabled: busy,
    rows: 2,
    onChange: (e) => setReason(e.target.value),
    placeholder: '填写本地恢复原因（必填）',
    style: { ...styles.input, width: '100%', boxSizing: 'border-box', marginTop: 6 },
  }),
  h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 'var(--cc-fs-caption)' } },
    h('input', { type: 'checkbox', checked: reviewed, disabled: busy, onChange: (e) => setReviewed(e.target.checked) }),
    '已核查外部副作用（隔离新目录恢复必填；适用于 Codex 受限沙盒及 Hosted 非危险成员）'),
  h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
    h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--ghost',
      disabled: busy || !ready,
      onClick: () => onAdjudicate('confirm_failed'),
    }, '确认已停止并释放'),
    h('button', {
      type: 'button',
      className: 'concerto-btn concerto-btn--primary',
      disabled: busy || !ready || !reviewed,
      onClick: () => onAdjudicate('retry_isolated'),
    }, '隔离目录恢复')))
}

export function ConcertoPanel() {
  useTeamCss()
  const hostTheme = useHostTheme()
  const [teams, setTeams] = React.useState([])
  const [runs, setRuns] = React.useState([])
  const [unknowns, setUnknowns] = React.useState([])
  const [name, setName] = React.useState('My Team')
  const [provider, setProvider] = React.useState('x-ds')
  const [model, setModel] = React.useState('deepseek-v4.1-flash')
  const [requiredViewsInput, setRequiredViewsInput] = React.useState('')
  const [launchCwd, setLaunchCwd] = React.useState('')
  const [membersDraft, setMembersDraft] = React.useState([])
  const [hash, setHash] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const refresh = React.useCallback(async () => {
    try {
      const [teamsRes, runsRes, unkRes] = await Promise.allSettled([
        request('/teams'),
        fetchRuns(),
        fetchUnknownExecutions(),
      ])
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value?.teams ?? [])
      else setStatus('读取团队失败：' + teamsRes.reason?.message)
      if (runsRes.status === 'fulfilled') setRuns(runsRes.value?.runs ?? [])
      if (unkRes.status === 'fulfilled') setUnknowns(unkRes.value?.runs ?? [])
    } catch (e) {
      setStatus('读取失败：' + e.message)
    }
  }, [])

  React.useEffect(() => { refresh() }, [refresh])

  function addMemberDraft() {
    const idx = membersDraft.length + 1
    setMembersDraft([
      ...membersDraft,
      { id: `worker-${idx}`, source: 'hosted', connector: 'codex', roleKind: 'worker', toolProfile: 'coding', provider, model },
    ])
  }

  function updateMemberDraft(index, patch) {
    setMembersDraft(membersDraft.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function removeMemberDraft(index) {
    setMembersDraft(membersDraft.filter((_, i) => i !== index))
  }

  async function onSave() {
    setBusy(true)
    setStatus('保存中…')
    try {
      const teamId = toTeamId(name)
      const parsedRequiredViews = requiredViewsInput
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const normalizedMembers = membersDraft
        .filter((m) => typeof m.id === 'string' && m.id.trim() !== '')
        .map((m) => ({
          id: m.id.trim(),
          source: m.source === 'external' ? 'external' : 'hosted',
          roleKind: m.roleKind === 'reviewer' ? 'reviewer' : 'worker',
          ...(m.source === 'external'
            ? { connector: (m.connector || 'codex').trim() }
            : {
                provider: (m.provider || provider).trim(),
                model: (m.model || model).trim(),
                toolProfile: ['coding', 'readonly', 'none'].includes(m.toolProfile) ? m.toolProfile : 'coding',
              }),
        }))
      const body = await request('/teams', {
        method: 'POST',
        body: JSON.stringify({
          team: {
            id: teamId,
            name,
            commander: { id: 'commander', source: 'hosted', provider, model },
            members: normalizedMembers,
            ...(parsedRequiredViews.length > 0 ? { requiredViews: parsedRequiredViews } : {}),
          },
        }),
      })
      setHash(body.generatedHash || '')
      setStatus('已保存 v' + body.configVersion + '，生成完成；点「重载团队」使其生效')
      await refresh()
    } catch (e) {
      setStatus('保存失败：' + e.message)
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

  async function onLaunchTeam(teamId) {
    setBusy(true)
    setStatus('正在工作区创建团队会话并打开…')
    try {
      const launched = await launchTeamSession({
        teamId,
        ...(launchCwd.trim() ? { cwd: launchCwd.trim() } : {}),
      })
      const opened = await openHostSession(launched.sessionId, {
        teamSessionId: launched.teamSessionId,
        openTeamTab: true,
      })
      setStatus(opened.navigated
        ? `已打开团队会话 ${launched.sessionId}（工作目录：${launched.cwd || '默认工作区'}）`
        : `已创建工作区团队会话 ${launched.sessionId}（运行 ${launched.teamSessionId}），请在侧栏工作区中打开`)
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

  return h('div', { className: 'concerto-surface', 'data-concerto-theme': hostTheme.colorScheme, style: { ...styles.wrap, ...(hostTheme.cssVars || {}) } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('div', { style: styles.title }, 'Concerto 团队'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: busy, onClick: refresh }, '刷新状态')),
    h('div', { style: styles.row },
      h('input', { style: styles.input, value: name, onChange: (e) => setName(e.target.value), placeholder: '团队名' }),
      h('input', { style: styles.input, value: provider, onChange: (e) => setProvider(e.target.value), placeholder: 'provider' }),
      h('input', { style: styles.input, value: model, onChange: (e) => setModel(e.target.value), placeholder: 'model' }),
      h('input', { style: styles.input, value: requiredViewsInput, onChange: (e) => setRequiredViewsInput(e.target.value), placeholder: '固定视图要求（可选，如 mindmap:plan, checklist:accept）' }),
      h('button', { className: 'concerto-btn', disabled: busy, onClick: addMemberDraft }, '+ 添加成员'),
      h('button', { className: 'concerto-btn concerto-btn--primary', disabled: busy, onClick: onSave }, '保存配置'),
      h('button', { className: 'concerto-btn', disabled: busy || !hash, onClick: onReload }, '重载团队')),
    membersDraft.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginBottom: 6 } },
      membersDraft.map((m, idx) => h('div', { key: idx, style: { ...styles.row, alignItems: 'center' } },
        h('input', { style: styles.input, value: m.id, placeholder: '成员 id', onChange: (e) => updateMemberDraft(idx, { id: e.target.value }) }),
        h('select', { style: styles.input, value: m.source, onChange: (e) => updateMemberDraft(idx, { source: e.target.value }) },
          h('option', { value: 'hosted' }, 'DSH Hosted'),
          h('option', { value: 'external' }, 'External Connector')),
        h('select', { style: styles.input, value: m.roleKind, onChange: (e) => updateMemberDraft(idx, { roleKind: e.target.value }) },
          h('option', { value: 'worker' }, '执行者 worker'),
          h('option', { value: 'reviewer' }, '审查者 reviewer')),
        m.source === 'hosted'
          ? h('select', { style: styles.input, value: m.toolProfile || 'coding', onChange: (e) => updateMemberDraft(idx, { toolProfile: e.target.value }) },
              h('option', { value: 'coding' }, '编码+Shell (coding)'),
              h('option', { value: 'readonly' }, '只读文件 (readonly)'),
              h('option', { value: 'none' }, '仅协调 (none)'))
          : h('input', { style: styles.input, value: m.connector || 'codex', placeholder: 'connector (如 codex)', onChange: (e) => updateMemberDraft(idx, { connector: e.target.value }) }),
        h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', onClick: () => removeMemberDraft(idx) }, '移除')))),
    status !== '' ? h('div', { role: 'status', style: styles.muted }, status) : null,
    h('div', { style: { ...styles.row, marginTop: 6, alignItems: 'center' } },
      h('input', {
        style: { ...styles.input, minWidth: 260, flex: '1 1 260px' },
        value: launchCwd,
        onChange: (e) => setLaunchCwd(e.target.value),
        placeholder: '桌面启动目录（可选，留空沿用宿主工作区）',
      })),
    h('div', null,
      teams.length === 0
        ? h('div', { style: styles.muted }, '还没有团队')
        : teams.map((t) => {
            const caps = Array.isArray(t.memberCapabilities) ? t.memberCapabilities : []
            return h('div', { key: t.id, style: styles.item, 'data-concerto-team-row': t.id },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                  h('strong', null, t.name),
                  h('span', { className: 'concerto-badge concerto-id' }, t.id)),
                h('button', {
                  type: 'button',
                  className: 'concerto-btn concerto-btn--primary',
                  disabled: busy,
                  'data-concerto-launch-team': t.id,
                  onClick: () => onLaunchTeam(t.id),
                }, '启动桌面会话')),
              h('div', { style: styles.muted }, 'configVersion ' + t.configVersion + ' · 成员 ' + t.memberCount),
              caps.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 } },
                caps.map((cap) => {
                  const cs = formatCapabilitySummary(cap)
                  return h('span', {
                    key: cap.memberId,
                    className: 'concerto-chip',
                    title: `${cs.summary}${cs.tools.length ? ` · 工具：${cs.tools.join(', ')}` : ''}`,
                    style: { color: CAP_TONE_VAR[cs.tone] || CAP_TONE_VAR.neutral },
                  }, `${cap.memberId} · ${cs.badge}`)
                })))
          })),
    h('div', { style: { marginTop: 14 } },
      h('div', { style: { ...styles.title, fontSize: 'var(--cc-fs-body)' } }, '团队运行实例（工作区会话入口）'),
      runs.length === 0
        ? h('div', { style: styles.muted }, '暂无团队运行记录')
        : runs.slice().reverse().slice(0, 8).map((run) => h('div', {
            key: run.teamSessionId,
            style: styles.item,
            'data-concerto-run-row': run.teamSessionId,
          },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
              h('strong', null, run.teamName || run.teamId || run.teamSessionId),
              h('span', { className: 'concerto-badge concerto-id' }, run.teamSessionId),
              run.unknownCount > 0 && h('span', { className: 'concerto-tag', style: { color: 'var(--cc-state-blocked)' } }, `阻塞 ${run.unknownCount}`)),
            run.commanderSessionId && h('button', {
              type: 'button',
              className: 'concerto-btn',
              disabled: busy,
              'data-concerto-open-run': run.teamSessionId,
              onClick: () => onOpenRun(run),
            }, '打开桌面会话')),
          h('div', { style: styles.muted },
            `任务 ${run.taskCount} · 指挥会话 ${run.commanderSessionId || '未知'}（${run.commanderSessionAlive ? '已加载' : '未加载'}）${run.cwd ? ` · 目录 ${run.cwd}` : ''}`)))),
    h('div', { style: { marginTop: 14 }, 'data-concerto-recovery-section': 'true' },
      h('div', { style: { ...styles.title, fontSize: 'var(--cc-fs-body)' } }, '孤儿 / 阻塞执行恢复（不依赖原指挥会话）'),
      (() => {
        const pendingUnknowns = unknowns.filter((r) => !r.quarantined)
        const quarantinedUnknowns = unknowns.filter((r) => r.quarantined)
        return h(React.Fragment, null,
          pendingUnknowns.length === 0
            ? h('div', { style: styles.muted }, '当前没有需要恢复的 unknown 执行。')
            : pendingUnknowns.map((row) => h(RecoveryExecutionRow, {
                key: row.executionId,
                row,
                busy,
                onBusy: setBusy,
                onDone: async (msg) => { setStatus(msg); await refresh() },
                onError: (msg) => setStatus(msg),
              })),
          quarantinedUnknowns.length > 0 && h('details', { style: { marginTop: 8 } },
            h('summary', { style: { ...styles.muted, cursor: 'pointer', fontSize: 'var(--cc-fs-caption)' } },
              `已隔离并保留原工作区占用（${quarantinedUnknowns.length} 条；任务已迁移至新目录继续）`),
            quarantinedUnknowns.map((row) => h('div', {
              key: 'q-' + row.executionId,
              className: 'concerto-card',
              style: { marginTop: 6, padding: '8px 10px' },
            },
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
              h('strong', null, row.taskTitle || row.taskId),
              h('span', { className: 'concerto-badge concerto-id' }, row.executionId),
              h('span', { className: 'concerto-tag' }, '原工作区已隔离保留')),
            h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', marginTop: 4, overflowWrap: 'anywhere' } },
              `原目录：${row.writeScope || '未知'}${row.retryCwd ? ` → 隔离新目录：${row.retryCwd}` : ''}`)))))
      })()))
}

const APPROVAL_METHOD_LABEL = {
  'item/commandExecution/requestApproval': '命令执行审批',
  'item/fileChange/requestApproval': '文件修改审批',
}

export function RequestCard({ item, disabled, onAnswer, bare = false }) {
  const [draft, setDraft] = React.useState({})
  const questions = item.payload?.questions || []
  const answerOf = (q) => (draft[q.id] ?? '')
  const set = (id, value) => setDraft({ ...draft, [id]: value })
  const ready = questions.length > 0 && questions.every((q) => answerOf(q).trim())
  const rawSeq = item.sequenceIndex ?? item.payload?.sequenceIndex
  const seq = Number.isInteger(rawSeq) ? rawSeq : null
  const methodLabel = APPROVAL_METHOD_LABEL[item.payload?.method] || item.payload?.method || ''
  const files = Array.isArray(item.payload?.files) ? item.payload.files : []
  const rawDiff = item.diffFromPrevious ?? item.payload?.diffFromPrevious
  const diffText = Array.isArray(rawDiff) ? rawDiff.join(' · ') : (rawDiff ? String(rawDiff) : '')
  const isDuplicate = Boolean(item.duplicateOfRequestId ?? item.payload?.duplicateOfRequestId)

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
    item.kind === 'question' && h('div', null,
      questions.map((q) => h('div', { key: q.id, style: { marginTop: 8 } },
        h('p', null, q.question),
        q.options?.length > 0 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 } },
          q.options.map((opt) => h('button', { key: opt.label, type: 'button', className: 'concerto-btn', disabled: disabled || item.status !== 'pending',
            onClick: () => set(q.id, opt.label) }, opt.label))),
        h('input', { value: answerOf(q), disabled: disabled || item.status !== 'pending',
          onChange: (event) => set(q.id, event.target.value), placeholder: '输入给成员的回答',
          style: { ...styles.input, width: '100%', boxSizing: 'border-box' } }))),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 } },
        h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: disabled || item.status !== 'pending' || !ready,
          onClick: () => onAnswer(item, { answers: Object.fromEntries(questions.map((q) => [q.id, { answers: [answerOf(q)] }])) }) }, '提交回答'))))
}

export function ReviewCard({ task, disabled, onReview, bare = false }) {
  const [reason, setReason] = React.useState('')
  const ready = reason.trim().length > 0
  return h('div', { style: { marginTop: bare ? 4 : 8 } },
    h('textarea', { value: reason, disabled, rows: 2, onChange: (e) => setReason(e.target.value),
      placeholder: '验收依据，例如检查了什么输出或运行结果', style: { ...styles.input, width: '100%', boxSizing: 'border-box' } }),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: disabled || !ready, onClick: () => onReview(task, 'fail', reason) }, '退回重做'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: disabled || !ready, onClick: () => onReview(task, 'pass', reason) }, '验收通过')))
}

export function AdjudicationCard({ execution, disabled, onSubmit, bare = false }) {
  const [reason, setReason] = React.useState('')
  const [reviewed, setReviewed] = React.useState(false)
  const ready = reason.trim().length > 0
  const act = (action, extra = {}) => onSubmit({ taskId: execution.taskId, executionId: execution.executionId, action, reason, ...extra })
  return h('div', { style: bare ? undefined : cardStyle },
    !bare && h('strong', null, '需要你裁决 · ' + execution.taskId),
    h('div', { style: { ...styles.muted, fontSize: 'var(--cc-fs-meta)' } }, (execution.memberId || '') + ' · 状态未知（上次运行结果尚未确认）'),
    execution.writeScope && h('p', { style: { ...styles.muted, fontSize: 'var(--cc-fs-caption)', overflowWrap: 'anywhere' } }, '工作目录被上次未确认的运行占用：' + execution.writeScope),
    h('textarea', { value: reason, disabled, rows: 2, onChange: (e) => setReason(e.target.value),
      placeholder: '说明裁决原因（必填）', style: { ...styles.input, width: '100%', boxSizing: 'border-box', marginTop: 6 } }),
    h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 'var(--cc-fs-meta)' } },
      h('input', { type: 'checkbox', checked: reviewed, disabled, onChange: (e) => setReviewed(e.target.checked) }),
      '已确认外部改动（Codex 受限沙盒 / Hosted 非危险成员隔离重试均需确认）'),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--ghost', disabled: disabled || !ready, onClick: () => act('confirm_failed') }, '确认已停止并改派'),
      h('button', { type: 'button', className: 'concerto-btn concerto-btn--primary', disabled: disabled || !ready || !reviewed,
        onClick: () => act('retry_isolated', { externalEffectsReviewed: true }) }, '带隔离重试')))
}
