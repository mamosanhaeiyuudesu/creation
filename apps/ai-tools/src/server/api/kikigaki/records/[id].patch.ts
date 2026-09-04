// レビュー画面での編集を保存する。Google連携（承認して送信）は廃止したため、記録はいつでも編集できる。

import { requireKikigakiUser, getRecord, updateRecordMinutes, normalizeMinutes } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ minutes?: unknown }>(event)

  const record = await getRecord(event, user.id, id)
  if (!record) throw createError({ statusCode: 404, message: '記録が見つかりません' })

  const minutes = normalizeMinutes(body?.minutes)
  await updateRecordMinutes(event, id, minutes)
  return { ok: true, minutes }
})
