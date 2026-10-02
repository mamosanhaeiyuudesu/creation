import { ref } from 'vue'
import type { KoubaAchievement } from '~/types/kouba'

/**
 * kouba の「達成したこと」一覧（右サイドバー）。板（useKouba）・テーマ（useKoubaTheme）とは別に読み書きする。
 */
export function useKoubaAchievements() {
  const achievements = ref<KoubaAchievement[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      achievements.value = await $fetch<KoubaAchievement[]>('/api/kouba/achievements')
    } catch (e: any) {
      error.value = e?.data?.message || '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  /** 追加後は達成日の新しい順を保つよう並べ直す（過去日付を後から追加することもあるため）。 */
  async function add(text: string, achievedAt: string): Promise<boolean> {
    saving.value = true
    error.value = ''
    try {
      const created = await $fetch<KoubaAchievement>('/api/kouba/achievements', { method: 'POST', body: { text, achievedAt } })
      achievements.value = [...achievements.value, created].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
      return true
    } catch (e: any) {
      error.value = e?.data?.message || '保存に失敗しました'
      return false
    } finally {
      saving.value = false
    }
  }

  /** 内容・日付を後から修正する。 */
  async function update(id: string, text: string, achievedAt: string): Promise<boolean> {
    saving.value = true
    error.value = ''
    try {
      await $fetch(`/api/kouba/achievements/${id}`, { method: 'PATCH', body: { text, achievedAt } })
      achievements.value = achievements.value
        .map((a) => (a.id === id ? { ...a, text, achievedAt: achievedAt.includes('T') ? achievedAt : `${achievedAt}T03:00:00.000Z` } : a))
        .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
      // 保存後にリロードして正確な achievedAt（サーバーが正規化した値）を反映する
      await load()
      return true
    } catch (e: any) {
      error.value = e?.data?.message || '更新に失敗しました'
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(id: string) {
    error.value = ''
    try {
      await $fetch(`/api/kouba/achievements/${id}`, { method: 'DELETE' })
      achievements.value = achievements.value.filter((a) => a.id !== id)
    } catch (e: any) {
      error.value = e?.data?.message || '削除に失敗しました'
    }
  }

  return { achievements, loading, saving, error, load, add, update, remove }
}
