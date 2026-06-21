import { getSessionUser, getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '認証が必要です' })

  const { game } = getQuery(event) as { game: string }
  if (!game) throw createError({ statusCode: 400, message: 'game is required' })

  const db = getAppDb(event)
  if (!db) return { stage: 1, highScore: 0 }

  const row = await db
    .prepare('SELECT stage, high_score FROM game_progress WHERE user_id = ? AND game = ?')
    .bind(user.id, game)
    .first<{ stage: number; high_score: number }>()

  return row ? { stage: row.stage, highScore: row.high_score } : { stage: 1, highScore: 0 }
})
