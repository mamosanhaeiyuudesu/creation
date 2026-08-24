// 今週の目標を保存する。空文字は行を残さず削除する。
import { ensureTaskGoalTables } from '~/server/utils/task-goal'
import { isDateKey, requireTaskDb, requireTaskUser } from '~/server/utils/task-sns'

export default defineEventHandler(async (event) => {
  const user = await requireTaskUser(event)
  const body = await readBody<{ weekStart?: string; goal?: string }>(event)

  if (!isDateKey(body?.weekStart)) throw createError({ statusCode: 400, message: '週の開始日が不正です' })
  const goal = typeof body?.goal === 'string' ? body.goal.slice(0, 200) : ''

  const db = requireTaskDb(event)
  await ensureTaskGoalTables(db)

  if (!goal.trim()) {
    await db
      .prepare('DELETE FROM task_weekly_goals WHERE user_id = ? AND week_start = ?')
      .bind(user.id, body.weekStart)
      .run()
  } else {
    await db
      .prepare(
        "INSERT INTO task_weekly_goals (user_id, week_start, goal, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, week_start) DO UPDATE SET goal = excluded.goal, updated_at = excluded.updated_at"
      )
      .bind(user.id, body.weekStart, goal)
      .run()
  }

  return { ok: true }
})
