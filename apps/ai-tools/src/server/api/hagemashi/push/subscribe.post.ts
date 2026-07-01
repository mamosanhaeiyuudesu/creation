import { getSessionUser } from '~/server/utils/auth'

// ブラウザの PushSubscription をサーバーに登録する
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }>(event)

  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    throw createError({ statusCode: 400, message: '不正な購読情報' })
  }

  await db
    .prepare(
      `INSERT INTO hagemashi_push_subscriptions (endpoint, user_id, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
    )
    .bind(endpoint, user.id, p256dh, auth)
    .run()

  return { ok: true }
})
