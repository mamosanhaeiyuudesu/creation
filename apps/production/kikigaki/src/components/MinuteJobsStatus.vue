<template>
  <!-- 裏で作っている議事録と、作れなかったお知らせ。PCは左メニューの一覧の上、スマホは画面の上に出す。
       できあがったものは useMinuteJobs がそのまま開くので、ここには出ない -->
  <div v-if="running.length || failed.length" class="kk-jobs" :class="{ 'kk-jobs--side': side }">
    <p v-for="j in running" :key="j.id" class="kk-job" role="status">
      <span class="kk-job-spin" aria-hidden="true" />
      <span class="kk-job-text">{{ recordName(j.mode) }}を作成中…</span>
    </p>
    <p v-for="j in failed" :key="j.id" class="kk-job kk-job--error" role="alert">
      <span class="kk-job-text">{{ recordName(j.mode) }}を作れませんでした。{{ j.error }}</span>
      <button type="button" class="kk-job-close" aria-label="閉じる" @click="dismiss(j.id)">✕</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { recordName } from '~/config/minutesLabels'

defineProps<{ side?: boolean }>()

const { running, failed, dismiss } = useMinuteJobs()
</script>

<style scoped>
.kk-jobs {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}
.kk-jobs--side {
  margin: 0 0 0.4rem;
}
.kk-job {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--kk-line);
  border-radius: 8px;
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}
.kk-jobs--side .kk-job {
  padding: 0.35rem 0.55rem;
  font-size: 12.5px;
}
.kk-job--error {
  align-items: flex-start;
  border-color: var(--kk-danger-line);
  background: var(--kk-danger-soft);
  color: var(--kk-danger);
  font-weight: 400;
}
.kk-job-text {
  flex: 1;
  min-width: 0;
}
.kk-job-spin {
  flex: none;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: kk-job-spin 0.8s linear infinite;
}
@keyframes kk-job-spin {
  to { transform: rotate(360deg); }
}
.kk-job-close {
  flex: none;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
}
</style>
