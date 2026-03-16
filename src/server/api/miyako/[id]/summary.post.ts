import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'
import { getDevDb } from '~/server/utils/miyako-dev'

const CATEGORIES = [
  '予算・財政',
  '条例・規則',
  '福祉・医療・子育て',
  '教育・文化',
  '建設・インフラ',
  '観光・産業・農業',
  '人事・委員会',
  '指定管理者',
  '一般質問',
  '報告・手続き',
]

// セッションIDをキーにしたメモリキャッシュ
const summaryCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 24 * 1000 // 24時間

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: 'session id required' })

  // キャッシュ確認
  const cached = summaryCache.get(sessionId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const { db, dev, sample } = getDevDb(event)

  let sessionRow: any
  let bills: any[]
  let utterances: any[]

  if (dev) {
    if (sample.session.session_id !== sessionId) {
      throw createError({ statusCode: 404, statusMessage: '会期が見つかりません' })
    }
    sessionRow = sample.session
    bills = sample.bills
    utterances = sample.utterances
      .filter((u: any) => ['質問', '答弁', '討論'].includes(u.utterance_type))
      .map((u: any) => ({ ...u, content: u.content.substring(0, 250) }))
  } else {
    const [sRow, billsResult, utterancesResult] = await Promise.all([
      db.prepare(`SELECT * FROM sessions WHERE session_id = ?`).bind(sessionId).first(),
      db
        .prepare(
          `SELECT bill_id, bill_number, bill_title, proposer, result FROM bills WHERE session_id = ? ORDER BY bill_id`
        )
        .bind(sessionId)
        .all(),
      db
        .prepare(
          `SELECT u.bill_id, u.speaker_name, u.speaker_role, u.utterance_type,
                  substr(u.content, 1, 250) as content
           FROM utterances u
           WHERE u.session_id = ?
             AND u.utterance_type IN ('質問','答弁','討論')
           ORDER BY u.seq`
        )
        .bind(sessionId)
        .all(),
    ])

    if (!sRow) throw createError({ statusCode: 404, statusMessage: '会期が見つかりません' })
    sessionRow = sRow
    bills = billsResult.results as any[]
    utterances = utterancesResult.results as any[]
  }

  // 議案ごとに発言をグループ化し、各議案から最大6件に絞る
  const billMap = new Map<string | null, any[]>()
  for (const u of utterances) {
    const key = u.bill_id ?? '__general__'
    if (!billMap.has(key)) billMap.set(key, [])
    const list = billMap.get(key)!
    if (list.length < 6) list.push(u)
  }

  // プロンプト用テキスト構築
  const billsText = bills
    .map((b) => `[${b.bill_number}] ${b.bill_title}（${b.proposer ?? ''}）→ ${b.result ?? '審議中'}`)
    .join('\n')

  const utterancesText = [...billMap.entries()]
    .map(([key, us]) => {
      const label = key === '__general__' ? '【一般質問・その他】' : `【議案: ${key}】`
      const lines = us.map((u) => `  ${u.speaker_role ?? ''} ${u.speaker_name}（${u.utterance_type}）: ${u.content}`)
      return `${label}\n${lines.join('\n')}`
    })
    .join('\n\n')

  const prompt = `あなたは宮古島市議会の議事録を分析するアシスタントです。
以下の議事録データを分析し、JSON形式で返答してください。

# 会議情報
名称: ${sessionRow.session_name}
開会日: ${sessionRow.session_date}
種別: ${sessionRow.session_type}

# 議案一覧
${billsText}

# 主な発言（抜粋）
${utterancesText}

# 返答フォーマット（JSON）
以下のJSONスキーマで返答してください。余計な文章は不要です。

{
  "overview": "会議全体の要約（200字以内）",
  "flow": "議論の流れの説明（箇条書き、5〜8項目）",
  "categories": [
    {
      "name": "カテゴリ名（${CATEGORIES.join(' / ')} のいずれか）",
      "summary": "このカテゴリの議論内容の要約（150字以内）",
      "bills": ["議案番号や議題名"],
      "decisions": ["決定・結論の要点"]
    }
  ],
  "keywords": [
    {
      "word": "キーワード",
      "context": "この会議での文脈（80字以内）",
      "explanation": "一般的な説明（100字以内）"
    }
  ]
}

categoriesは実際に議論があったカテゴリのみ含めてください（最大8個）。
keywordsは重要なものを8〜12個抽出してください。`

  try {
    const apiKey = getOpenAiKey()
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4o',
      input: prompt,
      temperature: 0.3,
    })

    const text = extractText(data)
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSONが返ってきませんでした')
    const result = JSON.parse(jsonMatch[0])

    summaryCache.set(sessionId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
    return result
  } catch (err) {
    return wrapApiError(err, 'AI要約の生成に失敗しました')
  }
})
