// ローカル dev 専用の確認口。モニター期間フラグの切り替えが効いているかを、
// Firebase のログインなしで確かめるためのもの（完了条件の確認用）。
//
//   curl 'http://localhost:3009/api/dev/entitlement?userId=test-user-uid'
//
// `import.meta.dev` が false の本番では 404 を返す（口そのものを出さない）。
// ★requireEntitlement を**本番と同じ経路で**呼ぶこと（ここで判定を書き写すと、
//   本番の分岐を確かめたことにならない）。

import { isMonitorMode, requireEntitlement } from '~/server/utils/entitlement'
import { loadSubscription } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, message: 'Not Found' })

  const userId = String(getQuery(event).userId ?? '')
  if (!userId) throw createError({ statusCode: 400, message: 'userId を付けてください' })

  const monitorMode = isMonitorMode(event)
  const row = await loadSubscription(event, userId)

  try {
    await requireEntitlement(event, userId)
    return { monitorMode, status: row?.status ?? '', allowed: true, message: '' }
  } catch (e: any) {
    return {
      monitorMode,
      status: row?.status ?? '',
      allowed: false,
      statusCode: e?.statusCode ?? 0,
      message: e?.message ?? '',
    }
  }
})
