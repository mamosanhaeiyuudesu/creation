import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'
import fileIds from '../../data/miyako-file-ids.json'

// "令和3年 第9回 定例会 2021-12-07〜2021-12-21" → "令和3年第9回定例会"
function normalizeKey(session: string): string {
  return session.replace(/\s/g, '').replace(/\d{4}-\d{2}-\d{2}.*/, '')
}

export default defineEventHandler(async (event) => {
  const { session, word, maxChars = 1000 } = await readBody<{ session: string; word: string; maxChars?: number }>(event)

  const apiKey = getOpenAiKey()
  const { miyakoVectorStoreId } = useRuntimeConfig()

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  const normalizedKey = normalizeKey(session)
  const fileId = (fileIds as Record<string, string>)[normalizedKey]

  if (!fileId) {
    throw createError({ statusCode: 404, statusMessage: `会期「${session}」のファイルが見つかりません。` })
  }

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: `議事録から「${word}」に関する議論を、議会に詳しくない一般市民でも理解できるよう以下の形式のMarkdownで回答してください。前置き・説明文・締めくくりは一切不要です。約${maxChars}文字で。

## 1. ○○について

**結論**: ～（最初に結論を1〜2文で簡潔に）

**議論の流れ**:
○○（最初の論点・発端）
↓
○○（次の展開）
↓
○○（最終的な到達点）

議題が複数ある場合は「## 2. ○○について」と同じ形式で続ける。議題名は具体的かつ簡潔に。`,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
        filters: { type: 'eq', key: 'session', value: normalizedKey },
      }],
    }, event, `miyako/search: ${normalizedKey} / ${word}`)

    return { summary: extractText(data) }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
