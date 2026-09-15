import { requireFarmNewsAdmin } from '~/server/utils/farm-news'
import { runFarmNewsHistoricalBackfill } from '~/server/utils/farm-news-run'
import type { FarmNewsHistoricalBackfillResult } from '~/types/farm-news'

/**
 * 手動実行（過去アーカイブのWeb検索バックフィル）。archive-run とは別物＝実際の収集記事が無い
 * 過去の年を、Claudeの Web検索で調べて年次スナップショットとして埋める（詳しくは
 * server/utils/farm-news-run.ts の runFarmNewsHistoricalBackfill 冒頭コメント参照）。
 * 1回の実行で最大 FARM_NEWS_HISTORICAL_MAX_SNAPSHOTS_PER_RUN 年ぶんしか生成しないので、
 * 過去5年ぶん埋めるには複数回叩く必要がある。
 * 例: curl -X POST https://<host>/api/farm-news/historical-backfill -H "x-admin-key: $NUXT_FARM_NEWS_ADMIN_KEY"
 */
export default defineEventHandler(async (event): Promise<FarmNewsHistoricalBackfillResult> => {
  requireFarmNewsAdmin(event)

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runFarmNewsHistoricalBackfill(env)
})
