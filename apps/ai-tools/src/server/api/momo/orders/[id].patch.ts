import { requireMomoUser, requireMomoDb, ensureMomoTables, normalizeSize, loadOrder } from '~/server/utils/momo'
import type { OrderInput } from '~/types/momo'

// 注文の更新。明細は全削除→再挿入で置き換える（編集画面がフォーム全体を送るため単純化）。
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

  const body = await readBody<Partial<OrderInput>>(event)
  const status = ['draft', 'confirmed', 'shipped'].includes(body?.status ?? '') ? body!.status : 'draft'
  const deliveryDate = (body?.deliveryDate ?? '').match(/^\d{4}-\d{2}-\d{2}$/) ? body!.deliveryDate : null

  await db
    .prepare('UPDATE momo_orders SET customer_name = ?, delivery_date = ?, time_slot = ?, status = ? WHERE id = ?')
    .bind((body?.customerName ?? '').trim(), deliveryDate, body?.timeSlot || null, status, id)
    .run()

  if (Array.isArray(body?.items)) {
    await db.prepare('DELETE FROM momo_order_items WHERE order_id = ?').bind(id).run()
    for (const it of body!.items) {
      await db
        .prepare(
          `INSERT INTO momo_order_items (id, order_id, variety, size, quantity, unit, ripeness, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          id,
          (it?.variety ?? '').trim(),
          normalizeSize(it?.size),
          Math.max(1, Math.round(Number(it?.quantity) || 1)),
          (it?.unit ?? '箱').trim() || '箱',
          (it?.ripeness ?? '')?.toString().trim() || null,
          (it?.notes ?? '').trim()
        )
        .run()
    }
  }

  return await loadOrder(db, user.id, id)
})
