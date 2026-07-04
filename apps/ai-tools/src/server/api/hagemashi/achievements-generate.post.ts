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
        system: `以下の記録（日々の気持ち・状況の中間データ）を分析し、その人の「誰が見ても凄いと思う達成」だけをJSONで返してください。

形式:
{
  "achievements": [
    { "text": "達成した内容（短く簡潔に）", "level": 1〜5の整数 }
  ]
}

抽出ルール:
- 対象は「外的な尺度・客観的な成果があるもの」に限定する。例:
  - 子供が剣道の区大会で入賞した
  - 副業先が決まった
  - 転職活動で一次選考を突破した
  - 資格試験に合格した、大会・コンペで受賞した、昇進した、契約が取れた
- 日常の些細なこと（早起きできた、掃除した、気持ちが少し前向きになった等）は達成として扱わない。除外する
- 客観的に「凄い」と言える確かな成果が無ければ、無理に作らず achievements を空配列にする

記述ルール:
- text は必ず短く簡潔にする（体言止め・1文以内、20〜40字目安）。説明や背景は書かない
- level は達成の大きさを5段階で評価（1=ちょっとした成果、5=人生の節目レベルの大きな成果）
- 該当する達成が複数あれば複数エントリにする
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
