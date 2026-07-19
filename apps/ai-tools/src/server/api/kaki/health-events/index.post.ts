import { requireAdmin, requireDb, ensureKakiTables } from '~/server/utils/kaki'

const TYPES = ['disease', 'pest', 'weather', 'recovery', 'harvest']

// 病歴・できごとを1件追加（管理者のみ）。
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)
  await ensureKakiTables(db)

  const body = await readBody<{
    treeId?: string
    year?: number
    eventType?: string
    rawLabel?: string
    aiLabel?: string
    aiDescription?: string
  }>(event)

  if (!body?.treeId) throw createError({ statusCode: 400, message: 'treeId は必須です' })
  const eventType = TYPES.includes(body?.eventType ?? '') ? body!.eventType! : 'disease'
  const year = Number(body?.year) || new Date().getFullYear()

  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO kaki_health_events (id, tree_id, year, event_type, raw_label, ai_label, ai_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, body.treeId, year, eventType, body.rawLabel ?? '', body.aiLabel ?? '', body.aiDescription ?? '')
    .run()

  return {
    id,
    year,
    eventType,
    rawLabel: body.rawLabel ?? '',
    aiLabel: body.aiLabel ?? '',
    aiDescription: body.aiDescription ?? '',
  }
})
