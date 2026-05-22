<script setup lang="ts">
import type { FarmLogMeta } from '~/types/farm-log'

const props = defineProps<{ meta: FarmLogMeta }>()

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const segments = computed(() => {
  const { stationarySec, budThinningSec, drivingSec } = props.meta.activitySummary
  const total = stationarySec + budThinningSec + drivingSec
  if (total === 0) return []
  return [
    { key: 'stationary', label: '静止', color: 'bg-gray-600', sec: stationarySec, pct: (stationarySec / total) * 100 },
    { key: 'bud', label: '摘蕾', color: 'bg-emerald-600', sec: budThinningSec, pct: (budThinningSec / total) * 100 },
    { key: 'driving', label: '移動', color: 'bg-blue-500', sec: drivingSec, pct: (drivingSec / total) * 100 },
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
