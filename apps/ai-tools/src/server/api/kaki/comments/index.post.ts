import { requireKakiUser, requireDb, ensureKakiTables } from '~/server/utils/kaki'

// 応援コメントを投稿。里親は自分の木のみ、管理者は全ての木に投稿できる。
export default defineEventHandler(async (event) => {
  const user = await requireKakiUser(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const body = await readBody<{ treeId?: string; body?: string }>(event)
  if (!body?.treeId) throw createError({ statusCode: 400, message: 'treeId は必須です' })
  const text = (body.body ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'コメントを入力してください' })

  const tree = await db
    .prepare('SELECT id, foster_user_id FROM kaki_trees WHERE id = ?')
    .bind(body.treeId)
    .first<{ id: string; foster_user_id: string | null }>()
  if (!tree) throw createError({ statusCode: 404, message: '木が見つかりません' })

  if (user.role !== 'admin' && tree.foster_user_id !== user.id) {
    throw createError({ statusCode: 403, message: 'この木にコメントする権限がありません' })
  }

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kaki_comments (id, tree_id, user_id, body) VALUES (?, ?, ?, ?)')
    .bind(id, body.treeId, user.id, text)
    .run()

  const row = await db
    .prepare("SELECT created_at FROM kaki_comments WHERE id = ?")
    .bind(id)
    .first<{ created_at: string }>()

  return {
    id,
    userId: user.id,
    username: user.username,
    role: user.role,
    body: text,
    createdAt: row?.created_at ?? new Date().toISOString(),
    mine: true,
  }
})
