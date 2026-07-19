import { requireAdmin, requireDb, ensureKakiTables } from '~/server/utils/kaki'

// 観察記録を投稿（管理者のみ）。写真は base64 data URL を D1 に保存。
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const body = await readBody<{
    treeId?: string
    observedAt?: string
    photoUrl?: string | null
    rawNote?: string
    aiStory?: string
    aiTreeVoice?: string | null
    fruitSizeMm?: number | null
  }>(event)

  if (!body?.treeId) throw createError({ statusCode: 400, message: 'treeId は必須です' })
  const observedAt = body.observedAt || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

  // 対象の木の存在確認。
  const tree = await db.prepare('SELECT id FROM kaki_trees WHERE id = ?').bind(body.treeId).first<{ id: string }>()
  if (!tree) throw createError({ statusCode: 404, message: '木が見つかりません' })

  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO kaki_observations
        (id, tree_id, observed_at, photo_url, raw_note, ai_story, ai_tree_voice, fruit_size_mm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      body.treeId,
      observedAt,
      body.photoUrl || null,
      body.rawNote ?? '',
      body.aiStory ?? '',
      body.aiTreeVoice || null,
      body.fruitSizeMm ?? null
    )
    .run()

  return {
    id,
    observedAt,
    photoUrl: body.photoUrl || null,
    rawNote: body.rawNote ?? '',
    aiStory: body.aiStory ?? '',
    aiTreeVoice: body.aiTreeVoice || null,
    fruitSizeMm: body.fruitSizeMm ?? null,
  }
})
