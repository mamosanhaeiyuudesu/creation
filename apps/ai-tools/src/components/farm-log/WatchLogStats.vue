<script setup lang="ts">
import type { WatchLogData } from '~/types/farm-log'

const props = defineProps<{ data: WatchLogData }>()

const meta = computed(() => props.data.meta)

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
}

// MET × 体重60kg × 時間で推定カロリー
const estimatedCalories = computed(() => {
  const { stationarySec, walkingSec, cyclingSec, unknownSec } = meta.value.activitySummary
  const w = 60
  return Math.round(
    3.0 * w * (stationarySec / 3600) +
    3.5 * w * (walkingSec   / 3600) +
    4.0 * w * (cyclingSec   / 3600) +
    2.0 * w * (unknownSec   / 3600)
  )
})

const actSegments = computed(() => {
  const { stationarySec, walkingSec, cyclingSec, unknownSec } = meta.value.activitySummary
  const total = stationarySec + walkingSec + cyclingSec + unknownSec
  if (total === 0) return []
  return [
    { key: 'stationary', label: '定点作業', color: 'bg-amber-500',  sec: stationarySec, pct: (stationarySec / total) * 100 },
    { key: 'walking',    label: '歩行',     color: 'bg-emerald-600', sec: walkingSec,    pct: (walkingSec    / total) * 100 },
    { key: 'cycling',    label: '農機/車',  color: 'bg-blue-500',   sec: cyclingSec,    pct: (cyclingSec    / total) * 100 },
    { key: 'unknown',    label: '不明',     color: 'bg-slate-500',  sec: unknownSec,    pct: (unknownSec    / total) * 100 },
  ].filter(s => s.pct > 0)
})

const hrZone = computed(() => {
  const avg = meta.value.avgHR
  if (avg === 0) return { label: 'データなし', color: 'text-gray-500' }
  if (avg < 60)  return { label: '安静',   color: 'text-slate-400'  }
  if (avg < 100) return { label: '軽度',   color: 'text-emerald-400' }
  if (avg < 130) return { label: '中程度', color: 'text-amber-400'   }
  return           { label: '高負荷',  color: 'text-red-400'      }
})

const stats = computed(() => [
  {
    icon: '⏱',
    label: '作業時間',
    value: formatDuration(meta.value.durationSec),
    sub: `${formatTime(meta.value.startTime)} 開始`,
  },
  {
    icon: '👣',
    label: '歩数',
    value: `${meta.value.totalSteps.toLocaleString()} 歩`,
    sub: `移動距離 ${(meta.value.totalDistanceM / 1000).toFixed(2)} km`,
  },
  {
    icon: '❤️',
    label: '平均心拍数',
    value: meta.value.avgHR > 0 ? `${meta.value.avgHR} BPM` : '-',
    sub: `最大 ${meta.value.maxHR} BPM / ${hrZone.value.label}`,
    subColor: hrZone.value.color,
  },
  {
    icon: '⛰',
    label: '累積標高',
    value: `${meta.value.elevationGainM} m`,
    sub: 'GPS計測（誤差含む）',
  },
  {
    icon: '🔥',
    label: '推定消費カロリー',
    value: `${estimatedCalories.value.toLocaleString()} kcal`,
    sub: '体重60kg・MET推定値',
    wide: true as const,
  },
])
</script>

<template>
  <div class="space-y-3">
    <!-- 統計グリッド -->
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        :class="['bg-gray-800 rounded-xl p-4 flex flex-col gap-1', stat.wide ? 'col-span-2' : '']"
      >
        <div class="text-2xl leading-none">{{ stat.icon }}</div>
        <div class="text-xs text-gray-400 mt-1">{{ stat.label }}</div>
        <div class="text-lg font-bold text-white leading-tight">{{ stat.value }}</div>
        <div class="text-xs" :class="(stat as any).subColor ?? 'text-gray-500'">{{ stat.sub }}</div>
      </div>
    </div>

    <!-- 活動内訳バー -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 mb-2">活動内訳</div>
      <div class="flex rounded-lg overflow-hidden h-8">
        <div
          v-for="seg in actSegments"
          :key="seg.key"
          :class="[seg.color, 'flex items-center justify-center text-xs font-medium text-white transition-all overflow-hidden']"
          :style="{ width: `${seg.pct}%` }"
        >
          <span v-if="seg.pct > 10">{{ formatDuration(seg.sec) }}</span>
        </div>
      </div>
      <div class="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
        <div v-for="seg in actSegments" :key="seg.key" class="flex items-center gap-1.5">
          <span :class="[seg.color, 'w-2.5 h-2.5 rounded-sm flex-shrink-0']" />
          <span>{{ seg.label }} {{ formatDuration(seg.sec) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
