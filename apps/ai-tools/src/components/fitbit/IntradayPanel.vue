<template>
  <div class="flex flex-col gap-2">
    <div v-if="label" class="text-xs font-semibold text-slate-400">{{ label }}</div>
    <div v-if="!hasData" class="h-[120px] flex items-center justify-center text-slate-600 text-xs">データがありません</div>
    <div v-else ref="wrap" class="relative" :style="{ height: `${H}px` }">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="w-full h-full block" @pointermove="onMove" @pointerleave="hover = -1">
        <!-- グリッド -->
        <line v-for="(gy, i) in gridYs" :key="`g${i}`" :x1="padL" :x2="W - padR" :y1="gy.y" :y2="gy.y" class="stroke-white/[0.06]" stroke-width="1" vector-effect="non-scaling-stroke" />
        <text v-for="(gy, i) in gridYs" :key="`t${i}`" :x="padL - 6" :y="gy.y + 3" text-anchor="end" class="fill-slate-600" :style="labelStyle">{{ fmt(gy.v) }}</text>
        <!-- 棒 -->
        <rect
          v-for="b in bars"
          :key="`b${b.i}`"
          :x="b.x"
          :y="b.y"
          :width="b.width"
          :height="b.height"
          rx="1"
          :fill="color"
          :fill-opacity="hover === b.i ? 1 : 0.7"
        />
        <!-- ホバーガイド -->
        <line v-if="hoverX != null" :x1="hoverX" :x2="hoverX" :y1="padT" :y2="H - padB" :stroke="color" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
        <!-- X ラベル -->
        <text v-for="(lbl, i) in xLabels" :key="`x${i}`" :x="lbl.x" :y="H - 4" text-anchor="middle" class="fill-slate-600" :style="labelStyle">{{ lbl.text }}</text>
      </svg>
      <!-- ツールチップ -->
      <div
        v-if="hovered"
        class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900/95 border border-white/10 text-[11px] whitespace-nowrap -translate-x-1/2 shadow-lg"
        :style="tooltipStyle"
      >
        <div class="text-slate-400 text-[10px]">{{ hovered.label }}</div>
        <div class="font-bold text-slate-100 tabular-nums">{{ hovered.value ?? '-' }}<span class="text-slate-500 text-[10px] font-normal ml-0.5">{{ unit }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TimePoint } from '~/types/fitbit'
import { useBarChart } from '~/composables/fitbit/useBarChart'

const props = withDefaults(defineProps<{
  points: TimePoint[]
  color?: string
  unit?: string
  decimals?: number
  /** 見出しテキスト（例: 「時間別」「心拍数（5分間隔）」） */
  label: string
}>(), { color: '#38bdf8', unit: '', decimals: 0 })

function fmt(v: number): string { return v.toFixed(props.decimals) }
/** 0時からの経過分 → "HH:MM" */
function clock(t: number): string {
  const h = Math.floor(t / 60) % 24
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const barPoints = computed(() => props.points.map(p => ({ label: clock(p.t), value: p.v })))
const { wrap, W, H, padL, padR, padT, padB, labelStyle, hasData, bars, gridYs, xLabels, hover, hovered, hoverX, tooltipStyle, onMove } = useBarChart(barPoints, { height: 120 })
</script>
