<template>
  <div class="flex flex-col h-screen">
    <!-- PC header -->
    <header class="hidden lg:block border-b border-white/[0.08] px-8">
      <nav class="flex max-w-[1200px] mx-auto">
        <NuxtLink
          v-for="tool in tools"
          :key="tool.path"
          :to="tool.path"
          :class="[
            'flex items-center gap-2 px-6 py-5 no-underline text-sm font-medium border-b-2 transition-all duration-200',
            isActive(tool.path)
              ? 'text-sky-400 border-sky-400'
              : 'text-slate-400 border-transparent hover:text-slate-50 hover:border-white/10'
          ]"
        >
          <span class="text-[18px]">{{ tool.icon }}</span>
          <span>{{ tool.name }}</span>
        </NuxtLink>
      </nav>
    </header>

    <!-- Mobile header -->
    <header class="lg:hidden flex items-center gap-4 px-4 py-4 border-b border-white/[0.08] relative z-50">
      <button
        class="flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1 text-slate-50"
        :aria-label="isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <span class="block w-6 h-[2px] bg-current rounded-sm transition-all duration-300" />
        <span class="block w-6 h-[2px] bg-current rounded-sm transition-all duration-300" />
        <span class="block w-6 h-[2px] bg-current rounded-sm transition-all duration-300" />
      </button>
      <h1 class="m-0 text-xl font-semibold flex-1 bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
        AI Tools
      </h1>
    </header>

    <!-- Mobile menu -->
    <nav
      v-if="isMobileMenuOpen"
      class="fixed top-[61px] inset-x-0 bottom-0 bg-black/50 flex z-[200] animate-[fadeIn_0.2s_ease]"
      @click="isMobileMenuOpen = false"
    >
      <div
        class="bg-[#0f172a] border-r border-white/[0.08] py-4 max-w-[250px] w-full flex flex-col animate-[slideIn_0.2s_ease]"
        @click.stop
      >
        <NuxtLink
          v-for="tool in tools"
          :key="tool.path"
          :to="tool.path"
          class="flex items-center gap-4 px-6 py-4 no-underline text-slate-400 border-l-[3px] border-transparent text-base font-medium transition-all duration-200 hover:text-slate-50 hover:bg-white/[0.04] hover:border-sky-400 [&.router-link-active]:text-sky-400 [&.router-link-active]:border-sky-400 [&.router-link-active]:bg-sky-400/10"
          @click="isMobileMenuOpen = false"
        >
          <span class="text-xl flex-shrink-0">{{ tool.icon }}</span>
          <span>{{ tool.name }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Main -->
    <div class="flex flex-1 relative min-w-0">
      <main class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMobileMenuOpen = ref(false)

const tools = [
  { path: '/', name: 'ホーム', icon: '🏠' },
  { path: '/snapreader', name: 'SnapReader', icon: '📸' },
  { path: '/whisper', name: 'Whisper', icon: '🎙️' },
  { path: '/hagemashi', name: 'はげまし', icon: '💪' },
  { path: '/task', name: 'タスクくん', icon: '📋' },
]

const isActive = (path: string): boolean => route.path === path
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
</style>
