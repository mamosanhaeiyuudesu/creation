<template>
  <header class="relative z-40 flex items-center justify-between px-5 py-3 flex-shrink-0" style="background: #0C447C;">
    <div class="flex items-center gap-3">
      <span class="text-xl">⚾</span>
      <div>
        <h1 class="text-white font-bold text-base leading-tight m-0">MLB日本人選手成績</h1>
        <p class="text-blue-200 text-xs m-0 hidden sm:block">2026シーズン</p>
      </div>
    </div>
    <div>
      <p v-if="lastUpdated" class="text-blue-200 text-xs text-right m-0">
        更新: {{ formatUpdated(lastUpdated) }}
      </p>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  lastUpdated?: string | null
}>()

function formatUpdated(s: string): string {
  // "2026-04-30 14:32:15" → "4/30 14:32"
  const m = s.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!m) return s
  return `${parseInt(m[2])}/${parseInt(m[3])} ${m[4]}:${m[5]}`
}
</script>
