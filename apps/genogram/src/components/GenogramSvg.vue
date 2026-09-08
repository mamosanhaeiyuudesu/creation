<template>
  <svg
    ref="svgEl"
    class="genogram-svg"
    :viewBox="layout.viewBox"
    :width="layout.width"
    :height="layout.height"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 子への接続線(バスライン) -->
    <g class="genogram-buslines">
      <template v-for="cc in layout.childConnectors" :key="`bus-${cc.unionIndex}`">
        <line :x1="cc.dropX" :y1="cc.dropTopY" :x2="cc.dropX" :y2="cc.busY" class="genogram-busline" />
        <line
          v-if="cc.children.length > 1"
          :x1="cc.busX1"
          :y1="cc.busY"
          :x2="cc.busX2"
          :y2="cc.busY"
          class="genogram-busline"
        />
        <line
          v-for="child in cc.children"
          :key="child.id"
          :x1="child.x"
          :y1="cc.busY"
          :x2="child.x"
          :y2="child.topY"
          class="genogram-busline"
        />
      </template>
    </g>

    <!-- 婚姻線 -->
    <g class="genogram-unions">
      <g v-for="ul in layout.unionLines" :key="`u-${ul.unionIndex}`">
        <polyline
          v-if="ul.union.status === 'conflict'"
          :points="zigzagPoints(ul.x1, ul.y1, ul.x2, ul.y2, 7, 5)"
          class="genogram-union-conflict"
        />
        <line
          v-else
          :x1="ul.x1"
          :y1="ul.y1"
          :x2="ul.x2"
          :y2="ul.y2"
          :class="ul.union.status === 'distant' ? 'genogram-union-distant' : 'genogram-union-plain'"
        />
        <template v-if="ul.union.status === 'divorced'">
          <line v-for="(t, i) in [-6, 6]" :key="i" v-bind="unionTick(ul, t)" class="genogram-union-tick" />
        </template>
        <template v-else-if="ul.union.status === 'separated'">
          <line v-bind="unionTick(ul, 0)" class="genogram-union-tick" />
        </template>
      </g>
    </g>

    <!-- 感情関係線 -->
    <g class="genogram-relations">
      <g v-for="rl in layout.relationLines" :key="`r-${rl.index}`">
        <polyline
          v-if="rl.relation.type === 'conflict'"
          :points="zigzagPoints(rl.x1, rl.y1, rl.x2, rl.y2, 8, 4)"
          class="genogram-relation-conflict"
        />
        <path
          v-else-if="rl.relation.type === 'enmeshed'"
          :d="wavePath(rl.x1, rl.y1, rl.x2, rl.y2, 8, 5)"
          class="genogram-relation-enmeshed"
        />
        <template v-else-if="rl.relation.type === 'cutoff'">
          <line :x1="rl.x1" :y1="rl.y1" :x2="rl.x2" :y2="rl.y2" class="genogram-relation-cutoff" />
          <line v-bind="relationTick(rl, 1 / 3)" class="genogram-relation-cutoff-tick" />
          <line v-bind="relationTick(rl, 2 / 3)" class="genogram-relation-cutoff-tick" />
        </template>
        <line
          v-else
          :x1="rl.x1"
          :y1="rl.y1"
          :x2="rl.x2"
          :y2="rl.y2"
          :class="rl.relation.type === 'close' ? 'genogram-relation-close' : 'genogram-relation-distant'"
        />

        <g v-if="rl.relation.label">
          <rect
            :x="rl.labelX - labelHalfWidth(rl.relation.label)"
            :y="rl.labelY - 9"
            :width="labelHalfWidth(rl.relation.label) * 2"
            height="14"
            class="genogram-relation-label-bg"
          />
          <text :x="rl.labelX" :y="rl.labelY + 1" class="genogram-relation-label">{{ rl.relation.label }}</text>
        </g>
      </g>
    </g>

    <!-- 人物ノード -->
    <g v-for="node in layout.nodes" :key="node.person.id" class="genogram-node">
      <template v-if="node.person.isSelf">
        <rect
          v-if="node.person.gender === 'M'"
          :x="node.x - node.size / 2 - 6"
          :y="node.y - node.size / 2 - 6"
          :width="node.size + 12"
          :height="node.size + 12"
          class="genogram-self-frame"
        />
        <circle
          v-else-if="node.person.gender === 'F'"
          :cx="node.x"
          :cy="node.y"
          :r="node.size / 2 + 6"
          class="genogram-self-frame"
        />
        <polygon v-else :points="diamondPoints(node.x, node.y, node.size + 12)" class="genogram-self-frame" />
      </template>

      <rect
        v-if="node.person.gender === 'M'"
        :x="node.x - node.size / 2"
        :y="node.y - node.size / 2"
        :width="node.size"
        :height="node.size"
        class="genogram-shape"
      />
      <circle
        v-else-if="node.person.gender === 'F'"
        :cx="node.x"
        :cy="node.y"
        :r="node.size / 2"
        class="genogram-shape"
      />
      <polygon v-else :points="diamondPoints(node.x, node.y, node.size)" class="genogram-shape" />

      <template v-if="node.person.deceased">
        <line
          :x1="node.x - deceasedInset"
          :y1="node.y - deceasedInset"
          :x2="node.x + deceasedInset"
          :y2="node.y + deceasedInset"
          class="genogram-deceased-mark"
        />
        <line
          :x1="node.x - deceasedInset"
          :y1="node.y + deceasedInset"
          :x2="node.x + deceasedInset"
          :y2="node.y - deceasedInset"
          class="genogram-deceased-mark"
        />
      </template>

      <text :x="node.x" :y="nameY(node)" class="genogram-name-text">{{ node.person.name }}</text>
      <text v-if="node.person.note" :x="node.x" :y="nameY(node) + 13" class="genogram-note-text">{{ node.person.note }}</text>
    </g>

    <!-- 凡例 -->
    <g v-if="layout.legend.length > 0" class="genogram-legend">
      <g v-for="(item, i) in layout.legend" :key="`legend-${item.kind}-${item.value}`" :transform="legendTransform(i)">
        <polyline
          v-if="item.value === 'conflict'"
          :points="zigzagPoints(0, 0, 34, 0, 6, 4)"
          :class="item.kind === 'union' ? 'genogram-union-conflict' : 'genogram-relation-conflict'"
        />
        <path v-else-if="item.value === 'enmeshed'" :d="wavePath(0, 0, 34, 0, 4, 4)" class="genogram-relation-enmeshed" />
        <template v-else-if="item.value === 'cutoff'">
          <line x1="0" y1="0" x2="34" y2="0" class="genogram-relation-cutoff" />
          <line v-bind="relationTick({ x1: 0, y1: 0, x2: 34, y2: 0 }, 1 / 3)" class="genogram-relation-cutoff-tick" />
          <line v-bind="relationTick({ x1: 0, y1: 0, x2: 34, y2: 0 }, 2 / 3)" class="genogram-relation-cutoff-tick" />
        </template>
        <template v-else-if="item.value === 'divorced'">
          <line x1="0" y1="0" x2="34" y2="0" class="genogram-union-plain" />
          <line v-for="(t, ti) in [-6, 6]" :key="ti" v-bind="unionTick({ x1: 0, y1: 0, x2: 34, y2: 0 }, t)" class="genogram-union-tick" />
        </template>
        <template v-else-if="item.value === 'separated'">
          <line x1="0" y1="0" x2="34" y2="0" class="genogram-union-plain" />
          <line v-bind="unionTick({ x1: 0, y1: 0, x2: 34, y2: 0 }, 0)" class="genogram-union-tick" />
        </template>
        <line
          v-else
          x1="0"
          y1="0"
          x2="34"
          y2="0"
          :class="legendLineClass(item)"
        />
        <text x="42" y="4" class="genogram-legend-text">{{ item.label }}</text>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GenogramData } from '~/types/genogram'
