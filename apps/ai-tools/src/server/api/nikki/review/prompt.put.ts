import { requireNikkiUser, requireNikkiDb, saveReviewPrompt, NIKKI_REVIEW_PROMPT_MAX } from '~/server/utils/nikki'
import { DEFAULT_REVIEW_PROMPT } from '~/server/utils/nikki-ai'

/** 保存。空、または既定と同じ文面なら「未保存」にして、以後の既定の更新に追随させる。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const body = await readBody<{ prompt?: unknown }>(event)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length > NIKKI_REVIEW_PROMPT_MAX) {
    throw createError({ statusCode: 400, message: `プロンプトは${NIKKI_REVIEW_PROMPT_MAX}字以内にしてください` })
  }
  const toSave = prompt === DEFAULT_REVIEW_PROMPT.trim() ? '' : prompt
  await saveReviewPrompt(db, user.id, toSave)
  return { prompt: toSave || DEFAULT_REVIEW_PROMPT, isDefault: !toSave }
})
