<template>
  <!--
    お客様の声に添えるアイコン。
    KaitoScene.vue と同じ描き方（丸顔・ドットの目・ほお赤）で揃えている。
    実在の方の感想なので、他人の顔写真ではなくイラストにしている。
  -->
  <svg
    class="testimonial-avatar"
    viewBox="0 0 64 64"
    role="img"
    :aria-label="`お客様のイラストアイコン ${variant}`"
  >
    <!-- 地の丸 -->
    <circle cx="32" cy="32" r="32" :fill="theme.bg" />

    <!-- 肩 -->
    <path d="M32 42c9 0 16 7 17 22H15c1-15 8-22 17-22Z" :fill="theme.cloth" />

    <!-- 顔 -->
    <circle cx="32" cy="30" r="17" fill="#f8e2cd" />

    <!-- 髪（後ろ側） -->
    <template v-if="variant === 3">
      <rect x="12.5" y="26" width="7" height="28" rx="3.5" :fill="theme.hair" />
      <rect x="44.5" y="26" width="7" height="28" rx="3.5" :fill="theme.hair" />
    </template>
    <template v-else-if="variant !== 4">
      <rect x="13.5" y="26" width="6" height="20" rx="3" :fill="theme.hair" />
      <rect x="44.5" y="26" width="6" height="20" rx="3" :fill="theme.hair" />
    </template>

    <!-- 髪（前髪） -->
    <path
      v-if="variant === 4"
      d="M15 31a17 17 0 0 1 34 0c-1-7-6-11-10-8-4 2-8 2-11 0-4-2-8 3-9 8Z"
      :fill="theme.hair"
    />
    <path
      v-else
      d="M15 30a17 17 0 0 1 34 0c-2-6-7-9-11-7s-10 1-14-1c-4-2-7 3-9 8Z"
      :fill="theme.hair"
    />

    <!-- おだんご -->
    <circle v-if="variant === 2" cx="32" cy="11" r="6.5" :fill="theme.hair" />

    <!-- ハイビスカスの髪飾り -->
    <g v-if="variant === 1" transform="translate(47 25)">
      <g fill="#f7a8b4">
        <circle cx="0" cy="-4.2" r="3.1" />
        <circle cx="4" cy="-1.3" r="3.1" />
        <circle cx="2.5" cy="3.4" r="3.1" />
        <circle cx="-2.5" cy="3.4" r="3.1" />
        <circle cx="-4" cy="-1.3" r="3.1" />
      </g>
      <circle r="1.9" fill="#ffd08f" />
    </g>

    <!-- 貝殻の髪飾り -->
    <path v-if="variant === 3" d="M17 22l-6-8a7.4 7.4 0 0 1 12 0Z" fill="#ffffff" />

    <!-- 目（3番だけ にっこり閉じ目） -->
    <g v-if="variant === 3" fill="none" stroke="#33403f" stroke-width="2.1" stroke-linecap="round">
      <path d="M22.5 32q3.5-4 7 0" />
      <path d="M34.5 32q3.5-4 7 0" />
    </g>
    <g v-else fill="#33403f">
      <ellipse cx="26" cy="32" rx="2.2" ry="2.9" />
      <ellipse cx="38" cy="32" rx="2.2" ry="2.9" />
    </g>

    <!-- ほお -->
    <circle cx="20.5" cy="37" r="3.4" fill="#f7b3b8" opacity=".85" />
    <circle cx="43.5" cy="37" r="3.4" fill="#f7b3b8" opacity=".85" />

    <!-- 口 -->
    <path
      d="M28.8 37.5q3.2 3.6 6.4 0"
      fill="none"
      stroke="#33403f"
      stroke-width="1.9"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{ variant: 1 | 2 | 3 | 4 }>()

/** 地の色・髪・服。海と砂浜の配色から取っている */
const themes = {
  1: { bg: '#d3eef0', hair: '#5b4239', cloth: '#ffffff' },
  2: { bg: '#dcedf7', hair: '#41393a', cloth: '#a9dfe2' },
  3: { bg: '#f7e8d4', hair: '#8a6247', cloth: '#ffe1ea' },
  4: { bg: '#d9eee2', hair: '#6b4a3c', cloth: '#cfe8ea' },
} as const

const theme = computed(() => themes[props.variant])
</script>
