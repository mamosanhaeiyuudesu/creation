import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'

export default defineEventHandler(async (event) => {
  const { word, count = 3, model = 'gpt-4.1-mini' } = await readBody<{
    word: string
    count?: number
    model?: string
  }>(event)

  if (!word?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'word が必要です。' })
  }

  const apiKey = getOpenAiKey(event)
  const { miyakoVectorStoreId } = useRuntimeConfig()

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  try {
    const data = await callOpenAi(apiKey, {
      model,
      input: `全期間の議事録から「${word}」に関する議論を最大${count}件選んで、以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。約1000文字で。

{"topics":[{"title":"議題名（具体的かつ簡潔に）","period":"会期名（例：令和6年第8回定例会）","conclusion":"結論を1〜2文で簡潔に","flow":["最初の論点・発端","次の展開","最終的な到達点"]}]}

選び方の条件：
- なるべく異なるテーマ・切り口・争点の議論を選ぶこと（似た内容を重複させない）
- 同じ条件なら新しい会期を優先すること
flowは議論の流れを順番に配列で表す（3〜5要素）。` as any,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
      }],
    }, event, `miyako/keyword: ${word}`)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { topics: parsed.topics as { title: string; period: string; conclusion: string; flow: string[] }[] }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
