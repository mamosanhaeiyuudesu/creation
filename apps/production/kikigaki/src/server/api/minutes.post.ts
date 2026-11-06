// 会議のテキスト → AIが議事録の形に整えて保存する仕事を受け付ける。
// AIの処理は裏（キュー）で行い、ここはすぐ { jobId } を返す。できたかどうかは GET /api/minutes/jobs で見る
// （ブラウザを閉じても・スマホで別のアプリに移っても作り続けるため。server/utils/minuteJobs.ts）。
// 確認画面の「このテキストから新しく作る」からは、元の議事録の日付とタグも送られてくる（元は消さない）。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { requireAiAllowance } from '~/server/utils/usage'
import { createJob, enqueueJob } from '~/server/utils/minuteJobs'
import { normalizeTags } from '~/utils/tags'
import { MAX_TRANSCRIPT_CHARS, countTranscriptChars, normalizeMode, transcriptOverMessage } from '~/types/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)
  // 裏で作り始めてから断ると気づきにくいので、使い切っていたらここで先に断る（作るときにも確かめる）
  await requireAiAllowance(event, user.id)

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
  const jobId = await createJob(event, user.id, normalizeMode(body?.mode), {
    transcript,
    audioName: (body?.audioName ?? '').slice(0, 200),
    date: /^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? '') ? body!.date! : '',
    tags: normalizeTags(body?.tags),
  })
  await enqueueJob(event, jobId)

  return { jobId }
})
