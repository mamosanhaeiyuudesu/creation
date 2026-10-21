// 認証まわりの型。サーバー／クライアント共用。

/** ログイン中の利用者。中身は Firebase の ID トークンの claims から作る */
export interface AuthUser {
  /** Firebase の uid */
  id: string
  email: string
  displayName: string
  /** 退会に入った日時(UTC)。空ならふつうに使えている */
  withdrawnAt?: string
  /** 削除予定日(UTC)。空ならお休み（期限なし） */
  deleteAfter?: string
}

/** 退会中の人に画面が出す情報（/api/me が返す） */
export interface WithdrawnInfo {
  /** rest＝お休み（期限なし）／scheduled＝削除予約中 */
  kind: 'rest' | 'scheduled'
  /** 削除予定日（JST の「2026年11月20日」）。お休みは空 */
  deleteAfterLabel: string
  /** 削除予定日を過ぎた（再開はできず、今すぐ消すことだけできる） */
  expired: boolean
}

/** 画面が持つログイン状態。checked が false のうちは「まだ分からない」＝ログイン画面を出さない */
export interface AuthState {
  user: AuthUser | null
  checked: boolean
}

/** メールリンクのログインで、送信先アドレスを一時的に覚えておく localStorage のキー */
export const EMAIL_LINK_STORAGE_KEY = 'kikigaki:login-email'
