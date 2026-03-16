export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const { cloudflare } = event.context as any
  await cloudflare.env.DB.prepare('DELETE FROM tag_library WHERE id = ?').bind(id).run()
  return { success: true }
})
