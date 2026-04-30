import { MIN_MESSAGES_FOR_INSIGHT, getLatestInsight } from '~/server/utils/deepheart-insights'
import { requireDeepheartUser, getDeepheartDb, getDeepheartEncryptionKey } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const encKey = getDeepheartEncryptionKey(event)
  const latest = await getLatestInsight(db, user.id, encKey)

  if (latest) {
    return { insight: latest.insight, createdAt: latest.createdAt, messageCount: latest.messageCount, tooFewMessages: false }
  }

  const countRow = await db
    .prepare("SELECT COUNT(*) as cnt FROM deepheart_messages WHERE user_id = ? AND role = 'user'")
    .bind(user.id)
    .first<{ cnt: number }>()

  const messageCount = countRow?.cnt ?? 0
  return { insight: null, createdAt: null, messageCount, tooFewMessages: messageCount < MIN_MESSAGES_FOR_INSIGHT }
})
