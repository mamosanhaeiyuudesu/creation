import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, loadMembers, loadPointBuckets, isValidDate } from '~/server/utils/keiko'
import type { KeikoPoints } from '~/types/keiko'

// 月表示・年表示用のポイント集計。unit=day ならメンバー×日、unit=month ならメンバー×月で返す。
export default defineEventHandler(async (event): Promise<KeikoPoints> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const query = getQuery(event)
  const from = isValidDate(query.from) ? query.from : null
  const to = isValidDate(query.to) ? query.to : null
  if (!from || !to) throw createError({ statusCode: 400, message: 'from/to (YYYY-MM-DD) が必要です' })
  const unit = query.unit === 'month' ? 'month' : 'day'

  const [members, buckets] = await Promise.all([loadMembers(db, user.id), loadPointBuckets(db, user.id, from, to, unit)])

  return { members, buckets }
})
