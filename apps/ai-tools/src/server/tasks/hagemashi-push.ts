/**
 * Nitro server task — Cloudflare Cron Trigger（毎時0分）から実行される。
 * nuxt.config.ts の nitro.scheduledTasks で登録。
 *
 * 各ユーザーの希望時刻・間隔をチェックし、
 *  - 直近に記録があれば → 傾向を Claude で分析して励ましを送信
 *  - 一定日数記録が無ければ → 音声入力を促すナッジを送信
 */

import { sendPush, type PushSubscriptionRecord, type VapidKeys } from '../utils/web-push'
import { buildHagemashiPayload } from '../utils/hagemashi-message'

interface PrefRow {
  user_id: string
  hour: number
  minute: number
  timezone: string
  min_interval_days: number
  nudge_after_silent_days: number
  last_pushed_at: string | null
}

// 指定タイムゾーンでの現在の「時（0-23）」「分（0-59）」を返す
function localHourMinute(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(date)
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return { hour, minute }
}

// D1 の datetime('now') 文字列（UTC）を Date に
function parseUtc(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z')
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (24 * 3600 * 1000)
}

export default defineTask({
  meta: {
    name: 'hagemashi:push',
    description: 'hagemashi のプッシュ通知（傾向分析の励まし／音声入力ナッジ）を送信',
  },
  async run({ context }) {
    const env = (context as Record<string, any>)?.cloudflare?.env ?? {}
    const db = env.WHISPER_DB
    if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

    const cfg = useRuntimeConfig()
    const anthropicApiKey = (cfg.anthropicApiKey || env.NUXT_ANTHROPIC_API_KEY) as string
    const vapid: VapidKeys = {
      publicKey: (cfg.vapidPublicKey || env.NUXT_VAPID_PUBLIC_KEY) as string,
      privateKey: (cfg.vapidPrivateKey || env.NUXT_VAPID_PRIVATE_KEY) as string,
      subject: (cfg.vapidSubject || env.NUXT_VAPID_SUBJECT || 'mailto:admin@example.com') as string,
    }
    if (!vapid.publicKey || !vapid.privateKey) {
      throw new Error('VAPID 鍵が未設定です')
    }

    const now = new Date()

    // 有効なユーザー設定を取得
    const prefs = await db
      .prepare(
        `SELECT user_id, hour, minute, timezone, min_interval_days, nudge_after_silent_days, last_pushed_at
         FROM hagemashi_push_prefs WHERE enabled = 1`
      )
      .all()

    let sent = 0
    for (const pref of (prefs.results ?? []) as PrefRow[]) {
      try {
        // 希望時刻（ローカル）が現在の時:分と完全一致するか
        const local = localHourMinute(now, pref.timezone)
        if (local.hour !== pref.hour || local.minute !== pref.minute) continue

        // 最小間隔チェック
        if (pref.last_pushed_at) {
          const last = parseUtc(pref.last_pushed_at)
          if (daysBetween(now, last) < pref.min_interval_days) continue
        }

        // 直近の記録から励まし／ナッジのペイロードを組み立て
        const payload = await buildHagemashiPayload(db, pref.user_id, pref.nudge_after_silent_days, anthropicApiKey, now)

        // このユーザーの全端末へ送信
        const subs = await db
          .prepare('SELECT endpoint, p256dh, auth FROM hagemashi_push_subscriptions WHERE user_id = ?')
          .bind(pref.user_id)
          .all()

        let userSent = 0
        for (const sub of (subs.results ?? []) as PushSubscriptionRecord[]) {
          try {
            const result = await sendPush(sub, payload, vapid)
            if (result.expired) {
              await db
                .prepare('DELETE FROM hagemashi_push_subscriptions WHERE endpoint = ?')
                .bind(sub.endpoint)
                .run()
              console.log('[hagemashi:push] subscription expired, removed:', sub.endpoint.slice(0, 60))
            } else if (result.ok) {
              userSent++
              sent++
            } else {
              console.error('[hagemashi:push] push failed status', result.statusCode, sub.endpoint.slice(0, 60))
            }
          } catch (e) {
            console.error('[hagemashi:push] sendPush error:', sub.endpoint.slice(0, 60), e)
          }
        }

        // 少なくとも1端末への送信が成功した場合のみ last_pushed_at を更新
        if (userSent > 0) {
          await db
            .prepare("UPDATE hagemashi_push_prefs SET last_pushed_at = ? WHERE user_id = ?")
            .bind(now.toISOString(), pref.user_id)
            .run()
        }
      } catch (err) {
        console.error('[hagemashi:push] user', pref.user_id, err)
      }
    }

    return { result: `sent ${sent} notifications` }
  },
})
