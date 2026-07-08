import { resolveUserId, getStatus, getRawHistory, assembleTrend } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const metric = (q.metric as string) || 'steps'
  const days = Math.min(90, Math.max(2, parseInt((q.days as string) || '7', 10)))
  const date = (q.date as string) || todayJST()

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // スコア系のベースライン算出のため days + 7 日分を取得し、末尾 days 日を返す
  const history = await getRawHistory(event, userId, date, days + 7)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  return assembleTrend(history, metric, days)
})
