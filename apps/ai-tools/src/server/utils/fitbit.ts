// Fitbit Web API 呼び出し・OAuth2 トークン管理・ダッシュボード組み立ての共通処理。
// OpenAI を openai.ts に集約するのと同じ思想で、Fitbit 連携ロジックはここに集約する。
//
// 連携状態・トークンは WHISPER_DB に相乗り（fitbit_connections テーブル）。
// トークンは encrypt.ts の AES-GCM で暗号化して保存する。
//
// ローカル dev（import.meta.dev）では実 API・D1 が使えないため fitbit-dev.ts の
// 決定的スタブにフォールバックする。

import type { H3Event } from 'h3'
import type { DashboardData, SleepDetail, RawDay, FitbitStatus, TrendData } from '~/types/fitbit'
import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { devRawDay, devHistory } from '~/server/utils/fitbit-dev'
import { computeBaseline, computeSleepScore, computeEnergyScore, computeScoreSeries } from '~/server/utils/fitbit-score'
import { todayJST } from '~/utils/jst'

const FITBIT_API = 'https://api.fitbit.com'
const AUTH_URL = 'https://www.fitbit.com/oauth2/authorize'
const TOKEN_URL = 'https://api.fitbit.com/oauth2/token'
const SCOPES = ['activity', 'heartrate', 'sleep', 'oxygen_saturation', 'respiratory_rate', 'temperature', 'cardio_fitness', 'profile']

interface FitbitConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getConfig(event: H3Event): FitbitConfig | null {
  const cfg = useRuntimeConfig(event) as any
  if (!cfg.fitbitClientId || !cfg.fitbitClientSecret) return null
  return {
    clientId: cfg.fitbitClientId,
    clientSecret: cfg.fitbitClientSecret,
    redirectUri: cfg.fitbitRedirectUri || '',
  }
}

// ─────────────────────────────── OAuth2 (Authorization Code + PKCE) ──────────────

/** ランダムな code_verifier（43-128文字） */
export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return base64url(bytes)
}

/** code_verifier → code_challenge（S256） */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

function base64url(bytes: Uint8Array): string {
  let str = btoa(String.fromCharCode(...bytes))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 認可URLを組み立てる */
export function buildAuthorizeUrl(event: H3Event, challenge: string, state: string): string | null {
  const cfg = getConfig(event)
  if (!cfg) return null
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    scope: SCOPES.join(' '),
    redirect_uri: cfg.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  user_id: string
}

/** 認可コード → トークン交換 */
export async function exchangeCode(event: H3Event, code: string, verifier: string): Promise<TokenResponse> {
  const cfg = getConfig(event)
  if (!cfg) throw new Error('Fitbit未設定')
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`)
  return await $fetch<TokenResponse>(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirectUri,
      code,
      code_verifier: verifier,
    }).toString(),
  })
}

/** リフレッシュトークンで更新 */
async function refreshToken(event: H3Event, refresh: string): Promise<TokenResponse> {
  const cfg = getConfig(event)
  if (!cfg) throw new Error('Fitbit未設定')
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`)
  return await $fetch<TokenResponse>(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }).toString(),
  })
}

// ─────────────────────────────── 連携レコード（D1） ─────────────────────────────

export async function saveConnection(event: H3Event, userId: string, tok: TokenResponse): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  const expiresAt = Math.floor(Date.now() / 1000) + tok.expires_in
  const encAccess = await encryptComment(event, tok.access_token)
  const encRefresh = await encryptComment(event, tok.refresh_token)
  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO fitbit_connections (user_id, fitbit_user_id, access_token, refresh_token, expires_at, scopes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         fitbit_user_id=excluded.fitbit_user_id, access_token=excluded.access_token,
         refresh_token=excluded.refresh_token, expires_at=excluded.expires_at,
         scopes=excluded.scopes, updated_at=excluded.updated_at`
    )
    .bind(userId, tok.user_id, encAccess, encRefresh, expiresAt, tok.scope, now, now)
    .run()
}

export async function deleteConnection(event: H3Event, userId: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM fitbit_connections WHERE user_id = ?').bind(userId).run()
}

interface ConnRow {
  fitbit_user_id: string
  access_token: string
  refresh_token: string
  expires_at: number
  scopes: string
}

async function getConnection(event: H3Event, userId: string): Promise<ConnRow | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db
    .prepare('SELECT fitbit_user_id, access_token, refresh_token, expires_at, scopes FROM fitbit_connections WHERE user_id = ?')
    .bind(userId)
    .first()
  return (row as ConnRow) ?? null
}

/** 有効なアクセストークンを返す（失効間近なら自動更新） */
async function getValidToken(event: H3Event, userId: string): Promise<string | null> {
  const conn = await getConnection(event, userId)
  if (!conn) return null
  const now = Math.floor(Date.now() / 1000)
  if (conn.expires_at - 60 > now) {
    return await decryptComment(event, conn.access_token)
  }
  // 更新
  const refresh = await decryptComment(event, conn.refresh_token)
  const tok = await refreshToken(event, refresh)
  await saveConnection(event, userId, tok)
  return tok.access_token
}

/** ログインユーザーIDを解決（dev はバイパス。me.get.ts と同じ方針）。 */
export async function resolveUserId(event: H3Event): Promise<string | null> {
  if (import.meta.dev) return 'dev-user'
  const user = await getSessionUser(event)
  return user?.id ?? null
}

export async function getStatus(event: H3Event, userId: string): Promise<FitbitStatus> {
  if (import.meta.dev) return { connected: true, dev: true, scopes: SCOPES.join(' ') }
  const conn = await getConnection(event, userId)
  if (!conn) return { connected: false }
  return { connected: true, fitbitUserId: conn.fitbit_user_id, scopes: conn.scopes }
}

// ─────────────────────────────── Fitbit API 取得 → RawDay ──────────────────────

async function fbGet<T>(token: string, path: string): Promise<T | null> {
  try {
    return await $fetch<T>(`${FITBIT_API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'ja_JP' },
    })
  } catch {
    // 該当日にデータが無い場合など。呼び出し側で null を許容する。
    return null
  }
}

