import { ref } from 'vue'
import type { KoubaCategory, KoubaIconTarget, KoubaTask } from '~/types/kouba'

/** カテゴリは3×3グリッドの9枠まで。 */
export const KOUBA_GRID_SIZE = 9

/**
 * kouba（工数管理）の板データと操作。階層は カテゴリ → ジョブ（付箋） → タスク（時間を持つ実作業）。
 * サブタスク（板とは無関係な、名前だけの独立したTODOリスト）は板には含まず `useKoubaSubtasks` が別に読み書きする。
 * どの操作も、成功後は load() で板全体を取り直す（規模が小さく、局所パッチの複雑さに見合わないため）。
 * **例外はタスクの時間の +/- だけ**＝30分ずつ連打されるので、押すたびに PATCH + 板の再読込をすると重い。
 * 画面はその場で書き換え、サーバーへの保存は最後の操作から少し待ってまとめて1回だけ送る（`setTaskHours`）。
 */
export function useKouba() {
  const categories = ref<KoubaCategory[]>([])
  const loading = ref(true)
  const loadError = ref('')

  // 追加・変更・削除まわりの共通状態。個別のローディング/エラーを持たず1本にまとめている
  // （同時に複数の操作を並行させるUIが無いため）。
  const saving = ref(false)
  const actionError = ref('')

  // AI がアイコンを作成中の対象ID（カテゴリ・ジョブ共通）。数秒かかり、その間も他の操作はできるので saving とは分けている。
  const iconBusyIds = ref(new Set<string>())

  // 時間の +/- の保存待ち（タスクIDごとに最後の値とタイマーを1つ持つ）。
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

  async function updateCategory(id: string, patch: { name?: string; description?: string }) {
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

  /**
   * ジョブ（付箋）を追加し、続けて AI にアイコンを作らせる。
   * 作成直後は「＋」を押したその1カテゴリにだけ属する＝複数カテゴリへの掲載はジョブ詳細モーダルで後から設定する。
   */
  async function addJob(categoryId: string, title: string) {
    let id = ''
    await withSaving(async () => {
      const created = await $fetch<{ id: string }>('/api/kouba/jobs', { method: 'POST', body: { categoryIds: [categoryId], title } })
      id = created.id
      await load()
    })
    if (id) await generateIcon('job', id)
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
        const j = target === 'job' ? c.jobs.find((j) => j.id === id) : undefined
        if (j) j.icon = icon
      }
    } catch (e: any) {
      actionError.value = e?.data?.message || 'アイコンの作成に失敗しました'
    } finally {
      iconBusyIds.value.delete(id)
    }
  }

  /** patch.categoryIds は「所属することになるカテゴリの集合」を丸ごと差し替える（増減の両方を1回で表す）。 */
  async function updateJob(id: string, patch: { title?: string; categoryIds?: string[]; focused?: boolean; description?: string }) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/jobs/${id}`, { method: 'PATCH', body: patch })
      await load()
    })
  }

  async function deleteJob(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/jobs/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  /**
   * ドラッグ&ドロップ用: カテゴリの並び順（＝3×3グリッド内の位置）を丸ごと反映する。
   * 時間の +/- と同じく、手元の並びを先に入れ替えてから保存する（load() で取り直すと
   * 板全体が一瞬「読み込み中…」に化けて、掴んで放した手応えが消えるため）。失敗したら取り直して戻す。
   */
  async function reorderCategories(categoryIds: string[]) {
    const before = categories.value
    const byId = new Map(before.map((c) => [c.id, c]))
    const reordered = categoryIds.map((id) => byId.get(id)).filter((c): c is KoubaCategory => !!c)
    if (reordered.length !== before.length) return
    categories.value = reordered
    actionError.value = ''
    try {
      await $fetch('/api/kouba/categories/reorder', { method: 'POST', body: { categoryIds } })
    } catch (e: any) {
      actionError.value = e?.data?.message || '並べ替えに失敗しました'
      await load()
    }
  }

  /** ドラッグ&ドロップ用: 指定カテゴリのジョブの並び順（+必要なら移動）を丸ごと反映する。 */
  async function reorderJobs(categoryId: string, jobIds: string[]) {
    await withSaving(async () => {
      await $fetch('/api/kouba/jobs/reorder', { method: 'POST', body: { categoryId, jobIds } })
      await load()
    })
  }

  async function addTask(jobId: string, title: string, hours: number) {
    await withSaving(async () => {
      await $fetch('/api/kouba/tasks', { method: 'POST', body: { jobId, title, hours } })
      await load()
    })
  }

  async function updateTask(id: string, patch: { title?: string; hours?: number }) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'PATCH', body: patch })
      await load()
    })
  }

  /**
   * ドラッグ&ドロップ用: 指定ジョブ内のタスクの並び順を丸ごと反映する。
   * ジョブは複数カテゴリに重複して表示されることがあるので、カテゴリ・ジョブのreorderと同じく
   * 手元を先に入れ替えてから保存する（load()で取り直すと板全体が一瞬「読み込み中…」に化けるため）。
   * 全カテゴリ・全ジョブを走査してjobIdが一致する箇所すべてのtasksを並べ替える（時間の+/-や合計と同じ「同期」）。
   */
  async function reorderTasks(jobId: string, taskIds: string[]) {
    for (const c of categories.value) {
      for (const j of c.jobs) {
        if (j.id !== jobId) continue
        const byId = new Map(j.tasks.map((t) => [t.id, t]))
        const reordered = taskIds.map((id) => byId.get(id)).filter((t): t is KoubaTask => !!t)
        if (reordered.length === j.tasks.length) j.tasks = reordered
      }
    }
    actionError.value = ''
    try {
      await $fetch('/api/kouba/tasks/reorder', { method: 'POST', body: { jobId, taskIds } })
    } catch (e: any) {
      actionError.value = e?.data?.message || '並べ替えに失敗しました'
      await load()
    }
  }

  /**
   * 手元の合計時間を積み直す（タスク→ジョブ→カテゴリ。サーバーの shapeJob/shapeCategory と同じ計算）。
   * カテゴリをまたいで同じジョブが複数の配列に入っていることがある（1ジョブが複数カテゴリに属する場合）が、
   * 全カテゴリ・全ジョブを漏れなく回すのでどちらの出現にも同じ値が積まれる＝結果として同期する。
   */
  function recomputeTotals() {
    for (const c of categories.value) {
      for (const j of c.jobs) j.totalHours = j.tasks.reduce((sum, t) => sum + t.hours, 0)
      c.totalHours = c.jobs.reduce((sum, j) => sum + j.totalHours, 0)
    }
  }

  /**
   * タスクの時間の +/-。画面はその場で書き換えて合計まで積み直し、サーバーへの保存だけ
   * HOURS_SAVE_DELAY_MS 待ってまとめる（3回押しても PATCH は1回。板の再読込もしない）。
   * saving を立てないので、保存の往復中もボタンが無効にならず続けて押せる。
   * **ジョブが複数カテゴリに属していても**、全カテゴリ・全ジョブを走査して id が一致する箇所すべてを
   * 書き換えるので、どのカテゴリ経由で開いた分にも同じ値が反映される（同期のための特別な仕組みは無い）。
   */
  function setTaskHours(id: string, hours: number) {
    for (const c of categories.value) {
      for (const j of c.jobs) {
        const task = j.tasks.find((t) => t.id === id)
        if (task) task.hours = hours
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
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'PATCH', body: { hours: pending.hours } })
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

  async function deleteTask(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/tasks/${id}`, { method: 'DELETE' })
      await load()
    })
  }

  // サブタスク（タスクにぶら下がる細目。タスクに紐付かない分もある）は板の入れ子には含まれない＝
  // `useKoubaSubtasks` が別に読み書きする。DONE/削除で板側のタスク時間が変わることがあるので、
  // ページ側がその操作のあとにこの `load()` を呼んで板を取り直す。

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
    reorderCategories,
    addJob,
    updateJob,
    deleteJob,
    reorderJobs,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    setTaskHours,
    flushPendingHours,
  }
}
