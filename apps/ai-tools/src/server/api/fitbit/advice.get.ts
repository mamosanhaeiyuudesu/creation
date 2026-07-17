import { resolveUserId, getStatus, getRawHistory } from '~/server/utils/fitbit'
import { generateAdvice } from '~/server/utils/fitbit-advice'
import { todayJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const date = (q.date as string) || todayJST()
  // refresh=1（更新ボタン）: キャッシュ済みを返さず作り直す
  const refresh = q.refresh === '1' || q.refresh === 'true'

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // ベースライン算出のため対象日+直近7日を取得（末尾が対象日）
  const history = await getRawHistory(event, userId, date, 8)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  return await generateAdvice(event, userId, history, refresh)
})
