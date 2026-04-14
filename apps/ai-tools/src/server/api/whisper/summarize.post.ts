import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ texts: string[]; systemPrompt: string; vectorStoreId?: string }>(event)

  if (!body?.texts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'texts are required' })
  }

  const apiKey = getOpenAiKey(event)

  const userContent = body.texts
    .map((t, i) => `【文字起こし${i + 1}】\n${t}`)
    .join('\n\n')

  const payload: Record<string, any> = {
    model: 'gpt-4o',
    temperature: 0.3,
    instructions: body.systemPrompt || '要約してください',
    input: userContent,
  }

  if (body.vectorStoreId) {
    payload.tools = [{ type: 'file_search', vector_store_ids: [body.vectorStoreId] }]
  }

  try {
    const data = await callOpenAi(apiKey, payload, event, '要約生成')
    return { summary: extractText(data) }
  } catch (err) {
    return wrapApiError(err, '要約の生成に失敗しました')
  }
})
