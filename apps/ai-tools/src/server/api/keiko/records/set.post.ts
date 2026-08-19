import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, isValidDate, isBeforeKeikoStart, normalizeRate, normalizePoints } from '~/server/utils/keiko'

// その日の記録を設定する。
// - kind='reps'   : rate（％）を保存。rate=0 なら記録を消す
// - kind='direct' : 入力されたポイントをそのまま保存（0点で参加もあり得るので 0 は消す扱いにしない）
// - remove=true   : 種類に関わらず記録を消す
export default defineEventHandler(async (event): Promise<{ rate: number; points: number | null }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ memberId?: string; itemId?: string; date?: string; rate?: number; points?: number; remove?: boolean }>(event)
  const memberId = body?.memberId
  const itemId = body?.itemId
  const date = body?.date
  if (!memberId || !itemId || !isValidDate(date)) {
    throw createError({ statusCode: 400, message: 'memberId・itemId・date (YYYY-MM-DD) が必要です' })
  }
  // 記録のはじまり（2026年8月）より前の日は記録させない。画面でも押せないが、
  // 古い画面が開きっぱなしでも書き込めないようにここでも止める（消すのは許す）。
  if (isBeforeKeikoStart(date) && body?.remove !== true) {
    throw createError({ statusCode: 400, message: '記録のはじまり（2026年8月）より前の日は記録できません' })
  }

  const member = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(memberId, user.id).first<{ id: string }>()
  if (!member) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })
  const item = await db
    .prepare('SELECT id, kind FROM keiko_items WHERE id = ? AND user_id = ? AND member_id = ?')
    .bind(itemId, user.id, memberId)
    .first<{ id: string; kind: string }>()
  if (!item) throw createError({ statusCode: 404, message: '項目が見つかりません' })

  const existing = await db
    .prepare('SELECT id FROM keiko_records WHERE member_id = ? AND item_id = ? AND date = ?')
    .bind(memberId, itemId, date)
    .first<{ id: string }>()

  const isDirect = item.kind === 'direct'
  const rate = isDirect ? 100 : normalizeRate(body?.rate)
  const points = isDirect ? normalizePoints(body?.points) : null
  const remove = body?.remove === true || (!isDirect && rate === 0)

  if (remove) {
    if (existing) await db.prepare('DELETE FROM keiko_records WHERE id = ?').bind(existing.id).run()
    return { rate: 0, points: null }
  }

  if (existing) {
    await db.prepare('UPDATE keiko_records SET rate = ?, points = ? WHERE id = ?').bind(rate, points, existing.id).run()
  } else {
    await db
      .prepare('INSERT INTO keiko_records (id, user_id, member_id, item_id, date, rate, points) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), user.id, memberId, itemId, date, rate, points)
      .run()
  }
  return { rate, points }
})
