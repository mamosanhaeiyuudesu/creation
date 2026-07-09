import { wrapApiError } from '~/server/utils/openai'

interface SourceItem { date: string; text: string }

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; note?: string; items: SourceItem[] }>(event)

  if (!body?.keyword || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'keyword and items are required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const sourceText = body.items.map(i => `[${i.date}] ${i.text}`).join('\n')
  const noteContext = body.note ? `\n\n補足（「${body.keyword}」の意味合い）: ${body.note}` : ''

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 700,
        thinking: { type: 'disabled' },
        system: `あなたはユーザーの日々の記録（中間データ）を分析するアシスタントです。
ユーザーが選んだテーマ「${body.keyword}」に関連しそうな記録を日付つきで複数与えます。文字表記が完全一致しなくても、内容が意味的に関連していれば対象として扱ってください。中には無関係な記録も混ざっています。

手順:
1. 与えられた記録の中から「${body.keyword}」に意味的に関連するものだけを自分で判断して選び出す
2. 関連する記録が1件もなければ、出力は「関連する記録が見つかりませんでした。」の1文のみにする
3. 関連する記録が見つかったら、それらをもとに「${body.keyword}」についてどんな内容・変化があったかをまとめる

出力ルール:
- 関連記録が少ない場合（目安1〜2件）は自然な文章で2〜4文程度にまとめる
- 関連記録が多い場合は、必ず最大3つのフェーズ（段階）に集約し、次の形式で書く（1行目が最も古く、下に行くほど新しい）:
〇〇（日付）
↓
〇〇（日付）
↓
〇〇（日付）
- フェーズ数は多くても3つまで。細かく分割しすぎず、大きな流れとして集約する
- 各行は具体的で簡潔に（20〜40字程度）。日付は与えられたデータの日付表記をそのまま使う
- 出力はプレーンテキストのみ。JSON・マークダウン記法・見出し・前置きや説明は一切不要`,
        messages: [{ role: 'user', content: `${sourceText}${noteContext}` }],
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
    const summary = (data?.content?.[0]?.text ?? '').trim()
    return { summary }
  } catch (err) {
    return wrapApiError(err, 'AI分析の生成に失敗しました')
  }
})
