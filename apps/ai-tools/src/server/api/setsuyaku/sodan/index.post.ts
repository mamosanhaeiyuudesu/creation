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

  const body = await readBody<{ id: string; date: string; wants: string; tags: string[]; result: string }>(event)
  if (!body?.wants?.trim()) throw createError({ statusCode: 400, message: 'wants は必須です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await ensureTables(db)

  const id = body.id || crypto.randomUUID()
  await db
    .prepare('INSERT INTO setsuyaku_sodan (id, user_id, date, wants, tags, result) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, body.date, body.wants.trim(), JSON.stringify(body.tags ?? []), body.result ?? '')
    .run()

  return { id, date: body.date, wants: body.wants.trim(), tags: body.tags ?? [], result: body.result ?? '' }
})
