import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  buildInsights,
} from '~/server/utils/guesthouse'
import { VOCAB_VERSION } from '~/server/utils/guesthouse-insights'
import type { Insights } from '~/types/guesthouse'

// 顧客分析（/guesthouse/insights）。保存済みの中間データを返すだけで Claude は叩かない。
// stale=true は「日記があるのに未抽出／日記が編集された」＝「更新」で再抽出できる状態。
export default defineEventHandler(async (event): Promise<Insights> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  return await buildInsights(event, db, user.id, VOCAB_VERSION)
})
