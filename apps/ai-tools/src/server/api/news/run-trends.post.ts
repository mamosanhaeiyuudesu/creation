import { getSessionUser } from '~/server/utils/auth'
import { runNewsTrends } from '~/server/utils/news-run'

/**
 * 手動実行。/api/news/run（収集）とは別のリクエスト＝別のWorker呼び出しにすることで
 * subrequest予算を分ける（詳しい理由は news-run.ts の冒頭コメント参照）。
 * ページの「いま収集する」は収集の完了後にこちらも続けて呼ぶ。
 */
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const env = (event.context as any)?.cloudflare?.env
  if (!env) throw createError({ statusCode: 503, message: 'cloudflare env が取得できません' })

  return await runNewsTrends(env)
})
