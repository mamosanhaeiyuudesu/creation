import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtask, normalizeHours, isValidDateString } from '~/server/utils/kouba'

// サブタスクの日別作業時間を追加/編集する（同じ日を指定すると上書き＝編集になるupsert）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ subtaskId?: string; workDate?: string; hours?: number }>(event)
  const subtaskId = body?.subtaskId ?? ''
  const subtask = await findOwnedSubtask(db, user.id, subtaskId)
  if (!subtask) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  if (!isValidDateString(body?.workDate)) throw createError({ statusCode: 400, message: '日付を指定してください' })
  const workDate = body!.workDate!

  const hours = normalizeHours(body?.hours)
  if (hours === null) throw createError({ statusCode: 400, message: '時間は1〜30の範囲で指定してください' })

  const existing = await db
    .prepare('SELECT id FROM kouba_subtask_logs WHERE subtask_id = ? AND work_date = ?')
    .bind(subtaskId, workDate)
    .first<{ id: string }>()

  if (existing) {
    await db.prepare('UPDATE kouba_subtask_logs SET hours = ? WHERE id = ?').bind(hours, existing.id).run()
    return { id: existing.id, subtaskId, workDate, hours }
  }

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_subtask_logs (id, subtask_id, work_date, hours) VALUES (?, ?, ?, ?)')
    .bind(id, subtaskId, workDate, hours)
    .run()
  return { id, subtaskId, workDate, hours }
})
