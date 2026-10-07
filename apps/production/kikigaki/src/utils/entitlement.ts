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

/** モニター期間中は無条件で使える。有料モードでは契約が有効なときだけ使える */
export function canUseFeatures(opts: { monitorMode: boolean; status: string }): boolean {
  if (opts.monitorMode) return true
  return isActiveStatus(opts.status)
}
