// 投稿カウンター（Instagram / note）の全記録を返す。1日1プラットフォーム1行。
import { ensureTaskSnsTables, requireTaskDb, requireTaskUser } from '~/server/utils/task-sns'
import type { SnsRow } from '~/server/utils/task-sns'

export default defineEventHandler(async (event): Promise<SnsRow[]> => {
  const user = await requireTaskUser(event)
  const db = requireTaskDb(event)
  await ensureTaskSnsTables(db)

  const rows = await db
    .prepare('SELECT date, platform, count FROM task_sns_posts WHERE user_id = ? ORDER BY date')
    .bind(user.id)
    .all<SnsRow>()

  return rows.results ?? []
})
