// Fitbit Web API 呼び出し・OAuth2 トークン管理・ダッシュボード組み立ての共通処理。
// OpenAI を openai.ts に集約するのと同じ思想で、Fitbit 連携ロジックはここに集約する。
//
// 連携状態・トークンは WHISPER_DB に相乗り（fitbit_connections テーブル）。
// トークンは encrypt.ts の AES-GCM で暗号化して保存する。
//
// ローカル dev（import.meta.dev）では実 API・D1 が使えないため fitbit-dev.ts の
// 決定的スタブにフォールバックする。

import type { H3Event } from 'h3'
import type { DashboardData, SleepDetail, RawDay, FitbitStatus, TrendData, TimePoint, ActivitySession } from '~/types/fitbit'
import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { devRawDay, devHistory } from '~/server/utils/fitbit-dev'
import { computeBaseline, computeSleepScore, computeEnergyScore, computeScoreSeries } from '~/server/utils/fitbit-score'
import { applyManualCalories, listManualActivities } from '~/server/utils/fitbit-manual'
import { todayJST } from '~/utils/jst'

// Google Health API（旧 Fitbit Web API の後継。2026年9月に旧APIは停止）
// サーバー間REST。認可は Google OAuth 2.0。
const GH_API = 'https://health.googleapis.com/v4'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
]

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
    // Google: リフレッシュトークンを確実に得るため offline + consent を指定
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  // Google のトークンレスポンスにはユーザーIDが無い（Health API は users/me でアクセス）
  user_id?: string
}

/** 認可コード → トークン交換（Google OAuth） */
export async function exchangeCode(event: H3Event, code: string, verifier: string): Promise<TokenResponse> {
  const cfg = getConfig(event)
  if (!cfg) throw new Error('Google OAuth未設定')
  return await $fetch<TokenResponse>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: cfg.redirectUri,
      code,
      code_verifier: verifier,
    }).toString(),
  })
}

/** リフレッシュトークンで更新（Google OAuth） */
async function refreshToken(event: H3Event, refresh: string): Promise<TokenResponse> {
  const cfg = getConfig(event)
  if (!cfg) throw new Error('Google OAuth未設定')
  const tok = await $fetch<TokenResponse>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }).toString(),
  })
  // Google はリフレッシュ時に refresh_token を返さないことがあるため既存を引き継ぐ
  if (!tok.refresh_token) tok.refresh_token = refresh
  return tok
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
    .bind(userId, tok.user_id ?? 'me', encAccess, encRefresh, expiresAt, tok.scope, now, now)
    .run()
}

// ─────────────────── OAuth state 保管（Cookie非依存でユーザーを特定） ────────────

/** connect時: state → (userId, PKCE verifier) を保存 */
export async function saveOAuthState(event: H3Event, state: string, userId: string, verifier: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db
    .prepare('INSERT OR REPLACE INTO fitbit_oauth_states (state, user_id, verifier, created_at) VALUES (?, ?, ?, ?)')
    .bind(state, userId, verifier, Math.floor(Date.now() / 1000))
    .run()
}

/** callback時: state から (userId, verifier) を取り出す（削除は成功後に deleteOAuthState で行う） */
export async function lookupOAuthState(event: H3Event, state: string): Promise<{ userId: string; verifier: string } | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db
    .prepare('SELECT user_id, verifier FROM fitbit_oauth_states WHERE state = ?')
    .bind(state)
    .first()
  if (!row) return null
  return { userId: (row as any).user_id, verifier: (row as any).verifier }
}

