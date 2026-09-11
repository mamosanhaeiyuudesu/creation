import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, normalizeIcon, compactCategoryPositions, KOUBA_GRID_SIZE } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_CATEGORY_ICON } from '~/types/kouba'

// カテゴリを新規作成する。position はサーバーが決める＝いまのカテゴリの末尾
// （削除で空いた枠は詰めるので、カテゴリは常に 0〜件数-1 に隙間なく並ぶ。旧データの隙間もここで詰め直す）。
// アイコンは作成後にクライアントが /api/kouba/icon を呼んで AI に作らせる（それまでは既定の絵文字）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ name?: string; icon?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'カテゴリ名を入力してください' })

  const position = await compactCategoryPositions(db, user.id)
  if (position >= KOUBA_GRID_SIZE) throw createError({ statusCode: 400, message: `カテゴリは${KOUBA_GRID_SIZE}個までです` })

  const icon = normalizeIcon(body?.icon, KOUBA_DEFAULT_CATEGORY_ICON)

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_categories (id, user_id, name, icon, position) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.id, name, icon, position)
    .run()

  return { id, name, icon, position, totalHours: 0, tasks: [], createdAt: new Date().toISOString() }
})
