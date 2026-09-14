import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: 指定タスク内のサブタスクの並び順を丸ごと差し替える。
// subtaskIds には「そのタスクの全サブタスクID」を新しい並び順どおりに渡す。sort_order は 0 から順に振り直すので、
// 一部だけ送られると sort_order が重複したり穴が空いたりする＝件数が合わなければ 400 で弾く。
// メソッドが POST なのは categories/reorder.post.ts・tasks/reorder.post.ts と同じ理由
// （[id].patch.ts / [id].delete.ts と同じ親配下に同名メソッドの兄弟ルートを置くと $fetch の型推論が壊れる）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ taskId?: string; subtaskIds?: string[] }>(event)
  const taskId = body?.taskId ?? ''
  const subtaskIds = Array.isArray(body?.subtaskIds) ? body!.subtaskIds.filter((v) => typeof v === 'string') : []
  if (!subtaskIds.length) return { ok: true }
  if (new Set(subtaskIds).size !== subtaskIds.length) {
    throw createError({ statusCode: 400, message: 'サブタスクの並び順が不正です' })
  }

  const task = await findOwnedTask(db, user.id, taskId)
  if (!task) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const placeholders = subtaskIds.map(() => '?').join(',')
  const owned = await db
    .prepare(`SELECT COUNT(*) AS n FROM kouba_subtasks WHERE id IN (${placeholders}) AND task_id = ?`)
    .bind(...subtaskIds, taskId)
    .first<{ n: number }>()
  if ((owned?.n ?? 0) !== subtaskIds.length) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  const total = await db
    .prepare('SELECT COUNT(*) AS n FROM kouba_subtasks WHERE task_id = ?')
    .bind(taskId)
    .first<{ n: number }>()
  if ((total?.n ?? 0) !== subtaskIds.length) {
    throw createError({ statusCode: 400, message: 'サブタスクの並び順が最新ではありません。読み込み直してください' })
  }

  await db.batch(
    subtaskIds.map((id, i) => db.prepare('UPDATE kouba_subtasks SET sort_order = ? WHERE id = ?').bind(i, id))
  )
  return { ok: true }
})
