import { requireAdmin, requireDb, ensureKakiTables } from '~/server/utils/kaki'

// 里親割り当て用のユーザー一覧（管理者のみ）。role != admin のユーザーを返す。
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const rows = await db
    .prepare("SELECT id, username FROM users WHERE COALESCE(role, 'foster') != 'admin' ORDER BY username ASC")
    .all<{ id: string; username: string }>()

  return (rows.results ?? []).map((r) => ({ id: r.id, username: r.username }))
})
