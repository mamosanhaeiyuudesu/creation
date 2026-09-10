<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { KoubaTask, KoubaSubtask, KoubaSubtaskLog } from '~/types/kouba'
import KoubaIconPicker from '~/components/kouba/KoubaIconPicker.vue'
import KoubaSubtaskCard from '~/components/kouba/KoubaSubtaskCard.vue'

const props = defineProps<{
  show: boolean
  task: KoubaTask | null
  categories: { id: string; name: string; icon: string }[]
  saving: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  update: [patch: { title?: string; icon?: string; categoryId?: string }]
  delete: []
  addSubtask: [title: string]
  renameSubtask: [payload: { id: string; title: string }]
  deleteSubtask: [subtask: KoubaSubtask]
  setSubtaskLog: [payload: { subtaskId: string; workDate: string; hours: number }]
  deleteSubtaskLog: [log: KoubaSubtaskLog]
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
const subtaskDraft = ref('')

watch(
  () => props.show,
  (v) => {
    if (v) {
      editingTitle.value = false
      editingIcon.value = false
      subtaskDraft.value = ''
    }
  }
)

function submitAddSubtask() {
  const title = subtaskDraft.value.trim()
  if (!title) return
  emit('addSubtask', title)
  subtaskDraft.value = ''
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

function onPickIcon(icon: string) {
  editingIcon.value = false
  if (props.task && icon && icon !== props.task.icon) emit('update', { icon })
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
                class="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-base shrink-0 hover:border-white/25"
                title="アイコンを変更"
                @click="editingIcon = !editingIcon"
              >{{ task.icon }}</button>
              <div v-if="editingIcon" class="absolute top-full left-0 mt-1 z-10 w-56 bg-[#0f172a] border border-white/10 rounded-xl p-2.5 shadow-xl" @click.stop>
                <KoubaIconPicker :model-value="task.icon" @update:model-value="onPickIcon" />
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
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.icon }} {{ c.name }}</option>
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
          <!-- サブタスクの追加 -->
          <form class="flex gap-2" @submit.prevent="submitAddSubtask">
            <input
              v-model="subtaskDraft"
              type="text"
              placeholder="サブタスクを追加（例: 資料を作成する）"
              class="flex-1 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              @keydown.enter="runOnEnter($event, submitAddSubtask)"
            />
            <button
              type="submit"
              class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40 shrink-0"
              :disabled="saving"
            >追加</button>
          </form>
          <p v-if="error" class="text-xs text-rose-400 m-0">{{ error }}</p>

          <!-- サブタスク一覧。各サブタスクの中に日別の作業時間 -->
          <div class="flex flex-col gap-2.5">
            <div v-if="!task.subtasks.length" class="text-center text-slate-500 text-[13px] py-6">まだサブタスクがありません</div>
            <KoubaSubtaskCard
              v-for="st in task.subtasks"
              :key="st.id"
              :subtask="st"
              :saving="saving"
              @rename="(title) => emit('renameSubtask', { id: st.id, title })"
              @delete="emit('deleteSubtask', st)"
              @set-log="(payload) => emit('setSubtaskLog', { subtaskId: st.id, ...payload })"
              @delete-log="(log) => emit('deleteSubtaskLog', log)"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
