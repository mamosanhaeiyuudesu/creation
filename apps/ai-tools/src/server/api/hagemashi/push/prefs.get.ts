import { getSessionUser } from '~/server/utils/auth'

export interface PushPrefs {
  enabled: boolean
  hour: number
  minute: number
  timezone: string
  minIntervalDays: number
  nudgeAfterSilentDays: number
}

const DEFAULT_PREFS: PushPrefs = {
  enabled: false,
  hour: 20,
  minute: 0,
  timezone: 'Asia/Tokyo',
  minIntervalDays: 1,
  nudgeAfterSilentDays: 3,
}

export default defineEventHandler(async (event): Promise<PushPrefs> => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare(
      'SELECT enabled, hour, minute, timezone, min_interval_days, nudge_after_silent_days FROM hagemashi_push_prefs WHERE user_id = ?'
    )
    .bind(user.id)
    .first() as {
      enabled: number
      hour: number
      minute: number
      timezone: string
      min_interval_days: number
      nudge_after_silent_days: number
    } | null

  if (!row) return DEFAULT_PREFS

  return {
    enabled: !!row.enabled,
    hour: row.hour,
    minute: row.minute,
    timezone: row.timezone,
    minIntervalDays: row.min_interval_days,
    nudgeAfterSilentDays: row.nudge_after_silent_days,
  }
})
