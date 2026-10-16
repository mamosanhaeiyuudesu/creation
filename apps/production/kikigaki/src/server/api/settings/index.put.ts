// 利用者ごとの設定を保存する。来た値はそのまま信じず、範囲内に丸めてから保存する。

import { requireUser } from '~/server/utils/auth'
import { saveUserSettings } from '~/server/utils/settings'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ settings?: unknown }>(event)
  return { settings: await saveUserSettings(event, user.id, body?.settings) }
})
