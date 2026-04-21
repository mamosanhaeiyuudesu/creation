import { getDeepheartDb, getDeepheartUser, getDeepheartEncryptionKey, encryptMessage, buildSystemPrompt, DEEPHEART_TONES, RESPONSE_LENGTH_TOKENS, type DeepheartTone } from '~/server/utils/deepheart'
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

  if (db && !user) {
    throw createError({ statusCode: 401, message: '未ログイン' })
  }

  const body = await readBody<{ messages?: ChatMessage[]; tone?: string; systemPrompt?: string; responseLength?: number }>(event)
  const rawMessages = Array.isArray(body?.messages) ? body!.messages! : []
  const messages = rawMessages.filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()
  )

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'ユーザーメッセージが必要です' })
  }

  const latestUser = messages[messages.length - 1]

  let tone: DeepheartTone = 'listen'
  let systemPromptExtra = ''
  let responseLength = 3

  if (db && user) {
    const persona = await db
      .prepare('SELECT tone, system_prompt, response_length FROM deepheart_personalities WHERE user_id = ?')
      .bind(user.id)
      .first<{ tone: string; system_prompt: string; response_length: number }>()
    if (persona) {
      if ((DEEPHEART_TONES as readonly string[]).includes(persona.tone)) tone = persona.tone as DeepheartTone
      systemPromptExtra = persona.system_prompt ?? ''
      responseLength = persona.response_length ?? 3
    }
  } else {
    if ((DEEPHEART_TONES as readonly string[]).includes(body?.tone ?? '')) tone = body!.tone as DeepheartTone
    systemPromptExtra = (body?.systemPrompt ?? '').slice(0, 2000)
    responseLength = Math.min(5, Math.max(1, Number(body?.responseLength) || 3))
  }

  const systemPrompt = buildSystemPrompt(tone, systemPromptExtra)
  const maxTokens = RESPONSE_LENGTH_TOKENS[responseLength] ?? 400

  const trimmed = messages.slice(-24)

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: systemPrompt }],
    },
    ...trimmed.map((m) => ({
      role: m.role,
      content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }],
    })),
  ]

  const encKey = getDeepheartEncryptionKey(event)
  const apiKey = getOpenAiKey(event)

  try {
    const response = await fetchOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input,
      max_output_tokens: maxTokens,
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
          if (db && user) await persistTurn(db, user.id, latestUser.content, assembled, encKey)
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

    if (db && user) await persistTurn(db, user.id, latestUser.content, assembled, encKey)
    res.end()
    return
  } catch (err: any) {
    wrapApiError(err, '返信の取得に失敗しました')
  }
})

async function persistTurn(db: any, userId: string, userContent: string, assistantContent: string, encKey: string | null) {
  if (!userContent) return
  const now = new Date()
  const baseIso = now.toISOString().replace('T', ' ').replace('Z', '')
  const later = new Date(now.getTime() + 1).toISOString().replace('T', ' ').replace('Z', '')

  const storedUser = encKey ? await encryptMessage(userContent, encKey) : userContent

  await db
    .prepare('INSERT INTO deepheart_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, 'user', storedUser, baseIso)
    .run()

  if (assistantContent) {
    const storedAssistant = encKey ? await encryptMessage(assistantContent, encKey) : assistantContent
    await db
      .prepare('INSERT INTO deepheart_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, 'assistant', storedAssistant, later)
      .run()
  }
}
