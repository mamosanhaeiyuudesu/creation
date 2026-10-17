<script setup lang="ts">
type MiyakoPage = 'trend' | 'network' | 'session' | 'member' | 'keyword'

const props = defineProps<{
  activePage: MiyakoPage
}>()

const route = useRoute()
const base = computed(() => {
  if (route.path.startsWith('/miyako_gijiroku')) return '/miyako_gijiroku'
  if (route.path.startsWith('/miyako')) return '/miyako'
  return '/miyako'
})

// 全体像（ネットワーク図）はスマホでは開けない（network.vue が年で見るへ飛ばす）のでスマホのタブには出さない。
// タブが5つになり、1279px以下ではタブを詰めて短い表記（mobileLabel）にしないと右端がはみ出す（実測: 1024pxでもはみ出した）
const tabs = computed(() => [
  { page: 'trend' as const, label: '直近の傾向', mobileLabel: '直近の傾向', to: base.value },
  { page: 'network' as const, label: '全体像で見る', mobileLabel: '', to: `${base.value}/network` },
  { page: 'keyword' as const, label: 'キーワードで見る', mobileLabel: 'キーワード', to: `${base.value}/keyword` },
  { page: 'session' as const, label: '年で見る', mobileLabel: '年で見る', to: `${base.value}/yearly` },
  { page: 'member' as const, label: '議員で見る', mobileLabel: '議員で見る', to: `${base.value}/member` },
])
const mobileTabs = computed(() => tabs.value.filter(t => t.mobileLabel))
const isActive = (page: MiyakoPage) => props.activePage === page
</script>

<template>
  <header class="miyako-head">
    <div class="max-w-[1600px] mx-auto px-3 md:px-4">
      <div class="flex items-center gap-3 min-h-[56px]">
        <!-- ロゴ（キキガキ本番版と同じ、青い角丸のマーク＋青い文字） -->
        <NuxtLink :to="base" class="miyako-logo">
          <span class="miyako-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 20h16" /><path d="M7 20v-7M12 20V8M17 20v-4" /><path d="M4 9l8-5 8 5" /></svg>
          </span>
          <span class="truncate">宮古島市議会・議事録データ分析</span>
        </NuxtLink>

        <!-- PC のタブ -->
        <nav class="hidden md:flex items-center gap-0.5 ml-2">
          <template v-for="tab in tabs" :key="tab.page">
            <span v-if="isActive(tab.page)" class="miyako-tab is-active" aria-current="page">
              <span class="hidden xl:inline">{{ tab.label }}</span>
              <span class="xl:hidden">{{ tab.mobileLabel || tab.label }}</span>
            </span>
            <NuxtLink v-else :to="tab.to" class="miyako-tab">
              <span class="hidden xl:inline">{{ tab.label }}</span>
              <span class="xl:hidden">{{ tab.mobileLabel || tab.label }}</span>
            </NuxtLink>
          </template>
        </nav>

        <div class="flex items-center flex-wrap gap-y-1.5 gap-x-4 ml-auto shrink-0">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSe9bfl-DXIf9VWKvbsq3WuWYC72N2PSJUMeAo83jG6UE_7YFw/viewform"
            target="_blank"
            rel="noopener noreferrer"
            class="feedback-link"
            aria-label="ご意見・お問い合わせ"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="hidden xl:inline">ご意見・お問い合わせ</span>
          </a>
          <span class="hidden md:contents"><slot /></span>
        </div>
      </div>
    </div>

    <!-- スマホのタブ（2段目） -->
    <nav class="flex md:hidden miyako-mobile-tabs">
      <template v-for="tab in mobileTabs" :key="tab.page">
        <span v-if="isActive(tab.page)" class="mobile-tab is-active" aria-current="page">{{ tab.mobileLabel }}</span>
        <NuxtLink v-else :to="tab.to" class="mobile-tab">{{ tab.mobileLabel }}</NuxtLink>
      </template>
    </nav>
  </header>
</template>

<style scoped>
/* キキガキ本番版のヘッダー（白い帯＋細い罫線）に合わせている */
.miyako-head {
  background: #fff;
  border-bottom: 1px solid #dbe4ef;
}

.miyako-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-size: clamp(14px, 1.6vw, 17px);
  font-weight: 700;
  color: #1d6fd6;
  text-decoration: none;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.miyako-logo-mark {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  background: #1d6fd6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.miyako-logo-mark svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* タブはキキガキの左メニューの項目と同じ見た目（選択中は薄い青の面＋太字） */
.miyako-tab {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  font-size: 14px;
  color: #4b5868;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s, color 0.15s;
}
.miyako-tab:hover {
  background: #f1f6fc;
  color: #1f2a37;
}
.miyako-tab.is-active {
  background: #e6f0fb;
  color: #134c9c;
  font-weight: 700;
  cursor: default;
}

@media (max-width: 1279px) {
  .miyako-tab {
    padding: 0.4rem 0.55rem;
    font-size: 13.5px;
  }
}

.miyako-mobile-tabs {
  border-top: 1px solid #dbe4ef;
}
.mobile-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  font-size: 13.5px;
  color: #4b5868;
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.mobile-tab.is-active {
  color: #134c9c;
  font-weight: 700;
  border-bottom-color: #1d6fd6;
}

/* キキガキの脇役ボタン（.kk-btn-sub）と同じ */
.feedback-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 700;
  color: #1f2a37;
  background: #fff;
  border: 1px solid #b9c8da;
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.feedback-link:hover {
  color: #134c9c;
  border-color: #1d6fd6;
  background: #e6f0fb;
}
</style>
