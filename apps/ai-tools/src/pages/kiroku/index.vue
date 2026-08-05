<template>
  <div ref="rootEl" class="flex flex-col h-[100dvh]">
    <header class="shrink-0 flex items-center gap-1 px-4 sm:px-6 h-14">
      <span class="kr-display text-[15px] text-[var(--kr-ink-soft)]">kiroku</span>

      <div class="ml-auto flex items-center gap-0.5">
        <NuxtLink to="/kiroku/notes" class="kr-icon-btn" aria-label="これまでの記録">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M4 6.5h16M4 12h16M4 17.5h11" />
          </svg>
        </NuxtLink>
        <button class="kr-icon-btn" :aria-label="isDark() ? '明るい表示にする' : '暗い表示にする'" @click="toggle">
          <svg v-if="isDark()" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
          </svg>
        </button>
      </div>
    </header>

    <main class="flex-1 min-h-0 w-full max-w-[640px] mx-auto px-5 sm:px-8 pb-6 flex flex-col">
      <!-- 開いたらすぐ書ける。前段の選択も分類もはさまない。 -->
      <textarea
        ref="inputEl"
        v-model="text"
        class="kr-write flex-1 min-h-0 py-3"
        placeholder="いま感じていることを、そのまま書いてみてください"
        autofocus
        autocomplete="off"
        autocapitalize="sentences"
        spellcheck="false"
        @keydown="onKeydown"
      />

      <div class="shrink-0 pt-4">
        <div class="flex justify-center">
          <button class="kr-btn" :disabled="!canSave" @click="save">記録する</button>
        </div>

        <p v-if="storageError" class="mt-3 text-center text-[12px] text-[var(--kr-ink-soft)]">{{ storageError }}</p>

        <!-- 保存の合図と足跡は同じ場所に置く。称賛ではなく、置いてきた印だけを残す。
             数を競わせないので、連続日数は出さない。 -->
        <div class="mt-4 h-5 flex items-center justify-center">
          <span v-if="justSaved" class="kr-mark flex items-center gap-1.5 text-[12.5px] text-[var(--kr-accent-deep)]">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            記録しました
          </span>
          <NuxtLink
            v-else-if="loaded && total > 0"
            to="/kiroku/notes"
            class="text-[12px] text-[var(--kr-ink-faint)] hover:text-[var(--kr-ink-soft)] transition-colors"
          >
            これまで {{ total }} の気づき
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * kiroku — 湧いたものをそのまま置いておくための入力画面。
 *
 * 手を入れるときの判断基準（意図して「無い」もの）:
 * - AI の解釈・要約・助言、感情の分類やタグ付けは足さない（読み解きは人と人のセッションの仕事）
 * - 点数・文字数ノルマ・連続日数・催促通知も足さない（「良い記録／悪い記録」を作らない）
 * - 達成感は競争ではなく足跡で。控えめな合図と、溜まっていく記録そのもので足りる
 * - 書き始めるまでに何もはさまない（ログイン・カテゴリ選択・気分の選択などを前段に置かない）
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useKirokuNotes } from '~/composables/kiroku/useKirokuNotes'
import { useKirokuTheme } from '~/composables/kiroku/useKirokuTheme'

definePageMeta({ layout: 'kiroku' })

useHead({
  title: 'kiroku',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/icon-kiroku.svg' },
    { rel: 'manifest', href: '/manifest-kiroku.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-kiroku.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'kiroku' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'theme-color', content: '#f5f2ec', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#16181b', media: '(prefers-color-scheme: dark)' },
    // 記録は端末内にしか無いので、そもそも共有される想定を作らない
    { name: 'robots', content: 'noindex' },
  ],
})

const { add, total, loaded, storageError, readDraft, saveDraft } = useKirokuNotes()
const { isDark, toggle } = useKirokuTheme()

const text = ref('')
const justSaved = ref(false)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
let markTimer: ReturnType<typeof setTimeout> | null = null

const canSave = computed(() => text.value.trim().length > 0)

// スマホでキーボードが出ると 100dvh のままでは「記録する」が隠れるので、
// 実際に見えている高さ（visualViewport）に合わせる。
const fitViewport = () => {
  const vv = window.visualViewport
  if (!vv || !rootEl.value) return
  rootEl.value.style.height = `${vv.height}px`
}

onMounted(() => {
  // 書きかけがあれば戻す（閉じてしまっても書いたものが消えないように）
  text.value = readDraft()
  inputEl.value?.focus()
  fitViewport()
  window.visualViewport?.addEventListener('resize', fitViewport)
})

onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', fitViewport)
  if (markTimer) clearTimeout(markTimer)
})

watch(text, (v) => saveDraft(v))

const save = () => {
  if (!canSave.value) return
  if (!add(text.value)) return
  text.value = ''
  saveDraft('')
  justSaved.value = true
  if (markTimer) clearTimeout(markTimer)
  markTimer = setTimeout(() => {
    justSaved.value = false
  }, 1900)
  inputEl.value?.focus()
}

const onKeydown = (e: KeyboardEvent) => {
  // Enter は改行のまま（書いている途中で保存されない）。確定は ⌘/Ctrl + Enter。
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    save()
  }
}
</script>
