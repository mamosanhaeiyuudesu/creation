import { getSessionUser } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT data FROM hagemashi_achievements WHERE user_id = ?')
    .bind(user.id)
    .first() as { data: string } | null

  if (!row) return []

  try {
    const parsed = JSON.parse(await decryptComment(event, row.data))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})
