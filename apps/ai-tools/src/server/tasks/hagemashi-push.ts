/**
 * Nitro server task — Cloudflare Cron Trigger（毎時0分）から実行される。
 * nuxt.config.ts の nitro.scheduledTasks で登録。
 *
 * 各ユーザーの希望時刻・間隔をチェックし、
 *  - 直近に記録があれば → 傾向を Claude で分析して励ましを送信
 *  - 一定日数記録が無ければ → 音声入力を促すナッジを送信
 */

import { sendPush, type PushSubscriptionRecord, type VapidKeys } from '../utils/web-push'

interface PrefRow {
  user_id: string
  hour: number
  minute: number
  timezone: string
  min_interval_days: number
  nudge_after_silent_days: number
  last_pushed_at: string | null
}

interface HistoryRow {
  text: string
  title: string
  notes: string | null
  created_at: string // 'YYYY-MM-DD HH:MM:SS'（UTC）
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

async function generateEncouragement(apiKey: string, texts: string[]): Promise<string> {
  const userContent = texts.map((t, i) => `【記録${i + 1}】\n${t}`).join('\n\n')
  const system =
    'あなたは相手に寄り添うカウンセラーです。以下は相手が最近書き留めた記録です。' +
    '最近の傾向（気分・出来事・がんばり）を読み取り、プッシュ通知として届く短い励ましメッセージを作成してください。' +
    '通知本文なので日本語で60文字以内、前向きで具体的に、絵文字は使わないこと。メッセージ本文だけを返すこと。'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const data = await res.json() as { content?: { text?: string }[] }
  return (data?.content?.[0]?.text ?? '').trim()
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
        // 希望時刻（ローカル）が現在時と一致するか（分は30分枠で判定）
        const local = localHourMinute(now, pref.timezone)
        const localSlot = local.minute >= 30 ? 30 : 0
        const prefSlot = pref.minute >= 30 ? 30 : 0
        if (local.hour !== pref.hour || localSlot !== prefSlot) continue

        // 最小間隔チェック
        if (pref.last_pushed_at) {
          const last = parseUtc(pref.last_pushed_at)
          if (daysBetween(now, last) < pref.min_interval_days) continue
        }

        // 直近の記録を取得（最新10件）
        const hist = await db
          .prepare(
            `SELECT text, title, notes, created_at FROM app_history
             WHERE user_id = ? AND app = 'hagemashi' ORDER BY created_at DESC LIMIT 10`
          )
          .bind(pref.user_id)
          .all()

        const rows = (hist.results ?? []) as HistoryRow[]
        const latest = rows[0] ? parseUtc(rows[0].created_at) : null
        const silentDays = latest ? daysBetween(now, latest) : Infinity

        let payload: Record<string, unknown>
        if (silentDays >= pref.nudge_after_silent_days) {
          // 沈黙 → 音声入力を促す
          payload = {
            title: 'はげまし',
            body: 'しばらく話していませんね。今日の気持ちを声で残してみませんか？',
            url: '/hagemashi',
            tag: 'hagemashi-nudge',
          }
        } else {
          // 記録あり → 傾向分析の励まし
          const texts = rows.map((r: HistoryRow) => (r.notes || r.text || '').trim()).filter(Boolean).slice(0, 5)
          let body = 'あなたのペースで大丈夫。今日もおつかれさまです。'
          if (texts.length && anthropicApiKey) {
            const generated = await generateEncouragement(anthropicApiKey, texts).catch(() => '')
            if (generated) body = generated
          }
          payload = { title: 'はげまし', body, url: '/hagemashi', tag: 'hagemashi-encourage' }
        }

        // このユーザーの全端末へ送信
        const subs = await db
          .prepare('SELECT endpoint, p256dh, auth FROM hagemashi_push_subscriptions WHERE user_id = ?')
          .bind(pref.user_id)
          .all()

        for (const sub of (subs.results ?? []) as PushSubscriptionRecord[]) {
          const result = await sendPush(sub, payload, vapid).catch(() => null)
          if (result?.expired) {
            await db
              .prepare('DELETE FROM hagemashi_push_subscriptions WHERE endpoint = ?')
              .bind(sub.endpoint)
              .run()
          } else if (result?.ok) {
            sent++
          }
        }

        // 最終送信時刻を更新
        await db
          .prepare("UPDATE hagemashi_push_prefs SET last_pushed_at = ? WHERE user_id = ?")
          .bind(now.toISOString(), pref.user_id)
          .run()
      } catch (err) {
        console.error('[hagemashi:push] user', pref.user_id, err)
      }
    }

    return { result: `sent ${sent} notifications` }
  },
})
