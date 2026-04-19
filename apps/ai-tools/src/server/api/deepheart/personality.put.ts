import { getDeepheartDb, requireDeepheartUser, DEEPHEART_TONES, type DeepheartTone } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{ tone?: string; systemPrompt?: string }>(event)
  const tone: DeepheartTone = (DEEPHEART_TONES as readonly string[]).includes(body?.tone ?? '')
    ? (body!.tone as DeepheartTone)
    : 'gentle'
  const systemPrompt = (body?.systemPrompt ?? '').slice(0, 2000)

  await db
    .prepare(
      `INSERT INTO deepheart_personalities (user_id, tone, system_prompt, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET tone = excluded.tone, system_prompt = excluded.system_prompt, updated_at = excluded.updated_at`
    )
    .bind(user.id, tone, systemPrompt)
    .run()

  return { tone, systemPrompt }
})
