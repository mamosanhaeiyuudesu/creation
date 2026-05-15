<script setup lang="ts">
defineProps<{
  activePage: 'session' | 'member' | 'keyword' | 'network'
}>()

const route = useRoute()
const base = computed(() => {
  if (route.path.startsWith('/miyako_gijiroku')) return '/miyako_gijiroku'
  if (route.path.startsWith('/miyako')) return '/miyako'
  return '/miyako'
})
</script>

<template>
  <header class="bg-gradient-to-r from-[#0d1728] via-[#121d3e] to-[#1a2a52] border-b border-[#3d5fc4]/25 relative overflow-hidden" style="box-shadow: 0 1px 0 rgba(61,95,196,0.18), inset 0 -1px 0 rgba(61,95,196,0.12)">
    <!-- Subtle horizontal scan-line texture -->
    <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(165,180,252,0.018) 2px, rgba(165,180,252,0.018) 3px)" />

    <div class="max-w-[1600px] mx-auto relative px-4">
      <!-- Desktop: single row -->
      <div class="flex items-stretch min-h-[69px]">
        <!-- Title block -->
        <div class="flex items-center gap-3 pr-5 border-r border-white/[0.07] shrink-0 py-2">
          <div class="flex flex-col gap-[2px]">
            <span class="font-mono text-[11px] tracking-[0.22em] text-[#a5b4fc]/45 uppercase leading-none hidden sm:block">Miyakojima · Council Data</span>
            <h1 class="m-0 text-[clamp(15px,2.1vw,20px)] font-bold text-white tracking-[0.04em] leading-tight whitespace-nowrap">
              宮古島市議会・議事録データ分析
            </h1>
          </div>
        </div>

        <!-- Desktop tabs (underline style) -->
        <div class="hidden md:flex items-stretch ml-1">
          <NuxtLink
            v-if="activePage !== 'network'"
            :to="base"
            class="tab-inactive group"
          >
            <span>全体像を見る</span>
            <span class="tab-bar group-hover:opacity-50" />
          </NuxtLink>
          <span v-else class="tab-active">
            <span>全体像を見る</span>
            <span class="tab-bar opacity-100" />
          </span>

          <NuxtLink
            v-if="activePage !== 'session'"
            :to="`${base}/yearly`"
            class="tab-inactive group border-l border-white/[0.06]"
          >
            <span>年で見る</span>
            <span class="tab-bar group-hover:opacity-50" />
          </NuxtLink>
          <span v-else class="tab-active border-l border-white/[0.06]">
            <span>年で見る</span>
            <span class="tab-bar opacity-100" />
          </span>

          <NuxtLink
            v-if="activePage !== 'member'"
            :to="`${base}/member`"
            class="tab-inactive group border-l border-white/[0.06]"
          >
            <span>議員で見る</span>
            <span class="tab-bar group-hover:opacity-50" />
          </NuxtLink>
          <span v-else class="tab-active border-l border-white/[0.06]">
            <span>議員で見る</span>
            <span class="tab-bar opacity-100" />
          </span>

          <NuxtLink
            v-if="activePage !== 'keyword'"
            :to="`${base}/keyword`"
            class="tab-inactive group border-l border-white/[0.06]"
          >
            <span>キーワードで見る</span>
            <span class="tab-bar group-hover:opacity-50" />
          </NuxtLink>
          <span v-else class="tab-active border-l border-white/[0.06]">
            <span>キーワードで見る</span>
            <span class="tab-bar opacity-100" />
          </span>
        </div>

        <!-- Mobile: feedback icon only -->
        <div class="flex md:hidden items-center ml-auto pr-1">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSe9bfl-DXIf9VWKvbsq3WuWYC72N2PSJUMeAo83jG6UE_7YFw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            class="feedback-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </a>
        </div>

        <!-- Right slot -->
        <div class="hidden md:flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSe9bfl-DXIf9VWKvbsq3WuWYC72N2PSJUMeAo83jG6UE_7YFw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            class="feedback-link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ご意見・お問い合わせ
          </a>
          <slot />
        </div>
      </div>

      <!-- Mobile tabs (second row) -->
      <div class="flex md:hidden border-t border-white/[0.07]">
        <NuxtLink
          v-if="activePage !== 'session'"
          :to="`${base}/yearly`"
          class="mobile-tab"
        >年で見る</NuxtLink>
        <span v-else class="mobile-tab mobile-tab-active">年で見る</span>

        <NuxtLink
          v-if="activePage !== 'member'"
          :to="`${base}/member`"
          class="mobile-tab border-l border-white/[0.07]"
        >議員で見る</NuxtLink>
        <span v-else class="mobile-tab mobile-tab-active border-l border-white/[0.07]">議員で見る</span>

        <NuxtLink
          v-if="activePage !== 'keyword'"
          :to="`${base}/keyword`"
          class="mobile-tab border-l border-white/[0.07]"
        >キーワード</NuxtLink>
        <span v-else class="mobile-tab mobile-tab-active border-l border-white/[0.07]">キーワード</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.tab-inactive {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.48);
  text-decoration: none;
  white-space: nowrap;
  position: relative;
  transition: color 0.15s;
}
.tab-inactive:hover {
  color: rgba(255, 255, 255, 0.82);
}

.tab-active {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #a5b4fc;
  white-space: nowrap;
  position: relative;
  cursor: default;
}

.tab-bar {
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #a5b4fc;
  border-radius: 2px 2px 0 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.mobile-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 4px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.48);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s;
}
.mobile-tab-active {
  color: #a5b4fc;
  font-weight: 600;
}

.feedback-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.feedback-link:hover {
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(165, 180, 252, 0.45);
  background: rgba(165, 180, 252, 0.07);
}
</style>
