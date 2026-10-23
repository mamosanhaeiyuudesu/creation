<template>
  <label class="flex items-center gap-2">
    <span class="flex-1 min-w-0">
      <span class="block text-[13px] leading-tight">{{ def.label }}</span>
      <span v-if="uncertain" class="block text-[11px] text-[var(--fs-warn)]">読み取りに自信なし・確認を</span>
      <span v-else-if="def.hint" class="block text-[11px] text-[var(--fs-ink-faint)]">{{ def.hint }}</span>
    </span>
    <!-- 桁の多い金額なので、入力中もカンマ区切りで見せる（type=number だと区切れない） -->
    <input
      :value="focused ? raw : display"
      type="text"
      inputmode="numeric"
      class="fs-input fs-num text-right !w-[150px]"
      :class="{ 'fs-input--warn': uncertain }"
      @focus="onFocus"
      @blur="focused = false"
      @input="onInput"
    />
    <span class="text-[12px] text-[var(--fs-ink-soft)]">円</span>
  </label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TaxItemDef } from '~/types/farm-simulation'

defineProps<{ def: TaxItemDef; uncertain?: boolean }>()
const model = defineModel<number | undefined>({ default: 0 })

const focused = ref(false)
const raw = ref('')
const display = computed(() => (model.value ? Math.round(model.value).toLocaleString('ja-JP') : '0'))

function onFocus() {
  focused.value = true
  raw.value = model.value ? String(Math.round(model.value)) : ''
}

function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  raw.value = v
  // 全角数字・カンマ・「円」が混ざっても数字だけ拾う
  const half = v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[^\d-]/g, '')
  const n = Number(half)
  model.value = Number.isFinite(n) ? n : 0
}
</script>
