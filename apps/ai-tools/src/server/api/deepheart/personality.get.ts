import { getDeepheartDb, requireDeepheartUser } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const row = await db
    .prepare('SELECT tone, system_prompt, response_length FROM deepheart_personalities WHERE user_id = ?')
    .bind(user.id)
    .first<{ tone: string; system_prompt: string; response_length: number }>()

  return {
    tone: row?.tone ?? 'listen',
    systemPrompt: row?.system_prompt ?? '',
    responseLength: row?.response_length ?? 3,
  }
})
