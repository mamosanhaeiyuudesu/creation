import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface SourceItem { date: string; text: string }
interface Relation { word: string; kind: string; sentiment: 'ポジ' | 'ネガ' | '中立'; refs: number[] }

// プロンプト仕様の版数。プロンプトを変えたらここを上げると既存キャッシュが無効化され再生成される。
const PROMPT_VERSION = 'v1'

// 入力データ（版数+keyword+対象記録）から短いハッシュを作る。
// これをキャッシュの signature とし、記録やプロンプト版数が変われば値が変わって再生成される。
const signatureOf = (keyword: string, items: SourceItem[]): string => {
  const canonical = [PROMPT_VERSION, keyword, ...items.map(i => `${i.date}|${i.text}`)].join('')
  let h = 5381
  for (let i = 0; i < canonical.length; i++) {
    h = (h * 33) ^ canonical.charCodeAt(i)
  }
  return `${(h >>> 0).toString(36)}.${canonical.length}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword: string; items: SourceItem[] }>(event)

  if (!body?.keyword || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'keyword and items are required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  // 参照インデックス（refs）がずれないよう、AIへ渡す配列＝クライアントが表示に使う配列を固定する。
  // クライアント側で既に上限を絞って送ってくる想定だが、安全のためここでも上限を設ける。
  const items = body.items.slice(0, 80)

  // ログイン時のみ D1 にキャッシュ保存する（未ログインは毎回生成）
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null
  const cacheKey = `relations:${body.keyword}`
  const signature = signatureOf(body.keyword, items)

  if (db && user) {
    const cached = await db
      .prepare('SELECT signature, blocks FROM hagemashi_topic_cache WHERE user_id = ? AND cache_key = ?')
      .bind(user.id, cacheKey)
      .first()
      .catch(() => null) as { signature: string; blocks: string } | null
    if (cached && cached.signature === signature) {
      try {
        return { relations: JSON.parse(cached.blocks) as Relation[], cached: true }
      } catch { /* 壊れていたら無視して再生成 */ }
    }
  }

  const numbered = items.map((i, idx) => `[${idx}] (${i.date}) ${i.text}`).join('\n')

  const system = `あなたはユーザーの日々の記録から、ある「単語」に係り受け（依存関係）で結びつく言葉を抽出する言語アナリストです。
対象の単語「${body.keyword}」を含む記録を番号付きで与えます。各記録の中で、「${body.keyword}」に対して係り受けの関係にある語句を抜き出してください。

「係り受けの関係にある語句」とは:
- その単語について述べている述語・形容（例: 仕事 →「つらい」「楽しい」「忙しい」）
- その単語を修飾する語、または単語が修飾している語（例:「汚い考え方」で対象が「考え方」なら →「汚い」）
- 文中でその単語と直接結びついて意味を作っている語

ルール:
- 抽出する語句は活用を整えた自然な見出し語にする（例:「つらかった」→「つらい」、「頑張って」→「頑張る」）。3〜8字程度の短い言葉にする
- 同じ意味の語はまとめて1件にする（言い換えを別項目にしない）
- 各語句について、その文脈で「${body.keyword}」に対してポジティブ/ネガティブ/中立のどれかを判定する
- 各語句が、与えた記録のどの番号から読み取れるかを refs に列挙する（複数可・必ず与えた番号の範囲内）
- 「${body.keyword}」と直接の係り受け関係がない語（単に同じ記録に居合わせただけの無関係な語）は含めない
- 結びつきの強い（登場の多い）順に 8〜12 件程度に絞る

必ず以下のJSON形式のみで返答してください（マークダウンや説明文は一切不要）:
{"relations":[{"word":"つらい","kind":"述語","sentiment":"ネガ","refs":[0,3]}]}

kind は "述語"（述語・形容）/ "修飾"（修飾関係）/ "関連"（その他の直接的な結びつき）のいずれか。
sentiment は "ポジ" / "ネガ" / "中立" のいずれか。
JSON以外の文字列は一切出力しない。`

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
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: numbered }],
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

    let parsed: { relations?: Array<Partial<Relation>> }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1')) : { relations: [] }
    }

    const validSentiment = (s: unknown): 'ポジ' | 'ネガ' | '中立' =>
      s === 'ポジ' || s === 'ネガ' ? s : '中立'

    const relations: Relation[] = (Array.isArray(parsed.relations) ? parsed.relations : [])
      .map((r): Relation => ({
        word: String(r.word ?? '').slice(0, 20),
        kind: r.kind === '修飾' || r.kind === '関連' ? r.kind : '述語',
        sentiment: validSentiment(r.sentiment),
        // 与えた範囲内の整数だけを採用（AIが範囲外を返しても表示側で壊れないように）
        refs: Array.isArray(r.refs)
          ? [...new Set(r.refs.map(n => Math.trunc(Number(n))).filter(n => n >= 0 && n < items.length))]
          : [],
      }))
      .filter(r => r.word && r.refs.length)
      .sort((a, b) => b.refs.length - a.refs.length)
      .slice(0, 12)

    if (db && user) {
      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_topic_cache (user_id, cache_key, signature, blocks, updated_at) VALUES (?, ?, ?, ?, datetime('now'))")
        .bind(user.id, cacheKey, signature, JSON.stringify(relations))
        .run()
        .catch(() => { /* キャッシュ保存の失敗は無視して結果は返す */ })
    }

    return { relations }
  } catch (err) {
    return wrapApiError(err, '関連語の抽出に失敗しました')
  }
})
