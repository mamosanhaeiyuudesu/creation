import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface StrengthItem { title: string; content: string }
interface ProfileData {
  strengths: StrengthItem[] | string
  tendencies: StrengthItem[] | string
  advice: StrengthItem[] | string
  generatedAt?: string
}
interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS hagemashi_consult_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`

// プロフィール（長期傾向）を人物像テキストに整形する
function profileToText(p?: ProfileData | null): string {
  if (!p) return ''
  const fmt = (v: StrengthItem[] | string | undefined) =>
    Array.isArray(v) ? v.map(i => `・${i.title}: ${i.content}`).join('\n') : (v ?? '')
  const parts: string[] = []
  if (p.strengths) parts.push(`【強み】\n${fmt(p.strengths)}`)
  if (p.tendencies) parts.push(`【傾向】\n${fmt(p.tendencies)}`)
  if (p.advice) parts.push(`【これまでのアドバイス】\n${fmt(p.advice)}`)
  return parts.join('\n\n')
}

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ messages: ChatMessage[]; profile?: ProfileData | null; summaryItems?: SummaryItem[] }>(event)
  const rawMessages = Array.isArray(body?.messages) ? body.messages : []
  const messages = rawMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'ユーザーメッセージが必要です' })
  }
  const latestUser = messages[messages.length - 1]

  // --- ペルソナ層（プロフィール）＋ 直近層（中間データ 最新30件）---
  const personaText = profileToText(body.profile)
  const recent = (body.summaryItems ?? []).slice(0, 30)
  const recentText = recent.length
    ? recent.map(r => `[${r.date}][${r.sentiment}] ${r.text}`).join('\n')
    : '（記録なし）'

  const personaBlock = `# 相談相手の人物像
${personaText || '（プロフィール未生成）'}

# 直近の気持ち・状況の記録（中間データ・新しい順）
${recentText}`

  const systemPrompt = `あなたは相談者に寄り添うカウンセラーです。相談者は日々の出来事を録音して記録しており、別途その人物像と直近の記録が渡されます。
これらを踏まえ、相談者の状況・性格・傾向に合わせて、共感を示しつつ具体的で実行しやすいアドバイスを日本語で返してください。
- 決めつけず、相談者の言葉を尊重する
- 長すぎず、会話のテンポを保つ（必要に応じて問いかけも交える）
- 記録から読み取れる強みを自然に活かす`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        stream: true,
        // 人物像ブロックは毎ターン同じなので prompt caching でトークンを節約する
        system: [
          { type: 'text', text: systemPrompt },
          { type: 'text', text: personaBlock, cache_control: { type: 'ephemeral' } },
        ],
        messages: messages.map(m => ({ role: m.role, content: m.content })),
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

    if (db && user) await persistTurn(db, user.id, latestUser.content, assembled)
    res.end()
    return
  } catch (err) {
    wrapApiError(err, '返信の取得に失敗しました')
  }
})

async function persistTurn(db: any, userId: string, userContent: string, assistantContent: string) {
  if (!userContent) return
  await db.prepare(CREATE_TABLE).run()

  const now = new Date()
  const baseIso = now.toISOString().replace('T', ' ').replace('Z', '')
  const later = new Date(now.getTime() + 1).toISOString().replace('T', ' ').replace('Z', '')

  await db
    .prepare('INSERT INTO hagemashi_consult_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, 'user', userContent, baseIso)
    .run()

  if (assistantContent) {
    await db
      .prepare('INSERT INTO hagemashi_consult_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, 'assistant', assistantContent, later)
      .run()
  }
}
