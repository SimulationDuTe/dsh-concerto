/**
 * 非 DSH-Hosted 指挥者执行器（自定义 OpenAI 兼容 API + 外部 Agent Connector）。
 *
 * - `api` 模式：直接调用 OpenAI-compatible `/chat/completions` 工具调用循环，零外部依赖，
 *   支持 DeepSeek / OpenAI / OpenRouter / Ollama / vLLM / SiliconFlow 等任意兼容接口。
 * - `external` 模式：通过已注册的外部连接器（Antigravity/ACP、Claude Code、Codex、Gemini、OpenCode、自定义 CLI）
 *   运行指挥者回合，并通过 Concerto MCP Bridge / dynamicTools 注入全套 Commander 团队工具。
 */
import { CONNECTOR_EVENT } from './contract.mjs'

export function resolveChatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed
  return `${trimmed}/chat/completions`
}

export function resolveModelsUrl(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed.replace(/\/chat\/completions$/i, '/models')
  if (/\/models$/i.test(trimmed)) return trimmed
  return `${trimmed}/models`
}

export async function checkApiEndpoint({ baseUrl, apiKey = '', model = '', timeoutMs = 6000 } = {}) {
  const url = resolveModelsUrl(baseUrl)
  if (!url || !/^https?:\/\/\S+/.test(url)) {
    return { state: 'unreachable', reason: 'invalid_base_url', detail: '请填写有效的 http(s) Base URL', checked: ['config'] }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    })
    if (res.ok) {
      let detail = model ? `模型：${model}` : 'API 已连通'
      try {
        const json = await res.json()
        const list = Array.isArray(json?.data) ? json.data : []
        if (list.length > 0 && model && !list.some((m) => m?.id === model)) {
          detail = `端点已连通（共 ${list.length} 个模型，未在列表中精确匹配 ${model}，仍可尝试调用）`
        } else if (list.length > 0) {
          detail = `端点已连通（可用模型 ${list.length} 个）`
        }
      } catch { /* non-json ok */ }
      return { state: 'reachable', checked: ['config', 'handshake'], version: detail }
    }
    if (res.status === 401 || res.status === 403) {
      return { state: 'unreachable', reason: 'auth_failed', detail: `鉴权失败（HTTP ${res.status}），请检查 API Key`, checked: ['config', 'handshake'] }
    }
    // Some OpenAI-compatible proxies don't implement GET /models (404/405), fall back to checking reachability
    if (res.status === 404 || res.status === 405) {
      return { state: 'reachable', checked: ['config', 'handshake'], version: `端点可达（/models 返回 ${res.status}，将使用 ${model}）` }
    }
    return { state: 'unreachable', reason: `http_${res.status}`, detail: `端点返回 HTTP ${res.status}`, checked: ['config', 'handshake'] }
  } catch (error) {
    return {
      state: 'unreachable',
      reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
      detail: error?.name === 'AbortError' ? `连接超时（>${timeoutMs}ms）` : String(error?.message || error),
      checked: ['config', 'handshake'],
    }
  } finally {
    clearTimeout(timer)
  }
}

function toOpenAiTools(schemas = []) {
  return (Array.isArray(schemas) ? schemas : []).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.inputSchema || { type: 'object', properties: {} },
    },
  }))
}

