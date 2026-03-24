<script setup lang="ts">
import type { Card } from '~/composables/task/useTaskBoards'

const props = defineProps<{
  show: boolean
  cardName: string
  saving: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:modelValue': [value: string]
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="emit('update:show', false)">
      <div class="w-[min(360px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <h2 class="m-0 text-base font-bold text-slate-50">期限を設定してDONEにする</h2>
          <p class="m-0 mt-1 text-[13px] text-slate-500 truncate">{{ cardName }}</p>
        </div>
        <input
          :value="modelValue"
          class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] [color-scheme:dark]"
          type="datetime-local"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer hover:bg-white/[0.12]" @click="emit('update:show', false)">キャンセル</button>
          <button
            class="px-4 py-2 rounded-lg border-none bg-emerald-500/80 text-white text-[13px] font-semibold cursor-pointer hover:bg-emerald-500 disabled:opacity-40"
            :disabled="!modelValue || saving"
            @click="emit('confirm')"
          >{{ saving ? '…' : 'DONEにする' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
