<template>
  <a
    :href="site.instagramUrl"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="ariaLabel"
    :title="ariaLabel"
  >
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
    <span v-if="brand" class="hr-btn-text">
      <span class="hr-btn-brand">Instagram</span>
      <span class="hr-btn-label">{{ label }}</span>
    </span>
    <template v-else-if="label">{{ label }}</template>
  </a>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

const DEFAULT_LABEL = 'Instagramで施術の様子・営業カレンダーを見る'

const props = withDefaults(
  defineProps<{
    /** 空文字にするとアイコンのみの表示になる */
    label?: string
    /** ラベルの上に「Instagram」というサービス名を小さく添える */
    brand?: boolean
  }>(),
  { label: DEFAULT_LABEL, brand: false },
)

const ariaLabel = computed(() =>
  props.brand ? `Instagram — ${props.label}` : props.label || DEFAULT_LABEL,
)
</script>
