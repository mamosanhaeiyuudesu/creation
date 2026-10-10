<template>
  <div class="min-h-[100dvh] flex flex-col" :class="{ 'kk-wide-root': wide }">
    <!-- モニター期間のお知らせ。常時表示。文言と時期は src/config/service.ts で変える -->
    <p v-if="monitorMode" class="m-0 px-4 py-3 text-center text-[15px] leading-relaxed bg-[var(--kk-accent-soft)] text-[var(--kk-accent-strong)]">
      {{ monitorText }}
    </p>

    <header class="px-4 sm:px-6 pt-5 pb-1 flex items-center justify-between gap-2">
      <NuxtLink to="/" class="inline-flex items-baseline gap-2 no-underline text-[var(--kk-ink)] min-w-0">
        <span class="kk-h2 truncate">{{ serviceName }}</span>
        <span class="kk-note truncate">会議の録音から議事録を</span>
      </NuxtLink>
      <!-- 設定は一覧の下ではなく常に見える右上へ（他ツール＝ai-tools側kikigaki/whisper等の
           「⚙→設定」配置に合わせている）。ログイン前は設定自体が無いので出さない -->
      <button v-if="isLoggedIn" type="button" aria-label="設定" class="kk-settings-btn shrink-0" @click="settingsOpen = true">⚙</button>
    </header>

    <main
      class="flex-1 w-full mx-auto px-4 sm:px-6 pt-4"
      :class="wide ? 'kk-wide-main max-w-[1280px] pb-4' : 'max-w-[720px] pb-16'"
    >
      <slot />
    </main>

    <SettingsSheet v-if="isLoggedIn" v-model="settingsOpen" />

    <footer class="border-t border-[var(--kk-line)] px-4 sm:px-6 py-6">
      <nav class="max-w-[720px] mx-auto flex flex-wrap gap-x-5 gap-y-2">
        <NuxtLink to="/terms" class="kk-note underline">利用規約</NuxtLink>
        <NuxtLink to="/privacy" class="kk-note underline">プライバシーポリシー</NuxtLink>
        <NuxtLink to="/legal" class="kk-note underline">特定商取引法に基づく表記</NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { SERVICE, monitorNotice } from '~/config/service'
import { parseMonitorMode } from '~/utils/entitlement'

const config = useRuntimeConfig().public
// 環境変数は文字列で来るので "false" を取りこぼさないようにする
// （NUXT_PUBLIC_MONITOR_MODE=false で有料モードに切り替わる）
const monitorMode = computed(() => parseMonitorMode(config.monitorMode))
const monitorText = monitorNotice()
const serviceName = SERVICE.name
const { isLoggedIn } = useAuth()
const route = useRoute()
const settingsOpen = useState<boolean>('kk-settings-open', () => false)
// ページが definePageMeta({ wide: true }) したときは、横幅を広げ、広い画面では高さを画面に収める
const wide = computed(() => route.meta.wide === true)
</script>

<style scoped>
@media (min-width: 1024px) {
  .kk-wide-root {
    height: 100dvh;
  }
  .kk-wide-main {
    min-height: 0;
    overflow: hidden;
  }
  .kk-wide-root footer {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
</style>
