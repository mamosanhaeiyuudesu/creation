// 投稿カウンターの1日ぶんを保存する。0件は行を残さず削除する（累計はSUMで出すため0行は不要）。
import { ensureTaskSnsTables, isDateKey, requireTaskDb, requireTaskUser, SNS_PLATFORM_KEYS } from '~/server/utils/task-sns'

export default defineEventHandler(async (event) => {
  const user = await requireTaskUser(event)
  const body = await readBody<{ date?: string; counts?: Record<string, number> }>(event)

  if (!isDateKey(body?.date)) throw createError({ statusCode: 400, message: '日付が不正です' })
  const counts = body?.counts
  if (!counts || typeof counts !== 'object') throw createError({ statusCode: 400, message: 'counts が必要です' })

  const db = requireTaskDb(event)
  await ensureTaskSnsTables(db)

  for (const platform of SNS_PLATFORM_KEYS) {
    if (!(platform in counts)) continue
    const raw = Number(counts[platform])
    const value = Number.isFinite(raw) ? Math.max(0, Math.min(9999, Math.round(raw))) : 0
    if (value === 0) {
      await db
        .prepare('DELETE FROM task_sns_posts WHERE user_id = ? AND date = ? AND platform = ?')
        .bind(user.id, body.date, platform)
        .run()
    } else {
      await db
        .prepare(
          "INSERT INTO task_sns_posts (user_id, date, platform, count, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, date, platform) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at"
        )
        .bind(user.id, body.date, platform, value)
        .run()
    }
  }

  return { ok: true }
})