export async function deleteOAuthState(event: H3Event, state: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM fitbit_oauth_states WHERE state = ?').bind(state).run()
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

// ─────────────────────────────── Google Health API 取得 → RawDay ────────────────
// dataPoints.list（GET ${GH_API}/users/me/dataTypes/{型}/dataPoints）を新しい順に
// ページングして期間分を取得し、日次に集計して RawDay を組み立てる。
// 実レスポンス（Playground採取）に基づく実装。距離のフィールド/単位のみ未確定で防御的。
// dev はスタブで動くため未接続でも画面確認は可能。

async function fbGet<T>(token: string, path: string): Promise<T | null> {
  try {
    return await $fetch<T>(`${GH_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // 該当日にデータが無い場合など。呼び出し側で null を許容する。
    return null
  }
}

// Google Health API の睡眠ステージ種別 → 内部種別
const STAGE_MAP: Record<string, 'deep' | 'light' | 'rem' | 'wake'> = {
  DEEP: 'deep', LIGHT: 'light', REM: 'rem', AWAKE: 'wake', WAKE: 'wake', RESTLESS: 'wake', ASLEEP: 'light', UNKNOWN: 'light',
}

// "32400s"（+9h）→ 秒数
const offsetSec = (s?: string): number => (s ? parseInt(s, 10) || 0 : 0)
// civil date {year,month,day} → "YYYY-MM-DD"
const ymd = (d: any): string => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
// UTC ISO + オフセット秒 → 現地の "YYYY-MM-DD"
const civilDateFromUtc = (iso: string, off: number): string =>
  new Date(new Date(iso).getTime() + off * 1000).toISOString().slice(0, 10)
// UTC ISO + オフセット秒 → 現地の "HH:MM"
function clock(iso: string, off: number): string {
  const t = new Date(new Date(iso).getTime() + off * 1000)
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

/** Google Health API の sleep データ点（dataPoint.sleep）→ RawDay['sleep'] */
function parseSleep(s: any): RawDay['sleep'] {
  const empty = { totalMinutes: 0, deepMin: 0, remMin: 0, lightMin: 0, wakeMin: 0, efficiency: 0, awakeCount: 0, bedtime: '--:--', waketime: '--:--', timeline: [] as RawDay['sleep']['timeline'] }
  if (!s || !s.interval) return empty
  const iv = s.interval
  const off = offsetSec(iv.startUtcOffset)
  const startMs = new Date(iv.startTime).getTime()

  const timeline: RawDay['sleep']['timeline'] = []
  for (const seg of s.stages ?? []) {
    const stage = STAGE_MAP[seg.type] ?? 'light'
    const segStart = new Date(seg.startTime).getTime()
    const duration = Math.round((new Date(seg.endTime).getTime() - segStart) / 60000)
    if (duration <= 0) continue
    timeline.push({ stage, start: Math.round((segStart - startMs) / 60000), duration })
  }

  const min: Record<string, number> = {}
  const cnt: Record<string, number> = {}
  for (const st of s.summary?.stagesSummary ?? []) {
    min[st.type] = Number(st.minutes) || 0
    cnt[st.type] = Number(st.count) || 0
  }
  const sm = s.summary ?? {}
  const asleep = Number(sm.minutesAsleep) || 0
  const totalMinutes = Number(sm.minutesInSleepPeriod) || asleep + (Number(sm.minutesAwake) || 0)

  return {
    totalMinutes,
    deepMin: min.DEEP || 0,
    remMin: min.REM || 0,
    lightMin: min.LIGHT || 0,
    wakeMin: min.AWAKE || 0,
    efficiency: totalMinutes > 0 ? Math.round((asleep / totalMinutes) * 100) : 0,
    awakeCount: cnt.AWAKE || 0,
    bedtime: clock(iv.startTime, off),
    waketime: clock(iv.endTime, offsetSec(iv.endUtcOffset || iv.startUtcOffset)),
    timeline,
  }
}

// Google Health API の Exercise.ExerciseType（主要種目のみ日本語ラベル化。未知の種目は
// displayName にフォールバックするため網羅する必要はない）
const EXERCISE_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  WALKING: { label: 'ウォーキング', icon: '🚶' },
  NORDIC_WALKING: { label: 'ノルディックウォーキング', icon: '🚶' },
  POWER_WALKING: { label: 'パワーウォーキング', icon: '🚶' },
  RUNNING: { label: 'ランニング', icon: '🏃' },
  TREADMILL_RUNNING: { label: 'ランニング（マシン）', icon: '🏃' },
  TRAIL_RUNNING: { label: 'トレイルランニング', icon: '🏃' },
  BIKING: { label: 'サイクリング', icon: '🚴' },
  ELECTRIC_BIKE: { label: 'サイクリング（電動）', icon: '🚴' },
  MOUNTAIN_BIKING: { label: 'マウンテンバイク', icon: '🚵' },
  SPINNING: { label: 'スピンバイク', icon: '🚴' },
  HIKING: { label: 'ハイキング', icon: '🥾' },
  BACKPACKING: { label: 'バックパッキング', icon: '🥾' },
  SWIMMING: { label: '水泳', icon: '🏊' },
  SWIMMING_POOL: { label: '水泳（プール）', icon: '🏊' },
  SWIMMING_OPEN_WATER: { label: '水泳（オープンウォーター）', icon: '🏊' },
  ELLIPTICAL: { label: 'エリプティカル', icon: '🏃' },
  ROWING: { label: 'ローイング', icon: '🚣' },
  STAIR_CLIMBING: { label: '階段昇降', icon: '🪜' },
  YOGA: { label: 'ヨガ', icon: '🧘' },
  YOGA_HATHA: { label: 'ヨガ', icon: '🧘' },
  YOGA_POWER: { label: 'ヨガ', icon: '🧘' },
  YOGA_VINYASA: { label: 'ヨガ', icon: '🧘' },
  YOGA_BIKRAM: { label: 'ヨガ', icon: '🧘' },
  PILATES: { label: 'ピラティス', icon: '🧘' },
  WEIGHTLIFTING: { label: '筋力トレーニング', icon: '🏋️' },
  WEIGHTS: { label: '筋力トレーニング', icon: '🏋️' },
  FREE_WEIGHTS: { label: '筋力トレーニング', icon: '🏋️' },
  WEIGHT_MACHINES: { label: '筋力トレーニング（マシン）', icon: '🏋️' },
  BODY_WEIGHT: { label: '自重トレーニング', icon: '🏋️' },
  CIRCUIT_TRAINING: { label: 'サーキットトレーニング', icon: '🏋️' },
  CROSSFIT: { label: 'クロスフィット', icon: '🏋️' },
  HIIT: { label: 'HIIT', icon: '🔥' },
  CORE_TRAINING: { label: '体幹トレーニング', icon: '🏋️' },
  FUNCTIONAL_STRENGTH_TRAINING: { label: '筋力トレーニング', icon: '🏋️' },
  DANCING: { label: 'ダンス', icon: '💃' },
  AEROBIC_WORKOUT: { label: '有酸素運動', icon: '🏃' },
  CARDIO_WORKOUT: { label: '有酸素運動', icon: '🏃' },
  EXERCISE_CLASS: { label: 'フィットネスクラス', icon: '🏋️' },
  GOLF: { label: 'ゴルフ', icon: '⛳' },
  TENNIS: { label: 'テニス', icon: '🎾' },
  BASKETBALL: { label: 'バスケットボール', icon: '🏀' },
  SOCCER: { label: 'サッカー', icon: '⚽' },
  BASEBALL: { label: '野球', icon: '⚾' },
  BOXING: { label: 'ボクシング', icon: '🥊' },
  CLIMBING: { label: 'クライミング', icon: '🧗' },
  SKIING: { label: 'スキー', icon: '⛷️' },
  CROSS_COUNTRY_SKI: { label: 'クロスカントリースキー', icon: '⛷️' },
  SNOWBOARDING: { label: 'スノーボード', icon: '🏂' },
  SURFING: { label: 'サーフィン', icon: '🏄' },
  GYMNASTICS: { label: '体操', icon: '🤸' },
}

/** exerciseType → 表示ラベル・アイコン（未知の種目は displayName にフォールバック） */
function exerciseLabel(exerciseType: string, displayName: string): { label: string; icon: string } {
  const known = EXERCISE_TYPE_MAP[exerciseType]
  if (known) return known
  return { label: displayName || '運動', icon: '🏃' }
}

/** Google Health API の exercise データ点（dataPoint.exercise）→ ActivitySession */
function parseExercise(ex: any): ActivitySession | null {
  if (!ex?.interval) return null
  const iv = ex.interval
  const off = offsetSec(iv.startUtcOffset)
  const durationMin = Math.max(0, Math.round((new Date(iv.endTime).getTime() - new Date(iv.startTime).getTime()) / 60000))
  const { label, icon } = exerciseLabel(ex.exerciseType, ex.displayName)
  const distanceMm = Number(ex.metricsSummary?.distanceMillimeters)
  return {
    type: ex.exerciseType ?? 'UNKNOWN',
    label,
    icon,
    start: clock(iv.startTime, off),
    end: clock(iv.endTime, offsetSec(iv.endUtcOffset || iv.startUtcOffset)),
    durationMin,
    caloriesKcal: Math.round(Number(ex.metricsSummary?.caloriesKcal) || 0),
    distanceKm: Number.isFinite(distanceMm) ? Math.round((distanceMm / 1_000_000) * 100) / 100 : null,
  }
}

function emptyRawDay(date: string): RawDay {
  return {
    date, steps: 0, stepsSeries: [], distanceKm: 0, distanceSeries: [], caloriesKcal: 0, caloriesSeries: [],
    restingHeartRate: 0, heartRateSeries: [], hrv: 0,
    spo2: { avg: 0, min: 0, max: 0, series: [] }, breathingRate: 0, breathingRateSeries: [], skinTempDelta: 0,
    activities: [],
    sleep: parseSleep(null),
  }
}

// UTC ISO → JST の「その日の分オフセット」（0〜1439）。時間別内訳の集計に使う。
function minuteOfDayJst(iso: string): number {
  const t = new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
  return t.getUTCHours() * 60 + t.getUTCMinutes()
}

// ─────────────────────── Google Health API から期間取得（list＋ページング） ────────
// 各 dataType を dataPoints.list で新しい順に取得し、対象開始日を下回るまで遡る。
// 日次型（resting-hr/respiratory）は1点=1日、sample型（hrv/spo2）は日次集計、
// 睡眠は覚醒日（interval.endTime の現地日）に割り当てる。

/** データ点の現地日（"YYYY-MM-DD"）を dataType 別に取り出す */
function pointDate(pt: any, dataType: string): string | null {
  try {
    switch (dataType) {
      case 'steps': return ymd(pt.steps.interval.civilStartTime.date)
      case 'distance': return ymd(pt.distance.interval.civilStartTime.date)
      case 'daily-resting-heart-rate': return ymd(pt.dailyRestingHeartRate.date)
      case 'daily-respiratory-rate': return ymd(pt.dailyRespiratoryRate.date)
      case 'heart-rate-variability': return ymd(pt.heartRateVariability.sampleTime.civilTime.date)
      case 'oxygen-saturation': return ymd(pt.oxygenSaturation.sampleTime.civilTime.date)
      // 皮膚温は daily-sleep-temperature-derivations、心拍数(heart-rate)は値が beatsPerMinute（diagで確認済）。
      // カロリー(total-calories)は list 非対応のため dailyRollUp で別取得（pointDate は経由しない）。
      case 'daily-sleep-temperature-derivations': return ymd(pt.dailySleepTemperatureDerivations.date)
      case 'heart-rate': return ymd(pt.heartRate.sampleTime.civilTime.date)
      case 'sleep': return civilDateFromUtc(pt.sleep.interval.endTime, offsetSec(pt.sleep.interval.endUtcOffset || pt.sleep.interval.startUtcOffset))
      // exercise の interval には steps/distance/sleep と違い civilStartTime が無い（診断口で実データ確認済）。
      // startTime + startUtcOffset から現地日付を算出する。
      case 'exercise': return civilDateFromUtc(pt.exercise.interval.startTime, offsetSec(pt.exercise.interval.startUtcOffset))
      default: return null
    }
  } catch {
    return null
  }
}

// steps/distance は dataPoints.list だと複数データソースの生ポイントが重複除去されずに
// 合算され、実測で約1.5〜2倍に水増しされることを診断で確認済み（診断エンドポイントの
// steps/steps-reconcile 比較）。dataPoints:reconcile はソース横断で統合済みの単一ストリームを
// 返し、レスポンス形状は list と同一（dataSource フィールドが無い点のみ異なる）なので
// そのまま同じパース処理が使える。
const RECONCILE_TYPES = new Set(['steps', 'distance'])

// [diag] CPU超過の原因切り分け用の一時ログ。原因確定後に削除する。
export const diag = (msg: string, obj?: unknown) => console.log(`[diag] ${msg}`, obj === undefined ? '' : JSON.stringify(obj))

/** dataPoints.list（または reconcile）を新しい順にページングし、startDate を下回るまで集める */
async function listPoints(token: string, dataType: string, startDate: string): Promise<any[]> {
  const size = dataType === 'sleep' ? 25 : 10000
  const maxPages = dataType === 'sleep' ? 8 : 15
  const suffix = RECONCILE_TYPES.has(dataType) ? ':reconcile' : ''
  const points: any[] = []
  let pageToken: string | undefined
  for (let p = 0; p < maxPages; p++) {
    const q = `?pageSize=${size}` + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
    const res: any = await fbGet(token, `/users/me/dataTypes/${dataType}/dataPoints${suffix}${q}`)
    const dp: any[] = res?.dataPoints ?? []
    diag(`listPoints page`, { dataType, page: p, got: dp.length, total: points.length + dp.length, hasNext: !!res?.nextPageToken })
    if (!dp.length) break
    points.push(...dp)
    const oldest = pointDate(dp[dp.length - 1], dataType)
    if (oldest && oldest < startDate) break // 対象範囲より過去まで到達
    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }
  diag(`listPoints done`, { dataType, points: points.length })
  return points
}

/** "YYYY-MM-DD" → CivilDateTime（date のみ＝深夜0時）。dailyRollUp の range 指定に使う。 */
function civilDate(ymdStr: string): { date: { year: number; month: number; day: number } } {
  const [y, m, d] = ymdStr.split('-').map(Number)
  return { date: { year: y, month: m, day: d } }
}

/**
 * total-calories は list 非対応で dailyRollUp（POST）専用のため、日次合計を別途取得する。
 * レスポンスは rollupDataPoints[].totalCalories.kcalSum（ActiveEnergyBurnedRollupValue.kcal_sum と同命名規則）。
 * 失敗時は空 Map（カロリーは0のまま）を返す。
 */
async function fetchCaloriesRollup(token: string, start: string, end: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  // end は排他の可能性があるため翌日を指定し、対象日を確実に含める
  const endPlus = new Date(new Date(`${end}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
  try {
    const res: any = await $fetch(`${GH_API}/users/me/dataTypes/total-calories/dataPoints:dailyRollUp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: { range: { start: civilDate(start), end: civilDate(endPlus) }, windowSizeDays: 1 },
    })
    for (const pt of res?.rollupDataPoints ?? []) {
      const d = pt?.civilStartTime?.date
      const kcal = Number(pt?.totalCalories?.kcalSum)
      if (d && Number.isFinite(kcal)) out[ymd(d)] = kcal
    }
  } catch { /* rollup 未対応・未取得時は空 */ }
  return out
}

/** start〜end（両端含む）の各日 RawDay を list ページングで組み立てる */
async function fetchRangeFromApi(token: string, start: string, end: string): Promise<Map<string, RawDay>> {
  diag('fetchRangeFromApi start', { start, end })
  const [steps, distance, restHr, resp, hrv, spo2, sleep, caloriesByDate, skinTemp, heartRate, exercise] = await Promise.all([
    listPoints(token, 'steps', start),
    listPoints(token, 'distance', start),
    listPoints(token, 'daily-resting-heart-rate', start),
    listPoints(token, 'daily-respiratory-rate', start),
    listPoints(token, 'heart-rate-variability', start),
    listPoints(token, 'oxygen-saturation', start),
    listPoints(token, 'sleep', start),
    fetchCaloriesRollup(token, start, end),
    listPoints(token, 'daily-sleep-temperature-derivations', start),
    listPoints(token, 'heart-rate', start),
    listPoints(token, 'exercise', start),
  ])

  diag('fetchRangeFromApi fetched', {
    steps: steps.length, distance: distance.length, restHr: restHr.length, resp: resp.length,
    hrv: hrv.length, spo2: spo2.length, sleep: sleep.length, skinTemp: skinTemp.length,
    heartRate: heartRate.length, exercise: exercise.length,
    grandTotal: steps.length + distance.length + restHr.length + resp.length + hrv.length
      + spo2.length + sleep.length + skinTemp.length + heartRate.length + exercise.length,
  })

  const map = new Map<string, RawDay>()
  const ensure = (d: string) => {
    let r = map.get(d)
    if (!r) { r = emptyRawDay(d); map.set(d, r) }
    return r
  }
  const inRange = (d: string | null): d is string => !!d && d >= start && d <= end

  // 時間別内訳（1時間刻み）を加算するヘルパー
  const addHourly = (agg: Record<string, number[]>, d: string, minute: number, v: number) => {
    const arr = (agg[d] ??= new Array(24).fill(0))
    arr[Math.min(23, Math.max(0, Math.floor(minute / 60)))] += v
  }

  const stepsHourly: Record<string, number[]> = {}
  for (const pt of steps) {
    const d = pointDate(pt, 'steps')
    if (!inRange(d)) continue
    const v = Number(pt.steps?.count) || 0
    ensure(d).steps += v
    // interval.startTime はスキーマ未検証（sleep.interval と同型と推測）。無ければ時間別内訳のみスキップ。
    const startIso = pt.steps?.interval?.startTime
    if (startIso) addHourly(stepsHourly, d, minuteOfDayJst(startIso), v)
  }
  for (const [d, arr] of Object.entries(stepsHourly)) ensure(d).stepsSeries = arr.map((v, h) => ({ t: h * 60, v }))

  // 距離: 分単位の millimeters を日次合計して km に換算（mm ÷ 1,000,000）
  const distMm: Record<string, number> = {}
  const distHourlyMm: Record<string, number[]> = {}
  for (const pt of distance) {
    const d = pointDate(pt, 'distance')
    if (!inRange(d)) continue
    const mm = Number(pt.distance?.millimeters) || 0
    distMm[d] = (distMm[d] ?? 0) + mm
    const startIso = pt.distance?.interval?.startTime
    if (startIso) addHourly(distHourlyMm, d, minuteOfDayJst(startIso), mm)
  }
  for (const [d, mm] of Object.entries(distMm)) ensure(d).distanceKm = Math.round((mm / 1_000_000) * 100) / 100
  for (const [d, arr] of Object.entries(distHourlyMm)) {
    ensure(d).distanceSeries = arr.map((mmSum, h) => ({ t: h * 60, v: Math.round((mmSum / 1_000_000) * 100) / 100 }))
  }

  for (const pt of restHr) { const d = pointDate(pt, 'daily-resting-heart-rate'); if (inRange(d)) ensure(d).restingHeartRate = Number(pt.dailyRestingHeartRate?.beatsPerMinute) || 0 }
  for (const pt of resp) { const d = pointDate(pt, 'daily-respiratory-rate'); if (inRange(d)) ensure(d).breathingRate = Math.round((Number(pt.dailyRespiratoryRate?.breathsPerMinute) || 0) * 10) / 10 }

  // HRV: 夜間の rmssd サンプルを日次平均
  const hrvAgg: Record<string, number[]> = {}
  for (const pt of hrv) {
    const d = pointDate(pt, 'heart-rate-variability')
    const v = pt.heartRateVariability?.rootMeanSquareOfSuccessiveDifferencesMilliseconds
    if (inRange(d) && typeof v === 'number') (hrvAgg[d] ??= []).push(v)
  }
  for (const [d, arr] of Object.entries(hrvAgg)) ensure(d).hrv = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)

  // カロリー: total-calories（基礎代謝+活動の合計）を dailyRollUp で取得済の日次値から反映。
  // 時間別（total-calories は list 非対応で hourly ソースが無い）は、日次合計を
  // 「基礎代謝ぶん＝24hに均等」＋「活動ぶん＝歩数の時間別シェアで按分」した推計値で埋める。
  // 当日は現在時刻(JST)より先の時間帯を計上しない（未来の推計値を出さない）。
  const BMR_SHARE = 0.55
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000)
  const todayJst = nowJst.toISOString().slice(0, 10)
  const nowMinuteJst = nowJst.getUTCHours() * 60 + nowJst.getUTCMinutes()
  for (const [d, kcal] of Object.entries(caloriesByDate)) {
    if (!inRange(d)) continue
    const total = Math.round(kcal)
    ensure(d).caloriesKcal = total
    const steps24 = stepsHourly[d]
    const stepSum = steps24 ? steps24.reduce((a, b) => a + b, 0) : 0
    const basePerHour = (total * BMR_SHARE) / 24
    const activePool = total * (1 - BMR_SHARE)
    const series = Array.from({ length: 24 }, (_, h) => {
      const active = stepSum > 0 ? activePool * (steps24![h] / stepSum) : activePool / 24
      return { t: h * 60, v: Math.round(basePerHour + active) }
    })
    ensure(d).caloriesSeries = d === todayJst ? series.filter(p => p.t <= nowMinuteJst) : series
  }

  // 皮膚温: daily-sleep-temperature-derivations（睡眠中の皮膚温、1日1点）。
  // 「基準比の変化量」は直接フィールドが無いため nightly − baseline で算出（diagで構造確認済）。
  for (const pt of skinTemp) {
    const d = pointDate(pt, 'daily-sleep-temperature-derivations')
    const st = pt.dailySleepTemperatureDerivations
    const nightly = Number(st?.nightlyTemperatureCelsius)
    const baseline = Number(st?.baselineTemperatureCelsius)
    if (inRange(d) && Number.isFinite(nightly) && Number.isFinite(baseline)) {
      ensure(d).skinTempDelta = Math.round((nightly - baseline) * 10) / 10
    }
  }

  // 心拍数（5分刻み）: oxygen-saturation の sample 処理と同型（推測実装）
  const hrBuckets: Record<string, Record<number, number[]>> = {}
  for (const pt of heartRate) {
    const d = pointDate(pt, 'heart-rate')
    const v = Number(pt.heartRate?.beatsPerMinute)
    const iso = pt.heartRate?.sampleTime?.physicalTime
    if (!inRange(d) || !Number.isFinite(v) || !iso) continue
    const bucket = Math.floor(minuteOfDayJst(iso) / 5) * 5
    const byBucket = (hrBuckets[d] ??= {})
    ;(byBucket[bucket] ??= []).push(v)
  }
  for (const [d, buckets] of Object.entries(hrBuckets)) {
    const series: TimePoint[] = Object.entries(buckets)
      .map(([t, arr]) => ({ t: Number(t), v: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) }))
      .sort((a, b) => a.t - b.t)
    ensure(d).heartRateSeries = series
  }

  // 運動セッション: 開始日（civilStartTime）に割り当て、当日内は開始時刻順
  for (const pt of exercise) {
    const d = pointDate(pt, 'exercise')
    if (!inRange(d)) continue
    const session = parseExercise(pt.exercise)
    if (session) ensure(d).activities.push(session)
  }
  for (const r of map.values()) r.activities.sort((a, b) => a.start.localeCompare(b.start))

  // 睡眠: 覚醒日ごとに、最も睡眠時間の長いセッションを採用
  const sleepByDate = new Map<string, any>()
  for (const pt of sleep) {
    const d = pointDate(pt, 'sleep')
    if (!inRange(d) || !pt.sleep) continue
    const prev = sleepByDate.get(d)
    const cur = Number(pt.sleep.summary?.minutesInSleepPeriod) || 0
    if (!prev || cur > (Number(prev.summary?.minutesInSleepPeriod) || 0)) sleepByDate.set(d, pt.sleep)
  }
  for (const [d, s] of sleepByDate) ensure(d).sleep = parseSleep(s)

  // SpO2: Fitbit は睡眠中に計測するため、その夜の睡眠区間内のサンプルのみ日次集計。
  // 日中の低品質値（≒50）や外れ値を除くため下限を設ける。健常者の睡眠時SpO2は概ね
  // 95%前後で、持続的な90%未満は臨床的に異常。低品質値を除いて本家表示に寄せるため
  // 下限は90%とする（本家と乖離する場合はこの定数で調整）。
  const SPO2_MIN_PLAUSIBLE = 90
  const spo2Points = spo2
    .map(pt => ({ t: new Date(pt.oxygenSaturation?.sampleTime?.physicalTime ?? 0).getTime(), v: Number(pt.oxygenSaturation?.percentage) }))
    .filter(p => Number.isFinite(p.v) && p.v >= SPO2_MIN_PLAUSIBLE && p.v <= 100 && p.t > 0)
  for (const [d, s] of sleepByDate) {
    const start = new Date(s.interval.startTime).getTime()
    const end = new Date(s.interval.endTime).getTime()
    const vals = spo2Points.filter(p => p.t >= start && p.t <= end).map(p => p.v)
    if (vals.length) {
      ensure(d).spo2 = {
        avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
        min: Math.min(...vals),
        max: Math.max(...vals),
        series: [],
      }
    }
  }

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

/** 当日ぶんのキャッシュを再取得せず使い回す秒数。Google側の反映も数分遅れるため、この粒度で十分。 */
const TODAY_CACHE_TTL_SEC = 10 * 60

interface CacheEntry { day: RawDay; fetchedAt: number }

async function readCache(event: H3Event, userId: string, start: string, end: string): Promise<Map<string, CacheEntry>> {
  const db = getAppDb(event)
  const map = new Map<string, CacheEntry>()
  if (!db) return map
  const res = await db
    .prepare('SELECT date, payload, fetched_at FROM fitbit_daily WHERE user_id = ? AND date BETWEEN ? AND ?')
    .bind(userId, start, end)
    .all()
  for (const row of res?.results ?? []) {
    try { map.set(row.date, { day: JSON.parse(row.payload), fetchedAt: Number(row.fetched_at) || 0 }) } catch { /* skip */ }
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
 * 過去日は不変なので一度取得すれば以後叩かない。
 * 当日は変動するが、1回の取得が数万点のパースになり CPU を食うため TTL 内は使い回す。
 */
async function getCachedHistory(event: H3Event, userId: string, endDate: string, days: number, force = false): Promise<RawDay[]> {
  const dates = dateRange(endDate, days)
  const start = dates[0]
  const end = dates[dates.length - 1]

  let result: RawDay[]
  if (import.meta.dev) {
    // dev は API・キャッシュを使わずスタブ（手動記録の合成は下で共通処理）
    result = devHistory(endDate, days)
  } else {
    const today = todayJST()
    diag('getCachedHistory readCache start', { start, end, days })
    const cache = await readCache(event, userId, start, end)
    diag('getCachedHistory readCache done', { cached: cache.size })
    // 未キャッシュの日 + 当日（TTL切れのみ）+ カロリー欠損日 + アクティビティ欠損日
    // （calories は total-calories の dailyRollUp 追加より前、activities は exercise 取得追加より前に
    // キャッシュされた過去日だと該当フィールドが無い/0のまま保存されているため、自己修復的に再取得して埋める。
    // activities は「その日は運動が無かった」正当な空配列[]もあるため、undefined判定にする）
    const nowSec = Math.floor(Date.now() / 1000)
    const isStale = (e: CacheEntry, d: string) => d === today && nowSec - e.fetchedAt >= TODAY_CACHE_TTL_SEC
    const missing = dates.filter(d => {
      const e = cache.get(d)
      // force（更新ボタン）: 当日はTTLを無視して必ず取り直す
      if (force && d === today) return true
      return !e || isStale(e, d) || !e.day.caloriesKcal || e.day.activities === undefined
    })

    diag('getCachedHistory missing', { count: missing.length, days: missing })

    if (missing.length) {
      const token = await getValidToken(event, userId)
      diag('getCachedHistory token', { ok: !!token })
      if (token) {
        // 欠損の最小〜最大を1回の範囲取得でまとめて埋める
        const fetched = await fetchRangeFromApi(token, missing[0], missing[missing.length - 1])
        diag('getCachedHistory parsed', { days: fetched.size })
        for (const d of missing) {
          const day = fetched.get(d) ?? emptyRawDay(d)
          cache.set(d, { day, fetchedAt: nowSec })
          await writeCache(event, userId, day)
        }
        diag('getCachedHistory writeCache done')
      }
    }

    result = dates.map(d => cache.get(d)?.day ?? emptyRawDay(d))
  }

  // 手動追加の運動記録を各日の activities と消費カロリーに重ねる
  // （fitbit_daily には焼き込まず読み取り時に合成。記録を消せばGoogle由来の値に戻る）
  const manual = await listManualActivities(event, userId, start, end)
  if (manual.size) {
    for (const day of result) {
      const extra = manual.get(day.date)
      if (extra?.length) {
        day.activities = [...day.activities, ...extra].sort((a, b) => a.start.localeCompare(b.start))
        applyManualCalories(day, extra)
      }
    }
  }

  return result
}

/** 1日分の RawDay を取得（dev はスタブ、本番はキャッシュ経由）。 */
export async function getRawDay(event: H3Event, userId: string, date: string): Promise<RawDay | null> {
  const rows = await getCachedHistory(event, userId, date, 1)
  return rows[0] ?? null
}

/** 指定日を末尾に n 日分の RawDay（古い順）。ベースライン算出・トレンドに使う。force で当日キャッシュを無視。 */
export async function getRawHistory(event: H3Event, userId: string, endDate: string, days: number, force = false): Promise<RawDay[]> {
  return await getCachedHistory(event, userId, endDate, days, force)
}

/**
 * 診断用（dev限定）: Playground等で取得した生アクセストークンで実際に Google Health API を叩き、
 * パース結果（RawDay履歴＋組み立て済みダッシュボード）を返す。D1・OAuth不要でパース検証できる。
 */
export async function diagFetch(token: string, endDate: string, days: number): Promise<{ history: RawDay[]; dashboard: DashboardData }> {
  const dates = dateRange(endDate, days)
  const map = await fetchRangeFromApi(token, dates[0], dates[dates.length - 1])
  const history = dates.map(d => map.get(d) ?? emptyRawDay(d))
  return { history, dashboard: assembleDashboard(history) }
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

/**
 * ダッシュボードが一括で返すメトリクスのキー。
 * 睡眠ステージ別（sleepDeepHours 等）は睡眠シートのセレクトで都度 /api/fitbit/trend を叩くため、
 * ここには含めず pickMetric のみで扱う。
 */
export const TREND_METRICS = [
  'energyScore', 'sleepScore', 'steps', 'distanceKm', 'caloriesKcal', 'restingHeartRate', 'hrv', 'spo2', 'breathingRate', 'sleepHours', 'sleepAsleepHours', 'skinTempDelta',
] as const

/** 指定メトリクスの当日値を取り出す（score はスコア系列から） */
function pickMetric(d: RawDay, sc: { energy: number | null; sleep: number | null }, metric: string): number | null {
  switch (metric) {
    case 'energyScore': return sc.energy
    case 'sleepScore': return sc.sleep
    case 'steps': return d.steps
    case 'distanceKm': return d.distanceKm
    case 'caloriesKcal': return d.caloriesKcal ?? null
    case 'restingHeartRate': return d.restingHeartRate
    case 'hrv': return d.hrv
    case 'spo2': return d.spo2.avg
    case 'breathingRate': return d.breathingRate
    case 'sleepHours': return Math.round((d.sleep.totalMinutes / 60) * 10) / 10
    case 'sleepAsleepHours': return Math.round(((d.sleep.totalMinutes - d.sleep.wakeMin) / 60) * 10) / 10
    case 'sleepDeepHours': return Math.round((d.sleep.deepMin / 60) * 10) / 10
    case 'sleepLightHours': return Math.round((d.sleep.lightMin / 60) * 10) / 10
    case 'sleepRemHours': return Math.round((d.sleep.remMin / 60) * 10) / 10
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
  const baseline = computeBaseline(past.slice(-7))

  const sleepScore = computeSleepScore(today, baseline)
  const energyScore = computeEnergyScore(today, sleepScore, baseline, history.slice(-3))

  return {
    date: today.date,
    energyScore,
    sleepScore,
    steps: { value: today.steps, goal: 8000 },
    stepsSeries: today.stepsSeries ?? [],
    distanceKm: today.distanceKm,
    distanceSeries: today.distanceSeries ?? [],
    caloriesKcal: today.caloriesKcal ?? 0,
    caloriesSeries: today.caloriesSeries ?? [],
    restingHeartRate: today.restingHeartRate,
    heartRateSeries: today.heartRateSeries ?? [],
    hrv: today.hrv,
    spo2: { avg: today.spo2.avg, min: today.spo2.min, max: today.spo2.max },
    breathingRate: today.breathingRate,
    skinTempDelta: today.skinTempDelta,
    activities: today.activities ?? [],
    sleep: {
      totalMinutes: today.sleep.totalMinutes,
      asleepMinutes: today.sleep.totalMinutes - today.sleep.wakeMin,
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
    asleepMinutes: s.totalMinutes - s.wakeMin,
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
