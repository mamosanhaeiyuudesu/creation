// 「使ってよいか」の判定のうち、入出力を持たない部分。
// ここだけ純粋関数にしてあるのは、**モニター期間の切り替えが事業の根っこの分岐**で、
// 実際にお金が絡むところなので、数値と文字列で確かめられるようにしておきたいため。

import { isActiveStatus } from '~/types/billing'

/**
 * モニター期間フラグの読み取り。
 * 環境変数は文字列で来るので（NUXT_PUBLIC_MONITOR_MODE=false）、
 * **"false" という文字列を取りこぼさないこと**が要点。
 * 迷ったらモニター期間（無料）側へ倒す＝設定ミスでお客さんを止めてしまわないように。
 */
export function parseMonitorMode(value: unknown): boolean {
  return String(value) !== 'false'
}

/**
 * モニター期間中は無条件で使える。有料モードでは、運営者が支払い不要にした人（管理者を含む）と、
 * 契約が有効な人だけが使える。
 */
export function canUseFeatures(opts: { monitorMode: boolean; status: string; freeAccess?: boolean }): boolean {
  if (opts.monitorMode) return true
  if (opts.freeAccess) return true
  return isActiveStatus(opts.status)
}

/**
 * 承認待ちか。承認制の間、管理者でも承認済みでもない人は AI を使う機能を止める。
 * ★モニター期間かどうかとは関係なく効く（モニター期間中こそ、誰でも無料で使えてしまうのを止めるため）。
 */
export function isPendingApproval(opts: { approvalRequired: boolean; isAdmin: boolean; approved: boolean }): boolean {
  if (!opts.approvalRequired) return false
  return !opts.isAdmin && !opts.approved
}

/**
 * 管理者の一覧（環境変数 NUXT_ADMIN_UIDS。カンマ区切り）を読む。
 * 空・未設定なら管理者はいない（＝管理画面は誰にも開けない側へ倒す）。
 */
export function parseAdminIds(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * 無料期間を付けてよいか。一度でも契約（サブスクリプション）を作ったことがある人には付けない
 * （解約と再契約を繰り返して無料期間を取り直せないように）。
 */
export function isTrialEligible(opts: { trialDays: number; subscriptionId: string }): boolean {
  return opts.trialDays > 0 && !opts.subscriptionId
}
