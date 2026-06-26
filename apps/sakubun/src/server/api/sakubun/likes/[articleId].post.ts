import { getSakubunDb, fingerprint } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getSakubunDb(event)
  const articleId = Number(getRouterParam(event, 'articleId'))

  if (!db) return { count: 0, liked: false }

  const fp = await fingerprint(event)
  const existing = await db
    .prepare('SELECT id FROM likes WHERE article_id = ? AND fingerprint = ?')
    .bind(articleId, fp)
    .first()

  if (existing) {
    await db.prepare('DELETE FROM likes WHERE article_id = ? AND fingerprint = ?').bind(articleId, fp).run()
  } else {
    await db.prepare('INSERT OR IGNORE INTO likes (article_id, fingerprint) VALUES (?, ?)').bind(articleId, fp).run()
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) as count FROM likes WHERE article_id = ?')
    .bind(articleId)
    .first<{ count: number }>()

  return { count: countRow?.count ?? 0, liked: !existing }
})
