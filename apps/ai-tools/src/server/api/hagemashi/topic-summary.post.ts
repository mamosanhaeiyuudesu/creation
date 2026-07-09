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
2. 関連する記録が1件もなければ blocks を空配列にする
3. 関連する記録があれば、時系列の流れ（古い→新しい）を意識しながら内容を1〜3個の塊に整理し、それぞれに短いタイトルをつける

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"本文"}]}

出力ルール:
- blocks は1〜3個。関連する記録が少なければ1個でよい
- 各ブロックの text は文の区切り（「。」の直後）ごとに改行（\\n）を入れる
- 全ブロックの text を合計しておよそ500文字以内に収める
- タイトルはそのブロックの内容を端的に表す10字前後のラベルにする
- ブロックの並び・内容から時系列の流れが伝わるようにする
- JSON以外の文字列は一切出力しない`,
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
    const raw = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { blocks?: { title?: string; text?: string }[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { blocks: [] }
    }

    // モデルの出力ゆれに関わらず、文ごとに必ず「。」+ 改行になるよう正規化する
    const toSentenceLines = (text: string): string[] =>
      text
        .split('。')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `${s}。`)

    const rawBlocks = Array.isArray(parsed.blocks)
      ? parsed.blocks
          .map(b => ({ title: String(b.title ?? '').slice(0, 20), sentences: toSentenceLines(String(b.text ?? '')) }))
          .filter(b => b.sentences.length)
          .slice(0, 3)
      : []

    // 合計文字数がおよそ500字を超えないよう、文単位で安全側にトリムする
    const MAX_TOTAL = 500
    let total = 0
    const blocks: { title: string; text: string }[] = []
    outer: for (const b of rawBlocks) {
      const kept: string[] = []
      for (const sentence of b.sentences) {
        if (total + sentence.length > MAX_TOTAL) break outer
        kept.push(sentence)
        total += sentence.length
      }
      if (kept.length) blocks.push({ title: b.title, text: kept.join('\n') })
    }

    return { blocks }
  } catch (err) {
    return wrapApiError(err, 'AI分析の生成に失敗しました')
  }
})
