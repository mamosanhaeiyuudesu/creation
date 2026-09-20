<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { KoubaJob, KoubaTask } from '~/types/kouba'
import { KOUBA_MIN_HOURS, KOUBA_DESCRIPTION_MAX, isSvgIcon, formatKoubaHours } from '~/types/kouba'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'
import KoubaIconEditor from '~/components/kouba/KoubaIconEditor.vue'
import KoubaTaskCard from '~/components/kouba/KoubaTaskCard.vue'

const props = defineProps<{
  show: boolean
  job: KoubaJob | null
  categories: { id: string; name: string; icon: string }[]
  saving: boolean
  error: string
  /** AI がこのジョブのアイコンを作成中か */
  iconBusy: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  update: [patch: { title?: string; categoryIds?: string[]; focused?: boolean; description?: string }]
  /** 稼働停止中の切り替え。ジョブは終わったというより「いずれまたやる」ことが多いので、完了ではなくこの状態にする。 */
  setPaused: [paused: boolean]
  regenerateIcon: [instruction: string]
  delete: []
  addTask: [payload: { title: string; hours: number }]
  updateTask: [payload: { id: string; title: string }]
  /** 時間の +/-。連打されるので rename とは別の口にして、ページ側でまとめ保存に回す。 */
  setTaskHours: [payload: { id: string; hours: number }]
  /** 完了の切り替え。チェックを入れると「完了済み」へ移り、外すと元の位置に戻る（時間は合計に残る）。 */
  setTaskDone: [payload: { id: string; done: boolean }]
  deleteTask: [task: KoubaTask]
  /** ドラッグ&ドロップでの並べ替え。新しい並び順どおりの全タスクIDを渡す。 */
  reorderTasks: [taskIds: string[]]
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
const taskTitleDraft = ref('')
/** 追加フォームの初期値。0時間で追加して、やったぶんだけ +/- で足していく。 */
const TASK_HOURS_DEFAULT = KOUBA_MIN_HOURS
const taskHoursDraft = ref(TASK_HOURS_DEFAULT)
const descriptionDraft = ref('')

// 完了したタスクは一覧の下の折りたたみへ分ける（サブタスク一覧の「完了済み」と同じ作り）。
// 並び順（sort_order）は完了にしても変えないので、戻せば元の位置に戻る。
const activeTasks = computed(() => props.job?.tasks.filter((t) => !t.done) ?? [])
const doneTasks = computed(() => props.job?.tasks.filter((t) => t.done) ?? [])
const showDone = ref(false)

watch(
  () => props.show,
  (v) => {
    if (v) {
      editingTitle.value = false
      editingIcon.value = false
      showDone.value = false
      taskTitleDraft.value = ''
      taskHoursDraft.value = TASK_HOURS_DEFAULT
      descriptionDraft.value = props.job?.description ?? ''
    }
  }
)

/** 説明はフォーカスを外したときにまとめて保存する（名前と同じ「押すたび保存」しない方式）。 */
function commitDescription() {
  if (!props.job) return
  const description = descriptionDraft.value.trim()
  if (description !== props.job.description) emit('update', { description })
}

function submitAddTask() {
  const title = taskTitleDraft.value.trim()
  if (!title) return
  emit('addTask', { title, hours: Number(taskHoursDraft.value) })
  taskTitleDraft.value = ''
  taskHoursDraft.value = TASK_HOURS_DEFAULT
}

function close() {
  emit('update:show', false)
}

function formatHours(h: number): string {
  return (Math.round(h * 100) / 100).toString()
}

function startEditTitle() {
  if (!props.job) return
  titleDraft.value = props.job.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}

function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && props.job && title !== props.job.title) emit('update', { title })
}

/** 編集中の✗＝保存せずに編集をやめてそのまま削除確認へ（一気に削除できるように）。 */
function cancelEditAndDelete() {
  editingTitle.value = false
  emit('delete')
}

