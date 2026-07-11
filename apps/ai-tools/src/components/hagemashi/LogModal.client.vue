<script setup lang="ts">
// 記録・相談・気分の利用回数ログ（カレンダー / 推移）
const props = defineProps<{
  recordDates: string[]
  consultDates: string[]
  moodDates: string[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

// デフォルトは推移
const view = ref<'trend' | 'calendar'>('trend')

const PAD = (n: number) => String(n).padStart(2, '0')
// ISO文字列 → JSTの YYYY-MM-DD
const dayKeyOf = (iso: string): string => toJSTDate(iso).toISOString().slice(0, 10)

interface DayCount { record: number; consult: number; mood: number }

const counts = computed(() => {
  const map = new Map<string, DayCount>()
  const bump = (iso: string, key: keyof DayCount) => {
    if (!iso) return
    const k = dayKeyOf(iso)
    if (!map.has(k)) map.set(k, { record: 0, consult: 0, mood: 0 })
    map.get(k)![key]++
  }
  for (const d of props.recordDates) bump(d, 'record')
  for (const d of props.consultDates) bump(d, 'consult')
  for (const d of props.moodDates) bump(d, 'mood')
  return map
})

const activeDayKeys = computed(() => [...counts.value.keys()].sort())
const hasData = computed(() => activeDayKeys.value.length > 0)

// --- 推移（折れ線） ---
// 最初〜最後の活動日までを1日刻みで埋める（間の空白日は0）。範囲が広すぎる場合は活動日のみ
const filledDays = computed<string[]>(() => {
  const keys = activeDayKeys.value
  if (keys.length === 0) return []
  const start = new Date(`${keys[0]}T00:00:00Z`).getTime()
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`).getTime()
  const span = Math.round((end - start) / 86400000) + 1
  if (span > 370) return keys
  const out: string[] = []
  for (let t = start; t <= end; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
})

const chartEl = ref<HTMLDivElement>()
let chart: import('echarts/core').ECharts | null = null

async function loadECharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.LineChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    renderers.SVGRenderer,
  ])
  return core
}

const mdLabel = (key: string): string => {
  const d = new Date(`${key}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const SERIES = [
  { name: '合計', field: 'total', color: '#e2e8f0', width: 2.5 },
  { name: '記録', field: 'record', color: '#f97316', width: 1.5 },
  { name: '相談', field: 'consult', color: '#38bdf8', width: 1.5 },
  { name: '気分', field: 'mood', color: '#a78bfa', width: 1.5 },
] as const

async function renderChart() {
  if (!chartEl.value) return
  const EC = await loadECharts()
  if (!chartEl.value) return
  if (!chart) chart = EC.init(chartEl.value, undefined, { renderer: 'svg' })

  const days = filledDays.value
  const valueOf = (k: string, field: (typeof SERIES)[number]['field']): number => {
    const c = counts.value.get(k)
    if (!c) return 0
    return field === 'total' ? c.record + c.consult + c.mood : c[field]
  }

  chart.setOption({
    grid: { top: 36, left: 30, right: 12, bottom: 26 },
    legend: {
      top: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      icon: 'roundRect',
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: days,
      boundaryGap: false,
      axisLabel: { color: '#94a3b8', fontSize: 10, hideOverlap: true, formatter: (v: string) => mdLabel(v) },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    series: SERIES.map(s => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: days.length <= 60,
      lineStyle: { color: s.color, width: s.width },
      itemStyle: { color: s.color },
      emphasis: { focus: 'series' },
      data: days.map(k => valueOf(k, s.field)),
    })),
  }, true)
  chart.resize()
}

watch(() => [props.recordDates, props.consultDates, props.moodDates], () => {
  if (view.value === 'trend') nextTick(renderChart)
}, { deep: true })

watch(view, (v) => {
  if (v === 'trend') nextTick(renderChart)
})

let ro: ResizeObserver | null = null
onMounted(async () => {
  if (view.value === 'trend') await renderChart()
  if (chartEl.value) {
    ro = new ResizeObserver(() => chart?.resize())
    ro.observe(chartEl.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})

// --- カレンダー ---
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const now = nowJST()
const viewYear = ref(now.getUTCFullYear())
const viewMonth = ref(now.getUTCMonth()) // 0-11
const selectedKey = ref<string | null>(null)

const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)

interface Cell { day: number; key: string; c: DayCount; total: number }
const calendarCells = computed<(Cell | null)[]>(() => {
  const first = new Date(Date.UTC(viewYear.value, viewMonth.value, 1))
  const startWeekday = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(viewYear.value, viewMonth.value + 1, 0)).getUTCDate()
  const cells: (Cell | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${viewYear.value}-${PAD(viewMonth.value + 1)}-${PAD(d)}`
    const c = counts.value.get(key) ?? { record: 0, consult: 0, mood: 0 }
    cells.push({ day: d, key, c, total: c.record + c.consult + c.mood })
  }
  return cells
})

const todayKey = todayJST()

function shiftMonth(delta: number) {
  let m = viewMonth.value + delta
  let y = viewYear.value
  while (m < 0) { m += 12; y-- }
  while (m > 11) { m -= 12; y++ }
  viewMonth.value = m
  viewYear.value = y
  selectedKey.value = null
}

function selectDay(cell: Cell | null) {
  if (!cell) return
  selectedKey.value = selectedKey.value === cell.key ? null : cell.key
}

const selectedDetail = computed(() => {
  if (!selectedKey.value) return null
  const c = counts.value.get(selectedKey.value) ?? { record: 0, consult: 0, mood: 0 }
  return { key: selectedKey.value, ...c, total: c.record + c.consult + c.mood }
})

const selectedLabel = computed(() => {
  if (!selectedKey.value) return ''
  const d = new Date(`${selectedKey.value}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAYS[d.getUTCDay()]}）`
})
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]" @click.self="emit('close')">
    <div class="w-full max-w-[440px] bg-[#1e293b] border border-white/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.08]">
        <h2 class="m-0 text-base text-slate-50 font-semibold flex items-center gap-1.5"><span>🗓️</span> ログ</h2>
        <button class="bg-transparent border-none text-slate-500 text-lg cursor-pointer px-2 py-1 rounded-md hover:text-slate-50 transition-colors" @click="emit('close')">✕</button>
      </div>

      <!-- ビュー切替 -->
      <div class="flex gap-1.5 px-5 pt-3">
        <button
          v-for="v in (['trend', 'calendar'] as const)"
          :key="v"
          class="px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer"
          :class="view === v ? 'border-orange-500/60 bg-orange-500/15 text-orange-300' : 'border-white/[0.08] bg-transparent text-slate-500 hover:text-slate-300'"
          @click="view = v"
        >{{ v === 'trend' ? '推移' : 'カレンダー' }}</button>
      </div>

      <div class="px-5 py-3 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(249,115,22,0.3)_transparent]">
        <div v-if="!hasData" class="text-center text-slate-500 text-sm py-12">
          まだ利用ログがありません
        </div>

        <!-- 推移ビュー -->
        <div v-show="hasData && view === 'trend'">
          <p class="m-0 mb-1 text-[11px] text-slate-500">記録・相談・気分の1日あたりの利用回数</p>
          <div ref="chartEl" class="w-full" style="height: 300px" />
        </div>

        <!-- カレンダービュー -->
        <div v-if="hasData && view === 'calendar'">
          <!-- 月ナビ -->
          <div class="flex items-center justify-between mb-2">
            <button class="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all" @click="shiftMonth(-1)">‹</button>
            <div class="text-sm font-semibold text-slate-200">{{ monthLabel }}</div>
            <button class="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 cursor-pointer hover:bg-white/[0.10] hover:text-slate-200 transition-all" @click="shiftMonth(1)">›</button>
          </div>
          <!-- 曜日ヘッダ -->
          <div class="grid grid-cols-7 gap-1 mb-1">
            <div v-for="(w, i) in WEEKDAYS" :key="w" class="text-center text-[10px] font-medium py-0.5" :class="i === 0 ? 'text-red-400/70' : i === 6 ? 'text-sky-400/70' : 'text-slate-500'">{{ w }}</div>
          </div>
          <!-- 日グリッド -->
          <div class="grid grid-cols-7 gap-1">
            <template v-for="(cell, i) in calendarCells" :key="i">
              <div v-if="!cell" />
              <button
                v-else
                class="aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer p-0.5"
                :class="[
                  selectedKey === cell.key
                    ? 'border-orange-500/70 bg-orange-500/20'
                    : cell.total > 0
                      ? 'border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.10]'
                      : 'border-white/[0.04] bg-transparent hover:bg-white/[0.04]',
                  cell.key === todayKey ? 'ring-1 ring-orange-400/40' : '',
                ]"
                @click="selectDay(cell)"
              >
                <span class="text-[11px] leading-none" :class="cell.total > 0 ? 'text-slate-200 font-semibold' : 'text-slate-600'">{{ cell.day }}</span>
                <span v-if="cell.total > 0" class="text-[9px] leading-none text-orange-300 font-semibold tabular-nums">{{ cell.total }}</span>
                <span v-else class="text-[9px] leading-none text-transparent">0</span>
              </button>
            </template>
          </div>

          <!-- 選択日の詳細 -->
          <div v-if="selectedDetail" class="mt-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-semibold text-slate-200">{{ selectedLabel }}</div>
              <div class="text-[11px] text-slate-500">合計 {{ selectedDetail.total }} 回</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.03] py-2">
                <span class="text-[11px] text-slate-400">📝 記録</span>
                <span class="text-lg font-bold" :style="{ color: '#f97316' }">{{ selectedDetail.record }}</span>
              </div>
              <div class="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.03] py-2">
                <span class="text-[11px] text-slate-400">💬 相談</span>
                <span class="text-lg font-bold" :style="{ color: '#38bdf8' }">{{ selectedDetail.consult }}</span>
              </div>
              <div class="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.03] py-2">
                <span class="text-[11px] text-slate-400">📈 気分</span>
                <span class="text-lg font-bold" :style="{ color: '#a78bfa' }">{{ selectedDetail.mood }}</span>
              </div>
            </div>
          </div>
          <p v-else class="mt-3 text-center text-[11px] text-slate-600">日付をタップすると内訳が見られます</p>
        </div>
      </div>
    </div>
  </div>
</template>
