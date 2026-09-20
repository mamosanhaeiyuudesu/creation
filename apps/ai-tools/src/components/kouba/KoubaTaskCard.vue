<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaTask } from '~/types/kouba'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'

// ジョブ詳細モーダルの中の1行＝「タスク」（旧「サブタスク」）。時間は+/-で30分ずつ手入力する。
// 左のチェックボックスで完了にすると、この行は一覧から消えてモーダル下部の「完了済み」へ移る
// （完了済みの行の描画と、チェックを外して戻す操作は KoubaJobModal 側）。
const props = defineProps<{ task: KoubaTask; saving: boolean; dragging?: boolean; dropTarget?: boolean }>()
const emit = defineEmits<{
  rename: [title: string]
  setHours: [hours: number]
  /** 完了にする（チェックを入れた）。この行は一覧から外れて「完了済み」へ移る。 */
  complete: []
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
    class="relative rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-2 transition-colors"
    :class="dragging ? 'opacity-40' : ''"
    @dragover.prevent="emit('dragover')"
    @drop.prevent="emit('drop')"
  >
    <!-- 掴んだタスクが入り込む場所を、カードのハイライトではなく上端の線で示す -->
    <div
      v-if="dropTarget"
      class="absolute left-1 right-1 -top-1.5 h-0.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.7)] pointer-events-none"
    ></div>
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
      <input
        type="checkbox"
        class="w-4 h-4 shrink-0 rounded border-white/20 bg-white/[0.06] accent-sky-500 cursor-pointer"
        title="完了にする"
        aria-label="完了にする"
        @change="emit('complete')"
      />
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
