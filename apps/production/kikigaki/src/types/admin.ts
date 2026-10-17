// 管理画面の型。サーバー／クライアント共用。
// 議事録の中身（名前・本文・元の文章）は管理画面に出さない。会議は他人のもので、暗号化して預かっているため。

export interface AdminUserRow {
  id: string
  email: string
  displayName: string
  /** 登録日・最後にログインした日（YYYY-MM-DD HH:MM、JST） */
  createdAt: string
  lastLoginAt: string
  recordCount: number
  /** 今月のAI利用の割合（上限に対する％） */
  usedPercent: number
  /** 今月のAI代のおおよその円（1ドル=JPY_PER_USD で換算） */
  costYen: number
  /** Stripe の契約状態（未契約なら空文字） */
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  /** 管理者（環境変数で指定）か */
  isAdmin: boolean
  /** 承認済みか（管理者は常に true）。承認制を外しているときも true */
  approved: boolean
  /** 支払い不要の指定 */
  freeAccess: boolean
  note: string
  /** いま使えるか（承認・モニター期間・管理者・支払い不要・契約を合わせた結果） */
  canUse: boolean
}

export interface AdminSummary {
  userCount: number
  /** 承認待ちの人（承認制のときだけ数える） */
  pendingCount: number
  /** 承認制か */
  approvalRequired: boolean
  /** 契約が有効な人（無料期間・支払い遅れを含む） */
  payingCount: number
  trialingCount: number
  paymentProblemCount: number
  freeAccessCount: number
  recordCount: number
  /** 直近30日に作られた議事録 */
  recentRecordCount: number
  /** 今月のAI代の合計（円・おおよそ） */
  monthCostYen: number
  monitorMode: boolean
}

export interface AdminAuditRow {
  id: number
  createdAt: string
  adminEmail: string
  action: string
  targetEmail: string
  detail: string
}
