import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { app, id, text, title, timestamp, notes } = await readBody<{
    app: string
    id: string
    text: string
    title: string
    timestamp: string
    notes?: string
  }>(event)

  if (!app || !id) throw createError({ statusCode: 400, message: '必須パラメータが不足しています' })

  const createdAt = timestamp ? timestamp.replace('T', ' ').replace('Z', '') : new Date().toISOString().replace('T', ' ').replace('Z', '')

  await db
    .prepare('INSERT OR REPLACE INTO app_history (id, user_id, app, text, title, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, app, text ?? '', title ?? '', notes ?? null, createdAt)
    .run()

  return { ok: true }
})
