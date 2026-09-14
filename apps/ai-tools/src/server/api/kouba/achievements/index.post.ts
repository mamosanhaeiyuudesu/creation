import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, createAchievement, normalizeAchievedAt } from '~/server/utils/kouba'
import { KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 達成したことを追加する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ text?: string; achievedAt?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '達成したことを入力してください' })
  if (text.length > KOUBA_ACHIEVEMENT_TEXT_MAX) throw createError({ statusCode: 400, message: `達成したことは${KOUBA_ACHIEVEMENT_TEXT_MAX}文字までです` })

  const achievedAt = normalizeAchievedAt(body?.achievedAt)
  if (!achievedAt) throw createError({ statusCode: 400, message: '日付を指定してください' })

  return await createAchievement(db, user.id, text, achievedAt)
})
