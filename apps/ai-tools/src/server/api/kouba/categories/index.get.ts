import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, loadBoard } from '~/server/utils/kouba'

// ログインユーザーのカテゴリ→ジョブ→タスク→サブタスクをまとめて返す（板の表示用）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  return await loadBoard(db, user.id)
})
