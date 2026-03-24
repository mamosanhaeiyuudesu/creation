import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Board } from './useTaskBoards'
import { BOARD_COLORS } from './useTaskBoards'

export type DoneView = 'table' | 'line' | 'stacked' | 'total'
type CompPeriod = 7 | 30 | 90 | 180

const DONE_VIEWS: DoneView[] = ['table', 'line', 'stacked', 'total']

export const doneViewOptions: { key: DoneView; label: string }[] = [
  { key: 'table', label: '表' },
  { key: 'line', label: '折れ線' },
  { key: 'stacked', label: '積み上げ' },
  { key: 'total', label: '合計棒' },
]

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${day})`
}

function doneTotal(board: Board) {
  return Object.values(board.done).reduce((s, arr) => s + arr.length, 0)
}

function getJstKey(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10)
}

export function useTaskStats(
  boards: Ref<Board[]>,
  allDates: Ref<string[]>,
  initialView: DoneView,
) {
  // --- DONE chart ---
  const doneView = ref<DoneView>(DONE_VIEWS.includes(initialView) ? initialView : 'table')
  const chartRef = ref<HTMLElement>()
  let doneChart: any = null
  let EC: any = null
  const selectedDate = ref<string | null>(null)

  async function renderDoneChart() {
    if (!chartRef.value || doneView.value === 'table') return
    if (!EC) EC = await import('echarts')
    if (!doneChart || !EC.getInstanceByDom(chartRef.value)) {
      doneChart?.dispose()
      doneChart = EC.init(chartRef.value, 'dark')
    }

    const sortedDates = [...allDates.value].reverse()
    const baseOpts = {
      backgroundColor: 'transparent',
      grid: { left: 10, right: 20, top: 16, bottom: 56, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
    }

    if (doneView.value === 'line') {
      doneChart.setOption({
        ...baseOpts,
        xAxis: {
          type: 'category',
          data: sortedDates.map(d => formatDate(d)),
          axisLabel: { color: '#64748b', fontSize: 11, rotate: sortedDates.length > 10 ? 45 : 0 },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
        series: boards.value.map((board, i) => ({
          name: board.name, type: 'line', smooth: true,
          data: sortedDates.map(d => board.done[d]?.length ?? 0),
          color: BOARD_COLORS[i % BOARD_COLORS.length],
          lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 6,
        })),
      }, true)
    } else if (doneView.value === 'stacked') {
      doneChart.setOption({
        ...baseOpts,
        xAxis: {
          type: 'category',
          data: sortedDates.map(d => formatDate(d)),
          axisLabel: { color: '#64748b', fontSize: 11, rotate: sortedDates.length > 10 ? 45 : 0 },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
        series: boards.value.map((board, i) => ({
          name: board.name, type: 'bar', stack: 'total',
          data: sortedDates.map(d => board.done[d]?.length ?? 0),
          color: BOARD_COLORS[i % BOARD_COLORS.length], barMaxWidth: 40,
        })),
      }, true)
    } else if (doneView.value === 'total') {
      doneChart.setOption({
        ...baseOpts,
        legend: { show: false },
        xAxis: {
          type: 'category',
          data: boards.value.map(b => b.name),
          axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
        series: [{
          type: 'bar',
          data: boards.value.map((board, i) => ({
            value: doneTotal(board),
            itemStyle: { color: BOARD_COLORS[i % BOARD_COLORS.length], borderRadius: [4, 4, 0, 0] },
          })),
          barMaxWidth: 60,
          label: { show: true, position: 'top', color: '#94a3b8', fontSize: 12, formatter: '{c}' },
        }],
      }, true)
    }

    doneChart.off('click')
    if (doneView.value === 'line' || doneView.value === 'stacked') {
      doneChart.on('click', (params: any) => {
        const date = sortedDates[params.dataIndex] ?? null
        selectedDate.value = selectedDate.value === date ? null : date
      })
    } else {
      selectedDate.value = null
    }
  }

  watch(doneView, async (v) => {
    if (v === 'table') { doneChart?.dispose(); doneChart = null; return }
    await nextTick()
    renderDoneChart()
  })

  watch(allDates, async () => {
    if (doneView.value !== 'table') { await nextTick(); renderDoneChart() }
  })

  watch(selectedDate, async () => {
    await nextTick()
    doneChart?.resize()
  })

  // --- Period comparison chart (PC) ---
  const compPeriod = ref<CompPeriod>(7)
  const compChartRef = ref<HTMLElement>()
  let compChart: any = null

  function getPeriodKeys(daysBack: number, length: number): string[] {
    return Array.from({ length }, (_, i) => getJstKey(daysBack + i))
  }

  const currentPeriodKeys = computed(() => getPeriodKeys(0, compPeriod.value))
  const prevPeriodKeys = computed(() => getPeriodKeys(compPeriod.value, compPeriod.value))

  const compPeriodData = computed(() =>
    boards.value.map((board, i) => ({
      name: board.name,
      current: currentPeriodKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
      prev: prevPeriodKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
      color: BOARD_COLORS[i % BOARD_COLORS.length],
    }))
  )

  const compPeriodTotal = computed(() => ({
    current: compPeriodData.value.reduce((s, r) => s + r.current, 0),
    prev: compPeriodData.value.reduce((s, r) => s + r.prev, 0),
  }))

  async function renderCompChart() {
    if (!compChartRef.value) return
    if (!EC) EC = await import('echarts')
    if (!compChart || !EC.getInstanceByDom(compChartRef.value)) {
      compChart?.dispose()
      compChart = EC.init(compChartRef.value, 'dark')
    }
    const data = compPeriodData.value
    const periodLabel = compPeriod.value === 7 ? '今週' : `直近${compPeriod.value}日`
    const prevLabel = compPeriod.value === 7 ? '先週' : `前${compPeriod.value}日`
    compChart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 10, right: 20, top: 16, bottom: 56, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 0, textStyle: { color: '#94a3b8', fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
      xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      series: [
        {
          name: prevLabel, type: 'bar', barMaxWidth: 40,
          data: data.map(d => ({ value: d.prev, itemStyle: { color: '#475569', borderRadius: [3, 3, 0, 0] } })),
          label: { show: true, position: 'top', color: '#64748b', fontSize: 11, formatter: '{c}' },
        },
        {
          name: periodLabel, type: 'bar', barMaxWidth: 40,
          data: data.map(d => ({ value: d.current, itemStyle: { color: d.current >= d.prev ? '#34d399' : '#f87171', borderRadius: [3, 3, 0, 0] } })),
          label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11, formatter: '{c}' },
        },
      ],
    }, true)
  }

  watch([compPeriod, boards], async () => {
    await nextTick()
    renderCompChart()
  })

  // --- Mobile stats ---
  const thisWeekKeys = computed(() => Array.from({ length: 7 }, (_, i) => getJstKey(i)))
  const prevWeekKeys = computed(() => Array.from({ length: 7 }, (_, i) => getJstKey(i + 7)))

  const thisWeekDone = computed(() =>
    boards.value.map(board => ({
      board,
      items: thisWeekKeys.value
        .filter(d => board.done[d]?.length)
        .map(d => ({ date: d, cards: board.done[d] })),
    })).filter(r => r.items.length > 0)
  )

  const thisWeekDoneFlat = computed(() => {
    const items: { card: any; board: any; date: string }[] = []
    for (const date of thisWeekKeys.value) {
      for (const board of boards.value) {
        for (const card of board.done[date] ?? []) {
          items.push({ card, board, date })
        }
      }
    }
    return items
  })

  const weekComparison = computed(() =>
    boards.value.map(board => ({
      name: board.name,
      thisWeek: thisWeekKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
      prevWeek: prevWeekKeys.value.reduce((s, d) => s + (board.done[d]?.length ?? 0), 0),
    }))
  )

  const weekCompTotal = computed(() => ({
    thisWeek: weekComparison.value.reduce((s, r) => s + r.thisWeek, 0),
    prevWeek: weekComparison.value.reduce((s, r) => s + r.prevWeek, 0),
  }))

  onUnmounted(() => {
    doneChart?.dispose()
    compChart?.dispose()
  })

  return {
    doneView, doneViewOptions,
    chartRef, selectedDate, renderDoneChart,
    compPeriod, compChartRef, renderCompChart,
    compPeriodData, compPeriodTotal,
    thisWeekDone, thisWeekDoneFlat, weekComparison, weekCompTotal,
  }
}
