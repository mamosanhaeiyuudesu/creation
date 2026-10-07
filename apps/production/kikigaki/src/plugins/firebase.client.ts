// Firebase Authentication の初期化。ブラウザ側だけで動かす（.client）。
//
// ここでやるのは3つだけ:
//   1. Firebase アプリと Auth の用意
//   2. ログイン状態（onIdTokenChanged）を useState へ写す
//   3. 「最初の状態確認が終わったか」を待てるように Promise を配る
//
// ログイン・ログアウトの操作そのものは composables/useAuth.ts にある。

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onIdTokenChanged, type Auth } from 'firebase/auth'
import type { AuthState } from '~/types/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const state = useState<AuthState>('kk-auth', () => ({ user: null, checked: false }))

  // 設定が入っていない環境（.env を書く前のローカルなど）では、
  // ログインできないことが画面から分かるように checked だけ立てて終わる。
  if (!config.firebaseApiKey || !config.firebaseProjectId) {
    state.value = { user: null, checked: true }
    return {
      provide: {
        fbAuth: null as Auth | null,
        fbReady: Promise.resolve(),
      },
    }
  }

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: String(config.firebaseApiKey),
      authDomain: String(config.firebaseAuthDomain),
      projectId: String(config.firebaseProjectId),
    })
  const auth = getAuth(app)

  let markReady: () => void = () => {}
  const fbReady = new Promise<void>((resolve) => {
    markReady = resolve
  })

  // ページを開き直したときの復元も、ログイン・ログアウトも、トークンの自動更新も
  // すべてこのコールバックに来る（初回は必ず1度呼ばれる）。
  onIdTokenChanged(auth, (user) => {
    state.value = {
      user: user
        ? { id: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' }
        : null,
      checked: true,
    }
    markReady()
  })

  return {
    provide: {
      fbAuth: auth as Auth | null,
      fbReady,
    },
  }
})
