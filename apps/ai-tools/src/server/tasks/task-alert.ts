/**
 * Nitro server task — Cloudflare Cron Trigger（0 * * * *）から毎時実行される。
 * nuxt.config.ts の nitro.scheduledTasks で登録済み。
 *
 * 各ユーザーのアラート設定（task_alerts）を見て、現在の JST 時が送信時刻に
 * 含まれていれば、Trello の本日（JST）が期限のタスクをまとめてメールで送る。
 * 対象タスクが0件のときは送らない（毎回「0件です」が届くのを避けるため）。
 */

import { nowJST, todayJST } from '~/utils/jst'
import { decryptWithKey } from '../utils/encrypt'
import {
  ensureTaskAlertTable,
  parseHours,
  collectDueTodayTasksForUser,
  collectDoneTasksForUser,
  buildPraiseText,
  buildAlertMail,
  sendAlertMail,
} from '../utils/task-alert'

export default defineTask({
  meta: {
    name: 'task:alert',
    description: 'タスクくんの本日期限のタスクを設定時刻にメール通知',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env
    const db = env?.WHISPER_DB as D1Database | undefined
    if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

    await ensureTaskAlertTable(db)

    const encryptionKey = (env?.NUXT_ENCRYPTION_KEY as string) ?? ''
    const appUrl = (env?.NUXT_APP_URL as string) ?? ''
    const hourJST = nowJST().getUTCHours()
    // 同じ時間帯に二重送信しないための印（例: "2026-08-05 08"）
    const slot = `${todayJST()} ${String(hourJST).padStart(2, '0')}`

    const rows = await db
      .prepare('SELECT user_id, email_enc, hours, last_sent_at FROM task_alerts WHERE enabled = 1')
      .all<{ user_id: string; email_enc: string; hours: string; last_sent_at: string | null }>()

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows.results ?? []) {
      try {
        if (!parseHours(row.hours).includes(hourJST)) continue
        if (row.last_sent_at === slot) continue

        const email = await decryptWithKey(encryptionKey, row.email_enc ?? '')
        if (!email) { skipped++; continue }

        const tasks = await collectDueTodayTasksForUser(db, encryptionKey, row.user_id)
        if (tasks.length) {
          const doneTasks = await collectDoneTasksForUser(db, encryptionKey, row.user_id)
          const praiseText = await buildPraiseText(env, doneTasks)
          await sendAlertMail(env, email, buildAlertMail(tasks, appUrl, doneTasks, praiseText))
          sent++
        } else {
          skipped++
        }

        await db
          .prepare('UPDATE task_alerts SET last_sent_at = ? WHERE user_id = ?')
          .bind(slot, row.user_id)
          .run()
      } catch (e: any) {
        // 1ユーザーの失敗で他のユーザーを止めない
        errors.push(`${row.user_id}: ${e?.message ?? e}`)
      }
    }

    return { result: { slot, sent, skipped, errors } }
  },
})
