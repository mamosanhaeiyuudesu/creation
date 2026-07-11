import { resolveUserId, getStatus, getRawHistory } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

/** 就寝・起床時刻の日次推移（睡眠スケジュール比較グラフ用）。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const days = Math.min(90, Math.max(2, parseInt((q.days as string) || '7', 10)))
  const date = (q.date as string) || todayJST()

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  const history = await getRawHistory(event, userId, date, days)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  return {
    days: history.map(d => ({
      date: d.date,
      bedtime: d.sleep.bedtime,
      waketime: d.sleep.waketime,
      totalMinutes: d.sleep.totalMinutes,
    })),
  }
})
