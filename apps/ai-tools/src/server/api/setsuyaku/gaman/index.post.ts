import { getSessionUser, getAppDb } from '~/server/utils/auth'

async function ensureTables(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS setsuyaku_gaman (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
      name TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ id: string; date: string; name: string; price: number; reason: string; tags: string[] }>(event)
  if (!body?.name?.trim()) throw createError({ statusCode: 400, message: 'name は必須です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })

  await ensureTables(db)

  const id = body.id || crypto.randomUUID()
  await db
    .prepare('INSERT INTO setsuyaku_gaman (id, user_id, date, name, price, reason, tags) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, body.date, body.name.trim(), body.price ?? 0, body.reason ?? '', JSON.stringify(body.tags ?? []))
    .run()

  return { id, date: body.date, name: body.name.trim(), price: body.price ?? 0, reason: body.reason ?? '', tags: body.tags ?? [] }
})
