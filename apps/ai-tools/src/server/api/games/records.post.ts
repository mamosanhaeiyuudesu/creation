import { getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { game, stage, name, seconds } = await readBody<{
    game: string; stage: number; name: string; seconds: number
  }>(event)

  if (!game || !stage || !name || seconds == null)
    throw createError({ statusCode: 400, message: 'invalid request' })
  if (!/^[A-Z]{3}$/.test(name))
    throw createError({ statusCode: 400, message: 'name must be 3 uppercase letters' })
  if (seconds <= 0 || seconds > 7200)
    throw createError({ statusCode: 400, message: 'invalid seconds' })

  const db = getAppDb(event)
  if (!db) return { ok: true, rank: null }

  await db
    .prepare('INSERT INTO game_records (game, stage, name, seconds) VALUES (?, ?, ?, ?)')
    .bind(game, stage, name, seconds)
    .run()

  const rankRow = await db
    .prepare('SELECT COUNT(*) as rank FROM game_records WHERE game = ? AND stage = ? AND seconds <= ?')
    .bind(game, stage, seconds)
    .first<{ rank: number }>()

  return { ok: true, rank: rankRow?.rank ?? null }
})
