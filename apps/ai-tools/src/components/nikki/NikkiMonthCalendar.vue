<template>
  <section class="nk-card px-3 py-4 sm:px-4 sm:py-3">
    <!-- 月の送り -->
    <header class="flex items-center justify-between mb-3 sm:mb-2">
      <button class="nk-btn-ghost !w-9 !px-0 justify-center text-[17px] leading-none" aria-label="前の月" @click="emit('shift', -1)">‹</button>
      <div class="text-center">
        <h2 class="nk-serif m-0 text-[19px] sm:text-[16px] leading-none">{{ grid.year }}年{{ grid.month }}月</h2>
        <button
          v-if="month !== today.slice(0, 7)"
          class="mt-1 text-[11px] text-[var(--nk-indigo)] underline underline-offset-2"
          @click="emit('goToday')"
        >今月へ戻る</button>
        <p v-else class="mt-1 mb-0 text-[11px] text-[var(--nk-ink-soft)]">
          {{ loading ? '予定を読み込み中…' : hasCalendars ? 'Googleカレンダーの予定を表示中' : '日付を選ぶと記録できます' }}
        </p>
      </div>
      <button class="nk-btn-ghost !w-9 !px-0 justify-center text-[17px] leading-none" aria-label="次の月" @click="emit('shift', 1)">›</button>
    </header>

    <!-- 曜日 -->
    <div class="grid grid-cols-7 gap-1 mb-1">
      <div
        v-for="(label, i) in WEEKDAYS_JA"
        :key="label"
        class="text-center text-[11px] font-bold py-1"
        :class="i === 0 ? 'text-[var(--nk-today)]' : i === 6 ? 'text-[var(--nk-indigo)]' : 'text-[var(--nk-ink-soft)]'"
      >{{ label }}</div>
    </div>

    <!-- 日付 -->
    <div class="grid grid-cols-7 gap-1">
      <div v-for="i in grid.offset" :key="`pad-${i}`" />

      <button
        v-for="date in grid.dates"
        :key="date"
        class="relative min-h-[64px] sm:min-h-[54px] rounded-lg border px-1 pt-1 pb-1 text-left transition-colors overflow-hidden"
        :class="[
          date === selected
            ? 'border-[var(--nk-indigo)] bg-[var(--nk-indigo-soft)]'
            : 'border-[var(--nk-line)] bg-white hover:border-[var(--nk-indigo)]',
          date === today ? 'ring-1 ring-[var(--nk-today)] ring-offset-1' : '',
        ]"
        @click="emit('select', date)"
      >
        <span class="flex items-center gap-1">
          <span
            class="text-[12px] font-bold leading-none"
            :class="date === today ? 'text-[var(--nk-today)]' : weekdayClass(date)"
          >{{ dayOf(date) }}</span>
        </span>

        <!-- 書いた日の印。読み返すときに「書いた日」が一目で分かるように、セル右上にチェックを出す -->
        <span
          v-if="markSet.has(date)"
          class="absolute top-1 right-1 flex items-center justify-center w-[15px] h-[15px] rounded-full bg-[var(--nk-gold)] text-white text-[10px] leading-none"
          aria-label="記録あり"
        >✓</span>

        <ul class="mt-1 space-y-[2px]">
          <li
            v-for="ev in (byDate[date] ?? []).slice(0, 2)"
            :key="ev.id"
            class="flex items-center gap-1 text-[10px] leading-tight text-[var(--nk-ink)] truncate"
          >
            <span class="w-[4px] h-[4px] rounded-full shrink-0" :style="{ background: ev.color }" />
            <span class="truncate">{{ ev.allDay ? ev.title : `${eventTime(ev)} ${ev.title}` }}</span>
          </li>
        </ul>
        <span v-if="(byDate[date]?.length ?? 0) > 2" class="block mt-[2px] text-[9.5px] text-[var(--nk-ink-soft)]">
          ＋{{ (byDate[date]?.length ?? 0) - 2 }}件
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { WEEKDAYS_JA, eventTime, groupEventsByDate, monthGrid } from '~/utils/nikki-calendar'
import type { NikkiEvent } from '~/types/nikki'

const props = defineProps<{
  month: string
  marks: string[]
  events: NikkiEvent[]
  today: string
  selected: string
  loading: boolean
  hasCalendars: boolean
}>()

const emit = defineEmits<{
  select: [date: string]
  shift: [delta: number]
  goToday: []
}>()

const grid = computed(() => monthGrid(props.month))
const byDate = computed(() => groupEventsByDate(props.events))
const markSet = computed(() => new Set(props.marks))

const dayOf = (date: string) => Number(date.slice(8, 10))

const weekdayClass = (date: string) => {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
  if (dow === 0) return 'text-[var(--nk-today)]'
  if (dow === 6) return 'text-[var(--nk-indigo)]'
  return 'text-[var(--nk-ink)]'
}
</script>
