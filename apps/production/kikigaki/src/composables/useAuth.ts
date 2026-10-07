// ログイン・ログアウトと、ID トークンを付けた API 呼び出し。
//
// Firebase の関数は **動的 import** で読む。静的 import にすると firebase/auth が
// サーバー側のバンドルにも入ってしまう（この画面は SSR で骨組みだけ返す作りなので、
// サーバーに認証ライブラリを持ち込む意味がない）。
//
// エラーは Firebase のコードをそのまま出さず、「次に何をすればいいか」が分かる日本語に置き換える。
// 使い手は既存の議事録アプリを使いこなせていない層なので、原因の説明より次の一手を書く。

import { EMAIL_LINK_STORAGE_KEY, type AuthState } from '~/types/auth'

/** Firebase のエラーコード → 画面に出す日本語（次にすべきことを書く） */
function friendlyAuthMessage(err: any): string {
  const code = String(err?.code ?? '')
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ログインの画面が閉じられました。もう一度「Googleではじめる」を押してください。'
    case 'auth/popup-blocked':
      return 'ログインの画面が開けませんでした。もう一度押すと、同じ画面で続けられます。'
    case 'auth/invalid-email':
      return 'メールアドレスの形がちがうようです。「@」の前後に間違いがないか確かめてください。'
    case 'auth/missing-email':
      return 'メールアドレスを入力してください。'
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'このリンクは使えなくなっています（古いリンクか、一度使ったリンクです）。もう一度メールを送ってください。'
    case 'auth/network-request-failed':
      return 'インターネットにつながっていないようです。電波のよい場所で、もう一度お試しください。'
    case 'auth/too-many-requests':
      return '短い時間に何度も試されたため、少しお待ちいただく必要があります。10分ほどしてからお試しください。'
    case 'auth/unauthorized-domain':
      return 'この画面からはログインできない設定になっています。管理者にお知らせください。'
    default:
      return 'ログインできませんでした。少し時間をおいて、もう一度お試しください。'
  }
}

export function useAuth() {
  const state = useState<AuthState>('kk-auth', () => ({ user: null, checked: false }))
  const user = computed(() => state.value.user)
  const isLoggedIn = computed(() => state.value.user !== null)
  /** false のうちは「ログインしているか分からない」＝ログイン画面も本体も出さない */
  const checked = computed(() => state.value.checked)

  const nuxtApp = useNuxtApp()
  const getFbAuth = () => (nuxtApp.$fbAuth as any) ?? null
  const waitReady = async () => {
    const ready = nuxtApp.$fbReady as Promise<void> | undefined
    if (ready) await ready
  }

  function requireAuthReady() {
    const auth = getFbAuth()
    if (!auth) {
      throw new Error('ログインの設定が済んでいません。管理者にお知らせください。')
    }
    return auth
  }

  /** Googleでログイン。ポップアップが使えない環境では同じ画面での遷移に切り替える */
  async function signInWithGoogle(): Promise<void> {
    const auth = requireAuthReady()
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import('firebase/auth')
    // スコープは既定（メールアドレスと名前）だけ。ドライブなどの権限は求めない
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (err: any) {
      const code = String(err?.code ?? '')
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider)
        return
      }
      throw new Error(friendlyAuthMessage(err))
    }
  }

  /**
   * 同じ画面での遷移（リダイレクト）から戻ってきたときの後始末。
   * ログイン自体は Firebase が自動で終わらせるが、失敗したときはここでしか気づけないので
   * ログイン画面の onMounted から呼ぶ。
   */
  async function catchRedirectError(): Promise<string> {
    const auth = getFbAuth()
    if (!auth) return ''
    const { getRedirectResult } = await import('firebase/auth')
    try {
      await getRedirectResult(auth)
      return ''
    } catch (err: any) {
      return friendlyAuthMessage(err)
    }
  }

  /** メールにログイン用のリンクを送る */
  async function sendLoginLink(email: string): Promise<void> {
    const auth = requireAuthReady()
    const address = email.trim()
    if (!address) throw new Error('メールアドレスを入力してください。')

    const { sendSignInLinkToEmail } = await import('firebase/auth')
    // 戻り先は「いま開いているホスト」。設定値を優先すると、ローカルで試したときに本番へ飛ばされる
    // （このホストは Firebase の承認済みドメインに入っている必要がある）。
    const base = window.location.origin.replace(/\/$/, '')
    try {
      await sendSignInLinkToEmail(auth, address, {
        url: `${base}/auth/finish`,
        handleCodeInApp: true,
      })
      // 戻ってきたときに同じアドレスで照合する（別の端末で開いたときは入力し直してもらう）
      try {
        window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, address)
      } catch {
        /* プライベートモード等で保存できなくても、/auth/finish で入力し直せる */
      }
    } catch (err: any) {
      throw new Error(friendlyAuthMessage(err))
    }
  }

  /** いま開いている URL がログイン用のリンクかどうか */
  async function isLoginLink(url: string): Promise<boolean> {
    const auth = getFbAuth()
    if (!auth) return false
    const { isSignInWithEmailLink } = await import('firebase/auth')
    return isSignInWithEmailLink(auth, url)
  }

  /** メールのリンクからのログインを完了させる。email は覚えていない場合だけ画面から渡す */
  async function completeEmailLink(url: string, email?: string): Promise<void> {
    const auth = requireAuthReady()
    const { signInWithEmailLink } = await import('firebase/auth')

    let address = (email ?? '').trim()
    if (!address) {
      try {
        address = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY) ?? ''
      } catch {
        address = ''
      }
    }
    if (!address) throw new Error('確認のため、メールを受け取ったアドレスを入力してください。')

    try {
      await signInWithEmailLink(auth, address, url)
      try {
        window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
      } catch {
        /* 消せなくても害はない */
      }
    } catch (err: any) {
      throw new Error(friendlyAuthMessage(err))
    }
  }

  async function logout(): Promise<void> {
    const auth = getFbAuth()
    if (!auth) return
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  }

  /** いまの ID トークン。期限が近ければ Firebase が自動で更新する */
  async function idToken(forceRefresh = false): Promise<string> {
    await waitReady()
    const auth = getFbAuth()
    const current = auth?.currentUser
    if (!current) throw new Error('ログインが必要です。')
    return await current.getIdToken(forceRefresh)
  }

  /**
   * ID トークンを付けて API を呼ぶ。**サーバーへの呼び出しは必ずこれを通すこと**
   * （素の $fetch では 401 になる）。
   * 401 のときは1度だけトークンを取り直して再試行する（端末がスリープしていた等で古くなっていた場合）。
   */
  async function authedFetch<T>(url: string, options: Record<string, any> = {}): Promise<T> {
    const call = async (forceRefresh: boolean) => {
      const token = await idToken(forceRefresh)
      // $fetch の戻り値はルートから推論した型になるため、呼び出し側が指定した T へ揃える
      return (await $fetch(url, {
        ...options,
        headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` },
      })) as T
    }
    try {
      return await call(false)
    } catch (err: any) {
      if (err?.status === 401 || err?.statusCode === 401) return await call(true)
      throw err
    }
  }

  return {
    user,
    isLoggedIn,
    checked,
    waitReady,
    signInWithGoogle,
    catchRedirectError,
    sendLoginLink,
    isLoginLink,
    completeEmailLink,
    logout,
    idToken,
    authedFetch,
  }
}
