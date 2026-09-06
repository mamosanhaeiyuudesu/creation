// レビュー画面の「AIで内容を修正」用。指示欄1つで議事録全体をAIに書き換えさせる。
// structure.post.ts と違いDBへの保存はしない（クライアント側の編集状態を書き換えるだけで、
// 保存・PDF化は既存の「保存」「PDFでダウンロード」ボタンに任せる）。

import { requireKikigakiUser } from '~/server/utils/kikigaki'
import { reviseMinutes } from '~/server/utils/kikigaki-ai'
import { emptyMinutes } from '~/types/kikigaki'
import type { KikigakiMinutes } from '~/types/kikigaki'

export default defineEventHandler(async (event) => {
  await requireKikigakiUser(event)
  const body = await readBody<{ minutes?: KikigakiMinutes; transcript?: string; instruction?: string }>(event)

  const instruction = (body?.instruction ?? '').trim()
  if (!instruction) throw createError({ statusCode: 400, message: '指示が空です' })

  const minutes = body?.minutes ?? emptyMinutes()
  const transcript = body?.transcript ?? ''

  const revised = await reviseMinutes(event, minutes, transcript, instruction)
  // printSettings（PDFの目安文字数）は修正指示の対象外。AIが触れていないのでそのまま引き継ぐ。
  revised.printSettings = minutes.printSettings ?? revised.printSettings

  return { minutes: revised }
})
