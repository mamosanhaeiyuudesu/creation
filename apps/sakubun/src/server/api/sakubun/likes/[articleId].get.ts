import { getSakubunDb, fingerprint } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getSakubunDb(event)
  const articleId = Number(getRouterParam(event, 'articleId'))

  if (!db) return { count: 0, liked: false }

  const fp = await fingerprint(event)
  const [countRow, likedRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM likes WHERE article_id = ?').bind(articleId).first<{ count: number }>(),
    db.prepare('SELECT 1 FROM likes WHERE article_id = ? AND fingerprint = ?').bind(articleId, fp).first(),
  ])

  return { count: countRow?.count ?? 0, liked: !!likedRow }
})
