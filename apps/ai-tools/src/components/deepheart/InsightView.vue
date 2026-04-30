<template>
  <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 [scrollbar-width:thin] [scrollbar-color:rgba(99,102,241,0.3)_transparent]">

    <!-- ローディング or 自動生成中 -->
    <div v-if="loading || (refreshing && !insight)" class="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <span class="inline-block w-6 h-6 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
      <p class="m-0 text-sm">{{ refreshing ? 'あなたのことを考えています…' : '読み込んでいます…' }}</p>
    </div>

    <!-- メッセージ不足 -->
    <div v-else-if="tooFewMessages" class="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16 px-4">
      <div class="text-4xl">🌱</div>
      <p class="m-0 text-sm text-slate-400">まだ「話す」でのメッセージが少ないため、<br>気づきを生成できません。</p>
      <p class="m-0 text-xs text-slate-600">5件以上話すと分析が始まります（現在{{ messageCount }}件）</p>
    </div>

    <!-- インサイト表示 -->
    <template v-else>
      <!-- ヘッダーバー -->
      <div class="flex items-center justify-between gap-2 py-1">
        <span class="text-[11px] text-slate-500">{{ createdAtFormatted ? `最終分析: ${createdAtFormatted}` : '' }}</span>
        <button
          class="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="refreshing"
          title="直近のメッセージをもとに再分析する"
          @click="!refreshing && $emit('refresh')"
        >
          <span v-if="refreshing" class="inline-block w-2.5 h-2.5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          <span v-else>↺</span>
          {{ refreshing ? '分析中…' : '更新する' }}
        </button>
      </div>

      <!-- 悩みのテーマ -->
      <div class="bg-white/[0.04] border border-white/[0.08] border-l-4 border-l-rose-500/60 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none">💭</span>
          <span class="text-xs font-semibold text-rose-400">悩みのテーマ</span>
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li v-for="(item, i) in insight.concerns" :key="i" class="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
            <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-rose-500/60 shrink-0" />{{ item }}
          </li>
        </ul>
      </div>

      <!-- 感情のパターン -->
      <div class="bg-white/[0.04] border border-white/[0.08] border-l-4 border-l-violet-500/60 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none">🌊</span>
          <span class="text-xs font-semibold text-violet-400">感情のパターン</span>
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li v-for="(item, i) in insight.emotions" :key="i" class="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
            <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />{{ item }}
          </li>
        </ul>
      </div>

      <!-- 思考のクセ -->
      <div class="bg-white/[0.04] border border-white/[0.08] border-l-4 border-l-amber-500/60 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none">🔄</span>
          <span class="text-xs font-semibold text-amber-400">思考のクセ</span>
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li v-for="(item, i) in insight.patterns" :key="i" class="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
            <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />{{ item }}
          </li>
        </ul>
      </div>

      <!-- あなたの強み -->
      <div class="bg-white/[0.04] border border-white/[0.08] border-l-4 border-l-emerald-500/60 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none">🌱</span>
          <span class="text-xs font-semibold text-emerald-400">あなたの強み</span>
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li v-for="(item, i) in insight.strengths" :key="i" class="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
            <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />{{ item }}
          </li>
        </ul>
      </div>

      <!-- 気づきのヒント -->
      <div class="bg-white/[0.04] border border-white/[0.08] border-l-4 border-l-sky-500/60 rounded-xl p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base leading-none">✨</span>
          <span class="text-xs font-semibold text-sky-400">気づきのヒント</span>
        </div>
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
          <li v-for="(hint, i) in insight.hints" :key="i" class="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
            <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-sky-500/60 shrink-0" />{{ hint }}
          </li>
        </ul>
      </div>

      <!-- 今週の一歩 -->
      <div class="rounded-xl p-[1px] bg-gradient-to-br from-rose-500/60 to-indigo-500/60">
        <div class="rounded-[11px] p-4 flex flex-col gap-2 bg-[#0f0d1a]">
          <div class="flex items-center gap-2">
            <span class="text-base leading-none">👣</span>
            <span class="text-xs font-semibold bg-gradient-to-r from-rose-400 to-indigo-400 bg-clip-text text-transparent">今週の一歩</span>
          </div>
          <p class="m-0 text-sm text-slate-200 leading-relaxed font-medium">{{ insight.nextStep }}</p>
        </div>
      </div>

      <!-- 注意書き -->
      <p class="m-0 mt-1 mb-2 text-[11px] text-slate-600 text-center leading-relaxed px-2">
        この分析はAIによるものです。専門家の診断に代わるものではありません。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface InsightResult {
  concerns: string[]
  emotions: string[]
  patterns: string[]
  strengths: string[]
  hints: string[]
  nextStep: string
}

const props = defineProps<{
  insight: InsightResult | null
  createdAt: string | null
  messageCount: number
  tooFewMessages: boolean
  loading: boolean
  refreshing: boolean
}>()

defineEmits<{ refresh: [] }>()

const createdAtFormatted = computed(() => {
  if (!props.createdAt) return ''
  const raw = props.createdAt.includes('T') ? props.createdAt : props.createdAt.replace(' ', 'T') + 'Z'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'たった今'
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}日前`
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
})
</script>
