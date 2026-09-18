// nikki の Google カレンダー連携。
// スコープは calendar.readonly のみ＝**予定を読むだけで、書き込みは一切しない**。
// D1（nikki_google_connections）が持つのはリフレッシュトークン（暗号化）と、
// 本人が「ホームのカレンダーに出す」と選んだカレンダーIDの一覧だけ。予定の内容は保存しない
// （見るたびに Google から取る＝Google 側で直した予定がそのまま反映される）。
//
// OAuth の組み立ては life-google.ts / kikigaki-google.ts と同じ形（Authorization Code + PKCE、
// state は Cookie ではなく D1 に置く）。スコープが違うので OAuth クライアントは使い回さない。

import type { H3Event } from 'h3'
import { getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { ensureNikkiTables } from '~/server/utils/nikki'
import { NIKKI_MAX_CALENDARS } from '~/types/nikki'
import type { NikkiCalendarOption, NikkiEvent } from '~/types/nikki'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

/** 1カレンダーから1回で取る予定の上限（1ヶ月ぶんを想定。これを超えるほど詰まった月は稀） */
const EVENTS_PER_CALENDAR = 200

interface NikkiGoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getConfig(event: H3Event): NikkiGoogleConfig | null {
  const cfg = useRuntimeConfig(event) as any
  if (!cfg.nikkiGoogleClientId || !cfg.nikkiGoogleClientSecret) return null
  return {
    clientId: cfg.nikkiGoogleClientId,
    clientSecret: cfg.nikkiGoogleClientSecret,
    redirectUri: cfg.nikkiGoogleRedirectUri || '',
  }
}

export function isNikkiGoogleConfigured(event: H3Event): boolean {
  return !!getConfig(event)
}

// ─────────────────────────── OAuth2 (Authorization Code + PKCE) ───────────────────────────

function base64url(bytes: Uint8Array): string {
  const str = btoa(String.fromCharCode(...bytes))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateNikkiCodeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(64)))
}

export async function nikkiCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

export function buildNikkiAuthorizeUrl(event: H3Event, challenge: string, state: string): string | null {
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
    // リフレッシュトークンを確実に得るため offline + consent を指定
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

export async function exchangeNikkiCode(event: H3Event, code: string, verifier: string): Promise<TokenResponse> {
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

async function refreshAccessToken(event: H3Event, refresh: string): Promise<string> {
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
  return tok.access_token
}

// ─────────────────────────── D1: OAuth state / 連携情報 ───────────────────────────

export async function saveNikkiOAuthState(event: H3Event, state: string, userId: string, verifier: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureNikkiTables(db)
  await db
    .prepare('INSERT OR REPLACE INTO nikki_oauth_states (state, user_id, verifier, created_at) VALUES (?, ?, ?, ?)')
    .bind(state, userId, verifier, Math.floor(Date.now() / 1000))
    .run()
}

export async function lookupNikkiOAuthState(event: H3Event, state: string): Promise<{ userId: string; verifier: string } | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db.prepare('SELECT user_id, verifier FROM nikki_oauth_states WHERE state = ?').bind(state).first()
  if (!row) return null
  return { userId: (row as any).user_id, verifier: (row as any).verifier }
}

export async function deleteNikkiOAuthState(event: H3Event, state: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM nikki_oauth_states WHERE state = ?').bind(state).run()
}

interface ConnRow {
  refresh_token: string
  calendar_ids: string
}

async function getConnection(event: H3Event, userId: string): Promise<ConnRow | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db
    .prepare('SELECT refresh_token, calendar_ids FROM nikki_google_connections WHERE user_id = ?')
    .bind(userId)
    .first()
  return (row as ConnRow) ?? null
}

