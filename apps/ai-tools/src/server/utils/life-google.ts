// life（人生のインタビュー）の Google 連携。
// 回答本文は WHISPER_DB には保存せず、本人の Google アカウントに作成した専用スプレッドシートへ
// 直接読み書きする（プライバシー優先）。D1が持つのは「どのスプレッドシートか」の参照と
// リフレッシュトークン（encrypt.tsで暗号化）だけ。
//
// スコープは drive.file のみ（このアプリが作成したファイルにしかアクセスできない最小権限）。
// Sheets API でスプレッドシートを新規作成すると、そのファイルは作成した OAuth クライアントの
// drive.file 権限内でアクセスできるようになる（ユーザーの他のスプレッドシートには一切触れない）。

import type { H3Event } from 'h3'
import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { LIFE_THEMES } from '~/utils/life-themes'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

interface LifeGoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getConfig(event: H3Event): LifeGoogleConfig | null {
  const cfg = useRuntimeConfig(event) as any
  if (!cfg.lifeGoogleClientId || !cfg.lifeGoogleClientSecret) return null
  return {
    clientId: cfg.lifeGoogleClientId,
    clientSecret: cfg.lifeGoogleClientSecret,
    redirectUri: cfg.lifeGoogleRedirectUri || '',
  }
}

// ─────────────────────────────── OAuth2 (Authorization Code + PKCE) ──────────────

function base64url(bytes: Uint8Array): string {
  const str = btoa(String.fromCharCode(...bytes))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateLifeCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return base64url(bytes)
}

export async function lifeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

