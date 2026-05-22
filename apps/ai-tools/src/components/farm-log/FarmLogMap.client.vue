<script setup lang="ts">
import type { GpsPoint } from '~/types/farm-log'

const props = defineProps<{
  track: GpsPoint[]
  boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  highlightT: number | null
}>()

const mapEl = ref<HTMLDivElement>()
let map: import('leaflet').Map | null = null
let highlightMarker: import('leaflet').CircleMarker | null = null

const ACTIVITY_COLORS = ['#6b7280', '#059669', '#3b82f6']

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
  ],
})

onMounted(async () => {
  if (!mapEl.value) return
  const L = await import('leaflet')

  map = L.map(mapEl.value, { zoomControl: true, attributionControl: true })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  if (props.track.length === 0) return

  // Group track into contiguous activity segments to minimize layer count
  const segments: { color: string; points: [number, number][] }[] = []
  let current = { act: props.track[0].act, points: [[props.track[0].lat, props.track[0].lng] as [number, number]] }

  for (let i = 1; i < props.track.length; i++) {
    const p = props.track[i]
    if (p.act === current.act) {
      current.points.push([p.lat, p.lng])
    } else {
      // Bridge: add first point of next segment to current to avoid gaps
      current.points.push([p.lat, p.lng])
      segments.push({ color: ACTIVITY_COLORS[current.act], points: current.points })
      current = { act: p.act, points: [[props.track[i - 1].lat, props.track[i - 1].lng], [p.lat, p.lng]] }
    }
  }
  segments.push({ color: ACTIVITY_COLORS[current.act], points: current.points })

  for (const seg of segments) {
    L.polyline(seg.points, { color: seg.color, weight: 3, opacity: 0.85 }).addTo(map)
  }

  // Start and end markers
  const first = props.track[0]
  const last = props.track[props.track.length - 1]
  L.circleMarker([first.lat, first.lng], { radius: 7, color: '#fff', fillColor: '#10b981', fillOpacity: 1, weight: 2 })
    .bindTooltip('開始').addTo(map)
  L.circleMarker([last.lat, last.lng], { radius: 7, color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 })
    .bindTooltip('終了').addTo(map)

  const { minLat, maxLat, minLng, maxLng } = props.boundingBox
  map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [24, 24] })
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
      radius: 9, color: '#fff', fillColor: '#facc15', fillOpacity: 1, weight: 2,
    }).addTo(map)
  }
})

onUnmounted(() => { map?.remove(); map = null })
</script>

<template>
  <div ref="mapEl" class="w-full rounded-xl overflow-hidden" style="height: 400px;" />
</template>
