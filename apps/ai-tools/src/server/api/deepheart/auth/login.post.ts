import { deepheartVerifyPassword, getDeepheartDb, setDeepheartSessionCookie, DEEPHEART_SESSION_EXPIRE_DAYS } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { username, password } = await readBody<{ username: string; password: string }>(event)

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'ユーザー名とパスワードを入力してください' })
  }

  const user = await db
    .prepare('SELECT id, username, password_hash FROM deepheart_users WHERE username = ?')
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>()

  if (!user || !(await deepheartVerifyPassword(password, user.password_hash))) {
    throw createError({ statusCode: 401, message: 'ユーザー名またはパスワードが正しくありません' })
  }

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + DEEPHEART_SESSION_EXPIRE_DAYS * 24 * 3600 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '')
  await db
    .prepare('INSERT INTO deepheart_sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, user.id, expiresAt)
    .run()

  setDeepheartSessionCookie(event, sessionId)
  return { id: user.id, username: user.username }
})
