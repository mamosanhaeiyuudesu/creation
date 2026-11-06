// キュー（kikigaki-minutes）の受け手。議事録を作る仕事を1件ずつこなす（server/utils/minuteJobs.ts）。
//
// Nitro はこのフックを ctx.waitUntil の中で呼ぶ。キューでは waitUntil が終わるまで受け手の呼び出しが続き
// （上限15分。HTTP の「30秒まで」は当てはまらない）、終わった時点で ack される。
// ここでは1件ずつ ack／retry を自分で決める（AIの混雑などは30秒あけてもう一度）。

import { runJob } from '~/server/utils/minuteJobs'

const RETRY_DELAY_SEC = 30

export default defineNitroPlugin((nitroApp) => {
  ;(nitroApp.hooks as any).hook('cloudflare:queue', async ({ batch, env }: { batch: any; env: any }) => {
    for (const msg of batch.messages ?? []) {
      const jobId = msg.body?.jobId
      if (typeof jobId !== 'string' || !jobId) {
        msg.ack()
        continue
      }
      try {
        const result = await runJob(env, jobId)
        if (result === 'retry') msg.retry({ delaySeconds: RETRY_DELAY_SEC })
        else msg.ack()
      } catch (e) {
        // D1 に届かないなど、仕事の状態すら書けなかったとき
        console.error('[kikigaki] queue consumer error:', jobId, (e as any)?.message ?? e)
        msg.retry({ delaySeconds: RETRY_DELAY_SEC })
      }
    }
  })
})
