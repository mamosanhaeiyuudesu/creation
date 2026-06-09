import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const query = getQuery(event)
  const year = Number(query.year)
  const month = Number(query.month)

  if (!year || !month || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'year と month が必要です' })
  }

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS office_records (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT NOT NULL,
      date       TEXT NOT NULL,
      checks     TEXT NOT NULL DEFAULT '[]',
      comment    TEXT NOT NULL DEFAULT '',
      day_type   TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, date)
    )
  `).catch(() => {})

  const m = String(month).padStart(2, '0')
  const from = `${year}-${m}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

  const rows = await db
    .prepare('SELECT date, checks, comment, day_type FROM office_records WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date')
    .bind(user.id, from, to)
    .all<{ date: string; checks: string; comment: string; day_type: string | null }>()

  return (rows.results ?? []).map(r => ({
    date: r.date,
    checks: JSON.parse(r.checks) as boolean[],
    comment: r.comment,
    dayType: r.day_type ?? null,
  }))
})
