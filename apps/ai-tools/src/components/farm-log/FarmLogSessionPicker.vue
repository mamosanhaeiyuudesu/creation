<script setup lang="ts">
import type { FarmLogSession } from '~/types/farm-log'

const props = defineProps<{
  sessions: FarmLogSession[]
  selectedLabel: string
}>()

const emit = defineEmits<{
  select: [label: string]
}>()

// 日付でグループ化（降順）
const dateGroups = computed(() => {
  const map = new Map<string, FarmLogSession[]>()
  for (const s of props.sessions) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date)!.push(s)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, sessions]) => ({ date, sessions }))
})

const selectedDate = computed(() => {
  const s = props.sessions.find(s => s.label === props.selectedLabel)
  return s?.date ?? ''
})

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00+09:00')
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

function selectDate(date: string) {
  const sessions = dateGroups.value.find(g => g.date === date)?.sessions ?? []
  if (sessions.length > 0) emit('select', sessions[0].label)
}

function selectSession(label: string) {
  emit('select', label)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- 日付タブ -->
    <div class="flex gap-1.5 flex-wrap">
      <button
        v-for="group in dateGroups"
        :key="group.date"
        @click="selectDate(group.date)"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="group.date === selectedDate
          ? 'bg-emerald-700 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
      >
        {{ formatDate(group.date) }}
      </button>
    </div>

    <!-- 同日複数セッションの場合サブ選択 -->
    <div
      v-if="dateGroups.find(g => g.date === selectedDate)?.sessions.length ?? 0 > 1"
      class="flex gap-1.5 flex-wrap pl-1"
    >
      <button
        v-for="(session, idx) in dateGroups.find(g => g.date === selectedDate)?.sessions ?? []"
        :key="session.label"
        @click="selectSession(session.label)"
        class="px-2.5 py-1 rounded-md text-xs transition-colors"
        :class="session.label === selectedLabel
          ? 'bg-emerald-800 text-emerald-200 ring-1 ring-emerald-600'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
      >
        {{ session.activity }} {{ idx + 1 }}
        <span class="opacity-60 ml-1">{{ formatDuration(session.durationSec) }}</span>
      </button>
    </div>
  </div>
</template>
