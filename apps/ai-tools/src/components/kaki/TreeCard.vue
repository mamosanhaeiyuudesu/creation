<template>
  <NuxtLink
    :to="to"
    class="group block rounded-[26px] overflow-hidden bg-[var(--kaki-card)] border border-[var(--kaki-line)] shadow-[0_14px_34px_-18px_rgba(120,80,40,0.45)] transition-transform duration-300 hover:-translate-y-1"
  >
    <!-- 写真 -->
    <div class="relative aspect-[4/3] overflow-hidden bg-[var(--kaki-paper-2)]">
      <img
        v-if="tree.lastPhoto"
        :src="tree.lastPhoto"
        :alt="`${tree.nickname}の写真`"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div v-else class="w-full h-full flex flex-col items-center justify-center text-[var(--kaki-ink-soft)]">
        <span class="text-4xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🌳</span>
        <span class="text-xs mt-1">まだ写真がありません</span>
      </div>
      <div class="absolute top-3 left-3">
        <StatusBadge :status="tree.status" size="sm" />
      </div>
      <span class="absolute top-3 right-3 text-[11px] font-bold text-white/95 bg-[var(--kaki-persimmon)]/90 rounded-full px-2.5 py-0.5 shadow">
        No.{{ tree.number }}
      </span>
    </div>

    <!-- 本文 -->
    <div class="p-4">
      <h3 class="kaki-display text-[19px] font-bold leading-tight text-[var(--kaki-ink)]">{{ tree.nickname || '（愛称なし）' }}</h3>
      <p v-if="ageText" class="text-[12px] text-[var(--kaki-ink-soft)] mt-0.5">{{ ageText }}</p>
      <p class="text-[12px] text-[var(--kaki-ink-soft)] mt-2 flex items-center gap-1">
        <span>🗓️</span>
        <span>{{ tree.lastObservedAt ? `${formatDate(tree.lastObservedAt)} 更新` : '記録はこれから' }}</span>
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TreeSummary } from '~/types/kaki'
import StatusBadge from '~/components/kaki/StatusBadge.vue'

const props = defineProps<{ tree: TreeSummary; to: string }>()

const ageText = computed(() => (props.tree.plantedYear ? `樹齢 ${new Date().getFullYear() - props.tree.plantedYear} 歳` : ''))

function formatDate(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}月${Number(m[3])}日` : d
}
</script>
