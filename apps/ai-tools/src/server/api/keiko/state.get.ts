import {
  requireKeikoUser,
  requireKeikoDb,
  ensureKeikoTables,
  seedDefaultMembersIfEmpty,
  migrateSharedItemsToMembers,
  loadMembers,
  loadItems,
  loadRecords,
  isValidDate,
} from '~/server/utils/keiko'
import type { KeikoState } from '~/types/keiko'

// 週表示・月表示に必要な一式（メンバー・練習項目・期間内の記録）をまとめて返す。
// 年表示は月別の集計（/api/keiko/points）だけで足りるので、records=0 なら記録の読み込みを省く。
export default defineEventHandler(async (event): Promise<KeikoState> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)
  await seedDefaultMembersIfEmpty(db, user.id)
  await migrateSharedItemsToMembers(db, user.id)

  const query = getQuery(event)
  const from = isValidDate(query.from) ? query.from : null
  const to = isValidDate(query.to) ? query.to : null
  if (!from || !to) throw createError({ statusCode: 400, message: 'from/to (YYYY-MM-DD) が必要です' })

  const withRecords = String(query.records ?? '1') !== '0'

  const [members, items, records] = await Promise.all([
    loadMembers(db, user.id),
    loadItems(db, user.id),
    withRecords ? loadRecords(db, user.id, from, to) : Promise.resolve([]),
  ])

  return { members, items, records }
})
