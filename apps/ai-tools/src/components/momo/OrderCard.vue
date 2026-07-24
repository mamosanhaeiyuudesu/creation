<template>
  <NuxtLink
    :to="`/momo/${order.id}`"
    class="block rounded-2xl bg-[var(--momo-card)] border border-[var(--momo-line)] p-3.5 hover:border-[var(--momo-peach-soft)] transition-colors"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="momo-display font-bold text-[16px] truncate">{{ order.customerName || '（顧客名なし）' }}</span>
          <span class="momo-badge" :data-s="order.status">{{ statusLabel }}</span>
        </div>
        <p class="text-[12.5px] text-[var(--momo-ink-soft)] mt-1">
          {{ order.deliveryDate ? formatFull(order.deliveryDate) : '納品日未定' }}<span v-if="order.timeSlot"> ・ {{ order.timeSlot }}</span>
        </p>
        <ul class="mt-2 space-y-0.5">
          <li v-for="it in order.items" :key="it.id" class="text-[13px] flex items-center gap-1.5 flex-wrap">
            <span class="font-bold">{{ it.variety || '品種未定' }}</span>
            <span v-if="it.size" class="text-[var(--momo-peach-deep)] text-[12px] font-bold">{{ it.size }}</span>
            <span class="text-[var(--momo-ink-soft)]">{{ it.quantity }}{{ it.unit }}</span>
            <span v-if="it.ripeness" class="text-[11.5px] px-1.5 py-0.5 rounded-full bg-[var(--momo-paper-2)] text-[var(--momo-ink-soft)]">{{ it.ripeness }}</span>
          </li>
        </ul>
      </div>
      <span class="text-[var(--momo-ink-soft)] pt-0.5">›</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { Order } from '~/types/momo'

const props = defineProps({
  order: { type: Object as PropType<Order>, required: true },
})

const statusLabel = computed(() =>
  props.order.status === 'confirmed' ? '確定' : props.order.status === 'shipped' ? '出荷済' : '下書き'
)

const WD = ['日', '月', '火', '水', '木', '金', '土']
function formatFull(d: string): string {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return d
  const wd = WD[new Date(`${d}T00:00:00`).getDay()]
  return `${Number(m[2])}月${Number(m[3])}日(${wd})`
}
</script>

<style scoped>
.momo-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.momo-badge[data-s='draft'] { background: #fff3cd; color: #8a6d00; }
.momo-badge[data-s='confirmed'] { background: #e6f4ea; color: #2e7d4f; }
.momo-badge[data-s='shipped'] { background: #eee7f3; color: #6b5b8a; }
</style>
