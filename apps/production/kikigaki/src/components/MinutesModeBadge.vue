<template>
  <!-- まとめ方（話し合い／聞き取り）のラベル。一覧の行と確認画面の見出しで同じ見た目にして、
       一覧から開いたときに「同じ種類だ」とすぐ分かるようにする -->
  <span class="kk-mode-badge" :class="`is-${mode}`">
    <svg v-if="mode === 'talk'" viewBox="0 0 24 24" aria-hidden="true">
      <!-- 耳（聞き取り） -->
      <path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3 6s-1 4-3.5 4A2.5 2.5 0 0 1 8 16.5" />
      <path d="M10 9.5a2 2 0 0 1 4 0c0 1-1 1.5-1.5 2" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <!-- 2人（話し合い） -->
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0M15.5 5.2a3 3 0 0 1 0 5.6M17.5 13.6A6 6 0 0 1 21 19" />
    </svg>
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { MINUTES_MODES, type MinutesMode } from '~/types/minutes'

const props = defineProps<{ mode: MinutesMode }>()

const label = computed(() => MINUTES_MODES.find((m) => m.value === props.mode)?.label ?? '')
</script>

<style scoped>
/* 色は基調の青を話し合いに、聞き取りだけ緑にする（オレンジは主役のボタン専用なので使わない） */
.kk-mode-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 20px;
  padding: 0 0.45rem 0 0.35rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}
.kk-mode-badge svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-mode-badge.is-meeting {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-mode-badge.is-talk {
  background: #e3f4ec;
  color: #1d6b4a;
}
</style>
