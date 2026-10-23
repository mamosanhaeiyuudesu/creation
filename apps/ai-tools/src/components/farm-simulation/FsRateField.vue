<template>
  <div>
    <div class="flex items-baseline justify-between gap-2 mb-1">
      <span class="text-[13.5px] font-bold">{{ label }}</span>
      <span class="flex items-center gap-1">
        <input
          :value="model"
          type="number"
          inputmode="decimal"
          :step="step"
          class="fs-input fs-num text-right !w-[84px] !py-1.5"
          @input="onInput"
        />
        <span class="text-[13px] text-[var(--fs-ink-soft)]">%/年</span>
      </span>
    </div>
    <!-- 数字を打たなくても指で動かせるように。動かした瞬間にグラフが変わるのが「いじって試す」の肝 -->
    <input v-model.number="model" type="range" :min="min" :max="max" :step="step" class="fs-range w-full" :aria-label="label" />
    <div class="flex justify-between text-[11px] text-[var(--fs-ink-soft)] -mt-0.5">
      <span>{{ min }}%</span>
      <span>{{ describe }}</span>
      <span>+{{ max }}%</span>
    </div>
    <p v-if="reason" class="mt-1.5 text-[12px] text-[var(--fs-ink-soft)] flex gap-1.5">
      <span class="fs-ai-tag shrink-0">AI</span>
      <span>{{ reason }}<template v-if="suggested !== undefined && suggested !== model">（提案は {{ suggested }}%）</template></span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ label: string; min?: number; max?: number; step?: number; reason?: string; suggested?: number; zeroText?: string }>(),
  { min: -10, max: 20, step: 0.5, reason: '', suggested: undefined, zeroText: '去年と同じ' }
)
const model = defineModel<number>({ required: true })

const describe = computed(() => {
  const v = model.value
  if (!v) return props.zeroText
  // 10年後に何倍になるかを添える。「年5%」が10年で1.6倍になる感覚は持ちにくいので
  const x = Math.pow(1 + v / 100, 10)
  return `10年で${x.toFixed(2)}倍`
})

function onInput(e: Event) {
  const n = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(n)) model.value = n
}
</script>

<style scoped>
.fs-range {
  accent-color: var(--fs-accent);
  height: 28px;
}
.fs-ai-tag {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--fs-accent);
  border-radius: 6px;
  padding: 0 5px;
  line-height: 16px;
  height: 16px;
}
</style>
