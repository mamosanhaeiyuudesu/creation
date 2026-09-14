import { getAppDb } from '~/server/utils/auth'
import { ensureFarmNewsTables, listCurrentStates, listItems, listRuns, listSnapshots } from '~/server/utils/farm-news'
import type { FarmNewsState } from '~/types/farm-news'

/**
 * /farm-news ページの表示に必要な一式。誰でも閲覧できる公開ページなのでログイン確認はしない
 * （news の同名APIとの違い。管理用の収集・アーカイブ生成だけ run.post.ts 等で秘密キーを要求する）。
 */
export default defineEventHandler(async (event): Promise<FarmNewsState> => {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureFarmNewsTables(db)

  const limit = Math.min(500, Math.max(1, Number(getQuery(event).limit ?? 200) || 200))
  const [items, runs, currents, snapshots] = await Promise.all([
    listItems(db, limit),
    listRuns(db, 20),
    listCurrentStates(db),
    listSnapshots(db),
  ])

  return { items, runs, currents, snapshots }
})
