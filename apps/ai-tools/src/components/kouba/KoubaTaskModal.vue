<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { KoubaTask, KoubaSubtask } from '~/types/kouba'
import { KOUBA_MIN_HOURS, KOUBA_DESCRIPTION_MAX, isSvgIcon } from '~/types/kouba'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'
import KoubaIconEditor from '~/components/kouba/KoubaIconEditor.vue'
import KoubaSubtaskCard from '~/components/kouba/KoubaSubtaskCard.vue'

const props = defineProps<{
  show: boolean
  task: KoubaTask | null
  categories: { id: string; name: string; icon: string }[]
  saving: boolean
  error: string
  /** AI がこのタスクのアイコンを作成中か */
  iconBusy: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  update: [patch: { title?: string; categoryIds?: string[]; focused?: boolean; description?: string }]
  regenerateIcon: [instruction: string]
  delete: []
  addSubtask: [payload: { title: string; hours: number }]
  updateSubtask: [payload: { id: string; title: string }]
  /** 時間の +/-。連打されるので rename とは別の口にして、ページ側でまとめ保存に回す。 */
  setSubtaskHours: [payload: { id: string; hours: number }]
  deleteSubtask: [subtask: KoubaSubtask]
  /** ドラッグ&ドロップでの並べ替え。新しい並び順どおりの全サブタスクIDを渡す。 */
  reorderSubtasks: [subtaskIds: string[]]
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
// （無視しないと編集中の文字が確定と同時に二重入力される）。
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)
const editingIcon = ref(false)
const subtaskTitleDraft = ref('')
/** 追加フォームの初期値。0時間で追加して、やったぶんだけ +/- で足していく。 */
const SUBTASK_HOURS_DEFAULT = KOUBA_MIN_HOURS
const subtaskHoursDraft = ref(SUBTASK_HOURS_DEFAULT)
const descriptionDraft = ref('')

watch(
  () => props.show,
  (v) => {
    if (v) {
      editingTitle.value = false
      editingIcon.value = false
      subtaskTitleDraft.value = ''
      subtaskHoursDraft.value = SUBTASK_HOURS_DEFAULT
      descriptionDraft.value = props.task?.description ?? ''
    }
  }
)

/** 説明はフォーカスを外したときにまとめて保存する（名前と同じ「押すたび保存」しない方式）。 */
function commitDescription() {
  if (!props.task) return
  const description = descriptionDraft.value.trim()
  if (description !== props.task.description) emit('update', { description })
}

function submitAddSubtask() {
  const title = subtaskTitleDraft.value.trim()
  if (!title) return
  emit('addSubtask', { title, hours: Number(subtaskHoursDraft.value) })
  subtaskTitleDraft.value = ''
  subtaskHoursDraft.value = SUBTASK_HOURS_DEFAULT
}

function close() {
  emit('update:show', false)
}

function formatHours(h: number): string {
  return (Math.round(h * 100) / 100).toString()
}

function startEditTitle() {
  if (!props.task) return
  titleDraft.value = props.task.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}

function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && props.task && title !== props.task.title) emit('update', { title })
}

/** 編集中の✗＝保存せずに編集をやめてそのまま削除確認へ（一気に削除できるように）。 */
function cancelEditAndDelete() {
  editingTitle.value = false
  emit('delete')
}

/**
 * カテゴリのチップをクリックしてON/OFF。複数選択可＝タスクは1つ以上のカテゴリに同時掲載できる。
 * 最後の1つは外せない（タスクがどこにも属さなくなるのを防ぐ。サーバー側にも同じ制約がある）。
 */
function onToggleCategory(categoryId: string) {
  if (!props.task) return
  const current = props.task.categoryIds
  if (current.includes(categoryId)) {
    if (current.length <= 1) return
    emit('update', { categoryIds: current.filter((id) => id !== categoryId) })
  } else {
    emit('update', { categoryIds: [...current, categoryId] })
  }
}
function isOnlySelectedCategory(categoryId: string): boolean {
  return !!props.task && props.task.categoryIds.length === 1 && props.task.categoryIds[0] === categoryId
}

// ── サブタスクのドラッグ&ドロップ（上下の入れ替え）──────────────────────────────
const dragSubtaskId = ref<string | null>(null)
const dragOverSubtaskId = ref<string | null>(null)

