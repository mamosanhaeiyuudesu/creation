<template>
  <div class="min-h-full px-4 sm:px-8 py-10 sm:py-14">
    <div class="max-w-[1100px] mx-auto">
      <header class="mb-10 sm:mb-14">
        <h1 class="m-0 text-[clamp(28px,6vw,44px)] font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p class="mt-2 mb-0 text-slate-400 text-sm sm:text-base">
          これまでに作ったツールの一覧です。全 {{ toolCount }} 種。
        </p>
      </header>

      <section v-if="frequentTools.length" class="mb-12 sm:mb-16">
        <div class="flex items-baseline gap-3 mb-4 pb-3 border-b border-white/[0.08]">
          <h2 class="m-0 text-lg sm:text-xl font-bold text-violet-300">よく使う</h2>
          <p class="m-0 text-xs sm:text-sm text-slate-500">この端末で開いた回数の多い順</p>
          <button
            type="button"
            class="ml-auto flex-shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-0 cursor-pointer p-0"
            @click="resetUsage"
          >
            リセット
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <NuxtLink
            v-for="{ tool, count } in frequentTools"
            :key="tool.path"
            :to="tool.path"
            class="group no-underline rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4 flex flex-col items-center text-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-400/[0.1] hover:border-violet-400/40 hover:shadow-[0_0_24px_rgba(167,139,250,0.14)]"
          >
            <div class="text-3xl leading-none emoji">{{ tool.icon }}</div>
            <h3 class="m-0 text-sm font-bold text-slate-100 group-hover:text-violet-200 transition-colors truncate max-w-full">
              {{ tool.name }}
            </h3>
            <span class="text-[11px] text-violet-300/70 tabular-nums">{{ count }}回</span>
          </NuxtLink>
        </div>
      </section>

      <section v-for="section in sections" :key="section.title" class="mb-12 sm:mb-16 last:mb-0">
        <div class="flex items-baseline gap-3 mb-4 pb-3 border-b border-white/[0.08]">
          <h2 :class="['m-0 text-lg sm:text-xl font-bold', accents[section.accent].heading]">
            {{ section.title }}
          </h2>
          <p class="m-0 text-xs sm:text-sm text-slate-500">{{ section.lead }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="tool in section.tools"
            :key="tool.path"
            :to="tool.path"
            :class="[
              'group no-underline rounded-2xl border p-5 flex gap-4 transition-all duration-200 hover:-translate-y-0.5',
              section.accent === 'slate'
                ? 'bg-white/[0.02] border-white/[0.05] opacity-70 hover:opacity-100'
                : 'bg-white/[0.04] border-white/[0.08]',
              accents[section.accent].card,
            ]"
          >
            <div class="text-3xl leading-none flex-shrink-0 emoji">{{ tool.icon }}</div>
            <div class="min-w-0">
              <h3 :class="['m-0 text-base font-bold text-slate-100 transition-colors', accents[section.accent].name]">
                {{ tool.name }}
              </h3>
              <p class="m-0 mt-1 text-[13px] leading-relaxed text-slate-400">{{ tool.desc }}</p>
              <div v-if="tool.tags?.length" class="flex flex-wrap gap-1.5 mt-2.5">
                <span
                  v-for="tag in tool.tags"
                  :key="tag"
                  :class="['text-[11px] px-2 py-0.5 rounded-full border', accents[section.accent].tag]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <footer class="mt-14 pt-6 border-t border-white/[0.08]">
        <NuxtLink to="/privacy" class="text-xs sm:text-sm text-slate-500 hover:text-slate-300 transition-colors">
          プライバシーポリシー
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SECTIONS, type Accent } from '~/utils/tools'
import { useToolUsage } from '~/composables/useToolUsage'

// Tailwind は動的に組み立てた文字列を検出できないので、クラスは完全な形で持つ
const accents: Record<Accent, { heading: string; card: string; name: string; tag: string }> = {
  sky: {
    heading: 'text-sky-300',
    card: 'hover:bg-white/[0.07] hover:border-sky-400/40 hover:shadow-[0_0_24px_rgba(56,189,248,0.12)]',
    name: 'group-hover:text-sky-300',
    tag: 'text-sky-300/80 bg-sky-400/[0.08] border-sky-400/20',
  },
  amber: {
    heading: 'text-amber-300',
    card: 'hover:bg-white/[0.07] hover:border-amber-400/40 hover:shadow-[0_0_24px_rgba(251,191,36,0.12)]',
    name: 'group-hover:text-amber-300',
    tag: 'text-amber-300/80 bg-amber-400/[0.08] border-amber-400/20',
  },
  emerald: {
    heading: 'text-emerald-300',
    card: 'hover:bg-white/[0.07] hover:border-emerald-400/40 hover:shadow-[0_0_24px_rgba(52,211,153,0.12)]',
    name: 'group-hover:text-emerald-300',
    tag: 'text-emerald-300/80 bg-emerald-400/[0.08] border-emerald-400/20',
  },
  slate: {
    heading: 'text-slate-400',
    card: 'hover:bg-white/[0.05] hover:border-white/20',
    name: 'group-hover:text-slate-200',
    tag: 'text-slate-500 bg-white/[0.03] border-white/10',
  },
}

const sections = SECTIONS

// 「よく使う」は端末内の記録なので、SSR では空。onMounted で埋まる。
const { frequentTools, resetUsage } = useToolUsage()

const toolCount = computed(() => sections.reduce((sum, s) => sum + s.tools.length, 0))

useHead({
  title: 'AI Tools',
  meta: [{ name: 'description', content: 'これまでに作ったAIツールの一覧' }],
})
</script>

<style scoped>
.emoji {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}
</style>
