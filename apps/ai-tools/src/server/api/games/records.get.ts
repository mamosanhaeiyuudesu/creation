import { getAppDb } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { game, stage } = getQuery(event) as { game: string; stage: string }
  if (!game || !stage) throw createError({ statusCode: 400, message: 'game and stage are required' })

  const db = getAppDb(event)
  if (!db) return []

  const rows = await db
    .prepare(
      'SELECT name, seconds, recorded_at FROM game_records WHERE game = ? AND stage = ? ORDER BY seconds ASC LIMIT 10'
    )
    .bind(game, Number(stage))
    .all<{ name: string; seconds: number; recorded_at: string }>()

  return rows.results.map((r, i) => ({ rank: i + 1, ...r }))
})
