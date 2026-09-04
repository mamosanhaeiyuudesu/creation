import { getSessionUser } from '~/server/utils/auth'
import { runNewsDigest } from '~/server/utils/news-run'
import type { NewsRunResult } from '~/types/news'

/** 手動実行。cron（毎朝7時）を待たずに収集・要約する（ページの「いま収集する」ボタン）。 */
export default defineEventHandler(async (event): Promise<NewsRunResult> => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runNewsDigest(env, { trigger: 'manual' })
})
