// レビュー画面での編集を保存する。承認済みの記録は更新されない（Googleへ送った内容とズレるため）。

import { requireKikigakiUser, getRecord, updateRecordMinutes, normalizeMinutes } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ minutes?: unknown }>(event)

  const record = await getRecord(event, user.id, id)
  if (!record) throw createError({ statusCode: 404, message: '記録が見つかりません' })
  if (record.status === 'approved') {
    throw createError({ statusCode: 409, message: '送信済みの記録は編集できません' })
  }

  const minutes = normalizeMinutes(body?.minutes)
  await updateRecordMinutes(event, user.id, id, minutes)
  return { ok: true, minutes }
})
