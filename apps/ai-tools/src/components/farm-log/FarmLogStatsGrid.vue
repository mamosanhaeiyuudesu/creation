<script setup lang="ts">
import type { FarmLogMeta } from '~/types/farm-log'

const props = defineProps<{ meta: FarmLogMeta }>()

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
}

// MET × 体重(60kg) × 時間(h) で推定カロリーを算出
// 静止/農作業: MET 3.0（摘蕾など立ち仕事・手作業）、車移動: MET 2.0
const estimatedCalories = computed(() => {
  const { stationarySec, budThinningSec, drivingSec } = props.meta.activitySummary
  const weight = 60
  return Math.round(
    3.0 * weight * ((stationarySec + budThinningSec) / 3600) +
    2.0 * weight * (drivingSec / 3600)
  )
})

const stats = computed(() => {
  const { meta } = props
  const total = meta.activitySummary.stationarySec + meta.activitySummary.budThinningSec + meta.activitySummary.drivingSec
  const drivingPct = total > 0 ? Math.round((meta.activitySummary.drivingSec / total) * 100) : 0
  const workPct = total > 0 ? Math.round(((meta.activitySummary.stationarySec + meta.activitySummary.budThinningSec) / total) * 100) : 0
  return [
    {
      icon: '⏱',
      label: '作業時間',
      value: formatDuration(meta.durationSec),
      sub: `${formatTime(meta.startTime)} 開始`,
    },
    {
      icon: '📍',
      label: '移動距離',
      value: `${(meta.totalDistanceM / 1000).toFixed(1)} km`,
      sub: `移動 ${drivingPct}% / 作業 ${workPct}%`,
    },
    {
      icon: '⛰',
      label: '累積標高',
      value: `${meta.elevationGainM.toLocaleString()} m`,
      sub: 'GPS計測（誤差含む）',
    },
    {
      icon: '🌱',
      label: '農作業時間',
      value: formatDuration(meta.activitySummary.budThinningSec + meta.activitySummary.stationarySec),
      sub: `車移動 ${formatDuration(meta.activitySummary.drivingSec)}`,
    },
    {
      icon: '🔥',
      label: '推定消費カロリー',
      value: `${estimatedCalories.value.toLocaleString()} kcal`,
      sub: '体重60kg・MET推定値',
      wide: true as const,
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div
      v-for="stat in stats"
      :key="stat.label"
      :class="['bg-gray-800 rounded-xl p-4 flex flex-col gap-1', stat.wide ? 'col-span-2' : '']"
    >
      <div class="text-2xl leading-none">{{ stat.icon }}</div>
      <div class="text-xs text-gray-400 mt-1">{{ stat.label }}</div>
      <div class="text-lg font-bold text-white leading-tight">{{ stat.value }}</div>
      <div class="text-xs text-gray-500">{{ stat.sub }}</div>
    </div>
  </div>
</template>
