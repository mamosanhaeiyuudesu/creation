<script setup lang="ts">
import { ref, computed } from 'vue'
import { SNS_PLATFORMS, emptyDayCounts } from '~/composables/task/useTaskSns'
import type { SnsDayCounts, SnsPlatformKey } from '~/composables/task/useTaskSns'

/**
 * 投稿カウンター（Instagram / note）の入力カレンダー。
 * 日を選ぶと下に入力欄が出て、＋/− または直接入力でその日の投稿数を記録する。
 * 数値は変更のたびに親へ emit（親が保存）。IME をまたぐ入力にならないよう @change だけで拾う。
 */

const props = defineProps<{
  counts: Record<string, SnsDayCounts>
  totals: SnsDayCounts
  saving: boolean
  error: string
}>()

const emit = defineEmits<{ close: []; save: [date: string, values: SnsDayCounts] }>()

const WEEK = ['月', '火', '水', '木', '金', '土', '日']

function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const today = todayJST()
const selected = ref(today)
const viewYear = ref(Number(today.slice(0, 4)))
const viewMonth = ref(Number(today.slice(5, 7)) - 1) // 0-11

const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)
const viewYm = computed(() => `${viewYear.value}-${pad(viewMonth.value + 1)}`)

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11 }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0 }
  else viewMonth.value++
}

const weeks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7 // 月曜始まり
  const rows: { monday: string; days: { date: string; day: number; outside: boolean }[] }[] = []
  for (let w = 0; w < 6; w++) {
    const monday = ymd(new Date(viewYear.value, viewMonth.value, 1 - offset + w * 7))
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(viewYear.value, viewMonth.value, 1 - offset + w * 7 + i)
      return { date: ymd(d), day: d.getDate(), outside: d.getMonth() !== viewMonth.value }
    })
    rows.push({ monday, days })
  }
  return rows
})

function dayCounts(date: string): SnsDayCounts {
  return props.counts[date] ?? emptyDayCounts()
}

function dayTotal(date: string): number {
  const c = dayCounts(date)
  return SNS_PLATFORMS.reduce((s, p) => s + (c[p.key] || 0), 0)
}

const monthTotals = computed<SnsDayCounts>(() => {
  const sum = emptyDayCounts()
  for (const [date, day] of Object.entries(props.counts)) {
    if (!date.startsWith(viewYm.value)) continue
    for (const p of SNS_PLATFORMS) sum[p.key] += day[p.key] || 0
  }
  return sum
})

const selectedCounts = computed(() => dayCounts(selected.value))

function setCount(key: SnsPlatformKey, value: number | string) {
  const n = Math.max(0, Math.min(9999, Math.round(Number(value) || 0)))
  if (n === selectedCounts.value[key]) return
  emit('save', selected.value, { ...selectedCounts.value, [key]: n })
}

function bump(key: SnsPlatformKey, delta: number) {
  setCount(key, selectedCounts.value[key] + delta)
}

function onInputChange(key: SnsPlatformKey, e: Event) {
  const el = e.target as HTMLInputElement
  setCount(key, el.value)
  // 正規化後の値（0未満や小数）を欄にも反映させる
  el.value = String(dayCounts(selected.value)[key])
}
</script>

