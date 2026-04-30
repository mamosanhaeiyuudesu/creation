import { encryptMessage, decryptMessage } from './deepheart'
import { callOpenAi, extractText } from './openai'

export const MIN_MESSAGES_FOR_INSIGHT = 5
export const MAX_MESSAGES_FOR_INSIGHT = 200
export const INSIGHT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000

const BATCH_SIZE = 50

export interface InsightResult {
  concerns: string[]
  emotions: string[]
  patterns: string[]
  strengths: string[]
  hints: string[]
  nextStep: string
}

// Stage 1: バッチごとの要約プロンプト
const STAGE1_SYSTEM = `カウンセリングチャットにおけるユーザーの発言から、以下を簡潔に箇条書きで抽出してください（全体300字以内）：
・話題になった出来事・状況
・感じていた感情
・繰り返し現れたキーワードや表現

余計な説明は不要です。箇条書きのみ返してください。`

// Stage 2: 考察生成プロンプト
const STAGE2_SYSTEM = `以下は、あるユーザーのカウンセリングチャットを時系列順に複数期間に分けて要約したものです。
これらを踏まえ、心理的パターンの分析を以下のJSON形式で返してください。

各項目は箇条書き（string配列）で、1点あたり1〜2文。診断や判断はしないでください。
強みは必ず含め、nextStepは今週できる小さな一歩を1文で。
返答はJSONのみ（コードブロック不要）。

{
  "concerns": ["繰り返す悩みのテーマ（2〜4点）"],
  "emotions": ["感情パターン（2〜4点）"],
  "patterns": ["思考・行動のクセ（2〜4点）"],
  "strengths": ["強み・リソース（2〜3点）"],
  "hints": ["気づきのヒント（3点）"],
  "nextStep": "今週の一歩（1文）"
}`

async function summarizeBatch(
  messages: string[],
  batchIndex: number,
  totalMessages: number,
  apiKey: string
): Promise<string> {
  const start = batchIndex * BATCH_SIZE + 1
  const end = Math.min(start + messages.length - 1, totalMessages)
  const text = messages.map((m, i) => `[${start + i}] ${m}`).join('\n')

  const data = await callOpenAi(apiKey, {
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: STAGE1_SYSTEM }] as any },
      { role: 'user', content: [{ type: 'input_text', text: `発言${start}〜${end}件目:\n${text}` }] as any },
    ],
    max_output_tokens: 400,
  })

  return extractText(data) || ''
}

export async function generateInsight(
  userMessages: string[],
  apiKey: string
): Promise<InsightResult | null> {
  if (userMessages.length < MIN_MESSAGES_FOR_INSIGHT) return null

  const msgs = userMessages.slice(-MAX_MESSAGES_FOR_INSIGHT)

  // Stage 1: BATCH_SIZE件ずつ要約（並列実行）
  const batches: string[][] = []
  for (let i = 0; i < msgs.length; i += BATCH_SIZE) {
    batches.push(msgs.slice(i, i + BATCH_SIZE))
  }

  const summaries = await Promise.all(
    batches.map((batch, i) => summarizeBatch(batch, i, msgs.length, apiKey))
  )

  // Stage 2: 要約をまとめて考察生成
  const summaryText = summaries
    .map((s, i) => {
      const start = i * BATCH_SIZE + 1
      const end = Math.min(start + batches[i].length - 1, msgs.length)
      return `【${start}〜${end}件目】\n${s}`
    })
    .join('\n\n')

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: STAGE2_SYSTEM }] as any },
        { role: 'user', content: [{ type: 'input_text', text: summaryText }] as any },
      ],
      max_output_tokens: 800,
    })

    const text = extractText(data)
    if (!text) return null

    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean) as Partial<InsightResult>
    if (!Array.isArray(parsed.concerns) || !Array.isArray(parsed.hints) || !parsed.nextStep) return null

    return {
      concerns: parsed.concerns,
      emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      hints: parsed.hints.slice(0, 5),
      nextStep: parsed.nextStep,
    }
  } catch {
    return null
  }
}

export async function getUserMessageTexts(
  db: any,
  userId: string,
  encKey: string | null,
  limit = MAX_MESSAGES_FOR_INSIGHT
): Promise<string[]> {
  const res = await db
    .prepare(
      'SELECT content FROM deepheart_messages WHERE user_id = ? AND role = ? ORDER BY created_at DESC LIMIT ?'
    )
    .bind(userId, 'user', limit)
    .all<{ content: string }>()

  const rows = ((res.results ?? []) as { content: string }[]).reverse()
  return Promise.all(rows.map((r) => (encKey ? decryptMessage(r.content, encKey) : r.content)))
}

export async function saveInsight(
  db: any,
  userId: string,
  insight: InsightResult,
  messageCount: number,
  encKey: string | null
): Promise<{ id: string; createdAt: string }> {
  const id = crypto.randomUUID()
  const raw = JSON.stringify(insight)
  const content = encKey ? await encryptMessage(raw, encKey) : raw
  const createdAt = new Date().toISOString().replace('T', ' ').replace('Z', '')
  await db
    .prepare(
      'INSERT INTO deepheart_insights (id, user_id, content, message_count, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, userId, content, messageCount, createdAt)
    .run()
  return { id, createdAt }
}

export async function getLatestInsight(
  db: any,
  userId: string,
  encKey: string | null
): Promise<{ insight: InsightResult; createdAt: string; messageCount: number } | null> {
  const row = await db
    .prepare(
      'SELECT content, message_count, created_at FROM deepheart_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    )
    .bind(userId)
    .first<{ content: string; message_count: number; created_at: string }>()

  if (!row) return null

  try {
    const raw = encKey ? await decryptMessage(row.content, encKey) : row.content
    const insight = JSON.parse(raw) as InsightResult
    return { insight, createdAt: row.created_at, messageCount: row.message_count }
  } catch {
    return null
  }
}

export function isRefreshable(createdAt: string | null): boolean {
  if (!createdAt) return true
  const ts = new Date(createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T') + 'Z').getTime()
  return Date.now() - ts > INSIGHT_REFRESH_INTERVAL_MS
}
