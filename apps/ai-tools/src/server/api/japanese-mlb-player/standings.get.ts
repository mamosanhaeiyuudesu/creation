import { fetchDivisionStandings } from '~/server/utils/mlbstats'
import { getDevStandings } from '~/server/utils/mlb-dev'
import { currentYearJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season ?? currentYearJST())

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  if (!env?.MLB_DB) {
    return getDevStandings()
  }

  return await fetchDivisionStandings(season)
})
