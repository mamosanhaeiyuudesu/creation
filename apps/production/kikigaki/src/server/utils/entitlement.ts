// 「この人は機能を使ってよいか」の判定。
//
// ★モニター期間の切り替えはここ1か所に集約してある。
//   SERVICE.monitorMode（src/config/service.ts）が既定値で、
//   環境変数 NUXT_PUBLIC_MONITOR_MODE で上書きできる（"false" で有料モードになる）。
//   モニター期間中は契約状態を一切見ない＝全ユーザーが課金なしで全機能を使える。
//
// 判定そのものは src/utils/entitlement.ts の純粋関数にあり、テストもそちらに書いてある。
// AI を呼ぶ口（/api/transcribe・/api/minutes・/api/minutes/*）の先頭で必ず通すこと。

import type { H3Event } from 'h3'
import { loadSubscription } from '~/server/utils/stripe'
import { canUseFeatures, parseMonitorMode } from '~/utils/entitlement'

/** モニター期間中か */
export function isMonitorMode(event: H3Event): boolean {
  return parseMonitorMode((useRuntimeConfig(event).public as any).monitorMode)
}

/**
 * 有料モードのとき、契約が有効でなければ 402 で断る。
 * モニター期間中は契約状態を読みに行かない（D1へのアクセスを1回節約できる）。
 */
export async function requireEntitlement(event: H3Event, userId: string): Promise<void> {
  const monitorMode = isMonitorMode(event)
  if (monitorMode) return

  const row = await loadSubscription(event, userId)
  if (canUseFeatures({ monitorMode, status: row?.status ?? '' })) return

  throw createError({
    statusCode: 402,
    message: 'お使いいただくには、お支払いの手続きが必要です。「設定」からお手続きください。',
  })
}
