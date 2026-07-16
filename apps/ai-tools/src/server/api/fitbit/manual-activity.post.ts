import { resolveUserId, getStatus } from '~/server/utils/fitbit'
import { durationMinutes, estimateManualActivity, addManualActivity } from '~/server/utils/fitbit-manual'
import { todayJST } from '~/utils/jst'

/** 手動の運動記録を追加。項目名＋開始終了時刻を受け取り、消費カロリーをAI推定して保存する。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ date?: string; label?: string; start?: string; end?: string }>(event)
  const label = (body?.label ?? '').trim().slice(0, 40)
  const start = (body?.start ?? '').trim()
  const end = (body?.end ?? '').trim()
  const date = (body?.date || todayJST()).trim()

  if (!label) throw createError({ statusCode: 400, message: '運動の種目名を入力してください' })
  const durationMin = durationMinutes(start, end)
  if (durationMin === null) throw createError({ statusCode: 400, message: '開始・終了時刻を正しく入力してください（HH:MM）' })
  if (durationMin > 24 * 60) throw createError({ statusCode: 400, message: '運動時間が長すぎます' })

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const { caloriesKcal, icon } = await estimateManualActivity(anthropicApiKey as string, label, durationMin)
  const session = await addManualActivity(event, userId, { date, label, icon, start, end, durationMin, caloriesKcal })

  return { activity: session }
})
