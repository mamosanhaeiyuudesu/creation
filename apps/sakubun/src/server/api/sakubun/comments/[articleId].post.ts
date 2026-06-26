import { getSakubunDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getSakubunDb(event)
  const articleId = Number(getRouterParam(event, 'articleId'))
  const raw = await readBody(event)

  const name = String(raw?.name ?? '').trim().slice(0, 20)
  const body = String(raw?.body ?? '').trim().slice(0, 400)

  if (!name || !body) {
    throw createError({ statusCode: 400, message: '名前とコメントは必須です' })
  }

  if (!db) {
    throw createError({ statusCode: 503, message: 'データベースが利用できません' })
  }

  await db
    .prepare('INSERT INTO comments (article_id, name, body) VALUES (?, ?, ?)')
    .bind(articleId, name, body)
    .run()

  return { ok: true }
})
