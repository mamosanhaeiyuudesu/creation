import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const query = getQuery(event)
  const year = Number(query.year)
  const month = Number(query.month)

  if (!year || !month || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'year と month が必要です' })
  }

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const m = String(month).padStart(2, '0')
  const from = `${year}-${m}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

  const rows = await db
    .prepare('SELECT date, mood, comment FROM marriage_records WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date')
    .bind(user.id, from, to)
    .all<{ date: string; mood: string; comment: string }>()

  const results = rows.results ?? []
  return Promise.all(results.map(async r => ({ ...r, comment: await decryptComment(event, r.comment) })))
})
