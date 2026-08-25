// Stage2: 文字起こし → Claude が議事録の構造化JSONを作り、下書き（status='draft'）として保存する。
// 保存されるだけで Google には何も送らない。送信は承認（api/kikigaki/approve.post.ts）だけが行う。

import { requireKikigakiUser, createRecord } from '~/server/utils/kikigaki'
import { structureTranscript } from '~/server/utils/kikigaki-ai'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const body = await readBody<{ transcript?: string; audioName?: string }>(event)

  const transcript = (body?.transcript ?? '').trim()
  if (!transcript) throw createError({ statusCode: 400, message: '文字起こしが空です' })

  const minutes = await structureTranscript(event, transcript)
  const id = await createRecord(event, user.id, (body?.audioName ?? '').slice(0, 200), transcript, minutes)

  return { id, minutes }
})
