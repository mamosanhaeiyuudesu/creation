<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaTask } from '~/types/kouba'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'

// ジョブ詳細モーダルの中の1行＝「タスク」（旧「サブタスク」）。時間は+/-で手入力できるほか、
// このタスクに紐づく「サブタスク」をDONEにすると自動でも増える（サブタスクの操作は"今のテーマ"下の一覧で行う）。
const props = defineProps<{ task: KoubaTask; saving: boolean; dragging?: boolean; dropTarget?: boolean }>()
const emit = defineEmits<{
  rename: [title: string]
  setHours: [hours: number]
  delete: []
  dragstart: [event: DragEvent]
  dragend: []
  dragover: []
  drop: []
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
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

function startEdit() {
  titleDraft.value = props.task.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}
function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && title !== props.task.title) emit('rename', title)
}

/** 編集中の✗＝保存せずに編集をやめてそのまま削除（一気に削除できるように）。 */
function cancelEditAndDelete() {
  editingTitle.value = false
  emit('delete')
}
</script>

<template>
  <div
    class="rounded-xl border bg-white/[0.03] p-3 flex items-center gap-2 transition-colors"
    :class="[dragging ? 'opacity-40' : '', dropTarget ? 'border-sky-500' : 'border-white/10']"
    @dragover.prevent="emit('dragover')"
    @drop.prevent="emit('drop')"
  >
    <!-- 掴むハンドル。編集中は掴めなくする（入力欄でのドラッグ選択を邪魔しないため） -->
    <span
      class="w-5 h-7 flex items-center justify-center text-slate-600 text-sm select-none shrink-0"
      :class="editingTitle ? '' : 'cursor-grab active:cursor-grabbing'"
      :draggable="!editingTitle"
      title="ドラッグして並べ替え"
      @dragstart="emit('dragstart', $event)"
      @dragend="emit('dragend')"
    >⠿</span>
    <!-- 編集中は時間の+/-と🗑を隠し、✗だけにする（1行に削除ボタンが2つ並ぶのを避けるため） -->
    <template v-if="editingTitle">
      <input
        ref="titleInputEl"
        v-model="titleDraft"
        class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-[13px] font-bold outline-none"
        @keydown.enter="runOnEnter($event, commitTitle)"
        @blur="commitTitle"
      />
      <!-- mousedown.prevent で input の blur による保存を先に発火させない -->
      <button
        type="button"
        class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
        title="編集をやめて削除"
        :disabled="saving"
        @mousedown.prevent="cancelEditAndDelete"
      >✗</button>
    </template>
    <template v-else>
      <h3
        class="flex-1 min-w-0 m-0 text-[13px] font-bold text-slate-100 truncate cursor-text"
        title="クリックして編集"
        @click="startEdit"
      >{{ task.title }}</h3>

      <!-- +/- を押すたびその場で保存する（30分刻み） -->
      <KoubaHoursStepper
        :model-value="task.hours"
        :disabled="saving"
        @update:model-value="(hours) => emit('setHours', hours)"
      />

      <button
        class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
        title="タスクを削除"
        :disabled="saving"
        @click="emit('delete')"
      >🗑</button>
    </template>
  </div>
</template>
