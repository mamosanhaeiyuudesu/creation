// farm-simulator の天気の取り込み（取得とキャッシュ）。取得先は気象庁（読み取りは utils/farm-simulator-jma.ts）。
// 取得先を差し替えるときは、この fetchMonth / fetchForecast と farm-simulator-jma.ts を書き換える。
//
// - 過去の観測は1か月＝1回のアクセス。取った月は D1 にキャッシュし、締まった月（月末から3日以上たった月）は二度と取らない。
//   まだ締まっていない月（今月など）は、6時間たったら取り直す。
// - Workers の subrequest 上限（Freeは1回の呼び出しにつき50）に当たらないよう、1回の呼び出しで取るのは
//   MAX_FETCH_PER_CALL か月まで。残りは remaining で返し、画面がもう一度呼ぶ（guesthouse の顧客分析と同じやり方）。
// - 予報は1日1回の定期実行（cron）にしたかったが、cron はアカウント全体で5個までの上限に当たっているので、
//   誰かが開いたときに6時間より古ければ取り直す形にしている（wrangler.toml の注記参照）。
import { JMA_FORECAST_URL, JMA_STATION, jmaDailyUrl, parseJmaDailyA1, parseJmaForecast } from '~/utils/farm-simulator-jma'
import type { WeatherDay } from '~/utils/farm-simulator'

export const MAX_FETCH_PER_CALL = 12
const STALE_MS = 6 * 3600 * 1000
const FETCH_CONCURRENCY = 4
/** 1回で返す期間の上限（か月） */
export const MAX_MONTHS = 180
const USER_AGENT = 'ai-tools farm-simulator (weather cache)'

export async function ensureFarmSimulatorTables(db: any): Promise<void> {
  // D1 の exec() は改行で文を切るので、1文ずつ prepare().run() で流す
  await db.batch([
    db.prepare(
      'CREATE TABLE IF NOT EXISTS farm_simulator_weather_months (station TEXT NOT NULL, ym TEXT NOT NULL, data TEXT NOT NULL, complete INTEGER NOT NULL DEFAULT 0, fetched_at TEXT NOT NULL, PRIMARY KEY (station, ym))'
    ),
    db.prepare('CREATE TABLE IF NOT EXISTS farm_simulator_forecast (id TEXT PRIMARY KEY, data TEXT NOT NULL, fetched_at TEXT NOT NULL)'),
  ])
}

/** 日本時間の今日（YYYY-MM-DD） */
export function jstToday(now = Date.now()): string {
  return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.split('-').map(Number) as [number, number]
  const [ty, tm] = to.split('-').map(Number) as [number, number]
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
    if (out.length > 1200) break
  }
  return out
}

/** その月が締まったか（月末から3日以上たったか。気象庁の値が確定するまでの余裕） */
function isMonthClosed(ym: string, today: string): boolean {
  const [y, m] = ym.split('-').map(Number) as [number, number]
  const next = new Date(Date.UTC(y, m, 1 + 3)).toISOString().slice(0, 10)
  return today >= next
}

async function fetchMonth(ym: string): Promise<WeatherDay[]> {
  const [y, m] = ym.split('-').map(Number) as [number, number]
  const res = await fetch(jmaDailyUrl(y, m), { headers: { 'user-agent': USER_AGENT } })
  if (!res.ok) throw new Error(`気象庁 ${res.status}`)
  const html = await res.text()
  if (!html.includes('mtx')) throw new Error('気象庁の表の形が変わったかもしれません')
  return parseJmaDailyA1(html, y, m)
}

async function fetchForecast(): Promise<WeatherDay[]> {
  const res = await fetch(JMA_FORECAST_URL, { headers: { 'user-agent': USER_AGENT } })
  if (!res.ok) throw new Error(`気象庁 ${res.status}`)
  const days = parseJmaForecast(await res.json())
  if (!days.length) throw new Error('予報を読めませんでした')
  return days
}

export interface WeatherResponse {
  station: string
  days: WeatherDay[]
  /** 取れていない月（今回の呼び出しで失敗したもの） */
  failed: string[]
  /** まだ取りに行っていない月の数（画面はこれが0になるまで呼び直す） */
  remaining: number
  /** 今回の呼び出しで取った月の数 */
  fetched: number
  totalMonths: number
  forecast: { days: WeatherDay[]; fetchedAt: string; point: string } | null
  forecastError: string | null
}

