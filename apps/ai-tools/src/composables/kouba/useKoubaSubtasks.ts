import { ref } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'

/**
 * kouba の「サブタスク」一覧（板・テーマ・達成したこととは無関係な、名前だけのTODOリスト）。
 * 行の上下ボタンで並べ替えられる（ドラッグ&ドロップは2026-09-18に廃止した）。チェックを入れると
 * 完了になり一覧下部へ移動する（`toggleDone`）。ジョブ・タスクへの紐付けは一切持たない。
 */
export function useKoubaSubtasks() {
  const subtasks = ref<KoubaSubtask[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      subtasks.value = await $fetch<KoubaSubtask[]>('/api/kouba/subtasks')
    } catch (e: any) {
      error.value = e?.data?.message || '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function add(title: string) {
    saving.value = true
    error.value = ''
    try {
      const created = await $fetch<KoubaSubtask>('/api/kouba/subtasks', { method: 'POST', body: { title } })
      subtasks.value = [...subtasks.value, created]
    } catch (e: any) {
      error.value = e?.data?.message || '保存に失敗しました'
    } finally {
      saving.value = false
    }
  }

  async function rename(id: string, title: string) {
    error.value = ''
    try {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { title } })
      const target = subtasks.value.find((s) => s.id === id)
      if (target) target.title = title
    } catch (e: any) {
      error.value = e?.data?.message || '保存に失敗しました'
      await load()
    }
  }

  /**
   * 完了(done)の切り替え。チェックを入れると一覧下部の「完了済み」へ移動する（表示側の並び替えのみ）。
   * 手元を先に書き換えてから保存し、失敗したら元に戻す（rename と同じパターン）。
   */
  async function toggleDone(id: string, done: boolean) {
    error.value = ''
    const target = subtasks.value.find((s) => s.id === id)
    const prev = target?.done
    if (target) target.done = done
    try {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { done } })
    } catch (e: any) {
      if (target && prev !== undefined) target.done = prev
      error.value = e?.data?.message || '保存に失敗しました'
    }
  }

  async function remove(id: string) {
    error.value = ''
    try {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'DELETE' })
      subtasks.value = subtasks.value.filter((s) => s.id !== id)
    } catch (e: any) {
      error.value = e?.data?.message || '削除に失敗しました'
    }
  }

  /**
   * 上下ボタン用: 並び順を丸ごと反映する（カテゴリの並べ替えと同じパターン）。
   * 手元の並びを先に入れ替えてから保存し、失敗したら取り直して戻す。
   */
  async function reorder(ids: string[]) {
    const before = subtasks.value
    const byId = new Map(before.map((s) => [s.id, s]))
    const reordered = ids.map((id) => byId.get(id)).filter((s): s is KoubaSubtask => !!s)
    if (reordered.length !== before.length) return
    subtasks.value = reordered
    error.value = ''
    try {
      await $fetch('/api/kouba/subtasks/reorder', { method: 'POST', body: { subtaskIds: ids } })
    } catch (e: any) {
      error.value = e?.data?.message || '並べ替えに失敗しました'
      await load()
    }
  }

  return { subtasks, loading, saving, error, load, add, rename, remove, reorder, toggleDone }
}
