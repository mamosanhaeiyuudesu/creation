// ★Google（Docs / Sheets / Tasks / Calendar）へ書き込む唯一のエンドポイント。
//
// 「人間の承認を経ずに Google へ書き込まれる」ことを防ぐために、書き込み関数
// （kikigaki-google.ts の writeApprovedMinutes）を呼ぶ場所をこの1ファイルだけに限っている。
// 文字起こし・構造化・保存のどのエンドポイントからも Google には触れない。
//
// 受け取った minutes は「承認ボタンを押した瞬間に画面に出ていた内容」そのもの。
// 送信前にそれを下書きとして保存し直してから送るので、送った内容と保存内容が食い違わない。

import { requireKikigakiUser, getRecord, updateRecordMinutes, markApproved, normalizeMinutes } from '~/server/utils/kikigaki'
import { writeApprovedMinutes } from '~/server/utils/kikigaki-google'
import type { KikigakiApproveResult } from '~/types/kikigaki'

export default defineEventHandler(async (event): Promise<KikigakiApproveResult> => {
  const user = await requireKikigakiUser(event)
  const body = await readBody<{ id?: string; minutes?: unknown }>(event)
  const id = (body?.id ?? '').trim()
  if (!id) throw createError({ statusCode: 400, message: '記録が指定されていません' })

  const record = await getRecord(event, user.id, id)
  if (!record) throw createError({ statusCode: 404, message: '記録が見つかりません' })
  // 二重送信の防止。同じ議事録からドキュメントや予定が2つできるのを避ける。
  if (record.status === 'approved') {
    throw createError({ statusCode: 409, message: 'この記録はすでにGoogleへ送信済みです' })
  }

  const minutes = body?.minutes ? normalizeMinutes(body.minutes) : record.minutes
  if (!minutes.title) throw createError({ statusCode: 400, message: 'タイトルを入力してください' })

  await updateRecordMinutes(event, user.id, id, minutes)

  const result = await writeApprovedMinutes(event, user.id, minutes, record.transcript)
  await markApproved(event, user.id, id, result.docUrl, result.sentTasks, result.sentEvents)

  return result
})
