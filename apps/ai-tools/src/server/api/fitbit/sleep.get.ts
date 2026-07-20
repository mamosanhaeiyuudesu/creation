import { resolveUserId, getStatus, getRawHistory, assembleSleepDetail } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const date = (q.date as string) || todayJST()
  // refresh=1（更新ボタン）: 表示中の日のキャッシュ(TTL)を無視して最新を取り直す
  const refresh = q.refresh === '1' || q.refresh === 'true'

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // スコア算出のため当日を末尾にベースライン分も取得
  const history = await getRawHistory(event, userId, date, 8, refresh)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  return assembleSleepDetail(history)
})
