import { ref } from 'vue'
import type { KoubaCategory, KoubaIconTarget } from '~/types/kouba'

/** カテゴリは3×3グリッドの9枠まで。 */
export const KOUBA_GRID_SIZE = 9

/**
 * kouba（工数管理）の板データと操作。
 * どの操作も、成功後は load() で板全体を取り直す（規模が小さく、局所パッチの複雑さに見合わないため）。
 * **例外はサブタスクの時間の +/- だけ**＝30分ずつ連打されるので、押すたびに PATCH + 板の再読込をすると重い。
 * 画面はその場で書き換え、サーバーへの保存は最後の操作から少し待ってまとめて1回だけ送る（`setSubtaskHours`）。
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

  // 時間の +/- の保存待ち（サブタスクIDごとに最後の値とタイマーを1つ持つ）。
  // 待ち時間は「連打が止まったと見なすまで」＝長すぎると閉じ際の取りこぼしが増え、短いと連打のたびに飛ぶ。
  const HOURS_SAVE_DELAY_MS = 700
  const pendingHourSaves = new Map<string, { hours: number; timer: ReturnType<typeof setTimeout> }>()

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
    // 他の操作はどれも最後に load() するので、先に時間の保存待ちを送り切る
    // （送る前に取り直すと、まだ保存していない時間が古い値に巻き戻って見える）。
    await flushPendingHours()
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

  /** 手元の合計時間を積み直す（サブタスク→タスク→カテゴリ。サーバーの shapeTask/shapeCategory と同じ計算）。 */
  function recomputeTotals() {
    for (const c of categories.value) {
      for (const t of c.tasks) t.totalHours = t.subtasks.reduce((sum, s) => sum + s.hours, 0)
      c.totalHours = c.tasks.reduce((sum, t) => sum + t.totalHours, 0)
    }
  }

  /**
   * サブタスクの時間の +/-。画面はその場で書き換えて合計まで積み直し、サーバーへの保存だけ
   * HOURS_SAVE_DELAY_MS 待ってまとめる（3回押しても PATCH は1回。板の再読込もしない）。
   * saving を立てないので、保存の往復中もボタンが無効にならず続けて押せる。
   */
  function setSubtaskHours(id: string, hours: number) {
    for (const c of categories.value) {
      for (const t of c.tasks) {
        const subtask = t.subtasks.find((s) => s.id === id)
        if (subtask) subtask.hours = hours
      }
    }
    recomputeTotals()

    const pending = pendingHourSaves.get(id)
    if (pending) clearTimeout(pending.timer)
    pendingHourSaves.set(id, { hours, timer: setTimeout(() => void flushHours(id), HOURS_SAVE_DELAY_MS) })
  }

  /** 保存待ちの時間を1件だけ送る。失敗したら手元の値が嘘になるので板を取り直す。 */
  async function flushHours(id: string) {
    const pending = pendingHourSaves.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingHourSaves.delete(id)
    try {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { hours: pending.hours } })
    } catch (e: any) {
      actionError.value = e?.data?.message || '保存に失敗しました'
      await load()
    }
  }

  /**
   * 保存待ちの時間をすべて送り切る。**モーダルを閉じるとき・画面を離れるとき・他の操作の前**に呼ぶ
   * （待っている間に画面が消えると、その変更がどこにも残らないため）。
   */
  async function flushPendingHours(): Promise<void> {
    if (!pendingHourSaves.size) return
    await Promise.all([...pendingHourSaves.keys()].map((id) => flushHours(id)))
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
    setSubtaskHours,
    flushPendingHours,
    deleteSubtask,
  }
}
