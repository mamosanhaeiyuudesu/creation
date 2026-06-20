import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

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

  const rows = await db
    .prepare('SELECT id, name, key_enc, token_enc, excluded FROM task_profiles WHERE user_id = ? ORDER BY sort_order')
    .bind(user.id)
    .all<{ id: string; name: string; key_enc: string; token_enc: string; excluded: string }>()

  const profiles = await Promise.all(
    (rows.results ?? []).map(async (r) => ({
      id: r.id,
      name: r.name,
      key: await decryptComment(event, r.key_enc),
      token: await decryptComment(event, r.token_enc),
      excluded: r.excluded,
    }))
  )

  return profiles
})