export function buildLifeAuthorizeUrl(event: H3Event, challenge: string, state: string): string | null {
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

export async function exchangeLifeCode(event: H3Event, code: string, verifier: string): Promise<TokenResponse> {
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

export async function ensureLifeGoogleTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS life_oauth_states (
      state TEXT PRIMARY KEY, user_id TEXT NOT NULL, verifier TEXT NOT NULL, created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS life_google_connections (
      user_id TEXT PRIMARY KEY, refresh_token TEXT NOT NULL, spreadsheet_id TEXT NOT NULL,
      spreadsheet_url TEXT NOT NULL DEFAULT '', created_at INTEGER, updated_at INTEGER
    )`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
}

export async function resolveLifeUserId(event: H3Event): Promise<string | null> {
  const user = await getSessionUser(event)
  return user?.id ?? null
}

export async function saveLifeOAuthState(event: H3Event, state: string, userId: string, verifier: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureLifeGoogleTables(db)
  await db
    .prepare('INSERT OR REPLACE INTO life_oauth_states (state, user_id, verifier, created_at) VALUES (?, ?, ?, ?)')
    .bind(state, userId, verifier, Math.floor(Date.now() / 1000))
    .run()
}

export async function lookupLifeOAuthState(event: H3Event, state: string): Promise<{ userId: string; verifier: string } | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db.prepare('SELECT user_id, verifier FROM life_oauth_states WHERE state = ?').bind(state).first()
  if (!row) return null
  return { userId: (row as any).user_id, verifier: (row as any).verifier }
}

export async function deleteLifeOAuthState(event: H3Event, state: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM life_oauth_states WHERE state = ?').bind(state).run()
}

interface ConnRow { refresh_token: string; spreadsheet_id: string; spreadsheet_url: string }

async function getConnection(event: H3Event, userId: string): Promise<ConnRow | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db
    .prepare('SELECT refresh_token, spreadsheet_id, spreadsheet_url FROM life_google_connections WHERE user_id = ?')
    .bind(userId)
    .first()
  return (row as ConnRow) ?? null
}

export async function getLifeGoogleStatus(event: H3Event, userId: string): Promise<{ connected: boolean; spreadsheetUrl?: string }> {
  const conn = await getConnection(event, userId)
  if (!conn) return { connected: false }
  return { connected: true, spreadsheetUrl: conn.spreadsheet_url }
}

export async function isLifeGoogleConnected(event: H3Event, userId: string): Promise<boolean> {
  return !!(await getConnection(event, userId))
}

export async function disconnectLifeGoogle(event: H3Event, userId: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM life_google_connections WHERE user_id = ?').bind(userId).run()
}

/** 有効なアクセストークンを都度取得する（保存の単純さを優先し、access_tokenは永続化しない）。 */
async function getValidAccessToken(event: H3Event, userId: string): Promise<{ token: string; spreadsheetId: string } | null> {
  const conn = await getConnection(event, userId)
  if (!conn) return null
  const refresh = await decryptComment(event, conn.refresh_token)
  const token = await refreshAccessToken(event, refresh)
  return { token, spreadsheetId: conn.spreadsheet_id }
}

// ─────────────────────────────────── Sheets API ───────────────────────────────────

function sheetsHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

const README_TITLE = '使い方'

/** 初回連携時に、テーマごとのタブを持つ専用スプレッドシートを作成する。 */
async function createSpreadsheet(token: string, ownerLabel: string): Promise<{ id: string; url: string }> {
  const sheets = [
    { properties: { title: README_TITLE } },
    ...LIFE_THEMES.map(t => ({ properties: { title: t.sheetName } })),
  ]
  const res: any = await $fetch(SHEETS_API, {
    method: 'POST',
    headers: sheetsHeaders(token),
    body: { properties: { title: `life — ${ownerLabel}さんのインタビュー記録` }, sheets },
  })
  const id = res.spreadsheetId as string

  const data = [
    {
      range: `'${README_TITLE}'!A1`,
      values: [
        ['このシートはあなた本人のGoogleドライブに保存されています。'],
        ['運営者はこの内容を保存・閲覧しません。共有もあなたの操作でのみ行われます。'],
        ['各タブに、テーマごとの会話ログが「日時・話者・発言」で記録されます。'],
      ],
    },
    ...LIFE_THEMES.map(t => ({ range: `'${t.sheetName}'!A1`, values: [['日時', '話者', '発言']] })),
  ]
  await $fetch(`${SHEETS_API}/${id}/values:batchUpdate`, {
    method: 'POST',
    headers: sheetsHeaders(token),
    body: { valueInputOption: 'USER_ENTERED', data },
  })

  return { id, url: `https://docs.google.com/spreadsheets/d/${id}/edit` }
}

/** OAuth連携を保存する。スプレッドシートは初回のみ作成し、以後は既存を使い回す。 */
export async function saveLifeGoogleConnection(event: H3Event, userId: string, tok: TokenResponse, ownerLabel: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureLifeGoogleTables(db)
  const existing = await getConnection(event, userId)

  let spreadsheetId = existing?.spreadsheet_id
  let spreadsheetUrl = existing?.spreadsheet_url
  if (!spreadsheetId) {
    const created = await createSpreadsheet(tok.access_token, ownerLabel)
    spreadsheetId = created.id
    spreadsheetUrl = created.url
  }

  const refreshToken = tok.refresh_token || (existing ? await decryptComment(event, existing.refresh_token) : '')
  if (!refreshToken) throw new Error('リフレッシュトークンを取得できませんでした')
  const encRefresh = await encryptComment(event, refreshToken)

  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO life_google_connections (user_id, refresh_token, spreadsheet_id, spreadsheet_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         refresh_token = excluded.refresh_token, spreadsheet_id = excluded.spreadsheet_id,
         spreadsheet_url = excluded.spreadsheet_url, updated_at = excluded.updated_at`
    )
    .bind(userId, encRefresh, spreadsheetId, spreadsheetUrl, now, now)
    .run()
}

export interface LifeChatRow { role: 'user' | 'assistant'; content: string; timestamp: string }

/** テーマのタブから会話ログを読み込む（古い順）。未連携・未取得時は空。 */
export async function readThemeHistory(event: H3Event, userId: string, sheetName: string): Promise<LifeChatRow[]> {
  const auth = await getValidAccessToken(event, userId)
  if (!auth) return []
  const range = encodeURIComponent(`'${sheetName}'!A2:C`)
  const res: any = await $fetch(`${SHEETS_API}/${auth.spreadsheetId}/values/${range}`, {
    headers: sheetsHeaders(auth.token),
  }).catch(() => null)
  const rows: string[][] = res?.values ?? []
  return rows
    .filter(r => r[1] && r[2])
    .map(r => ({ timestamp: r[0] ?? '', role: r[1] === 'AI' ? 'assistant' : 'user', content: r[2] ?? '' }))
}

/** 1件以上の発言をテーマのタブへ追記する。 */
export async function appendThemeRows(
  event: H3Event,
  userId: string,
  sheetName: string,
  rows: { role: 'user' | 'assistant'; content: string; timestamp: string }[]
): Promise<void> {
  const auth = await getValidAccessToken(event, userId)
  if (!auth || !rows.length) return
  const range = encodeURIComponent(`'${sheetName}'!A:C`)
  await $fetch(`${SHEETS_API}/${auth.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: sheetsHeaders(auth.token),
    body: { values: rows.map(r => [r.timestamp, r.role === 'assistant' ? 'AI' : '本人', r.content]) },
  })
}
