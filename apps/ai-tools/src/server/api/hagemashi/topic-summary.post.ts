import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface SourceItem { date: string; text: string }
interface AnalysisBlock { title: string; text: string }

// プロンプト仕様の版数。プロンプトを変えたらここを上げると既存キャッシュが無効化され再生成される。
const PROMPT_VERSION = 'v2'

// 入力データ（版数+keyword+note+対象記録）から短いハッシュを作る。
// これをキャッシュの signature とし、記録やプロンプト版数が変われば値が変わって再生成される。
const signatureOf = (keyword: string, note: string, items: SourceItem[]): string => {
  const canonical = [PROMPT_VERSION, keyword, note, ...items.map(i => `${i.date}|${i.text}`)].join('')
  let h = 5381
  for (let i = 0; i < canonical.length; i++) {
    h = (h * 33) ^ canonical.charCodeAt(i)
  }
  // 32bit 符号なしに丸めて長さ情報も添え、衝突をさらに起きにくくする
  return `${(h >>> 0).toString(36)}.${canonical.length}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; note?: string; scope?: string; items: SourceItem[] }>(event)

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
  const signature = signatureOf(body.keyword, body.note ?? '', body.items)

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

  const noteContext = body.note ? `\n\n補足（「${body.keyword}」の意味合い）: ${body.note}` : ''

  // アドバイスタブ（scope='advice'）は要約ではなく、テーマに沿った実践的なアドバイスを返す
  const isAdvice = body.scope === 'advice'

  const summarySystem = `あなたはユーザーの日々の記録（中間データ）を読み解き、要約して伝えるアシスタントです。
ユーザーが選んだテーマ「${body.keyword}」に関連しそうな記録を、時期ごとに分けて与えます。各見出しは「2025年5〜8月頃」のようにその時期の実際の年月です。文字表記が完全一致しなくても、内容が意味的に関連していれば対象として扱ってください。無関係な記録も混ざっています。

手順:
1. 各時期から「${body.keyword}」に意味的に関連するものだけを自分で判断して選び出す（特定の時期に偏らず、すべての時期を確認する）
2. 関連する記録がどの時期にも1件もなければ blocks を空配列にする
3. 関連する記録があれば、その内容を読み解き、共通する傾向・時期ごとの変化・背景にある気持ちを意味的に要約する。1〜3個の観点に整理し、それぞれに短いタイトルをつける（新しい時期の記録ばかりに偏らせない）

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"本文"}]}

本文（text）の書き方（最重要）:
- 記録の文をそのまま引き写したり、複数の記録を「。」でつなげて羅列したりしない
- 複数の記録から要点を汲み取り、あなた自身の言葉でひとつのまとまった文章に書き直す
- 箇条書きや記録の寄せ集めではなく、自然に流れる読みやすい文章にする（1ブロックあたり2〜4文程度）
- 「〜という記録があった」「〜と書いていた」のような報告口調ではなく、そこから読み取れる傾向や意味を語りかけるように書く

出力ルール:
- blocks は1〜3個。関連する内容が少なければ1個でよい
- 期間に言及するときは「初期」「中期」「直近」のような抽象語は使わず、「2025年5〜8月頃」のように与えられた見出しの実際の年月で具体的に書く
- 古い時期に関連記録があるのに無視して新しい時期の内容だけでまとめる、ということはしない
- 全ブロックの text を合計しておよそ500文字以内に収める
- タイトルはそのブロックの内容を端的に表す10字前後のラベルにする
- ブロックの並び・内容から時系列の流れが伝わるようにする
- JSON以外の文字列は一切出力しない`

  const adviceSystem = `あなたはユーザーの日々の記録（中間データ）をふまえて、前向きで実践的なアドバイスを届けるコーチです。
ユーザーが選んだアドバイスのテーマ「${body.keyword}」について、記録を参考にしながら具体的なアドバイスを日本語で書いてください。記録は時期ごとに分けて与えます（各見出しは「2025年5〜8月頃」のように実際の年月）。文字表記が完全一致しなくても意味的に関連すれば手がかりにしてよく、無関係な記録も混ざっています。

手順:
1. テーマ「${body.keyword}」に意味的に関連する状況・傾向を各時期の記録から読み取る（特定の時期に偏らない）
2. それをふまえ、テーマに沿った具体的で実践的なアドバイスを、互いに重ならない3つ程度の観点（例: 考え方・行動・環境や習慣　など）に分けて考える
3. それぞれの観点に短いタイトルをつける

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"blocks":[{"title":"見出し（10字前後）","text":"本文"}]}

アドバイスの書き方（最重要）:
- blocks は3個程度に分ける（内容が乏しいテーマのときのみ1〜2個でよい）。同じ内容の言い換えを複数ブロックに重複させず、各ブロックが異なる観点をカバーするようにする（MECE）
- 記録から読み取れる具体的な状況・傾向に触れつつ、それに対して「どうするとよいか」を助言する
- 記録の羅列や単なる要約で終わらせず、「〜してみましょう」「〜を意識すると良さそうです」のように行動につながる言葉にする
- 押し付けにならないよう、ユーザーを尊重した温かく前向きな語り口にする
- 期間に言及するときは「初期」等の抽象語ではなく、与えられた見出しの実際の年月で具体的に書く
- 箇条書きにせず、各ブロックとも自然に流れる読みやすい文章にする
- 全ブロックの text を合計しておよそ500文字以内に収める
- タイトルはそのブロックのアドバイスの観点を表す10字前後のラベルにする
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
        system: isAdvice ? adviceSystem : summarySystem,
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
