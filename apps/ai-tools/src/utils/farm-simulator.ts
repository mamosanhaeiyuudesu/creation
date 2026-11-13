// 収穫・出荷の見通し（farm-simulator）の計算。画面とテストの両方から使う純TS（Vue・Nuxt・DOMに依存しない）。
//
// 数字はすべてここで計算する。AIには計算済みの数字を渡して説明文を書かせるだけで、
// AIの文章に渡していない数字が混ざっていないかの検査（findUnknownNumbers）もここに置く。
//
// 計算の考え方（画面の「根拠」にも同じことを書いている）:
// - 量: 品目・種別ごとに、過去の季節（シーズン）の合計の平均。幅は年ごとの合計の標準偏差（平均±1標準偏差）。
// - 時期: 過去の季節の「半分を取り終えた日」（山の日）の平均を基準に、その日までの積算温度
//         （毎日の平均気温のうち基準温度を超えた分の足し上げ）を、過去の季節の平均と今季で比べる。
//         差をその時期の1日あたりの積算温度で割って日数に直す（暖かい年は早まる）。上限は±MAX_SHIFT_DAYS日。
//         今季の気温は 観測値→予報→平年値（＋気温のずれ）の順で使う。
//         時期の幅は、過去の季節にこのやり方を当てたときの外れ方（日数の標準偏差）。
// - 量は気温で変えない（数年の記録では、気温と量の関係を確かめられないため）。

export type RecordKind = 'harvest' | 'ship'
export const KIND_LABELS: Record<RecordKind, string> = { harvest: '収穫', ship: '出荷' }

export interface FarmRecord {
  /** CSVの行番号（見出しを1行目として数える）。エラー表示と根拠に使う */
  line: number
  /** YYYY-MM-DD */
  date: string
  item: string
  kind: RecordKind
  /** kg */
  qty: number
  /** 円/kg。空欄は null */
  price: number | null
  dest: string
  memo: string
}

export interface CsvError {
  line: number
  message: string
  raw: string
}

export interface CsvSummary {
  rows: number
  from: string | null
  to: string | null
  items: string[]
  /** 空欄だった数（必須ではない列） */
  missing: { price: number; dest: number; memo: number }
}

export interface CsvResult {
  records: FarmRecord[]
  errors: CsvError[]
  summary: CsvSummary
}

/** 1日ぶんの天気。値が取れなかった日は null */
export interface WeatherDay {
  date: string
  tavg: number | null
  tmax: number | null
  tmin: number | null
  prcp: number | null
}

// ───────────────────────── 品目ごとの決めごと ─────────────────────────

export interface ItemProfile {
  /** 季節の始まりの月。キウイは秋に取って冬〜春に出すので4月始まりにして、年をまたいでも1つの季節に入れる */
  seasonStartMonth: number
  /** 積算温度を足し始める日（MM-DD） */
  gddStart: string
  /** この温度を超えた分だけ足す（℃） */
  baseTemp: number
}

export const DEFAULT_PROFILE: ItemProfile = { seasonStartMonth: 1, gddStart: '03-01', baseTemp: 10 }

/** 知っている品目だけ決めておく。それ以外は DEFAULT_PROFILE */
export const ITEM_PROFILES: Record<string, ItemProfile> = {
  桃: { seasonStartMonth: 1, gddStart: '03-01', baseTemp: 10 },
  柿: { seasonStartMonth: 1, gddStart: '04-01', baseTemp: 10 },
  いちじく: { seasonStartMonth: 1, gddStart: '04-01', baseTemp: 10 },
  キウイ: { seasonStartMonth: 4, gddStart: '04-01', baseTemp: 10 },
}

export function profileOf(item: string): ItemProfile {
  return ITEM_PROFILES[item] ?? DEFAULT_PROFILE
}

// ───────────────────────── 日付 ─────────────────────────

const DAY_MS = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** 正しい日付なら YYYY-MM-DD、だめなら null */
export function validDate(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return toDateKey(y, m, d)
}

function dateToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

function msToDate(ms: number): string {
  const dt = new Date(ms)
  return toDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

export function addDays(key: string, n: number): string {
  return msToDate(dateToMs(key) + n * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dateToMs(to) - dateToMs(from)) / DAY_MS)
}

/** 季節の年。4月始まりなら 2026-02-10 は 2025年の季節 */
export function seasonOf(date: string, startMonth: number): number {
  const [y, m] = date.split('-').map(Number)
  return m! >= startMonth ? y! : y! - 1
}

export function seasonStartDate(season: number, startMonth: number): string {
  return toDateKey(season, startMonth, 1)
}

