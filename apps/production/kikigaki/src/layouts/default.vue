<template>
  <div class="min-h-[100dvh] flex flex-col">
    <!-- モニター期間のお知らせ。常時表示。文言と時期は src/config/service.ts で変える -->
    <p v-if="monitorMode" class="m-0 px-4 py-3 text-center text-[15px] leading-relaxed bg-[var(--kk-accent-soft)] text-[var(--kk-accent-strong)]">
      {{ monitorText }}
    </p>

    <header class="px-4 sm:px-6 pt-5 pb-1">
      <NuxtLink to="/" class="inline-flex items-baseline gap-2 no-underline text-[var(--kk-ink)]">
        <span class="kk-h2">{{ serviceName }}</span>
        <span class="kk-note">会議の録音から議事録を</span>
      </NuxtLink>
    </header>

    <main class="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-6 pt-4 pb-16">
      <slot />
    </main>

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
</script>
