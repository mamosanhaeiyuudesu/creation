import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id は必須です' })

  const body = await readBody<{ name: string; price: number; reason: string; date: string; tags: string[] }>(event)
  if (!body?.name?.trim()) throw createError({ statusCode: 400, message: 'name は必須です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await db
    .prepare('UPDATE setsuyaku_rouhi SET name=?, price=?, reason=?, date=?, tags=? WHERE id=? AND user_id=?')
    .bind(body.name.trim(), body.price ?? 0, body.reason ?? '', body.date, JSON.stringify(body.tags ?? []), id, user.id)
    .run()

  return { ok: true }
})
