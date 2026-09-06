/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み（UTC 22:15 ＝ JST 翌朝 7:15、
 * news-digest の15分後）。
 *
 * news-digest とは別のタスク＝別の Worker 呼び出しにしているのは、Cloudflare Workers の
 * subrequest 上限（1回の呼び出しにつき、Freeプランは50個）を1つの呼び出しで
 * 使い切らないようにするため。詳しい理由は news-run.ts の冒頭コメント参照。
 */

import { runNewsTrends } from '~/server/utils/news-run'

export default defineTask({
  meta: {
    name: 'news:trends',
    description: '今日新着があった潮流だけ「いまの考察」を書き直す',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runNewsTrends(env)
    return { result }
  },
})
