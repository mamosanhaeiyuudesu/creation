import { requireFarmNewsAdmin } from '~/server/utils/farm-news'
import { runFarmNewsArchive } from '~/server/utils/farm-news-run'
import type { FarmNewsArchiveResult } from '~/types/farm-news'

/**
 * 手動実行（潮流アーカイブのバックフィル生成）。月初cronを待たずに任意のタイミングで生成できる。
 * 例: curl -X POST https://<host>/api/farm-news/archive-run -H "x-admin-key: $NUXT_FARM_NEWS_ADMIN_KEY"
 */
export default defineEventHandler(async (event): Promise<FarmNewsArchiveResult> => {
  requireFarmNewsAdmin(event)

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runFarmNewsArchive(env)
})
