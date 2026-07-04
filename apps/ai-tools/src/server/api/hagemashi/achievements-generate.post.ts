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
        system: `以下の記録（日々の気持ち・状況の中間データ）を分析し、その人が「達成したこと」をJSONで返してください。

形式:
{
  "achievements": [
    { "text": "達成した具体的な内容（1〜2文）", "level": 1〜5の整数 }
  ]
}

ルール:
- 記録の中から「成し遂げたこと」「できるようになったこと」「乗り越えたこと」「前進したこと」を達成として抽出する
- level は達成の「大きさ・インパクト」を5段階で評価する（1=ささやかな達成、5=人生の節目レベルの大きな達成）
- 各 text は具体的に書く。抽象的なまとめ方はしない
- 達成が複数あれば複数エントリにする（制限なし）
- 達成と呼べる内容が無い場合は achievements を空配列にする
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

    const achievements = Array.isArray(parsed.achievements)
      ? parsed.achievements
          .map((a: { text?: string; level?: number }) => ({
            text: a.text ?? '',
            level: Math.min(5, Math.max(1, Math.round(Number(a.level) || 1))),
          }))
          .filter((a: { text: string }) => a.text)
      : []

    return { achievements }
  } catch (err) {
    return wrapApiError(err, '達成リストの生成に失敗しました')
  }
})