const STAGE_MAP: Record<string, 'deep' | 'light' | 'rem' | 'wake'> = {
  deep: 'deep',
  light: 'light',
  rem: 'rem',
  wake: 'wake',
  awake: 'wake',
  asleep: 'light',
  restless: 'wake',
}

function parseSleep(s: any): RawDay['sleep'] {
  if (!s) {
    return { totalMinutes: 0, deepMin: 0, remMin: 0, lightMin: 0, wakeMin: 0, efficiency: 0, awakeCount: 0, bedtime: '--:--', waketime: '--:--', timeline: [] }
  }
  const startMs = new Date(s.startTime).getTime()
  const timeline: RawDay['sleep']['timeline'] = []
  for (const seg of s.levels?.data ?? []) {
    const stage = STAGE_MAP[seg.level] ?? 'light'
    const start = Math.round((new Date(seg.dateTime).getTime() - startMs) / 60000)
    timeline.push({ stage, start, duration: Math.round(seg.seconds / 60) })
  }
  const sm = s.levels?.summary ?? {}
  const min = (k: string) => sm[k]?.minutes ?? 0
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return {
    totalMinutes: Math.round((s.minutesAsleep ?? 0) + (s.minutesAwake ?? 0)),
    deepMin: min('deep'),
    remMin: min('rem'),
    lightMin: min('light'),
    wakeMin: min('wake') || (s.minutesAwake ?? 0),
    efficiency: s.efficiency ?? 0,
    awakeCount: sm.wake?.count ?? 0,
    bedtime: fmt(s.startTime),
    waketime: fmt(s.endTime),
    timeline,
  }
}

// ─────────────────────────────── 範囲取得（レート制限対策の要） ──────────────────
// Fitbit の各メトリクスは /date/{start}/{end}.json の範囲版が使える。
// 90日でも約8リクエストで済むため、150req/時/ユーザーの制限内に確実に収まる。

function emptyRawDay(date: string): RawDay {
  return {
    date, steps: 0, distanceKm: 0, restingHeartRate: 0, heartRateSeries: [], hrv: 0,
    spo2: { avg: 0, min: 0, max: 0, series: [] }, breathingRate: 0, breathingRateSeries: [], skinTempDelta: 0,
    sleep: parseSleep(null),
  }
}

