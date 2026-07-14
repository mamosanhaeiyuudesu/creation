<template>
  <!-- 生成失敗時（loading=false かつ data=null）はカードごと非表示にする（非本質的な付加情報のため） -->
  <div v-if="loading || data" class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-2 h-full">
    <div class="text-xs font-semibold text-slate-400">🤖 今日のアドバイス</div>

    <div v-if="loading" class="flex flex-col gap-2.5 animate-pulse">
      <div class="h-5 bg-white/10 rounded w-4/5" />
      <div class="h-4 bg-white/[0.06] rounded w-full" />
    </div>

    <div v-else-if="data" class="flex flex-col gap-2">
      <div class="text-base font-bold text-slate-100 leading-snug">{{ data.headline }}</div>
      <p class="text-sm text-slate-400 leading-relaxed">
        <template v-for="(seg, i) in bodySegments" :key="i">
          <strong v-if="seg.bold" class="text-slate-200 font-semibold">{{ seg.text }}</strong>
          <template v-else>{{ seg.text }}</template>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { AdviceData } from '~/types/fitbit'

const props = defineProps<{ date: string }>()

const data = ref<AdviceData | null>(null)
const loading = ref(true)

const bodySegments = computed(() => {
  const text = data.value?.body ?? ''
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter(s => s.text)
})

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<AdviceData>('/api/fitbit/advice', { params: { date: props.date } })
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.date, load)
</script>
