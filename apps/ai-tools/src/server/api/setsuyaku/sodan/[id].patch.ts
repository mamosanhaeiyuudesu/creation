import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id は必須です' })

  const body = await readBody<{ wants: string; result: string }>(event)
  if (!body?.wants?.trim()) throw createError({ statusCode: 400, message: 'wants は必須です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await db
    .prepare('UPDATE setsuyaku_sodan SET wants=?, result=? WHERE id=? AND user_id=?')
    .bind(body.wants.trim(), body.result ?? '', id, user.id)
    .run()

  return { ok: true }
})
