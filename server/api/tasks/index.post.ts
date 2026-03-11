export default defineEventHandler(async (event) => {
  const body = await readBody<{
    title: string
    description?: string
    status?: string
    tags?: { label: string; color: string }[]
  }>(event)

  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB
  const status = body.status || 'todo'
  const now = Date.now()
  const id = crypto.randomUUID()

  const { results: existing } = await db
    .prepare('SELECT MAX(order_index) as max_order FROM tasks WHERE status = ?')
    .bind(status)
    .all()
  const maxOrder = (existing[0]?.max_order as number) ?? -1

  await db
    .prepare(
      'INSERT INTO tasks (id, title, description, status, tags, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      body.title.trim(),
      body.description || '',
      status,
      JSON.stringify(body.tags || []),
      maxOrder + 1,
      now,
      now,
    )
    .run()

  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first()
  return { task: { ...row, tags: JSON.parse(row.tags || '[]') } }
})
