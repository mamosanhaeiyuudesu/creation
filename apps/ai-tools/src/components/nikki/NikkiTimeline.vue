<template>
  <section>
    <div v-if="!days.length" class="nk-card px-5 py-8 text-center text-[13px] text-[var(--nk-ink-soft)]">
      {{ loading ? '読み込み中…' : 'まだ記録がありません。上のボタンから、話すか書くかしてみてください。' }}
    </div>

    <!-- 縦に新しい日から並べる。下へ進むほど過去 -->
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="day in days"
        :key="day.date"
        class="nk-card px-4 py-3.5 flex flex-col gap-2.5 transition-colors"
        :class="day.date === today ? 'border-[var(--nk-today)]' : ''"
      >
        <button class="text-left flex items-baseline gap-2" @click="emit('select', day.date)">
          <span class="nk-serif text-[16px] leading-none" :class="day.date === today ? 'text-[var(--nk-today)]' : ''">
            {{ formatShortDate(day.date) }}
            <span class="text-[11.5px] font-normal text-[var(--nk-ink-soft)]">({{ weekdayJa(day.date) }})</span>
          </span>
          <span class="text-[10.5px] text-[var(--nk-ink-soft)]">
            {{ day.date === today ? '今日' : yearLabel(day.date) }}
          </span>
        </button>

        <p v-if="!day.topics.length" class="m-0 text-[12px] text-[var(--nk-ink-soft)] leading-relaxed">
          インパクトのある出来事は拾えませんでした
        </p>

        <ul v-else class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li
            v-for="topic in visibleTopics(day)"
            :key="topic.id"
            class="rounded-lg border border-[var(--nk-line)] px-3 py-2"
          >
            <span class="flex items-start gap-2">
              <span
                class="mt-[1px] shrink-0 rounded px-1 text-[10px] font-bold leading-[16px]"
                :class="`nk-impact-${Math.min(5, Math.max(3, topic.impact))}`"
                :title="`インパクト ${topic.impact}`"
              >{{ topic.impact }}</span>
              <span class="text-[13px] font-bold leading-snug">{{ topic.headline }}</span>
            </span>
            <span v-if="topic.detail" class="block mt-1 text-[12px] leading-snug text-[var(--nk-ink-soft)]">
              {{ topic.detail }}
            </span>
          </li>
        </ul>

        <!-- 5つを超えた分はエクスパンドで見せる（要件: 最大5つ＋残りは展開） -->
        <button
          v-if="day.topics.length > NIKKI_TIMELINE_VISIBLE"
          class="self-start text-[11.5px] font-bold text-[var(--nk-indigo)] underline underline-offset-2"
          @click="toggle(day.date)"
        >
          {{ expanded.has(day.date) ? '閉じる' : `他${day.topics.length - NIKKI_TIMELINE_VISIBLE}件を見る` }}
        </button>
      </article>

      <button
        v-if="hasMore"
        class="nk-btn-ghost self-center"
        :disabled="loading"
        @click="onLoadOlder()"
      >{{ loading ? '読み込み中…' : 'もっと過去を見る' }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatShortDate } from '~/utils/nikki-calendar'
import { weekdayJa } from '~/utils/jst'
import { NIKKI_TIMELINE_VISIBLE } from '~/types/nikki'
import type { NikkiDay } from '~/types/nikki'

const props = defineProps<{
  /** 新しい順（サーバーの返り順）。そのまま上から並べる */
  days: NikkiDay[]
  hasMore: boolean
  loading: boolean
  today: string
  /** 過去を追い読みする */
  onLoadOlder: () => Promise<number>
}>()

const emit = defineEmits<{ select: [date: string] }>()

const expanded = ref<Set<string>>(new Set())

const visibleTopics = (day: NikkiDay) =>
  expanded.value.has(day.date) ? day.topics : day.topics.slice(0, NIKKI_TIMELINE_VISIBLE)

const toggle = (date: string) => {
  const next = new Set(expanded.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  expanded.value = next
}

/** 同じ年なら省く（毎カードに年が並ぶと読みにくい） */
const yearLabel = (date: string) => {
  const year = date.slice(0, 4)
  return year === props.today.slice(0, 4) ? '' : `${year}年`
}
</script>
