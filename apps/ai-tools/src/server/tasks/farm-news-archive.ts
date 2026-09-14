/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される（月1回）
 * nuxt.config.ts の nitro.scheduledTasks で登録済み。
 *
 * 潮流アーカイブ（月次/年次スナップショット）をバックフィル生成する。詳しい設計は
 * farm-news-run.ts の runFarmNewsArchive 冒頭コメント参照。
 */

import { runFarmNewsArchive } from '~/server/utils/farm-news-run'

export default defineTask({
  meta: {
    name: 'farm-news:archive',
    description: '潮流アーカイブ（月次/年次スナップショット）を生成する',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runFarmNewsArchive(env)
    return { result }
  },
})
