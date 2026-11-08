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

    <div class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="r in NIKKI_REVIEW_RANGES"
        :key="r.id"
        class="nk-btn-ghost !h-8 !px-3 !text-[12px]"
        :class="range === r.id ? '!border-[var(--nk-indigo)] !bg-[var(--nk-indigo-soft)]' : ''"
        :disabled="loading"
        @click="pick(r.id)"
      >{{ r.label }}</button>
    </div>
    <div v-if="range === 'custom'" class="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
      <input v-model="customFrom" type="date" class="nk-input !h-8 !text-[12.5px]" :max="customTo || undefined" />
      <span>〜</span>
      <input v-model="customTo" type="date" class="nk-input !h-8 !text-[12.5px]" :min="customFrom || undefined" />
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" :disabled="loading || !customFrom || !customTo" @click="runCustom">この期間で作る</button>
    </div>

    <p v-if="loading" class="mt-4 mb-2 text-[13px] text-[var(--nk-ink-soft)]">{{ rangeLabel }}の日記を読んでいます…</p>
    <p v-else-if="error" class="mt-4 mb-2 text-[12.5px] text-[var(--nk-today)]">{{ error }}</p>
    <ol v-else-if="result" class="mt-3 mb-0 p-0 list-none flex flex-col gap-2.5">
      <li v-for="(it, i) in result.items" :key="i" class="px-3 py-2.5 rounded-lg border border-[var(--nk-line)]">
        <h3 class="nk-serif m-0 text-[27px] leading-snug">{{ it.heading }}</h3>
        <p class="mt-2 mb-0 text-[19.5px] leading-relaxed">{{ it.summary }}</p>
      </li>
    </ol>

    <div v-if="!loading" class="mt-3">
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="emit('retry')">もう一度作る</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NIKKI_REVIEW_RANGES } from '~/utils/nikki-review-range'
import type { NikkiReviewRangeId } from '~/utils/nikki-review-range'

export interface NikkiReviewResult {
  from: string
  to: string
  dayCount: number
  items: { heading: string; summary: string }[]
}

const props = defineProps<{
  loading: boolean
  error: string
  result: NikkiReviewResult | null
  range: NikkiReviewRangeId
  from: string
  to: string
}>()

const emit = defineEmits<{
  retry: []
  close: []
  'update:range': [id: NikkiReviewRangeId]
  'update:from': [v: string]
  'update:to': [v: string]
  run: [id: NikkiReviewRangeId]
}>()

const customFrom = computed({ get: () => props.from, set: (v) => emit('update:from', v) })
const customTo = computed({ get: () => props.to, set: (v) => emit('update:to', v) })
const rangeLabel = computed(() => {
  const r = NIKKI_REVIEW_RANGES.find((x) => x.id === props.range)
  return !r || r.id === 'custom' ? '選んだ期間' : r.label
})

const pick = (id: NikkiReviewRangeId) => {
  emit('update:range', id)
  // 自由選択は日付を入れてから「この期間で作る」を押す。それ以外は選んだ時点で作る
  if (id !== 'custom') emit('run', id)
}
const runCustom = () => emit('run', 'custom')
</script>
