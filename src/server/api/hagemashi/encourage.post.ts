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
      const { anthropicApiKey } = useRuntimeConfig()
      if (!anthropicApiKey) {
        throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
      }

      // Step 1: 文字起こし全文から要点を抽出（RAGの検索クエリとして使う）
      const bulletsRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey as string,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: `以下の発話内容から要点を箇条書きでまとめてください。
- 簡潔に、1行1項目で記載する
- 事実・感情・課題・状況を区別して整理する
- 余計なコメントや前置きは不要。箇条書きのみ返す
- 日本語で出力する`,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      const bulletsData = await bulletsRes.json().catch(() => null)
      const keyPoints = bulletsData?.content?.[0]?.text ?? userContent

      // Step 2: 要点でRAG検索 → 取得した文脈を活かして励ます
      const prompt = body.encouragePrompt || '話した内容を踏まえて、温かく励ましてください。'
      const data = await callOpenAi(apiKey, {
        model: 'gpt-4o',
        input: `${prompt}\n\nナレッジベースから以下の要点に関連する情報・事例・アドバイスを検索し、それを活かして励ましてください。返答は日本語で${body.charLimit ?? 500}文字程度にまとめること。\n\n【要点】\n${keyPoints}\n\n【記録全文】\n${userContent}`,
        tools: [{ type: 'file_search', vector_store_ids: [body.vectorStoreId] }],
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
