// 会議のテキスト → AIが議事録の形に整えて保存する。
// ここまで来たら必ず1件の議事録ができる（下書きという状態は持たない）。
// 確認画面の「このテキストから新しく作る」からは、元の議事録の日付とタグも送られてくる（元は消さない）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { createRecord } from '~/server/utils/minutes'
import { structureTranscript } from '~/server/utils/minutes-ai'
import { normalizeTags } from '~/utils/tags'
import { MAX_TRANSCRIPT_CHARS, countTranscriptChars, normalizeMode, transcriptOverMessage } from '~/types/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)

  const body = await readBody<{ transcript?: string; audioName?: string; mode?: string; date?: string; tags?: unknown }>(event)
  const transcript = (body?.transcript ?? '').trim()

  if (!transcript) {
    throw createError({
      statusCode: 400,
      message: 'テキストが空でした。中身のあるファイルか、貼り付けたテキストでお試しください。',
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
  // 元の議事録で手で直した日付を優先する（AIが読み取る日付より確か）
  if (/^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? '')) minutes.date = body!.date!
  minutes.tags = normalizeTags(body?.tags)
  const id = await createRecord(event, user.id, (body?.audioName ?? '').slice(0, 200), transcript, minutes)

  return { id }
})
