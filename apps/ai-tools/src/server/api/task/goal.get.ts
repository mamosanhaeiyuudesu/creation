// 今週の目標を1件返す（未設定なら空文字）。
import { ensureTaskGoalTables } from '~/server/utils/task-goal'
import { isDateKey, requireTaskDb, requireTaskUser } from '~/server/utils/task-sns'

export default defineEventHandler(async (event): Promise<{ goal: string }> => {
  const user = await requireTaskUser(event)
  const query = getQuery(event)
  const weekStart = query.weekStart as string
  if (!isDateKey(weekStart)) throw createError({ statusCode: 400, message: '週の開始日が不正です' })

  const db = requireTaskDb(event)
  await ensureTaskGoalTables(db)

  const row = await db
    .prepare('SELECT goal FROM task_weekly_goals WHERE user_id = ? AND week_start = ?')
    .bind(user.id, weekStart)
    .first<{ goal: string }>()

  return { goal: row?.goal ?? '' }
})
