import { getAppDb } from '~/server/utils/auth'

// ゲームプレフィックス全体（例: panel-de-pon%）で名前の使用頻度を集計して返す
export default defineEventHandler(async (event) => {
  const { game } = getQuery(event) as { game: string }
  if (!game) throw createError({ statusCode: 400, message: 'game is required' })

  const db = getAppDb(event)
  if (!db) return []

  const rows = await db
    .prepare(
      'SELECT name, COUNT(*) as cnt FROM game_records WHERE game LIKE ? GROUP BY name ORDER BY cnt DESC LIMIT 5'
    )
    .bind(game + '%')
    .all<{ name: string; cnt: number }>()

  return rows.results.map(r => r.name)
})
