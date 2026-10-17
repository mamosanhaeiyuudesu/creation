// 管理画面: 利用者の一覧と全体の集計。管理者の判定は server/middleware/admin.ts が済ませている。
// ★議事録の中身（名前・本文）は読まない。件数だけ数える。

import { requireDb, ensureTables } from '~/server/utils/db'
import { adminOf, isAdminId } from '~/server/utils/admin'
import { isMonitorMode } from '~/server/utils/entitlement'
import { toStatus } from '~/server/utils/usage'
import { canUseFeatures, isPendingApproval } from '~/utils/entitlement'
import { SERVICE } from '~/config/service'
import { jstYearMonth, utcToJstLabel } from '~/utils/formatDate'
import { isActiveStatus, isPaymentProblem } from '~/types/billing'
import type { AdminSummary, AdminUserRow } from '~/types/admin'

/**
 * D1 の上限。Workers の無料プランでは1データベースあたり 500MB（2026-10 時点。有料プランなら 10GB）。
 * プランを変えたらここも直す。
 */
const D1_LIMIT_BYTES = 500 * 1024 * 1024

/** 管理画面で円に直すときのレート（おおよそ。service.ts の上限の根拠と同じ 1ドル=160円） */
const JPY_PER_USD = 160
const UNITS_PER_USD = 10_000_000

export default defineEventHandler(async (event) => {
  adminOf(event)
  const db = requireDb(event)
  await ensureTables(db)
  const monitorMode = isMonitorMode(event)
  const ym = jstYearMonth()

  // 1回のクエリで取る（Workers の subrequest 上限に当たらないよう、利用者ごとにループで引かない）
  const res = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at, u.last_login_at,
         (SELECT COUNT(*) FROM records r WHERE r.user_id = u.id) AS record_count,
         (SELECT COUNT(*) FROM records r WHERE r.user_id = u.id AND r.created_at >= datetime('now', '-30 days')) AS recent_count,
         COALESCE((SELECT a.cost_units FROM ai_usage_monthly a WHERE a.user_id = u.id AND a.ym = ?), 0) AS cost_units,
         COALESCE(s.status, '') AS status,
         COALESCE(s.current_period_end, '') AS current_period_end,
         COALESCE(s.cancel_at_period_end, 0) AS cancel_at_period_end,
         COALESCE(g.free_access, 0) AS free_access,
         COALESCE(g.note, '') AS note,
         CASE WHEN ap.user_id IS NULL THEN 0 ELSE 1 END AS approved
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN user_grants g ON g.user_id = u.id
       LEFT JOIN user_approvals ap ON ap.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 1000`
    )
    .bind(ym)
    .all()
  const rows = (res?.results ?? []) as any[]

  // 容量の目安。D1 は問い合わせの結果に、いまのデータベースの大きさ（meta.size_after）を付けて返す
  const stat = await db
    .prepare(
      `SELECT COUNT(*) AS n,
         COALESCE(SUM(length(transcript) + length(minutes)), 0) AS bytes
       FROM records`
    )
    .all()
  const s0 = ((stat?.results ?? [])[0] ?? {}) as { n?: number; bytes?: number }
  const dbBytes = Number(stat?.meta?.size_after ?? res?.meta?.size_after ?? 0)
  const recordCount = Number(s0.n) || 0
  const avgRecordBytes = recordCount ? Math.round((Number(s0.bytes) || 0) / recordCount) : 0

  const users: AdminUserRow[] = rows.map((r) => {
    const isAdmin = isAdminId(event, r.id)
    const freeAccess = !!r.free_access
    const units = Number(r.cost_units) || 0
    const pending = isPendingApproval({ approvalRequired: SERVICE.approvalRequired, isAdmin, approved: !!r.approved })
    return {
      id: r.id,
      email: r.email ?? '',
      displayName: r.display_name ?? '',
      createdAt: utcToJstLabel(r.created_at ?? ''),
      lastLoginAt: utcToJstLabel(r.last_login_at ?? ''),
      recordCount: Number(r.record_count) || 0,
      usedPercent: toStatus(units).usedPercent,
      costYen: Math.round((units / UNITS_PER_USD) * JPY_PER_USD),
      status: r.status ?? '',
      currentPeriodEnd: r.current_period_end ?? '',
      cancelAtPeriodEnd: !!r.cancel_at_period_end,
      isAdmin,
      approved: !pending,
      freeAccess,
      note: r.note ?? '',
      canUse: !pending && canUseFeatures({ monitorMode, status: r.status ?? '', freeAccess: freeAccess || isAdmin }),
    }
  })

  const summary: AdminSummary = {
    userCount: users.length,
    pendingCount: users.filter((u) => !u.approved).length,
    approvalRequired: SERVICE.approvalRequired,
    payingCount: users.filter((u) => isActiveStatus(u.status)).length,
    trialingCount: users.filter((u) => u.status === 'trialing').length,
    paymentProblemCount: users.filter((u) => isPaymentProblem(u.status)).length,
    freeAccessCount: users.filter((u) => u.freeAccess || u.isAdmin).length,
    recordCount: users.reduce((sum, u) => sum + u.recordCount, 0),
    recentRecordCount: rows.reduce((sum, r) => sum + (Number(r.recent_count) || 0), 0),
    monthCostYen: users.reduce((sum, u) => sum + u.costYen, 0),
    monitorMode,
    storage: {
      dbBytes,
      limitBytes: D1_LIMIT_BYTES,
      avgRecordBytes,
      // 平均がまだ出ないとき（議事録0件）は、1時間の会議1件＝約70KB（圧縮後の目安）で見積もる
      remainingRecords: Math.max(0, Math.floor((D1_LIMIT_BYTES - dbBytes) / (avgRecordBytes || 70 * 1024))),
    },
  }

  return { users, summary }
})
