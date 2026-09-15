import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, loadSubtasks } from '~/server/utils/kouba'

// サブタスクの一覧（新しい順）。板（カテゴリ→ジョブ→タスク）とは別に取得する＝
// タスクに紐付かない分（taskId が null）も含めて返すため、板の入れ子を辿る方式では拾えない。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  return await loadSubtasks(db, user.id)
})
