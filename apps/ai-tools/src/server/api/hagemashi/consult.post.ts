import type { H3Event } from 'h3'
import { getSessionUser } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'
import { wrapApiError } from '~/server/utils/openai'
import { toJSTDate } from '~/utils/jst'

interface StrengthItem { title: string; content: string }
interface ProfileData {
  strengths: StrengthItem[] | string
  advice: StrengthItem[] | string
  generatedAt?: string
}
interface KokoroLeaf { name: string; note: string }
interface KokoroData {
  charge: KokoroLeaf[]
  stress: KokoroLeaf[]
  summary?: string
  generatedAt?: string
}
interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface AchievementItem { text: string; level: number; date?: string }
interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }

// JST の日時を「2026/5/13(火) 14:30」形式に整形する
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
function formatTs(iso: string): string {
  const d = toJSTDate(iso)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  const da = d.getUTCDate()
  const w = WEEKDAYS[d.getUTCDay()]
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${y}/${mo}/${da}(${w}) ${h}:${mi}`
}

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
  if (p.advice) parts.push(`【これまでのアドバイス】\n${fmt(p.advice)}`)
  return parts.join('\n\n')
}

// 心の状態（最新の charge/stress）を人物像テキストに整形する
function kokoroToText(k?: KokoroData | null): string {
  if (!k) return ''
  const fmt = (v: KokoroLeaf[] | undefined) =>
    Array.isArray(v) && v.length ? v.map(l => `・${l.name}${l.note ? `（${l.note}）` : ''}`).join('\n') : ''
  const parts: string[] = []
  const charge = fmt(k.charge)
  const stress = fmt(k.stress)
  if (charge) parts.push(`【心のチャージ源（支え）】\n${charge}`)
  if (stress) parts.push(`【心のストレス源（負担）】\n${stress}`)
  if (k.summary) parts.push(`【心の状態の総評】\n${k.summary}`)
  return parts.join('\n\n')
}

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ messages: ChatMessage[]; profile?: ProfileData | null; kokoro?: KokoroData | null; summaryItems?: SummaryItem[]; achievements?: AchievementItem[]; vision?: string }>(event)
  const rawMessages = Array.isArray(body?.messages) ? body.messages : []
  const messages = rawMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'ユーザーメッセージが必要です' })
  }
  const latestUser = messages[messages.length - 1]

  // --- ペルソナ層（プロフィール＋心の状態）＋ 直近層（中間データ 最新30件）---
  const personaText = [profileToText(body.profile), kokoroToText(body.kokoro)].filter(Boolean).join('\n\n')
  const recent = (body.summaryItems ?? []).slice(0, 30)
  const recentText = recent.length
    ? recent.map(r => `[${r.date}][${r.sentiment}] ${r.text}`).join('\n')
    : '（記録なし）'

  // 達成リスト（客観的な成果）。レベルの高い順に並べて渡す
  const achievements = (body.achievements ?? [])
    .filter(a => a && typeof a.text === 'string' && a.text.trim())
    .sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0))
    .slice(0, 30)
  const achievementsText = achievements.length
    ? achievements.map(a => `・[Lv${Math.min(5, Math.max(1, Math.round(Number(a.level) || 1)))}]${a.date ? `[${a.date}]` : ''} ${a.text}`).join('\n')
    : '（記録なし）'

  const visionText = body.vision?.trim()

  const personaBlock = `# 相談相手の人物像
${personaText || '（プロフィール未生成）'}
${visionText ? `\n# 相談者が目指しているビジョン\n${visionText}\n` : ''}
# これまでの達成（客観的な成果・レベルが高い順）
${achievementsText}

# 直近の気持ち・状況の記録（中間データ・新しい順）
${recentText}`

  const nowIso = new Date().toISOString()
  const systemPrompt = `あなたは相談者に寄り添うカウンセラーです。相談者は日々の出来事を録音して記録しており、別途その人物像と直近の記録が渡されます。
これらを踏まえ、相談者の状況・性格・傾向に合わせて、共感を示しつつ具体的で実行しやすいアドバイスを日本語で返してください。
- 決めつけず、相談者の言葉を尊重する
- 長すぎず、会話のテンポを保つ（必要に応じて問いかけも交える）
- 記録から読み取れる強みを自然に活かす
- 相談者が自信を失っているときは、これまでの達成（客観的な成果）を具体的に引き合いに出して勇気づける。ただし押し付けがましくならないよう自然に触れる
${visionText ? '- 相談者が目指しているビジョンが渡されている場合は、そのビジョンを念頭に置き、相談内容がビジョンにどうつながるかを自然に意識した返答をする。ただし毎回無理に持ち出さず、話の流れに合うときだけ触れる' : ''}

# 日時について
現在の日時は ${formatTs(nowIso)}（日本時間）です。
各ユーザー発言の先頭には [送信日時] が付いています。相談は複数の日にまたがることがあるため、発言ごとの日時差（何日前の話か、時間帯、曜日など）を必ず考慮して返信してください。過去の発言を今日のことと混同しないこと。「今日」「さっき」「昨日」などの時間表現は、その発言の送信日時と現在日時を基準に解釈してください。`

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
        max_tokens: 1024,
        stream: true,
        thinking: { type: 'disabled' },
        // 人物像ブロックは毎ターン同じなので prompt caching でトークンを節約する
        system: [
          { type: 'text', text: systemPrompt },
          { type: 'text', text: personaBlock, cache_control: { type: 'ephemeral' } },
        ],
        // ユーザー発言には送信日時を付与し、AIが日付・時間を考慮できるようにする
        // （最新のユーザー発言はタイムスタンプ未付与のため現在時刻を用いる）
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

    if (db && user) await persistTurn(event, db, user.id, latestUser.content, assembled)
    res.end()
    return
  } catch (err) {
    wrapApiError(err, '返信の取得に失敗しました')
  }
})

async function persistTurn(event: H3Event, db: any, userId: string, userContent: string, assistantContent: string) {
  if (!userContent) return
  await db.prepare(CREATE_TABLE).run()

  const now = new Date()
  const baseIso = now.toISOString().replace('T', ' ').replace('Z', '')
  const later = new Date(now.getTime() + 1).toISOString().replace('T', ' ').replace('Z', '')

  const storedUserContent = await encryptComment(event, userContent)
  await db
    .prepare('INSERT INTO hagemashi_consult_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, 'user', storedUserContent, baseIso)
    .run()

  if (assistantContent) {
    const storedAssistantContent = await encryptComment(event, assistantContent)
    await db
      .prepare('INSERT INTO hagemashi_consult_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, 'assistant', storedAssistantContent, later)
      .run()
  }
}
