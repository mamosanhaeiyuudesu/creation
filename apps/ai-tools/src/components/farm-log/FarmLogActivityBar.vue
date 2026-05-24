<script setup lang="ts">
import type { FarmLogMeta } from '~/types/farm-log'

const props = defineProps<{ meta: FarmLogMeta }>()

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0 && m > 0) return `${h}時間${m}分`
  if (h > 0) return `${h}時間`
  return `${m}分`
}

const segments = computed(() => {
  const { stationarySec, walkingSec, drivingSec } = props.meta.activitySummary
  const total = stationarySec + walkingSec + drivingSec
  if (total === 0) return []
  const farmSec = stationarySec + walkingSec
  return [
    { key: 'farm', label: '農作業', color: 'bg-emerald-600', sec: farmSec, pct: (farmSec / total) * 100 },
    { key: 'driving', label: '車移動', color: 'bg-blue-500', sec: drivingSec, pct: (drivingSec / total) * 100 },
  ].filter(s => s.pct > 0)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex rounded-lg overflow-hidden h-8">
      <div
        v-for="seg in segments"
        :key="seg.key"
        :class="[seg.color, 'flex items-center justify-center text-xs font-medium text-white transition-all overflow-hidden']"
        :style="{ width: `${seg.pct}%` }"
      >
        <span v-if="seg.pct > 10">{{ formatDuration(seg.sec) }}</span>
      </div>
    </div>
    <div class="flex gap-4 text-xs text-gray-400">
      <div v-for="seg in segments" :key="seg.key" class="flex items-center gap-1.5">
        <span :class="[seg.color, 'w-2.5 h-2.5 rounded-sm flex-shrink-0']" />
        <span>{{ seg.label }} {{ formatDuration(seg.sec) }}</span>
      </div>
    </div>
  </div>
</template>
