export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB

  await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
  return { success: true }
})
