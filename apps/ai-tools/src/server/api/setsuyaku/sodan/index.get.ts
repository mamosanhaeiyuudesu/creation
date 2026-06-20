import { getSessionUser, getAppDb } from '~/server/utils/auth'

async function ensureTables(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS setsuyaku_sodan (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
      wants TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
      result TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await ensureTables(db)

  const rows = await db
    .prepare('SELECT id, date, wants, tags, result FROM setsuyaku_sodan WHERE user_id = ? ORDER BY date DESC, created_at DESC')
    .bind(user.id)
    .all<{ id: string; date: string; wants: string; tags: string; result: string }>()

  return (rows.results ?? []).map(r => ({ ...r, tags: JSON.parse(r.tags) as string[] }))
})
