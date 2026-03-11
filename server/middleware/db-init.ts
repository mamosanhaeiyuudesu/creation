export default defineEventHandler(async (event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/tasks')) return

  const { cloudflare } = event.context as any
  if (!cloudflare?.env?.DB) return

  await cloudflare.env.DB.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      tags TEXT NOT NULL DEFAULT '[]',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
})
