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

  async function addCategory(name: string, position: number, icon: string) {
    await withSaving(async () => {
      await $fetch('/api/kouba/categories', { method: 'POST', body: { name, position, icon } })
      await load()
    })
  }

  async function updateCategory(id: string, patch: { name?: string; icon?: string }) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/categories/${id}`, { method: 'PATCH', body: patch })
      await load()
    })
  }

  async function deleteCategory(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/categories/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  async function addTask(categoryId: string, title: string, icon: string) {
    await withSaving(async () => {
      await $fetch('/api/kouba/tasks', { method: 'POST', body: { categoryId, title, icon } })
      await load()
    })
  }

  async function updateTask(id: string, patch: { title?: string; icon?: string; categoryId?: string }) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'PATCH', body: patch })
      await load()
    })
  }

  async function deleteTask(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  /** ドラッグ&ドロップ用: 指定カテゴリの並び順（+必要なら移動）を丸ごと反映する。 */
  async function reorderTasks(categoryId: string, taskIds: string[]) {
    await withSaving(async () => {
      await $fetch('/api/kouba/tasks/reorder', { method: 'POST', body: { categoryId, taskIds } })
      await load()
    })
  }

  async function addSubtask(taskId: string, title: string, hours: number) {
    await withSaving(async () => {
      await $fetch('/api/kouba/subtasks', { method: 'POST', body: { taskId, title, hours } })
      await load()
    })
  }

  async function updateSubtask(id: string, patch: { title?: string; hours?: number }) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: patch })
      await load()
    })
  }

  async function deleteSubtask(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'DELETE' })
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
    updateCategory,
    deleteCategory,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
  }
}
