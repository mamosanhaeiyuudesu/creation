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

  // 時系列を古期・中期・直近の3区分に分け、各区分から均等にサンプリングする。
  // こうすることで①特定の時期（特に直近）だけが過剰に強調されるのを構造的に防ぎ、
  // ②記録が大量にあってもAIに渡すデータ量を一定に抑えられる
  const PER_ERA_CAP = 40
  const ERA_LABELS = ['初期', '中期', '直近'] as const

  const sampleEvenly = (items: SourceItem[], max: number): SourceItem[] => {
    if (items.length <= max) return items
    const step = items.length / max
    return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
  }

  const eraSize = Math.ceil(body.items.length / 3)
  const eraChunks = [
    body.items.slice(0, eraSize),
    body.items.slice(eraSize, eraSize * 2),
    body.items.slice(eraSize * 2),
  ]

  const sourceText = eraChunks
    .map((chunk, i) => ({ label: ERA_LABELS[i], sampled: sampleEvenly(chunk, PER_ERA_CAP) }))
    .filter(e => e.sampled.length)
    .map(e => `## ${e.label}の記録\n${e.sampled.map(i => `[${i.date}] ${i.text}`).join('\n')}`)
    .join('\n\n')

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
ユーザーが選んだテーマ「${body.keyword}」に関連しそうな記録を「初期」「中期」「直近」の3区分に分けて与えます（区分は記録全体を時系列で3等分したもの）。文字表記が完全一致しなくても、内容が意味的に関連していれば対象として扱ってください。区分内・区分間を問わず、無関係な記録も混ざっています。

手順:
1. 各区分から「${body.keyword}」に意味的に関連するものだけを自分で判断して選び出す（特定の区分に偏らず、3区分すべてを確認する）
2. 関連する記録がどの区分にも1件もなければ blocks を空配列にする
3. 関連する記録があれば、区分ごとの内容差・変化を意識しながら1〜3個の塊に整理し、それぞれに短いタイトルをつける（区分にそのまま対応させる必要はないが、直近の区分の記録ばかりを扱う内容に偏らせない）

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"本文"}]}

出力ルール:
- blocks は1〜3個。関連する記録が少なければ1個でよい
- 「初期」「中期」の区分に関連記録があるのに無視して「直近」の内容だけでまとめる、ということはしない
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
