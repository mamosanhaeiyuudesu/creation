import { getDeepheartDb, requireDeepheartUser } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT tone, system_prompt FROM deepheart_personalities WHERE user_id = ?')
    .bind(user.id)
    .first<{ tone: string; system_prompt: string }>()

  return {
    tone: row?.tone ?? 'gentle',
    systemPrompt: row?.system_prompt ?? '',
  }
})
