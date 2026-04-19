import { getDeepheartDb, requireDeepheartUser } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const query = getQuery(event)
  const fromId = typeof query.fromId === 'string' ? query.fromId : undefined

  if (fromId) {
    const row = await db
      .prepare('SELECT created_at FROM deepheart_messages WHERE id = ? AND user_id = ?')
      .bind(fromId, user.id)
      .first<{ created_at: string }>()
    if (!row) throw createError({ statusCode: 404, message: '該当メッセージが見つかりません' })

    await db
      .prepare('DELETE FROM deepheart_messages WHERE user_id = ? AND created_at >= ?')
      .bind(user.id, row.created_at)
      .run()
  } else {
    await db.prepare('DELETE FROM deepheart_messages WHERE user_id = ?').bind(user.id).run()
  }

  return { ok: true }
})
