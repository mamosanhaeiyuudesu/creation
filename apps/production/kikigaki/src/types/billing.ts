// 契約状態の型。サーバー／クライアント共用。

/**
 * Stripe のサブスクリプションの状態のうち「使える」と見なすもの。
 * **past_due（引き落としに失敗し、Stripe が自動で請求し直している最中）も使える側に入れている**
 * （2026-10-16 決定）。カードの期限切れなどで1回落ちただけの人を、すぐ止めないための猶予。
 * 請求し直しがすべて失敗したら、Stripe の設定（Billing → Revenue recovery）で canceled か unpaid に
 * 変わり、そこで使えなくなる。猶予の長さは Stripe 側の再請求の設定で決まる。
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const

/** 支払いに問題があり、本人にカードの更新をお願いしたい状態 */
export const PAYMENT_PROBLEM_STATUSES = ['past_due', 'unpaid'] as const

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
  /** 運営者の設定（管理者・支払い不要の指定）で、契約なしに使えるか */
  freeAccess: boolean
  /** 引き落としに失敗している（カードの更新をお願いする） */
  paymentProblem: boolean
  /** 無料期間を付けて契約できるか（一度も契約したことがない人だけ） */
  trialEligible: boolean
  /** 無料期間の日数（画面の文言用） */
  trialDays: number
}

export function isActiveStatus(status: string): boolean {
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
}

export function isPaymentProblem(status: string): boolean {
  return (PAYMENT_PROBLEM_STATUSES as readonly string[]).includes(status)
}
