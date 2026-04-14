import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'
import fileIds from '../../data/miyako-file-ids.json'

// "令和3年 第9回 定例会 2021-12-07〜2021-12-21" → "令和3年第9回定例会"
function normalizeKey(session: string): string {
  return session.replace(/\s/g, '').replace(/\d{4}-\d{2}-\d{2}.*/, '')
}

export default defineEventHandler(async (event) => {
  const { session, sessions, word, maxChars = 1000 } = await readBody<{
    session?: string
    sessions?: string[]
    word: string
    maxChars?: number
  }>(event)

  const apiKey = getOpenAiKey(event)
  const { miyakoVectorStoreId } = useRuntimeConfig(event)

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  // 単一セッションまたは複数セッションのキーを正規化
  const rawSessions = sessions ?? (session ? [session] : [])
  if (!rawSessions.length) {
    throw createError({ statusCode: 400, statusMessage: 'session または sessions が必要です。' })
  }

  const normalizedKeys = rawSessions
    .map(normalizeKey)
    .filter(k => (fileIds as Record<string, string>)[k])

  if (!normalizedKeys.length) {
    throw createError({ statusCode: 404, statusMessage: '対象会期のファイルが見つかりません。' })
  }

  // OR フィルタ（1件なら eq、複数なら or）
  const sessionFilter = normalizedKeys.length === 1
    ? { type: 'eq', key: 'session', value: normalizedKeys[0] }
    : { type: 'or', filters: normalizedKeys.map(k => ({ type: 'eq', key: 'session', value: k })) }

  const isYearSearch = normalizedKeys.length > 1
  const contextLabel = isYearSearch
    ? `${normalizedKeys.length}件の会期にわたる議事録`
    : `「${normalizedKeys[0]}」の議事録`

  const logLabel = isYearSearch
    ? `miyako/search: ${normalizedKeys[0]}〜 (${normalizedKeys.length}件) / ${word}`
    : `miyako/search: ${normalizedKeys[0]} / ${word}`

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: `${contextLabel}から「${word}」に関する議論を、議会に詳しくない一般市民でも理解できるよう以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。約${maxChars}文字で。

{"topics":[{"title":"議題名（具体的かつ簡潔に）","conclusion":"結論を1〜2文で簡潔に","flow":["最初の論点・発端","次の展開","最終的な到達点"]}]}

議題が複数ある場合はtopics配列に追加する。flowは議論の流れを順番に配列で表す（3〜5要素）。`,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
        filters: sessionFilter,
      }],
    }, event, logLabel)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { topics: parsed.topics as { title: string; conclusion: string; flow: string[] }[] }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
