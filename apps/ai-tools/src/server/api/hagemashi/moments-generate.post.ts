import { wrapApiError } from '~/server/utils/openai'

// できごと（Moment）のタグ。ポジ4→3（強みは廃止）、ネガ2の計5種。
const KINDS = ['達成', '感謝', '喜び', 'しんどさ', '不安'] as const
type Kind = typeof KINDS[number]

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
        max_tokens: 1500,
        system: `以下は、ある人の1回分の記録（その日の気持ち・状況を短文に分解した中間データ）です。
各行の先頭の [ポジ] / [ネガ] は、その人自身が付けた感情の向きです。
この記録から「その日にあった具体的なできごと」を抜き出し、JSONで返してください。

形式:
{
  "moments": [
    { "kind": "達成", "text": "できごとの内容（短く）", "impact": 1〜5の整数, "who": "相手（感謝のときだけ・任意）" }
  ]
}

kind は必ず次の5つから選ぶ:
- 達成 … 自分が成し遂げたこと、やり切ったこと
- 感謝 … 人からしてもらったこと、支えられたこと、優しくされたこと
- 喜び … 達成でも感謝でもない、単に嬉しかった・楽しかった・気持ちよかったこと
- しんどさ … 負荷、疲れ、苛立ち、怒り
- 不安 … 先の見えなさ、心配、迷い

impact（大きさ）のルール:
- 「その人にとってどれだけ大きなできごとだったか」を主観的に1〜5で評価する
- 世間から見て凄いかどうかでは判断しない。日常の小さなことも 1〜2 として必ず拾う（切り捨てない）
- 3 = その週で印象に残る程度、5 = 人生の節目レベル
- ネガも同じ尺度の大きさで付ける（マイナスにはしない）

text のルール:
- 20〜40字程度の短い1文または体言止め。説明や背景、感想の一般論は書かない
- 記録に書かれていないことを推測で足さない
- 「〜と感じた」だけの心情は、できごとが伴わないなら拾わない

その他:
- who は感謝のときだけ、記録から相手が分かる場合に入れる（「妻」「同僚」など）。分からなければ省略する
- 同じできごとの言い換えは1件にまとめる。1回の記録から多くても6件程度まで
- 該当が無ければ moments を空配列にする
- JSONのみ返す。余計な説明は不要`,
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

    const moments = Array.isArray(parsed.moments)
      ? parsed.moments
          .map((m: { kind?: string; text?: string; impact?: number; who?: string }) => ({
            kind: (KINDS as readonly string[]).includes(m.kind ?? '') ? (m.kind as Kind) : null,
            text: (m.text ?? '').trim(),
            impact: Math.min(5, Math.max(1, Math.round(Number(m.impact) || 1))),
            who: (m.who ?? '').trim() || undefined,
          }))
          .filter((m: { kind: Kind | null; text: string }) => m.kind && m.text)
      : []

    return { moments }
  } catch (err) {
    return wrapApiError(err, 'できごとの抽出に失敗しました')
  }
})
