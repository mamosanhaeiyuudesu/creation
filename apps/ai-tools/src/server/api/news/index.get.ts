import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { ensureNewsTables, listCurrentStates, listItems, listRuns } from '~/server/utils/news'
import { NEWS_MIN_IMPORTANCE } from '~/utils/news-sources'
import type { NewsState } from '~/types/news'

/** /news ページの表示に必要な一式（記事＋潮流の考察＋実行ログ）。 */
export default defineEventHandler(async (event): Promise<NewsState> => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureNewsTables(db)

  const limit = Math.min(500, Math.max(1, Number(getQuery(event).limit ?? 200) || 200))
  const [items, runs, currents] = await Promise.all([listItems(db, limit), listRuns(db, 20), listCurrentStates(db)])

  return { items, runs, currents, minImportance: NEWS_MIN_IMPORTANCE }
})
