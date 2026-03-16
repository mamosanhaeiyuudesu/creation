export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ label?: string; color?: string }>(event)

  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB

  const setClauses: string[] = []
  const values: unknown[] = []

  if (body.label !== undefined) {
    setClauses.push('label = ?')
    values.push(body.label.trim())
  }
  if (body.color !== undefined) {
    setClauses.push('color = ?')
    values.push(body.color)
  }
  if (setClauses.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'no fields to update' })
  }
  values.push(id)

  await db
    .prepare(`UPDATE tag_library SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const row = await db.prepare('SELECT * FROM tag_library WHERE id = ?').bind(id).first()
  return { tag: row }
})
