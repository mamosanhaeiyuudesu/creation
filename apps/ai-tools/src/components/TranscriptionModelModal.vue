<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]" @click.self="$emit('close')">
    <div class="w-full max-w-[380px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col">
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 class="m-0 text-lg text-slate-50 font-semibold">🤖 音声認識モデル</h2>
          <p class="m-0 mt-0.5 text-xs text-slate-500">文字起こしに使うAIを選べます</p>
        </div>
        <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="$emit('close')">✕</button>
      </div>
      <div class="px-4 py-3 flex flex-col gap-2">
        <button
          v-for="opt in options"
          :key="opt.value"
          class="flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer bg-transparent"
          :class="modelValue === opt.value ? activeClass : 'border-white/10 hover:bg-white/[0.05]'"
          @click="select(opt.value)"
        >
          <span class="text-base leading-none mt-0.5 shrink-0" :class="modelValue === opt.value ? accentTextClass : 'text-slate-600'">{{ modelValue === opt.value ? '●' : '○' }}</span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-slate-100">{{ opt.label }}</span>
            <span class="block text-xs text-slate-500 mt-0.5 leading-relaxed">{{ opt.desc }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TranscriptionModel } from '~/composables/useTranscriptionModel'

const props = defineProps<{
  modelValue: TranscriptionModel
  accent?: 'sky' | 'orange'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TranscriptionModel]
  close: []
}>()

const options: { value: TranscriptionModel; label: string; desc: string }[] = [
  { value: 'whisper', label: 'Whisper（OpenAI）', desc: '既定。逐語の文字起こしに安定して強い' },
  { value: 'gemini', label: 'Gemini（Google）', desc: '試験的な選択肢' },
]

const activeClass = computed(() =>
  props.accent === 'orange' ? 'border-orange-500/60 bg-orange-500/10' : 'border-sky-400/60 bg-sky-400/10'
)
const accentTextClass = computed(() =>
  props.accent === 'orange' ? 'text-orange-400' : 'text-sky-400'
)

const select = (value: TranscriptionModel) => {
  emit('update:modelValue', value)
  emit('close')
}
</script>
