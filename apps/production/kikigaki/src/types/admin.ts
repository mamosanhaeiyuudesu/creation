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
  /** 退会中の種類。空＝ふつうに使っている／rest＝お休み（期限なし）／scheduled＝削除予約中 */
  withdrawn: '' | 'rest' | 'scheduled'
  /** 削除予定日（JST の日付。お休みは空）と、その日を過ぎて消せるか */
  deleteAfter: string
  deletionDue: boolean
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
  /** お休み中の人 / 削除予約中の人 / うち予定日を過ぎて消せる人 */
  restCount: number
  scheduledCount: number
  dueCount: number
  storage: AdminStorage
}

/** D1 の使用量の目安 */
export interface AdminStorage {
  /** D1 の大きさ（D1 が返す値。空いた領域も含む） */
  dbBytes: number
  /** 上限（Workers の無料プランの1データベースあたり） */
  limitBytes: number
  /** 議事録1件あたりの平均（元の文章＋議事録本体の暗号文の長さ） */
  avgRecordBytes: number
  /** このままの平均で、あと何件入るか（おおよそ） */
  remainingRecords: number
}

export interface AdminAuditRow {
  id: number
  createdAt: string
  adminEmail: string
  action: string
  targetEmail: string
  detail: string
}
