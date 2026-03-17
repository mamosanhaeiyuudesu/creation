import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'
import { getDevDb } from '~/server/utils/miyako-dev'

const billCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 24 * 1000 // 24時間

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) throw createError({ statusCode: 400, statusMessage: 'session id required' })

  const body = await readBody<{ billId: string }>(event)
  if (!body?.billId) throw createError({ statusCode: 400, statusMessage: 'billId required' })

  const cacheKey = `${sessionId}::${body.billId}`
  const cached = billCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const { db, dev, sample } = getDevDb(event)

  let bill: any
  let utterances: any[]

  if (dev) {
    bill = sample.bills.find((b: any) => b.bill_id === body.billId)
    if (!bill) throw createError({ statusCode: 404, statusMessage: '議案が見つかりません' })
    utterances = sample.utterances
      .filter((u: any) => u.bill_id === body.billId && ['質問', '答弁', '討論'].includes(u.utterance_type))
      .map((u: any) => ({ ...u, content: u.content.substring(0, 400) }))
  } else {
    const [billRow, utterancesResult] = await Promise.all([
      db.prepare(`SELECT * FROM bills WHERE bill_id = ? AND session_id = ?`).bind(body.billId, sessionId).first(),
      db
        .prepare(
          `SELECT speaker_name, speaker_role, utterance_type, substr(content, 1, 400) as content
           FROM utterances
           WHERE bill_id = ? AND session_id = ?
             AND utterance_type IN ('質問','答弁','討論')
           ORDER BY seq`
        )
        .bind(body.billId, sessionId)
        .all(),
    ])
    if (!billRow) throw createError({ statusCode: 404, statusMessage: '議案が見つかりません' })
    bill = billRow
    utterances = utterancesResult.results as any[]
  }

  const utterancesText = utterances.length
    ? utterances
        .map((u) => `${u.speaker_role ?? ''} ${u.speaker_name}（${u.utterance_type}）: ${u.content}`)
        .join('\n\n')
    : '（発言記録なし）'

  const prompt = `宮古島市議会の議事録を分析してください。

# 議案情報
番号: ${bill.bill_number}
タイトル: ${bill.bill_title}
提案者: ${bill.proposer ?? '不明'}
審議結果: ${bill.result ?? '審議中'}
採決方法: ${bill.result_method ?? '不明'}

# 発言抜粋
${utterancesText}

以下のJSON形式で回答してください：
{
  "summary": "この議案の概要と主な議論内容（200字以内）",
  "points": ["議論の主なポイント（3〜5項目）"],
  "background": "この議案の背景や目的（150字以内）",
  "outcome": "審議の経緯と結果の説明（100字以内）"
}`

  try {
    const apiKey = getOpenAiKey()
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.3,
    }, event, '議案分析')

    const text = extractText(data)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSONが返ってきませんでした')
    const result = JSON.parse(jsonMatch[0])

    billCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
    return result
  } catch (err) {
    return wrapApiError(err, '議案要約の生成に失敗しました')
  }
})
