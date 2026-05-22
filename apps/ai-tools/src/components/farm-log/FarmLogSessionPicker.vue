<script setup lang="ts">
import type { FarmLogSession } from '~/types/farm-log'

const props = defineProps<{
  sessions: FarmLogSession[]
  selectedDate: string
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00+09:00')
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}
</script>

<template>
  <div v-if="sessions.length > 1" class="flex gap-2 flex-wrap">
    <button
      v-for="session in sessions"
      :key="session.date"
      @click="emit('select', session.date)"
      class="px-3 py-1.5 rounded-lg text-xs transition-colors"
      :class="session.date === selectedDate
        ? 'bg-emerald-700 text-white'
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
    >
      {{ formatDate(session.date) }}
      <span class="opacity-70 ml-1">{{ formatDuration(session.durationSec) }}</span>
    </button>
  </div>
  <div v-else class="text-sm text-gray-400">
    {{ sessions[0] ? formatDate(sessions[0].date) : '' }}
  </div>
</template>
