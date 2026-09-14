import { requireFarmNewsAdmin } from '~/server/utils/farm-news'
import { runFarmNewsTrends } from '~/server/utils/farm-news-run'

/**
 * 手動実行（潮流の考察更新）。/api/farm-news/run（収集）とは別リクエストにしてsubrequest予算を分ける
 * （理由は farm-news-run.ts 冒頭コメント参照）。
 * 例: curl -X POST https://<host>/api/farm-news/run-trends -H "x-admin-key: $NUXT_FARM_NEWS_ADMIN_KEY"
 */
export default defineEventHandler(async (event) => {
  requireFarmNewsAdmin(event)

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runFarmNewsTrends(env)
})
