/**
 * Web Connector（网页版 Agent 半自动接力适配器：ChatGPT / Claude / Gemini 等）。
 *
 * 设计原则：
 * - 不绕过登录/验证码，不依赖脆弱的页面抓取；
 * - 派发任务时在用户真实默认浏览器打开目标网页，同时在 Concerto 团队页生成「网页接力卡片」（复用 question.requested 通道），
 *   把完整 TaskAssignment 文本呈现给用户一键复制发给网页端 Agent，再把网页端回复粘贴回卡片提交，即可自动完成交付与后续验收流。
 */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { CONNECTOR_EVENT, CONNECTOR_CAPABILITY } from './contract.mjs'

function openInDefaultBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/d', '/s', '/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch { /* ignore headless environments */ }
}

function extractAnswerText(answer) {
  if (typeof answer === 'string') return answer.trim()
  if (!answer || typeof answer !== 'object') return ''
  if (typeof answer.text === 'string') return answer.text.trim()
  if (answer.answers && typeof answer.answers === 'object') {
    for (const val of Object.values(answer.answers)) {
      if (typeof val === 'string' && val.trim()) return val.trim()
      if (Array.isArray(val?.answers) && val.answers.length > 0) {
        return val.answers.map(String).join('\n').trim()
      }
      if (Array.isArray(val) && val.length > 0) {
        return val.map(String).join('\n').trim()
      }
    }
  }
  return ''
}

export function createWebAdapter({
  id,
  displayName,
  url,
  description = '',
  openBrowser = true,
} = {}) {
  return {
    id,
    displayName: displayName || id,
    protocol: 'web',
    description: description || `${displayName || id}（${url}）网页端接力模式`,
    capabilities: Object.freeze({
      [CONNECTOR_CAPABILITY.midTurnQuestion]: true,
      [CONNECTOR_CAPABILITY.nextTurnQuestion]: false,
      [CONNECTOR_CAPABILITY.approval]: false,
      [CONNECTOR_CAPABILITY.cancel]: true,
      [CONNECTOR_CAPABILITY.resume]: false,
      [CONNECTOR_CAPABILITY.dynamicTools]: false,
      [CONNECTOR_CAPABILITY.streaming]: false,
    }),

    async probe() {
      if (typeof url !== 'string' || !/^https?:\/\/\S+/.test(url.trim())) {
        return { ok: false, code: 'invalid_url', detail: '网页版 Agent 缺少有效 URL' }
      }
      return {
        ok: true,
        userAgent: `${displayName || id} (${url})`,
        url,
      }
    },

    start({ prompt, onEvent } = {}) {
      const emit = (event) => {
        try { onEvent?.(event) } catch { /* ignore */ }
      }
      const requestId = `web-handoff-${randomUUID().slice(0, 8)}`
      let settled = false
      let resolveWait

      const waitPromise = new Promise((resolve) => { resolveWait = resolve })

      const completion = (async () => {
        await Promise.resolve()
        emit({
          type: CONNECTOR_EVENT.started,
          nativeSessionRef: { backend: id, url },
        })
        if (openBrowser && process.env.CONCERTO_DISABLE_BROWSER_OPEN !== '1') {
          openInDefaultBrowser(url)
        }
        emit({
          type: CONNECTOR_EVENT.questionRequested,
          requestId,
          responseMode: 'same_turn',
          payload: {
            questions: [{
              id: 'web_reply',
              header: `${displayName || id} 网页接力`,
              question: `请将下方任务发给 ${displayName || id}（${url}），再把回复粘贴到此处提交：\n\n${String(prompt || '').slice(0, 3200)}`,
            }],
          },
        })

        const outcome = await waitPromise
        if (outcome.cancelled) {
          return { ok: false, status: 'interrupted', detail: 'cancelled', text: '' }
        }
        const text = outcome.text || ''
        if (!text) {
          emit({ type: CONNECTOR_EVENT.failed, detail: '网页接力未收到回复内容' })
          return { ok: false, status: 'failed', detail: '网页接力未收到回复内容', text: '' }
        }
        emit({ type: CONNECTOR_EVENT.outputMessage, text })
        emit({ type: CONNECTOR_EVENT.completed, text })
        return { ok: true, status: 'completed', text }
      })()

      return {
        completion,
        async respond(reqId, answer) {
          if (String(reqId) !== requestId || settled) {
            throw new Error('web handoff request is no longer pending')
          }
          settled = true
          resolveWait({ cancelled: false, text: extractAnswerText(answer) })
        },
        async cancel() {
          if (settled) return
          settled = true
          resolveWait({ cancelled: true })
        },
        dispose() {
          if (settled) return
          settled = true
          resolveWait({ cancelled: true })
        },
      }
    },
  }
}
