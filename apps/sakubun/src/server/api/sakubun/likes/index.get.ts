import { getSakubunDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getSakubunDb(event)
  if (!db) return { counts: {} as Record<string, number> }

  const result = await db
    .prepare('SELECT article_id, COUNT(*) as count FROM likes GROUP BY article_id')
    .all<{ article_id: number; count: number }>()

  const counts: Record<string, number> = {}
  for (const row of result.results) {
    counts[String(row.article_id)] = row.count
  }
  return { counts }
})
