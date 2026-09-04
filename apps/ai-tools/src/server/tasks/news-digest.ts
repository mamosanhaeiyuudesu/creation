/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み（UTC 22:00 ＝ JST 翌朝 7:00）
 *
 * 朝起きたときに /news が最新になっているようにするのがこのタスクの役割。通知はしない。
 */

import { runNewsDigest } from '~/server/utils/news-run'

export default defineTask({
  meta: {
    name: 'news:digest',
    description: 'AI関連ニュースを収集・要約して /news に並べる',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runNewsDigest(env, { trigger: 'cron' })
    return { result }
  },
})
