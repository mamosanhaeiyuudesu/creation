import { requireFarmNewsAdmin } from '~/server/utils/farm-news'
import { runFarmNewsDigest } from '~/server/utils/farm-news-run'
import type { FarmNewsRunResult } from '~/types/farm-news'

/**
 * 手動実行（収集）。公開ページにボタンは置かず、秘密キーをヘッダーに付けてコマンドから叩く運用。
 * 例: curl -X POST https://<host>/api/farm-news/run -H "x-admin-key: $NUXT_FARM_NEWS_ADMIN_KEY"
 */
export default defineEventHandler(async (event): Promise<FarmNewsRunResult> => {
  requireFarmNewsAdmin(event)

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runFarmNewsDigest(env, { trigger: 'manual' })
})
