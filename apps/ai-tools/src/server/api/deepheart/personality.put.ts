import { getDeepheartDb, requireDeepheartUser, DEEPHEART_TONES, type DeepheartTone } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const body = await readBody<{ tone?: string; systemPrompt?: string; responseLength?: number }>(event)
  const tone: DeepheartTone = (DEEPHEART_TONES as readonly string[]).includes(body?.tone ?? '')
    ? (body!.tone as DeepheartTone)
    : 'listen'
  const systemPrompt = (body?.systemPrompt ?? '').slice(0, 2000)
  const responseLength = Math.min(5, Math.max(1, Number(body?.responseLength) || 3))

  await db
    .prepare(
      `INSERT INTO deepheart_personalities (user_id, tone, system_prompt, response_length, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         tone = excluded.tone,
         system_prompt = excluded.system_prompt,
         response_length = excluded.response_length,
         updated_at = excluded.updated_at`
    )
    .bind(user.id, tone, systemPrompt, responseLength)
    .run()

  return { tone, systemPrompt, responseLength }
})
