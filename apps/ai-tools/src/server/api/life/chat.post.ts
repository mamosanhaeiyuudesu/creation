import type { H3Event } from 'h3'
import { getSessionUser } from '~/server/utils/auth'
import { isLifeGoogleConnected, appendThemeRows } from '~/server/utils/life-google'
import { buildLifeSystemPrompt, formatTs } from '~/server/utils/life-chat'
import { findLifeTheme } from '~/utils/life-themes'
import { wrapApiError } from '~/server/utils/openai'

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '未ログイン' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ themeId: string; messages: ChatMessage[] }>(event)
  const theme = findLifeTheme(body?.themeId ?? '')
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'テーマが見つかりません' })

  if (!(await isLifeGoogleConnected(event, user.id))) {
    throw createError({ statusCode: 400, statusMessage: 'Googleと連携してください' })
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : []
  const messages = rawMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'ユーザーメッセージが必要です' })
  }
  const latestUser = messages[messages.length - 1]
  const nowIso = new Date().toISOString()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        stream: true,
        thinking: { type: 'disabled' },
        system: buildLifeSystemPrompt(theme),
        // ユーザー発言には送信日時を付与し、AIが会話の間隔を考慮できるようにする
        messages: messages.map((m, idx) => {
          if (m.role !== 'user') return { role: m.role, content: m.content }
          const iso = m.timestamp || (idx === messages.length - 1 ? nowIso : null)
          const prefix = iso ? `[${formatTs(iso)}] ` : ''
          return { role: 'user', content: `${prefix}${m.content}` }
        }),
      }),
    })

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status || 502, statusMessage: err?.error?.message || '返信の取得に失敗しました' })
    }

    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setHeader(event, 'X-Accel-Buffering', 'no')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const res = event.node.res
    let buffer = ''
    let assembled = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const data = t.slice(5).trim()
        if (!data || data === '[DONE]') continue

        let parsed: any = null
        try { parsed = JSON.parse(data) } catch { continue }

        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta.text) {
          assembled += parsed.delta.text
          res.write(parsed.delta.text)
        }
      }
    }

    try {
      await persistTurn(event, user.id, theme.sheetName, latestUser.content, assembled, nowIso)
    } catch (e) {
      // スプレッドシートへの保存に失敗しても、既に画面に出た返答自体は失わせない
      console.error('[life/chat] スプレッドシートへの保存に失敗:', e)
    }
    res.end()
    return
  } catch (err) {
    wrapApiError(err, '返信の取得に失敗しました')
  }
})

async function persistTurn(event: H3Event, userId: string, sheetName: string, userContent: string, assistantContent: string, nowIso: string): Promise<void> {
  if (!userContent) return
  const rows: { role: 'user' | 'assistant'; content: string; timestamp: string }[] = [
    { role: 'user', content: userContent, timestamp: formatTs(nowIso) },
  ]
  if (assistantContent) rows.push({ role: 'assistant', content: assistantContent, timestamp: formatTs(nowIso) })
  await appendThemeRows(event, userId, sheetName, rows)
}
