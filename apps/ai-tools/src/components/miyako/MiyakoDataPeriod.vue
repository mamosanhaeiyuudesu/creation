<script setup lang="ts">
/**
 * 「どの期間の議事録を使っているか」の小さな注記。ページごとに表記がずれないようここに集約する。
 *   static: 全体像・議員で見る（pairs.json / speakers_meta.json / tfidf_*.csv）。最初の前処理で作った静的データで、
 *           中身から期間を確かめた（2007年に廃止された「助役」、2023年以降の「宿泊税」、第6期＝2025年〜の議員を含む）。
 *           以後は作り直していないので、新しい会議録は入らない
 *   live:   キーワードで見る。Vector Store を AI がその場で検索するので、miyako-trends の cron が
 *           毎月取り込む新しい会議録も対象になる
 */
const props = defineProps<{
  kind: 'static' | 'live'
}>()

const TEXT = {
  static: {
    label: '対象：2005〜2025年の議事録',
    title: '平成17年（2005年）11月〜令和7年（2025年）12月の会議録から作ったデータです。新しい会議録は「直近の傾向」に毎月反映されます',
  },
  live: {
    label: '対象：2005年〜最新の議事録（毎月更新）',
    title: '平成17年（2005年）11月以降、市のサイトで公開済みの会議録をAIが検索します。新しい会議録は毎月1日に取り込みます',
  },
} as const

const text = computed(() => TEXT[props.kind])
</script>

<template>
  <span class="data-period" :title="text.title">
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-70"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    {{ text.label }}
  </span>
</template>

<style scoped>
.data-period {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6878a8;
  white-space: nowrap;
  cursor: help;
}
</style>
