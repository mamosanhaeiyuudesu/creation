<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap"
    :class="sizeClass"
    :style="{ background: tint, color: color, boxShadow: `inset 0 0 0 1.5px ${border}` }"
  >
    <span style="font-family: 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">{{ meta.emoji }}</span>
    <span>{{ meta.label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_META, type TreeStatus } from '~/types/kaki'

const props = withDefaults(defineProps<{ status: TreeStatus; size?: 'sm' | 'md' }>(), { size: 'md' })

const meta = computed(() => STATUS_META[props.status] ?? STATUS_META.healthy)

const TONE: Record<string, string> = {
  leaf: 'var(--kaki-leaf)',
  amber: 'var(--kaki-amber)',
  clay: 'var(--kaki-clay)',
}
const color = computed(() => TONE[meta.value.tone] ?? 'var(--kaki-leaf)')
const tint = computed(() => `color-mix(in srgb, ${color.value} 16%, white)`)
const border = computed(() => `color-mix(in srgb, ${color.value} 34%, white)`)
const sizeClass = computed(() => (props.size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-[13px] px-3 py-1'))
</script>
