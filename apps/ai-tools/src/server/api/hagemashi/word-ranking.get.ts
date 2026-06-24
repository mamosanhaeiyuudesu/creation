import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT data FROM word_rankings WHERE user_id = ? AND app = ?')
    .bind(user.id, 'hagemashi')
    .first() as { data: string } | null

  if (!row) return []

  try {
    return JSON.parse(row.data)
  } catch {
    return []
  }
})
