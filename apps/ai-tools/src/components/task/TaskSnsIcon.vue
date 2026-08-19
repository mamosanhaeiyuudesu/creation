<script setup lang="ts">
import type { SnsPlatformKey } from '~/composables/task/useTaskSns'

/**
 * 投稿カウンターのプラットフォーム記号。
 * ブランドロゴをそのまま使わず、線画（インスタ＝カメラ、note＝角丸の「n」、Facebook＝角丸の「f」）で揃えている。
 * 色は currentColor なので、置く側で :style="{ color: p.color }" を指定する。
 */
withDefaults(defineProps<{ platform: SnsPlatformKey; size?: number }>(), { size: 14 })
</script>

<template>
  <svg
    v-if="platform === 'instagram'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    class="flex-shrink-0"
    aria-hidden="true"
  >
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    class="flex-shrink-0"
    aria-hidden="true"
  >
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" stroke-width="2" />
    <text x="12" y="16.8" text-anchor="middle" font-size="12.5" font-weight="700" fill="currentColor">{{ platform === 'facebook' ? 'f' : 'n' }}</text>
  </svg>
</template>
