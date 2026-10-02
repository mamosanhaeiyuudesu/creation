import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedAchievement, updateAchievement, normalizeAchievedAt } from '~/server/utils/kouba'
import { KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 達成記録の更新（内容・日付）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const body = await readBody<{ text?: string; achievedAt?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '達成したことを入力してください' })
  if (text.length > KOUBA_ACHIEVEMENT_TEXT_MAX) throw createError({ statusCode: 400, message: `達成したことは${KOUBA_ACHIEVEMENT_TEXT_MAX}文字までです` })

  const achievedAt = normalizeAchievedAt(body?.achievedAt)
  if (!achievedAt) throw createError({ statusCode: 400, message: '日付を指定してください' })

  const existing = await findOwnedAchievement(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: '達成記録が見つかりません' })

  await updateAchievement(db, id, text, achievedAt)
  return { ok: true }
})
