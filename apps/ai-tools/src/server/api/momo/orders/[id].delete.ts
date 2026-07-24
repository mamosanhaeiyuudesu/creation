import { requireMomoUser, requireMomoDb, ensureMomoTables } from '~/server/utils/momo'

export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await db
    .prepare('SELECT id FROM momo_orders WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '注文が見つかりません' })

  await db.prepare('DELETE FROM momo_order_items WHERE order_id = ?').bind(id).run()
  await db.prepare('DELETE FROM momo_messages WHERE order_id = ?').bind(id).run()
  await db.prepare('DELETE FROM momo_orders WHERE id = ?').bind(id).run()
  return { ok: true }
})
