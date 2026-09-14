<script setup lang="ts">
import { ref } from 'vue'
import type { KoubaAchievement } from '~/types/kouba'
import { formatJstDate, KOUBA_ACHIEVEMENT_TEXT_MAX } from '~/types/kouba'

// 画面下部に置く「達成したこと」の記録フォーム＋一覧。インパクト5段階・達成日つき。
defineProps<{
  achievements: KoubaAchievement[]
  loading: boolean
  saving: boolean
  error: string
}>()
const emit = defineEmits<{
  add: [payload: { text: string; impact: number; achievedAt: string }]
  delete: [achievement: KoubaAchievement]
}>()

// 日本語入力の変換確定Enterでも @keydown.enter は発火するため、確定中は無視する
function isImeEnter(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

/** 今日の日付（JST）を <input type="date"> 用の "YYYY-MM-DD" にする。 */
function todayDateInput(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

const textDraft = ref('')
const impactDraft = ref(3)
const dateDraft = ref(todayDateInput())

function submit() {
  const text = textDraft.value.trim()
  if (!text) return
  emit('add', { text, impact: impactDraft.value, achievedAt: dateDraft.value })
  textDraft.value = ''
  impactDraft.value = 3
  dateDraft.value = todayDateInput()
}
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-4">
    <h2 class="m-0 text-sm font-bold text-slate-100">🏆 達成したこと</h2>

    <form class="flex flex-col gap-2.5" @submit.prevent="submit">
      <textarea
        v-model="textDraft"
        rows="2"
        :maxlength="KOUBA_ACHIEVEMENT_TEXT_MAX"
        placeholder="達成したことを書く"
        class="resize-none bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-sky-400/50 font-[inherit] leading-snug"
        @keydown.enter="isImeEnter($event) || submit()"
      />
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] text-slate-400">インパクト</span>
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="w-7 h-7 rounded-lg text-[12px] font-bold flex items-center justify-center border transition-colors"
            :class="n <= impactDraft ? 'bg-amber-400/20 border-amber-400/60 text-amber-300' : 'bg-white/[0.04] border-white/10 text-slate-500'"
            @click="impactDraft = n"
          >{{ n }}</button>
        </div>
        <input
          v-model="dateDraft"
          type="date"
          class="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-100 outline-none focus:border-sky-400/50"
        />
        <button
          type="submit"
          class="ml-auto h-8 px-4 rounded-full bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400 disabled:opacity-50"
          :disabled="saving || !textDraft.trim()"
        >追加</button>
      </div>
      <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>
    </form>

    <div v-if="loading" class="text-center text-slate-500 text-xs py-4">読み込み中…</div>
    <p v-else-if="!achievements.length" class="m-0 text-center text-slate-500 text-xs py-4">まだ記録がありません</p>
    <ul v-else class="m-0 p-0 flex flex-col gap-1.5 list-none">
      <li v-for="a in achievements" :key="a.id" class="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
        <span class="shrink-0 pt-0.5 text-[11px] text-slate-500 tabular-nums w-[4.5rem]">{{ formatJstDate(a.achievedAt) }}</span>
        <span class="shrink-0 pt-0.5 text-amber-300 text-xs tracking-tight" :title="`インパクト${a.impact}`">
          <span v-for="n in 5" :key="n">{{ n <= a.impact ? '★' : '☆' }}</span>
        </span>
        <span class="flex-1 min-w-0 text-[13px] text-slate-200 leading-snug break-words whitespace-pre-line">{{ a.text }}</span>
        <button
          type="button"
          class="shrink-0 w-6 h-6 rounded text-slate-500 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center text-xs"
          title="削除"
          @click="emit('delete', a)"
        >🗑</button>
      </li>
    </ul>
  </section>
</template>