function onSubtaskDragStart(e: DragEvent, subtask: KoubaSubtask) {
  dragSubtaskId.value = subtask.id
  e.dataTransfer?.setData('text/plain', subtask.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onSubtaskDragEnd() {
  dragSubtaskId.value = null
  dragOverSubtaskId.value = null
}
function onSubtaskDragOver(subtask: KoubaSubtask) {
  if (!dragSubtaskId.value || dragSubtaskId.value === subtask.id) return
  dragOverSubtaskId.value = subtask.id
}
/** targetSubtask の手前に挿入する（カテゴリ・タスクのドラッグ&ドロップと同じ規則）。 */
function onSubtaskDrop(targetSubtask: KoubaSubtask) {
  const draggedId = dragSubtaskId.value
  onSubtaskDragEnd()
  if (!draggedId || draggedId === targetSubtask.id || !props.task) return
  const ids = props.task.subtasks.map((s) => s.id).filter((id) => id !== draggedId)
  let insertAt = ids.indexOf(targetSubtask.id)
  if (insertAt < 0) insertAt = ids.length
  ids.splice(insertAt, 0, draggedId)
  emit('reorderSubtasks', ids)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && task"
      class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="w-[min(560px,100%)] max-h-[88vh] bg-[#1e293b] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <!-- ヘッダー: アイコン・タイトル編集・カテゴリ移動・合計時間・削除/閉じる -->
        <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 relative">
              <button
                type="button"
                class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-base shrink-0 overflow-hidden hover:border-white/25"
                title="アイコンをAIで作り直す"
                @click="editingIcon = !editingIcon"
              >
                <KoubaIcon :icon="task.icon" :busy="iconBusy" />
              </button>
              <div v-if="editingIcon" class="absolute top-full left-0 mt-1 z-10 w-64 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl" @click.stop>
                <KoubaIconEditor
                  :icon="task.icon"
                  :busy="iconBusy"
                  @regenerate="(instruction) => emit('regenerateIcon', instruction)"
                  @close="editingIcon = false"
                />
              </div>

              <input
                v-if="editingTitle"
                ref="titleInputEl"
                v-model="titleDraft"
                class="flex-1 min-w-0 bg-white/[0.06] border border-sky-400/50 rounded-lg px-2.5 py-1.5 text-slate-50 text-base font-bold outline-none"
                @keydown.enter="runOnEnter($event, commitTitle)"
                @blur="commitTitle"
              />
              <!-- 編集中だけ出す✗＝保存せずそのまま削除確認へ（mousedown.prevent で input の blur による保存を先に発火させない） -->
              <button
                v-if="editingTitle"
                type="button"
                class="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
                title="編集をやめて削除"
                @mousedown.prevent="cancelEditAndDelete"
              >✗</button>
              <h2 v-else class="flex-1 min-w-0 m-0 text-base font-bold text-slate-50 truncate cursor-text" title="クリックして編集" @click="startEditTitle">
                {{ task.title }}
              </h2>
            </div>

            <!-- カテゴリは複数選択可（チップのON/OFF）＝チェックしたカテゴリすべての枠に同じタスクが表示される -->
            <div class="mt-2">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">カテゴリ（複数選択可）</label>
              <div class="mt-1 flex flex-wrap gap-1.5">
                <button
                  v-for="c in categories"
                  :key="c.id"
                  type="button"
                  class="h-6 pl-2 pr-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:cursor-not-allowed"
                  :class="task.categoryIds.includes(c.id)
                    ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                    : 'bg-white/[0.04] border-white/10 text-slate-400 hover:border-white/25'"
                  :disabled="isOnlySelectedCategory(c.id)"
                  :title="isOnlySelectedCategory(c.id) ? '最後の1つは外せません' : undefined"
                  @click="onToggleCategory(c.id)"
                >
                  <span v-if="!isSvgIcon(c.icon)">{{ c.icon }}</span>
                  <span>{{ c.name }}</span>
                </button>
              </div>
            </div>

            <!-- 直近で特に力を入れているタスクの印。ONにすると板の付箋がハイライトされる -->
            <label class="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-amber-300 cursor-pointer w-fit">
              <input
                type="checkbox"
                :checked="task.focused"
                class="accent-amber-400"
                @change="emit('update', { focused: ($event.target as HTMLInputElement).checked })"
              />
              ⭐ 直近で特に力を入れている
            </label>

            <!-- 補足の説明文（任意）。フォーカスを外すとまとめて保存する -->
            <textarea
              v-model="descriptionDraft"
              rows="2"
              :maxlength="KOUBA_DESCRIPTION_MAX"
              placeholder="説明を追加（任意）"
              class="mt-2 w-full resize-none bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-300 outline-none focus:border-sky-400/50 font-[inherit] leading-snug"
              @blur="commitDescription"
            />

            <div class="mt-1.5 text-2xl font-extrabold text-amber-300 tabular-nums">
              {{ formatHours(task.totalHours) }}<span class="text-sm font-semibold text-slate-400 ml-1">時間</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-300 flex items-center justify-center"
              title="タスクを削除"
              @click="emit('delete')"
            >🗑</button>
            <button class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center" title="閉じる" @click="close">✕</button>
          </div>
        </div>

        <!-- 本体: スクロール -->
        <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          <!-- サブタスクの追加（時間もまとめて1個入れる。日別には分けない） -->
          <form class="flex gap-2" @submit.prevent="submitAddSubtask">
            <input
              v-model="subtaskTitleDraft"
              type="text"
              placeholder="サブタスクを追加（例: 資料を作成する）"
              class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              @keydown.enter="runOnEnter($event, submitAddSubtask)"
            />
            <KoubaHoursStepper v-model="subtaskHoursDraft" />
            <button
              type="submit"
              class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40 shrink-0"
              :disabled="saving"
            >追加</button>
          </form>
          <p v-if="error" class="text-xs text-rose-400 m-0">{{ error }}</p>

          <!-- サブタスク一覧。時間は日別に分けず1個の値をまとめて持ち、その場で編集できる。ドラッグで上下に並べ替え可能 -->
          <div class="flex flex-col gap-2">
            <div v-if="!task.subtasks.length" class="text-center text-slate-500 text-[13px] py-6">まだサブタスクがありません</div>
            <KoubaSubtaskCard
              v-for="st in task.subtasks"
              :key="st.id"
              :subtask="st"
              :saving="saving"
              :dragging="dragSubtaskId === st.id"
              :drop-target="dragOverSubtaskId === st.id"
              @rename="(title) => emit('updateSubtask', { id: st.id, title })"
              @set-hours="(hours) => emit('setSubtaskHours', { id: st.id, hours })"
              @delete="emit('deleteSubtask', st)"
              @dragstart="(e) => onSubtaskDragStart(e, st)"
              @dragend="onSubtaskDragEnd"
              @dragover="onSubtaskDragOver(st)"
              @drop="onSubtaskDrop(st)"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
