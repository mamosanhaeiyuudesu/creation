import { requireKakiUser, requireDb, ensureKakiTables, shapeTree, type TreeRow } from '~/server/utils/kaki'

// 木の一覧。
//  - 里親: 自分が里親になっている木のみ。
//  - 管理者: 全ての木。クエリで検索・絞り込み可能（q / status / foster=assigned|unassigned）。
export default defineEventHandler(async (event) => {
  const user = await requireKakiUser(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const q = getQuery(event) as Record<string, string>

  // 各木の最新観察日と最新写真を相関サブクエリで添える（カード表示用）。里親名も同梱。
  const base = `
    SELECT t.*, u.username AS foster_username,
      (SELECT observed_at FROM kaki_observations WHERE tree_id = t.id
         ORDER BY observed_at DESC, created_at DESC LIMIT 1) AS last_observed,
      (SELECT photo_url FROM kaki_observations WHERE tree_id = t.id AND photo_url IS NOT NULL
         ORDER BY observed_at DESC, created_at DESC LIMIT 1) AS last_photo
    FROM kaki_trees t
    LEFT JOIN users u ON u.id = t.foster_user_id
  `

  const where: string[] = []
  const binds: any[] = []

  if (user.role !== 'admin') {
    where.push('t.foster_user_id = ?')
    binds.push(user.id)
  } else {
    if (q.status && ['healthy', 'watching', 'sick'].includes(q.status)) {
      where.push('t.status = ?')
      binds.push(q.status)
    }
    if (q.foster === 'assigned') where.push('t.foster_user_id IS NOT NULL')
    if (q.foster === 'unassigned') where.push('t.foster_user_id IS NULL')
    if (q.q && q.q.trim()) {
      where.push('(t.nickname LIKE ? OR CAST(t.number AS TEXT) LIKE ?)')
      binds.push(`%${q.q.trim()}%`, `%${q.q.trim()}%`)
    }
  }

  const sql = base + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ' ORDER BY t.number ASC'
  const rows = await db.prepare(sql).bind(...binds).all<TreeRow & { foster_username: string | null; last_observed: string | null; last_photo: string | null }>()

  const isAdmin = user.role === 'admin'
  return (rows.results ?? []).map((r) => ({
    ...shapeTree(r),
    fosterUsername: isAdmin ? r.foster_username : null,
    lastObservedAt: r.last_observed,
    lastPhoto: r.last_photo,
  }))
})
