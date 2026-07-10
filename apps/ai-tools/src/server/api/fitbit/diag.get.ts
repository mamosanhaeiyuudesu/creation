import { diagFetch } from '~/server/utils/fitbit'
import { todayJST } from '~/utils/jst'

// 診断用（dev限定）。Playground等で取得した生アクセストークンで実データのパースを検証する。
//   GET /api/fitbit/diag?token=ya29...&date=2026-07-08&days=3

const VALUE_KEY: Record<string, string> = { steps: 'count', distance: 'millimeters' }

// steps/distance は list・reconcile どちらでも同じ形（トップレベルに dataType 名のフィールド）で
// 返る想定だが、reconcile 側が別形（dataPoint プロパティにラップ等）の場合に備えて両方を試す。
function extractDayValue(pt: any, dataType: string): { date: string | null; value: number | null } {
  const body = pt?.[dataType] ?? pt?.dataPoint?.[dataType] ?? null
  const dateObj = body?.interval?.civilStartTime?.date
  const date = dateObj ? `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}` : null
  const key = VALUE_KEY[dataType]
  const value = body?.[key] != null ? Number(body[key]) : null
  return { date, value }
}

function sumByDate(dp: any[], dataType: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const pt of dp) {
    const { date, value } = extractDayValue(pt, dataType)
    if (date && value != null) out[date] = (out[date] || 0) + value
  }
  return out
}

// list は複数データソースの生ポイントを重複除去せずに返す可能性がある。
// reconcile はソース横断で単一ストリームに統合した結果を返すため、日別合計を list と比較する。
async function probe(token: string, dataType: string, reconcile = false): Promise<any> {
  const suffix = reconcile ? ':reconcile' : ''
  try {
    const res = await $fetch(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints${suffix}?pageSize=1440`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const dp = (res as any)?.dataPoints ?? []
    const out: any = { ok: true, count: dp.length, samples: dp.slice(0, 3) }
    if (dataType in VALUE_KEY) out.sumByDate = sumByDate(dp, dataType)
    return out
  } catch (e: any) {
    return { ok: false, status: e?.response?.status ?? e?.statusCode, message: e?.message, data: e?.data ?? e?.response?._data }
  }
}

// HRV詳細: 本家との集計方法のズレを突き止めるため、日付ごとに全サンプル(時刻+rmssd)を出す。
// ダッシュボードは暦日の全サンプルを単純平均しているが、本家は主睡眠区間中の値らしく高めにズレる。
// summary(平均/中央値/件数)と byDate(生サンプル)を並べ、どの窓・統計量で一致するか照合する。
function hrvDetail(dp: any[]): { summary: Record<string, any>; byDate: Record<string, { t: string; v: number }[]> } {
  const byDate: Record<string, { t: string; v: number }[]> = {}
  for (const pt of dp) {
    const st = pt?.heartRateVariability?.sampleTime?.civilTime
    const v = pt?.heartRateVariability?.rootMeanSquareOfSuccessiveDifferencesMilliseconds
    if (!st?.date || typeof v !== 'number') continue
    const d = `${st.date.year}-${String(st.date.month).padStart(2, '0')}-${String(st.date.day).padStart(2, '0')}`
    const hh = String(st.time?.hours ?? 0).padStart(2, '0')
    const mm = String(st.time?.minutes ?? 0).padStart(2, '0')
    ;(byDate[d] ??= []).push({ t: `${hh}:${mm}`, v })
  }
  const summary: Record<string, any> = {}
  for (const arr of Object.values(byDate)) arr.sort((a, b) => a.t.localeCompare(b.t))
  for (const [d, arr] of Object.entries(byDate)) {
    const vs = arr.map(x => x.v).slice().sort((a, b) => a - b)
    const mean = vs.reduce((a, b) => a + b, 0) / vs.length
    const median = vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2
    summary[d] = { n: vs.length, mean: Math.round(mean * 10) / 10, median: Math.round(median * 10) / 10, min: vs[0], max: vs[vs.length - 1] }
  }
  return { summary, byDate }
}

async function probeHrv(token: string): Promise<any> {
  try {
    const res: any = await $fetch('https://health.googleapis.com/v4/users/me/dataTypes/heart-rate-variability/dataPoints?pageSize=1440', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const dp = res?.dataPoints ?? []
    return { ok: true, count: dp.length, ...hrvDetail(dp), rawSample: dp[0] ?? null }
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
    steps: await probe(token, 'steps'),
    'steps-reconcile': await probe(token, 'steps', true),
    distance: await probe(token, 'distance'),
    'distance-reconcile': await probe(token, 'distance', true),
    'total-calories-dailyRollUp': await probeCaloriesRollup(token, date, days),
    'daily-sleep-temperature-derivations': await probe(token, 'daily-sleep-temperature-derivations'),
    'heart-rate': await probe(token, 'heart-rate'),
    'heart-rate-variability': await probeHrv(token),
  }

  let parsed: any = null
  try {
    parsed = await diagFetch(token, date, days)
  } catch (e: any) {
    parsed = { error: e?.message || String(e) }
  }

  return { probes, parsed }
})
