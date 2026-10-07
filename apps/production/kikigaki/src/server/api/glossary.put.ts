// 「よく出る名前」の保存。保存の時点で正規化した本文を返すので、画面はそれで入力欄を置き換える
// （捨てられた行が残ったままだと、効いていると誤解させる）。

import { requireUser } from '~/server/utils/auth'
import { saveGlossaryBody } from '~/server/utils/glossary-store'

/** 入力欄に貼り付けられる量の上限（1語30文字 × 40語 ＋ 改行ぶんの余裕） */
const MAX_BODY_LENGTH = 4000

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ body?: string }>(event)
  const text = body?.body ?? ''
  if (text.length > MAX_BODY_LENGTH) {
    throw createError({ statusCode: 413, message: '名前が多すぎます。よく出てくるものだけに絞ってください。' })
  }
  return { body: await saveGlossaryBody(event, user.id, text) }
})
