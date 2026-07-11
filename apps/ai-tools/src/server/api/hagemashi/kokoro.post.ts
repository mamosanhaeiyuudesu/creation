import { getSessionUser } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface WordEntry { word: string; count: number }
// weight: 1〜10（心を占める割合の目安 → treemap の面積）
interface KokoroLeaf { name: string; weight: number; note: string }
interface KokoroEntry { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string; generatedAt: string }

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
        model: 'claude-sonnet-5',
        max_tokens: 3072,
        thinking: { type: 'disabled' },
        system: `あなたは日々の記録からユーザーの心の状態を可視化するメンタルコーチです。
提供されたデータ（日々の気持ち・状況の記録と頻出単語）をもとに、今のユーザーの心を占めているものを「チャージ源（心を満たすもの・支え）」と「ストレス源（心を消耗させるもの・負担）」に分類してください。
自分の心を客観視してメタ認知できるよう、プラス面もマイナス面も両方バランスよく抽出することが重要です。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"charge":[{"name":"項目名（10文字以内でシンプルに）","weight":8,"note":"補足（40字以内）"}],"stress":[{"name":"項目名（10文字以内でシンプルに）","weight":6,"note":"補足（40字以内）"}],"summary":"心の状態を客観視するための全体コメント（120字以内）"}

ルール:
- charge（チャージ源）と stress（ストレス源）を合わせて 12 項目程度（それぞれ 5〜7 項目ずつ）抽出する
- weight は 1〜10 の整数で、その事柄が今どれくらい心を占めているか（大きいほど心を占める）
- name は記録から具体的に拾いつつ、必ず 10 文字以内でシンプルにする（例:「仕事の達成感」「締切の重圧」）
- note はメタ認知を助ける一言
- データが少ない場合も、読み取れる範囲で無理なく分類する`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }

    const data = await response.json()
    const text = (data?.content?.[0]?.text ?? '').trim()

    let parsed: { charge: KokoroLeaf[]; stress: KokoroLeaf[]; summary: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw createError({ statusCode: 500, statusMessage: 'レスポンスの解析に失敗しました' })
      parsed = JSON.parse(match[0])
    }

    const clampLeaf = (l: KokoroLeaf): KokoroLeaf => ({
      name: String(l.name ?? '').slice(0, 14),
      weight: Math.min(10, Math.max(1, Math.round(Number(l.weight) || 1))),
      note: String(l.note ?? '').slice(0, 60),
    })

    const newEntry: KokoroEntry = {
      charge: (Array.isArray(parsed.charge) ? parsed.charge : []).map(clampLeaf).filter(l => l.name),
      stress: (Array.isArray(parsed.stress) ? parsed.stress : []).map(clampLeaf).filter(l => l.name),
      summary: String(parsed.summary ?? '').slice(0, 200),
      generatedAt: new Date().toISOString(),
    }

    if (db && user) {
      const existing = await db
        .prepare('SELECT data FROM hagemashi_kokoro WHERE user_id = ?')
        .bind(user.id)
        .first() as { data: string } | null

      let entries: KokoroEntry[] = []
      if (existing) {
        try {
          const raw = JSON.parse(existing.data)
          entries = Array.isArray(raw) ? raw : [raw]
        } catch {}
      }

      entries = [newEntry, ...entries].slice(0, 10)

      await db
        .prepare("INSERT OR REPLACE INTO hagemashi_kokoro (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
        .bind(user.id, JSON.stringify(entries))
        .run()
    }

    return newEntry
  } catch (err) {
    return wrapApiError(err, '心の状態の生成に失敗しました')
  }
})
