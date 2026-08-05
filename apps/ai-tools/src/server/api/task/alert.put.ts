import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment } from '~/server/utils/encrypt'
import { ensureTaskAlertTable, parseHours, isValidEmail } from '~/server/utils/task-alert'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ enabled?: boolean; email?: string; hours?: number[] }>(event)
  const email = (body?.email ?? '').trim()
  const hours = parseHours(body?.hours ?? [])
  const enabled = !!body?.enabled

  // 有効にするときだけ厳しくチェックする（下書き状態で保存できなくなるのを避けるため）
  if (enabled && !isValidEmail(email)) throw createError({ statusCode: 400, message: 'メールアドレスの形式が正しくありません' })
  if (enabled && !hours.length) throw createError({ statusCode: 400, message: '送信時刻を1つ以上選んでください' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  await ensureTaskAlertTable(db)

  await db
    .prepare(`
      INSERT INTO task_alerts (user_id, enabled, email_enc, hours, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        enabled = excluded.enabled,
        email_enc = excluded.email_enc,
        hours = excluded.hours,
        updated_at = excluded.updated_at
    `)
    .bind(user.id, enabled ? 1 : 0, await encryptComment(event, email), hours.join(','))
    .run()

  return { ok: true }
})
