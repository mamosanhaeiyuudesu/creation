import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '認証が必要です' })

  const { game, stage, highScore } = await readBody<{ game: string; stage: number; highScore: number }>(event)
  if (!game) throw createError({ statusCode: 400, message: 'game is required' })

  const db = getAppDb(event)
  if (!db) return { ok: true }

  await db
    .prepare(`
      INSERT INTO game_progress (user_id, game, stage, high_score, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, game) DO UPDATE SET
        stage      = MAX(excluded.stage, game_progress.stage),
        high_score = MAX(excluded.high_score, game_progress.high_score),
        updated_at = excluded.updated_at
    `)
    .bind(user.id, game, stage, highScore)
    .run()

  return { ok: true }
})
