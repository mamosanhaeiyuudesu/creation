// 利用者ごとの設定を返す（左メニューの設定欄と、PDFを作るときに使う）。

import { requireUser } from '~/server/utils/auth'
import { loadUserSettings } from '~/server/utils/settings'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { settings: await loadUserSettings(event, user.id) }
})