import { computeGenogramLayout, type LayoutNode, type LegendItem } from '~/composables/useGenogramLayout'
import { zigzagPoints, wavePath, diagonalTick, perpendicularTick } from '~/utils/svgLines'

const props = defineProps<{ data: GenogramData }>()

const layout = computed(() => computeGenogramLayout(props.data))
const svgEl = ref<SVGSVGElement | null>(null)

defineExpose({ layout, svgEl })

const deceasedInset = 11

function diamondPoints(cx: number, cy: number, size: number) {
  const h = size / 2
  return [
    `${cx},${cy - h}`,
    `${cx + h},${cy}`,
    `${cx},${cy + h}`,
    `${cx - h},${cy}`,
  ].join(' ')
}

function nameY(node: LayoutNode) {
  return node.y + node.size / 2 + (node.person.isSelf ? 6 : 0) + 15
}

function labelHalfWidth(label: string) {
  return Math.max(14, label.length * 5.5 + 4)
}

type LineLike = { x1: number; y1: number; x2: number; y2: number }

function unionTick(ul: LineLike, offset: number) {
  const len = Math.hypot(ul.x2 - ul.x1, ul.y2 - ul.y1)
  return diagonalTick(ul.x1, ul.y1, ul.x2, ul.y2, len / 2 + offset, 9)
}

