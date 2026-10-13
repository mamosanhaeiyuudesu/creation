// 会議の文章 → AIが議事録の形に整えて保存する。
// ここまで来たら必ず1件の議事録ができる（下書きという状態は持たない）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { createRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'

/** 1回の会議として受け付ける文章の長さの上限（約2時間ぶんの会話。AI代が膨らむのを防ぐ） */
const MAX_TRANSCRIPT_CHARS = 50_000

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)

  const body = await readBody<{ transcript?: string; audioName?: string }>(event)
  const transcript = (body?.transcript ?? '').trim()

  if (!transcript) {
    throw createError({
      statusCode: 400,
      message: '文章が空でした。中身のあるファイルか、貼り付けた文章でお試しください。',
    })
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    throw createError({
      statusCode: 413,
      message: '文章が長すぎて一度にまとめられません。会議を前半・後半に分けてお試しください。',
    })
  }

  const minutes = await structureTranscript(event, transcript)
  const id = await createRecord(event, user.id, (body?.audioName ?? '').slice(0, 200), transcript, minutes)

  return { id }
})
