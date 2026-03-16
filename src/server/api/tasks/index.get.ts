export default defineEventHandler(async (event) => {
  const { cloudflare } = event.context as any
  const db = cloudflare.env.DB

  const { results } = await db
    .prepare('SELECT * FROM tasks ORDER BY status, order_index ASC')
    .all()

  return {
    tasks: results.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    })),
  }
})
