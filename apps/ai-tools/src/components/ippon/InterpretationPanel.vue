<template>
  <div class="space-y-4">
    <div>
      <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] tracking-wide mb-2">読み取り結果</p>
      <p v-if="it.summary" class="text-[13.5px] text-[var(--ip-ink)] mb-3 leading-relaxed">{{ it.summary }}</p>

      <div class="grid grid-cols-2 gap-2.5">
        <label class="col-span-2 block">
          <span class="ip-label">種別</span>
          <input v-model="it.category" class="ip-input" placeholder="例: 壁面収納棚" />
        </label>
        <label class="block">
          <span class="ip-label">幅 (mm)</span>
          <input v-model.number="it.width_mm" type="number" min="0" class="ip-input" placeholder="推定なし" />
        </label>
        <label class="block">
          <span class="ip-label">奥行 (mm)</span>
          <input v-model.number="it.depth_mm" type="number" min="0" class="ip-input" placeholder="推定なし" />
        </label>
        <label class="block">
          <span class="ip-label">高さ (mm)</span>
          <input v-model.number="it.height_mm" type="number" min="0" class="ip-input" placeholder="推定なし" />
        </label>
        <label class="block">
          <span class="ip-label">棚段数</span>
          <input v-model.number="it.shelves" type="number" min="0" max="12" class="ip-input" placeholder="0" />
        </label>
        <label class="col-span-2 block">
          <span class="ip-label">材質</span>
          <input v-model="it.material" class="ip-input" placeholder="例: オーク突板、マット仕上げ" />
        </label>
        <label class="col-span-2 flex items-center gap-2 text-[13px] text-[var(--ip-ink-soft)] cursor-pointer select-none pt-0.5">
          <input type="checkbox" v-model="it.has_legs" class="accent-[var(--ip-accent)]" />
          脚部あり
        </label>
      </div>
    </div>

    <!-- メッセージ（顧客の要望）を反映した点 -->
    <div v-if="it.applied_requests?.length" class="rounded-xl border border-[var(--ip-accent)] bg-[color-mix(in_srgb,var(--ip-accent)_12%,transparent)] p-3">
      <p class="text-[12px] font-bold text-[var(--ip-accent-soft)] mb-1.5">メッセージを反映した点</p>
      <ul class="space-y-1">
        <li v-for="(c, i) in it.applied_requests" :key="i" class="text-[12.5px] text-[var(--ip-ink)] leading-relaxed flex gap-1.5">
          <span class="text-[var(--ip-accent-soft)] shrink-0">✓</span><span>{{ c }}</span>
        </li>
      </ul>
    </div>

    <!-- AIが補った点（顧客に見せる前に気づけるように・仕様§3.4）-->
    <div v-if="it.completions?.length" class="rounded-xl border border-[var(--ip-line)] bg-[color-mix(in_srgb,var(--ip-amber)_10%,transparent)] p-3">
      <p class="text-[12px] font-bold text-[var(--ip-amber)] mb-1.5">AIが補った点</p>
      <ul class="space-y-1">
        <li v-for="(c, i) in it.completions" :key="i" class="text-[12.5px] text-[var(--ip-ink)] leading-relaxed flex gap-1.5">
          <span class="text-[var(--ip-amber)] shrink-0">・</span><span>{{ c }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Interpretation } from '~/types/ippon'

// it は親の reactive オブジェクト。フォームとして直接編集する（momo OrderEditor と同方針）。
defineProps<{ it: Interpretation }>()
</script>

<style scoped>
.ip-label {
  display: block;
  font-size: 11.5px;
  color: var(--ip-ink-faint);
  margin-bottom: 3px;
  font-weight: 600;
}
</style>
