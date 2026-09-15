<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { KoubaTaskOption } from '~/components/kouba/KoubaSubtasksSection.vue'
import { KOUBA_MIN_HOURS } from '~/types/kouba'
import KoubaHoursStepper from '~/components/kouba/KoubaHoursStepper.vue'

// サブタスクの追加をポップアップで行う。送信後は「続けて入力しますか？」を挟み、
// はいなら紐付けタスクの選択はそのまま残してフォームへ戻る（連続して書き留めやすくするため）。
const props = defineProps<{
  show: boolean
  taskOptions: KoubaTaskOption[]
  /** 実際の送信処理。成功したら true（呼び出し側の actionError も見て判定する想定）。 */
  onSubmit: (payload: { taskId: string | null; title: string; hours: number }) => Promise<boolean>
  saving: boolean
  error: string
}>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}
function runOnEnter(e: KeyboardEvent, fn: () => void) {
  if (isImeEnter(e)) return
  fn()
}

const HOURS_DEFAULT = KOUBA_MIN_HOURS
const stage = ref<'form' | 'ask'>('form')
const titleDraft = ref('')
const taskIdDraft = ref('')
const hoursDraft = ref(HOURS_DEFAULT)
const lastTitle = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)

watch(
  () => props.show,
  (v) => {
    if (!v) return
    stage.value = 'form'
    titleDraft.value = ''
    taskIdDraft.value = ''
    hoursDraft.value = HOURS_DEFAULT
    nextTick(() => titleInputEl.value?.focus())
  }
)

async function submit() {
  const title = titleDraft.value.trim()
  if (!title) return
  const ok = await props.onSubmit({ taskId: taskIdDraft.value || null, title, hours: Number(hoursDraft.value) })
  if (ok) {
    lastTitle.value = title
    stage.value = 'ask'
  }
}

/** 続けて入力する＝紐付けタスクの選択はそのまま残し、タイトル・時間だけリセットしてフォームへ戻る。 */
function continueAdding() {
  stage.value = 'form'
  titleDraft.value = ''
  hoursDraft.value = HOURS_DEFAULT
  nextTick(() => titleInputEl.value?.focus())
}

function close() {
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" @click.self="close">
      <div class="w-[min(420px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/[0.08]">
          <h2 class="m-0 text-sm font-bold text-slate-50">🧩 サブタスクを追加</h2>
          <button class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center" title="閉じる" @click="close">✕</button>
        </div>

        <div v-if="stage === 'form'" class="px-5 py-4 flex flex-col gap-3">
          <form class="flex flex-col gap-2.5" @submit.prevent="submit">
            <input
              ref="titleInputEl"
              v-model="titleDraft"
              type="text"
              placeholder="サブタスクを書く（例: 参考記事を探す）"
              class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              @keydown.enter="runOnEnter($event, submit)"
            />
            <div>
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">紐付けるタスク（任意）</label>
              <select
                v-model="taskIdDraft"
                class="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-2 text-slate-100 text-[13px] outline-none focus:border-sky-400/50"
              >
                <option value="">タスクなし</option>
                <option v-for="o in taskOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
              </select>
            </div>
            <div class="flex items-center justify-between gap-2">
              <KoubaHoursStepper v-model="hoursDraft" />
              <button
                type="submit"
                class="h-9 px-4 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400 disabled:opacity-40"
                :disabled="saving || !titleDraft.trim()"
              >追加</button>
            </div>
          </form>
          <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>
        </div>

        <div v-else class="px-5 py-5 flex flex-col items-center gap-3 text-center">
          <p class="m-0 text-[13px] text-slate-200">「{{ lastTitle }}」を追加しました。<br />続けてサブタスクを入力しますか？</p>
          <div class="flex gap-2 w-full">
            <button
              class="flex-1 h-9 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400"
              @click="continueAdding"
            >続けて入力する</button>
            <button
              class="flex-1 h-9 rounded-full bg-white/10 text-slate-300 text-[13px] font-bold hover:bg-white/20"
              @click="close"
            >閉じる</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
