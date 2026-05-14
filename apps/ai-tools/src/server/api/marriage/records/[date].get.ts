import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = getRouterParam(event, 'date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: '日付の形式が正しくありません (YYYY-MM-DD)' })
  }

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT date, mood, comment FROM marriage_records WHERE user_id = ? AND date = ?')
    .bind(user.id, date)
    .first<{ date: string; mood: string; comment: string }>()

  if (!row) throw createError({ statusCode: 404, message: '記録が見つかりません' })
  return { ...row, comment: await decryptComment(event, row.comment) }
})
