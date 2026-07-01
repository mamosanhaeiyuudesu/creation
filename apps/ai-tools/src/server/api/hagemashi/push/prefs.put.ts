import { getSessionUser } from '~/server/utils/auth'

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{
    enabled?: boolean
    hour?: number
    minute?: number
    timezone?: string
    minIntervalDays?: number
    nudgeAfterSilentDays?: number
  }>(event)

  const enabled = body?.enabled ? 1 : 0
  const hour = clampInt(body?.hour, 0, 23, 20)
  // 分は 0 または 30 に丸める
  const minute = clampInt(body?.minute, 0, 59, 0) >= 30 ? 30 : 0
  const timezone = typeof body?.timezone === 'string' && body.timezone ? body.timezone : 'Asia/Tokyo'
  const minIntervalDays = clampInt(body?.minIntervalDays, 0, 30, 1)
  const nudgeAfterSilentDays = clampInt(body?.nudgeAfterSilentDays, 1, 30, 3)

  await db
    .prepare(
      `INSERT INTO hagemashi_push_prefs (user_id, enabled, hour, minute, timezone, min_interval_days, nudge_after_silent_days, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         enabled = excluded.enabled,
         hour = excluded.hour,
         minute = excluded.minute,
         timezone = excluded.timezone,
         min_interval_days = excluded.min_interval_days,
         nudge_after_silent_days = excluded.nudge_after_silent_days,
         updated_at = datetime('now')`
    )
    .bind(user.id, enabled, hour, minute, timezone, minIntervalDays, nudgeAfterSilentDays)
    .run()

  return { ok: true }
})
