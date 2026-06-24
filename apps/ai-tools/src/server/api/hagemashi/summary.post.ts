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
        max_tokens: 256,
        system: `以下の発話内容を分析し、JSONのみを返してください。
{
  "sentiment": "ポジ" または "ネガ",
  "text": "1〜2文の要約（何をした・何があったか＋気持ちを含む）"
}

ルール:
- sentiment は全体的にポジティブなら "ポジ"、ネガティブまたは辛い内容なら "ネガ"
- text は自然な日本語で1〜2文。前置きなし
- JSONのみ返す。余計な説明不要`,
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
    const raw = data?.content?.[0]?.text ?? ''
    // JSONパース検証してからnotesに渡す
    const parsed = JSON.parse(raw)
    const notes = JSON.stringify({ sentiment: parsed.sentiment ?? 'ポジ', text: parsed.text ?? '' })
    return { notes }
  } catch (err) {
    return wrapApiError(err, '中間データの生成に失敗しました')
  }
})
