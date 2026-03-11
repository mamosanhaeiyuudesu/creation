export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    title?: string
    description?: string
    status?: string
    tags?: { label: string; color: string }[]
    order_index?: number
  }>(event)

  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB
  const now = Date.now()

  const setClauses: string[] = []
  const values: unknown[] = []

  if (body.title !== undefined) {
    setClauses.push('title = ?')
    values.push(body.title.trim())
  }
  if (body.description !== undefined) {
    setClauses.push('description = ?')
    values.push(body.description)
  }
  if (body.status !== undefined) {
    setClauses.push('status = ?')
    values.push(body.status)
  }
  if (body.tags !== undefined) {
    setClauses.push('tags = ?')
    values.push(JSON.stringify(body.tags))
  }
  if (body.order_index !== undefined) {
    setClauses.push('order_index = ?')
    values.push(body.order_index)
  }

  if (setClauses.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'no fields to update' })
  }

  setClauses.push('updated_at = ?')
  values.push(now, id)

  await db
    .prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const row = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first()
  return { task: { ...row, tags: JSON.parse(row.tags || '[]') } }
})
