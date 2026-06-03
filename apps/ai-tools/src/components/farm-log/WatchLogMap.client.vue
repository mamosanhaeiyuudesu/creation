<script setup lang="ts">
import type { WatchTrackPoint } from '~/types/farm-log'

const props = defineProps<{
  track: WatchTrackPoint[]
  boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  highlightT: number | null
}>()

const mapEl = ref<HTMLDivElement>()
let map: import('leaflet').Map | null = null
let highlightMarker: import('leaflet').CircleMarker | null = null

// 活動タイプ別カラー
const ACT_COLOR: Record<string, string> = {
  stationary: '#f59e0b',  // 琥珀（定点作業）
  walking:    '#059669',  // 緑（歩行）
  cycling:    '#3b82f6',  // 青（農機・車）
  unknown:    '#94a3b8',  // グレー
}

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
  ],
})

onMounted(async () => {
  if (!mapEl.value || props.track.length === 0) return
  const L = await import('leaflet')

  map = L.map(mapEl.value, { zoomControl: true, attributionControl: true })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  // ① ヒートマップ的な表現: 各トラック点を半透明ドットで描画（重なりが密度感を表す）
  for (const p of props.track) {
    const color = ACT_COLOR[p.act] ?? ACT_COLOR.unknown
    L.circleMarker([p.lat, p.lng], {
      radius: 8,
      color: 'transparent',
      fillColor: color,
      fillOpacity: 0.25,
      weight: 0,
    }).addTo(map)
  }

  // ② 活動タイプ別に色分けした軌跡ライン
  const segments: { color: string; points: [number, number][] }[] = []
  let current = { act: props.track[0].act, points: [[props.track[0].lat, props.track[0].lng] as [number, number]] }

  for (let i = 1; i < props.track.length; i++) {
    const p = props.track[i]
    if (p.act === current.act) {
      current.points.push([p.lat, p.lng])
    } else {
      current.points.push([p.lat, p.lng])
      segments.push({ color: ACT_COLOR[current.act] ?? ACT_COLOR.unknown, points: current.points })
      current = { act: p.act, points: [[props.track[i - 1].lat, props.track[i - 1].lng], [p.lat, p.lng]] }
    }
  }
  segments.push({ color: ACT_COLOR[current.act] ?? ACT_COLOR.unknown, points: current.points })

  for (const seg of segments) {
    L.polyline(seg.points, { color: seg.color, weight: 2.5, opacity: 0.9 }).addTo(map)
  }

  // ③ 開始・終了マーカー
  const first = props.track[0]
  const last  = props.track[props.track.length - 1]
  L.circleMarker([first.lat, first.lng], { radius: 7, color: '#fff', fillColor: '#10b981', fillOpacity: 1, weight: 2 })
    .bindTooltip('開始').addTo(map)
  L.circleMarker([last.lat, last.lng],  { radius: 7, color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 })
    .bindTooltip('終了').addTo(map)

  const { minLat, maxLat, minLng, maxLng } = props.boundingBox
  map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [28, 28] })
})

watch(() => props.highlightT, async (t) => {
  if (!map || t === null) return
  const L = await import('leaflet')
  const point = props.track.find(p => p.t === t)
  if (!point) return
  if (highlightMarker) {
    highlightMarker.setLatLng([point.lat, point.lng])
  } else {
    highlightMarker = L.circleMarker([point.lat, point.lng], {
      radius: 10, color: '#fff', fillColor: '#facc15', fillOpacity: 1, weight: 2,
    }).addTo(map!)
  }
})

onUnmounted(() => { map?.remove(); map = null })
</script>

<template>
  <div class="relative">
    <div ref="mapEl" class="w-full rounded-xl overflow-hidden" style="height: 400px;" />
    <!-- 凡例 -->
    <div class="absolute bottom-3 left-3 bg-gray-900/90 rounded-lg px-2.5 py-2 flex flex-col gap-1 text-xs z-[1000]">
      <div v-for="[act, color] in Object.entries({ stationary: '#f59e0b', walking: '#059669', cycling: '#3b82f6', unknown: '#94a3b8' })" :key="act" class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: color }" />
        <span class="text-gray-300">{{ { stationary: '定点作業', walking: '歩行', cycling: '農機/車', unknown: '不明' }[act] }}</span>
      </div>
    </div>
  </div>
</template>
