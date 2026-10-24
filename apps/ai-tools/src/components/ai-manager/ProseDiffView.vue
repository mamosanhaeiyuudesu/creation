<template>
  <div class="am-prose am-prose-diff">
    <template v-for="(r, n) in rows" :key="n">
      <div v-if="r.kind === 'skip'" class="am-prose-skip">… {{ r.count }}行 同じ …</div>
      <div v-else-if="r.kind === 'same'" class="am-prose-same">{{ r.text || ' ' }}</div>
      <div v-else class="am-prose-changed" :class="lineClass(r)"><span v-for="(p, m) in r.parts" :key="m" :class="partClass(p.type, r)">{{ p.text }}</span></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { InlinePart, ProseRow } from '~/utils/ai-manager-diff'

// AI管理のプロンプトの差分。変わった行の中の、変わった文字だけに色を付ける
defineProps<{ rows: ProseRow[] }>()

/** 行ごと足した／消した行は行全体に色を付ける（文字ごとの色は付けない） */
function lineClass(r: ProseRow) {
  if (r.parts?.length === 1 && r.parts[0]!.type === 'add') return 'is-added'
  if (r.parts?.length === 1 && r.parts[0]!.type === 'del') return 'is-removed'
  return ''
}
function partClass(type: InlinePart['type'], r: ProseRow) {
  if (lineClass(r)) return ''
  return type === 'add' ? 'am-ins-add' : type === 'del' ? 'am-ins-del' : ''
}
</script>
