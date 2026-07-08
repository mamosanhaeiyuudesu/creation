import { resolveUserId, getStatus, getRawHistory, assembleSleepDetail } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = (getQuery(event).date as string) || todayJST()

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // スコア算出のため当日を末尾にベースライン分も取得
  const history = await getRawHistory(event, userId, date, 8)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  return assembleSleepDetail(history)
})
