import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'
import { decryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 6)

  const fmt = (d: Date) => {
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dd}`
  }

  const rows = await db
    .prepare('SELECT date, mood, comment FROM marriage_records WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date')
    .bind(user.id, fmt(weekAgo), fmt(today))
    .all<{ date: string; mood: string; comment: string }>()

  const raw = rows.results ?? []
  const records = await Promise.all(raw.map(async r => ({ ...r, comment: await decryptComment(event, r.comment) })))

  const moodLabel = (m: string) => m === 'good' ? '良かった' : m === 'bad' ? '悪かった' : 'ふつう'

  const summary = records.length === 0
    ? '記録なし'
    : records.map(r => `${r.date}(${moodLabel(r.mood)})${r.comment ? ': ' + r.comment : ''}`).join('\n')

  const apiKey = getOpenAiKey(event)

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-nano',
      instructions: 'あなたは夫婦関係のやさしいアドバイザーです。',
      input: [
        {
          role: 'user',
          content: `直近1週間の夫婦の記録:\n${summary}\n\nこの記録をもとに、ふたりへの温かいアドバイスを20文字以内で答えてください。冒頭に理由を入れて「〜だから、〜しよう」のような形にしてください（例：「疲れているみたいだから、一緒に休もう」）。アドバイスだけ返してください。`,
        },
      ],
      max_output_tokens: 50,
      temperature: 1.0,
    }, event, 'marriage-advice')

    const advice = extractText(data).trim().replace(/\n/g, '')
    return { advice }
  } catch (err) {
    wrapApiError(err, 'アドバイスの生成に失敗しました')
  }
})