/** 季節の何日目か（初日＝0） */
export function dayOfSeason(date: string, startMonth: number): number {
  return daysBetween(seasonStartDate(seasonOf(date, startMonth), startMonth), date)
}

/** 季節の日数（365か366） */
function seasonLength(season: number, startMonth: number): number {
  return daysBetween(seasonStartDate(season, startMonth), seasonStartDate(season + 1, startMonth))
}

/** 季節の何旬目か（季節の始まりの月の上旬＝0、1年で36旬） */
export function junOf(date: string, startMonth: number): number {
  const [, m, d] = date.split('-').map(Number)
  const monthIndex = (m! - startMonth + 12) % 12
  return monthIndex * 3 + (d! <= 10 ? 0 : d! <= 20 ? 1 : 2)
}

export function junLabel(index: number, startMonth: number): string {
  const month = ((startMonth - 1 + Math.floor(index / 3)) % 12) + 1
  return `${month}月${['上旬', '中旬', '下旬'][index % 3]}`
}

/** 「7月15日」の形 */
export function formatMonthDay(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}月${d}日`
}

// ───────────────────────── CSV ─────────────────────────

/** CSVを1行ずつのセル配列にする。ダブルクォート・セル内の改行・タブ区切り（表計算ソフトから貼り付け）に対応 */
export function splitCsv(text: string): { cells: string[]; line: number; raw: string }[] {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const firstLine = src.split('\n', 1)[0] ?? ''
  const sep = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ','
  const rows: { cells: string[]; line: number; raw: string }[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1
  let startLine = 1
  let raw = ''
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        raw += '""'
        i++
        continue
      }
      if (ch === '"') quoted = false
      else cell += ch
      if (ch === '\n') line++
      raw += ch
      continue
    }
    if (ch === '"' && cell === '') {
      quoted = true
      raw += ch
      continue
    }
    if (ch === sep) {
      cells.push(cell)
      cell = ''
      raw += ch
      continue
    }
    if (ch === '\n') {
      cells.push(cell)
      rows.push({ cells, line: startLine, raw })
      cells = []
      cell = ''
      raw = ''
      line++
      startLine = line
      continue
    }
    cell += ch
    raw += ch
  }
  if (cell !== '' || cells.length) {
    cells.push(cell)
    rows.push({ cells, line: startLine, raw })
  }
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ''))
}

const HEADER_ALIASES: Record<string, keyof Omit<FarmRecord, 'line'>> = {
  日付: 'date', 年月日: 'date', date: 'date',
  品目: 'item', 作物: 'item', item: 'item',
  種別: 'kind', 区分: 'kind', kind: 'kind', type: 'kind',
  数量: 'qty', '数量(kg)': 'qty', '数量（kg）': 'qty', 重量: 'qty', qty: 'qty', quantity: 'qty',
  単価: 'price', '単価(円/kg)': 'price', '単価（円/kg）': 'price', price: 'price',
  出荷先: 'dest', 販売先: 'dest', dest: 'dest', destination: 'dest',
  メモ: 'memo', 備考: 'memo', memo: 'memo', note: 'memo',
}

/** 全角の数字・記号を半角へ */
export function toHalfWidth(s: string): string {
  return s
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．]/g, '.')
    .replace(/[，、]/g, ',')
    .replace(/[－−ー‐]/g, '-')
    .replace(/[／]/g, '/')
    .replace(/　/g, ' ')
}

export function parseDateText(s: string): string | null {
  const t = toHalfWidth(s).trim()
  const m = t.match(/^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/)
  if (!m) return null
  return validDate(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** 「1,234」「12.5kg」も読む。読めなければ NaN */
export function parseNumberText(s: string): number {
  const t = toHalfWidth(s).trim().replace(/(kg|ｋｇ|キロ|円\/kg|円|\/kg)$/i, '').replace(/,/g, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(t)) return Number.NaN
  return Number(t)
}

function parseKind(s: string): RecordKind | null {
  const t = toHalfWidth(s).trim().toLowerCase()
  if (['収穫', 'harvest', '収'].includes(t)) return 'harvest'
  if (['出荷', 'ship', 'shipment', '出'].includes(t)) return 'ship'
  return null
}

/** 品目名のゆれをそろえる（「もも」「モモ」→「桃」など、知っている品目だけ） */
const ITEM_ALIASES: Record<string, string> = {
  もも: '桃', モモ: '桃', かき: '柿', カキ: '柿', イチジク: 'いちじく', 無花果: 'いちじく', きうい: 'キウイ', キウイフルーツ: 'キウイ',
}

export function parseRecordsCsv(text: string): CsvResult {
  const rows = splitCsv(text)
  const records: FarmRecord[] = []
  const errors: CsvError[] = []
  const empty: CsvResult = {
    records,
    errors,
    summary: { rows: 0, from: null, to: null, items: [], missing: { price: 0, dest: 0, memo: 0 } },
  }
  if (!rows.length) return empty

  // 見出しの行があればそれで列を決める。無ければ「日付,品目,種別,数量,単価,出荷先,メモ」の順とみなす
  const head = rows[0]!.cells.map((c) => HEADER_ALIASES[toHalfWidth(c).trim().toLowerCase()] ?? HEADER_ALIASES[c.trim()])
  const hasHeader = head.filter(Boolean).length >= 3
  const order: (keyof Omit<FarmRecord, 'line'> | undefined)[] = hasHeader
    ? head
    : ['date', 'item', 'kind', 'qty', 'price', 'dest', 'memo']
  const body = hasHeader ? rows.slice(1) : rows
  if (hasHeader) {
    const need: (keyof Omit<FarmRecord, 'line'>)[] = ['date', 'item', 'kind', 'qty']
    const lack = need.filter((k) => !order.includes(k))
    if (lack.length) {
      const names: Record<string, string> = { date: '日付', item: '品目', kind: '種別', qty: '数量' }
      errors.push({ line: rows[0]!.line, message: `見出しに「${lack.map((k) => names[k]).join('」「')}」の列がありません`, raw: rows[0]!.raw })
      return empty
    }
  }

  const missing = { price: 0, dest: 0, memo: 0 }
  for (const row of body) {
    const get = (key: keyof Omit<FarmRecord, 'line'>) => {
      const i = order.indexOf(key)
      return i >= 0 ? (row.cells[i] ?? '').trim() : ''
    }
    const problems: string[] = []
    const date = parseDateText(get('date'))
    if (!date) problems.push(get('date') ? `日付「${get('date')}」が読めません` : '日付が空です')
    const itemRaw = get('item')
    const item = ITEM_ALIASES[itemRaw] ?? itemRaw
    if (!item) problems.push('品目が空です')
    const kind = parseKind(get('kind'))
    if (!kind) problems.push(get('kind') ? `種別「${get('kind')}」は「収穫」か「出荷」にしてください` : '種別が空です')
    const qty = parseNumberText(get('qty'))
    if (!Number.isFinite(qty)) problems.push(get('qty') ? `数量「${get('qty')}」が数字ではありません` : '数量が空です')
    else if (qty <= 0) problems.push('数量は0より大きくしてください')
    const priceText = get('price')
    let price: number | null = null
    if (priceText) {
      const p = parseNumberText(priceText)
      if (!Number.isFinite(p) || p < 0) problems.push(`単価「${priceText}」が数字ではありません`)
      else price = p
    }
    if (problems.length) {
      errors.push({ line: row.line, message: problems.join('／'), raw: row.raw })
      continue
    }
    const dest = get('dest')
    const memo = get('memo')
    if (price === null) missing.price++
    if (!dest) missing.dest++
    if (!memo) missing.memo++
    records.push({ line: row.line, date: date!, item, kind: kind!, qty, price, dest, memo })
  }

  records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.line - b.line))
  const items = [...new Set(records.map((r) => r.item))]
  return {
    records,
    errors,
    summary: {
      rows: records.length,
      from: records[0]?.date ?? null,
      to: records.at(-1)?.date ?? null,
      items,
      missing,
    },
  }
}

// ───────────────────────── 統計の小道具 ─────────────────────────

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

/** 標本標準偏差（n-1で割る）。1件以下は0 */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

/** 量の表示用の丸め。10kg単位（10kg未満は1kg単位） */
export function roundKg(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.abs(x) < 10 ? Math.round(x) : Math.round(x / 10) * 10
}

/** 金額の表示用の丸め。1,000円単位 */
export function roundYen(x: number): number {
  return Math.round(x / 1000) * 1000
}

export function formatNum(n: number): string {
  return n.toLocaleString('ja-JP')
}

// ───────────────────────── 天気 ─────────────────────────

/** 1年を365日に並べたときの何日目か（2/29は2/28と同じ扱い） */
function dayOfYear365(date: string): number {
  const [, m, d] = date.split('-').map(Number)
  const ms = Date.UTC(2001, m! - 1, m === 2 && d === 29 ? 28 : d!)
  return Math.round((ms - Date.UTC(2001, 0, 1)) / DAY_MS)
}

export interface WeatherIndex {
  obs: Map<string, number>
  fcst: Map<string, number>
  /** 平年値（観測した年の同じ時期±7日の平均）。365日ぶん。データが無い日は null */
  normal: (number | null)[]
  lastObs: string | null
  firstObs: string | null
}

export function buildWeatherIndex(observed: WeatherDay[], forecast: WeatherDay[]): WeatherIndex {
  const obs = new Map<string, number>()
  for (const d of observed) if (d.tavg !== null && Number.isFinite(d.tavg)) obs.set(d.date, d.tavg)
  const fcst = new Map<string, number>()
  for (const d of forecast) {
    if (obs.has(d.date)) continue
    const t = d.tavg ?? (d.tmax !== null && d.tmin !== null ? (d.tmax + d.tmin) / 2 : null)
    if (t !== null && Number.isFinite(t)) fcst.set(d.date, t)
  }
  const sums = new Array<number>(365).fill(0)
  const counts = new Array<number>(365).fill(0)
  for (const [date, t] of obs) {
    const i = dayOfYear365(date)
    sums[i] = sums[i]! + t
    counts[i] = counts[i]! + 1
  }
  const normal: (number | null)[] = []
  for (let i = 0; i < 365; i++) {
    let s = 0
    let c = 0
    for (let k = -7; k <= 7; k++) {
      const j = (i + k + 365) % 365
      s += sums[j]!
      c += counts[j]!
    }
    normal.push(c ? s / c : null)
  }
  const dates = [...obs.keys()].sort()
  return { obs, fcst, normal, lastObs: dates.at(-1) ?? null, firstObs: dates[0] ?? null }
}

type TempSource = 'obs' | 'fcst' | 'normal' | 'none'

/**
 * 季節の各日の積算温度（季節の初日＝0日目）。gddStart より前は0。
 * future=true のときは「観測が無い日」を予報→平年値＋気温のずれで埋める（今季の見通し用）。
 * future=false のときは観測が無い日を平年値で埋め、その日数を missing に数える（過去の季節の答え合わせ用）。
 */
export function seasonGdd(
  w: WeatherIndex,
  season: number,
  profile: ItemProfile,
  opts: { future: boolean; tempShift?: number; until?: number },
): { cum: number[]; sources: Record<TempSource, number>; missing: number } {
  const start = seasonStartDate(season, profile.seasonStartMonth)
  const len = seasonLength(season, profile.seasonStartMonth)
  const [gm, gd] = profile.gddStart.split('-').map(Number)
  const gddYear = gm! >= profile.seasonStartMonth ? season : season + 1
  const gddFrom = daysBetween(start, toDateKey(gddYear, gm!, gd!))
  const shift = opts.tempShift ?? 0
  const until = Math.min(len - 1, opts.until ?? len - 1)
  const cum: number[] = []
  const sources: Record<TempSource, number> = { obs: 0, fcst: 0, normal: 0, none: 0 }
  let missing = 0
  let acc = 0
  for (let i = 0; i < len; i++) {
    if (i >= gddFrom) {
      const date = addDays(start, i)
      let t: number | null = null
      let src: TempSource = 'none'
      if (w.obs.has(date)) {
        t = w.obs.get(date)!
        src = 'obs'
      } else if (opts.future && w.fcst.has(date)) {
        t = w.fcst.get(date)! + shift
        src = 'fcst'
      } else {
        const n = w.normal[dayOfYear365(date)]
        if (n !== null && n !== undefined) {
          t = n + (opts.future ? shift : 0)
          src = 'normal'
        }
        if (!opts.future && i <= until) missing++
      }
      if (i <= until) sources[src]++
      if (t !== null) acc += Math.max(0, t - profile.baseTemp)
    }
    cum.push(acc)
  }
  return { cum, sources, missing }
}

/** 積算温度が target に初めて届いた日（季節の何日目か）。届かなければ null */
export function reachDay(cum: number[], target: number): number | null {
  for (let i = 0; i < cum.length; i++) if (cum[i]! >= target) return i
  return null
}

// ───────────────────────── 見通し ─────────────────────────

export interface Settings {
  /** これより少ない季節数なら見通しを出さない */
  minSeasons: number
  /** これより少ない行数なら見通しを出さない */
  minRows: number
}

/** 気温による時期のずれの上限（日）。数季節の記録で、これより大きく動かすのは言い過ぎになる */
export const MAX_SHIFT_DAYS = 14
/** 1日あたりの積算温度の下限（℃・日）。冬に近い時期に、小さな差が大きな日数に化けるのを防ぐ */
export const MIN_GDD_PER_DAY = 3

export const DEFAULT_SETTINGS: Settings = { minSeasons: 2, minRows: 10 }

export interface Scenario {
  /** これから先の日の気温に足す（℃） */
  tempShift: number
  /** 単価の変化（%） */
  priceChange: number
}

interface SeasonStat {
  season: number
  total: number
  rows: number
  /** 季節の何日目に 10%・50%・90% を取り終えたか */
  d10: number
  d50: number
  d90: number
  /** 日ごとの量（季節の何日目 → kg） */
  daily: Map<number, number>
  bins: number[]
  revenue: number
  pricedQty: number
}

export interface Bin {
  index: number
  label: string
  low: number
  mid: number
  high: number
}

export interface WeatherUse {
  used: boolean
  /** 使わなかった理由 */
  reason: string | null
  baseTemp: number
  gddStartLabel: string
  /** 過去の季節の、平均の山の日までの積算温度の平均（℃・日） */
  requiredGdd: number | null
  /** 今季の、同じ日までの積算温度（℃・日） */
  targetGdd: number | null
  /** その時期の1日あたりの積算温度（℃・日） */
  gddPerDay: number | null
  /** ずれが大きすぎて上限（±MAX_SHIFT_DAYS日）で止めたか */
  capped: boolean
  /** 過去の山の日の平均を、見通す季節の日付にしたもの */
  avgPeakDate: string
  /** 気温で補正したほうが、補正しないより過去の季節によく当たったか（3季節以上のときだけ判定） */
  helps: boolean | null
  /** 答え合わせに使えた過去の季節 */
  calibratedSeasons: number[]
  /** 今季の見通しに使った日数の内訳 */
  obsDays: number
  fcstDays: number
  normalDays: number
  /** 平均の年と比べて何日早い/遅いか（マイナス＝早い） */
  shiftDays: number
  /** 時期の幅（±日） */
  spreadDays: number
}

export interface Outlook {
  item: string
  kind: RecordKind
  targetSeason: number
  status: 'ok' | 'insufficient'
  /** status が insufficient のときの理由 */
  reason: string | null
  rowsUsed: number
  seasonsUsed: number[]
  firstLine: number | null
  lastLine: number | null
  total: { low: number; mid: number; high: number } | null
  totalsBySeason: { season: number; total: number }[]
  sdTotal: number
  timing: {
    start: string
    peak: string
    end: string
    peakFrom: string
    peakTo: string
    peakJun: string
  } | null
  price: { base: number; applied: number } | null
  revenue: { low: number; mid: number; high: number } | null
  bins: Bin[]
  past: { season: number; bins: number[] }[]
  current: { season: number; bins: number[]; total: number } | null
  /** グラフに出す旬の範囲（両端を含む） */
  range: [number, number]
  weather: WeatherUse
  startMonth: number
}

function fractionDay(entries: [number, number][], total: number, frac: number): number {
  let acc = 0
  for (const [day, q] of entries) {
    acc += q
    if (acc >= total * frac - 1e-9) return day
  }
  return entries.at(-1)?.[0] ?? 0
}

function statsBySeason(records: FarmRecord[], startMonth: number): Map<number, SeasonStat> {
  const map = new Map<number, SeasonStat>()
  for (const r of records) {
    const season = seasonOf(r.date, startMonth)
    let s = map.get(season)
    if (!s) {
      s = { season, total: 0, rows: 0, d10: 0, d50: 0, d90: 0, daily: new Map(), bins: new Array(36).fill(0), revenue: 0, pricedQty: 0 }
      map.set(season, s)
    }
    const day = dayOfSeason(r.date, startMonth)
    s.total += r.qty
    s.rows++
    s.daily.set(day, (s.daily.get(day) ?? 0) + r.qty)
    s.bins[junOf(r.date, startMonth)]! += r.qty
    if (r.price !== null) {
      s.revenue += r.qty * r.price
      s.pricedQty += r.qty
    }
  }
  for (const s of map.values()) {
    const entries = [...s.daily.entries()].sort((a, b) => a[0] - b[0])
    s.d10 = fractionDay(entries, s.total, 0.1)
    s.d50 = fractionDay(entries, s.total, 0.5)
    s.d90 = fractionDay(entries, s.total, 0.9)
  }
  return map
}

/** 見通しを出す季節の既定値＝記録のいちばん新しい季節の次 */
export function defaultTargetSeason(records: FarmRecord[], item: string): number | null {
  const p = profileOf(item)
  const seasons = records.filter((r) => r.item === item).map((r) => seasonOf(r.date, p.seasonStartMonth))
  return seasons.length ? Math.max(...seasons) + 1 : null
}

export function buildOutlook(input: {
  records: FarmRecord[]
  item: string
  kind: RecordKind
  targetSeason: number
  weather: WeatherIndex
  scenario: Scenario
  settings: Settings
}): Outlook {
  const { item, kind, targetSeason, weather: w, scenario, settings } = input
  const profile = profileOf(item)
  const sm = profile.seasonStartMonth
  const mine = input.records.filter((r) => r.item === item && r.kind === kind)
  const all = statsBySeason(mine, sm)
  const past = [...all.values()].filter((s) => s.season < targetSeason).sort((a, b) => a.season - b.season)
  const cur = all.get(targetSeason) ?? null
  const usedRecords = mine.filter((r) => seasonOf(r.date, sm) < targetSeason)
  const rowsUsed = usedRecords.length

  const weatherBase: WeatherUse = {
    used: false,
    reason: null,
    baseTemp: profile.baseTemp,
    gddStartLabel: formatMonthDay(`2001-${profile.gddStart}`),
    requiredGdd: null,
    targetGdd: null,
    gddPerDay: null,
    capped: false,
    avgPeakDate: '',
    helps: null,
    calibratedSeasons: [],
    obsDays: 0,
    fcstDays: 0,
    normalDays: 0,
    shiftDays: 0,
    spreadDays: 0,
  }
  const base: Outlook = {
    item,
    kind,
    targetSeason,
    status: 'insufficient',
    reason: null,
    rowsUsed,
    seasonsUsed: past.map((s) => s.season),
    firstLine: usedRecords.length ? Math.min(...usedRecords.map((r) => r.line)) : null,
    lastLine: usedRecords.length ? Math.max(...usedRecords.map((r) => r.line)) : null,
    total: null,
    totalsBySeason: past.map((s) => ({ season: s.season, total: s.total })),
    sdTotal: 0,
    timing: null,
    price: null,
    revenue: null,
    bins: [],
    past: past.map((s) => ({ season: s.season, bins: s.bins })),
    current: cur ? { season: cur.season, bins: cur.bins, total: cur.total } : null,
    range: [0, 35],
    weather: weatherBase,
    startMonth: sm,
  }

  if (past.length < settings.minSeasons || rowsUsed < settings.minRows) {
    base.reason = `記録がたりません（${past.length}季節・${rowsUsed}行。見通しには${settings.minSeasons}季節・${settings.minRows}行以上が要ります）`
    base.range = binRange(base.past.map((p) => p.bins).concat(cur ? [cur.bins] : []))
    return base
  }

  // ── 量 ──
  const totals = past.map((s) => s.total)
  const mid = mean(totals)
  const sd = stdev(totals)
  const total = { low: roundKg(Math.max(0, mid - sd)), mid: roundKg(mid), high: roundKg(mid + sd) }

  // ── 時期（積算温度） ──
  const meanD50 = mean(past.map((s) => s.d50))
  const weatherUse: WeatherUse = { ...weatherBase }
  let predD50 = meanD50
  if (!w.lastObs) {
    weatherUse.reason = '天気のデータがありません'
  } else {
    // 「平均の山の日」（季節の何日目かの平均＝meanD50）までの積算温度を、過去の季節と今季で比べる。
    // 差を、その時期の1日あたりの積算温度で割って日数に直す（暖かい年は早まり、寒い年は遅れる）。
    // 「しきい値に届く日」を探すやり方は、秋のように1日あたりの積算温度が小さい時期に、
    // わずかな差で日付が大きく動いてしまった（柿・キウイで16〜19日。2026-11-13に実測）ので使わない。
    const D = Math.round(meanD50)
    const calib: { s: SeasonStat; cum: number[] }[] = []
    for (const s of past) {
      const g = seasonGdd(w, s.season, profile, { future: false, until: D })
      // 平均の山の日までの日のうち2割以上の観測が欠けている季節は、比べる相手に使わない
      const span = g.sources.obs + g.missing
      if (g.missing / Math.max(1, span) > 0.2 || (g.cum[D] ?? 0) <= 0) continue
      calib.push({ s, cum: g.cum })
    }
    if (!calib.length) {
      weatherUse.reason = '過去の季節の天気が足りません'
    } else {
      const avgGdd = mean(calib.map((c) => c.cum[D]!))
      // その時期（平均の山の日の前後15日）の1日あたりの積算温度
      const rate = Math.max(
        MIN_GDD_PER_DAY,
        mean(calib.map((c) => (c.cum[Math.min(c.cum.length - 1, D + 15)]! - c.cum[Math.max(0, D - 15)]!) / 30)),
      )
      const toShift = (gdd: number) => Math.max(-MAX_SHIFT_DAYS, Math.min(MAX_SHIFT_DAYS, -(gdd - avgGdd) / rate))
      const target = seasonGdd(w, targetSeason, profile, {
        future: true,
        tempShift: scenario.tempShift,
        until: Math.round(meanD50 + mean(past.map((s) => s.d90 - s.d50))),
      })
      const targetGdd = target.cum[D] ?? 0
      const rawShift = -(targetGdd - avgGdd) / rate
      predD50 = meanD50 + toShift(targetGdd)
      // 外れ方: 過去の季節にこのやり方を当てたら、実際の山の日と何日ずれたか
      const residuals = calib.map((c) => c.s.d50 - (meanD50 + toShift(c.cum[D]!)))
      weatherUse.used = true
      weatherUse.requiredGdd = Math.round(avgGdd)
      weatherUse.targetGdd = Math.round(targetGdd)
      weatherUse.gddPerDay = Math.round(rate * 10) / 10
      weatherUse.capped = Math.abs(rawShift) > MAX_SHIFT_DAYS
      weatherUse.calibratedSeasons = calib.map((c) => c.s.season)
      weatherUse.obsDays = target.sources.obs
      weatherUse.fcstDays = target.sources.fcst
      weatherUse.normalDays = target.sources.normal
      weatherUse.spreadDays = Math.max(2, Math.round(calib.length >= 2 ? stdev(residuals) : stdev(past.map((s) => s.d50))))
      if (calib.length >= 3) weatherUse.helps = stdev(residuals) <= stdev(calib.map((c) => c.s.d50))
    }
  }
  if (!weatherUse.used) weatherUse.spreadDays = Math.max(2, Math.round(stdev(past.map((s) => s.d50))))
  const shift = predD50 - meanD50
  weatherUse.shiftDays = Math.round(shift) || 0
  weatherUse.avgPeakDate = addDays(seasonStartDate(targetSeason, sm), Math.round(meanD50))

  // ── 形: 各季節の中心（半分の日）をそろえてから平均し、見通しの中心へずらす ──
  const len = seasonLength(targetSeason, sm)
  const shares = new Array<number>(len + 60).fill(0)
  for (const s of past) {
    for (const [day, q] of s.daily) {
      const d = Math.round(day - s.d50 + predD50)
      const idx = Math.min(len - 1, Math.max(0, d))
      shares[idx]! += q / s.total / past.length
    }
  }
  const seasonStart = seasonStartDate(targetSeason, sm)
  const binShares = new Array<number>(36).fill(0)
  for (let i = 0; i < len; i++) {
    if (!shares[i]) continue
    binShares[junOf(addDays(seasonStart, i), sm)]! += shares[i]!
  }
  const bins: Bin[] = binShares.map((share, index) => ({
    index,
    label: junLabel(index, sm),
    low: share * total.low,
    mid: share * mid,
    high: share * total.high,
  }))

  const dayToDate = (d: number) => addDays(seasonStart, Math.min(len - 1, Math.max(0, Math.round(d))))
  const startDay = predD50 + mean(past.map((s) => s.d10 - s.d50))
  const endDay = predD50 + mean(past.map((s) => s.d90 - s.d50))
  const peakIdx = binShares.indexOf(Math.max(...binShares))
  // 始まり・終わりは山の幅より内側にならないようにする（山の幅のほうが広いと、表示のつじつまが合わない）
  const peakFromDay = predD50 - weatherUse.spreadDays
  const peakToDay = predD50 + weatherUse.spreadDays
  const timing = {
    start: dayToDate(Math.min(startDay, peakFromDay)),
    peak: dayToDate(predD50),
    end: dayToDate(Math.max(endDay, peakToDay)),
    peakFrom: dayToDate(peakFromDay),
    peakTo: dayToDate(peakToDay),
    peakJun: junLabel(peakIdx, sm),
  }

  // ── 単価と金額 ──
  const pricedQty = past.reduce((s, x) => s + x.pricedQty, 0)
  let price: Outlook['price'] = null
  let revenue: Outlook['revenue'] = null
  if (pricedQty > 0) {
    const avg = past.reduce((s, x) => s + x.revenue, 0) / pricedQty
    const applied = avg * (1 + scenario.priceChange / 100)
    price = { base: Math.round(avg), applied: Math.round(applied) }
    revenue = { low: roundYen(total.low * applied), mid: roundYen(total.mid * applied), high: roundYen(total.high * applied) }
  }

  return {
    ...base,
    status: 'ok',
    total,
    sdTotal: roundKg(sd),
    timing,
    price,
    revenue,
    bins,
    range: binRange([binShares, ...base.past.map((p) => p.bins)].concat(cur ? [cur.bins] : [])),
    weather: weatherUse,
  }
}

/** 0でない旬の範囲に、前後1旬の余白をつける */
function binRange(series: number[][]): [number, number] {
  let lo = 36
  let hi = -1
  for (const s of series) {
    s.forEach((v, i) => {
      if (v > 0) {
        lo = Math.min(lo, i)
        hi = Math.max(hi, i)
      }
    })
  }
  if (hi < 0) return [0, 35]
  return [Math.max(0, lo - 1), Math.min(35, hi + 1)]
}

// ───────────────────────── AIの文章の検査 ─────────────────────────

/** 数字の正規形（1830 / 1830.5 / -3 → 3） */
function canonical(n: number): string {
  return String(Math.abs(Number(n.toFixed(4))))
}

/** 渡した事実（オブジェクト）に含まれる数字の集合。数値そのものと、文字列の中の数字（「7月上旬」の7など）の両方 */
export function collectAllowedNumbers(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.add(canonical(value))
  } else if (typeof value === 'string') {
    for (const m of normalizeDigits(value).match(/\d+(?:\.\d+)?/g) ?? []) out.add(canonical(Number(m)))
  } else if (Array.isArray(value)) {
    for (const v of value) collectAllowedNumbers(v, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectAllowedNumbers(v, out)
  }
  return out
}

function normalizeDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．]/g, '.')
    .replace(/[，]/g, ',')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1')
}

/** 漢数字で書いた量（「三割」「二千キロ」）は検査をすり抜けるので、それ自体を余計な数字とみなす */
const KANJI_NUMBER = /[〇一二三四五六七八九十百千万億]+(?=\s*(?:kg|キロ|トン|t\b|円|%|％|パーセント|℃|度|日|旬|月|年|割|倍|回|件|行|季節|週|か月|ヶ月))/g

/** 文章に出てきた数字のうち、渡した数字に無いもの。空なら合格 */
export function findUnknownNumbers(text: string, allowed: Set<string>): string[] {
  const t = normalizeDigits(text)
  const unknown: string[] = []
  for (const m of t.match(/\d+(?:\.\d+)?/g) ?? []) {
    if (!allowed.has(canonical(Number(m)))) unknown.push(m)
  }
  for (const m of t.match(KANJI_NUMBER) ?? []) unknown.push(m)
  return [...new Set(unknown)]
}

/** AIに渡す事実（計算済みの数字だけ）。画面に出している値と同じものを入れる */
export function outlookFacts(o: Outlook, scenario: Scenario) {
  return {
    品目: o.item,
    種別: KIND_LABELS[o.kind],
    見通しの季節: o.targetSeason,
    使った記録の行数: o.rowsUsed,
    使った季節: o.seasonsUsed,
    季節ごとの合計kg: o.totalsBySeason.map((s) => ({ 季節: s.season, 合計kg: roundKg(s.total) })),
    見通しの量kg: o.total,
    時期: o.timing && {
      始まり: formatMonthDay(o.timing.start),
      山: formatMonthDay(o.timing.peak),
      山の幅: `${formatMonthDay(o.timing.peakFrom)}〜${formatMonthDay(o.timing.peakTo)}`,
      終わり: formatMonthDay(o.timing.end),
      いちばん多い旬: o.timing.peakJun,
    },
    平均の年と比べた時期のずれ日数: o.weather.shiftDays,
    時期のずれの向き: o.weather.shiftDays < 0 ? '早い' : o.weather.shiftDays > 0 ? '遅い' : '平均どおり',
    天気を使ったか: o.weather.used,
    気温の補正で過去によく当たったか: o.weather.helps,
    天気を使わなかった理由: o.weather.reason,
    積算温度の基準温度: o.weather.baseTemp,
    平均の山の日までの積算温度_過去の平均: o.weather.requiredGdd,
    平均の山の日までの積算温度_今季: o.weather.targetGdd,
    その時期の1日あたりの積算温度: o.weather.gddPerDay,
    試した気温のずれ: scenario.tempShift,
    試した単価の変化パーセント: scenario.priceChange,
    単価円: o.price,
    金額円: o.revenue,
  }
}
