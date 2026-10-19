// 管理者の判定と、運営者が個別に付ける扱い（支払い不要）の読み書き。
//
// ★管理者は環境変数 NUXT_ADMIN_UIDS だけで決める（D1 に「管理者」の列は持たない）。
//   D1 に持つと、どこかの API の不具合で書き換えられたときに他人が管理者になりうる。
//   環境変数ならデプロイする人しか変えられない。
// ★/api/admin/* は server/middleware/admin.ts が入口でまとめて止める（API ごとの書き忘れを防ぐ）。
//   管理者でない人には 404 を返す（403 だと管理画面があること自体が伝わるため）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { requireUser, type AuthUser } from '~/server/utils/auth'
import { isPendingApproval, parseAdminIds } from '~/utils/entitlement'
import { SERVICE } from '~/config/service'
import { jstYearMonth } from '~/utils/formatDate'

export function isAdminId(event: H3Event, userId: string): boolean {
  if (!userId) return false
  return parseAdminIds(useRuntimeConfig(event).adminUids).includes(userId)
}

function notFound(): never {
  throw createError({ statusCode: 404, message: 'Not Found' })
}

/** 管理者でなければ 404。通れば本人を返す（ミドルウェアから呼ぶ） */
export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  let user: AuthUser
  try {
    user = await requireUser(event)
  } catch {
    // 未ログインにも「ログインしてください」ではなく 404 を返す（存在を伝えない）
    notFound()
  }
  if (!isAdminId(event, user.id)) notFound()
  return user
}

/** ミドルウェアが確認済みの管理者。/api/admin/* のハンドラで使う */
export function adminOf(event: H3Event): AuthUser {
  const admin = (event.context as any).kkAdmin as AuthUser | undefined
  if (!admin) notFound()
  return admin
}

// ── 承認制 ─────────────────────────────────────────────

/** 承認待ちか（承認制を外していれば常に false） */
export async function isPending(event: H3Event, userId: string): Promise<boolean> {
  if (!SERVICE.approvalRequired) return false
  const isAdmin = isAdminId(event, userId)
  if (isAdmin) return false
  const db = requireDb(event)
  await ensureTables(db)
  const row = await db.prepare('SELECT user_id FROM user_approvals WHERE user_id = ?').bind(userId).first()
  return isPendingApproval({ approvalRequired: true, isAdmin, approved: !!row })
}

/** 承認する／取り消す。操作の記録も同時に残す */
export async function saveApproval(event: H3Event, adminId: string, userId: string, approved: boolean): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const exists = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!exists) throw createError({ statusCode: 404, message: 'その利用者は見つかりませんでした。' })

  await db.batch([
    approved
      ? db
          .prepare(
            `INSERT INTO user_approvals (user_id, approved_by, approved_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT (user_id) DO NOTHING`
          )
          .bind(userId, adminId)
      : db.prepare('DELETE FROM user_approvals WHERE user_id = ?').bind(userId),
    db
      .prepare('INSERT INTO admin_audit (admin_id, action, target_user_id, detail) VALUES (?, ?, ?, ?)')
      .bind(adminId, approved ? 'approve' : 'unapprove', userId, ''),
  ])
}

// ── 支払い不要の指定 ─────────────────────────────────────

export interface UserGrant {
  freeAccess: boolean
  note: string
}

export async function loadGrant(event: H3Event, userId: string): Promise<UserGrant> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT free_access, note FROM user_grants WHERE user_id = ?')
    .bind(userId)
    .first()) as { free_access: number; note: string } | null
  return { freeAccess: !!row?.free_access, note: row?.note ?? '' }
}

/** 管理者・支払い不要の指定のどちらかなら、契約なしで使える */
export async function hasFreeAccess(event: H3Event, userId: string): Promise<boolean> {
  if (isAdminId(event, userId)) return true
  return (await loadGrant(event, userId)).freeAccess
}

/** 支払い不要の指定を変える。操作の記録も同時に残す */
export async function saveGrant(
  event: H3Event,
  adminId: string,
  userId: string,
  grant: UserGrant
): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const exists = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!exists) throw createError({ statusCode: 404, message: 'その利用者は見つかりませんでした。' })

  const note = grant.note.trim().slice(0, 200)
  await db.batch([
    db
      .prepare(
        `INSERT INTO user_grants (user_id, free_access, note, updated_by, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (user_id) DO UPDATE SET
           free_access = excluded.free_access,
           note = excluded.note,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      )
      .bind(userId, grant.freeAccess ? 1 : 0, note, adminId),
    db
      .prepare('INSERT INTO admin_audit (admin_id, action, target_user_id, detail) VALUES (?, ?, ?, ?)')
      .bind(adminId, grant.freeAccess ? 'grant_free_access' : 'revoke_free_access', userId, note),
  ])
}

/** 今月のAI利用量を0に戻す（行は消さず 0 にする）。操作の記録も同時に残す */
export async function resetAiUsage(event: H3Event, adminId: string, userId: string): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const exists = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!exists) throw createError({ statusCode: 404, message: 'その利用者は見つかりませんでした。' })

  const ym = jstYearMonth()
  await db.batch([
    db
      .prepare("UPDATE ai_usage_monthly SET cost_units = 0, updated_at = datetime('now') WHERE user_id = ? AND ym = ?")
      .bind(userId, ym),
    db
      .prepare('INSERT INTO admin_audit (admin_id, action, target_user_id, detail) VALUES (?, ?, ?, ?)')
      .bind(adminId, 'reset_ai_usage', userId, ym),
  ])
}
