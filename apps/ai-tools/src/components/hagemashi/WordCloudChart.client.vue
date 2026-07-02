<script setup lang="ts">
const props = defineProps<{
  words: { word: string; count: number }[]
  height?: number
}>()

const emit = defineEmits<{
  'word-click': [word: string]
}>()

const COLORS = [
  '#f97316', '#fb7185', '#f59e0b', '#fbbf24',
  '#fda4af', '#fdba74', '#f472b6', '#facc15',
]

const MIN_SIZE = 14
const MAX_SIZE = 72

const LS_EMPHASIS = 'hagemashi-wordcloud-emphasis'

// 出現回数の差を強調する指数（大きいほど回数の多い単語がより大きくなる）
const emphasis = ref(2)
if (import.meta.client) {
  const saved = Number(localStorage.getItem(LS_EMPHASIS))
  if (saved >= 1 && saved <= 6) emphasis.value = saved
}
watch(emphasis, (v) => {
  if (import.meta.client) localStorage.setItem(LS_EMPHASIS, String(v))
})

const items = computed(() => {
  const sorted = [...props.words].sort((a, b) => b.count - a.count)
  if (!sorted.length) return []
  const maxCount = sorted[0].count
  const minCount = sorted[sorted.length - 1].count
  const span = maxCount - minCount || 1
  return sorted.map((w, i) => {
    const t = (w.count - minCount) / span // 0..1
    const scaled = Math.pow(t, emphasis.value) // emphasis が大きいほど低頻度語が小さくなり差が広がる
    const size = Math.round(MIN_SIZE + scaled * (MAX_SIZE - MIN_SIZE))
    return { name: w.word, count: w.count, size, color: COLORS[i % COLORS.length] }
  })
})
</script>

<template>
  <div class="relative">
    <!-- 大きさの差分（強調）調整スライダー -->
    <div class="absolute top-1 right-1 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/[0.08] rounded-lg px-2.5 py-1.5">
      <span class="text-[10px] text-slate-400 shrink-0">強調</span>
      <input
        v-model.number="emphasis"
        type="range"
        min="1"
        max="6"
        step="0.5"
        class="w-24 accent-orange-500 cursor-pointer"
      />
      <span class="text-[10px] text-slate-300 tabular-nums w-6 text-right shrink-0">{{ emphasis.toFixed(1) }}</span>
    </div>

    <div class="wc-wrap" :style="{ height: `${height ?? 360}px` }">
      <span
        v-for="item in items"
        :key="item.name"
        class="wc-word"
        :style="{ fontSize: `${item.size}px`, color: item.color }"
        :title="`${item.name}: ${item.count}`"
        @click="emit('word-click', item.name)"
      >{{ item.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.wc-wrap {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  align-items: center;
  gap: 4px 12px;
  padding: 8px;
  overflow-y: auto;
}

.wc-word {
  cursor: pointer;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.wc-word:hover {
  opacity: 0.55;
}
</style>
