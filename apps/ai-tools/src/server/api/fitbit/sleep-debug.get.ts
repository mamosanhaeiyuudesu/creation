import { resolveUserId, getStatus, debugSleepRaw } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

// 一時的な診断口（原因確定後に削除）。ログインユーザー自身の保存済トークンで、指定日の
// 睡眠セッションを Google Health API から直接（キャッシュ無視で）取得し、素の内訳を返す。
//   GET /api/fitbit/sleep-debug?date=2026-07-20
// 二度寝が Google 側から2件目のセッションとして返っているかどうかを目視で確認するためのもの。
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  const q = getQuery(event)
  const date = (q.date as string) || todayJST()

  return await debugSleepRaw(event, userId, date)
})
