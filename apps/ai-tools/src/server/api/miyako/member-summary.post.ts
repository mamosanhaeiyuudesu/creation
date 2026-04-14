import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'

export default defineEventHandler(async (event) => {
  const { speakerName, word, maxChars = 1000 } = await readBody<{
    speakerName: string
    word: string
    maxChars?: number
  }>(event)

  const apiKey = getOpenAiKey(event)
  const { miyakoVectorStoreId } = useRuntimeConfig(event)

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: `宮古島市議会の全議事録から「${speakerName}」議員が「${word}」について発言した内容を、議会に詳しくない一般市民でも理解できるよう以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。約${maxChars}文字で。

{"topics":[{"title":"議題名（具体的かつ簡潔に）","conclusion":"結論を1〜2文で簡潔に","flow":["最初の論点・発端","次の展開","最終的な到達点"]}]}

${speakerName}議員の発言に焦点を当てて回答してください。議題が複数ある場合はtopics配列に追加する。flowは議論の流れを順番に配列で表す（3〜5要素）。` as any,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
      }],
    } as any, event, `miyako/member-summary: ${speakerName} / ${word}`)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { topics: parsed.topics as { title: string; conclusion: string; flow: string[] }[] }
  } catch (e: any) {
    wrapApiError(e, '議員発言の検索に失敗しました。')
  }
})
