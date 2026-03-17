import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    text: string
    dictionary: { input: string; output: string }[]
  }>(event)

  if (!body?.text) throw createError({ statusCode: 400, statusMessage: 'text required' })

  const entries = (body.dictionary ?? []).filter((d) => d.input)
  if (!entries.length) return { text: body.text }

  const apiKey = getOpenAiKey()

  const dictText = entries.map((d) => `- "${d.input}" → "${d.output}"`).join('\n')

  const prompt = `以下の文字起こしテキストを辞書に従って校正してください。辞書に登録されていない部分はそのまま保持してください。校正後のテキストのみ出力してください。

辞書:
${dictText}

テキスト:
${body.text}`

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0,
    }, event, '文字起こし校正')
    return { text: extractText(data) || body.text }
  } catch (err) {
    return wrapApiError(err, '校正に失敗しました')
  }
})
