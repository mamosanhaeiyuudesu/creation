import { diagFetch } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

// 診断用（dev限定）。Playground等で取得した生アクセストークンで実データのパースを検証する。
//   GET /api/fitbit/diag?token=ya29...&date=2026-07-08&days=3
// probe: 生のGoogle Health API応答（またはエラー内容）をそのまま返し、失敗原因を可視化する。
async function probe(token: string, dataType: string): Promise<any> {
  try {
    const res = await $fetch(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints?pageSize=1440`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const dp = (res as any)?.dataPoints ?? []
    return { ok: true, count: dp.length, samples: dp.slice(0, 3) }
  } catch (e: any) {
    return { ok: false, status: e?.response?.status ?? e?.statusCode, message: e?.message, data: e?.data ?? e?.response?._data }
  }
}

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, message: 'Not found' })

  const q = getQuery(event)
  const token = (q.token as string) || getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw createError({ statusCode: 400, message: 'token を指定してください（?token=... または Authorization: Bearer ...）' })

  const date = (q.date as string) || todayJST()
  const days = Math.min(14, Math.max(1, parseInt((q.days as string) || '3', 10)))

  // 生応答を確認（distance の構造・oxygen-saturation の値域を見る）
  const probes = {
    distance: await probe(token, 'distance'),
    'oxygen-saturation': await probe(token, 'oxygen-saturation'),
  }

  let parsed: any = null
  try {
    parsed = await diagFetch(token, date, days)
  } catch (e: any) {
    parsed = { error: e?.message || String(e) }
  }

  return { probes, parsed }
})
