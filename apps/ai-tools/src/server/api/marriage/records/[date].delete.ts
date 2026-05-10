import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = getRouterParam(event, 'date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: '日付の形式が正しくありません (YYYY-MM-DD)' })
  }

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  await db
    .prepare('DELETE FROM marriage_records WHERE user_id = ? AND date = ?')
    .bind(user.id, date)
    .run()

  return { ok: true }
})
