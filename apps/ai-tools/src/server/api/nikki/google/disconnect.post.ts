import { requireNikkiUser, requireNikkiDb } from '~/server/utils/nikki'
import { disconnectNikkiGoogle } from '~/server/utils/nikki-google'

// 連携解除。D1側のリフレッシュトークンとカレンダーの選択を消すだけで、
// 日記（nikki_entries / nikki_topics）は消さない（予定は外から借りていただけ）。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  await requireNikkiDb(event)
  await disconnectNikkiGoogle(event, user.id)
  return { ok: true }
})
