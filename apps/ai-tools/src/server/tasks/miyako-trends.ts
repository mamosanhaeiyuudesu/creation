/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み（毎月1日 UTC 7:00 ＝ JST 16:00）
 *
 * 市の会議録一覧に新しい会期が載っていれば取り込み、定例会ならバズ語を計算して
 * /miyako の「直近の傾向」を更新する。会議録の公開は閉会から2〜3か月後なので月1回で足りる。
 * （この cron 枠は、もともと mlb-sync が毎日使っていたもの。Free プランは cron がアカウント全体で5個まで）
 */

import { runMiyakoTrends } from '~/server/utils/miyako-trends-run'

export default defineTask({
  meta: {
    name: 'miyako:trends',
    description: '宮古島市議会の新しい会議録を取り込み、直近の定例会のバズ語を計算する',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    if (!env) throw new Error('cloudflare env が取得できません')

    const result = await runMiyakoTrends(env, { trigger: 'cron' })
    return { result }
  },
})
