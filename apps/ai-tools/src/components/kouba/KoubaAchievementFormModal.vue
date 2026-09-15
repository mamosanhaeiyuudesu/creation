<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 「達成したこと」の記録をポップアップで行う。送信後は「続けて記録しますか？」を挟み、
// はいなら日付はそのまま（今日のまま、または直前に選んだ日のまま）でフォームへ戻る。
const props = defineProps<{
  show: boolean
  onSubmit: (payload: { text: string; achievedAt: string }) => Promise<boolean>
  saving: boolean
  error: string
}>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

/** 今日の日付（JST）を <input type="date"> 用の "YYYY-MM-DD" にする。 */
function todayDateInput(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

const stage = ref<'form' | 'ask'>('form')
const textDraft = ref('')
const dateDraft = ref(todayDateInput())
const lastText = ref('')
const textInputEl = ref<HTMLTextAreaElement | null>(null)

watch(
  () => props.show,
  (v) => {
    if (!v) return
    stage.value = 'form'
    textDraft.value = ''
    dateDraft.value = todayDateInput()
    nextTick(() => textInputEl.value?.focus())
  }
)

async function submit() {
  const text = textDraft.value.trim()
  if (!text) return
  const ok = await props.onSubmit({ text, achievedAt: dateDraft.value })
  if (ok) {
    lastText.value = text
    stage.value = 'ask'
  }
}

/** 続けて記録する＝日付はそのまま残し、本文だけリセットしてフォームへ戻る。 */
function continueAdding() {
  stage.value = 'form'
  textDraft.value = ''
  nextTick(() => textInputEl.value?.focus())
}

function close() {
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" @click.self="close">
      <div class="w-[min(460px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/[0.08]">
          <h2 class="m-0 text-sm font-bold text-slate-50">🏆 達成したことを記録</h2>
          <button class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center" title="閉じる" @click="close">✕</button>
        </div>

        <div v-if="stage === 'form'" class="px-5 py-4 flex flex-col gap-3">
          <form class="flex items-start gap-2.5" @submit.prevent="submit">
            <textarea
              ref="textInputEl"
              v-model="textDraft"
              rows="3"
              :maxlength="KOUBA_ACHIEVEMENT_TEXT_MAX"
              placeholder="達成したことを書く"
              class="flex-1 min-w-0 resize-none bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-sky-400/50 font-[inherit] leading-snug"
              @keydown.enter="isImeEnter($event) || submit()"
            />
            <div class="flex flex-col gap-1.5 shrink-0">
              <input
                v-model="dateDraft"
                type="date"
                class="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 outline-none focus:border-sky-400/50"
              />
              <button
                type="submit"
                class="h-8 px-4 rounded-full bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400 disabled:opacity-50"
                :disabled="saving || !textDraft.trim()"
              >追加</button>
            </div>
          </form>
          <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>
        </div>

        <div v-else class="px-5 py-5 flex flex-col items-center gap-3 text-center">
          <p class="m-0 text-[13px] text-slate-200">「{{ lastText.length > 40 ? `${lastText.slice(0, 40)}…` : lastText }}」を記録しました。<br />続けて記録しますか？</p>
          <div class="flex gap-2 w-full">
            <button
              class="flex-1 h-9 rounded-full bg-sky-500 text-white text-[13px] font-bold hover:bg-sky-400"
              @click="continueAdding"
            >続けて記録する</button>
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
