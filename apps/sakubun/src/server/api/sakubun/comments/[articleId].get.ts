import { getSakubunDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getSakubunDb(event)
  const articleId = Number(getRouterParam(event, 'articleId'))

  if (!db) return { comments: [] }

  const result = await db
    .prepare(
      'SELECT id, name, body, created_at FROM comments WHERE article_id = ? ORDER BY created_at DESC LIMIT 100'
    )
    .bind(articleId)
    .all<{ id: number; name: string; body: string; created_at: string }>()

  return { comments: result.results }
})
