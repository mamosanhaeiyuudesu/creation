<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useKouba, KOUBA_GRID_SIZE } from '~/composables/kouba/useKouba'
import { useKoubaTheme } from '~/composables/kouba/useKoubaTheme'
// サブタスク機能は一時的にコメントアウト中（2026-09-16）。実装（composable・コンポーネント・API・DB）は
// そのまま残してあるので、下のコメントを外せば復活する。関連箇所すべてに同じ日付コメントを付けてある。
// import { useKoubaSubtasks } from '~/composables/kouba/useKoubaSubtasks'
import { useKoubaAchievements } from '~/composables/kouba/useKoubaAchievements'
import KoubaJobModal from '~/components/kouba/KoubaJobModal.vue'
import KoubaThemeBanner from '~/components/kouba/KoubaThemeBanner.vue'
import KoubaThemeHistoryModal from '~/components/kouba/KoubaThemeHistoryModal.vue'
// import KoubaSubtasksSection from '~/components/kouba/KoubaSubtasksSection.vue'
// import type { KoubaTaskOption } from '~/components/kouba/KoubaSubtasksSection.vue'
// import KoubaSubtaskFormModal from '~/components/kouba/KoubaSubtaskFormModal.vue'
import KoubaAchievementsSection from '~/components/kouba/KoubaAchievementsSection.vue'
import KoubaAchievementFormModal from '~/components/kouba/KoubaAchievementFormModal.vue'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'
import KoubaIconEditor from '~/components/kouba/KoubaIconEditor.vue'
import KoubaConfirmModal from '~/components/kouba/KoubaConfirmModal.vue'
import type { KoubaCategory, KoubaJob, KoubaTask, KoubaAchievement } from '~/types/kouba'
import { KOUBA_DESCRIPTION_MAX } from '~/types/kouba'

