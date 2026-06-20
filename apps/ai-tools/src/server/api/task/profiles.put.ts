import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'

interface ProfileInput {
  id: string
  name: string
  key: string
  token: string
  excluded: string
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ profiles: ProfileInput[] }>(event)
  if (!Array.isArray(body?.profiles)) throw createError({ statusCode: 400, message: 'profiles が必要です' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS task_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      key_enc TEXT NOT NULL DEFAULT '',
      token_enc TEXT NOT NULL DEFAULT '',
      excluded TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).catch(() => {})

  await db.prepare('DELETE FROM task_profiles WHERE user_id = ?').bind(user.id).run()

  for (let i = 0; i < body.profiles.length; i++) {
    const p = body.profiles[i]
    const keyEnc = await encryptComment(event, p.key)
    const tokenEnc = await encryptComment(event, p.token)
    await db
      .prepare('INSERT INTO task_profiles (id, user_id, name, key_enc, token_enc, excluded, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(p.id, user.id, p.name, keyEnc, tokenEnc, p.excluded, i)
      .run()
  }

  return { ok: true }
})
