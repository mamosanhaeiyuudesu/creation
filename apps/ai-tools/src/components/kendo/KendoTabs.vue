<template>
  <nav class="w-full max-w-5xl grid grid-cols-3 gap-2 mb-4" aria-label="剣道ゲームのレベル">
    <NuxtLink
      v-for="tab in KENDO_TABS"
      :key="tab.path"
      :to="tab.path"
      :aria-current="route.path === tab.path ? 'page' : undefined"
      :class="[
        'no-underline rounded-xl border px-3 py-2 flex flex-col items-center gap-0.5 transition-colors',
        route.path === tab.path
          ? 'border-emerald-400 bg-emerald-400/15'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]',
      ]"
    >
      <span :class="['text-sm sm:text-base font-bold', route.path === tab.path ? 'text-emerald-300' : 'text-slate-300']">
        {{ tab.icon }} {{ tab.target }}
      </span>
      <span class="text-[11px] text-slate-500">{{ tab.name }}・{{ tab.lead }}</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
// 剣道ゲームの3つの弾を切り替えるタブ（対象年齢で呼び分ける）。弾ごとに別ページなので、タブ＝ページへのリンク。
import { useRoute } from 'vue-router'

const route = useRoute()

const KENDO_TABS = [
  { path: '/games/kendo0', icon: '🌱', target: 'ようちえん', name: '第0弾', lead: 'ボタン1つ・光ったら打つ' },
  { path: '/games/kendo', icon: '🎒', target: '小学生（低学年）', name: '第1弾', lead: '間合い・面／小手／胴' },
  { path: '/games/kendo2', icon: '🛡️', target: '小学生（高学年）', name: '第2弾', lead: '防御・返し技・突き' },
] as const
</script>
