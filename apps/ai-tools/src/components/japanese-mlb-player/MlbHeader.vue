<template>
  <header class="relative z-40 flex items-center justify-between px-5 py-3 flex-shrink-0" style="background: #0C447C;">
    <div class="flex items-center gap-3">
      <span class="text-xl">⚾</span>
      <div>
        <h1 class="text-white font-bold text-base leading-tight m-0">MLB日本人選手成績</h1>
        <p class="text-blue-200 text-xs m-0 hidden sm:block">2026シーズン</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <p v-if="lastUpdated" class="text-blue-200 text-xs text-right m-0">
        更新: {{ formatUpdated(lastUpdated) }}
      </p>
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSe9bfl-DXIf9VWKvbsq3WuWYC72N2PSJUMeAo83jG6UE_7YFw/viewform"
        target="_blank"
        rel="noopener noreferrer"
        class="feedback-link"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="hidden sm:inline">ご意見・お問い合わせ</span>
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  lastUpdated?: string | null
}>()

function formatUpdated(s: string): string {
  // "2026-04-30 14:32:15" → "4/30 14:32"
  const m = s.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!m) return s
  return `${parseInt(m[2])}/${parseInt(m[3])} ${m[4]}:${m[5]}`
}
</script>

<style scoped>
.feedback-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(186, 214, 255, 0.6);
  border: 1px solid rgba(186, 214, 255, 0.2);
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.feedback-link:hover {
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(186, 214, 255, 0.5);
  background: rgba(186, 214, 255, 0.08);
}
</style>
