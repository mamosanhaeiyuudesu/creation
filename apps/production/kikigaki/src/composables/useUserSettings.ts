// 利用者ごとの設定（アカウント全体）。左メニューの設定欄で変え、PDFをつくるときに読む。
// 画面をまたいで同じ値を見るので useState に置く。

import { defaultUserSettings } from '~/utils/userSettings'
import type { UserSettings } from '~/types/settings'

export function useUserSettings() {
  const { authedFetch } = useAuth()
  const settings = useState<UserSettings>('kk-user-settings', defaultUserSettings)
  const loaded = useState<boolean>('kk-user-settings-loaded', () => false)

  async function load(): Promise<UserSettings> {
    const res = await authedFetch<{ settings: UserSettings }>('/api/settings')
    settings.value = res.settings
    loaded.value = true
    return res.settings
  }

  async function save(next: UserSettings): Promise<UserSettings> {
    const res = await authedFetch<{ settings: UserSettings }>('/api/settings', {
      method: 'PUT',
      body: { settings: next },
    })
    // サーバーが丸めた値（500〜4000）を画面へ返す
    settings.value = res.settings
    loaded.value = true
    return res.settings
  }

  return { settings, loaded, load, save }
}
