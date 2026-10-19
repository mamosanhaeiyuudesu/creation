// 会議の文章 → AIが議事録の形に整えて保存する。
// ここまで来たら必ず1件の議事録ができる（下書きという状態は持たない）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { createRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'
import { MAX_TRANSCRIPT_CHARS, countTranscriptChars, normalizeMode, transcriptOverMessage } from '~/types/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)

  const body = await readBody<{ transcript?: string; audioName?: string; mode?: string }>(event)
  const transcript = (body?.transcript ?? '').trim()

  if (!transcript) {
    throw createError({
      statusCode: 400,
      message: '文章が空でした。中身のあるファイルか、貼り付けた文章でお試しください。',
    })
  }
  const chars = countTranscriptChars(transcript)
  if (chars > MAX_TRANSCRIPT_CHARS) {
    throw createError({
      statusCode: 413,
      message: transcriptOverMessage(chars),
    })
  }

  // まとめ方（複数人の会議か、主に1人が話した記録か）。古い画面から来たら会議として扱う
  const minutes = await structureTranscript(event, transcript, normalizeMode(body?.mode))
  const id = await createRecord(event, user.id, (body?.audioName ?? '').slice(0, 200), transcript, minutes)

  return { id }
})
