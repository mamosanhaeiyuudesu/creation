<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150]" @click.self="$emit('close')">
    <div class="w-full max-w-[520px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
        <h2 class="m-0 text-lg text-slate-50 font-semibold">カウンセラー設定</h2>
        <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="$emit('close')">✕</button>
      </div>

      <div class="px-6 py-5 overflow-y-auto flex flex-col gap-6 flex-1">

        <!-- アプローチ -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">アプローチ</label>
            <Tooltip text="今の気持ちに合った関わり方を選んでください。いつでも変更できます。" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="a in APPROACHES"
              :key="a.value"
              type="button"
              class="px-3 py-2.5 rounded-xl border text-sm text-left transition-colors"
              :class="localTone === a.value
                ? 'border-rose-400 bg-rose-500/10 text-slate-50'
                : 'border-white/[0.10] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'"
              @click="localTone = a.value"
            >
              <div class="flex items-center gap-1.5">
                <span>{{ a.icon }}</span>
                <span class="font-medium text-[13px]">{{ a.label }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 返答の長さ -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">返答の長さ</label>
            <Tooltip text="気持ちを吐き出したいときは短め、じっくり整理したいときは長めがおすすめです。" />
          </div>
          <div class="flex gap-2">
            <button
              v-for="l in LENGTHS"
              :key="l.value"
              type="button"
              class="flex-1 py-2 rounded-lg border text-xs font-medium transition-colors"
              :class="localLength === l.value
                ? 'border-rose-400 bg-rose-500/10 text-slate-50'
                : 'border-white/[0.10] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'"
              @click="localLength = l.value"
            >
              {{ l.label }}
            </button>
          </div>
        </div>

        <!-- 追加の指示 -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5">
            <label class="text-[13px] font-medium text-slate-400">追加の指示（任意）</label>
            <Tooltip text="アプローチを補足する指示を自由に書けます。例：「ときどき比喩を使ってください」「仕事の悩みが中心です」" />
          </div>
          <textarea
            v-model="localPrompt"
            class="bg-white/[0.05] border border-white/[0.12] rounded-lg text-slate-50 text-sm px-3 py-2 outline-none focus:border-rose-400 transition-colors font-[inherit] resize-y leading-relaxed"
            rows="4"
            placeholder="例：ときどき比喩を使ってください／仕事の悩みが中心です"
            maxlength="2000"
          />
          <div class="text-[11px] text-slate-500 text-right">{{ localPrompt.length }} / 2000</div>
        </div>

        <div class="flex flex-col gap-4">
          <button
            type="button"
            class="text-xs text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 text-left"
            @click="$emit('clearHistory')"
          >
            会話履歴をすべて削除する
          </button>
          <button
            type="button"
            class="text-xs text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer p-0 text-left"
            @click="$emit('logout')"
          >
            ログアウト
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
  responseLength: number
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { tone: string; systemPrompt: string; responseLength: number }): void
  (e: 'clearHistory'): void
  (e: 'logout'): void
}>()

const APPROACHES = [
  { value: 'listen',  icon: '🫂', label: '受け止める' },
  { value: 'explore', icon: '🔍', label: '原因を調査' },
  { value: 'reframe', icon: '🔄', label: '見方を変える' },
  { value: 'forward', icon: '🚀', label: '前向きになる' },
]

const LENGTHS = [
  { value: 1, label: '一言' },
  { value: 2, label: '短め' },
  { value: 3, label: '普通' },
  { value: 4, label: '長め' },
  { value: 5, label: '詳しく' },
]

const localTone = ref(props.tone || 'listen')
const localPrompt = ref(props.systemPrompt || '')
const localLength = ref(props.responseLength || 3)

watch(() => props.tone, (v) => { localTone.value = v || 'listen' })
watch(() => props.systemPrompt, (v) => { localPrompt.value = v || '' })
watch(() => props.responseLength, (v) => { localLength.value = v || 3 })

const save = () => {
  emit('save', { tone: localTone.value, systemPrompt: localPrompt.value, responseLength: localLength.value })
}

// インラインツールチップコンポーネント
const Tooltip = {
  props: { text: String },
  template: `
    <div class="relative group inline-flex">
      <span class="w-4 h-4 rounded-full border border-slate-600 text-slate-500 text-[10px] cursor-help flex items-center justify-center hover:border-slate-400 hover:text-slate-300 transition-colors select-none">?</span>
      <div class="absolute z-50 left-0 top-5 w-60 bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 leading-relaxed invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
        {{ text }}
      </div>
    </div>
  `,
}
</script>
