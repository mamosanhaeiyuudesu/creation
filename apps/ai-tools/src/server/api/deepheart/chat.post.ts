import { getDeepheartDb, getDeepheartUser, buildSystemPrompt, DEEPHEART_TONES, type DeepheartTone } from '~/server/utils/deepheart'
import { appendLog } from '~/server/utils/openai'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const extractTextDelta = (payload: any, sentAny: boolean) => {
  if (!payload || typeof payload !== 'object') return ''
  if (typeof payload.delta === 'string') return payload.delta
  if (typeof payload.text === 'string') {
    if (payload.type?.endsWith?.('.done') && sentAny) return ''
    return payload.text
  }
  if (typeof payload.output_text === 'string') {
    if (payload.type?.endsWith?.('.done') && sentAny) return ''
    return payload.output_text
  }
  return ''
}

export default defineEventHandler(async (event) => {
  const db = getDeepheartDb(event)
  const user = await getDeepheartUser(event)

  // DB があるのに未ログインならブロック（本番運用想定）
  if (db && !user) {
    throw createError({ statusCode: 401, message: '未ログイン' })
  }
  // DB も無い環境（ローカル dev で D1 バインディングが無い）は、認証・永続化をスキップ

  const body = await readBody<{ messages?: ChatMessage[]; tone?: string; systemPrompt?: string }>(event)
  const rawMessages = Array.isArray(body?.messages) ? body!.messages! : []
  const messages = rawMessages.filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()
  )

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'ユーザーメッセージが必要です' })
  }

  const latestUser = messages[messages.length - 1]

  // パーソナリティ決定：DB+ユーザーがあれば DB、なければリクエストボディから
  let tone: DeepheartTone = 'gentle'
  let systemPromptExtra = ''
  if (db && user) {
    const persona = await db
      .prepare('SELECT tone, system_prompt FROM deepheart_personalities WHERE user_id = ?')
      .bind(user.id)
      .first<{ tone: string; system_prompt: string }>()
    if (persona) {
      if ((DEEPHEART_TONES as readonly string[]).includes(persona.tone)) tone = persona.tone as DeepheartTone
      systemPromptExtra = persona.system_prompt ?? ''
    }
  } else {
    if ((DEEPHEART_TONES as readonly string[]).includes(body?.tone ?? '')) tone = body!.tone as DeepheartTone
    systemPromptExtra = (body?.systemPrompt ?? '').slice(0, 2000)
  }
  const systemPrompt = buildSystemPrompt(tone, systemPromptExtra)

  // 直近24件に制限（コンテキスト圧縮）
  const trimmed = messages.slice(-24)

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: systemPrompt }],
    },
    ...trimmed.map((m) => ({
      role: m.role,
      content: [{ type: 'input_text', text: m.content }],
    })),
  ]

  const apiKey = getOpenAiKey(event)

  try {
    const response = await fetchOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input,
      max_output_tokens: 800,
      stream: true,
    } as any, event)

    if (import.meta.dev) appendLog(event, '[OpenAI] gpt-4.1-mini | deepheart chat')

    if (!response.ok) {
      const data = await response.json().catch(() => null as any)
      throw createError({
        statusCode: response.status || 500,
        statusMessage: data?.error?.message || '返信の取得に失敗しました',
      })
    }
    if (!response.body) {
      throw createError({ statusCode: 502, statusMessage: '返信のストリームを取得できませんでした' })
    }

    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-cache, no-transform')
    setHeader(event, 'X-Accel-Buffering', 'no')
    setHeader(event, 'Connection', 'keep-alive')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const res = event.node.res
    let buffer = ''
    let sentAny = false
    let assembled = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine.startsWith('data:')) continue

        const data = trimmedLine.slice(5).trim()
        if (!data || data === '[DONE]') {
          if (db && user) await persistTurn(db, user.id, latestUser.content, assembled)
          res.end()
          return
        }

        let parsed: any = null
        try {
          parsed = JSON.parse(data)
        } catch {
          continue
        }

        const delta = extractTextDelta(parsed, sentAny)
        if (delta) {
          sentAny = true
          assembled += delta
          res.write(delta)
        }
      }
    }

    if (db && user) await persistTurn(db, user.id, latestUser.content, assembled)
    res.end()
    return
  } catch (err: any) {
    wrapApiError(err, '返信の取得に失敗しました')
  }
})

async function persistTurn(db: any, userId: string, userContent: string, assistantContent: string) {
  if (!userContent) return
  const now = new Date()
  const baseIso = now.toISOString().replace('T', ' ').replace('Z', '')
  const later = new Date(now.getTime() + 1).toISOString().replace('T', ' ').replace('Z', '')

  await db
    .prepare('INSERT INTO deepheart_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, 'user', userContent, baseIso)
    .run()

  if (assistantContent) {
    await db
      .prepare('INSERT INTO deepheart_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, 'assistant', assistantContent, later)
      .run()
  }
}
