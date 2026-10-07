// 認証まわりの型。サーバー／クライアント共用。

/** ログイン中の利用者。中身は Firebase の ID トークンの claims から作る */
export interface AuthUser {
  /** Firebase の uid */
  id: string
  email: string
  displayName: string
}

/** 画面が持つログイン状態。checked が false のうちは「まだ分からない」＝ログイン画面を出さない */
export interface AuthState {
  user: AuthUser | null
  checked: boolean
}

/** メールリンクのログインで、送信先アドレスを一時的に覚えておく localStorage のキー */
export const EMAIL_LINK_STORAGE_KEY = 'kikigaki:login-email'