/**
 * カテゴリのチップをクリックしてON/OFF。複数選択可＝ジョブは1つ以上のカテゴリに同時掲載できる。
 * 最後の1つは外せない（ジョブがどこにも属さなくなるのを防ぐ。サーバー側にも同じ制約がある）。
 */
function onToggleCategory(categoryId: string) {
  if (!props.job) return
  const current = props.job.categoryIds
  if (current.includes(categoryId)) {
    if (current.length <= 1) return
    emit('update', { categoryIds: current.filter((id) => id !== categoryId) })
  } else {
    emit('update', { categoryIds: [...current, categoryId] })
  }
}
function isOnlySelectedCategory(categoryId: string): boolean {
  return !!props.job && props.job.categoryIds.length === 1 && props.job.categoryIds[0] === categoryId
}

// ── タスクのドラッグ&ドロップ（上下の入れ替え）──────────────────────────────
const dragTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)

function onTaskDragStart(e: DragEvent, task: KoubaTask) {
  dragTaskId.value = task.id
  e.dataTransfer?.setData('text/plain', task.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onTaskDragEnd() {
  dragTaskId.value = null
  dragOverTaskId.value = null
}
function onTaskDragOver(task: KoubaTask) {
  if (!dragTaskId.value || dragTaskId.value === task.id) return
  dragOverTaskId.value = task.id
}
/** targetTask の手前に挿入する（カテゴリ・ジョブのドラッグ&ドロップと同じ規則）。 */
function onTaskDrop(targetTask: KoubaTask) {
  const draggedId = dragTaskId.value
  onTaskDragEnd()
  if (!draggedId || draggedId === targetTask.id || !props.job) return
  const ids = props.job.tasks.map((t) => t.id).filter((id) => id !== draggedId)
  let insertAt = ids.indexOf(targetTask.id)
  if (insertAt < 0) insertAt = ids.length
  ids.splice(insertAt, 0, draggedId)
  emit('reorderTasks', ids)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && job"
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
                <KoubaIcon :icon="job.icon" :busy="iconBusy" />
              </button>
              <div v-if="editingIcon" class="absolute top-full left-0 mt-1 z-10 w-64 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl" @click.stop>
                <KoubaIconEditor
                  :icon="job.icon"
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
                {{ job.title }}
              </h2>
              <span
                v-if="job.paused && !editingTitle"
                class="shrink-0 h-5 px-2 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold flex items-center"
              >⏸ 稼働停止中</span>
            </div>

            <!-- カテゴリは複数選択可（チップのON/OFF）＝チェックしたカテゴリすべての枠に同じジョブが表示される -->
            <div class="mt-2">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">カテゴリ（複数選択可）</label>
              <div class="mt-1 flex flex-wrap gap-1.5">
                <button
                  v-for="c in categories"
                  :key="c.id"
                  type="button"
                  class="h-6 pl-2 pr-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:cursor-not-allowed"
                  :class="job.categoryIds.includes(c.id)
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

            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <!-- 直近で特に力を入れているジョブの印。ONにすると板の付箋がハイライトされる。停止中は付けられない（停止にすると外れる） -->
              <label
                class="flex items-center gap-1.5 text-[12px] font-semibold w-fit"
                :class="job.paused ? 'text-slate-600 cursor-not-allowed' : 'text-amber-300 cursor-pointer'"
                :title="job.paused ? '稼働停止中は付けられません' : undefined"
              >
                <input
                  type="checkbox"
                  :checked="job.focused"
                  :disabled="job.paused"
                  class="accent-amber-400"
                  @change="emit('update', { focused: ($event.target as HTMLInputElement).checked })"
                />
                ⭐ 直近で特に力を入れている
              </label>

              <!-- 終わったジョブは「完了」ではなく稼働停止中にする（いずれ再開することが多いため）。板ではカテゴリ枠の下へ畳まれる -->
              <button
                type="button"
                class="h-6 px-2.5 rounded-full border text-[11px] font-semibold transition-colors"
                :class="job.paused
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 hover:bg-sky-500/30'
                  : 'bg-white/[0.04] border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'"
                :title="job.paused ? '板の付箋に戻します' : '板からは畳んで、いつでも再開できます'"
                @click="emit('setPaused', !job.paused)"
              >{{ job.paused ? '▶ 稼働を再開する' : '⏸ 稼働停止中にする' }}</button>
            </div>

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
              {{ formatHours(job.totalHours) }}<span class="text-sm font-semibold text-slate-400 ml-1">時間</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 hover:text-rose-300 flex items-center justify-center"
              title="ジョブを削除"
              @click="emit('delete')"
            >🗑</button>
            <button class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center" title="閉じる" @click="close">✕</button>
          </div>
        </div>

        <!-- 本体: スクロール -->
        <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          <!-- タスクの追加（時間もまとめて1個入れる。日別には分けない） -->
          <form class="flex gap-2" @submit.prevent="submitAddTask">
            <input
              v-model="taskTitleDraft"
              type="text"
              placeholder="タスクを追加（例: 資料を作成する）"
              class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              @keydown.enter="runOnEnter($event, submitAddTask)"
            />
            <KoubaHoursStepper v-model="taskHoursDraft" />
            <button
              type="submit"
              class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40 shrink-0"
              :disabled="saving"
            >追加</button>
          </form>
          <p v-if="error" class="text-xs text-rose-400 m-0">{{ error }}</p>

          <!-- タスク一覧。時間は日別に分けず1個の値をまとめて持ち、その場で編集できる。ドラッグで上下に並べ替え可能 -->
          <div class="flex flex-col gap-2">
            <div v-if="!job.tasks.length" class="text-center text-slate-500 text-[13px] py-6">まだタスクがありません</div>
            <div v-else-if="!activeTasks.length" class="text-center text-slate-500 text-[13px] py-4">すべて完了しました</div>
            <KoubaTaskCard
              v-for="t in activeTasks"
              :key="t.id"
              :task="t"
              :saving="saving"
              :dragging="dragTaskId === t.id"
              :drop-target="dragOverTaskId === t.id"
              @rename="(title) => emit('updateTask', { id: t.id, title })"
              @set-hours="(hours) => emit('setTaskHours', { id: t.id, hours })"
              @complete="emit('setTaskDone', { id: t.id, done: true })"
              @delete="emit('deleteTask', t)"
              @dragstart="(e) => onTaskDragStart(e, t)"
              @dragend="onTaskDragEnd"
              @dragover="onTaskDragOver(t)"
              @drop="onTaskDrop(t)"
            />
          </div>

          <!-- 完了済み（折りたたみ）。チェックを外すと元の位置に戻る。時間はジョブの合計に含まれたまま -->
          <div v-if="doneTasks.length" class="border-t border-white/10 pt-2">
            <button
              type="button"
              class="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 px-0.5"
              @click="showDone = !showDone"
            >
              <span>✅ 完了済み（{{ doneTasks.length }}）</span>
              <span>{{ showDone ? '▲' : '▼' }}</span>
            </button>
            <div v-if="showDone" class="flex flex-col gap-1.5 mt-1.5">
              <div
                v-for="t in doneTasks"
                :key="t.id"
                class="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked
                  class="w-4 h-4 shrink-0 rounded border-white/20 bg-white/[0.06] accent-sky-500 cursor-pointer"
                  title="未完了に戻す"
                  aria-label="未完了に戻す"
                  @change="emit('setTaskDone', { id: t.id, done: false })"
                />
                <span class="flex-1 min-w-0 text-[12.5px] text-slate-500 line-through truncate" :title="t.title">{{ t.title }}</span>
                <span class="text-[11px] text-slate-500 tabular-nums shrink-0">{{ formatKoubaHours(t.hours) }}</span>
                <button
                  type="button"
                  class="w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
                  title="タスクを削除"
                  :disabled="saving"
                  @click="emit('deleteTask', t)"
                >🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
