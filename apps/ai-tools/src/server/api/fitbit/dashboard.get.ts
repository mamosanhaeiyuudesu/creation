import { resolveUserId, getStatus, getRawHistory, assembleDashboard, diag } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  diag('dashboard: enter')
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })
  diag('dashboard: auth ok')

  const date = (getQuery(event).date as string) || todayJST()

  const status = await getStatus(event, userId)
  diag('dashboard: status ok', { connected: status.connected })
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // 7日トレンド表示 + ベースライン算出のため直近14日分を取得（末尾が当日）
  const history = await getRawHistory(event, userId, date, 14)
  diag('dashboard: history ok', { days: history.length })
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  const out = assembleDashboard(history)
  diag('dashboard: assemble ok')
  return out
})
