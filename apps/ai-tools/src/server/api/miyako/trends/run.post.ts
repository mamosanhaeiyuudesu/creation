import { requireMiyakoAdmin } from '~/server/utils/miyako-trends'
import { runMiyakoTrends } from '~/server/utils/miyako-trends-run'
import type { MiyakoTrendRunResult } from '~/types/miyako-trends'

/**
 * 手動実行。月1回の cron を待たずに取り込み・分析を進める（初回の未取り込み分や、失敗後のやり直し用）。
 * 1回で進むのは subrequest の予算内（多くて定例会1つ＋臨時会いくつか）なので、
 * 結果の deferred が空になるまで繰り返し呼ぶ。
 *   curl -X POST https://<host>/api/miyako/trends/run -H "x-admin-key: $NUXT_MIYAKO_ADMIN_KEY"
 * 分析だけやり直す（AIへの指示を変えたときなど）:
 *   curl -X POST ... -H "Content-Type: application/json" -d '{"reanalyze":"令和8年第4回定例会"}'
 */
export default defineEventHandler(async (event): Promise<MiyakoTrendRunResult> => {
  requireMiyakoAdmin(event)

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  const body = await readBody<{ reanalyze?: string } | null>(event).catch(() => null)
  return await runMiyakoTrends(env, { trigger: 'manual', reanalyze: body?.reanalyze || undefined })
})
