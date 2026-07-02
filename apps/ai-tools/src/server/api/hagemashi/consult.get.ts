import { getSessionUser } from '~/server/utils/auth'

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS hagemashi_consult_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) return { messages: [] }

  const user = await getSessionUser(event).catch(() => null)
  if (!user) return { messages: [] }

  await db.prepare(CREATE_TABLE).run()

  const rows = await db
    .prepare('SELECT role, content FROM hagemashi_consult_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 200')
    .bind(user.id)
    .all()

  return { messages: (rows?.results ?? []).map((r: any) => ({ role: r.role, content: r.content })) }
})
