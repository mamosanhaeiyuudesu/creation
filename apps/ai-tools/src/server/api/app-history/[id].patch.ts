import { getSessionUser } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const id = getRouterParam(event, 'id')
  const body = await readBody<{ text?: string; notes?: string; title?: string }>(event)

  if (body.text !== undefined) {
    const storedText = await encryptComment(event, body.text)
    await db
      .prepare('UPDATE app_history SET text = ? WHERE id = ? AND user_id = ?')
      .bind(storedText, id, user.id)
      .run()
  }

  if (body.notes !== undefined) {
    const storedNotes = await encryptComment(event, body.notes)
    await db
      .prepare('UPDATE app_history SET notes = ? WHERE id = ? AND user_id = ?')
      .bind(storedNotes, id, user.id)
      .run()
  }

  if (body.title !== undefined) {
    const storedTitle = await encryptComment(event, body.title)
    await db
      .prepare('UPDATE app_history SET title = ? WHERE id = ? AND user_id = ?')
      .bind(storedTitle, id, user.id)
      .run()
  }

  return { ok: true }
})
