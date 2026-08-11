import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, nextSortOrder, shapeKeikoItem } from '~/server/utils/keiko'
import type { KeikoItem } from '~/types/keiko'

// 練習項目を1件追加（末尾に追加）。
export default defineEventHandler(async (event): Promise<KeikoItem> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ name?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '項目名を入力してください' })

  const id = crypto.randomUUID()
  const sortOrder = await nextSortOrder(db, 'keiko_items', user.id)
  await db.prepare('INSERT INTO keiko_items (id, user_id, name, sort_order, active) VALUES (?, ?, ?, ?, 1)').bind(id, user.id, name, sortOrder).run()

  return shapeKeikoItem({ id, name, sort_order: sortOrder, active: 1 })
})
