<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useKouba, KOUBA_GRID_SIZE } from '~/composables/kouba/useKouba'
import KoubaTaskModal from '~/components/kouba/KoubaTaskModal.vue'
import KoubaIconPicker from '~/components/kouba/KoubaIconPicker.vue'
import KoubaConfirmModal from '~/components/kouba/KoubaConfirmModal.vue'
import { KOUBA_DEFAULT_CATEGORY_ICON, KOUBA_DEFAULT_TASK_ICON } from '~/types/kouba'
import type { KoubaCategory, KoubaTask, KoubaSubtask } from '~/types/kouba'

useHead({
  title: import.meta.dev ? '工数 (dev)' : '工数',
  link: [
    {
      key: 'icon',
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱️</text></svg>`,
    },
  ],
  meta: [{ name: 'theme-color', content: '#0f172a' }],
})

const isDev = import.meta.dev
const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)
const showSettingsMenu = ref(false)

const {
  categories, loading, loadError, saving, actionError, load,
  addCategory, updateCategory, deleteCategory,
  addTask, updateTask, deleteTask, reorderTasks,
  addSubtask, updateSubtask, deleteSubtask,
} = useKouba()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

// ── 3×3グリッド ──────────────────────────────
const gridSlots = computed(() => {
  const byPosition = new Map<number, KoubaCategory>()
  for (const c of categories.value) byPosition.set(c.position, c)
  return Array.from({ length: KOUBA_GRID_SIZE }, (_, i) => byPosition.get(i) ?? null)
})
const isFull = computed(() => categories.value.length >= KOUBA_GRID_SIZE)

// ── カテゴリの追加 ──────────────────────────────
// v-for内で同名のテンプレートrefを使うと配列参照になってしまうため、id指定+getElementByIdで直接focusする
const addingCategoryAt = ref<number | null>(null)
const categoryNameDraft = ref('')
const categoryIconDraft = ref(KOUBA_DEFAULT_CATEGORY_ICON)

function openAddCategory(position: number) {
  addingCategoryAt.value = position
  categoryNameDraft.value = ''
  categoryIconDraft.value = KOUBA_DEFAULT_CATEGORY_ICON
  nextTick(() => document.getElementById(`kouba-add-category-${position}`)?.focus())
}
function cancelAddCategory() {
  addingCategoryAt.value = null
  categoryNameDraft.value = ''
}
async function submitAddCategory() {
  const name = categoryNameDraft.value.trim()
  const position = addingCategoryAt.value
  if (!name || position === null) return
  const icon = categoryIconDraft.value
  cancelAddCategory()
  await addCategory(name, position, icon)
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
async function pickCategoryIcon(cat: KoubaCategory, icon: string) {
  editingCategoryIconId.value = null
  if (icon && icon !== cat.icon) await updateCategory(cat.id, { icon })
}

// ── タスクの追加 ──────────────────────────────
const addingTaskFor = ref<string | null>(null)
const taskNameDraft = ref('')
const taskIconDraft = ref(KOUBA_DEFAULT_TASK_ICON)

function openAddTask(categoryId: string) {
  addingTaskFor.value = categoryId
  taskNameDraft.value = ''
  taskIconDraft.value = KOUBA_DEFAULT_TASK_ICON
  nextTick(() => document.getElementById(`kouba-add-task-${categoryId}`)?.focus())
}
function cancelAddTask() {
  addingTaskFor.value = null
  taskNameDraft.value = ''
}
async function submitAddTask() {
  const title = taskNameDraft.value.trim()
  const categoryId = addingTaskFor.value
  if (!title || !categoryId) return
  const icon = taskIconDraft.value
  cancelAddTask()
  await addTask(categoryId, title, icon)
}

// ── タスク詳細モーダル ──────────────────────────────
const activeTaskId = ref<string | null>(null)
const showTaskModal = computed({
  get: () => activeTaskId.value !== null,
  set: (v) => {
    if (!v) activeTaskId.value = null
  },
})
const activeTask = computed(() => {
  if (!activeTaskId.value) return null
  for (const c of categories.value) {
    const t = c.tasks.find((t) => t.id === activeTaskId.value)
    if (t) return t
  }
  return null
})
const categoryOptions = computed(() => categories.value.map((c) => ({ id: c.id, name: c.name, icon: c.icon })))

function openTask(taskId: string) {
  activeTaskId.value = taskId
}
async function handleUpdateTask(patch: { title?: string; icon?: string; categoryId?: string }) {
  if (activeTaskId.value) await updateTask(activeTaskId.value, patch)
}
async function handleAddSubtask(payload: { title: string; hours: number }) {
  if (activeTaskId.value) await addSubtask(activeTaskId.value, payload.title, payload.hours)
}
async function handleUpdateSubtask(payload: { id: string; title?: string; hours?: number }) {
  const { id, ...patch } = payload
  await updateSubtask(id, patch)
}

// ── 削除確認ポップアップ（カテゴリ/タスク/サブタスクで共通）──────────────────────────────
type ConfirmTarget =
  | { kind: 'category'; id: string; name: string }
  | { kind: 'task'; id: string; title: string }
  | { kind: 'subtask'; id: string; title: string }
const confirmTarget = ref<ConfirmTarget | null>(null)
const confirmMessage = computed(() => {
  const t = confirmTarget.value
  if (!t) return ''
  if (t.kind === 'category') return `「${t.name}」を削除しますか？\n中のタスク・記録もすべて削除されます。`
  if (t.kind === 'task') return `「${t.title}」を削除しますか？\nサブタスクもすべて削除されます。`
  return `「${t.title}」を削除しますか？`
})

function askDeleteCategory(cat: KoubaCategory) {
  confirmTarget.value = { kind: 'category', id: cat.id, name: cat.name }
}
function askDeleteTask(task: KoubaTask) {
  confirmTarget.value = { kind: 'task', id: task.id, title: task.title }
}
function askDeleteSubtask(subtask: KoubaSubtask) {
  confirmTarget.value = { kind: 'subtask', id: subtask.id, title: subtask.title }
}
async function onConfirmDelete() {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) return
  if (target.kind === 'category') {
    await deleteCategory(target.id)
  } else if (target.kind === 'task') {
    if (activeTaskId.value === target.id) activeTaskId.value = null
    await deleteTask(target.id)
  } else {
    await deleteSubtask(target.id)
  }
}

// ── タスクのドラッグ&ドロップ（カテゴリ間の移動・同一カテゴリ内の並べ替え）──────────────────────────────
const dragTaskId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)

function onTaskDragStart(e: DragEvent, task: KoubaTask) {
  dragTaskId.value = task.id
  e.dataTransfer?.setData('text/plain', task.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onTaskDragEnd() {
  dragTaskId.value = null
  dragOverCategoryId.value = null
  dragOverTaskId.value = null
}
function onCategoryDragOver(cat: KoubaCategory) {
  if (!dragTaskId.value) return
  dragOverCategoryId.value = cat.id
  dragOverTaskId.value = null
}
function onTaskDragOver(task: KoubaTask) {
  if (!dragTaskId.value) return
  dragOverCategoryId.value = task.categoryId
  dragOverTaskId.value = task.id
}
async function moveTaskTo(taskId: string, targetCategoryId: string, beforeTaskId: string | null) {
  const targetCat = categories.value.find((c) => c.id === targetCategoryId)
  if (!targetCat) return
  const ids = targetCat.tasks.map((t) => t.id).filter((id) => id !== taskId)
  let insertAt = beforeTaskId ? ids.indexOf(beforeTaskId) : ids.length
  if (insertAt < 0) insertAt = ids.length
  ids.splice(insertAt, 0, taskId)
  await reorderTasks(targetCategoryId, ids)
}
async function onCategoryDrop(cat: KoubaCategory) {
  const taskId = dragTaskId.value
  onTaskDragEnd()
  if (!taskId) return
  await moveTaskTo(taskId, cat.id, null)
}
async function onTaskDrop(cat: KoubaCategory, targetTask: KoubaTask) {
  const taskId = dragTaskId.value
  onTaskDragEnd()
  if (!taskId || taskId === targetTask.id) return
  await moveTaskTo(taskId, cat.id, targetTask.id)
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
  if (isLoggedIn.value || isDev) load()
  else loading.value = false
})
watch(isLoggedIn, (v) => {
  if (v) load()
})
</script>

<template>
  <!-- 認証モーダル -->
  <AuthModal v-if="showAuthModal" accent="sky" />

  <!-- パスワード変更 -->
  <PasswordModal v-model:show="showPasswordModal" accent="sky" />

  <!-- 設定メニューの背景クリックで閉じる -->
  <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />

  <!-- タスク詳細モーダル -->
  <KoubaTaskModal
    v-model:show="showTaskModal"
    :task="activeTask"
    :categories="categoryOptions"
    :saving="saving"
    :error="actionError"
    @update="handleUpdateTask"
    @delete="activeTask && askDeleteTask(activeTask)"
    @add-subtask="handleAddSubtask"
    @update-subtask="handleUpdateSubtask"
    @delete-subtask="askDeleteSubtask"
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
        <div v-if="loading" class="mt-16 text-center text-slate-500 text-sm animate-pulse">読み込み中…</div>
        <div v-else-if="loadError" class="mt-16 text-center text-rose-400 text-sm flex flex-col items-center gap-3">
          <p class="m-0">{{ loadError }}</p>
          <button class="h-9 px-4 rounded-full bg-white/10 text-slate-200 text-[13px] font-semibold hover:bg-white/20" @click="load">読み込み直す</button>
        </div>

        <template v-else>
          <p v-if="actionError" class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 m-0">{{ actionError }}</p>

          <!-- 3×3グリッド。狭い画面では横スクロールさせ、枠の比率は常に3×3を保つ -->
          <div class="overflow-x-auto pb-2">
            <div class="grid grid-cols-3 gap-4 min-w-[900px]">
              <template v-for="(cat, i) in gridSlots" :key="i">
                <!-- カテゴリの枠 -->
                <div
                  v-if="cat"
                  class="rounded-2xl border bg-white/[0.03] flex flex-col min-h-[280px] overflow-hidden transition-colors"
                  :class="dragOverCategoryId === cat.id ? 'border-sky-400/70 ring-2 ring-sky-400/30' : 'border-white/10'"
                >
                  <!-- カテゴリヘッダー -->
                  <div class="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3 border-b border-white/[0.08]">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 relative">
                        <button
                          type="button"
                          class="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm shrink-0 hover:border-white/25"
                          title="アイコンを変更"
                          @click="editingCategoryIconId = editingCategoryIconId === cat.id ? null : cat.id"
                        >{{ cat.icon }}</button>
                        <div
                          v-if="editingCategoryIconId === cat.id"
                          class="absolute top-full left-0 mt-1 z-20 w-56 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl"
                          @click.stop
                        >
                          <KoubaIconPicker :model-value="cat.icon" @update:model-value="(icon) => pickCategoryIcon(cat, icon)" />
                        </div>

                        <input
                          v-if="editingCategoryId === cat.id"
                          :id="`kouba-edit-category-${cat.id}`"
                          v-model="categoryEditDraft"
                          class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-sm font-bold outline-none"
                          @keydown.enter="runOnEnter($event, () => commitCategoryEdit(cat))"
                          @blur="commitCategoryEdit(cat)"
                        />
                        <h2
                          v-else
                          class="flex-1 min-w-0 m-0 text-sm font-bold text-slate-100 truncate cursor-text"
                          title="クリックして名前を編集"
                          @click="startEditCategory(cat)"
                        >{{ cat.name }}</h2>
                      </div>
                      <div class="mt-1 text-lg font-extrabold text-amber-300 tabular-nums">
                        {{ formatHours(cat.totalHours) }}<span class="text-[11px] font-semibold text-slate-500 ml-1">時間</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center text-sm"
                        title="タスクを追加"
                        @click="openAddTask(cat.id)"
                      >＋</button>
                      <button
                        class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-300 flex items-center justify-center text-xs"
                        title="カテゴリを削除"
                        @click="askDeleteCategory(cat)"
                      >🗑</button>
                    </div>
                  </div>

                  <!-- 付箋（タスク）エリア。ここにドロップするとカテゴリ末尾へ移動 -->
                  <div
                    class="flex-1 p-3.5 flex flex-wrap content-start gap-2.5 overflow-y-auto"
                    @dragover.prevent="onCategoryDragOver(cat)"
                    @drop.prevent="onCategoryDrop(cat)"
                  >
                    <div
                      v-for="(task, ti) in cat.tasks"
                      :key="task.id"
                      draggable="true"
                      class="w-[120px] min-h-[100px] rounded-sm p-2.5 text-left shadow-md hover:shadow-lg hover:brightness-105 transition-shadow cursor-grab active:cursor-grabbing flex flex-col gap-1.5 border-2"
                      :style="{ background: stickyColor(ti), transform: stickyTilt(ti) }"
                      :class="[
                        dragTaskId === task.id ? 'opacity-40' : '',
                        dragOverTaskId === task.id ? 'border-sky-500' : 'border-transparent',
                      ]"
                      @click="openTask(task.id)"
                      @dragstart="onTaskDragStart($event, task)"
                      @dragend="onTaskDragEnd"
                      @dragover.prevent.stop="onTaskDragOver(task)"
                      @drop.prevent.stop="onTaskDrop(cat, task)"
                    >
                      <span class="text-base leading-none">{{ task.icon }}</span>
                      <span class="text-[12.5px] font-bold text-slate-800 leading-snug break-words line-clamp-3">{{ task.title }}</span>
                      <span class="mt-auto text-[12px] font-extrabold text-slate-700 tabular-nums">{{ formatHours(task.totalHours) }}h</span>
                    </div>

                    <!-- タスク追加フォーム（実際の付箋と違い、操作画面なので板と同じ濃色トーン） -->
                    <form
                      v-if="addingTaskFor === cat.id"
                      class="w-56 min-h-[100px] rounded-lg p-2.5 bg-[#0f172a] border border-white/10 flex flex-col gap-1.5"
                      @submit.prevent="submitAddTask"
                    >
                      <KoubaIconPicker v-model="taskIconDraft" />
                      <textarea
                        :id="`kouba-add-task-${cat.id}`"
                        v-model="taskNameDraft"
                        rows="2"
                        placeholder="タスク名"
                        class="flex-1 resize-none bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1.5 text-[12.5px] text-slate-100 outline-none focus:border-sky-400/50 font-[inherit] leading-snug"
                        @keydown.enter.prevent="runOnEnter($event, submitAddTask)"
                        @keydown.esc="cancelAddTask"
                      />
                      <div class="flex gap-1">
                        <button type="submit" class="flex-1 h-6 rounded bg-sky-500 text-white text-[11px] font-bold">追加</button>
                        <button type="button" class="w-6 h-6 rounded bg-white/10 text-slate-300 text-[11px]" @click="cancelAddTask">✕</button>
                      </div>
                    </form>

                    <p v-if="!cat.tasks.length && addingTaskFor !== cat.id" class="w-full text-center text-slate-500 text-xs py-6">タスクがありません</p>
                  </div>
                </div>

                <!-- 空き枠（カテゴリ追加） -->
                <div v-else class="rounded-2xl border border-dashed border-white/15 min-h-[280px] flex items-center justify-center p-4">
                  <form v-if="addingCategoryAt === i" class="w-full flex flex-col gap-2" @submit.prevent="submitAddCategory">
                    <KoubaIconPicker v-model="categoryIconDraft" />
                    <input
                      :id="`kouba-add-category-${i}`"
                      v-model="categoryNameDraft"
                      type="text"
                      placeholder="カテゴリ名（例: マーケティング）"
                      class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
                      @keydown.enter="runOnEnter($event, submitAddCategory)"
                      @keydown.esc="cancelAddCategory"
                    />
                    <div class="flex gap-2">
                      <button type="submit" class="flex-1 h-8 rounded-full bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400">追加</button>
                      <button type="button" class="h-8 px-3 rounded-full bg-white/10 text-slate-300 text-[12px]" @click="cancelAddCategory">キャンセル</button>
                    </div>
                  </form>
                  <button
                    v-else
                    class="w-full h-full min-h-[240px] flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
                    @click="openAddCategory(i)"
                  >
                    <span class="text-3xl">＋</span>
                    <span class="text-xs">カテゴリを追加</span>
                  </button>
                </div>
              </template>
            </div>
          </div>

          <p v-if="isFull" class="text-center text-slate-500 text-xs">カテゴリは{{ KOUBA_GRID_SIZE }}個（3×3）までです</p>
        </template>
      </template>
    </div>
  </div>
</template>
