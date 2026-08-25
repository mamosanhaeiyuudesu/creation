// キキガキの Google 連携。Docs / Sheets / Tasks / Calendar への書き込みを全部ここに閉じ込める。
//
// ★このファイルの書き込み関数を呼んでよいのは api/kikigaki/records/[id]/approve.post.ts だけ。
//   「人間が承認ボタンを押すまで Google 側には一切書き込まない」を、呼び出し口をひとつに絞ることで守る。
//   新しく Google へ何かを書きたくなっても、承認フローの外から呼ばないこと。
//
// life-google.ts と同じく googleapis パッケージは使わず REST を直接叩く
// （Cloudflare Workers 上で動かすため）。OAuth は Authorization Code + PKCE。
// スコープが違うので life / fitbit とは別の OAuth クライアントを発行して使う。

import type { H3Event } from 'h3'
import { getAppDb, getSessionUser } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { ensureKikigakiTables } from '~/server/utils/kikigaki'
import type { KikigakiApproveResult, KikigakiMinutes } from '~/types/kikigaki'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DOCS_API = 'https://docs.googleapis.com/v1/documents'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar',
]

/** 議事録一覧を書き込むタブ名。連携時に作るスプレッドシートのシート名でもある */
const LIST_SHEET = '議事録一覧'
/** Google Tasks の既定のリスト。別リストへ入れたくなったらここを設定に出す */
const TASKLIST_ID = '@default'
/** 予定を入れるカレンダー */
const CALENDAR_ID = 'primary'
const TIME_ZONE = 'Asia/Tokyo'
const TZ_OFFSET = '+09:00'

interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getConfig(event: H3Event): GoogleConfig | null {
  const cfg = useRuntimeConfig(event) as any
  if (!cfg.kikigakiGoogleClientId || !cfg.kikigakiGoogleClientSecret) return null
  return {
    clientId: cfg.kikigakiGoogleClientId,
    clientSecret: cfg.kikigakiGoogleClientSecret,
    redirectUri: cfg.kikigakiGoogleRedirectUri || '',
  }
}

// ── OAuth2 (Authorization Code + PKCE) ───────────────────────────────

function base64url(bytes: Uint8Array): string {
  const str = btoa(String.fromCharCode(...bytes))
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateKikigakiCodeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(64)))
}

export async function kikigakiCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

export function buildKikigakiAuthorizeUrl(event: H3Event, challenge: string, state: string): string | null {
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

export async function exchangeKikigakiCode(event: H3Event, code: string, verifier: string): Promise<TokenResponse> {
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

// ── D1: OAuth state / 連携情報 ───────────────────────────────────────
// MVPではユーザーごと1行。将来のユーザー切り替えや複数アカウント対応もこの表を増やすだけで済む。

export async function resolveKikigakiUserId(event: H3Event): Promise<string | null> {
  const user = await getSessionUser(event)
  return user?.id ?? null
}

export async function saveKikigakiOAuthState(event: H3Event, state: string, userId: string, verifier: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureKikigakiTables(db)
  await db
    .prepare('INSERT OR REPLACE INTO kikigaki_oauth_states (state, user_id, verifier, created_at) VALUES (?, ?, ?, ?)')
    .bind(state, userId, verifier, Math.floor(Date.now() / 1000))
    .run()
}

export async function lookupKikigakiOAuthState(event: H3Event, state: string): Promise<{ userId: string; verifier: string } | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db.prepare('SELECT user_id, verifier FROM kikigaki_oauth_states WHERE state = ?').bind(state).first()
  if (!row) return null
  return { userId: (row as any).user_id, verifier: (row as any).verifier }
}

export async function deleteKikigakiOAuthState(event: H3Event, state: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM kikigaki_oauth_states WHERE state = ?').bind(state).run()
}

interface ConnRow {
  refresh_token: string
  spreadsheet_id: string
  spreadsheet_url: string
}

async function getConnection(event: H3Event, userId: string): Promise<ConnRow | null> {
  const db = getAppDb(event)
  if (!db) return null
  await ensureKikigakiTables(db)
  const row = await db
    .prepare('SELECT refresh_token, spreadsheet_id, spreadsheet_url FROM kikigaki_google_connections WHERE user_id = ?')
    .bind(userId)
    .first()
  return (row as ConnRow) ?? null
}

export async function getKikigakiGoogleStatus(
  event: H3Event,
  userId: string
): Promise<{ connected: boolean; spreadsheetUrl?: string }> {
  const conn = await getConnection(event, userId)
  if (!conn) return { connected: false }
  return { connected: true, spreadsheetUrl: conn.spreadsheet_url }
}

export async function disconnectKikigakiGoogle(event: H3Event, userId: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM kikigaki_google_connections WHERE user_id = ?').bind(userId).run()
}

/** access_token は永続化せず、必要になったつど refresh_token から取り直す（life と同じ方針）。 */
async function getAuth(event: H3Event, userId: string): Promise<{ token: string; spreadsheetId: string }> {
  const conn = await getConnection(event, userId)
  if (!conn) throw createError({ statusCode: 400, message: 'Googleと連携されていません' })
  const refresh = await decryptComment(event, conn.refresh_token)
  const token = await refreshAccessToken(event, refresh)
  return { token, spreadsheetId: conn.spreadsheet_id }
}

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** 初回連携時に「議事録一覧」スプレッドシートを本人のドライブに作る（以後は使い回す）。 */
async function createListSpreadsheet(token: string, ownerLabel: string): Promise<{ id: string; url: string }> {
  const res: any = await $fetch(SHEETS_API, {
    method: 'POST',
    headers: headers(token),
    body: {
      properties: { title: `キキガキ — ${ownerLabel}さんの議事録一覧` },
      sheets: [{ properties: { title: LIST_SHEET } }],
    },
  })
  const id = res.spreadsheetId as string
  await $fetch(`${SHEETS_API}/${id}/values:batchUpdate`, {
    method: 'POST',
    headers: headers(token),
    body: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${LIST_SHEET}'!A1`,
          values: [['日付', 'タイトル', '概要', '決定事項', '検討事項', '議事録ドキュメント']],
        },
      ],
    },
  })
  return { id, url: `https://docs.google.com/spreadsheets/d/${id}/edit` }
}