/** start〜end（両端含む）の各日 RawDay を範囲エンドポイント一括取得で組み立てる。 */
async function fetchRangeFromApi(token: string, start: string, end: string): Promise<Map<string, RawDay>> {
  const [steps, dist, heart, hrv, spo2, br, temp, sleep] = await Promise.all([
    fbGet<any>(token, `/1/user/-/activities/steps/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/activities/distance/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/activities/heart/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/hrv/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/spo2/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/br/date/${start}/${end}.json`),
    fbGet<any>(token, `/1/user/-/temp/skin/date/${start}/${end}.json`),
    fbGet<any>(token, `/1.2/user/-/sleep/date/${start}/${end}.json`),
  ])

  const map = new Map<string, RawDay>()
  const ensure = (d: string) => {
    let r = map.get(d)
    if (!r) { r = emptyRawDay(d); map.set(d, r) }
    return r
  }

  for (const e of steps?.['activities-steps'] ?? []) ensure(e.dateTime).steps = Number(e.value) || 0
  for (const e of dist?.['activities-distance'] ?? []) ensure(e.dateTime).distanceKm = Number(e.value) || 0
  for (const e of heart?.['activities-heart'] ?? []) ensure(e.dateTime).restingHeartRate = e.value?.restingHeartRate ?? 0
  for (const e of hrv?.hrv ?? []) ensure(e.dateTime).hrv = e.value?.dailyRmssd ?? 0
  for (const e of spo2 ?? []) {
    const r = ensure(e.dateTime)
    r.spo2 = { avg: e.value?.avg ?? 0, min: e.value?.min ?? 0, max: e.value?.max ?? 0, series: [] }
  }
  for (const e of br?.br ?? []) ensure(e.dateTime).breathingRate = e.value?.breathingRate ?? 0
  for (const e of temp?.tempSkin ?? []) ensure(e.dateTime).skinTempDelta = e.value?.nightlyRelative ?? 0
  // 睡眠は1日に複数ログがありうる。isMainSleep 優先で採用。
  const sleepByDate = new Map<string, any>()
  for (const s of sleep?.sleep ?? []) {
    const d = s.dateOfSleep
    if (!sleepByDate.has(d) || s.isMainSleep) sleepByDate.set(d, s)
  }
  for (const [d, s] of sleepByDate) ensure(d).sleep = parseSleep(s)

  return map
}

/** 日付範囲の配列（古い順） */
function dateRange(endDate: string, days: number): string[] {
  const end = new Date(`${endDate}T00:00:00Z`)
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10))
  return out
}

// ─────────────────────────────── D1 キャッシュ（fitbit_daily） ──────────────────

async function readCache(event: H3Event, userId: string, start: string, end: string): Promise<Map<string, RawDay>> {
  const db = getAppDb(event)
  const map = new Map<string, RawDay>()
  if (!db) return map
  const res = await db
    .prepare('SELECT date, payload FROM fitbit_daily WHERE user_id = ? AND date BETWEEN ? AND ?')
    .bind(userId, start, end)
    .all()
  for (const row of res?.results ?? []) {
    try { map.set(row.date, JSON.parse(row.payload)) } catch { /* skip */ }
  }
  return map
}

async function writeCache(event: H3Event, userId: string, day: RawDay): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db
    .prepare(`INSERT INTO fitbit_daily (user_id, date, payload, fetched_at) VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id, date) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at`)
    .bind(userId, day.date, JSON.stringify(day), Math.floor(Date.now() / 1000))
    .run()
}

/**
 * 指定期間の RawDay 履歴（古い順）。D1 キャッシュを優先し、未取得の日だけ範囲APIで補完して保存する。
 * 過去日は不変なので一度取得すれば以後叩かない。当日は常に再取得する。
 */
async function getCachedHistory(event: H3Event, userId: string, endDate: string, days: number): Promise<RawDay[]> {
  if (import.meta.dev) return devHistory(endDate, days)

  const dates = dateRange(endDate, days)
  const start = dates[0]
  const end = dates[dates.length - 1]
  const today = todayJST()

  const cache = await readCache(event, userId, start, end)
  // 未キャッシュの日 + 当日（更新中のため常に再取得）
  const missing = dates.filter(d => !cache.has(d) || d === today)

  if (missing.length) {
    const token = await getValidToken(event, userId)
    if (token) {
      // 欠損の最小〜最大を1回の範囲取得でまとめて埋める
      const fetched = await fetchRangeFromApi(token, missing[0], missing[missing.length - 1])
      for (const d of missing) {
        const day = fetched.get(d) ?? emptyRawDay(d)
        cache.set(d, day)
        // 当日は変動するが、他デバイス表示のため保存はしておく（次回当日再取得で上書き）
        await writeCache(event, userId, day)
      }
    }
  }

  return dates.map(d => cache.get(d) ?? emptyRawDay(d))
}

/** 1日分の RawDay を取得（dev はスタブ、本番はキャッシュ経由）。 */
export async function getRawDay(event: H3Event, userId: string, date: string): Promise<RawDay | null> {
  const rows = await getCachedHistory(event, userId, date, 1)
  return rows[0] ?? null
}

/** 指定日を末尾に n 日分の RawDay（古い順）。ベースライン算出・トレンドに使う。 */
export async function getRawHistory(event: H3Event, userId: string, endDate: string, days: number): Promise<RawDay[]> {
  return await getCachedHistory(event, userId, endDate, days)
}

