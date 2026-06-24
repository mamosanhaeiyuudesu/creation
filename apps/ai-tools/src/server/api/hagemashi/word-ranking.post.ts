import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { words } = await readBody<{ words: Array<{ word: string; count: number }> }>(event)
  if (!Array.isArray(words)) throw createError({ statusCode: 400, message: '不正なデータ形式' })

  await db
    .prepare("INSERT OR REPLACE INTO word_rankings (user_id, app, data, updated_at) VALUES (?, ?, ?, datetime('now'))")
    .bind(user.id, 'hagemashi', JSON.stringify(words))
    .run()

  return { ok: true }
})
