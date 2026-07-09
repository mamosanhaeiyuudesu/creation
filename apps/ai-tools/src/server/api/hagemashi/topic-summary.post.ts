import { wrapApiError } from '~/server/utils/openai'

interface SourceItem { date: string; text: string }

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; items: SourceItem[] }>(event)

  if (!body?.keyword || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'keyword and items are required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const sourceText = body.items.map(i => `[${i.date}] ${i.text}`).join('\n')

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
ユーザーが選んだキーワード「${body.keyword}」に関連する記録が日付つきで複数与えられます。
これらを読み、「${body.keyword}」についてユーザーにどんな内容・変化があったかをまとめてください。

出力ルール:
- 記録が少ない場合（目安1〜2件）は自然な文章で2〜4文程度にまとめる
- 記録が多い場合（目安3件以上）は、時系列の流れがわかるように次の形式で書く（1行目が最も古く、下に行くほど新しい）:
〇〇（日付）
↓
〇〇（日付）
↓
〇〇（日付）
- 各行は具体的で簡潔に（20〜40字程度）。日付は与えられたデータの日付表記をそのまま使う
- 出力はプレーンテキストのみ。JSON・マークダウン記法・見出し・前置きや説明は一切不要`,
        messages: [{ role: 'user', content: sourceText }],
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
