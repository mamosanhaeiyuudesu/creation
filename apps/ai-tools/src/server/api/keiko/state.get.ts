import {
  requireKeikoUser,
  requireKeikoDb,
  ensureKeikoTables,
  seedDefaultMembersIfEmpty,
  seedDefaultItemsIfEmpty,
  loadMembers,
  loadItems,
  loadRecords,
  isValidDate,
} from '~/server/utils/keiko'
import type { KeikoState } from '~/types/keiko'

// 週表示に必要な一式（メンバー・練習項目・期間内の花丸）をまとめて返す。
export default defineEventHandler(async (event): Promise<KeikoState> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)
  await seedDefaultMembersIfEmpty(db, user.id)
  await seedDefaultItemsIfEmpty(db, user.id)

  const query = getQuery(event)
  const from = isValidDate(query.from) ? query.from : null
  const to = isValidDate(query.to) ? query.to : null
  if (!from || !to) throw createError({ statusCode: 400, message: 'from/to (YYYY-MM-DD) が必要です' })

  const [members, items, records] = await Promise.all([loadMembers(db, user.id), loadItems(db, user.id), loadRecords(db, user.id, from, to)])

  return { members, items, records }
})
