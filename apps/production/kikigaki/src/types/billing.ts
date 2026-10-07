// 契約状態の型。サーバー／クライアント共用。

/** Stripe のサブスクリプションの状態のうち「使える」と見なすもの */
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const

export interface BillingStatus {
  /** モニター期間中か（true なら課金なしで全機能が使える） */
  monitorMode: boolean
  /** いま使える状態か（モニター期間中は常に true） */
  active: boolean
  /** Stripe 側の状態（active / trialing / past_due / canceled など）。未契約なら空文字 */
  status: string
  /** 次回の支払日（YYYY-MM-DD）。分からなければ空文字 */
  currentPeriodEnd: string
  /** 期間の終わりで解約される予定か */
  cancelAtPeriodEnd: boolean
}

export function isActiveStatus(status: string): boolean {
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
}