function relationTick(rl: LineLike, ratio: number) {
  const len = Math.hypot(rl.x2 - rl.x1, rl.y2 - rl.y1)
  return perpendicularTick(rl.x1, rl.y1, rl.x2, rl.y2, len * ratio, 11)
}

function legendTransform(i: number) {
  const col = i % 2
  const row = Math.floor(i / 2)
  const colWidth = Math.max(200, layout.value.width / 2)
  const x = 40 + col * colWidth
  const y = layout.value.diagramHeight + 34 + row * 22
  return `translate(${x}, ${y})`
}

function legendLineClass(item: LegendItem) {
  if (item.kind === 'union') return 'genogram-union-plain'
  if (item.value === 'close') return 'genogram-relation-close'
  return 'genogram-relation-distant'
}
</script>

<style scoped>
.genogram-svg {
  max-width: 100%;
  height: auto;
  font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
}

.genogram-shape {
  fill: #ffffff;
  stroke: #1f2933;
  stroke-width: 2;
}

.genogram-self-frame {
  fill: none;
  stroke: #1f2933;
  stroke-width: 2;
}

.genogram-deceased-mark {
  stroke: #1f2933;
  stroke-width: 2;
}

.genogram-name-text {
  font-size: 13px;
  fill: #1f2933;
  text-anchor: middle;
}

.genogram-note-text {
  font-size: 10px;
  fill: #6b7280;
  text-anchor: middle;
}

.genogram-busline {
  stroke: #1f2933;
  stroke-width: 1.5;
}

.genogram-union-plain {
  stroke: #1f2933;
  stroke-width: 2;
}

.genogram-union-distant {
  stroke: #1f2933;
  stroke-width: 2;
  stroke-dasharray: 7 5;
}

.genogram-union-conflict {
  fill: none;
  stroke: #dc2626;
  stroke-width: 2;
}

.genogram-union-tick {
  stroke: #1f2933;
  stroke-width: 2;
}

.genogram-relation-conflict {
  fill: none;
  stroke: #dc2626;
  stroke-width: 2;
}

.genogram-relation-cutoff {
  stroke: #9ca3af;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}

.genogram-relation-cutoff-tick {
  stroke: #9ca3af;
  stroke-width: 2;
}

.genogram-relation-enmeshed {
  fill: none;
  stroke: #1f2933;
  stroke-width: 4;
}

.genogram-relation-close {
  stroke: #1f2933;
  stroke-width: 3;
}

.genogram-relation-distant {
  stroke: #9ca3af;
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.genogram-relation-label-bg {
  fill: #fafafa;
  opacity: 0.9;
}

.genogram-relation-label {
  font-size: 11px;
  fill: #374151;
  text-anchor: middle;
}

.genogram-legend-text {
  font-size: 11px;
  fill: #374151;
}

@media print {
  .genogram-svg {
    width: 100%;
  }
}
</style>
