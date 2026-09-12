import { ref } from 'vue'
import type { KoubaTheme } from '~/types/kouba'

/**
 * kouba の「今のテーマ」。板（useKouba）とは別に読み書きする＝テーマの保存でカテゴリを取り直す必要がなく、
 * 逆に板の操作でテーマの入力が消えることもないため。
 */
export function useKoubaTheme() {
  const current = ref<KoubaTheme | null>(null)
  const history = ref<KoubaTheme[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    try {
      const res = await $fetch<{ current: KoubaTheme | null; history: KoubaTheme[] }>('/api/kouba/theme')
      current.value = res.current
      history.value = res.history
      error.value = ''
    } catch (e: any) {
      error.value = e?.data?.message || 'テーマの読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  /** テーマを掲げ直す（空文字なら下ろす）。中身が同じなら何も起きない＝サーバー側で弾いている。 */
  async function save(text: string) {
    saving.value = true
    error.value = ''
    try {
      const res = await $fetch<{ current: KoubaTheme | null; history: KoubaTheme[] }>('/api/kouba/theme', {
        method: 'POST',
        body: { text },
      })
      current.value = res.current
      history.value = res.history
    } catch (e: any) {
      error.value = e?.data?.message || 'テーマの保存に失敗しました'
    } finally {
      saving.value = false
    }
  }

  return { current, history, loading, saving, error, load, save }
}
