import { getSessionUser } from '~/server/utils/auth'
import { decryptComment, encryptComment } from '~/server/utils/encrypt'
import { wrapApiError } from '~/server/utils/openai'

interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface WordEntry { word: string; count: number }
interface AchievedItem { title: string; weight: number; content: string }
interface AchievedEntry { items: AchievedItem[]; summary: string; generatedAt: string }

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ summaryItems: SummaryItem[]; wordRanking: WordEntry[] }>(event)

  // 記録全体を3区分に均等サンプリングし、特定の時期に偏らず広範囲の期間から分析できるようにする
  // （body.summaryItems は古い→新しい順で渡される想定）。各区分の見出しは実際の年月レンジにする。
  const PER_ERA_CAP = 50

  const sampleEvenly = (items: SummaryItem[], max: number): SummaryItem[] => {
    if (items.length <= max) return items
    const step = items.length / max
    return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)])
  }

  // 記録の date（"YYYY/M/D" 形式）から、その区分の実際の年月レンジのラベルを作る（例:「2025年5〜8月頃」）
  const periodLabel = (chunk: SummaryItem[]): string => {
    const parse = (s: string) => {
      const m = String(s).match(/(\d{4})\D+(\d{1,2})/)
      return m ? { y: +m[1], mo: +m[2] } : null
    }
    const ds = chunk.map(i => parse(i.date)).filter((d): d is { y: number; mo: number } => !!d)
    if (!ds.length) return 'この時期'
    const key = (d: { y: number; mo: number }) => d.y * 12 + d.mo
    let lo = ds[0], hi = ds[0]
    for (const d of ds) { if (key(d) < key(lo)) lo = d; if (key(d) > key(hi)) hi = d }
    if (lo.y === hi.y && lo.mo === hi.mo) return `${lo.y}年${lo.mo}月頃`
    if (lo.y === hi.y) return `${lo.y}年${lo.mo}〜${hi.mo}月頃`
    return `${lo.y}年${lo.mo}月〜${hi.y}年${hi.mo}月頃`
  }

  const items = body.summaryItems ?? []
  const eraSize = Math.ceil(items.length / 3)
  const eraChunks = [
    items.slice(0, eraSize),
    items.slice(eraSize, eraSize * 2),
    items.slice(eraSize * 2),
  ]

  const summaryText = items.length
    ? eraChunks
        .map(chunk => ({ label: periodLabel(chunk), sampled: sampleEvenly(chunk, PER_ERA_CAP) }))
        .filter(e => e.sampled.length)
        .map(e => `### ${e.label}の記録\n${e.sampled.map(r => `[${r.date}][${r.sentiment}] ${r.text}`).join('\n')}`)
        .join('\n\n')
    : '（データなし）'

  const wordText = body.wordRanking?.length
    ? body.wordRanking.slice(0, 50).map(w => `${w.word}(${w.count})`).join('、')
    : '（データなし）'

  const userContent = `## 中間データ（日々の気持ち・状況の記録。初期・中期・直近の3区分）\n${summaryText}\n\n## 頻出単語ランキング\n${wordText}`

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
        max_tokens: 4096,
        thinking: { type: 'disabled' },
        system: `あなたは日々の記録からユーザーが成し遂げてきた達成を洗い出すコーチです。
提供されたデータ（日々の気持ち・状況の記録と頻出単語）をもとに、ユーザーが実際に達成した・成し遂げたことを日本語で抽出してください。
記録は時期ごとに分けて与えられます（各見出しは「2025年5〜8月頃」のように実際の年月）。新しい時期の記録だけに偏らず、すべての時期に目を通したうえで、期間全体から達成を拾い上げてください。期間に言及するときは「初期」「中期」などの抽象語ではなく、与えられた見出しの実際の年月で具体的に書いてください。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"items":[{"title":"達成のタイトル（8文字以内でできるだけシンプルに）","weight":8,"content":"説明（150字以内）"}],"summary":"達成全体を俯瞰して伝える全体コメント（120字以内）"}

ルール:
- items は 20 項目程度（最低でも 15 項目）抽出する
- 似た内容の重複や、些細な日常の一コマの言い換えを並べず、ユーザーの記録全体を漏れなくカバーしながら（MECE: 互いに排反かつ全体を網羅）、なるべくスケールの大きな達成（影響・意義が大きいもの）を優先して選ぶ
- weight は 1〜10 の整数で、その達成の大きさ・重要度を表す（大きいほど treemap で大きく表示される）
- title は必ず 8 文字以内でできるだけシンプルにする（treemap 上に表示されるため）。content は具体的に何を成し遂げたかを記述する
- summary はユーザーを労い、達成の積み重ねを俯瞰して伝えるコメントにする`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { items: AchievedItem[]; summary: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw createError({ statusCode: 500, statusMessage: 'レスポンスの解析に失敗しました' })
      parsed = JSON.parse(match[0])
    }

    // weight を 1〜10 に収め、タイトル・本文の長さも安全側に丸める
    const clampItem = (l: AchievedItem): AchievedItem => ({
      title: String(l.title ?? '').slice(0, 10),
      weight: Math.min(10, Math.max(1, Math.round(Number(l.weight) || 5))),
      content: String(l.content ?? '').slice(0, 300),
    })

    const newEntry: AchievedEntry = {
      items: (Array.isArray(parsed.items) ? parsed.items : []).map(clampItem).filter(i => i.title),
      summary: String(parsed.summary ?? '').slice(0, 200),
      generatedAt: new Date().toISOString(),
    }

    if (db && user) {
      const existing = await db
        .prepare('SELECT data FROM hagemashi_achieved WHERE user_id = ?')
        .bind(user.id)
        .first() as { data: string } | null

      let entries: AchievedEntry[] = []
      if (existing) {
        try {
          const raw = JSON.parse(await decryptComment(event, existing.data))
          entries = Array.isArray(raw) ? raw : [raw]
        } catch {}
      }

      entries = [newEntry, ...entries].slice(0, 10)

      const storedData = await encryptComment(event, JSON.stringify(entries))
      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_achieved (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
        .bind(user.id, storedData)
        .run()
    }

    return newEntry
  } catch (err) {
    return wrapApiError(err, '達成マップの生成に失敗しました')
  }
})
