<template>
  <div>
    <!-- 比較ビュー（変化が分かることを最優先） -->
    <div v-if="photos.length >= 2" class="grid grid-cols-2 gap-3 mb-4">
      <figure v-for="(sel, i) in [idxA, idxB]" :key="i" class="min-w-0">
        <div class="relative rounded-2xl overflow-hidden border border-[var(--kaki-line)] bg-[var(--kaki-paper-2)] aspect-square">
          <img :src="photos[sel].photoUrl!" :alt="`${formatDate(photos[sel].observedAt)}の写真`" class="w-full h-full object-cover" />
          <div class="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-t from-black/55 to-transparent">
            <button class="text-white/90 text-lg leading-none disabled:opacity-30" :disabled="sel === 0" @click="step(i, -1)">‹</button>
            <span class="text-white text-[12px] font-bold">{{ formatDate(photos[sel].observedAt) }}</span>
            <button class="text-white/90 text-lg leading-none disabled:opacity-30" :disabled="sel === photos.length - 1" @click="step(i, 1)">›</button>
          </div>
        </div>
        <figcaption class="text-center text-[11px] text-[var(--kaki-ink-soft)] mt-1">{{ i === 0 ? 'まえ' : 'いま' }}</figcaption>
      </figure>
    </div>

    <!-- 時系列サムネイル -->
    <div v-if="photos.length" class="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      <button
        v-for="(o, i) in photos"
        :key="o.id"
        class="snap-start shrink-0 w-[76px] text-center group"
        @click="idxB = i"
      >
        <div
          class="rounded-xl overflow-hidden border-2 transition-colors aspect-square"
          :style="{ borderColor: i === idxB || i === idxA ? 'var(--kaki-persimmon)' : 'transparent' }"
        >
          <img :src="o.photoUrl!" :alt="`${formatDate(o.observedAt)}の写真`" class="w-full h-full object-cover" />
        </div>
        <span class="block text-[10px] text-[var(--kaki-ink-soft)] mt-1">{{ formatShort(o.observedAt) }}</span>
      </button>
    </div>
    <p v-else class="text-sm text-[var(--kaki-ink-soft)] py-6 text-center">まだ写真の記録がありません。</p>

    <!-- 実のサイズ -->
    <div v-if="fruitPoints.length >= 2" class="mt-5 rounded-2xl bg-[var(--kaki-paper-2)]/60 border border-[var(--kaki-line)] p-4">
      <p class="text-[12px] font-bold text-[var(--kaki-ink-soft)] mb-3 flex items-center gap-1.5"><span>🍊</span> 実のおおきさ（mm）</p>
      <div class="flex items-end gap-2 h-24">
        <div v-for="p in fruitPoints" :key="p.id" class="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
          <span class="text-[10px] font-bold text-[var(--kaki-persimmon-deep)]">{{ p.mm }}</span>
          <div class="w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-[var(--kaki-persimmon-soft)] to-[var(--kaki-persimmon)]" :style="{ height: `${barH(p.mm)}%` }" />
          <span class="text-[9px] text-[var(--kaki-ink-soft)] whitespace-nowrap">{{ formatShort(p.observedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Observation } from '~/types/kaki'

const props = defineProps<{ observations: Observation[] }>()

const photos = computed(() => props.observations.filter((o) => !!o.photoUrl))

const idxA = ref(0)
const idxB = ref(0)
watch(
  photos,
  (list) => {
    idxA.value = 0
    idxB.value = Math.max(0, list.length - 1)
  },
  { immediate: true }
)

function step(which: number, dir: number) {
  const max = photos.value.length - 1
  if (which === 0) idxA.value = Math.min(max, Math.max(0, idxA.value + dir))
  else idxB.value = Math.min(max, Math.max(0, idxB.value + dir))
}

const fruitPoints = computed(() =>
  props.observations
    .filter((o) => typeof o.fruitSizeMm === 'number')
    .map((o) => ({ id: o.id, mm: o.fruitSizeMm as number, observedAt: o.observedAt }))
)
const maxFruit = computed(() => Math.max(1, ...fruitPoints.value.map((p) => p.mm)))
function barH(mm: number): number {
  return Math.max(8, Math.round((mm / maxFruit.value) * 100))
}

function formatDate(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}月${Number(m[3])}日` : d
}
function formatShort(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : d
}
</script>
