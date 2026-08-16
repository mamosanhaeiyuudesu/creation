export interface AuthUser {
  id: string
  username: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const checked = useState<boolean>('auth-checked', () => false)
  const isLoggedIn = computed(() => user.value !== null)

  const checkAuth = async () => {
    if (checked.value) return
    try {
      const me = await $fetch<AuthUser>('/api/auth/me')
      user.value = me
    } catch {
      user.value = null
    }
    checked.value = true
  }

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const me = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    user.value = me
    checked.value = true
    return me
  }

  // アカウントの新規作成はアプリから行えない（DBを直接操作して発行する）。
  // 代わりに、現在のパスワードを知っていれば本人がパスワードを変更できる。
  const changePassword = async (
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthUser> => {
    const me = await $fetch<AuthUser>('/api/auth/password', {
      method: 'POST',
      body: { username, currentPassword, newPassword },
    })
    user.value = me
    checked.value = true
    return me
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, isLoggedIn, checked, checkAuth, login, changePassword, logout }
}
