import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// 作業ログ（日付・時間・箇条書きメモ）を1件追加する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ taskId?: string; workDate?: string; hours?: number; note?: string }>(event)
  const taskId = body?.taskId ?? ''
  const task = await findOwnedTask(db, user.id, taskId)
  if (!task) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const workDate = (body?.workDate ?? '').match(/^\d{4}-\d{2}-\d{2}$/) ? body!.workDate! : ''
  if (!workDate) throw createError({ statusCode: 400, message: '日付を指定してください' })

  const hours = Number(body?.hours)
  if (!Number.isFinite(hours) || hours <= 0) throw createError({ statusCode: 400, message: '時間を正しく入力してください' })

  const note = (body?.note ?? '').trim()

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_logs (id, task_id, work_date, hours, note) VALUES (?, ?, ?, ?, ?)')
    .bind(id, taskId, workDate, hours, note)
    .run()

  return { id, taskId, workDate, hours, note, createdAt: new Date().toISOString() }
})
