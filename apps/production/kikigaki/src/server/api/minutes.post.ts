// 文字起こし → AIが議事録の形に整えて保存する。
// ここまで来たら必ず1件の議事録ができる（下書きという状態は持たない）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { createRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'
import { loadGlossaryTerms } from '~/server/utils/glossary-store'
import { addUsage, requireRecordAllowance } from '~/server/utils/usage'

/** 1回の会議として受け付ける文字起こしの長さの上限（約8時間ぶんの会話を想定した安全弁） */
const MAX_TRANSCRIPT_CHARS = 150_000

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)
  await requireRecordAllowance(event, user.id)

  const body = await readBody<{ transcript?: string; audioName?: string }>(event)
  const transcript = (body?.transcript ?? '').trim()

  if (!transcript) {
    throw createError({
      statusCode: 400,
      message:
        '声が聞き取れませんでした。スマホを話す人の近くに置いて録音し直すか、別のファイルをお試しください。',
    })
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    throw createError({
      statusCode: 413,
      message: '録音が長すぎて一度にまとめられません。会議を前半・後半に分けてお試しください。',
    })
  }

  const terms = await loadGlossaryTerms(event, user.id)
  const minutes = await structureTranscript(event, transcript, terms)
  const id = await createRecord(event, user.id, (body?.audioName ?? '').slice(0, 200), transcript, minutes)
  await addUsage(event, user.id, { records: 1 })

  return { id }
})
