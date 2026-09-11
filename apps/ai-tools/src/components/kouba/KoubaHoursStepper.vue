<script setup lang="ts">
import { computed } from 'vue'
import { KOUBA_MIN_HOURS, KOUBA_MAX_HOURS, KOUBA_HOURS_STEP, clampKoubaHours, formatKoubaHours } from '~/types/kouba'

// サブタスクの作業時間を +/- で30分ずつ増減する。サブタスクの追加フォームと一覧の行で同じものを使う。
const props = defineProps<{ modelValue: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [hours: number] }>()

const label = computed(() => formatKoubaHours(props.modelValue))
const atMin = computed(() => props.modelValue <= KOUBA_MIN_HOURS)
const atMax = computed(() => props.modelValue >= KOUBA_MAX_HOURS)

function step(delta: number) {
  const next = clampKoubaHours(props.modelValue + delta)
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<template>
  <!-- モーダル内の <form> にも置くので type="button" は必須（既定の submit だと押すたびに追加が走る） -->
  <div class="flex items-center gap-0.5 bg-white/[0.06] border border-white/10 rounded-lg px-1 py-0.5 shrink-0">
    <button
      type="button"
      class="w-6 h-6 rounded text-slate-200 text-sm font-bold leading-none hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
      title="30分減らす"
      aria-label="30分減らす"
      :disabled="disabled || atMin"
      @click="step(-KOUBA_HOURS_STEP)"
    >−</button>
    <span class="min-w-[5rem] text-center text-slate-100 text-xs font-semibold tabular-nums">{{ label }}</span>
    <button
      type="button"
      class="w-6 h-6 rounded text-slate-200 text-sm font-bold leading-none hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
      title="30分増やす"
      aria-label="30分増やす"
      :disabled="disabled || atMax"
      @click="step(KOUBA_HOURS_STEP)"
    >＋</button>
  </div>
</template>
