import { requireMomoUser, requireMomoDb, ensureMomoTables, normalizeSize, loadOrder } from '~/server/utils/momo'
import type { OrderInput } from '~/types/momo'

// 確認画面で確定した注文をDBに保存する。明細・会話ログ原文もあわせて保存。
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)

  const body = await readBody<OrderInput>(event)
  const status = ['draft', 'confirmed', 'shipped'].includes(body?.status ?? '') ? body!.status : 'draft'
  const deliveryDate = (body?.deliveryDate ?? '').match(/^\d{4}-\d{2}-\d{2}$/) ? body!.deliveryDate : null
  const items = Array.isArray(body?.items) ? body!.items : []

  const orderId = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO momo_orders (id, user_id, customer_name, delivery_date, time_slot, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(orderId, user.id, (body?.customerName ?? '').trim(), deliveryDate, body?.timeSlot || null, status)
    .run()

  for (const it of items) {
    await db
      .prepare(
        `INSERT INTO momo_order_items (id, order_id, variety, size, quantity, unit, ripeness, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        orderId,
        (it?.variety ?? '').trim(),
        normalizeSize(it?.size),
        Math.max(1, Math.round(Number(it?.quantity) || 1)),
        (it?.unit ?? '箱').trim() || '箱',
        (it?.ripeness ?? '')?.toString().trim() || null,
        (it?.notes ?? '').trim()
      )
      .run()
  }

  if (body?.message && (body.message.rawText ?? '').trim()) {
    await db
      .prepare('INSERT INTO momo_messages (id, order_id, raw_text, source) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), orderId, body.message.rawText.trim(), body.message.source || 'other')
      .run()
  }

  return await loadOrder(db, user.id, orderId)
})
