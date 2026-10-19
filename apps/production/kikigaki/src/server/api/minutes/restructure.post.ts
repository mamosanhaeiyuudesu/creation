// 「作り直す」。まとめ方（複数人の会議／主に1人が話した記録）を選び直して、元の文章から作り直す。
//
// 画面で直した内容は土台にしない（まとめ方が違うと項目そのものが違うので、原文からやり直す）。
// 「AIで直す」と同じく DB には保存せず、画面の編集状態を置き換えるだけ（自動保存で保存される）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { getRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'
import { normalizeMode } from '~/types/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // AIを呼ぶ口なので、ここも契約状態を見る（モニター期間中は無条件で通る）
  await requireEntitlement(event, user.id)
  const body = await readBody<{ id?: string; mode?: string }>(event)

  const record = await getRecord(event, user.id, body?.id ?? '')
  if (!record) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧からお選びください。' })
  }
  if (!record.transcript.trim()) {
    throw createError({ statusCode: 400, message: '元の文章が保存されていないため、作り直せません。' })
  }

  const minutes = await structureTranscript(event, record.transcript, normalizeMode(body?.mode))
  // タグは AI が付けるものではない（利用者の整理の印）ので、作り直しても保存済みのものを引き継ぐ
  minutes.tags = record.minutes.tags

  return { minutes }
})
