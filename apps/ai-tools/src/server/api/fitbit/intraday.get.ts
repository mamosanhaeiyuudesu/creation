import { resolveUserId, getStatus, getRawDay } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'
import type { TimePoint } from '~/types/fitbit'

/** 指定日・指定メトリクスの時間別（intraday）系列を返す。ポップアップの日送り用。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const metric = (q.metric as string) || 'steps'
  const date = (q.date as string) || todayJST()

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  const day = await getRawDay(event, userId, date)
  let points: TimePoint[] = []
  if (day) {
    if (metric === 'steps') points = day.stepsSeries ?? []
    else if (metric === 'distanceKm') points = day.distanceSeries ?? []
    else if (metric === 'restingHeartRate') points = day.heartRateSeries ?? []
  }
  return { metric, date, points }
})
