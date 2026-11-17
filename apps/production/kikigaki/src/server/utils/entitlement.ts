// 「この人は機能を使ってよいか」の判定。
//
// ★モニター期間の切り替えはここ1か所に集約してある。
//   SERVICE.monitorMode（src/config/service.ts）が既定値で、
//   環境変数 NUXT_PUBLIC_MONITOR_MODE で上書きできる（"false" で有料モードになる）。
//   モニター期間中は契約状態を一切見ない＝全ユーザーが課金なしで全機能を使える。
//
// 判定そのものは src/utils/entitlement.ts の純粋関数にあり、テストもそちらに書いてある。
// AI を呼ぶ口（/api/minutes・/api/minutes/*）の先頭で必ず通すこと。

import type { H3Event } from 'h3'
import { loadSubscription } from '~/server/utils/stripe'
import { hasFreeAccess, isPending } from '~/server/utils/admin'
import { canUseFeatures, parseMonitorMode } from '~/utils/entitlement'

/** モニター期間中か */
export function isMonitorMode(event: H3Event): boolean {
  return parseMonitorMode((useRuntimeConfig(event).public as any).monitorMode)
}

/** 契約なしでも広く使える人か（モニター期間中・管理者・支払い不要の指定・契約が有効な人）。それ以外は無料枠の人 */
export async function hasFullAccess(event: H3Event, userId: string): Promise<boolean> {
  if (isMonitorMode(event)) return true
  if (await hasFreeAccess(event, userId)) return true
  const row = await loadSubscription(event, userId)
  return canUseFeatures({ monitorMode: false, status: row?.status ?? '' })
}

/**
 * 使い始めてよいか。承認制のときだけ止める。
 * 契約が無い人も、無料枠（SERVICE.limits.freeMonthlyBudgetUsd）のあいだは使える。
 * 無料枠を使い切ったかどうかは、AIを呼ぶ前に requireAiAllowance（utils/usage.ts）が 402 で断る。
 */
export async function requireEntitlement(event: H3Event, userId: string): Promise<void> {
  // 承認制の間は、承認されるまで止める（URLを知っていれば誰でも登録できるため）
  if (await isPending(event, userId)) {
    throw createError({
      statusCode: 403,
      message: 'ただいま利用の準備中です。準備ができしだい、お使いいただけるようになります。',
    })
  }
}
