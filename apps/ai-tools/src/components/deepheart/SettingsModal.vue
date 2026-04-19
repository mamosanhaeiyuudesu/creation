<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]" @click.self="$emit('close')">
    <div class="w-full max-w-[520px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
        <h2 class="m-0 text-lg text-slate-50 font-semibold">カウンセラー設定</h2>
        <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="$emit('close')">✕</button>
      </div>

      <div class="px-6 py-5 overflow-y-auto flex flex-col gap-5 flex-1">
        <div class="flex flex-col gap-2">
          <label class="text-[13px] font-medium text-slate-400">口調・スタイル</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in TONES"
              :key="t.value"
              type="button"
              class="px-3 py-2 rounded-lg border text-sm text-left transition-colors"
              :class="localTone === t.value
                ? 'border-rose-400 bg-rose-500/10 text-slate-50'
                : 'border-white/[0.10] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'"
              @click="localTone = t.value"
            >
              <div class="font-medium">{{ t.label }}</div>
              <div class="text-[11px] text-slate-500 mt-0.5">{{ t.desc }}</div>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-slate-400">追加の指示（任意）</label>
          <textarea
            v-model="localPrompt"
            class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-rose-400 transition-colors font-[inherit] resize-y leading-relaxed"
            rows="5"
            placeholder="例：ときどき比喩を使ってください／仕事の悩みが中心です"
            maxlength="2000"
          />
          <div class="text-[11px] text-slate-500 text-right">{{ localPrompt.length }} / 2000</div>
        </div>

        <div class="pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            class="text-xs text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0"
            @click="$emit('clearHistory')"
          >
            会話履歴をすべて削除する
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2 px-6 py-4 pb-5 border-t border-white/[0.08]">
        <button class="px-5 py-2 rounded-lg border border-white/15 bg-transparent text-slate-400 text-sm cursor-pointer hover:bg-white/[0.06] hover:text-slate-50 transition-all" @click="$emit('close')">キャンセル</button>
        <button
          class="px-5 py-2 rounded-lg border-none bg-gradient-to-br from-rose-500 to-indigo-500 text-slate-50 text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  tone: string
  systemPrompt: string
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { tone: string; systemPrompt: string }): void
  (e: 'clearHistory'): void
}>()

const TONES = [
  { value: 'gentle', label: '穏やか', desc: '柔らかく寄り添う' },
  { value: 'warm', label: '温かい', desc: '親しみを込めて肯定' },
  { value: 'coach', label: 'コーチ', desc: '前向きな問いかけ' },
  { value: 'logical', label: '論理的', desc: '事実と感情を整理' },
]

const localTone = ref(props.tone || 'gentle')
const localPrompt = ref(props.systemPrompt || '')

watch(() => props.tone, (v) => { localTone.value = v || 'gentle' })
watch(() => props.systemPrompt, (v) => { localPrompt.value = v || '' })

const save = () => {
  emit('save', { tone: localTone.value, systemPrompt: localPrompt.value })
}
</script>
