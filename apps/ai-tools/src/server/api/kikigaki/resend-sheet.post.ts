// 議事録一覧（スプレッドシート）への追記だけをやり直す。
//
// 承認そのものは一度きりだが、Google が一時的に 503 を返すと一覧の1行だけ欠けることがある。
// ドキュメント・タスク・予定はすでに作られているので作り直さず、欠けた1行だけを足す。
// 人が画面のボタンを押したときにしか動かないので、承認なしの書き込みにはならない。

import { requireKikigakiUser, getRecord, markSheetAppended } from '~/server/utils/kikigaki'
import { appendListRowOnly } from '~/server/utils/kikigaki-google'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const body = await readBody<{ id?: string }>(event)
  const id = (body?.id ?? '').trim()
  if (!id) throw createError({ statusCode: 400, message: '記録が指定されていません' })

  const record = await getRecord(event, user.id, id)
  if (!record) throw createError({ statusCode: 404, message: '記録が見つかりません' })
  if (record.status !== 'approved') {
    throw createError({ statusCode: 409, message: 'まだGoogleへ送信していない記録です' })
  }
  if (record.sheetAppended) {
    throw createError({ statusCode: 409, message: 'この記録はすでに議事録一覧へ追記されています' })
  }

  await appendListRowOnly(event, user.id, record.minutes, record.docUrl)
  await markSheetAppended(event, id)

  return { ok: true }
})
