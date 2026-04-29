import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const id = getRouterParam(event, 'id')
  const body = await readBody<{ text?: string; notes?: string; title?: string }>(event)

  if (body.text !== undefined) {
    await db
      .prepare('UPDATE app_history SET text = ? WHERE id = ? AND user_id = ?')
      .bind(body.text, id, user.id)
      .run()
  }

  if (body.notes !== undefined) {
    await db
      .prepare('UPDATE app_history SET notes = ? WHERE id = ? AND user_id = ?')
      .bind(body.notes, id, user.id)
      .run()
  }

  if (body.title !== undefined) {
    await db
      .prepare('UPDATE app_history SET title = ? WHERE id = ? AND user_id = ?')
      .bind(body.title, id, user.id)
      .run()
  }

  return { ok: true }
})
