<script setup lang="ts">
import type { FarmLogData } from '~/types/farm-log'

const props = defineProps<{ data: FarmLogData }>()

const meta = computed(() => props.data.meta)

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
}

// MET × 体重(60kg) × 時間(h) で推定カロリーを算出
const estimatedCalories = computed(() => {
  const { stationarySec, walkingSec, drivingSec } = meta.value.activitySummary
  const weight = 60
  return Math.round(
    3.0 * weight * ((stationarySec + walkingSec) / 3600) +
    2.0 * weight * (drivingSec / 3600)
  )
})

// 速度帯別の距離を track の cumDist 差分から算出
const speedZones = computed(() => {
  const track = props.data.track
  const zones = {
    stationary: 0,  // < 0.5 m/s
    walking: 0,     // 0.5–2.5 m/s（歩行・農作業移動）
    slow: 0,        // 2.5–5 m/s（低速移動 ~18km/h）
    medium: 0,      // 5–10 m/s（中速 ~36km/h）
    fast: 0,        // > 10 m/s（高速 36km/h+）
  }
  for (let i = 1; i < track.length; i++) {
    const dist = track[i].cumDist - track[i - 1].cumDist
    const spd = track[i].spd
    if (spd < 0.5) zones.stationary += dist
    else if (spd < 2.5) zones.walking += dist
    else if (spd < 5) zones.slow += dist
    else if (spd < 10) zones.medium += dist
    else zones.fast += dist
  }
  return zones
})

const stats = computed(() => {
  const m = meta.value
  const total = m.activitySummary.stationarySec + m.activitySummary.walkingSec + m.activitySummary.drivingSec
  const drivingPct = total > 0 ? Math.round((m.activitySummary.drivingSec / total) * 100) : 0
  const workPct = total > 0 ? Math.round(((m.activitySummary.stationarySec + m.activitySummary.walkingSec) / total) * 100) : 0
  return [
    {
      icon: '⏱',
      label: '作業時間',
      value: formatDuration(m.durationSec),
      sub: `${formatTime(m.startTime)} 開始`,
    },
    {
      icon: '📍',
      label: '移動距離',
      value: `${(m.totalDistanceM / 1000).toFixed(1)} km`,
      sub: `移動 ${drivingPct}% / 作業 ${workPct}%`,
    },
    {
      icon: '⛰',
      label: '累積標高',
      value: `${m.elevationGainM.toLocaleString()} m`,
      sub: 'GPS計測（誤差含む）',
    },
    {
      icon: '🌱',
      label: '農作業時間',
      value: formatDuration(m.activitySummary.walkingSec + m.activitySummary.stationarySec),
      sub: `車移動 ${formatDuration(m.activitySummary.drivingSec)}`,
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

const z = speedZones

function fmtKm(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}
</script>

<template>
  <div class="space-y-3">
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

    <!-- 速度帯別距離内訳 -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-400 mb-3">速度帯別距離</div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="w-20 text-xs text-gray-500 flex-shrink-0">静止</span>
          <div class="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-gray-500 rounded-full"
              :style="{ width: `${Math.min(100, (z.stationary / meta.totalDistanceM) * 100)}%` }"
            />
          </div>
          <span class="text-xs text-gray-300 w-16 text-right flex-shrink-0">{{ fmtKm(z.stationary) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-20 text-xs text-gray-500 flex-shrink-0">歩行</span>
          <div class="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-600 rounded-full"
              :style="{ width: `${Math.min(100, (z.walking / meta.totalDistanceM) * 100)}%` }"
            />
          </div>
          <span class="text-xs text-gray-300 w-16 text-right flex-shrink-0">{{ fmtKm(z.walking) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-20 text-xs text-gray-500 flex-shrink-0">低速 ～18</span>
          <div class="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-500 rounded-full"
              :style="{ width: `${Math.min(100, (z.slow / meta.totalDistanceM) * 100)}%` }"
            />
          </div>
          <span class="text-xs text-gray-300 w-16 text-right flex-shrink-0">{{ fmtKm(z.slow) }}</span>
        </div>
        <div v-if="z.medium > 0" class="flex items-center gap-2">
          <span class="w-20 text-xs text-gray-500 flex-shrink-0">中速 ～36</span>
          <div class="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-400 rounded-full"
              :style="{ width: `${Math.min(100, (z.medium / meta.totalDistanceM) * 100)}%` }"
            />
          </div>
          <span class="text-xs text-gray-300 w-16 text-right flex-shrink-0">{{ fmtKm(z.medium) }}</span>
        </div>
        <div v-if="z.fast > 0" class="flex items-center gap-2">
          <span class="w-20 text-xs text-gray-500 flex-shrink-0">高速 36+</span>
          <div class="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-indigo-400 rounded-full"
              :style="{ width: `${Math.min(100, (z.fast / meta.totalDistanceM) * 100)}%` }"
            />
          </div>
          <span class="text-xs text-gray-300 w-16 text-right flex-shrink-0">{{ fmtKm(z.fast) }}</span>
        </div>
        <div class="text-xs text-gray-600 mt-1">km/h換算。バーの長さは総距離比</div>
      </div>
    </div>
  </div>
</template>
