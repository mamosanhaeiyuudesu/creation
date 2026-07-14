import { getSessionUser } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

interface MoodEntry { id: string; score: number; note: string; createdAt: string }

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { entries } = await readBody<{ entries: MoodEntry[] }>(event)
  if (!Array.isArray(entries)) throw createError({ statusCode: 400, message: '不正なデータ形式' })

  const storedData = await encryptComment(event, JSON.stringify(entries))
  await db
    .prepare("INSERT OR REPLACE INTO hagemashi_moods (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
    .bind(user.id, storedData)
    .run()

  return { ok: true }
})
