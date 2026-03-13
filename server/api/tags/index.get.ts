export default defineEventHandler(async (event) => {
  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB
  const { results } = await db
    .prepare('SELECT * FROM tag_library ORDER BY created_at ASC')
    .all()
  return { tags: results }
})
