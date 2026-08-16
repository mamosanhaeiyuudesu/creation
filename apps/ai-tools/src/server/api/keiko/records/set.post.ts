import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, isValidDate, normalizeRate } from '~/server/utils/keiko'

// その日の評価（％）を設定する。rate=0 なら記録そのものを消す（＝やっていない）。
export default defineEventHandler(async (event): Promise<{ rate: number }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ memberId?: string; itemId?: string; date?: string; rate?: number }>(event)
  const memberId = body?.memberId
  const itemId = body?.itemId
  const date = body?.date
  if (!memberId || !itemId || !isValidDate(date)) {
    throw createError({ statusCode: 400, message: 'memberId・itemId・date (YYYY-MM-DD) が必要です' })
  }
  const rate = normalizeRate(body?.rate)

  const member = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(memberId, user.id).first<{ id: string }>()
  if (!member) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })
  const item = await db
    .prepare('SELECT id FROM keiko_items WHERE id = ? AND user_id = ? AND member_id = ?')
    .bind(itemId, user.id, memberId)
    .first<{ id: string }>()
  if (!item) throw createError({ statusCode: 404, message: '項目が見つかりません' })

  const existing = await db
    .prepare('SELECT id FROM keiko_records WHERE member_id = ? AND item_id = ? AND date = ?')
    .bind(memberId, itemId, date)
    .first<{ id: string }>()

  if (rate === 0) {
    if (existing) await db.prepare('DELETE FROM keiko_records WHERE id = ?').bind(existing.id).run()
    return { rate: 0 }
  }

  if (existing) {
    await db.prepare('UPDATE keiko_records SET rate = ? WHERE id = ?').bind(rate, existing.id).run()
  } else {
    await db
      .prepare('INSERT INTO keiko_records (id, user_id, member_id, item_id, date, rate) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), user.id, memberId, itemId, date, rate)
      .run()
  }
  return { rate }
})
