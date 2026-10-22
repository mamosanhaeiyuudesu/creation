import { requireNikkiUser, requireNikkiDb, loadReviewPrompt, NIKKI_REVIEW_PROMPT_MAX } from '~/server/utils/nikki'
import { DEFAULT_REVIEW_PROMPT } from '~/server/utils/nikki-ai'

/** 編集画面用。保存がなければ既定の文面を返す（isDefault で見分ける）。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const saved = await loadReviewPrompt(db, user.id)
  return { prompt: saved || DEFAULT_REVIEW_PROMPT, isDefault: !saved, defaultPrompt: DEFAULT_REVIEW_PROMPT, max: NIKKI_REVIEW_PROMPT_MAX }
})