export async function loadWeather(db: any, fromYm: string, toYm: string, withForecast: boolean): Promise<WeatherResponse> {
  const now = Date.now()
  const today = jstToday(now)
  const thisMonth = today.slice(0, 7)
  const to = toYm > thisMonth ? thisMonth : toYm
  // 長すぎる期間は新しい側を残す
  const months = monthsBetween(fromYm, to).slice(-MAX_MONTHS)

  const { results } = await db
    .prepare('SELECT ym, data, complete, fetched_at FROM farm_simulator_weather_months WHERE station = ? AND ym >= ? AND ym <= ?')
    .bind(JMA_STATION.id, months[0] ?? fromYm, months.at(-1) ?? to)
    .all()
  const cached = new Map<string, { data: string; complete: number; fetchedAt: string }>()
  for (const r of results ?? []) cached.set(r.ym as string, { data: r.data as string, complete: Number(r.complete), fetchedAt: r.fetched_at as string })

  const needs = months.filter((ym) => {
    const c = cached.get(ym)
    if (!c) return true
    if (c.complete) return false
    return now - Date.parse(c.fetchedAt) > STALE_MS
  })
  // 新しい月から取る（見通しを出す季節の観測が先に揃うように）
  const batch = needs.slice().reverse().slice(0, MAX_FETCH_PER_CALL)
  const failed: string[] = []
  const writes: any[] = []
  const fetchedAt = new Date(now).toISOString()
  for (let i = 0; i < batch.length; i += FETCH_CONCURRENCY) {
    const chunk = batch.slice(i, i + FETCH_CONCURRENCY)
    const settled = await Promise.allSettled(chunk.map((ym) => fetchMonth(ym)))
    settled.forEach((s, k) => {
      const ym = chunk[k]!
      if (s.status === 'rejected') {
        console.warn('[farm-simulator] weather fetch failed', ym, s.reason)
        failed.push(ym)
        return
      }
      const data = JSON.stringify(s.value)
      const complete = isMonthClosed(ym, today) ? 1 : 0
      cached.set(ym, { data, complete, fetchedAt })
      writes.push(
        db
          .prepare(
            `INSERT INTO farm_simulator_weather_months (station, ym, data, complete, fetched_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(station, ym) DO UPDATE SET data = excluded.data, complete = excluded.complete, fetched_at = excluded.fetched_at`
          )
          .bind(JMA_STATION.id, ym, data, complete, fetchedAt)
      )
    })
  }
  if (writes.length) await db.batch(writes)

  const days: WeatherDay[] = []
  for (const ym of months) {
    const c = cached.get(ym)
    if (!c) continue
    try {
      days.push(...(JSON.parse(c.data) as WeatherDay[]))
    } catch {
      // 壊れた行は無いものとして扱う（次に取り直される）
    }
  }

  let forecast: WeatherResponse['forecast'] = null
  let forecastError: string | null = null
  if (withForecast) {
    const row = await db.prepare('SELECT data, fetched_at FROM farm_simulator_forecast WHERE id = ?').bind(JMA_STATION.id).first()
    if (row && now - Date.parse(row.fetched_at as string) <= STALE_MS) {
      forecast = { days: JSON.parse(row.data as string), fetchedAt: row.fetched_at as string, point: '和歌山' }
    } else {
      try {
        const fdays = await fetchForecast()
        await db
          .prepare(
            `INSERT INTO farm_simulator_forecast (id, data, fetched_at) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
          )
          .bind(JMA_STATION.id, JSON.stringify(fdays), fetchedAt)
          .run()
        forecast = { days: fdays, fetchedAt, point: '和歌山' }
      } catch (e: any) {
        console.warn('[farm-simulator] forecast fetch failed', e)
        forecastError = '予報を取れませんでした'
        // 古い予報でも、今日より先の日が残っていれば使う
        if (row) {
          const old = (JSON.parse(row.data as string) as WeatherDay[]).filter((d) => d.date > today)
          if (old.length) forecast = { days: old, fetchedAt: row.fetched_at as string, point: '和歌山' }
        }
      }
    }
  }

  return {
    station: JMA_STATION.name,
    days,
    failed,
    remaining: Math.max(0, needs.length - batch.length),
    fetched: batch.length - failed.length,
    totalMonths: months.length,
    forecast,
    forecastError,
  }
}
