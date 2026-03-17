import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'
import { getDevDb } from '~/server/utils/miyako-dev'

const keywordCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 72 * 1000 // 72時間

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; sessionId: string; context?: string }>(event)
  if (!body?.keyword) throw createError({ statusCode: 400, statusMessage: 'keyword required' })

  const cacheKey = `${body.sessionId}::${body.keyword}`
  const cached = keywordCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const { db, dev, sample } = getDevDb(event)

  let excerpts: string

  if (dev) {
    const matched = sample.utterances
      .filter((u: any) => u.content.includes(body.keyword))
      .slice(0, 5)
      .map((u: any) => `${u.speaker_role ?? ''} ${u.speaker_name}（${u.utterance_type}）: ${u.content.substring(0, 300)}`)
    excerpts = matched.join('\n\n')
  } else {
    const utterancesResult = await db
      .prepare(
        `SELECT speaker_name, speaker_role, utterance_type, substr(content, 1, 300) as content
         FROM utterances
         WHERE session_id = ? AND content LIKE ?
         LIMIT 5`
      )
      .bind(body.sessionId, `%${body.keyword}%`)
      .all()

    excerpts = (utterancesResult.results as any[])
      .map((u) => `${u.speaker_role ?? ''} ${u.speaker_name}（${u.utterance_type}）: ${u.content}`)
      .join('\n\n')
  }

  const prompt = `宮古島市議会の議事録で「${body.keyword}」というキーワードが登場しました。

【会議での文脈】
${body.context ?? ''}

【関連する発言抜粋】
${excerpts || '（抜粋なし）'}

以下のJSON形式で回答してください：
{
  "what_discussed": "この会議でどのような文脈で話されたか（150字以内）",
  "general_explanation": "このキーワードの一般的な説明（150字以内）",
  "related_topics": ["関連する話題やキーワード（3〜5個）"]
}`

  try {
    const apiKey = getOpenAiKey()
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.3,
    }, event, 'キーワード検索')

    const text = extractText(data)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSONが返ってきませんでした')
    const result = JSON.parse(jsonMatch[0])

    keywordCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
    return result
  } catch (err) {
    return wrapApiError(err, 'キーワード説明の取得に失敗しました')
  }
})
