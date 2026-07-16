import { resolveUserId } from '~/server/utils/fitbit'
import { deleteManualActivity } from '~/server/utils/fitbit-manual'

/** 手動の運動記録を削除する（本人のみ）。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const id = (getQuery(event).id as string) || (await readBody<{ id?: string }>(event).catch(() => null))?.id
  if (!id) throw createError({ statusCode: 400, message: 'id が必要です' })

  await deleteManualActivity(event, userId, id)
  return { ok: true }
})