useHead({
  title: import.meta.dev ? '工数 (dev)' : '工数',
  link: [
    {
      key: 'icon',
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱️</text></svg>`,
    },
    { rel: 'manifest', href: '/manifest-kouba.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-kouba.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'タスク管理' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#0f172a' },
  ],
})

const isDev = import.meta.dev
const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)
const showSettingsMenu = ref(false)

const {
  categories, loading, loadError, saving, actionError, iconBusyIds, load, generateIcon,
  addCategory, updateCategory, deleteCategory, reorderCategories,
  addJob, updateJob, deleteJob, reorderJobs,
  addTask, updateTask, deleteTask, reorderTasks, setTaskHours, flushPendingHours,
} = useKouba()

// ── 今のテーマ（板のトップに掲げる一言）──────────────────────────────
const {
  current: currentTheme, history: themeHistory, saving: themeSaving, error: themeError,
  load: loadTheme, save: saveTheme,
} = useKoubaTheme()
const showThemeHistory = ref(false)

// ── サブタスクは一時的にコメントアウト中（2026-09-16）。以下、composable・handlerごとまとめて無効化 ──────────────────────────────
// const {
//   subtasks, saving: subtasksSaving, error: subtasksError,
//   load: loadSubtasks, add: addSubtaskItem, rename: renameSubtask, setHours: setSubtaskHoursItem,
//   flushPendingHours: flushPendingSubtaskHours, toggleDone: toggleSubtaskDoneItem, remove: removeSubtaskItem,
// } = useKoubaSubtasks()
// const showSubtaskFormModal = ref(false)
//
// /** タスクの選択肢（紐付け先）は板（categories）から組み立てる。ジョブは複数カテゴリに重複掲載され得るので id で重複排除。 */
// const taskOptions = computed<KoubaTaskOption[]>(() => {
//   const map = new Map<string, KoubaTaskOption>()
//   for (const c of categories.value) {
//     for (const j of c.jobs) {
//       for (const t of j.tasks) {
//         if (!map.has(t.id)) map.set(t.id, { id: t.id, label: `${c.name} > ${j.title} > ${t.title}`, taskTitle: t.title })
//       }
//     }
//   }
//   return [...map.values()]
// })
// /** ポップアップの送信処理。成功したら true を返す（呼び出し側の「続けて入力しますか？」の判定に使う）。 */
// async function handleAddSubtaskSubmit(payload: { taskId: string | null; title: string; hours: number }): Promise<boolean> {
//   return await addSubtaskItem(payload)
// }
// async function handleRenameSubtask(payload: { id: string; title: string }) {
//   await renameSubtask(payload.id, payload.title)
// }
// /** 時間の +/- は押すたびに保存せず、useKoubaSubtasks 側で手元反映＋まとめ保存にする（タスクの時間と同じやり方）。 */
// function handleSetSubtaskHours(payload: { id: string; hours: number }) {
//   setSubtaskHoursItem(payload.id, payload.hours)
// }
// /** DONEの切り替えは紐づくタスクの時間（板側）も変わるので、続けて板を取り直す。 */
// async function handleToggleSubtaskDone(payload: { id: string; done: boolean }) {
//   await toggleSubtaskDoneItem(payload.id, payload.done)
//   await load()
// }

// ── 達成したこと（画面下部の一覧）──────────────────────────────
const {
  achievements, loading: achievementsLoading, saving: achievementsSaving, error: achievementsError,
  load: loadAchievements, add: addAchievement, remove: removeAchievement,
} = useKoubaAchievements()
const showAchievementFormModal = ref(false)
async function handleAddAchievementSubmit(payload: { text: string; achievedAt: string }): Promise<boolean> {
  return await addAchievement(payload.text, payload.achievedAt)
}

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

// ── カテゴリの枠（3列グリッド、行数は可変）──────────────────────────────
// カテゴリは前から隙間なく詰めて並べる（削除で空いた枠は残さない。サーバーも position を詰め直している）。
// 枠は実際のカテゴリ数ぶんだけ出し、9個未満のときだけ末尾に「カテゴリを追加」の空欄を1つ足す
// （9×9を毎回埋める固定グリッドではなく、カテゴリが少なければ表示も少なくする）。
const isFull = computed(() => categories.value.length >= KOUBA_GRID_SIZE)
const gridSlots = computed<(KoubaCategory | null)[]>(() => (isFull.value ? categories.value : [...categories.value, null]))

// ── カテゴリの追加 ──────────────────────────────
// アイコンは名前を入れて追加したあと AI が作る（useKouba の addCategory が続けて生成する）
// v-for内で同名のテンプレートrefを使うと配列参照になってしまうため、id指定+getElementByIdで直接focusする
const addingCategory = ref(false)
const categoryNameDraft = ref('')

function openAddCategory() {
  addingCategory.value = true
  categoryNameDraft.value = ''
  nextTick(() => document.getElementById('kouba-add-category')?.focus())
}
function cancelAddCategory() {
  addingCategory.value = false
  categoryNameDraft.value = ''
}
async function submitAddCategory() {
  const name = categoryNameDraft.value.trim()
  if (!name) return
  cancelAddCategory()
  await addCategory(name)
}

// ── カテゴリ名の編集 ──────────────────────────────
const editingCategoryId = ref<string | null>(null)
const categoryEditDraft = ref('')
const editingCategoryIconId = ref<string | null>(null)

function startEditCategory(cat: KoubaCategory) {
  editingCategoryId.value = cat.id
  categoryEditDraft.value = cat.name
  nextTick(() => document.getElementById(`kouba-edit-category-${cat.id}`)?.focus())
}
async function commitCategoryEdit(cat: KoubaCategory) {
  if (editingCategoryId.value !== cat.id) return
  editingCategoryId.value = null
  const name = categoryEditDraft.value.trim()
  if (name && name !== cat.name) await updateCategory(cat.id, { name })
}
async function regenerateCategoryIcon(cat: KoubaCategory, instruction: string) {
  await generateIcon('category', cat.id, instruction)
}

// ── カテゴリの説明（任意）の編集 ──────────────────────────────
const editingCategoryDescId = ref<string | null>(null)
const categoryDescDraft = ref('')

function startEditCategoryDesc(cat: KoubaCategory) {
  editingCategoryDescId.value = cat.id
  categoryDescDraft.value = cat.description
  nextTick(() => document.getElementById(`kouba-edit-category-desc-${cat.id}`)?.focus())
}
async function commitCategoryDescEdit(cat: KoubaCategory) {
  if (editingCategoryDescId.value !== cat.id) return
  editingCategoryDescId.value = null
  const description = categoryDescDraft.value.trim()
  if (description !== cat.description) await updateCategory(cat.id, { description })
}

// ── ジョブの追加 ──────────────────────────────
// アイコンはカテゴリと同じく、追加したあと AI が作る
const addingJobFor = ref<string | null>(null)
const jobNameDraft = ref('')

function openAddJob(categoryId: string) {
  addingJobFor.value = categoryId
  jobNameDraft.value = ''
  nextTick(() => document.getElementById(`kouba-add-job-${categoryId}`)?.focus())
}
function cancelAddJob() {
  addingJobFor.value = null
  jobNameDraft.value = ''
}
async function submitAddJob() {
  const title = jobNameDraft.value.trim()
  const categoryId = addingJobFor.value
  if (!title || !categoryId) return
  cancelAddJob()
  await addJob(categoryId, title)
}

// ── ジョブ詳細モーダル ──────────────────────────────
const activeJobId = ref<string | null>(null)
const showJobModal = computed({
  get: () => activeJobId.value !== null,
  set: (v) => {
    // 閉じるときは、時間の +/- の保存待ちを送り切ってから（待っている間に画面が消えると変更が残らない）
    if (!v) {
      void flushPendingHours()
      activeJobId.value = null
    }
  },
})
const activeJob = computed(() => {
  if (!activeJobId.value) return null
  for (const c of categories.value) {
    const j = c.jobs.find((j) => j.id === activeJobId.value)
    if (j) return j
  }
  return null
})
const categoryOptions = computed(() => categories.value.map((c) => ({ id: c.id, name: c.name, icon: c.icon })))

function openJob(jobId: string) {
  activeJobId.value = jobId
}
async function handleUpdateJob(patch: { title?: string; categoryIds?: string[]; focused?: boolean; description?: string }) {
  if (!activeJobId.value) return
  const jobId = activeJobId.value
  await updateJob(jobId, patch)
  // ハイライト（注力中）をONにしたら、載っている全カテゴリで先頭へ移動する
  if (patch.focused) {
    for (const c of categories.value) {
      const ids = c.jobs.map((j) => j.id)
      const idx = ids.indexOf(jobId)
      if (idx <= 0) continue
      ids.splice(idx, 1)
      ids.unshift(jobId)
      await reorderJobs(c.id, ids)
    }
  }
}
async function handleRegenerateJobIcon(instruction: string) {
  if (activeJobId.value) await generateIcon('job', activeJobId.value, instruction)
}
async function handleAddTask(payload: { title: string; hours: number }) {
  if (activeJobId.value) await addTask(activeJobId.value, payload.title, payload.hours)
}
async function handleUpdateTask(payload: { id: string; title: string }) {
  await updateTask(payload.id, { title: payload.title })
}
/** 時間の +/- は押すたびに保存せず、useKouba 側で手元反映＋まとめ保存にする。 */
function handleSetTaskHours(payload: { id: string; hours: number }) {
  setTaskHours(payload.id, payload.hours)
}
async function handleReorderTasks(taskIds: string[]) {
  if (activeJobId.value) await reorderTasks(activeJobId.value, taskIds)
}

// ── 削除確認ポップアップ（カテゴリ/ジョブ/タスクで共通。サブタスクは機能ごとコメントアウト中）──────────────────────────────
type ConfirmTarget =
  | { kind: 'category'; id: string; name: string }
  | { kind: 'job'; id: string; title: string }
  | { kind: 'task'; id: string; title: string }
  // | { kind: 'subtask'; id: string; title: string } // 2026-09-16 コメントアウト中
  | { kind: 'achievement'; id: string; text: string }
const confirmTarget = ref<ConfirmTarget | null>(null)
const confirmMessage = computed(() => {
  const t = confirmTarget.value
  if (!t) return ''
  if (t.kind === 'category')
    return `「${t.name}」を削除しますか？\n他のカテゴリにも表示されているジョブは残ります。このカテゴリだけにあるジョブは、タスクごと削除されます。`
  if (t.kind === 'job') return `「${t.title}」を削除しますか？\nタスクもすべて削除されます。`
  if (t.kind === 'achievement') {
    const preview = t.text.length > 40 ? `${t.text.slice(0, 40)}…` : t.text
    return `「${preview}」を削除しますか？`
  }
  return `「${t.title}」を削除しますか？\nサブタスクもすべて削除されます。`
})

function askDeleteCategory(cat: KoubaCategory) {
  confirmTarget.value = { kind: 'category', id: cat.id, name: cat.name }
}
/** カテゴリ名の編集中の✗＝保存せず編集をやめてそのまま削除確認へ。 */
function cancelEditCategoryAndDelete(cat: KoubaCategory) {
  editingCategoryId.value = null
  askDeleteCategory(cat)
}
function askDeleteJob(job: KoubaJob) {
  confirmTarget.value = { kind: 'job', id: job.id, title: job.title }
}
function askDeleteTask(task: KoubaTask) {
  confirmTarget.value = { kind: 'task', id: task.id, title: task.title }
}
// function askDeleteSubtask(subtask: KoubaSubtask) { // 2026-09-16 コメントアウト中
//   confirmTarget.value = { kind: 'subtask', id: subtask.id, title: subtask.title }
// }
function askDeleteAchievement(achievement: KoubaAchievement) {
  confirmTarget.value = { kind: 'achievement', id: achievement.id, text: achievement.text }
}
async function onConfirmDelete() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) return
  if (target.kind === 'category') {
    await deleteCategory(target.id)
  } else if (target.kind === 'job') {
    if (activeJobId.value === target.id) activeJobId.value = null
    await deleteJob(target.id)
  } else if (target.kind === 'task') {
    await deleteTask(target.id)
  } else {
    await removeAchievement(target.id)
  }
  // サブタスク（kind: 'subtask'）の削除は機能ごとコメントアウト中。復活させるときは
  // removeSubtaskItem(target.id) を呼んだあと、紐づくタスクの時間（板側）が変わり得るので load() も呼ぶこと
}

// ── カテゴリのドラッグ&ドロップ（3×3グリッド内の並べ替え）──────────────────────────────
// 掴むのはカテゴリヘッダーだけ（枠ごと draggable にすると、中の付箋のドラッグや名前の入力と取り合いになる）。
const dragCategoryId = ref<string | null>(null)
// 掴んだカテゴリが入る位置。カテゴリIDなら「その手前」、'end' なら末尾（空き枠の上）、null はドラッグ中でない。
const dropBeforeCategoryId = ref<string | 'end' | null>(null)

/** 名前・アイコンの編集中は掴めなくする（入力欄の中でのドラッグ選択を邪魔しないため）。 */
function isCategoryDraggable(cat: KoubaCategory): boolean {
  return editingCategoryId.value !== cat.id && editingCategoryIconId.value !== cat.id
}
function onCategoryDragStart(e: DragEvent, cat: KoubaCategory) {
  dragCategoryId.value = cat.id
  e.dataTransfer?.setData('text/plain', cat.id)
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  // ヘッダーだけを掴んでいるので、そのままだと幽霊画像がヘッダーの帯になる。枠ごと掴んでいるように見せる
  const frame = document.getElementById(`kouba-category-${cat.id}`)
  if (frame) e.dataTransfer.setDragImage(frame, 40, 20)
}
function onCategoryDragEnd() {
  dragCategoryId.value = null
  dropBeforeCategoryId.value = null
}
/** cat が null の枠（空き枠）は末尾へ入れる意味。 */
function onCategorySlotDragOver(cat: KoubaCategory | null) {
  if (!dragCategoryId.value) return
  dropBeforeCategoryId.value = cat ? cat.id : 'end'
}
async function onCategorySlotDrop(cat: KoubaCategory | null) {
  const id = dragCategoryId.value
  onCategoryDragEnd()
  if (!id) return
  const ids = categories.value.map((c) => c.id).filter((v) => v !== id)
  let insertAt = cat && cat.id !== id ? ids.indexOf(cat.id) : ids.length
  if (insertAt < 0) insertAt = ids.length
  ids.splice(insertAt, 0, id)
  if (ids.every((v, i) => v === categories.value[i]?.id)) return // 並びが変わらないなら送らない
  await reorderCategories(ids)
}

// ── ジョブのドラッグ&ドロップ（カテゴリ間の移動・同一カテゴリ内の並べ替え）──────────────────────────────
// ジョブは複数カテゴリに同時掲載できるので「どのカテゴリの枠から掴んだか」を別途持つ
// （job.categoryIds だけでは、複数ある所属のうちどれが「今回の移動元」か分からないため）。
const dragJobId = ref<string | null>(null)
const dragSourceCategoryId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)
const dragOverJobId = ref<string | null>(null)

function onJobDragStart(e: DragEvent, job: KoubaJob, sourceCategoryId: string) {
  dragJobId.value = job.id
  dragSourceCategoryId.value = sourceCategoryId
  e.dataTransfer?.setData('text/plain', job.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onJobDragEnd() {
  dragJobId.value = null
  dragSourceCategoryId.value = null
  dragOverCategoryId.value = null
  dragOverJobId.value = null
}
function onCategoryDragOver(cat: KoubaCategory) {
  if (!dragJobId.value) return
  dragOverCategoryId.value = cat.id
  dragOverJobId.value = null
}
function onJobDragOver(cat: KoubaCategory, job: KoubaJob) {
  // 付箋側のハンドラは .stop で伝播を止めるので、カテゴリを掴んでいるときはここで枠の処理へ引き取る
  if (dragCategoryId.value) return onCategorySlotDragOver(cat)
  if (!dragJobId.value) return
  dragOverCategoryId.value = cat.id
  dragOverJobId.value = job.id
}
/**
 * ジョブを targetCategoryId の beforeJobId の手前（null なら末尾）へ置く。
 * sourceCategoryId が targetCategoryId と異なれば「移動」＝掴んだ元のカテゴリの表示からは外す
 * （他のカテゴリにも属していればそちらは残る。ジョブ自体を削除するわけではない）。
 * **追加が先・削除が後**の順で呼ぶ＝先に削除すると、他のカテゴリに属していないジョブが一瞬どこにも
 * 属さない状態になり得るため（jobs/reorder.post.ts 側にも同じ理由の安全策がある）。
 */
async function moveJobTo(jobId: string, targetCategoryId: string, beforeJobId: string | null, sourceCategoryId: string | null) {
  const targetCat = categories.value.find((c) => c.id === targetCategoryId)
  if (!targetCat) return
  const targetIds = targetCat.jobs.map((j) => j.id).filter((id) => id !== jobId)
  let insertAt = beforeJobId ? targetIds.indexOf(beforeJobId) : targetIds.length
  if (insertAt < 0) insertAt = targetIds.length
  targetIds.splice(insertAt, 0, jobId)
  await reorderJobs(targetCategoryId, targetIds)

  if (sourceCategoryId && sourceCategoryId !== targetCategoryId) {
    const sourceCat = categories.value.find((c) => c.id === sourceCategoryId)
    if (sourceCat) {
      const sourceIds = sourceCat.jobs.map((j) => j.id).filter((id) => id !== jobId)
      await reorderJobs(sourceCategoryId, sourceIds)
    }
  }
}
async function onCategoryDrop(cat: KoubaCategory) {
  const jobId = dragJobId.value
  const sourceCategoryId = dragSourceCategoryId.value
  onJobDragEnd()
  if (!jobId) return
  await moveJobTo(jobId, cat.id, null, sourceCategoryId)
}
async function onJobDrop(cat: KoubaCategory, targetJob: KoubaJob) {
  if (dragCategoryId.value) return await onCategorySlotDrop(cat)
  const jobId = dragJobId.value
  const sourceCategoryId = dragSourceCategoryId.value
  onJobDragEnd()
  if (!jobId || jobId === targetJob.id) return
  await moveJobTo(jobId, cat.id, targetJob.id, sourceCategoryId)
}

// ── 付箋の色（見た目のバリエーションだけの装飾。データとは無関係）──────────────────────────────
const STICKY_COLORS = ['#fde68a', '#bfdbfe', '#fecaca', '#bbf7d0', '#fbcfe8', '#ddd6fe']
function stickyColor(index: number): string {
  return STICKY_COLORS[index % STICKY_COLORS.length] ?? STICKY_COLORS[0]!
}
function stickyTilt(index: number): string {
  const tilts = [-2, 1.5, -1, 2, -1.5, 1]
  return `rotate(${tilts[index % tilts.length] ?? 0}deg)`
}

function formatHours(h: number): string {
  return (Math.round(h * 100) / 100).toString()
}

async function doLogout() {
  showSettingsMenu.value = false
  await logout()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value || isDev) {
    load()
    loadTheme()
    // loadSubtasks() // 2026-09-16 コメントアウト中
    loadAchievements()
  } else loading.value = false
})
watch(isLoggedIn, (v) => {
  if (!v) return
  load()
  loadTheme()
  // loadSubtasks() // 2026-09-16 コメントアウト中
  loadAchievements()
})

// スマホでアプリを切り替えたときなど、そのままページが捨てられても時間の +/- を取りこぼさないように送り切る
function flushOnHide() {
  if (document.visibilityState === 'hidden') {
    void flushPendingHours()
    // void flushPendingSubtaskHours() // 2026-09-16 コメントアウト中
  }
}
onMounted(() => document.addEventListener('visibilitychange', flushOnHide))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', flushOnHide)
  void flushPendingHours()
  // void flushPendingSubtaskHours() // 2026-09-16 コメントアウト中
})
</script>

<template>
  <!-- 認証モーダル -->
  <AuthModal v-if="showAuthModal" accent="sky" />

  <!-- パスワード変更 -->
  <PasswordModal v-model:show="showPasswordModal" accent="sky" />

  <!-- 設定メニューの背景クリックで閉じる -->
  <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />

  <!-- これまでのテーマ -->
  <KoubaThemeHistoryModal v-model:show="showThemeHistory" :themes="themeHistory" />

  <!-- サブタスクの追加ポップアップ（2026-09-16 コメントアウト中。復活させるときはscript側の同日付コメントも外すこと）
  <KoubaSubtaskFormModal
    v-model:show="showSubtaskFormModal"
    :task-options="taskOptions"
    :on-submit="handleAddSubtaskSubmit"
    :saving="subtasksSaving"
    :error="subtasksError"
  />
  -->

  <!-- 達成したことの記録ポップアップ -->
  <KoubaAchievementFormModal
    v-model:show="showAchievementFormModal"
    :on-submit="handleAddAchievementSubmit"
    :saving="achievementsSaving"
    :error="achievementsError"
  />

  <!-- ジョブ詳細モーダル -->
  <KoubaJobModal
    v-model:show="showJobModal"
    :job="activeJob"
    :categories="categoryOptions"
    :saving="saving"
    :error="actionError"
    :icon-busy="!!activeJob && iconBusyIds.has(activeJob.id)"
    @update="handleUpdateJob"
    @regenerate-icon="handleRegenerateJobIcon"
    @delete="activeJob && askDeleteJob(activeJob)"
    @add-task="handleAddTask"
    @update-task="handleUpdateTask"
    @set-task-hours="handleSetTaskHours"
    @delete-task="askDeleteTask"
    @reorder-tasks="handleReorderTasks"
  />

  <!-- 削除確認ポップアップ -->
  <KoubaConfirmModal
    :show="!!confirmTarget"
    :message="confirmMessage"
    @confirm="onConfirmDelete"
    @cancel="confirmTarget = null"
  />

  <div class="min-h-full px-4 pt-4 pb-20 flex flex-col items-center">
    <div class="w-full max-w-[1100px] flex flex-col gap-4">
      <!-- ヘッダー -->
      <header class="flex items-center justify-between pt-1">
        <h1 class="text-lg font-bold bg-gradient-to-br from-amber-300 to-orange-500 bg-clip-text text-transparent">⏱️ 工数</h1>
        <div class="relative" @click.stop>
          <button
            class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-base cursor-pointer flex items-center justify-center hover:bg-white/[0.12] hover:text-slate-200 transition-colors"
            title="設定"
            @click="showSettingsMenu = !showSettingsMenu"
          >⚙</button>
          <div v-if="showSettingsMenu" class="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-50 min-w-[180px] py-1 overflow-hidden">
            <button
              class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2"
              @click="showPasswordModal = true; showSettingsMenu = false"
            ><span>🔒</span> パスワード変更</button>
            <button
              class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2"
              @click="doLogout"
            ><span>🚪</span> ログアウト</button>
          </div>
        </div>
      </header>

      <template v-if="isLoggedIn || isDev">
        <KoubaThemeBanner
          :theme="currentTheme"
          :history-count="themeHistory.length"
          :saving="themeSaving"
          :error="themeError"
          @save="saveTheme"
          @open-history="showThemeHistory = true"
        />

        <!-- サブタスク一覧（2026-09-16 コメントアウト中。復活させるときはscript側の同日付コメントも外すこと）
        <KoubaSubtasksSection
          v-if="!loading && !loadError"
          :subtasks="subtasks"
          :task-options="taskOptions"
          :saving="subtasksSaving"
          :error="subtasksError"
          @open-add="showSubtaskFormModal = true"
          @rename="handleRenameSubtask"
          @set-hours="handleSetSubtaskHours"
          @toggle-done="handleToggleSubtaskDone"
          @delete="askDeleteSubtask"
        />
        -->

        <div v-if="loading" class="mt-16 text-center text-slate-500 text-sm animate-pulse">読み込み中…</div>
        <div v-else-if="loadError" class="mt-16 text-center text-rose-400 text-sm flex flex-col items-center gap-3">
          <p class="m-0">{{ loadError }}</p>
          <button class="h-9 px-4 rounded-full bg-white/10 text-slate-200 text-[13px] font-semibold hover:bg-white/20" @click="load">読み込み直す</button>
        </div>

        <template v-else>
          <p v-if="actionError" class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 m-0">{{ actionError }}</p>

          <!-- 3×3グリッド。スマホ（sm未満）はカテゴリを縦1列に積む。sm以上は横スクロールさせつつ常に3×3の比率を保つ -->
          <div class="overflow-x-auto pb-2">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:min-w-[1080px]">
              <template v-for="(cat, i) in gridSlots" :key="i">
                <!-- カテゴリの枠 -->
                <div
                  v-if="cat"
                  :id="`kouba-category-${cat.id}`"
                  class="rounded-2xl border bg-white/[0.03] flex flex-col min-h-[280px] overflow-hidden transition-colors"
                  :class="[
                    dragOverCategoryId === cat.id || dropBeforeCategoryId === cat.id
                      ? 'border-sky-400/70 ring-2 ring-sky-400/30'
                      : 'border-white/10',
                    dragCategoryId === cat.id ? 'opacity-40' : '',
                  ]"
                  @dragover.prevent="onCategorySlotDragOver(cat)"
                  @drop.prevent="onCategorySlotDrop(cat)"
                >
                  <!-- カテゴリヘッダー。ここがカテゴリを掴む取っ手（枠ごと draggable にすると付箋のドラッグと取り合いになる） -->
                  <div
                    class="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3 border-b border-white/[0.08]"
                    :class="isCategoryDraggable(cat) ? 'cursor-grab active:cursor-grabbing' : ''"
                    :draggable="isCategoryDraggable(cat)"
                    @dragstart="onCategoryDragStart($event, cat)"
                    @dragend="onCategoryDragEnd"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 relative">
                        <button
                          type="button"
                          class="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden hover:border-white/25"
                          title="アイコンをAIで作り直す"
                          @click="editingCategoryIconId = editingCategoryIconId === cat.id ? null : cat.id"
                        >
                          <KoubaIcon :icon="cat.icon" :busy="iconBusyIds.has(cat.id)" />
                        </button>
                        <div
                          v-if="editingCategoryIconId === cat.id"
                          class="absolute top-full left-0 mt-1 z-20 w-64 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl"
                          @click.stop
                        >
                          <KoubaIconEditor
                            :icon="cat.icon"
                            :busy="iconBusyIds.has(cat.id)"
                            @regenerate="(instruction) => regenerateCategoryIcon(cat, instruction)"
                            @close="editingCategoryIconId = null"
                          />
                        </div>

                        <input
                          v-if="editingCategoryId === cat.id"
                          :id="`kouba-edit-category-${cat.id}`"
                          v-model="categoryEditDraft"
                          class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-sm font-bold outline-none"
                          @keydown.enter="runOnEnter($event, () => commitCategoryEdit(cat))"
                          @blur="commitCategoryEdit(cat)"
                        />
                        <!-- 編集中だけ出す✗＝保存せずそのまま削除確認へ（mousedown.prevent で input の blur による保存を先に発火させない） -->
                        <button
                          v-if="editingCategoryId === cat.id"
                          type="button"
                          class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
                          title="編集をやめて削除"
                          @mousedown.prevent="cancelEditCategoryAndDelete(cat)"
                        >✗</button>
                        <h2
                          v-else
                          class="flex-1 min-w-0 m-0 text-sm font-bold text-slate-100 truncate cursor-text"
                          title="クリックして名前を編集"
                          @click="startEditCategory(cat)"
                        >{{ cat.name }}</h2>
                      </div>

                      <!-- カテゴリの説明（任意）。クリックして編集、フォーカスを外すと保存 -->
                      <textarea
                        v-if="editingCategoryDescId === cat.id"
                        :id="`kouba-edit-category-desc-${cat.id}`"
                        v-model="categoryDescDraft"
                        rows="2"
                        :maxlength="KOUBA_DESCRIPTION_MAX"
                        class="mt-1 w-full resize-none bg-white/[0.06] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-200 text-[11px] outline-none font-[inherit] leading-snug"
                        @keydown.esc="editingCategoryDescId = null"
                        @blur="commitCategoryDescEdit(cat)"
                      />
                      <p
                        v-else-if="cat.description"
                        class="mt-1 mb-0 text-[11px] text-slate-400 leading-snug line-clamp-2 cursor-text"
                        title="クリックして説明を編集"
                        @click="startEditCategoryDesc(cat)"
                      >{{ cat.description }}</p>
                      <button
                        v-else
                        type="button"
                        class="mt-1 text-[11px] text-slate-600 hover:text-slate-400"
                        @click="startEditCategoryDesc(cat)"
                      >+ 説明を追加</button>

                      <div class="mt-1 text-lg font-extrabold text-amber-300 tabular-nums">
                        {{ formatHours(cat.totalHours) }}<span class="text-[11px] font-semibold text-slate-500 ml-1">時間</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <span
                        class="w-5 h-7 flex items-center justify-center text-slate-600 text-sm select-none"
                        title="ヘッダーをドラッグすると枠の位置を入れ替えられます"
                      >⠿</span>
                      <button
                        class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center text-sm"
                        title="ジョブを追加"
                        @click="openAddJob(cat.id)"
                      >＋</button>
                      <button
                        class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-300 flex items-center justify-center text-xs"
                        title="カテゴリを削除"
                        @click="askDeleteCategory(cat)"
                      >🗑</button>
                    </div>
                  </div>

                  <!-- 付箋（ジョブ）エリア。3列グリッドで3×3に収める。ここにドロップするとカテゴリ末尾へ移動 -->
                  <div
                    class="flex-1 p-3.5 grid grid-cols-3 gap-2 content-start overflow-y-auto"
                    @dragover.prevent="onCategoryDragOver(cat)"
                    @drop.prevent="onCategoryDrop(cat)"
                  >
                    <div
                      v-for="(job, ji) in cat.jobs"
                      :key="job.id"
                      draggable="true"
                      class="relative w-full min-h-[100px] rounded-sm p-2.5 text-left shadow-md hover:shadow-lg hover:brightness-105 transition-shadow cursor-grab active:cursor-grabbing flex flex-col gap-1.5 border-2"
                      :style="{ background: stickyColor(ji), transform: stickyTilt(ji) }"
                      :class="[
                        dragJobId === job.id ? 'opacity-40' : '',
                        dragOverJobId === job.id ? 'border-sky-500' : 'border-transparent',
                        job.focused ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0f172a]' : '',
                      ]"
                      @click="openJob(job.id)"
                      @dragstart="onJobDragStart($event, job, cat.id)"
                      @dragend="onJobDragEnd"
                      @dragover.prevent.stop="onJobDragOver(cat, job)"
                      @drop.prevent.stop="onJobDrop(cat, job)"
                    >
                      <!-- 直近で特に力を入れているジョブの印（枠のハイライトと対にした目印） -->
                      <span
                        v-if="job.focused"
                        class="absolute -top-2 -left-2 text-sm drop-shadow"
                        title="直近で特に力を入れているジョブ"
                      >⭐</span>
                      <!-- 他のカテゴリにも同時掲載されているジョブの目印（クリックで開けば所属は詳細モーダルで確認・編集できる） -->
                      <span
                        v-if="job.categoryIds.length > 1"
                        class="absolute top-1 right-1 text-[9px] font-extrabold text-slate-700/70 bg-black/10 rounded-full px-1 leading-4"
                        :title="`他${job.categoryIds.length - 1}件のカテゴリにも表示`"
                      >+{{ job.categoryIds.length - 1 }}</span>
                      <span class="w-7 h-7 text-base">
                        <KoubaIcon :icon="job.icon" :busy="iconBusyIds.has(job.id)" />
                      </span>
                      <span class="text-[12.5px] font-bold text-slate-800 leading-snug break-words line-clamp-3">{{ job.title }}</span>
                      <span class="mt-auto text-[12px] font-extrabold text-slate-700 tabular-nums">{{ formatHours(job.totalHours) }}h</span>
                    </div>

                    <!-- ジョブ追加フォーム（実際の付箋と違い、操作画面なので板と同じ濃色トーン） -->
                    <form
                      v-if="addingJobFor === cat.id"
                      class="w-full min-h-[100px] rounded-lg p-2.5 bg-[#0f172a] border border-white/10 flex flex-col gap-1.5"
                      @submit.prevent="submitAddJob"
                    >
                      <textarea
                        :id="`kouba-add-job-${cat.id}`"
                        v-model="jobNameDraft"
                        rows="2"
                        placeholder="ジョブ名"
                        class="flex-1 resize-none bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1.5 text-[12.5px] text-slate-100 outline-none focus:border-sky-400/50 font-[inherit] leading-snug"
                        @keydown.enter.prevent="runOnEnter($event, submitAddJob)"
                        @keydown.esc="cancelAddJob"
                      />
                      <div class="flex gap-1">
                        <button type="submit" class="flex-1 h-6 rounded bg-sky-500 text-white text-[11px] font-bold">追加</button>
                        <button type="button" class="w-6 h-6 rounded bg-white/10 text-slate-300 text-[11px]" @click="cancelAddJob">✕</button>
                      </div>
                    </form>

                    <p v-if="!cat.jobs.length && addingJobFor !== cat.id" class="col-span-3 text-center text-slate-500 text-xs py-6">ジョブがありません</p>
                  </div>
                </div>

                <!-- 空き枠（カテゴリ追加）。9個未満なら常にgridSlotsの末尾に1つだけ出る -->
                <div
                  v-else-if="i === categories.length"
                  class="rounded-2xl border border-dashed min-h-[280px] flex items-center justify-center p-4 transition-colors"
                  :class="dropBeforeCategoryId === 'end' ? 'border-sky-400/70 ring-2 ring-sky-400/30' : 'border-white/15'"
                  @dragover.prevent="onCategorySlotDragOver(null)"
                  @drop.prevent="onCategorySlotDrop(null)"
                >
                  <form v-if="addingCategory" class="w-full flex flex-col gap-2" @submit.prevent="submitAddCategory">
                    <input
                      id="kouba-add-category"
                      v-model="categoryNameDraft"
                      type="text"
                      placeholder="カテゴリ名（例: マーケティング）"
                      class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
                      @keydown.enter="runOnEnter($event, submitAddCategory)"
                      @keydown.esc="cancelAddCategory"
                    />
                    <p class="m-0 text-[11px] text-slate-500">アイコンは追加後にAIが作ります</p>
                    <div class="flex gap-2">
                      <button type="submit" class="flex-1 h-8 rounded-full bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400">追加</button>
                      <button type="button" class="h-8 px-3 rounded-full bg-white/10 text-slate-300 text-[12px]" @click="cancelAddCategory">キャンセル</button>
                    </div>
                  </form>
                  <button
                    v-else
                    class="w-full h-full min-h-[240px] flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
                    @click="openAddCategory"
                  >
                    <span class="text-3xl">＋</span>
                    <span class="text-xs">カテゴリを追加</span>
                  </button>
                </div>
              </template>
            </div>
          </div>

          <p v-if="isFull" class="text-center text-slate-500 text-xs">カテゴリは{{ KOUBA_GRID_SIZE }}個までです</p>

          <!-- 達成したこと（画面下部の一覧） -->
          <KoubaAchievementsSection
            :achievements="achievements"
            :loading="achievementsLoading"
            :error="achievementsError"
            @open-add="showAchievementFormModal = true"
            @delete="askDeleteAchievement"
          />
        </template>
      </template>
    </div>
  </div>
</template>