<template>
  <div class="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
    <div class="relative w-full md:w-[420px] bg-[#1e293b] border border-white/[0.12] rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" @click.stop>
      <!-- ヘッダー: 累計 -->
      <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
        <div class="flex items-baseline gap-3 min-w-0">
          <h3 class="text-[14px] font-semibold text-slate-200 m-0 flex-shrink-0">投稿カウンター</h3>
          <span class="flex items-baseline gap-2.5 min-w-0">
            <span v-for="p in SNS_PLATFORMS" :key="p.key" class="flex items-baseline gap-1 text-[11px]">
              <TaskSnsIcon :platform="p.key" :size="13" class="self-center" :style="{ color: p.color }" />
              <span class="text-slate-500">{{ p.label }}</span>
              <span class="text-[13px] font-bold text-slate-200">{{ totals[p.key] }}</span>
            </span>
          </span>
        </div>
        <button class="w-6 h-6 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xs cursor-pointer rounded hover:bg-white/[0.08]" @click="emit('close')">✕</button>
      </div>

      <div class="overflow-y-auto flex-1 px-4 py-3">
        <!-- 月の切り替え -->
        <div class="flex items-center justify-between mb-2">
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth">‹</button>
          <div class="flex items-baseline gap-2">
            <span class="text-[13px] font-semibold text-slate-200">{{ monthLabel }}</span>
            <span class="text-[11px] text-slate-500">
              <template v-for="(p, i) in SNS_PLATFORMS" :key="p.key">
                <span v-if="i > 0" class="text-slate-700"> / </span>
                <span :style="{ color: p.color }">{{ p.label }} {{ monthTotals[p.key] }}</span>
              </template>
            </span>
          </div>
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth">›</button>
        </div>

        <!-- カレンダー -->
        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="w in WEEK"
            :key="w"
            class="text-center text-[10px] font-semibold py-0.5"
            :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'"
          >{{ w }}</div>
        </div>
        <div v-for="row in weeks" :key="row.monday" class="grid grid-cols-7 gap-px">
          <button
            v-for="cell in row.days"
            :key="cell.date"
            type="button"
            class="h-[42px] rounded-lg flex flex-col items-center justify-center gap-px transition-colors cursor-pointer border"
            :class="[
              cell.date === selected
                ? 'bg-sky-500/25 border-sky-400/60'
                : dayTotal(cell.date) > 0
                  ? 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1]'
                  : 'border-transparent hover:bg-white/[0.07]',
            ]"
            @click="selected = cell.date"
          >
            <span
              class="text-[11px] leading-none"
              :class="cell.date === today ? 'text-sky-300 font-bold' : cell.outside ? 'text-slate-700' : 'text-slate-300'"
            >{{ cell.day }}</span>
            <span class="flex items-center gap-1 h-[11px]">
              <span
                v-for="p in SNS_PLATFORMS"
                :key="p.key"
                class="text-[9px] font-bold leading-none"
                :style="{ color: p.color }"
              >{{ dayCounts(cell.date)[p.key] || '' }}</span>
            </span>
          </button>
        </div>

        <!-- 選んだ日の入力 -->
        <div class="mt-3 pt-3 border-t border-white/[0.08]">
          <div class="flex items-baseline justify-between mb-2">
            <span class="text-[12px] font-semibold text-slate-300">
              {{ mdWeekday(selected) }}<span v-if="selected === today" class="ml-1.5 text-[10px] text-sky-400">今日</span>
            </span>
            <span class="text-[10px] text-slate-600">{{ saving ? '保存中…' : '変更すると自動で保存されます' }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <div v-for="p in SNS_PLATFORMS" :key="p.key" class="flex items-center gap-2">
              <span class="flex items-center gap-1.5 w-[86px] flex-shrink-0">
                <TaskSnsIcon :platform="p.key" :size="16" :style="{ color: p.color }" />
                <span class="text-[12px] text-slate-300">{{ p.label }}</span>
              </span>
              <button
                type="button"
                class="w-8 h-8 flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 text-[15px] leading-none cursor-pointer hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-default"
                :disabled="selectedCounts[p.key] <= 0"
                @click="bump(p.key, -1)"
              >−</button>
              <input
                :value="selectedCounts[p.key]"
                type="number"
                min="0"
                max="9999"
                inputmode="numeric"
                class="w-[64px] flex-shrink-0 bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1.5 text-center text-[14px] font-bold text-slate-100 outline-none focus:border-sky-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @change="onInputChange(p.key, $event)"
              />
              <button
                type="button"
                class="w-8 h-8 flex-shrink-0 rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 text-[15px] leading-none cursor-pointer hover:bg-white/[0.1]"
                @click="bump(p.key, 1)"
              >＋</button>
              <span class="text-[11px] text-slate-600 ml-auto">累計 {{ totals[p.key] }}</span>
            </div>
          </div>
          <div v-if="error" class="mt-2 px-3 py-2 bg-red-500/12 border border-red-500/30 rounded-lg text-red-300 text-[12px]">⚠ {{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
