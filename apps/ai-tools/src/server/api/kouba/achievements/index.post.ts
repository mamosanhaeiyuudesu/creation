import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, createAchievement, normalizeImpact, normalizeAchievedAt } from '~/server/utils/kouba'
import { KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 達成したことを追加する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ text?: string; impact?: number; achievedAt?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '達成したことを入力してください' })
  if (text.length > KOUBA_ACHIEVEMENT_TEXT_MAX) throw createError({ statusCode: 400, message: `達成したことは${KOUBA_ACHIEVEMENT_TEXT_MAX}文字までです` })

  const impact = normalizeImpact(body?.impact)
  if (impact === null) throw createError({ statusCode: 400, message: 'インパクトは1〜5で指定してください' })

  const achievedAt = normalizeAchievedAt(body?.achievedAt)
  if (!achievedAt) throw createError({ statusCode: 400, message: '日付を指定してください' })

  return await createAchievement(db, user.id, text, impact, achievedAt)
})
