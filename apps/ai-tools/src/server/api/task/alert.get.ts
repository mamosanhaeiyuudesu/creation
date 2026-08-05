import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { decryptComment } from '~/server/utils/encrypt'
import { ensureTaskAlertTable, parseHours, type AlertSettings } from '~/server/utils/task-alert'

export default defineEventHandler(async (event): Promise<AlertSettings> => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  await ensureTaskAlertTable(db)

  const row = await db
    .prepare('SELECT enabled, email_enc, hours FROM task_alerts WHERE user_id = ?')
    .bind(user.id)
    .first<{ enabled: number; email_enc: string; hours: string }>()

  if (!row) return { enabled: false, email: '', hours: [] }

  return {
    enabled: !!row.enabled,
    email: await decryptComment(event, row.email_enc ?? ''),
    hours: parseHours(row.hours),
  }
})
