/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み。
 *
 * farm-news-digest とは別タスク＝別のWorker呼び出しにしているのは、Cloudflare Workers の
 * subrequest 上限を1回の呼び出しで使い切らないため（詳しくは farm-news-run.ts 冒頭コメント参照）。
 */

import { runFarmNewsTrends } from '~/server/utils/farm-news-run'

export default defineTask({
  meta: {
    name: 'farm-news:trends',
    description: '今日新着があった潮流だけ「いまの考察・予測」を書き直す',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runFarmNewsTrends(env)
    return { result }
  },
})
