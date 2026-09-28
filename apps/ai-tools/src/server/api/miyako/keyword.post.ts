import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'

export default defineEventHandler(async (event) => {
  const { word } = await readBody<{ word: string }>(event)

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
      input: `宮古島市議会の議事録（2005年〜現在）をもとに、「${word}」というテーマがこの約20年間でどのように議論が変わってきたかを、時代の流れとして5つのフェーズに分けて解説してください。

以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。

{"phases":[{"era":"期間（西暦）","title":"このフェーズを表す短いタイトル","summary":"このフェーズの議論の変化を1〜2文で"}]}

条件：
- 必ず5フェーズ、古い順（最初が一番古い）に並べること
- eraは西暦で書くこと（「令和」「平成」は使わない）。例：「2005〜2009年」「2010〜2014年」
- titleは15字以内で、そのフェーズの議論の「変化・特徴」を表す言葉にすること（例：「問題の表面化」「政策として整備」「取り組みが本格化」「成果と見直し」「新たな局面へ」など）
- summaryは40〜70字で、議論がどう変わったかの流れが伝わるように書くこと
- 「${word}」に関する議論が少ない時期はその旨を正直に書いてよい
- 議会・行政の専門用語は普通の言葉に言い換え、中学生が読んでも意味が通じる平易な文章にすること` as any,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
      }],
    }, event, `miyako/keyword: ${word}`)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { phases: parsed.phases as { era: string; title: string; summary: string }[] }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
