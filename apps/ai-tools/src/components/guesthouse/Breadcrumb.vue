<template>
  <!-- guesthouse 共通のパンくず。最後の項目は現在地（リンクなし・太字）。 -->
  <nav class="flex items-center flex-wrap gap-x-1 gap-y-0.5 text-[13px]" aria-label="パンくず">
    <template v-for="(item, i) in items" :key="i">
      <NuxtLink
        v-if="item.to && i < items.length - 1"
        :to="item.to"
        class="text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)] transition shrink-0"
      >{{ item.label }}</NuxtLink>
      <span v-else class="text-[var(--gh-ink)] font-bold truncate max-w-[50vw]">{{ item.label }}</span>
      <span v-if="i < items.length - 1" class="text-[var(--gh-ink-faint)] shrink-0" aria-hidden="true">›</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
interface Crumb {
  label: string
  to?: string
}
defineProps<{ items: Crumb[] }>()
</script>
