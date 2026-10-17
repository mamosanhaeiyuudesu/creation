// 管理画面: 操作の記録（新しい順に50件）。

import { requireDb, ensureTables } from '~/server/utils/db'
import { adminOf } from '~/server/utils/admin'
import { utcToJstLabel } from '~/utils/formatDate'
import type { AdminAuditRow } from '~/types/admin'

export default defineEventHandler(async (event) => {
  adminOf(event)
  const db = requireDb(event)
  await ensureTables(db)
  const res = await db
    .prepare(
      `SELECT a.id, a.created_at, a.action, a.detail,
         COALESCE(ad.email, a.admin_id) AS admin_email,
         COALESCE(t.email, a.target_user_id) AS target_email
       FROM admin_audit a
       LEFT JOIN users ad ON ad.id = a.admin_id
       LEFT JOIN users t ON t.id = a.target_user_id
       ORDER BY a.id DESC
       LIMIT 50`
    )
    .all()
  const audit: AdminAuditRow[] = ((res?.results ?? []) as any[]).map((r) => ({
    id: Number(r.id),
    createdAt: utcToJstLabel(r.created_at ?? ''),
    adminEmail: r.admin_email ?? '',
    action: r.action ?? '',
    targetEmail: r.target_email ?? '',
    detail: r.detail ?? '',
  }))
  return { audit }
})
