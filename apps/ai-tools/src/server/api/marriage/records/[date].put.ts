import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = getRouterParam(event, 'date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: '日付の形式が正しくありません (YYYY-MM-DD)' })
  }

  const { mood, comment } = await readBody<{ mood: string; comment?: string }>(event)
  if (!['good', 'normal', 'bad'].includes(mood)) {
    throw createError({ statusCode: 400, message: 'mood は good / normal / bad のいずれかです' })
  }

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const storedComment = await encryptComment(event, comment ?? '')

  await db
    .prepare(`
      INSERT INTO marriage_records (user_id, date, mood, comment)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, date) DO UPDATE SET
        mood = excluded.mood,
        comment = excluded.comment,
        updated_at = datetime('now')
    `)
    .bind(user.id, date, mood, storedComment)
    .run()

  return { date, mood, comment: comment ?? '' }
})
