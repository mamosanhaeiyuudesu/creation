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
        <!-- 婚姻線の中点から下ろし、必要なら横に折れて中央の子の真上へ回り込んでからバスへ下りる -->
        <polyline
          :points="`${cc.startX},${cc.dropTopY} ${cc.startX},${cc.kneeY} ${cc.dropX},${cc.kneeY} ${cc.dropX},${cc.busY}`"
          class="genogram-busline"
          fill="none"
        />
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
      <g
        v-for="ul in layout.unionLines"
        :key="`u-${ul.unionIndex}`"
        class="genogram-clickable"
        @click="emit('select', { kind: 'union', union: ul.union, index: ul.unionIndex })"
      >
        <line :x1="ul.x1" :y1="ul.y1" :x2="ul.x2" :y2="ul.y2" class="genogram-hit-area" />
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
        <title v-if="unionTitle(ul.union)">{{ unionTitle(ul.union) }}</title>
      </g>
    </g>

    <!-- 感情関係線 -->
    <g class="genogram-relations">
      <g
        v-for="rl in layout.relationLines"
        :key="`r-${rl.index}`"
        class="genogram-clickable"
        @click="emit('select', { kind: 'relation', relation: rl.relation, index: rl.index })"
      >
        <line :x1="rl.x1" :y1="rl.y1" :x2="rl.x2" :y2="rl.y2" class="genogram-hit-area" />
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
        <title v-if="rl.relation.label">{{ rl.relation.label }}</title>
      </g>
    </g>

    <!-- 人物ノード -->
    <g
      v-for="node in layout.nodes"
      :key="node.person.id"
      class="genogram-node genogram-clickable"
      @click="emit('select', { kind: 'person', person: node.person })"
    >
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

      <template v-if="isDeceased(node.person)">
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

      <!-- 記号の中央: 年齢(死亡していれば享年、生存なら満年齢)とその下に(結婚年齢) -->
      <g v-if="centerAgeInfo(node)">
        <rect
          :x="node.x - node.size / 2 + 4"
          :y="node.y - centerAgeInfo(node)!.maskHeight / 2"
          :width="node.size - 8"
          :height="centerAgeInfo(node)!.maskHeight"
          class="genogram-center-age-bg"
        />
        <text v-if="centerAgeInfo(node)!.age" :x="node.x" :y="centerAgeInfo(node)!.ageY" class="genogram-center-age-text">{{ centerAgeInfo(node)!.age }}</text>
        <text v-if="centerAgeInfo(node)!.marriage" :x="node.x" :y="centerAgeInfo(node)!.marriageY" class="genogram-center-marriage-text">{{ centerAgeInfo(node)!.marriage }}</text>
      </g>

      <!-- 記号の上: 特徴の要約(20文字程度) -->
      <g v-if="characteristicBox(node)">
        <rect
          :x="characteristicBox(node)!.x"
          :y="characteristicBox(node)!.y"
          :width="characteristicBox(node)!.width"
          :height="characteristicBox(node)!.height"
          class="genogram-characteristic-bg"
        />
        <text :x="node.x" :y="characteristicBox(node)!.firstLineY" class="genogram-characteristic-text">
          <tspan v-for="(line, li) in characteristicBox(node)!.lines" :key="li" :x="node.x" :dy="li === 0 ? 0 : 12">{{ line }}</tspan>
        </text>
      </g>

      <!-- 記号の下: 名前(続柄)とその下に生涯(1920~1978)。続柄は父方/母方を付けず「徹（父）」のように名前と同じ行にまとめる -->
      <text :x="node.x" :y="nameY(node)" class="genogram-name-text">{{ displayName(node.person) }}</text>
      <text
        v-for="(line, li) in belowNameLines(node.person)"
        :key="li"
        :x="node.x"
        :y="nameY(node) + 12 * (li + 1)"
        class="genogram-note-text"
      >{{ line }}</text>

      <g v-if="node.person.healthNote" :transform="`translate(${node.x + node.size / 2 - 5}, ${node.y - node.size / 2 - 5})`">
        <circle r="7" class="genogram-health-badge-bg" />
        <text y="3" class="genogram-health-badge-text">+</text>
        <title>{{ node.person.healthNote }}</title>
      </g>
      <g v-else-if="!hasEnrichedInfo(node.person)" :transform="`translate(${node.x + node.size / 2 - 3}, ${node.y + node.size / 2 - 3})`">
        <circle r="7" class="genogram-nudge-badge" />
        <text y="3" class="genogram-nudge-badge-text">+</text>
        <title>生年・職業・健康情報などを追加できます</title>
      </g>
    </g>

    <!-- 凡例 -->
    <g v-if="layout.legend.length > 0" class="genogram-legend">
      <g v-for="(item, i) in layout.legend" :key="`legend-${item.kind}-${item.value}`" :transform="legendTransform(i)">
        <template v-if="item.kind === 'badge'">
          <circle cx="7" cy="0" r="7" :class="item.value === 'health' ? 'genogram-health-badge-bg' : 'genogram-nudge-badge'" />
          <text x="7" y="3" :class="item.value === 'health' ? 'genogram-health-badge-text' : 'genogram-nudge-badge-text'">+</text>
        </template>
        <polyline
          v-else-if="item.value === 'conflict'"
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
import type { GenogramData, Union } from '~/types/genogram'
import { computeGenogramLayout, type LayoutNode, type LegendItem } from '~/composables/useGenogramLayout'
import { zigzagPoints, wavePath, diagonalTick, perpendicularTick } from '~/utils/svgLines'
import {
  isDeceased,
  hasEnrichedInfo,
  formatUnionYears,
  belowNameLines,
  displayName,
  centerAgeText,
  marriageAgeText,
  characteristicLines,
  CHARACTERISTIC_LINE_HEIGHT,
  CHARACTERISTIC_GAP_ABOVE_ICON,
} from '~/utils/personDisplay'
import type { GenogramSelection } from '~/types/selection'