export async function saveKikigakiGoogleConnection(
  event: H3Event,
  userId: string,
  tok: TokenResponse,
  ownerLabel: string
): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await ensureKikigakiTables(db)
  const existing = await getConnection(event, userId)

  let spreadsheetId = existing?.spreadsheet_id
  let spreadsheetUrl = existing?.spreadsheet_url
  if (!spreadsheetId) {
    const created = await createListSpreadsheet(tok.access_token, ownerLabel)
    spreadsheetId = created.id
    spreadsheetUrl = created.url
  }

  const refreshToken = tok.refresh_token || (existing ? await decryptComment(event, existing.refresh_token) : '')
  if (!refreshToken) throw new Error('リフレッシュトークンを取得できませんでした')

  const now = Math.floor(Date.now() / 1000)
  await db
    .prepare(
      `INSERT INTO kikigaki_google_connections (user_id, refresh_token, spreadsheet_id, spreadsheet_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         refresh_token = excluded.refresh_token, spreadsheet_id = excluded.spreadsheet_id,
         spreadsheet_url = excluded.spreadsheet_url, updated_at = excluded.updated_at`
    )
    .bind(userId, await encryptComment(event, refreshToken), spreadsheetId, spreadsheetUrl ?? '', now, now)
    .run()
}

// ── 書き込み本体 ──────────────────────────────────────────────────
// ここから下は承認後にだけ実行される。

/** ドキュメント本文。書式は付けず素のテキストで1回だけ挿入する（Docs APIの索引計算で壊れないように）。 */
function buildDocText(minutes: KikigakiMinutes, transcript: string): string {
  const lines: string[] = []
  const push = (s = '') => lines.push(s)

  push(minutes.title || '議事録')
  push(`日付: ${minutes.date || '（未記入）'}`)
  push()

  push('■ 概要')
  push(minutes.summary || '（記載なし）')
  push()

  push('■ 決定事項')
  if (minutes.decisions.length) {
    minutes.decisions.forEach((d) => push(`・${d.content}${d.note ? `（${d.note}）` : ''}`))
  } else push('（なし）')
  push()

  push('■ 検討事項')
  if (minutes.discussions.length) {
    minutes.discussions.forEach((d) => push(`・${d.content}${d.note ? `（${d.note}）` : ''}`))
  } else push('（なし）')
  push()

  push('■ タスク')
  if (minutes.taskCandidates.length) {
    minutes.taskCandidates.forEach((t) => push(`・${t.assignee || '[不明瞭]'}／${t.task}${t.due ? `（${t.due}）` : ''}`))
  } else push('（なし）')
  push()

  push('■ 予定')
  if (minutes.eventCandidates.length) {
    minutes.eventCandidates.forEach((e) => push(`・${e.datetime || '日時不明'} ${e.title}${e.location ? `＠${e.location}` : ''}`))
  } else push('（なし）')
  push()

  if (minutes.unclearPoints.length) {
    push('■ 確認が必要な箇所（AIの自己申告）')
    minutes.unclearPoints.forEach((u) => push(`・${u}`))
    push()
  }

  push('────────────────────────')
  push('■ 文字起こし全文')
  push(transcript || '（文字起こしなし）')

  return lines.join('\n')
}

