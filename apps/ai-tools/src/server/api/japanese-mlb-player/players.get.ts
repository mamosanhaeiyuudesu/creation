import { getDevPlayers } from '../../utils/mlb-dev'

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (import.meta.dev || !db) {
    return getDevPlayers()
  }

  const result = await db.prepare(
    'SELECT id, name_ja, name_en, position, team, team_full, league FROM mlb_players ORDER BY league, position DESC'
  ).all<{ id: string; name_ja: string; name_en: string; position: string; team: string; team_full: string; league: string }>()

  return result.results.map(r => ({
    id: r.id,
    nameJa: r.name_ja,
    nameEn: r.name_en,
    position: r.position,
    team: r.team,
    teamFull: r.team_full,
    league: r.league,
  }))
})
