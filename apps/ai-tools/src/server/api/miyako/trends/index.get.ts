import { getAppDb } from '~/server/utils/auth'
import { ensureMiyakoTrendTables, loadTrendState } from '~/server/utils/miyako-trends'
import type { MiyakoTrendState } from '~/types/miyako-trends'

/** /miyako「直近の傾向」の表示用。公開ページなのでログイン不要。?session= で過去の定例会に切り替える。 */
export default defineEventHandler(async (event): Promise<MiyakoTrendState> => {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureMiyakoTrendTables(db)

  const session = getQuery(event).session
  return await loadTrendState(db, typeof session === 'string' && session ? session : undefined)
})
