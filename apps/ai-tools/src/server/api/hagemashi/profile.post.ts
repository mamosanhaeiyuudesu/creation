import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface WordEntry { word: string; count: number }
interface StrengthItem { title: string; content: string }
interface ProfileItem { strengths: StrengthItem[] | string; tendencies: StrengthItem[] | string; advice: StrengthItem[] | string; generatedAt: string }

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  const user = db ? await getSessionUser(event).catch(() => null) : null

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const body = await readBody<{ summaryItems: SummaryItem[]; wordRanking: WordEntry[] }>(event)

  const summaryText = body.summaryItems?.length
    ? body.summaryItems.map(r => `[${r.date}][${r.sentiment}] ${r.text}`).join('\n')
    : '（データなし）'

  const wordText = body.wordRanking?.length
    ? body.wordRanking.slice(0, 50).map(w => `${w.word}(${w.count})`).join('、')
    : '（データなし）'

  const userContent = `## 中間データ（日々の気持ち・状況の記録）\n${summaryText}\n\n## 頻出単語ランキング\n${wordText}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `あなたは日々の記録からユーザーの特性を分析するプロファイリングの専門家です。
提供されたデータ（日々の気持ち・状況の記録と頻出単語）をもとに、ユーザーの強み・傾向・アドバイスを日本語で分析してください。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"strengths":[{"title":"強みのタイトル","content":"説明（200字以内）"},{"title":"強みのタイトル2","content":"説明（200字以内）"}],"tendencies":[{"title":"傾向のタイトル","content":"説明（200字以内）"},{"title":"傾向のタイトル2","content":"説明（200字以内）"}],"advice":[{"title":"アドバイスのタイトル","content":"説明（200字以内）"},{"title":"アドバイスのタイトル2","content":"説明（200字以内）"}]}

strengths・tendencies・advice はそれぞれ2〜3項目で、具体的なタイトルと内容を記述してください。`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { strengths: StrengthItem[] | string; tendencies: StrengthItem[] | string; advice: StrengthItem[] | string }
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw createError({ statusCode: 500, statusMessage: 'レスポンスの解析に失敗しました' })
      parsed = JSON.parse(match[0])
    }

    const newProfile: ProfileItem = { ...parsed, generatedAt: new Date().toISOString() }

    if (db && user) {
      const existing = await db
        .prepare('SELECT data FROM hagemashi_profiles WHERE user_id = ?')
        .bind(user.id)
        .first() as { data: string } | null

      let profiles: ProfileItem[] = []
      if (existing) {
        try {
          const raw = JSON.parse(existing.data)
          profiles = Array.isArray(raw) ? raw : [raw]
        } catch {}
      }

      profiles = [newProfile, ...profiles].slice(0, 10)

      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_profiles (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
        .bind(user.id, JSON.stringify(profiles))
        .run()
    }

    return newProfile
  } catch (err) {
    return wrapApiError(err, 'プロファイリングの生成に失敗しました')
  }
})
