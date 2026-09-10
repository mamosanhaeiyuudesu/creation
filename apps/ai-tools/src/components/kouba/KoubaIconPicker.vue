<script setup lang="ts">
import { KOUBA_ICON_PRESETS } from '~/types/kouba'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function pick(icon: string) {
  emit('update:modelValue', icon)
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex flex-wrap gap-1">
      <button
        v-for="icon in KOUBA_ICON_PRESETS"
        :key="icon"
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-base border transition-colors"
        :class="modelValue === icon ? 'bg-sky-500/20 border-sky-400' : 'bg-white/[0.04] border-white/10 hover:border-white/25'"
        @click="pick(icon)"
      >{{ icon }}</button>
    </div>
    <input
      :value="modelValue"
      type="text"
      maxlength="8"
      placeholder="その他の絵文字を貼り付け"
      class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs outline-none focus:border-sky-400/50"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
