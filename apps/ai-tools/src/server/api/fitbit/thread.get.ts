import { resolveUserId, getStatus, getRawHistory } from '~/server/utils/fitbit'
import { generateAdvice } from '~/server/utils/fitbit-advice'
import { listThread } from '~/server/utils/fitbit-thread'
import { todayJST } from '~/utils/jst'

/** アドバイス＆対話の継続スレッドを返す。開くたびに現在スロットのアドバイスを（無ければ）投稿する。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const date = (getQuery(event).date as string) || todayJST()

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  // 現在スロットのアドバイスをスレッドへ自動投稿（重複時は既存を再利用）。失敗しても対話表示は続行。
  try {
    const history = await getRawHistory(event, userId, date, 8)
    if (history.length) await generateAdvice(event, userId, history)
  } catch { /* アドバイス生成失敗はスレッド表示を妨げない */ }

  const messages = await listThread(event, userId)
  return { messages }
})
