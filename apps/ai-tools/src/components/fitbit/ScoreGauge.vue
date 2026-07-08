<template>
  <div class="relative flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90">
      <circle :cx="c" :cy="c" :r="r" fill="none" :stroke-width="stroke" class="stroke-white/[0.07]" />
      <circle
        v-if="score != null"
        :cx="c" :cy="c" :r="r" fill="none" :stroke-width="stroke" stroke-linecap="round"
        :stroke="`url(#grad-${uid})`"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-700 ease-out"
      />
      <defs>
        <linearGradient :id="`grad-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="from" />
          <stop offset="100%" :stop-color="to" />
        </linearGradient>
      </defs>
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span v-if="score != null" class="font-bold tabular-nums leading-none" :style="{ fontSize: `${size * 0.28}px` }">{{ score }}</span>
      <span v-else class="text-slate-500 font-medium" :style="{ fontSize: `${size * 0.13}px` }">--</span>
      <span class="text-slate-400 mt-1" :style="{ fontSize: `${size * 0.1}px` }">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  score: number | null
  label?: string
  size?: number
  from?: string
  to?: string
}>(), {
  label: '',
  size: 120,
  from: '#34d399',
  to: '#10b981',
})

const uid = Math.random().toString(36).slice(2, 8)
const stroke = computed(() => Math.max(6, props.size * 0.08))
const c = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - stroke.value / 2 - 2)
const circumference = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circumference.value * (1 - (props.score ?? 0) / 100))
</script>
