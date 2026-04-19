export interface DeepheartUser {
  id: string
  username: string
}

interface DevAccount {
  id: string
  username: string
  password: string
}

const LS_CURRENT = 'dh-current-user'
const LS_ACCOUNTS = 'dh-accounts'

function readAccounts(): DevAccount[] {
  try {
    return JSON.parse(localStorage.getItem(LS_ACCOUNTS) ?? '[]') as DevAccount[]
  } catch {
    return []
  }
}

function writeAccounts(accounts: DevAccount[]) {
  localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts))
}

export function useDeepheartAuth() {
  const user = useState<DeepheartUser | null>('deepheart-auth-user', () => null)
  const checked = useState<boolean>('deepheart-auth-checked', () => false)
  const isLoggedIn = computed(() => user.value !== null)

  const dev = import.meta.dev

  const checkAuth = async () => {
    if (checked.value) return
    if (dev) {
      if (import.meta.client) {
        try {
          const raw = localStorage.getItem(LS_CURRENT)
          user.value = raw ? JSON.parse(raw) : null
        } catch {
          user.value = null
        }
      }
      checked.value = true
      return
    }
    try {
      const me = await $fetch<DeepheartUser>('/api/deepheart/auth/me')
      user.value = me
    } catch {
      user.value = null
    }
    checked.value = true
  }

  const register = async (username: string, password: string): Promise<DeepheartUser> => {
    if (dev) {
      if (username.length < 3 || username.length > 30) {
        throw new Error('ユーザー名は3〜30文字で入力してください')
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('ユーザー名は半角英数字とアンダースコアのみ使用できます')
      }
      if (password.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください')
      }
      const accounts = readAccounts()
      if (accounts.some((a) => a.username === username)) {
        throw new Error('このユーザー名はすでに使用されています')
      }
      const id = crypto.randomUUID()
      accounts.push({ id, username, password })
      writeAccounts(accounts)
      const me: DeepheartUser = { id, username }
      localStorage.setItem(LS_CURRENT, JSON.stringify(me))
      user.value = me
      checked.value = true
      return me
    }
    const me = await $fetch<DeepheartUser>('/api/deepheart/auth/register', {
      method: 'POST',
      body: { username, password },
    })
    user.value = me
    checked.value = true
    return me
  }

  const login = async (username: string, password: string): Promise<DeepheartUser> => {
    if (dev) {
      const accounts = readAccounts()
      const found = accounts.find((a) => a.username === username && a.password === password)
      if (!found) {
        throw new Error('ユーザー名またはパスワードが正しくありません')
      }
      const me: DeepheartUser = { id: found.id, username: found.username }
      localStorage.setItem(LS_CURRENT, JSON.stringify(me))
      user.value = me
      checked.value = true
      return me
    }
    const me = await $fetch<DeepheartUser>('/api/deepheart/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    user.value = me
    checked.value = true
    return me
  }

  const logout = async () => {
    if (dev) {
      localStorage.removeItem(LS_CURRENT)
      user.value = null
      return
    }
    await $fetch('/api/deepheart/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, isLoggedIn, checked, checkAuth, login, register, logout }
}
