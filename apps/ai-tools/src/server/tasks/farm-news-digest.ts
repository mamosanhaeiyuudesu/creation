/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み。
 */

import { runFarmNewsDigest } from '~/server/utils/farm-news-run'

export default defineTask({
  meta: {
    name: 'farm-news:digest',
    description: '農業×AIニュースを収集・要約して /farm-news に並べる',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runFarmNewsDigest(env, { trigger: 'cron' })
    return { result }
  },
})
