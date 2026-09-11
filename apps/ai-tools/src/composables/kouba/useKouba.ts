import { ref } from 'vue'
import type { KoubaCategory, KoubaIconTarget } from '~/types/kouba'

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

  // AI がアイコンを作成中の対象ID（カテゴリ・タスク共通）。数秒かかり、その間も他の操作はできるので saving とは分けている。
  const iconBusyIds = ref(new Set<string>())

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

  /** カテゴリを末尾（先頭の空き枠）に追加し、続けて AI にアイコンを作らせる。 */
  async function addCategory(name: string) {
    let id = ''
    await withSaving(async () => {
      const created = await $fetch<{ id: string }>('/api/kouba/categories', { method: 'POST', body: { name } })
      id = created.id
      await load()
    })
    if (id) await generateIcon('category', id)
  }

  async function updateCategory(id: string, patch: { name?: string }) {
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

  /** タスクを追加し、続けて AI にアイコンを作らせる。 */
  async function addTask(categoryId: string, title: string) {
    let id = ''
    await withSaving(async () => {
      const created = await $fetch<{ id: string }>('/api/kouba/tasks', { method: 'POST', body: { categoryId, title } })
      id = created.id
      await load()
    })
    if (id) await generateIcon('task', id)
  }

  /**
   * AI にアイコンを作らせる（作成直後の自動生成と、編集時の作り直しで共通）。instruction が空なら名前からおまかせ。
   * 失敗しても元のアイコンのまま残る。他の操作と違い load() せず手元の値だけ差し替える
   * （load() 中は板全体が「読み込み中…」に置き換わり、開いている作り直しポップオーバーの入力まで消えてしまうため）。
   */
  async function generateIcon(target: KoubaIconTarget, id: string, instruction = '') {
    iconBusyIds.value.add(id)
    actionError.value = ''
    try {
      const { icon } = await $fetch<{ icon: string }>('/api/kouba/icon', { method: 'POST', body: { target, id, instruction } })
      for (const c of categories.value) {
        if (target === 'category' && c.id === id) c.icon = icon
        const t = target === 'task' ? c.tasks.find((t) => t.id === id) : undefined
        if (t) t.icon = icon
      }
    } catch (e: any) {
      actionError.value = e?.data?.message || 'アイコンの作成に失敗しました'
    } finally {
      iconBusyIds.value.delete(id)
    }
  }

  async function updateTask(id: string, patch: { title?: string; categoryId?: string }) {
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
    iconBusyIds,
    load,
    generateIcon,
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
