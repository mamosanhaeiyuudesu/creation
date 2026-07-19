<template>
  <div>
    <p class="text-[11.5px] font-bold mb-1.5" :style="{ color: accent }">{{ label }}</p>
    <div class="flex flex-wrap gap-1.5 mb-2">
      <span
        v-for="(item, i) in modelValue"
        :key="i"
        class="inline-flex items-center gap-1 text-[13px] font-bold rounded-full pl-3 pr-1.5 py-1"
        :style="{ background: tint, color: accent }"
      >
        {{ item }}
        <button type="button" class="w-4 h-4 rounded-full flex items-center justify-center text-[11px] hover:bg-black/10" @click="remove(i)">×</button>
      </span>
      <span v-if="!modelValue.length" class="text-[12px] text-[var(--kaki-ink-soft)]">まだありません</span>
    </div>
    <div class="flex gap-1.5">
      <input
        v-model="draft"
        type="text"
        :placeholder="placeholder"
        class="flex-1 min-w-0 bg-[var(--kaki-paper)] border border-[var(--kaki-line)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--kaki-ink)] focus:outline-none focus:border-[var(--kaki-persimmon)]"
        @keydown.enter.prevent="add"
      />
      <button type="button" class="shrink-0 px-3 rounded-lg text-[13px] font-bold text-white" :style="{ background: accent }" @click="add">＋</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{ modelValue: string[]; label: string; tone?: 'leaf' | 'persimmon'; placeholder?: string }>(), {
  tone: 'leaf',
  placeholder: '',
})
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const accent = computed(() => (props.tone === 'persimmon' ? 'var(--kaki-persimmon-deep)' : 'var(--kaki-leaf)'))
const tint = computed(() => `color-mix(in srgb, ${accent.value} 15%, white)`)

const draft = ref('')
function add() {
  const v = draft.value.trim()
  if (!v) return
  emit('update:modelValue', [...props.modelValue, v])
  draft.value = ''
}
function remove(i: number) {
  emit('update:modelValue', props.modelValue.filter((_, idx) => idx !== i))
}
</script>
