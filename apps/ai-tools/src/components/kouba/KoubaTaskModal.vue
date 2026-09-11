<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { KoubaTask, KoubaSubtask } from '~/types/kouba'
import { KOUBA_MIN_HOURS, KOUBA_MAX_HOURS, isSvgIcon } from '~/types/kouba'
import KoubaIcon from '~/components/kouba/KoubaIcon.vue'
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
  update: [patch: { title?: string; categoryId?: string }]
  regenerateIcon: [instruction: string]
  delete: []
  addSubtask: [payload: { title: string; hours: number }]
  updateSubtask: [payload: { id: string; title?: string; hours?: number }]
  deleteSubtask: [subtask: KoubaSubtask]
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

const HOUR_OPTIONS = Array.from({ length: KOUBA_MAX_HOURS - KOUBA_MIN_HOURS + 1 }, (_, i) => i + KOUBA_MIN_HOURS)

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)
const editingIcon = ref(false)
const subtaskTitleDraft = ref('')
const subtaskHoursDraft = ref(KOUBA_MIN_HOURS)

watch(
  () => props.show,
  (v) => {
    if (v) {
      editingTitle.value = false
      editingIcon.value = false
      subtaskTitleDraft.value = ''
      subtaskHoursDraft.value = KOUBA_MIN_HOURS
    }
  }
)

function submitAddSubtask() {
  const title = subtaskTitleDraft.value.trim()
  if (!title) return
  emit('addSubtask', { title, hours: Number(subtaskHoursDraft.value) })
  subtaskTitleDraft.value = ''
  subtaskHoursDraft.value = KOUBA_MIN_HOURS
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

function onChangeCategory(e: Event) {
  const categoryId = (e.target as HTMLSelectElement).value
  if (props.task && categoryId && categoryId !== props.task.categoryId) emit('update', { categoryId })
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
              <h2 v-else class="flex-1 min-w-0 m-0 text-base font-bold text-slate-50 truncate cursor-text" title="クリックして編集" @click="startEditTitle">
                {{ task.title }}
              </h2>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">カテゴリ</label>
              <select
                class="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-slate-200 text-xs outline-none focus:border-sky-400/50"
                :value="task.categoryId"
                @change="onChangeCategory"
              >
                <!-- <option> には画像を入れられないので、AI生成(SVG)のアイコンは出さず名前だけにする -->
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ isSvgIcon(c.icon) ? c.name : `${c.icon} ${c.name}` }}</option>
              </select>
            </div>

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
          <!-- サブタスクの追加（時間もまとめて1個選ぶ。日別には分けない） -->
          <form class="flex gap-2" @submit.prevent="submitAddSubtask">
            <input
              v-model="subtaskTitleDraft"
              type="text"
              placeholder="サブタスクを追加（例: 資料を作成する）"
              class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              @keydown.enter="runOnEnter($event, submitAddSubtask)"
            />
            <select
              v-model.number="subtaskHoursDraft"
              class="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50 shrink-0"
            >
              <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ h }}時間</option>
            </select>
            <button
              type="submit"
              class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40 shrink-0"
              :disabled="saving"
            >追加</button>
          </form>
          <p v-if="error" class="text-xs text-rose-400 m-0">{{ error }}</p>

          <!-- サブタスク一覧。時間は日別に分けず1個の値をまとめて持ち、その場で編集できる -->
          <div class="flex flex-col gap-2">
            <div v-if="!task.subtasks.length" class="text-center text-slate-500 text-[13px] py-6">まだサブタスクがありません</div>
            <KoubaSubtaskCard
              v-for="st in task.subtasks"
              :key="st.id"
              :subtask="st"
              :saving="saving"
              @rename="(title) => emit('updateSubtask', { id: st.id, title })"
              @set-hours="(hours) => emit('updateSubtask', { id: st.id, hours })"
              @delete="emit('deleteSubtask', st)"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
