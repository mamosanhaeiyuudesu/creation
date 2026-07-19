<template>
  <nav class="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[13px]" aria-label="パンくずリスト">
    <template v-for="(item, i) in items" :key="i">
      <NuxtLink
        v-if="item.to && i < items.length - 1"
        :to="item.to"
        class="font-bold text-[var(--kaki-ink-soft)] hover:text-[var(--kaki-persimmon-deep)] transition-colors"
      >{{ item.label }}</NuxtLink>
      <span v-else class="font-bold truncate max-w-[46vw]" :class="i === items.length - 1 ? 'text-[var(--kaki-ink)]' : 'text-[var(--kaki-ink-soft)]'">{{ item.label }}</span>
      <span v-if="i < items.length - 1" class="text-[var(--kaki-ink-soft)]/60 select-none">›</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
export interface Crumb {
  label: string
  to?: string
}
defineProps<{ items: Crumb[] }>()
</script>
