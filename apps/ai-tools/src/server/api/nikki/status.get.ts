import { requireNikkiUser, requireNikkiDb } from '~/server/utils/nikki'
import { getNikkiGoogleStatus, isNikkiGoogleConfigured } from '~/server/utils/nikki-google'

// 初期設定の進み具合（Google連携済みか・カレンダーを選んだか）。
// configured=false は「サーバー側にOAuthクライアントが未設定」＝画面に設定手順を出すため。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  await requireNikkiDb(event)
  const status = await getNikkiGoogleStatus(event, user.id)
  return { ...status, configured: isNikkiGoogleConfigured(event) }
})
