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
        max_tokens: 1024,
        system: `以下の発話内容を分析し、重要なポイントをJSONで返してください。

形式:
{
  "items": [
    { "sentiment": "ポジ" または "ネガ", "text": "具体的な内容（1〜3文）" }
  ]
}

ルール:
- 発話内容から意味のある情報・出来事・気持ちを全て抽出し、ポイントごとに1エントリ作る
- 各テキストは具体的で詳しく書く（1〜3文）。抽象的なまとめ方はしない
- トピックや気持ちが複数あれば複数エントリにする（制限なし）
- 「えー」「うーん」など内容のない発話だけの場合は items を空配列にする
- sentiment はそのポイントがポジティブなら "ポジ"、ネガティブ・辛い内容なら "ネガ"
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
    const stripped = raw.replace(/```(?:json)?/g, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : stripped)

    // 新形式: { items: [...] }
    if (Array.isArray(parsed.items)) {
      const notes = JSON.stringify({ items: parsed.items.map((item: { sentiment?: string; text?: string }) => ({
        sentiment: item.sentiment === 'ポジ' ? 'ポジ' : 'ネガ',
        text: item.text ?? '',
      })).filter((item: { text: string }) => item.text) })
      return { notes }
    }

    // フォールバック: 旧形式
    const notes = JSON.stringify({ sentiment: parsed.sentiment ?? 'ポジ', text: parsed.text ?? '' })
    return { notes }
  } catch (err) {
    return wrapApiError(err, '中間データの生成に失敗しました')
  }
})
