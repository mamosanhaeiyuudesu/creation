import { ref } from 'vue'
import type { KoubaCategory } from '~/types/kouba'

/** カテゴリは3×3グリッドの9枠まで。 */
export const KOUBA_GRID_SIZE = 9

/**
 * kouba（工数管理）の板データと操作。
 * どの操作も、成功後は load() で板全体を取り直す（規模が小さく、局所パッチの複雑さに見合わないため）。
 */
export function useKouba() {
  const categories = ref<KoubaCategory[]>([])
  const loading = ref(true)
  const loadError = ref('')

  // 追加・変更・削除まわりの共通状態。個別のローディング/エラーを持たず1本にまとめている
  // （同時に複数の操作を並行させるUIが無いため）。
  const saving = ref(false)
  const actionError = ref('')

  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      categories.value = await $fetch<KoubaCategory[]>('/api/kouba/categories')
    } catch (e: any) {
      loadError.value = e?.data?.message || '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function withSaving(fn: () => Promise<void>): Promise<void> {
    saving.value = true
    actionError.value = ''
    try {
      await fn()
    } catch (e: any) {
      actionError.value = e?.data?.message || '保存に失敗しました'
    } finally {
      saving.value = false
    }
  }

  async function addCategory(name: string, position: number) {
    await withSaving(async () => {
      await $fetch('/api/kouba/categories', { method: 'POST', body: { name, position } })
      await load()
    })
  }

  async function renameCategory(id: string, name: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/categories/${id}`, { method: 'PATCH', body: { name } })
      await load()
    })
  }

  async function deleteCategory(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/categories/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  async function addTask(categoryId: string, title: string) {
    await withSaving(async () => {
      await $fetch('/api/kouba/tasks', { method: 'POST', body: { categoryId, title } })
      await load()
    })
  }

  async function renameTask(id: string, title: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'PATCH', body: { title } })
      await load()
    })
  }

  async function deleteTask(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  async function addLog(taskId: string, workDate: string, hours: number, note: string) {
    await withSaving(async () => {
      await $fetch('/api/kouba/logs', { method: 'POST', body: { taskId, workDate, hours, note } })
      await load()
    })
  }

  async function deleteLog(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/logs/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  return {
    categories,
    loading,
    loadError,
    saving,
    actionError,
    load,
    addCategory,
    renameCategory,
    deleteCategory,
    addTask,
    renameTask,
    deleteTask,
    addLog,
    deleteLog,
  }
}
