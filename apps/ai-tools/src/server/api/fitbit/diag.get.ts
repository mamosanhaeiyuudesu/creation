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

// total-calories は list 非対応で dailyRollUp(POST) 専用。日次合計の値フィールド（kcalSum想定）を確認する。
async function probeCaloriesRollup(token: string, date: string, days: number): Promise<any> {
  const civil = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return { date: { year: y, month: m, day: d } }
  }
  const endMs = new Date(`${date}T00:00:00Z`).getTime()
  const start = new Date(endMs - (days - 1) * 86400000).toISOString().slice(0, 10)
  const endPlus = new Date(endMs + 86400000).toISOString().slice(0, 10)
  try {
    const res: any = await $fetch('https://health.googleapis.com/v4/users/me/dataTypes/total-calories/dataPoints:dailyRollUp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: { range: { start: civil(start), end: civil(endPlus) }, windowSizeDays: 1 },
    })
    const dp = res?.rollupDataPoints ?? []
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

  // total-calories の dailyRollUp レスポンス（kcalSum フィールド）を最終確認する。
  const probes = {
    distance: await probe(token, 'distance'),
    'total-calories-dailyRollUp': await probeCaloriesRollup(token, date, days),
    'daily-sleep-temperature-derivations': await probe(token, 'daily-sleep-temperature-derivations'),
    'heart-rate': await probe(token, 'heart-rate'),
  }

  let parsed: any = null
  try {
    parsed = await diagFetch(token, date, days)
  } catch (e: any) {
    parsed = { error: e?.message || String(e) }
  }

  return { probes, parsed }
})
