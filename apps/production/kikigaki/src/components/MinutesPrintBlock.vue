<template>
  <!-- PDFのページに並べる最小の単位（MinutesPdfMaker だけが使う）。data-block は高さの計測の目印 -->
  <div v-if="block.type === 'header'" data-block class="kk-print-header">
    <span class="kk-print-date">{{ info.dateLabel }}</span>
    <span>〈{{ info.title }}〉</span>
    <span v-if="info.people" class="kk-print-participants">{{ info.peopleLabel }}: {{ info.people }}</span>
  </div>
  <p
    v-else-if="block.type === 'heading'"
    data-block
    :class="block.sub ? 'kk-print-subheading' : 'kk-print-heading'"
  >{{ block.text }}</p>
  <p v-else-if="block.type === 'para'" data-block class="kk-print-body" :class="{ 'kk-print-body--lead': block.text.startsWith('【') }">{{ block.text }}</p>
  <div v-else-if="block.type === 'item'" data-block class="kk-print-item">
    {{ block.n }}. {{ block.main }}
    <span v-if="block.note" class="kk-print-item-note">{{ block.note }}</span>
  </div>
  <p v-else data-block class="kk-print-empty">（なし）</p>
</template>

<script setup lang="ts">
import type { PrintBlock } from '~/utils/printLines'

defineProps<{
  block: PrintBlock
  /** header ブロックに出す名前・日・参加者 */
  info: { dateLabel: string; title: string; peopleLabel: string; people: string }
}>()
</script>
