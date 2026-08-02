<script setup lang="ts">
// ノードをクリックしたときのポップアップ。
// 出来事ノード＝AI要約（読み込み・エラー・再生成あり）、コア／中央＝すでに手元にある説明文を出すだけ。
import type { EpisodeSummary, Polarity } from '~/types/life-analyzer'

const props = defineProps<{
  kind: 'episode' | 'core' | 'center'
  polarity: Polarity | null
  /** 見出し（出来事名／コア名／「わたし」） */
  title: string
  /** 見出しの上に出す文脈（出来事なら属するコア名） */
  context?: string
  /** その場で出せる説明文（コアの説明・出来事の位置づけ・全体の所感） */
  description?: string
  loading?: boolean
  error?: string
  summary?: EpisodeSummary | null
  cached?: boolean
}>()

const emit = defineEmits<{ close: []; regenerate: [] }>()

const accent = computed(() => (props.polarity === 'light' ? 'var(--la-light)' : props.polarity === 'shadow' ? 'var(--la-shadow)' : 'rgba(255,255,255,0.5)'))
const sideLabel = computed(() => (props.polarity === 'light' ? '光' : props.polarity === 'shadow' ? '影' : ''))

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm" @click.self="emit('close')">
    <div
      class="w-full sm:max-w-[600px] max-h-[88dvh] sm:max-h-[82dvh] flex flex-col bg-[var(--la-panel-solid)] border border-[var(--la-line)] rounded-t-2xl sm:rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] la-rise overflow-hidden"
      :style="{ borderTopColor: accent }"
    >
      <!-- ヘッダー -->
      <div class="px-5 pt-5 pb-4 border-b border-[var(--la-line)]">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p v-if="context || sideLabel" class="text-[11px] tracking-wide mb-1.5 truncate" :style="{ color: accent }">
              <span v-if="sideLabel">{{ sideLabel }}</span>
              <span v-if="sideLabel && context" class="opacity-50"> / </span>
              <span v-if="context">{{ context }}</span>
            </p>
            <h2 class="la-display text-[17px] sm:text-[19px] font-semibold leading-snug m-0">{{ title }}</h2>
          </div>
          <button class="shrink-0 w-8 h-8 rounded-full text-[var(--la-ink-faint)] hover:text-[var(--la-ink)] hover:bg-white/[0.06] text-lg leading-none" aria-label="閉じる" @click="emit('close')">×</button>
        </div>
      </div>

      <!-- 本文 -->
      <div class="la-scroll flex-1 overflow-y-auto px-5 py-4">
        <p v-if="description" class="text-[13px] leading-[1.9] text-[var(--la-ink-soft)] whitespace-pre-wrap">{{ description }}</p>

        <template v-if="kind === 'episode'">
          <div class="h-px bg-[var(--la-line)] my-4" />

          <div v-if="loading" class="py-8 flex flex-col items-center gap-3">
            <span class="w-6 h-6 rounded-full border-2 border-white/15 border-t-[var(--la-light)] animate-spin block" />
            <p class="text-[12px] text-[var(--la-ink-faint)]">この出来事について読み返しています…</p>
          </div>

          <div v-else-if="error" class="py-6 text-center">
            <p class="text-[13px] text-[#f28b82] mb-3">{{ error }}</p>
            <button class="la-btn-ghost" @click="emit('regenerate')">もう一度試す</button>
          </div>

          <template v-else-if="summary">
            <p class="text-[13.5px] leading-[2] whitespace-pre-wrap">{{ summary.summary }}</p>

            <div v-if="summary.quotes.length" class="mt-5">
              <p class="text-[11px] tracking-wide text-[var(--la-ink-faint)] mb-2">記録より</p>
              <blockquote
                v-for="(q, i) in summary.quotes"
                :key="i"
                class="text-[12.5px] leading-[1.9] text-[var(--la-ink-soft)] pl-3 mb-2 border-l-2"
                :style="{ borderColor: accent }"
              >{{ q }}</blockquote>
            </div>

            <div v-if="summary.question" class="mt-5 rounded-xl border border-[var(--la-line)] bg-white/[0.03] px-4 py-3.5">
              <p class="text-[11px] tracking-wide text-[var(--la-ink-faint)] mb-1.5">問いかけ</p>
              <p class="la-display text-[14px] leading-[1.8]">{{ summary.question }}</p>
            </div>
          </template>
        </template>
      </div>

      <!-- フッター -->
      <div v-if="kind === 'episode' && summary && !loading" class="px-5 py-3 border-t border-[var(--la-line)] flex items-center justify-between gap-2">
        <span class="text-[11px] text-[var(--la-ink-faint)]">{{ cached ? '保存された要約' : 'いま生成した要約' }}</span>
        <button class="la-btn-ghost" @click="emit('regenerate')">読み返し直す</button>
      </div>
    </div>
  </div>
</template>
