import { requireKakiUser, requireDb, ensureKakiTables, shapeTree, type TreeRow } from '~/server/utils/kaki'

// 木の詳細（観察日記・病歴・コメントを同梱）。
// アクセス制御: 管理者は全て。里親は自分の木のみ。
export default defineEventHandler(async (event) => {
  const user = await requireKakiUser(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const id = getRouterParam(event, 'id') ?? ''
  if (!id) throw createError({ statusCode: 400, message: 'id は必須です' })

  const treeRow = await db
    .prepare(
      `SELECT t.*, u.username AS foster_username
       FROM kaki_trees t LEFT JOIN users u ON u.id = t.foster_user_id
       WHERE t.id = ?`
    )
    .bind(id)
    .first<TreeRow & { foster_username: string | null }>()

  if (!treeRow) throw createError({ statusCode: 404, message: '木が見つかりません' })

  const isAdmin = user.role === 'admin'
  if (!isAdmin && treeRow.foster_user_id !== user.id) {
    throw createError({ statusCode: 403, message: 'この木を見る権限がありません' })
  }

  const tree = shapeTree(treeRow)
  // 畑の場所メモは管理者のみに返す。
  if (!isAdmin) tree.locationNote = ''

  const observations = await db
    .prepare(
      `SELECT id, observed_at, photo_url, raw_note, ai_story, ai_tree_voice, fruit_size_mm, created_at
       FROM kaki_observations WHERE tree_id = ? ORDER BY observed_at ASC, created_at ASC`
    )
    .bind(id)
    .all<any>()

  const healthEvents = await db
    .prepare(
      `SELECT id, year, event_type, raw_label, ai_label, ai_description
       FROM kaki_health_events WHERE tree_id = ? ORDER BY year ASC, created_at ASC`
    )
    .bind(id)
    .all<any>()

  const comments = await db
    .prepare(
      `SELECT c.id, c.user_id, c.body, c.created_at, u.username, COALESCE(u.role, 'foster') AS role
       FROM kaki_comments c JOIN users u ON u.id = c.user_id
       WHERE c.tree_id = ? ORDER BY c.created_at ASC`
    )
    .bind(id)
    .all<any>()

  return {
    tree: { ...tree, fosterUsername: isAdmin ? treeRow.foster_username : null },
    observations: (observations.results ?? []).map((o: any) => ({
      id: o.id,
      observedAt: o.observed_at,
      photoUrl: o.photo_url,
      rawNote: isAdmin ? o.raw_note : '', // 一次情報（専門用語）は管理者のみ
      aiStory: o.ai_story,
      aiTreeVoice: o.ai_tree_voice,
      fruitSizeMm: o.fruit_size_mm,
      createdAt: o.created_at,
    })),
    healthEvents: (healthEvents.results ?? []).map((h: any) => ({
      id: h.id,
      year: h.year,
      eventType: h.event_type,
      rawLabel: isAdmin ? h.raw_label : '',
      aiLabel: h.ai_label,
      aiDescription: h.ai_description,
    })),
    comments: (comments.results ?? []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      username: c.username,
      role: c.role === 'admin' ? 'admin' : 'foster',
      body: c.body,
      createdAt: c.created_at,
      mine: c.user_id === user.id,
    })),
  }
})