/** Cron 同期用: 全連携ユーザーの直近 days 日をキャッシュに取り込む。 */
export async function syncAllUsers(event: H3Event, days = 3): Promise<number> {
  const db = getAppDb(event)
  if (!db) return 0
  const res = await db.prepare('SELECT user_id FROM fitbit_connections').all()
  const today = todayJST()
  let count = 0
  for (const row of res?.results ?? []) {
    try {
      await getCachedHistory(event, row.user_id, today, days)
      count++
    } catch { /* 個別ユーザーの失敗は握りつぶして続行 */ }
  }
  return count
}

// ─────────────────────────────── 組み立て（RawDay → 画面用） ────────────────────

/** ダッシュボードで扱う全メトリクスのキー */
export const TREND_METRICS = [
  'energyScore', 'sleepScore', 'steps', 'distanceKm', 'restingHeartRate', 'hrv', 'spo2', 'breathingRate', 'sleepHours', 'skinTempDelta',
] as const

/** 指定メトリクスの当日値を取り出す（score はスコア系列から） */
function pickMetric(d: RawDay, sc: { energy: number | null; sleep: number | null }, metric: string): number | null {
  switch (metric) {
    case 'energyScore': return sc.energy
    case 'sleepScore': return sc.sleep
    case 'steps': return d.steps
    case 'distanceKm': return d.distanceKm
    case 'restingHeartRate': return d.restingHeartRate
    case 'hrv': return d.hrv
    case 'spo2': return d.spo2.avg
    case 'breathingRate': return d.breathingRate
    case 'sleepHours': return Math.round((d.sleep.totalMinutes / 60) * 10) / 10
    case 'skinTempDelta': return d.skinTempDelta
    default: return null
  }
}

/** 全メトリクスの直近 take 日トレンドをまとめて組み立てる。 */
export function assembleTrends(history: RawDay[], take: number): Record<string, TrendData['days']> {
  const series = computeScoreSeries(history)
  const out: Record<string, TrendData['days']> = {}
  for (const m of TREND_METRICS) {
    out[m] = history.map((d, i) => ({ date: d.date, value: pickMetric(d, series[i], m) })).slice(-take)
  }
  return out
}

/** ダッシュボードデータを組み立てる。history は当日を末尾に含む古い順（ベースライン＋7日トレンド分）。 */
export function assembleDashboard(history: RawDay[]): DashboardData {
  const today = history[history.length - 1]
  const past = history.slice(0, -1)
  const yesterday = past.length ? past[past.length - 1] : null
  const baseline = computeBaseline(past.slice(-7))

  const sleepScore = computeSleepScore(today, baseline)
  const energyScore = computeEnergyScore(today, sleepScore, baseline, yesterday)

  return {
    date: today.date,
    energyScore,
    sleepScore,
    steps: { value: today.steps, goal: 8000 },
    distanceKm: today.distanceKm,
    restingHeartRate: today.restingHeartRate,
    heartRateSeries: today.heartRateSeries,
    hrv: today.hrv,
    spo2: { avg: today.spo2.avg, min: today.spo2.min, max: today.spo2.max },
    breathingRate: today.breathingRate,
    skinTempDelta: today.skinTempDelta,
    sleep: {
      totalMinutes: today.sleep.totalMinutes,
      bedtime: today.sleep.bedtime,
      waketime: today.sleep.waketime,
    },
    trends: assembleTrends(history, 7),
  }
}

/** 睡眠詳細を組み立てる。history は当日を末尾に含む古い順（スコア算出用）。 */
export function assembleSleepDetail(history: RawDay[]): SleepDetail {
  const today = history[history.length - 1]
  const baseline = computeBaseline(history.slice(0, -1).slice(-7))
  const score = computeSleepScore(today, baseline)
  const s = today.sleep
  const pct = (m: number) => (s.totalMinutes > 0 ? Math.round((m / s.totalMinutes) * 100) : 0)
  return {
    date: today.date,
    score,
    totalMinutes: s.totalMinutes,
    bedtime: s.bedtime,
    waketime: s.waketime,
    efficiency: s.efficiency,
    awakeCount: s.awakeCount,
    stages: {
      deep: { minutes: s.deepMin, pct: pct(s.deepMin) },
      rem: { minutes: s.remMin, pct: pct(s.remMin) },
      light: { minutes: s.lightMin, pct: pct(s.lightMin) },
      wake: { minutes: s.wakeMin, pct: pct(s.wakeMin) },
    },
    timeline: s.timeline,
  }
}

/** 単一メトリクスの n 日トレンド（history は take + ベースライン7日分を含む）。 */
export function assembleTrend(history: RawDay[], metric: string, take: number): TrendData {
  const series = computeScoreSeries(history)
  const days = history.map((d, i) => ({ date: d.date, value: pickMetric(d, series[i], metric) })).slice(-take)
  return { metric, days }
}
