import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ texts: string[]; encouragePrompt: string }>(event)

  if (!body?.texts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'texts are required' })
  }

  const apiKey = getOpenAiKey()

  const userContent = body.texts
    .map((t, i) => `【記録${i + 1}】\n${t}`)
    .join('\n\n')

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4o',
      temperature: 0.7,
      instructions: body.encouragePrompt || '話した内容を踏まえて、温かく励ましてください。',
      input: userContent,
    }, event, '励まし生成')
    return { result: extractText(data) }
  } catch (err) {
    return wrapApiError(err, '励ましの生成に失敗しました')
  }
})
