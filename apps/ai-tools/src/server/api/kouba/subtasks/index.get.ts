import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, loadSubtaskList } from '~/server/utils/kouba'

// サブタスク一覧（並び順どおり）。板（カテゴリ→ジョブ→タスク）とは無関係の、名前だけのTODOリスト。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  return await loadSubtaskList(db, user.id)
})
