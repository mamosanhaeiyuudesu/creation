export default defineEventHandler(async (event) => {
  const { updates } = await readBody<{
    updates: { id: string; status: string; order_index: number }[]
  }>(event)

  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: true }
  }

  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB
  const now = Date.now()

  const batch = updates.map(({ id, status, order_index }) =>
    db
      .prepare('UPDATE tasks SET status = ?, order_index = ?, updated_at = ? WHERE id = ?')
      .bind(status, order_index, now, id),
  )

  await db.batch(batch)
  return { success: true }
})
