<script setup lang="ts">
defineProps<{
  activePage: 'session' | 'member' | 'keyword'
}>()

const route = useRoute()
const base = computed(() =>
  route.path.startsWith('/miyako_gijiroku') ? '/miyako_gijiroku' : '/miyako'
)
</script>

<template>
  <header class="bg-gradient-to-br from-[#121d3e] to-[#2a3f7a] px-4 py-3">
    <div class="max-w-[1600px] mx-auto">
      <!-- 1段目: タイトル（PCは同行にタブも並ぶ） -->
      <div class="flex items-center md:gap-4">
        <h1 class="m-0 text-[clamp(13px,2vw,19px)] font-bold text-white tracking-[0.03em] whitespace-nowrap">
          宮古島市議会バズワード
        </h1>
        <!-- タブ（PCのみ同行） -->
        <div class="hidden md:flex rounded overflow-hidden border border-white/50 ml-4">
          <NuxtLink
            v-if="activePage !== 'session'"
            :to="base"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors"
          >年で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap"
          >年で見る</span>

          <NuxtLink
            v-if="activePage !== 'member'"
            :to="`${base}/member`"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors border-l border-white/50"
          >議員で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap border-l border-white/50"
          >議員で見る</span>

          <NuxtLink
            v-if="activePage !== 'keyword'"
            :to="`${base}/keyword`"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors border-l border-white/50"
          >キーワードで見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap border-l border-white/50"
          >キーワードで見る</span>
        </div>
        <!-- ページ固有コントロール（PCのみ同行・右寄せ） -->
        <div class="hidden md:flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto">
          <slot />
        </div>
      </div>

      <!-- 2段目: タブ（スマホのみ） -->
      <div class="flex md:hidden mt-2">
        <div class="flex rounded overflow-hidden border border-white/50">
          <NuxtLink
            v-if="activePage !== 'session'"
            :to="base"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors"
          >年で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap"
          >年で見る</span>

          <NuxtLink
            v-if="activePage !== 'member'"
            :to="`${base}/member`"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors border-l border-white/50"
          >議員で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap border-l border-white/50"
          >議員で見る</span>

          <NuxtLink
            v-if="activePage !== 'keyword'"
            :to="`${base}/keyword`"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/25 whitespace-nowrap transition-colors border-l border-white/50"
          >キーワードで見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap border-l border-white/50"
          >キーワードで見る</span>
        </div>
      </div>
    </div>
  </header>
</template>
