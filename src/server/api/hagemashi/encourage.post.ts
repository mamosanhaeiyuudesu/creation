import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    texts: string[]
    encouragePrompt: string
    charLimit?: number
    vectorStoreId?: string
  }>(event)

  if (!body?.texts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'texts are required' })
  }

  const userContent = body.texts
    .map((t, i) => `【記録${i + 1}】\n${t}`)
    .join('\n\n')

  try {
    if (body.vectorStoreId) {
      const apiKey = getOpenAiKey()
      const ragInstructions = `${body.encouragePrompt || '話した内容を踏まえて、温かく励ましてください。'}

ナレッジベース（添付の知識ベース）を必ず参照し、ユーザーの状況に関連する情報・事例・アドバイスを検索したうえで励ましてください。
返答は日本語で${body.charLimit ?? 500}文字程度にまとめること。`
      const data = await callOpenAi(apiKey, {
        model: 'gpt-4o',
        instructions: ragInstructions,
        input: `以下のユーザーの記録を踏まえて励ましてください。\n\n${userContent}`,
        tools: [{ type: 'file_search', vector_store_ids: [body.vectorStoreId] }],
        tool_choice: 'required',
      }, event, 'hagemashi/encourage (RAG)')
      const text = extractText(data)
      return { result: text }
    }

    const { anthropicApiKey } = useRuntimeConfig()
    if (!anthropicApiKey) {
      throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `${body.encouragePrompt || '話した内容を踏まえて、温かく励ましてください。'}\n\n返答は日本語で${body.charLimit ?? 500}文字程度にまとめること。`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({
        statusCode: response.status,
        statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。',
      })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''
    return { result: text }
  } catch (err) {
    return wrapApiError(err, '励ましの生成に失敗しました')
  }
})
