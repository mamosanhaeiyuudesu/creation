import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = getRouterParam(event, 'date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, message: '日付の形式が正しくありません (YYYY-MM-DD)' })
  }

  const { checks, comment, dayType } = await readBody<{ checks?: boolean[]; comment?: string; dayType?: string | null }>(event)
  if (checks !== undefined && (!Array.isArray(checks) || (checks.length !== 0 && checks.length !== 7))) {
    throw createError({ statusCode: 400, message: 'checks は length=0 または length=7 の配列が必要です' })
  }
  if (dayType !== undefined && dayType !== null && dayType !== 'fu' && dayType !== 'kyu') {
    throw createError({ statusCode: 400, message: 'dayType は fu / kyu / null のいずれかが必要です' })
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
  // 010_office.sql で作成済みのテーブルに day_type が無い場合に追加（既存なら無視）
  await db.prepare('ALTER TABLE office_records ADD COLUMN day_type TEXT').run().catch(() => {})

  const safeChecks = checks ?? []
  const safeComment = comment ?? ''
  const safeDayType = dayType !== undefined ? dayType : null

  await db
    .prepare(`
      INSERT INTO office_records (user_id, date, checks, comment, day_type)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, date) DO UPDATE SET
        checks     = excluded.checks,
        comment    = excluded.comment,
        day_type   = excluded.day_type,
        updated_at = datetime('now')
    `)
    .bind(user.id, date, JSON.stringify(safeChecks), safeComment, safeDayType)
    .run()

  return { date, checks: safeChecks, comment: safeComment, dayType: safeDayType }
})
