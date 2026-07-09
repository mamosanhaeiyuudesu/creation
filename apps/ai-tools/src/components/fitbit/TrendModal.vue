<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[520px] bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-100 flex items-center gap-1.5">
          <span>{{ icon }}</span>{{ label }}<span class="text-slate-500 font-normal">の推移</span>
        </h3>
        <button class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
      </div>
      <div v-if="intraday" class="mb-5 pb-5 border-b border-white/[0.06]">
        <IntradayPanel :points="intraday.points" :color="color" :unit="unit" :decimals="decimals" :label="intraday.label" />
      </div>
      <TrendPanel :metric="metric" :color="color" :unit="unit" :date="date" :decimals="decimals" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import IntradayPanel from '~/components/fitbit/IntradayPanel.vue'
import type { TimePoint } from '~/types/fitbit'

defineProps<{
  metric: string
  label: string
  icon?: string
  color?: string
  unit?: string
  date?: string
  decimals?: number
  intraday?: { points: TimePoint[]; label: string }
}>()
defineEmits<{ close: [] }>()
</script>
