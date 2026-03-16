export default defineEventHandler(async (event) => {
  const body = await readBody<{ label: string; color: string }>(event)
  if (!body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'label is required' })
  }

  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB
  const id = crypto.randomUUID()
  const now = Date.now()

  await db
    .prepare('INSERT INTO tag_library (id, label, color, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, body.label.trim(), body.color, now)
    .run()

  const row = await db.prepare('SELECT * FROM tag_library WHERE id = ?').bind(id).first()
  return { tag: row }
})
