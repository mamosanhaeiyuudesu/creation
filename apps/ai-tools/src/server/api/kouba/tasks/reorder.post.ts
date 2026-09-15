import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedJob } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: 指定ジョブ内のタスクの並び順を丸ごと差し替える。
// taskIds には「そのジョブの全タスクID」を新しい並び順どおりに渡す。sort_order は 0 から順に振り直すので、
// 一部だけ送られると sort_order が重複したり穴が空いたりする＝件数が合わなければ 400 で弾く。
// メソッドが POST なのは categories/reorder.post.ts・jobs/reorder.post.ts と同じ理由
// （[id].patch.ts / [id].delete.ts と同じ親配下に同名メソッドの兄弟ルートを置くと $fetch の型推論が壊れる）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ jobId?: string; taskIds?: string[] }>(event)
  const jobId = body?.jobId ?? ''
  const taskIds = Array.isArray(body?.taskIds) ? body!.taskIds.filter((v) => typeof v === 'string') : []
  if (!taskIds.length) return { ok: true }
  if (new Set(taskIds).size !== taskIds.length) {
    throw createError({ statusCode: 400, message: 'タスクの並び順が不正です' })
  }

  const job = await findOwnedJob(db, user.id, jobId)
  if (!job) throw createError({ statusCode: 404, message: 'ジョブが見つかりません' })

  const placeholders = taskIds.map(() => '?').join(',')
  const owned = await db
    .prepare(`SELECT COUNT(*) AS n FROM kouba_subtasks WHERE id IN (${placeholders}) AND task_id = ?`)
    .bind(...taskIds, jobId)
    .first<{ n: number }>()
  if ((owned?.n ?? 0) !== taskIds.length) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const total = await db
    .prepare('SELECT COUNT(*) AS n FROM kouba_subtasks WHERE task_id = ?')
    .bind(jobId)
    .first<{ n: number }>()
  if ((total?.n ?? 0) !== taskIds.length) {
    throw createError({ statusCode: 400, message: 'タスクの並び順が最新ではありません。読み込み直してください' })
  }

  await db.batch(
    taskIds.map((id, i) => db.prepare('UPDATE kouba_subtasks SET sort_order = ? WHERE id = ?').bind(i, id))
  )
  return { ok: true }
})
