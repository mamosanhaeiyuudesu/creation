import { wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ text: string }>(event)

  if (!body?.text) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        system: `以下の発話内容を、1〜2文の自然な日本語でまとめてください。
- 何をした・何があったかという事実と、どんな気持ちだったかを含める
- 例：「今日はAIエージェントの長期記憶を実装した。思ったより複雑で疲れたが達成感があった。」
- 余計な前置きや説明は不要。本文のみ返す
- 日本語で出力する`,
        messages: [{ role: 'user', content: body.text }],
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
    const notes = data?.content?.[0]?.text ?? ''
    return { notes }
  } catch (err) {
    return wrapApiError(err, '中間データの生成に失敗しました')
  }
})
