<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { KoubaTheme } from '~/types/kouba'
import { formatKoubaThemePeriod } from '~/types/kouba'

// 板のトップに掲げる「今のテーマ」。クリックで編集（カテゴリ名・タスク名と同じ操作）。
const props = defineProps<{
  theme: KoubaTheme | null
  historyCount: number
  saving: boolean
  error: string
}>()
const emit = defineEmits<{
  save: [text: string]
  openHistory: []
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

const editing = ref(false)
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

function startEdit() {
  draft.value = props.theme?.text ?? ''
  editing.value = true
  nextTick(() => inputEl.value?.focus())
}
function commit() {
  if (!editing.value) return
  editing.value = false
  const text = draft.value.trim()
  if (text !== (props.theme?.text ?? '')) emit('save', text)
}
function cancel() {
  editing.value = false
}
</script>

<template>
  <section class="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.07] to-transparent px-5 py-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-[11px] font-semibold text-amber-300/70 uppercase tracking-wider">今のテーマ</span>
      <button
        v-if="historyCount"
        class="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 shrink-0"
        @click="emit('openHistory')"
      >これまでのテーマ（{{ historyCount }}）</button>
    </div>

    <!-- 確定は Enter かフォーカスを外したとき、Esc で取り消し（掲げ直すと履歴が1件増えるので取り消せるようにしている） -->
    <input
      v-if="editing"
      ref="inputEl"
      v-model="draft"
      type="text"
      maxlength="200"
      placeholder="いま何に時間を使うか（例: 人間探求を深める）"
      class="mt-1.5 w-full bg-white/[0.08] border border-amber-400/50 rounded-lg px-3 py-2 text-slate-50 text-xl font-bold outline-none"
      @keydown.enter="isImeEnter($event) || commit()"
      @keydown.esc="cancel"
      @blur="commit"
    />
    <h2
      v-else-if="theme"
      class="mt-1.5 m-0 text-xl font-bold text-slate-50 cursor-text break-words"
      title="クリックして書き換え"
      @click="startEdit"
    >{{ theme.text }}</h2>
    <button
      v-else
      class="mt-1.5 text-slate-500 hover:text-slate-300 text-[15px] font-semibold"
      @click="startEdit"
    >＋ テーマを掲げる</button>

    <p v-if="theme && !editing" class="mt-1 mb-0 text-[11px] text-slate-500 tabular-nums">
      {{ formatKoubaThemePeriod(theme) }}
    </p>
    <p v-if="saving" class="mt-1 mb-0 text-[11px] text-slate-500">保存中…</p>
    <p v-if="error" class="mt-1 mb-0 text-[11px] text-rose-400">{{ error }}</p>
  </section>
</template>
