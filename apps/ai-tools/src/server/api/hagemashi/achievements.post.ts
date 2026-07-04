import { getSessionUser } from '~/server/utils/auth'

interface Achievement { id: string; sourceId: string; date: string; text: string; level: number }

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { items } = await readBody<{ items: Achievement[] }>(event)
  if (!Array.isArray(items)) throw createError({ statusCode: 400, message: '不正なデータ形式' })

  await db
    .prepare("INSERT OR REPLACE INTO hagemashi_achievements (user_id, data, updated_at) VALUES (?, ?, datetime('now'))")
    .bind(user.id, JSON.stringify(items))
    .run()

  return { ok: true }
})
