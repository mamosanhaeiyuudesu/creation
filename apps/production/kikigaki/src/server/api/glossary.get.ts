// 「よく出る名前」の読み出し（設定画面の入力欄に出す）。

import { requireUser } from '~/server/utils/auth'
import { loadGlossaryBody } from '~/server/utils/glossary-store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { body: await loadGlossaryBody(event, user.id) }
})
