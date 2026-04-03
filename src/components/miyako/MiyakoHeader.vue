<script setup lang="ts">
defineProps<{
  activePage: 'session' | 'member'
}>()
</script>

<template>
  <header class="bg-gradient-to-br from-[#121d3e] to-[#2a3f7a] px-6 py-3.5">
    <div class="max-w-[1600px] mx-auto flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-4 flex-shrink-0">
        <h1 class="m-0 text-[clamp(15px,2vw,19px)] font-bold text-white tracking-[0.03em] whitespace-nowrap">
          宮古島市議会バズワード
        </h1>
        <div class="flex rounded overflow-hidden border border-white/20">
          <NuxtLink
            v-if="activePage !== 'session'"
            to="/miyako"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/20 whitespace-nowrap transition-colors"
          >年で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap"
          >年で見る</span>

          <NuxtLink
            v-if="activePage !== 'member'"
            to="/miyako/member"
            class="px-3 py-1 text-[12px] font-medium bg-white/10 text-white/70 hover:bg-white/20 whitespace-nowrap transition-colors"
          >議員で見る</NuxtLink>
          <span
            v-else
            class="px-3 py-1 text-[12px] font-semibold bg-[#a5b4fc] text-[#121d3e] whitespace-nowrap"
          >議員で見る</span>
        </div>
      </div>

      <!-- 各ページ固有のコントロール -->
      <div class="flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto">
        <slot />
      </div>
    </div>
  </header>
</template>