async function createMinutesDoc(token: string, minutes: KikigakiMinutes, transcript: string): Promise<{ id: string; url: string }> {
  const title = `${minutes.date || ''} ${minutes.title || '議事録'}`.trim()
  const created: any = await $fetch(DOCS_API, { method: 'POST', headers: headers(token), body: { title } })
  const id = created.documentId as string

  await $fetch(`${DOCS_API}/${id}:batchUpdate`, {
    method: 'POST',
    headers: headers(token),
    body: { requests: [{ insertText: { location: { index: 1 }, text: buildDocText(minutes, transcript) } }] },
  })

  return { id, url: `https://docs.google.com/document/d/${id}/edit` }
}

async function appendListRow(token: string, spreadsheetId: string, minutes: KikigakiMinutes, docUrl: string): Promise<void> {
  const join = (items: { content: string }[]) => items.map((i) => `・${i.content}`).join('\n')
  const range = encodeURIComponent(`'${LIST_SHEET}'!A:F`)
  await $fetch(`${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: headers(token),
    body: {
      values: [[minutes.date, minutes.title, minutes.summary, join(minutes.decisions), join(minutes.discussions), docUrl]],
    },
  })
}

/** 「YYYY-MM-DDTHH:mm」を JST の RFC3339 にする */
function toJstRfc3339(local: string): string {
  return `${local}:00${TZ_OFFSET}`
}

/** 終了時刻が空のときは開始の1時間後にする */
function defaultEnd(start: string): string {
  const d = new Date(toJstRfc3339(start))
  d.setTime(d.getTime() + 60 * 60 * 1000)
  return d.toLocaleString('sv-SE', { timeZone: TIME_ZONE }).replace(' ', 'T').slice(0, 16)
}

function errText(e: any): string {
  const data = e?.data
  return data?.error?.message || e?.message || String(e)
}

/**
 * 承認された議事録を Google へ書き込む。順は Docs → Sheets → Tasks → Calendar。
 * Docs は議事録そのものなので失敗したら中断（＝承認をやり直せる）。
 * それ以降は一部が失敗しても残りを続け、失敗ぶんは warnings で画面に返す。
 */
export async function writeApprovedMinutes(
  event: H3Event,
  userId: string,
  minutes: KikigakiMinutes,
  transcript: string
): Promise<KikigakiApproveResult> {
  const { token, spreadsheetId } = await getAuth(event, userId)
  const warnings: string[] = []

  // 1. Docs（必須）
  let doc: { id: string; url: string }
  try {
    doc = await createMinutesDoc(token, minutes, transcript)
  } catch (e: any) {
    throw createError({ statusCode: 502, message: `Googleドキュメントの作成に失敗しました: ${errText(e)}` })
  }

  // 2. Sheets（議事録一覧に1行追記）
  if (spreadsheetId) {
    try {
      await appendListRow(token, spreadsheetId, minutes, doc.url)
    } catch (e: any) {
      warnings.push(`スプレッドシートへの追記に失敗しました: ${errText(e)}`)
    }
  } else {
    warnings.push('議事録一覧のスプレッドシートが見つかりません（Google連携をやり直すと作成されます）')
  }

  // 3. Tasks
  let sentTasks = 0
  for (const t of minutes.taskCandidates) {
    const title = t.assignee ? `${t.assignee}／${t.task}` : t.task
    const notes = [t.due ? `期限（原文）: ${t.due}` : '', `出典: ${minutes.title || '議事録'} ${doc.url}`]
      .filter(Boolean)
      .join('\n')
    try {
      await $fetch(`${TASKS_API}/lists/${TASKLIST_ID}/tasks`, {
        method: 'POST',
        headers: headers(token),
        // Google Tasks の due は RFC3339 だが日付部分しか使われない（時刻は無視される）
        body: { title, notes, ...(t.dueDate ? { due: `${t.dueDate}T00:00:00.000Z` } : {}) },
      })
      sentTasks++
    } catch (e: any) {
      warnings.push(`タスク「${t.task}」の登録に失敗しました: ${errText(e)}`)
    }
  }

  // 4. Calendar（開始日時が確定しているものだけ。曖昧なままの予定は登録しない）
  let sentEvents = 0
  for (const ev of minutes.eventCandidates) {
    if (!ev.start) continue
    try {
      await $fetch(`${CALENDAR_API}/calendars/${CALENDAR_ID}/events`, {
        method: 'POST',
        headers: headers(token),
        body: {
          summary: ev.title || '（無題の予定）',
          location: ev.location || undefined,
          description: `出典: ${minutes.title || '議事録'}\n${doc.url}`,
          start: { dateTime: toJstRfc3339(ev.start), timeZone: TIME_ZONE },
          end: { dateTime: toJstRfc3339(ev.end || defaultEnd(ev.start)), timeZone: TIME_ZONE },
        },
      })
      sentEvents++
    } catch (e: any) {
      warnings.push(`予定「${ev.title}」の登録に失敗しました: ${errText(e)}`)
    }
  }

  return { docUrl: doc.url, sentTasks, sentEvents, warnings }
}
