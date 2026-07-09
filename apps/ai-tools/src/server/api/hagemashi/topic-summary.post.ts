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
- 矢印や箇条書きの段階分けは使わない。地の文の文章（3〜5文程度）でまとめる
- 記録が古い時期から新しい時期への流れが自然に伝わるように、時系列を意識した文章にする（例:「〇月頃は〜だったが、その後〜となり、直近では〜」のような書き方）
- 全体としてどんな内容・変化があったかの概要が一読でわかるようにする。日付は自然に文中に織り込む程度でよく、逐一列挙しなくてよい
- 出力はプレーンテキストのみ。JSON・マークダウン記法・見出し・箇条書き・前置きや説明は一切不要`,
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
