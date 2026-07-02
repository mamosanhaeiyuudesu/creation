import { getSessionUser } from '~/server/utils/auth'
import { sendPush, type PushSubscriptionRecord, type VapidKeys } from '~/server/utils/web-push'
import { buildHagemashiPayload, savePushLog } from '~/server/utils/hagemashi-message'

// 即座に「実際のはげまし／ナッジ」を送信し、各端末の送信結果を返す
export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { vapidPublicKey, vapidPrivateKey, vapidSubject, anthropicApiKey } = useRuntimeConfig(event)
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw createError({ statusCode: 503, message: 'VAPID 鍵が未設定です' })
  }

  const vapid: VapidKeys = {
    publicKey: vapidPublicKey as string,
    privateKey: vapidPrivateKey as string,
    subject: (vapidSubject as string) || `mailto:${user.username}`,
  }

  const subs = await db
    .prepare('SELECT endpoint, p256dh, auth FROM hagemashi_push_subscriptions WHERE user_id = ?')
    .bind(user.id)
    .all()

  const targets = (subs.results ?? []) as PushSubscriptionRecord[]
  if (targets.length === 0) {
    return { ok: false, message: '購読が登録されていません', results: [] }
  }

  // 実際の通知と同じ内容（傾向分析の励まし／沈黙ナッジ）を組み立て
  const prefRow = await db
    .prepare('SELECT nudge_after_silent_days FROM hagemashi_push_prefs WHERE user_id = ?')
    .bind(user.id)
    .first() as { nudge_after_silent_days: number } | null
  const nudgeAfterSilentDays = prefRow?.nudge_after_silent_days ?? 3

  const payload = await buildHagemashiPayload(db, user.id, nudgeAfterSilentDays, anthropicApiKey as string)
  try {
    const logId = await savePushLog(db, user.id, payload)
    if (logId) payload.url = `/hagemashi?push=${logId}`
  } catch (e) {
    console.error('[hagemashi:push/test] savePushLog failed:', e)
  }

  const results: { endpoint: string; ok: boolean; statusCode: number; expired: boolean; error?: string }[] = []

  for (const sub of targets) {
    try {
      const r = await sendPush(sub, payload, vapid, 60)
      results.push({ endpoint: sub.endpoint.slice(0, 60) + '...', ok: r.ok, statusCode: r.statusCode, expired: r.expired })
      if (r.expired) {
        await db.prepare('DELETE FROM hagemashi_push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run()
      }
    } catch (e: any) {
      results.push({ endpoint: sub.endpoint.slice(0, 60) + '...', ok: false, statusCode: 0, expired: false, error: String(e) })
    }
  }

  return { ok: results.some((r) => r.ok), results }
})
