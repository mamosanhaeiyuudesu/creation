import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) return { ok: true }

  const user = await getSessionUser(event).catch(() => null)
  if (!user) return { ok: true }

  await db
    .prepare('DELETE FROM hagemashi_consult_messages WHERE user_id = ?')
    .bind(user.id)
    .run()

  return { ok: true }
})
