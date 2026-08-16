import { hashPassword, verifyPassword, getAppDb, setSessionCookie } from '~/server/utils/auth'

// パスワード変更。アカウントの新規作成はアプリから行えない（DBを直接操作して発行する）ため、
// ここはログイン前でも使えるようにしている（現在のパスワードを知っていること＝本人確認）。
export default defineEventHandler(async (event) => {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { username, currentPassword, newPassword } = await readBody<{
    username: string
    currentPassword: string
    newPassword: string
  }>(event)

  if (!username || !currentPassword || !newPassword) {
    throw createError({ statusCode: 400, message: 'すべての項目を入力してください' })
  }
  if (newPassword.length < 6) {
    throw createError({ statusCode: 400, message: '新しいパスワードは6文字以上で入力してください' })
  }
  if (newPassword === currentPassword) {
    throw createError({ statusCode: 400, message: '現在のパスワードと同じです' })
  }

  const user = await db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>()

  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    throw createError({ statusCode: 401, message: 'ユーザー名または現在のパスワードが正しくありません' })
  }

  const passwordHash = await hashPassword(newPassword)
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, user.id).run()

  // 変更前のセッションは全部無効にする（他の端末に残ったままにしない）
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run()

  // そのままログインした状態にして、変更直後に入り直す手間をなくす
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ').replace('Z', '')
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, user.id, expiresAt)
    .run()

  setSessionCookie(event, sessionId)
  return { id: user.id, username: user.username }
})
