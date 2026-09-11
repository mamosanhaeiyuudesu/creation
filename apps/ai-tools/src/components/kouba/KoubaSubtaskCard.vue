<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'

const props = defineProps<{ subtask: KoubaSubtask; saving: boolean }>()
const emit = defineEmits<{
  rename: [title: string]
  setHours: [hours: number]
  delete: []
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
  titleDraft.value = props.subtask.title
  editingTitle.value = true
  nextTick(() => titleInputEl.value?.focus())
}
function commitTitle() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const title = titleDraft.value.trim()
  if (title && title !== props.subtask.title) emit('rename', title)
}
</script>

<template>
  <div class="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-2">
    <input
      v-if="editingTitle"
      ref="titleInputEl"
      v-model="titleDraft"
      class="flex-1 min-w-0 bg-white/[0.08] border border-sky-400/50 rounded-lg px-2 py-1 text-slate-50 text-[13px] font-bold outline-none"
      @keydown.enter="runOnEnter($event, commitTitle)"
      @blur="commitTitle"
    />
    <h3
      v-else
      class="flex-1 min-w-0 m-0 text-[13px] font-bold text-slate-100 truncate cursor-text"
      title="クリックして編集"
      @click="startEdit"
    >{{ subtask.title }}</h3>

    <!-- +/- を押すたびその場で保存する（30分刻み） -->
    <KoubaHoursStepper
      :model-value="subtask.hours"
      :disabled="saving"
      @update:model-value="(hours) => emit('setHours', hours)"
    />

    <button
      class="w-7 h-7 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs shrink-0"
      title="サブタスクを削除"
      :disabled="saving"
      @click="emit('delete')"
    >🗑</button>
  </div>
</template>
