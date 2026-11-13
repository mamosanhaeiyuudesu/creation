// 気象庁のデータの読み取り（farm-simulator）。取得先を差し替えるときは、このファイルと
// server/utils/farm-simulator-weather.ts の2つだけを書き換えればよい（計算側は WeatherDay しか見ない）。
//
// - 過去の観測: 「過去の気象データ検索」の日別値（アメダス）のHTML。かつらぎ（和歌山県 prec_no=65 / block_no=1342）。
//   1ページ＝1か月。APIは無いのでHTMLの表を読む。
// - 予報: 気象庁の週間予報のJSON（和歌山県 300000）。気温の予報地点は「和歌山」（和歌山市）しか無いので、
//   かつらぎ（内陸・標高142m）とは少しずれる。
import type { WeatherDay } from './farm-simulator'

export const JMA_STATION = {
  id: 'jma-1342',
  name: 'かつらぎ（アメダス）',
  precNo: '65',
  blockNo: '1342',
} as const

export const JMA_FORECAST = {
  office: '300000',
  /** 週間予報の気温の地点（和歌山） */
  pointCode: '65042',
  pointName: '和歌山',
} as const

export function jmaDailyUrl(year: number, month: number): string {
  return `https://www.data.jma.go.jp/stats/etrn/view/daily_a1.php?prec_no=${JMA_STATION.precNo}&block_no=${JMA_STATION.blockNo}&year=${year}&month=${month}&day=&view=`
}

export const JMA_FORECAST_URL = `https://www.jma.go.jp/bosai/forecast/data/forecast/${JMA_FORECAST.office}.json`

/**
 * 表の1セルを数値にする。気象庁の記号:
 *   ")" 準正常値（使ってよい） / "]" 資料不足値・"#" 疑問値・"×" 欠測・"///" 観測していない → null
 *   "--" 該当現象なし（降水量なら0）
 */
export function jmaValue(cell: string, opts: { noneIsZero?: boolean } = {}): number | null {
  const t = cell.replace(/&nbsp;/g, '').trim()
  if (!t || t.includes('///') || t.includes('×') || t.includes(']') || t.includes('#')) return null
  if (t === '--') return opts.noneIsZero ? 0 : null
  const m = t.replace(/\)$/, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(m)) return null
  return Number(m)
}

/** 日別値（アメダス daily_a1）のHTMLから、その月の各日の天気を読む。列: 日｜降水量 合計・1時間最大・10分間最大｜気温 平均・最高・最低｜… */
export function parseJmaDailyA1(html: string, year: number, month: number): WeatherDay[] {
  const out: WeatherDay[] = []
  const rows = html.split(/<tr class="mtx"/).slice(1)
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]!.replace(/<[^>]*>/g, '').trim())
    if (cells.length < 7) continue
    const day = Number(cells[0])
    if (!Number.isInteger(day) || day < 1 || day > 31) continue
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const d: WeatherDay = {
      date,
      prcp: jmaValue(cells[1]!, { noneIsZero: true }),
      tavg: jmaValue(cells[4]!),
      tmax: jmaValue(cells[5]!),
      tmin: jmaValue(cells[6]!),
    }
    // まだ来ていない日（全部 ///）は返さない
    if (d.prcp === null && d.tavg === null && d.tmax === null && d.tmin === null) continue
    out.push(d)
  }
  return out
}

/** 週間予報のJSONから、日ごとの最高・最低気温（和歌山）を読む。平均は（最高＋最低）÷2 */
export function parseJmaForecast(json: unknown): WeatherDay[] {
  if (!Array.isArray(json)) return []
  const byDate = new Map<string, { tmax: number | null; tmin: number | null }>()
  const num = (v: unknown) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN
    return Number.isFinite(n) ? n : null
  }
  const put = (date: string, key: 'tmax' | 'tmin', v: number | null) => {
    if (v === null) return
    const cur = byDate.get(date) ?? { tmax: null, tmin: null }
    if (cur[key] === null) cur[key] = v
    byDate.set(date, cur)
  }
  // 週間予報（2つ目のブロック）を先に、明日の欠けを短期予報（1つ目）で埋める
  for (const blk of [json[1], json[0]]) {
    for (const ts of (blk as any)?.timeSeries ?? []) {
      const defs: string[] = ts?.timeDefines ?? []
      for (const area of ts?.areas ?? []) {
        if (area?.area?.code !== JMA_FORECAST.pointCode) continue
        if (Array.isArray(area.tempsMax)) {
          defs.forEach((d, i) => {
            put(d.slice(0, 10), 'tmax', num(area.tempsMax[i]))
            put(d.slice(0, 10), 'tmin', num(area.tempsMin?.[i]))
          })
        } else if (Array.isArray(area.temps)) {
          // 短期予報: 00:00 が朝の最低、09:00 が日中の最高
          defs.forEach((d, i) => {
            const v = num(area.temps[i])
            if (d.includes('T00:00')) put(d.slice(0, 10), 'tmin', v)
            else if (d.includes('T09:00')) put(d.slice(0, 10), 'tmax', v)
          })
        }
      }
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({
      date,
      tmax: v.tmax,
      tmin: v.tmin,
      tavg: v.tmax !== null && v.tmin !== null ? Math.round(((v.tmax + v.tmin) / 2) * 10) / 10 : null,
      prcp: null,
    }))
}
