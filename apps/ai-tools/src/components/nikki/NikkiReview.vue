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

    <label class="mt-3 flex items-center gap-2">
      <span class="shrink-0 text-[12px] text-[var(--nk-ink-soft)]">分析の種類</span>
      <!-- 16px 未満だと iPhone でタップしたときに画面が拡大する -->
      <select :value="kind" class="nk-input !w-auto !py-1.5 !text-[16px]" :disabled="loading" @change="pickKind">
        <option v-for="k in NIKKI_REVIEW_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
      </select>
    </label>

    <p v-if="!started" class="mt-3 mb-1 text-[13px] text-[var(--nk-ink-soft)]">どの期間を振り返りますか？</p>
    <div class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="r in NIKKI_REVIEW_RANGES"
        :key="r.id"
        class="nk-btn-ghost !h-8 !px-3 !text-[12px]"
        :class="started && range === r.id ? '!border-[var(--nk-indigo)] !bg-[var(--nk-indigo-soft)]' : ''"
        :disabled="loading"
        @click="pick(r.id)"
      >{{ r.label }}</button>
    </div>
    <p v-if="loading" class="mt-4 mb-2 text-[13px] text-[var(--nk-ink-soft)]">{{ rangeLabel }}の日記を読んでいます…</p>
    <p v-else-if="error" class="mt-4 mb-2 text-[12.5px] text-[var(--nk-today)]">{{ error }}</p>
    <ol v-else-if="result" class="mt-3 mb-0 p-0 list-none flex flex-col gap-2.5">
      <li v-for="(it, i) in result.items" :key="i" class="px-3 py-2.5 rounded-lg border border-[var(--nk-line)]">
        <h3 class="nk-serif m-0 text-[27px] leading-snug">{{ it.heading }}</h3>
        <p class="mt-2 mb-0 text-[19.5px] leading-relaxed">{{ it.summary }}</p>
      </li>
    </ol>

    <div v-if="started && !loading" class="mt-3">
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="emit('retry')">もう一度作る</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NIKKI_REVIEW_KINDS, NIKKI_REVIEW_RANGES } from '~/utils/nikki-review-range'
import type { NikkiReviewKindId, NikkiReviewRangeId } from '~/utils/nikki-review-range'

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
  kind: NikkiReviewKindId
  range: NikkiReviewRangeId
  from: string
  to: string
}>()

const emit = defineEmits<{
  retry: []
  close: []
  'update:kind': [id: NikkiReviewKindId]
  'update:range': [id: NikkiReviewRangeId]
  'update:from': [v: string]
  'update:to': [v: string]
  run: [id: NikkiReviewRangeId]
}>()

// 期間を選ぶまでは何も作らない（開くたびに選び直す）
const started = computed(() => props.loading || !!props.result || !!props.error)
const rangeLabel = computed(() => {
  const r = NIKKI_REVIEW_RANGES.find((x) => x.id === props.range)
  return r ? r.label : '選んだ期間'
})

// 結果を出したあとに種類を変えたら、同じ期間で作り直す（表示と選択がずれないように）
const pickKind = (e: Event) => {
  emit('update:kind', (e.target as HTMLSelectElement).value as NikkiReviewKindId)
  if (started.value) emit('retry')
}

const pick = (id: NikkiReviewRangeId) => {
  emit('update:range', id)
  emit('run', id)
}
</script>
