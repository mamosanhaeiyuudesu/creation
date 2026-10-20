// 認証。Firebase Authentication（Googleログイン／メールのマジックリンク）を使う。
//
// ★自前のセッションもトークンも持たない。
//   クライアントが Firebase の ID トークンを `Authorization: Bearer <token>` で送り、
//   サーバーは毎リクエストそれを検証するだけ。Cookie もセッション表も無いので、
//   パスワードやトークンの管理という仕事がこちら側に発生しない。
//
// ★ID トークンの検証は jose で行う（Firebase Admin SDK は Node 専用で Workers では動かない）。
//   公開鍵は Google の JWK エンドポイントから取り、jose が内部でキャッシュする。

import type { H3Event } from 'h3'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { requireDb, ensureTables } from '~/server/utils/db'

/** Firebase の ID トークンを検証するための公開鍵（JWK形式）。x509 版ではなくこちらを使う */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'

// モジュールスコープに置いて isolate 内で使い回す（毎リクエスト取り直すと subrequest を無駄に使う）。
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export interface AuthUser {
  /** Firebase の uid */
  id: string
  email: string
  displayName: string
  /** お休み（退会）に入った日時(UTC)。空ならふつうに使えている */
  withdrawnAt: string
  /** お休み中のデータを預かる期限(UTC) */
  retainUntil: string
}

interface FirebaseClaims {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
}

function unauthorized(): never {
  throw createError({
    statusCode: 401,
    message: 'ログインの有効期限が切れました。もう一度ログインしてください。',
  })
}

/**
 * ID トークンを検証して claims を返す。
 * 検証するのは署名・発行者（iss）・宛先（aud）・有効期限。aud が自分のプロジェクトであることを
 * 確かめないと、他の Firebase プロジェクトで発行されたトークンでも通ってしまう。
 */
async function verifyIdToken(event: H3Event, token: string): Promise<FirebaseClaims> {
  const projectId = String((useRuntimeConfig(event).public as any).firebaseProjectId ?? '')
  if (!projectId) {
    throw createError({
      statusCode: 503,
      message: 'ログインの設定が済んでいません。管理者にお知らせください。',
    })
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    })
    if (!payload.sub) unauthorized()
    return payload as unknown as FirebaseClaims
  } catch {
    unauthorized()
  }
}

/**
 * users に行を用意する（ログインのたびに呼ばれる）。
 *
 * 同一メールでGoogleログインとマジックリンクの両方を使っても同じユーザーとして扱うのは、
 * 本来 Firebase 側の「1つのメールアドレスにつき1つのアカウント」で担保される（uid が同じになる）。
 * ただし万一それが外れて uid が2つできた場合でも、**確認済みの同じメールアドレスなら
 * 先にある行を使い回す**（＝記録が2つに分かれて「前に作った議事録が消えた」と見える事故を防ぐ）。
 */
async function ensureUser(event: H3Event, claims: FirebaseClaims): Promise<AuthUser> {
  const db = requireDb(event)
  await ensureTables(db)

  const uid = claims.sub
  const email = (claims.email ?? '').trim().toLowerCase()
  const displayName = (claims.name ?? '').trim().slice(0, 100)
  const emailVerified = claims.email_verified === true

  // 確認済みの同じメールの行が別の uid で既にあれば、そちらを本人として使う。
  if (email && emailVerified) {
    const existing = (await db
      .prepare('SELECT id, email, display_name, withdrawn_at, retain_until FROM users WHERE email = ?')
      .bind(email)
      .first()) as { id: string; email: string; display_name: string; withdrawn_at: string; retain_until: string } | null
    if (existing && existing.id !== uid) {
      // お休み中の行は uid が同じ人にしか戻さない。預かりは最長5年と長く、そのあいだにメールアドレスの
      // 持ち主が変わりうる（会社のメールの再割り当てなど）。別の uid が来たら、他人の議事録を見せないよう止める。
      if (existing.withdrawn_at) {
        throw createError({
          statusCode: 409,
          message: 'このメールアドレスは、以前にお休みに入ったアカウントとして残っています。以前と同じ方法でログインするか、お問い合わせください。',
        })
      }
      await db
        .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
        .bind(existing.id)
        .run()
      return {
        id: existing.id,
        email: existing.email,
        displayName: existing.display_name,
        withdrawnAt: '',
        retainUntil: '',
      }
    }
  }

  await db
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, last_login_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT (id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         last_login_at = datetime('now')`
    )
    .bind(uid, email, displayName)
    .run()

  const row = (await db.prepare('SELECT withdrawn_at, retain_until FROM users WHERE id = ?').bind(uid).first()) as {
    withdrawn_at: string
    retain_until: string
  } | null
  return { id: uid, email, displayName, withdrawnAt: row?.withdrawn_at ?? '', retainUntil: row?.retain_until ?? '' }
}

/** Authorization ヘッダーから Bearer トークンを取り出す */
function readBearer(event: H3Event): string {
  const header = getRequestHeader(event, 'authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

/**
 * ログイン必須のエンドポイントの先頭で呼ぶ。
 * 未ログイン・期限切れなら 401 を throw し、通れば users の行を用意して返す。
 *
 * お休み（退会）中の人は 403（code: 'withdrawn'）で止める。議事録も設定も読めず、AIも使えない。
 * 通すのは「お休み中かどうかの確認（/api/me）」「再開」「すべて消す」だけで、そこだけ allowWithdrawn: true で呼ぶ。
 */
export async function requireUser(event: H3Event, opts: { allowWithdrawn?: boolean } = {}): Promise<AuthUser> {
  const token = readBearer(event)
  if (!token) unauthorized()
  const claims = await verifyIdToken(event, token)
  const user = await ensureUser(event, claims)
  if (user.withdrawnAt && !opts.allowWithdrawn) {
    throw createError({
      statusCode: 403,
      message: 'いまはお休み中です。再開すると、これまでの議事録をまた使えます。',
      data: { code: 'withdrawn' },
    })
  }
  // AIの利用量をこの人に付けるため（utils/anthropic.ts の callClaudeText が読む）
  ;(event.context as any).kkUserId = user.id
  return user
}