const props = defineProps<{ data: GenogramData }>()
const emit = defineEmits<{ select: [selection: GenogramSelection] }>()

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

/** 記号中央の年齢表示(死亡していれば享年、生存なら満年齢)とその下の(結婚年齢) */
function centerAgeInfo(node: LayoutNode) {
  const age = centerAgeText(node.person)
  const marriage = marriageAgeText(node.person, props.data.unions)
  if (!age && !marriage) return null
  const hasBoth = !!age && !!marriage
  return {
    age,
    marriage,
    ageY: node.y + (hasBoth ? -4 : 3),
    marriageY: node.y + 8,
    // 死亡×印(deceasedInset=11、22px四方)を完全に覆って見た目をすっきりさせる
    maskHeight: 24,
  }
}

/** 記号の上に置く特徴要約の位置とサイズ。行数が増えても下端(ノード直上)を固定し、上へ伸ばす */
function characteristicBox(node: LayoutNode) {
  const lines = characteristicLines(node.person)
  if (lines.length === 0) return null
  const height = CHARACTERISTIC_LINE_HEIGHT * lines.length + 1
  const bottomY = node.y - node.size / 2 - CHARACTERISTIC_GAP_ABOVE_ICON
  const y = bottomY - height
  const maxLineLen = Math.max(...lines.map((line) => line.length))
  const halfWidth = Math.max(14, maxLineLen * 4.8 + 4)
  return { x: node.x - halfWidth, y, width: halfWidth * 2, height, lines, firstLineY: y + 9 }
}

/** 婚姻線にホバーした時だけ年号を見せる(グラフには常時出さず、クリックすれば詳細パネルでも見られる) */
function unionTitle(union: Union) {
  return formatUnionYears(union)
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
  const x = 40 + col * layout.value.legendColWidth
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

.genogram-clickable {
  cursor: pointer;
}

.genogram-clickable:hover {
  opacity: 0.75;
}

.genogram-hit-area {
  stroke: transparent;
  stroke-width: 16;
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

.genogram-health-badge-bg {
  fill: #dc2626;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.genogram-health-badge-text {
  fill: #ffffff;
  font-size: 10px;
  font-weight: 700;
  text-anchor: middle;
}

.genogram-nudge-badge {
  fill: #ffffff;
  stroke: #9ca3af;
  stroke-width: 1.2;
  stroke-dasharray: 2 2;
}

.genogram-nudge-badge-text {
  fill: #9ca3af;
  font-size: 10px;
  text-anchor: middle;
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

.genogram-center-age-bg {
  fill: #ffffff;
}

.genogram-center-age-text {
  font-size: 11px;
  font-weight: 700;
  fill: #1f2933;
  text-anchor: middle;
}

.genogram-center-marriage-text {
  font-size: 9px;
  fill: #4b5563;
  text-anchor: middle;
}

.genogram-characteristic-bg {
  fill: #fafafa;
  opacity: 0.9;
}

.genogram-characteristic-text {
  font-size: 10px;
  fill: #4b5563;
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
