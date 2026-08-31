import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface SourceItem { date: string; text: string }
interface AnalysisBlock { title: string; text: string }

// プロンプト仕様の版数。プロンプトを変えたらここを上げると既存キャッシュが無効化され再生成される。
const PROMPT_VERSION = 'v2'

// 入力データ（版数+keyword+対象記録）から短いハッシュを作る。
// これをキャッシュの signature とし、記録やプロンプト版数が変われば値が変わって再生成される。
const signatureOf = (keyword: string, items: SourceItem[]): string => {
  const canonical = [PROMPT_VERSION, keyword, ...items.map(i => `${i.date}|${i.text}`)].join('')
  let h = 5381
  for (let i = 0; i < canonical.length; i++) {
    h = (h * 33) ^ canonical.charCodeAt(i)
  }
  // 32bit 符号なしに丸めて長さ情報も添え、衝突をさらに起きにくくする
  return `${(h >>> 0).toString(36)}.${canonical.length}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; scope?: string; items: SourceItem[] }>(event)

  if (!body?.keyword || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'keyword and items are required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  // ログイン時のみ D1 にキャッシュ保存する（未ログインは毎回生成）
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null
  const cacheKey = `${body.scope || 'topic'}:${body.keyword}`
  const signature = signatureOf(body.keyword, body.items)

  // signature が一致するキャッシュがあればAIを呼ばずに返す
  if (db && user) {
    const cached = await db
      .prepare('SELECT signature, blocks FROM hagemashi_topic_cache WHERE user_id = ? AND cache_key = ?')
      .bind(user.id, cacheKey)
      .first()
      .catch(() => null) as { signature: string; blocks: string } | null
    if (cached && cached.signature === signature) {
      try {
        return { blocks: JSON.parse(cached.blocks) as AnalysisBlock[], cached: true }
      } catch { /* 壊れていたら無視して再生成 */ }
    }
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

  // 「概要」ボタン（scope='overview'）が唯一の呼び出し元。①タグ・②単語で絞り込んだ出来事全件
  // （＝関連性は画面側で判定済み）を対象に、話題を3つだけ短く要約する
  const system = `あなたはユーザーの日々の記録（中間データ）から、話題の傾向を短くまとめるアシスタントです。
これから渡す記録は、ユーザーが選んだ絞り込み条件「${body.keyword}」に該当する出来事だけです（あなたが関連性を判定する必要はありません）。時期ごとに分けて与えます。各見出しは「2025年5〜8月頃」のようにその時期の実際の年月です。

手順:
1. 記録全体を通して繰り返し現れる話題・共通する傾向を読み取る（特定の時期に偏らず、すべての時期を確認する）
2. その中から特に目立つものを3つ選ぶ（互いに異なる観点になるようにし、同じ内容の言い換えを重複させない）
3. それぞれに短いタイトルと一言サマリをつける

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"サマリ（50字程度）"}]}

サマリ（text）の書き方（最重要）:
- 50字程度の短い一文にする。記録の文をそのまま引き写したり複数の記録をつなげて羅列したりしない
- 話題の中身が一目で伝わるよう、あなた自身の言葉で書く
- 「〜という記録があった」のような報告口調ではなく、内容を端的に語る文にする

出力ルール:
- blocks は原則ちょうど3個。記録の内容が乏しく3つに分けられない場合のみ1〜2個でよい
- タイトルは話題を端的に表す10字前後のラベルにする
- JSON以外の文字列は一切出力しない`

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
        system,
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
    const raw = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { blocks?: { title?: string; text?: string }[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { blocks: [] }
    }

    // 読みやすい地続きの文章にするため、改行はいったん取り除き文単位に分解する
    // （モデルが記録を羅列して改行を挟んでも、つながった文章として扱えるようにする）
    const toSentences = (text: string): string[] =>
      text
        .replace(/\s*\n+\s*/g, '')
        .split('。')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `${s}。`)

    const rawBlocks = Array.isArray(parsed.blocks)
      ? parsed.blocks
          .map(b => ({ title: String(b.title ?? '').slice(0, 20), sentences: toSentences(String(b.text ?? '')) }))
          .filter(b => b.sentences.length)
          .slice(0, 3)
      : []

    // 合計文字数がおよそ500字を超えないよう、文単位で安全側にトリムする
    const MAX_TOTAL = 500
    let total = 0
    const blocks: AnalysisBlock[] = []
    outer: for (const b of rawBlocks) {
      const kept: string[] = []
      for (const sentence of b.sentences) {
        if (total + sentence.length > MAX_TOTAL) break outer
        kept.push(sentence)
        total += sentence.length
      }
      // 文を改行で区切らず地続きにつなぎ、まとまった読みやすい文章として返す
      if (kept.length) blocks.push({ title: b.title, text: kept.join('') })
    }

    // 生成結果を signature 付きでキャッシュ（同じ入力なら次回はAIを呼ばない）
    if (db && user) {
      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_topic_cache (user_id, cache_key, signature, blocks, updated_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(user.id, cacheKey, signature, JSON.stringify(blocks))
        .run()
        .catch(() => { /* キャッシュ保存の失敗は無視して結果は返す */ })
    }

    return { blocks }
  } catch (err) {
    return wrapApiError(err, 'AI分析の生成に失敗しました')
  }
})