export async function runApiCommanderTurn({
  commander,
  prompt,
  history = [],
  systemPrompt = '',
  tools = [],
  onToolCall,
  onActivity,
  maxSteps = 12,
  timeoutMs = 120000,
} = {}) {
  const endpoint = resolveChatCompletionsUrl(commander?.baseUrl)
  const model = typeof commander?.model === 'string' ? commander.model.trim() : ''
  const apiKey = typeof commander?.apiKey === 'string' ? commander.apiKey.trim() : ''
  if (!endpoint || !model) {
    return { ok: false, code: 'invalid', detail: '自定义 API 指挥者缺少 baseUrl 或 model' }
  }

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...history.slice(-16),
    { role: 'user', content: prompt },
  ]
  const openAiTools = toOpenAiTools(tools)
  let finalText = ''

  for (let step = 0; step < maxSteps; step += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let json
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          ...(openAiTools.length > 0 ? { tools: openAiTools, tool_choice: 'auto' } : {}),
        }),
        signal: controller.signal,
      })
      const raw = await res.text()
      if (!res.ok) {
        return { ok: false, code: `http_${res.status}`, detail: `API 请求失败（HTTP ${res.status}）：${raw.slice(0, 400)}` }
      }
      json = JSON.parse(raw)
    } catch (error) {
      return { ok: false, code: 'api_error', detail: String(error?.message || error) }
    } finally {
      clearTimeout(timer)
    }

    const msg = json?.choices?.[0]?.message
    if (!msg) {
      return { ok: false, code: 'invalid_response', detail: 'API 响应缺少 choices[0].message' }
    }

    const content = typeof msg.content === 'string' ? msg.content : ''
    const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : []
    messages.push({
      role: 'assistant',
      content: content || null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    })

    if (toolCalls.length === 0) {
      finalText = content
      if (finalText.trim()) {
        onActivity?.({ kind: 'output', summary: finalText.slice(0, 140), text: finalText })
      }
      return { ok: true, text: finalText, steps: step + 1, history: messages.filter((m) => m.role !== 'system') }
    }

    for (const tc of toolCalls) {
      const toolName = tc?.function?.name || ''
      let args = {}
      try {
        args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch {
        args = {}
      }
      let result
      try {
        result = typeof onToolCall === 'function'
          ? await onToolCall(toolName, args)
          : { ok: false, code: 'unavailable', detail: 'tool handler unavailable' }
      } catch (error) {
        result = { ok: false, code: 'tool_error', detail: String(error?.message || error) }
      }
      onActivity?.({
        kind: 'tool',
        summary: `指挥者调用 ${toolName}${result?.ok === false ? '（失败）' : ''}`,
        detail: { tool: toolName, ok: result?.ok !== false },
      })
      messages.push({
        role: 'tool',
        tool_call_id: tc.id || `call-${step}-${toolName}`,
        content: JSON.stringify(result ?? { ok: true }),
      })
    }
  }

  return { ok: true, text: finalText || '已完成本轮指挥调度（达到最大工具步数）', steps: maxSteps, history: messages.filter((m) => m.role !== 'system') }
}

export async function runExternalCommanderTurn({
  adapter,
  cwd,
  prompt,
  systemPrompt = '',
  tools = [],
  onToolCall,
  onActivity,
} = {}) {
  if (!adapter || typeof adapter.start !== 'function') {
    return { ok: false, code: 'unsupported_connector', detail: '外部指挥者连接器未注册' }
  }
  const composedPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n[用户 / 宿主指令]\n${prompt}`
    : prompt

  const handle = adapter.start({
    cwd,
    prompt: composedPrompt,
    sandbox: 'read-only',
    approvals: 'accept',
    ...(adapter.capabilities?.dynamicTools ? { dynamicTools: tools, onToolCall } : {}),
    onEvent: (event) => {
      if (event?.type === CONNECTOR_EVENT.outputMessage && event.text) {
        onActivity?.({ kind: 'output', summary: String(event.text).slice(0, 140), text: String(event.text) })
      }
    },
  })
  const out = await handle.completion
  if (!out?.ok) {
    return { ok: false, code: out?.status || 'failed', detail: out?.detail || '外部指挥者执行失败', text: out?.text || '' }
  }
  return { ok: true, text: out.text || '' }
}

/**
 * 将自定义 OpenAI 兼容 API 成员包装成与 Connector 一致的 Execution Handle，
 * 供 Runner 调度 Worker / Reviewer 使用。
 */
export function startApiMemberExecution({ member, prompt, dynamicTools = [], onToolCall, onEvent } = {}) {
  const emit = (event) => {
    try { onEvent?.(event) } catch { /* ignore */ }
  }
  let cancelled = false
  const completion = (async () => {
    emit({
      type: CONNECTOR_EVENT.started,
      nativeSessionRef: { backend: 'api', sessionId: null, model: member?.model || null },
    })
    const res = await runApiCommanderTurn({
      commander: member,
      prompt,
      tools: dynamicTools,
      onToolCall,
      onActivity: (act) => {
        if (act?.kind === 'output' && act.text) {
          emit({ type: CONNECTOR_EVENT.outputMessage, text: act.text })
        }
      },
    })
    if (cancelled) {
      return { ok: false, status: 'interrupted', detail: 'cancelled', text: res?.text || '' }
    }
    if (!res?.ok) {
      const detail = res?.detail || 'API 成员执行失败'
      emit({ type: CONNECTOR_EVENT.failed, detail })
      return { ok: false, status: 'failed', detail, text: res?.text || '' }
    }
    emit({ type: CONNECTOR_EVENT.completed, text: res.text || '' })
    return { ok: true, status: 'completed', text: res.text || '' }
  })()

  return {
    completion,
    async cancel() { cancelled = true },
    dispose() { cancelled = true },
  }
}
