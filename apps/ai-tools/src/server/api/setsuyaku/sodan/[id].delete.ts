import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id は必須です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await db
    .prepare('DELETE FROM setsuyaku_sodan WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run()

  return { ok: true }
})
