<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Board } from '~/composables/task/useTaskBoards'
import TaskDatePicker from './TaskDatePicker.vue'

type TaskForm = { name: string; desc: string; due: string; boardId: string; status: 'todo' | 'doing' | 'done'; isImportant: boolean; effort: number }

const props = defineProps<{
  show: boolean
  boards: Board[]
  isEditing: boolean
  modalTitle: string
  initialForm: TaskForm
  saving: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [form: TaskForm]
  delete: []
}>()

const form = ref<TaskForm>({ name: '', desc: '', due: '', boardId: '', status: 'todo', isImportant: false, effort: 1 })

watch(() => props.show, (v) => {
  if (v) form.value = { ...props.initialForm }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="emit('update:show', false)">
      <div class="w-[min(480px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-3">
        <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">{{ modalTitle }}</h2>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">タスク名 <span class="text-red-400">*</span></label>
          <input
            v-model="form.name"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]"
            type="text"
            placeholder="タスク名を入力"
            autofocus
            @keydown.enter="(e) => { if (!e.isComposing) emit('save', form) }"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">概要</label>
          <textarea
            v-model="form.desc"
            class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] leading-relaxed"
            rows="3"
            placeholder="概要・メモ"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">期限</label>
          <TaskDatePicker v-model="form.due" />
        </div>

        <div class="flex gap-3">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">ボード</label>
            <select
              v-model="form.boardId"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 [color-scheme:dark] cursor-pointer"
            >
              <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">リスト</label>
            <select
              v-model="form.status"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 [color-scheme:dark] cursor-pointer"
            >
              <option value="todo">TODO</option>
              <option value="doing">DOING</option>
              <option value="done">DONE</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em]">工数</label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="w-7 h-[38px] rounded-lg bg-white/[0.06] border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.12] transition-all cursor-pointer text-base leading-none"
                @click="form.effort = Math.max(1, form.effort - 1)"
              >−</button>
              <span class="w-7 text-center text-[15px] font-bold text-slate-200 select-none">{{ form.effort }}</span>
              <button
                type="button"
                class="w-7 h-[38px] rounded-lg bg-white/[0.06] border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.12] transition-all cursor-pointer text-base leading-none"
                @click="form.effort = Math.min(99, form.effort + 1)"
              >＋</button>
            </div>
          </div>
        </div>

        <label class="flex items-center gap-2.5 cursor-pointer select-none group w-fit">
          <div
            :class="[
              'w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0',
              form.isImportant
                ? 'bg-red-500/20 border-red-400/70'
                : 'bg-white/[0.04] border-white/20 group-hover:border-white/40',
            ]"
            @click="form.isImportant = !form.isImportant"
          >
            <svg v-if="form.isImportant" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span :class="['text-[13px] font-medium transition-colors', form.isImportant ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-300']">重要</span>
        </label>

        <div v-if="error" class="px-3 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[13px]">⚠ {{ error }}</div>

        <div class="flex items-center gap-2 mt-1">
          <button
            v-if="isEditing"
            class="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[13px] cursor-pointer transition-all hover:bg-red-500/20 disabled:opacity-40"
            :disabled="saving"
            @click="emit('delete')"
          >削除</button>
          <div class="flex-1" />
          <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="emit('update:show', false)">キャンセル</button>
          <button
            class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="saving || !form.name.trim()"
            @click="emit('save', form)"
          >{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
