// 認証まわりの型。サーバー／クライアント共用。

/** ログイン中の利用者。中身は Firebase の ID トークンの claims から作る */
export interface AuthUser {
  /** Firebase の uid */
  id: string
  email: string
  displayName: string
  /** お休み（退会）に入った日時(UTC)。空ならふつうに使えている */
  withdrawnAt?: string
  /** お休み中のデータを預かる期限(UTC) */
  retainUntil?: string
}

/** お休み中の人に画面が出す情報（/api/me が返す） */
export interface WithdrawnInfo {
  /** 期限の日付（JST の「2031年10月20日」） */
  retainUntilLabel: string
  /** もう預かる期限を過ぎている（再開はできず、消すことだけできる） */
  expired: boolean
}

/** 画面が持つログイン状態。checked が false のうちは「まだ分からない」＝ログイン画面を出さない */
export interface AuthState {
  user: AuthUser | null
  checked: boolean
}

/** メールリンクのログインで、送信先アドレスを一時的に覚えておく localStorage のキー */
export const EMAIL_LINK_STORAGE_KEY = 'kikigaki:login-email'
