<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[520px] bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-100 flex items-center gap-1.5">
          <span>{{ icon }}</span>{{ label }}<span class="text-slate-500 font-normal">の推移</span>
        </h3>
        <button class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
      </div>
      <div v-if="hasIntraday" class="mb-5 pb-5 border-b border-white/[0.06]">
        <!-- 日送りナビ + 見出し -->
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold text-slate-400">{{ intradayLabel }}</div>
          <div class="flex items-center gap-1">
            <button class="w-7 h-7 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center" @click="shiftDay(-1)">‹</button>
            <span class="text-xs font-semibold text-slate-200 min-w-[76px] text-center tabular-nums">{{ dateLabel }}</span>
            <button
              class="w-7 h-7 rounded-lg flex items-center justify-center"
              :class="isToday ? 'text-slate-700 cursor-default' : 'text-slate-300 hover:bg-white/10'"
              :disabled="isToday"
              @click="shiftDay(1)"
            >›</button>
          </div>
        </div>
        <div :class="{ 'opacity-40 transition-opacity': intradayLoading }">
          <IntradayPanel :points="intradayPoints" :color="color" :unit="unit" :decimals="decimals" :zero-based="intraday?.zeroBased ?? false" label="" />
        </div>
      </div>
      <TrendPanel :metric="metric" :color="color" :unit="unit" :date="activeDate" :decimals="decimals" :zero-based="zeroBased" :axis-range="axisRange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import IntradayPanel from '~/components/fitbit/IntradayPanel.vue'
import type { TimePoint } from '~/types/fitbit'
import { mdWeekday, todayJST } from '~/utils/jst'

const props = defineProps<{
  metric: string
  label: string
  icon?: string
  color?: string
  unit?: string
  date?: string
  decimals?: number
  zeroBased?: boolean
  axisRange?: readonly [number, number]
  intraday?: { points: TimePoint[]; label: string; zeroBased?: boolean }
}>()
defineEmits<{ close: [] }>()

// 時間別グラフを持つメトリクスのみ日送りを出す（intraday プロップの有無で判定）
const hasIntraday = !!props.intraday
const intradayLabel = props.intraday?.label ?? ''

const activeDate = ref(props.date || todayJST())
const intradayPoints = ref<TimePoint[]>(props.intraday?.points ?? [])
const intradayLoading = ref(false)

const isToday = computed(() => activeDate.value >= todayJST())
const dateLabel = computed(() => mdWeekday(activeDate.value))

function shiftDay(delta: number) {
  const d = new Date(`${activeDate.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  const next = d.toISOString().slice(0, 10)
  if (next > todayJST()) return
  activeDate.value = next
}

// 日を送るたびに当該日の時間別系列を取得（下段の推移グラフは :date で自動追随）
async function loadIntraday() {
  if (!hasIntraday) return
  intradayLoading.value = true
  try {
    const res = await $fetch<{ points: TimePoint[] }>('/api/fitbit/intraday', {
      params: { metric: props.metric, date: activeDate.value },
    })
    intradayPoints.value = res.points
  } catch {
    intradayPoints.value = []
  } finally {
    intradayLoading.value = false
  }
}

watch(activeDate, loadIntraday)
</script>
