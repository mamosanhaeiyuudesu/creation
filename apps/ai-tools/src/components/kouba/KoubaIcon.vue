<script setup lang="ts">
import { computed } from 'vue'
import { isSvgIcon, svgIconDataUrl } from '~/types/kouba'

// カテゴリ・タスクのアイコン表示。AI 生成の SVG は <img>、旧データの絵文字は文字で出す。
// 大きさは親要素で決める（親いっぱいに広がる）。busy 中＝AI が作成中はスピナーを重ねる。
const props = defineProps<{ icon: string; busy?: boolean }>()
const svgSrc = computed(() => (isSvgIcon(props.icon) ? svgIconDataUrl(props.icon) : ''))
</script>

<template>
  <span class="relative flex items-center justify-center w-full h-full leading-none">
    <!-- 付箋はドラッグできるので、画像そのものがドラッグされないようにする -->
    <img v-if="svgSrc" :src="svgSrc" alt="" draggable="false" class="w-full h-full object-contain" />
    <span v-else>{{ icon }}</span>
    <span v-if="busy" class="absolute inset-0 flex items-center justify-center rounded-[22%] bg-black/45" title="AIがアイコンを作成中">
      <span class="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </span>
  </span>
</template>