function parseCalendarIds(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

export async function getNikkiGoogleStatus(event: H3Event, userId: string): Promise<{ connected: boolean; calendarIds: string[] }> {
  const conn = await getConnection(event, userId)
  if (!conn) return { connected: false, calendarIds: [] }
  return { connected: true, calendarIds: parseCalendarIds(conn.calendar_ids) }
}

/** 連携を保存する。カレンダーの選択は初回連携では空＝続けて設定画面で選ばせる。 */
export async function saveNikkiGoogleConnection(event: H3Event, userId: string, tok: TokenResponse): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureNikkiTables(db)
  const existing = await getConnection(event, userId)

  const refreshToken = tok.refresh_token || (existing ? await decryptComment(event, existing.refresh_token) : '')
  if (!refreshToken) throw new Error('リフレッシュトークンを取得できませんでした')
  const encRefresh = await encryptComment(event, refreshToken)

  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO nikki_google_connections (user_id, refresh_token, calendar_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         refresh_token = excluded.refresh_token, updated_at = excluded.updated_at`
    )
    .bind(userId, encRefresh, existing?.calendar_ids ?? '[]', now, now)
    .run()
}

export async function saveNikkiCalendarIds(event: H3Event, userId: string, ids: string[]): Promise<string[]> {
  const db = getAppDb(event)
  if (!db) return []
  // 重複を落としたうえで上限で切る（上限の理由は types/nikki.ts の NIKKI_MAX_CALENDARS を参照）
  const unique = Array.from(new Set(ids.filter((v) => typeof v === 'string' && v.trim()))).slice(0, NIKKI_MAX_CALENDARS)
  await db
    .prepare("UPDATE nikki_google_connections SET calendar_ids = ?, updated_at = ? WHERE user_id = ?")
    .bind(JSON.stringify(unique), Math.floor(Date.now() / 1000), userId)
    .run()
  return unique
}

export async function disconnectNikkiGoogle(event: H3Event, userId: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM nikki_google_connections WHERE user_id = ?').bind(userId).run()
}

/** 有効なアクセストークンを都度取得する（life と同じ方針でaccess_tokenは永続化しない）。 */
async function getValidAccessToken(event: H3Event, userId: string): Promise<{ token: string; calendarIds: string[] } | null> {
  const conn = await getConnection(event, userId)
  if (!conn) return null
  const refresh = await decryptComment(event, conn.refresh_token)
  const token = await refreshAccessToken(event, refresh)
  return { token, calendarIds: parseCalendarIds(conn.calendar_ids) }
}

// ─────────────────────────────── Calendar API ───────────────────────────────

interface CalendarListItem {
  id: string
  summary?: string
  summaryOverride?: string
  backgroundColor?: string
  primary?: boolean
  selected?: boolean
  accessRole?: string
  deleted?: boolean
}

/**
 * 連携したアカウントのカレンダー一覧（初期設定で選ぶ候補）。
 * selected は「nikki で表示対象に選んでいるか」＝Google側の表示設定ではなくこちらの設定。
 */
export async function listNikkiCalendars(event: H3Event, userId: string): Promise<NikkiCalendarOption[]> {
  const auth = await getValidAccessToken(event, userId)
  if (!auth) return []
  const res: any = await $fetch(`${CALENDAR_API}/users/me/calendarList?minAccessRole=reader&maxResults=250`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  const items: CalendarListItem[] = res?.items ?? []
  const chosen = new Set(auth.calendarIds)
  return items
    .filter((c) => !c.deleted)
    .map((c) => ({
      id: c.id,
      summary: c.summaryOverride || c.summary || c.id,
      color: c.backgroundColor || '#9aa0a6',
      primary: !!c.primary,
      selected: chosen.has(c.id),
    }))
    // 本人のメインカレンダーを先頭に、あとは名前順（毎回同じ並びで出す）
    .sort((a, b) => (a.primary === b.primary ? a.summary.localeCompare(b.summary, 'ja') : a.primary ? -1 : 1))
}

interface GoogleEvent {
  id: string
  summary?: string
  location?: string
  description?: string
  status?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

/**
 * 選んだカレンダーの予定を [from, to) の範囲でまとめて取る（from/to は "YYYY-MM-DD"、JST基準）。
 *
 * Google のAPIに「複数カレンダーの予定を1回で返す」口は無いので、選んだカレンダーの数だけ叩く。
 * そのため選択できるカレンダー数を NIKKI_MAX_CALENDARS で抑えている（Workers の subrequest 上限対策）。
 * 1つのカレンダーが失敗しても、他のカレンダーの予定は出す（連携が切れた共有カレンダーで
 * 画面全体が真っ白になるのを避ける）。
 */
export async function listNikkiEvents(
  event: H3Event,
  userId: string,
  from: string,
  to: string
): Promise<{ events: NikkiEvent[]; calendarIds: string[] }> {
  const auth = await getValidAccessToken(event, userId)
  if (!auth || !auth.calendarIds.length) return { events: [], calendarIds: auth?.calendarIds ?? [] }

  // 名前と色を引くためにカレンダー一覧も取る（1 subrequest）。
  const listRes: any = await $fetch(`${CALENDAR_API}/users/me/calendarList?minAccessRole=reader&maxResults=250`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  }).catch(() => null)
  const meta = new Map<string, { name: string; color: string }>()
  for (const c of (listRes?.items ?? []) as CalendarListItem[]) {
    meta.set(c.id, { name: c.summaryOverride || c.summary || c.id, color: c.backgroundColor || '#9aa0a6' })
  }

  const params = (calendarId: string) =>
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
    new URLSearchParams({
      // JST の 0:00 を明示する（+09:00 を付けないとUTC解釈で前日夜の予定が混ざる）
      timeMin: `${from}T00:00:00+09:00`,
      timeMax: `${to}T00:00:00+09:00`,
      singleEvents: 'true', // 繰り返し予定を1件ずつに展開
      orderBy: 'startTime',
      maxResults: String(EVENTS_PER_CALENDAR),
    }).toString()

  const results = await Promise.all(
    auth.calendarIds.map(async (calendarId) => {
      const res: any = await $fetch(params(calendarId), { headers: { Authorization: `Bearer ${auth.token}` } }).catch(
        (e) => {
          console.error('[nikki/events] カレンダー取得に失敗:', calendarId, e?.message || e)
          return null
        }
      )
      const items: GoogleEvent[] = res?.items ?? []
      const info = meta.get(calendarId)
      return items
        .filter((e) => e.status !== 'cancelled')
        .map<NikkiEvent>((e) => {
          const allDay = !!e.start?.date
          return {
            id: `${calendarId}::${e.id}`,
            calendarId,
            calendarName: info?.name ?? calendarId,
            color: info?.color ?? '#9aa0a6',
            title: e.summary?.trim() || '(タイトルなし)',
            start: e.start?.dateTime || e.start?.date || '',
            end: e.end?.dateTime || e.end?.date || '',
            allDay,
            location: e.location?.trim() || '',
            description: (e.description ?? '').trim().slice(0, 500),
          }
        })
    })
  )

  const events = results.flat().sort((a, b) => a.start.localeCompare(b.start))
  return { events, calendarIds: auth.calendarIds }
}
