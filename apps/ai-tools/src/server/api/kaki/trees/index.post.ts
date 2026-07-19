import { requireAdmin, requireDb, ensureKakiTables, shapeTree, type TreeRow } from '~/server/utils/kaki'

// 木を新規登録（管理者のみ）。
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const body = await readBody<{
    number?: number
    nickname?: string
    fosterUserId?: string | null
    plantedYear?: number | null
    locationNote?: string
    personality?: string
    strengths?: string[]
    weaknesses?: string[]
    status?: string
  }>(event)

  const status = ['healthy', 'watching', 'sick'].includes(body?.status ?? '') ? body!.status! : 'healthy'
  const id = crypto.randomUUID()

  await db
    .prepare(
      `INSERT INTO kaki_trees
        (id, number, nickname, foster_user_id, planted_year, location_note, personality, strengths, weaknesses, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      body?.number ?? 0,
      (body?.nickname ?? '').trim(),
      body?.fosterUserId || null,
      body?.plantedYear ?? null,
      body?.locationNote ?? '',
      body?.personality ?? '',
      JSON.stringify(body?.strengths ?? []),
      JSON.stringify(body?.weaknesses ?? []),
      status
    )
    .run()

  const row = await db.prepare('SELECT * FROM kaki_trees WHERE id = ?').bind(id).first<TreeRow>()
  return shapeTree(row!)
})
