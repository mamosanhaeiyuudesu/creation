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

  // 時系列を3区分に分け、各区分から均等にサンプリングする。
  // こうすることで①特定の時期（特に直近）だけが過剰に強調されるのを構造的に防ぎ、
  // ②記録が大量にあってもAIに渡すデータ量を一定に抑えられる。
  // 各区分の見出しは「初期／中期／直近」のような抽象語ではなく、その区分の実際の年月レンジにする。
  const PER_ERA_CAP = 40

  const sampleEvenly = (items: SourceItem[], max: number): SourceItem[] => {
    if (items.length <= max) return items
    const step = items.length / max
    return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
  }

  // 記録の date（"YYYY/M/D" 形式）から、その区分の実際の年月レンジのラベルを作る（例:「2025年5〜8月頃」）
  const periodLabel = (items: SourceItem[]): string => {
    const parse = (s: string) => {
      const m = String(s).match(/(\d{4})\D+(\d{1,2})/)
      return m ? { y: +m[1], mo: +m[2] } : null
    }
    const ds = items.map(i => parse(i.date)).filter((d): d is { y: number; mo: number } => !!d)
    if (!ds.length) return 'この時期'
    const key = (d: { y: number; mo: number }) => d.y * 12 + d.mo
    let lo = ds[0], hi = ds[0]
    for (const d of ds) { if (key(d) < key(lo)) lo = d; if (key(d) > key(hi)) hi = d }
    if (lo.y === hi.y && lo.mo === hi.mo) return `${lo.y}年${lo.mo}月頃`
    if (lo.y === hi.y) return `${lo.y}年${lo.mo}〜${hi.mo}月頃`
    return `${lo.y}年${lo.mo}月〜${hi.y}年${hi.mo}月頃`
  }

  const eraSize = Math.ceil(body.items.length / 3)
  const eraChunks = [
    body.items.slice(0, eraSize),
    body.items.slice(eraSize, eraSize * 2),
    body.items.slice(eraSize * 2),
  ]

  const sourceText = eraChunks
    .map(chunk => ({ label: periodLabel(chunk), sampled: sampleEvenly(chunk, PER_ERA_CAP) }))
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
ユーザーが選んだテーマ「${body.keyword}」に関連しそうな記録を、時期ごとに分けて与えます。各見出しは「2025年5〜8月頃」のようにその時期の実際の年月です。文字表記が完全一致しなくても、内容が意味的に関連していれば対象として扱ってください。無関係な記録も混ざっています。

手順:
1. 各時期から「${body.keyword}」に意味的に関連するものだけを自分で判断して選び出す（特定の時期に偏らず、すべての時期を確認する）
2. 関連する記録がどの時期にも1件もなければ blocks を空配列にする
3. 関連する記録があれば、時期ごとの内容差・変化を意識しながら1〜3個の塊に整理し、それぞれに短いタイトルをつける（新しい時期の記録ばかりを扱う内容に偏らせない）

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"本文"}]}

出力ルール:
- blocks は1〜3個。関連する記録が少なければ1個でよい
- 期間に言及するときは「初期」「中期」「直近」のような抽象語は使わず、「2025年5〜8月頃」のように与えられた見出しの実際の年月で具体的に書く
- 古い時期に関連記録があるのに無視して新しい時期の内容だけでまとめる、ということはしない
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
