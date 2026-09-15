<script setup lang="ts">
import type { KoubaAchievement } from '~/types/kouba'
import { formatJstDate } from '~/types/kouba'

// 画面下部に置く「達成したこと」の一覧。記録はポップアップ（KoubaAchievementFormModal）から行う。
defineProps<{
  achievements: KoubaAchievement[]
  loading: boolean
  /** 一覧側の操作（削除）の失敗時のエラー。記録ポップアップ側のエラーは別に持つ。 */
  error: string
}>()
const emit = defineEmits<{
  openAdd: []
  delete: [achievement: KoubaAchievement]
}>()
</script>

<template>
  <section class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 text-sm font-bold text-slate-100">🏆 目に見える形で達成したこと</h2>
      <button
        type="button"
        class="h-8 px-3.5 rounded-full bg-sky-500 text-white text-[12px] font-bold hover:bg-sky-400 shrink-0"
        @click="emit('openAdd')"
      >＋ 記録する</button>
    </div>
    <p v-if="error" class="m-0 text-[11px] text-rose-400">{{ error }}</p>

    <div v-if="loading" class="text-center text-slate-500 text-xs py-4">読み込み中…</div>
    <p v-else-if="!achievements.length" class="m-0 text-center text-slate-500 text-xs py-4">まだ記録がありません</p>
    <ul v-else class="m-0 p-0 flex flex-col gap-1.5 list-none">
      <li v-for="a in achievements" :key="a.id" class="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
        <span class="shrink-0 pt-0.5 text-[11px] text-slate-500 tabular-nums w-[4.5rem]">{{ formatJstDate(a.achievedAt) }}</span>
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
