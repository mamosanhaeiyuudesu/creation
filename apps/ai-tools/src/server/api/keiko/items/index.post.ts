import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, nextItemSortOrder, normalizeCount, shapeKeikoItem } from '~/server/utils/keiko'
import type { KeikoItem } from '~/types/keiko'

// 練習項目を1件追加（指定メンバーの末尾に追加）。
export default defineEventHandler(async (event): Promise<KeikoItem> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ memberId?: string; name?: string; kind?: string; repCount?: number; pointPerRep?: number }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'やることを入力してください' })
  const kind = body?.kind === 'direct' ? 'direct' : 'reps'

  const memberId = (body?.memberId ?? '').trim()
  const member = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(memberId, user.id).first<{ id: string }>()
  if (!member) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })

  const repCount = normalizeCount(body?.repCount, 1)
  const pointPerRep = normalizeCount(body?.pointPerRep, 1)

  const id = crypto.randomUUID()
  const sortOrder = await nextItemSortOrder(db, user.id, memberId)
  await db
    .prepare('INSERT INTO keiko_items (id, user_id, member_id, name, kind, rep_count, point_per_rep, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)')
    .bind(id, user.id, memberId, name, kind, repCount, pointPerRep, sortOrder)
    .run()

  return shapeKeikoItem({ id, member_id: memberId, name, kind, rep_count: repCount, point_per_rep: pointPerRep, sort_order: sortOrder, active: 1 })
})
