<template>
  <section class="nk-card px-4 py-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="nk-serif m-0 text-[14px] leading-none">AIの振り返り</h2>
        <p v-if="result" class="mt-1 mb-0 text-[11px] text-[var(--nk-ink-soft)]">
          {{ result.from }} 〜 {{ result.to }}（記録 {{ result.dayCount }}日）
        </p>
      </div>
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="emit('close')">閉じる</button>
    </div>

    <p v-if="loading" class="mt-4 mb-2 text-[13px] text-[var(--nk-ink-soft)]">直近1ヶ月の日記を読んでいます…</p>
    <p v-else-if="error" class="mt-4 mb-2 text-[12.5px] text-[var(--nk-today)]">{{ error }}</p>
    <ol v-else-if="result" class="mt-3 mb-0 p-0 list-none flex flex-col gap-2.5">
      <li v-for="(it, i) in result.items" :key="i" class="px-3 py-2.5 rounded-lg border border-[var(--nk-line)]">
        <h3 class="nk-serif m-0 text-[13.5px]">{{ it.heading }}</h3>
        <p class="mt-1 mb-0 text-[13px] leading-relaxed">{{ it.summary }}</p>
      </li>
    </ol>

    <div v-if="!loading" class="mt-3">
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="emit('retry')">もう一度作る</button>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface NikkiReviewResult {
  from: string
  to: string
  dayCount: number
  items: { heading: string; summary: string }[]
}

defineProps<{
  loading: boolean
  error: string
  result: NikkiReviewResult | null
}>()

const emit = defineEmits<{ retry: []; close: [] }>()
</script>
