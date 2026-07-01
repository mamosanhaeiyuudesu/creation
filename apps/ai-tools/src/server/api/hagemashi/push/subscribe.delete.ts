import { getSessionUser } from '~/server/utils/auth'

// 購読解除（endpoint 指定。無ければユーザーの全端末を削除）
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{ endpoint?: string }>(event).catch(() => null)
  const endpoint = body?.endpoint

  if (endpoint) {
    await db
      .prepare('DELETE FROM hagemashi_push_subscriptions WHERE endpoint = ? AND user_id = ?')
      .bind(endpoint, user.id)
      .run()
  } else {
    await db
      .prepare('DELETE FROM hagemashi_push_subscriptions WHERE user_id = ?')
      .bind(user.id)
      .run()
  }

  return { ok: true }
})
