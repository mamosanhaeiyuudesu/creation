import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, normalizeIcon, KOUBA_GRID_SIZE } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_CATEGORY_ICON } from '~/types/kouba'

// カテゴリを新規作成する。position はクライアントがクリックした3×3グリッドの空き枠番号(0〜8)。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ name?: string; position?: number; icon?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'カテゴリ名を入力してください' })

  const position = Number(body?.position)
  if (!Number.isInteger(position) || position < 0 || position >= KOUBA_GRID_SIZE) {
    throw createError({ statusCode: 400, message: '不正な位置です' })
  }

  const icon = normalizeIcon(body?.icon, KOUBA_DEFAULT_CATEGORY_ICON)

  const taken = await db
    .prepare('SELECT id FROM kouba_categories WHERE user_id = ? AND position = ?')
    .bind(user.id, position)
    .first<{ id: string }>()
  if (taken) throw createError({ statusCode: 409, message: 'その位置には既にカテゴリがあります' })

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_categories (id, user_id, name, icon, position) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.id, name, icon, position)
    .run()

  return { id, name, icon, position, totalHours: 0, tasks: [], createdAt: new Date().toISOString() }
})
