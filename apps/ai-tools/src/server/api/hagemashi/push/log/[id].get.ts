import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const id = getRouterParam(event, 'id')
  const row = await db
    .prepare("SELECT text, title, created_at FROM app_history WHERE id = ? AND user_id = ? AND app = 'hagemashi-encourage'")
    .bind(id, user.id)
    .first() as { text: string; title: string; created_at: string } | null

  if (!row) throw createError({ statusCode: 404, message: '見つかりません' })
  return row
})
