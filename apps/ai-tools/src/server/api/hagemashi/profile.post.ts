import { getSessionUser } from '~/server/utils/auth'
import { decryptComment, encryptComment } from '~/server/utils/encrypt'
import { wrapApiError } from '~/server/utils/openai'

interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface WordEntry { word: string; count: number }
interface StrengthItem { title: string; weight: number; content: string }
interface ProfileItem { strengths: StrengthItem[] | string; advice: StrengthItem[] | string; generatedAt: string }

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ summaryItems: SummaryItem[]; wordRanking: WordEntry[]; vision?: string }>(event)

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

  const visionText = body.vision?.trim()
  const visionBlock = visionText ? `\n\n## ユーザーが設定しているビジョン（目指す姿）\n${visionText}` : ''

  const userContent = `## 中間データ（日々の気持ち・状況の記録。初期・中期・直近の3区分）\n${summaryText}\n\n## 頻出単語ランキング\n${wordText}${visionBlock}`

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
        system: `あなたは日々の記録からユーザーの特性を分析するプロファイリングの専門家です。
提供されたデータ（日々の気持ち・状況の記録と頻出単語）をもとに、ユーザーの強み・アドバイスを日本語で分析してください。
記録は時期ごとに分けて与えられます（各見出しは「2025年5〜8月頃」のように実際の年月）。新しい時期の記録だけに偏らず、すべての時期に目を通したうえで、期間全体を通じて言える強みやアドバイスを抽出してください。期間に言及するときは「初期」「中期」などの抽象語ではなく、与えられた見出しの実際の年月で具体的に書いてください。
${visionText ? 'ユーザーが設定しているビジョン（目指す姿）が渡された場合は、advice の一部にそのビジョンに近づくために今何をするとよいかという視点を織り交ぜてください（強引にこじつけず、記録の内容と自然に結びつく範囲で）。' : ''}

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"strengths":[{"title":"強みのタイトル（10文字以内でシンプルに）","weight":8,"content":"説明（150字以内）"}],"advice":[{"title":"アドバイスのタイトル（10文字以内でシンプルに）","weight":7,"content":"説明（150字以内）"}]}

ルール:
- strengths・advice はそれぞれ 12 項目程度（最低でも 10 項目）抽出する
- weight は 1〜10 の整数で、その項目が今どれくらい顕著か・重要かを表す（大きいほど treemap で大きく表示される）
- title は必ず 10 文字以内でシンプルにする（treemap 上に表示されるため）。content は具体的に記述する
- strengths・advice はそれぞれのリスト内で項目同士の意味が重ならないようにし（同じ内容の言い換えを並べない）、かつ記録全体から読み取れる主要な強み・アドバイスを漏れなくカバーする（MECE: 互いに排反かつ全体を網羅）`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { strengths: StrengthItem[] | string; advice: StrengthItem[] | string }
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw createError({ statusCode: 500, statusMessage: 'レスポンスの解析に失敗しました' })
      parsed = JSON.parse(match[0])
    }

    // weight を 1〜10 に収め、タイトル・本文の長さも安全側に丸める
    const clampItem = (l: StrengthItem): StrengthItem => ({
      title: String(l.title ?? '').slice(0, 14),
      weight: Math.min(10, Math.max(1, Math.round(Number(l.weight) || 5))),
      content: String(l.content ?? '').slice(0, 300),
    })
    const normList = (v: StrengthItem[] | string): StrengthItem[] | string =>
      Array.isArray(v) ? v.map(clampItem).filter(i => i.title) : v

    const newProfile: ProfileItem = {
      strengths: normList(parsed.strengths),
      advice: normList(parsed.advice),
      generatedAt: new Date().toISOString(),
    }

    if (db && user) {
      const existing = await db
        .prepare('SELECT data FROM hagemashi_profiles WHERE user_id = ?')
        .bind(user.id)
        .first() as { data: string } | null

      let profiles: ProfileItem[] = []
      if (existing) {
        try {
          const raw = JSON.parse(await decryptComment(event, existing.data))
          profiles = Array.isArray(raw) ? raw : [raw]
        } catch {}
      }

      profiles = [newProfile, ...profiles].slice(0, 10)

      const storedData = await encryptComment(event, JSON.stringify(profiles))
      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_profiles (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
        .bind(user.id, storedData)
        .run()
    }

    return newProfile
  } catch (err) {
    return wrapApiError(err, 'プロファイリングの生成に失敗しました')
  }
})
