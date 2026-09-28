import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'

export default defineEventHandler(async (event) => {
  const { word, count = 3 } = await readBody<{ word: string; count?: number; model?: string }>(event)

  if (!word?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'word が必要です。' })
  }

  const apiKey = getOpenAiKey(event)
  const { miyakoVectorStoreId } = useRuntimeConfig(event)

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: `宮古島市議会の議事録（2005年〜現在）の中で、「${word}」というキーワードが議論された定例会を最大${count}件、重要度の高い順に取り上げて、それぞれの議論内容を教えてください。

以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。

{"topics":[{"title":"議題または政策のタイトル","period":"定例会の時期（西暦で書くこと。例：2019年第3回定例会）","conclusion":"この定例会での議論の要点・結論を1〜2文で","flow":["主な議論の流れの1つ目","主な議論の流れの2つ目","主な議論の流れの3つ目"]}]}

条件：
- periodは西暦で書くこと（「令和」「平成」は使わない）
- conclusionは議論の核心を端的に
- flowは箇条書きで3〜4点、具体的な内容を書くこと
- 「${word}」に関する議論が見つからない場合は空配列を返す` as any,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
      }],
    }, event, `miyako/topics: ${word}`)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { topics: parsed.topics as { title: string; period: string; conclusion: string; flow: string[] }[] }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
