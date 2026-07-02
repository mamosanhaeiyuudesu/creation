import { getSessionUser } from '~/server/utils/auth'
import { sendPush, type PushSubscriptionRecord, type VapidKeys } from '~/server/utils/web-push'

// 即座にテスト用プッシュ通知を送信し、各端末の送信結果を返す
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

  const payload = {
    title: 'はげまし テスト',
    body: 'テスト通知です。届いていれば成功です！',
    url: '/hagemashi',
    tag: 'hagemashi-test',
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
