import { ref, computed, onMounted, onBeforeUnmount, type ComputedRef } from 'vue'

/** 縦棒グラフ1点分（ラベルは軸表示・ツールチップ両方に使う整形済み文字列） */
export interface BarChartPoint {
  label: string
  value: number | null
}

interface BarGeometry {
  i: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * SVG縦棒グラフの座標計算・ホバー処理を切り出したコンポーザブル。
 * TrendPanel（長期推移・期間トグル＋$fetch）とIntradayPanel（当日内訳・propそのまま）の
 * 両方が同じ描画ロジックを使うための共通部分のみを担う。統計行や期間トグルは呼び出し側の責務。
 */
export function useBarChart(points: ComputedRef<BarChartPoint[]>, options?: { height?: number }) {
  const H = options?.height ?? 180
  const padL = 34
  const padR = 12
  const padT = 12
  const padB = 20

  const wrap = ref<HTMLElement>()
  const W = ref(320) // 実ピクセル幅（viewBox=ピクセルなので歪みなし）
  const hover = ref(-1)
  // viewBox が実寸なので text は px 指定でも歪まないが、preserveAspectRatio=none のため font-size は明示
  const labelStyle = { fontSize: '9px' } as const

  const nums = computed(() => points.value.map(p => p.value).filter((v): v is number => v != null))
  const hasData = computed(() => nums.value.length >= 2)
  const min = computed(() => (nums.value.length ? Math.min(...nums.value) : 0))
  const max = computed(() => (nums.value.length ? Math.max(...nums.value) : 0))
  const avg = computed(() => (nums.value.length ? nums.value.reduce((a, b) => a + b, 0) / nums.value.length : 0))

  const yLo = computed(() => min.value - (max.value - min.value || 1) * 0.1)
  const yHi = computed(() => max.value + (max.value - min.value || 1) * 0.1)

  // バンド配置: 各点をスロット中央に置く。端点を軸ちょうど(padL / W-padR)に置くと、
  // その点を中心に描く棒が軸を半分またぎ、左端の棒がY軸ラベルに被る（点数が少ないほど顕著）。
  // スロット内に収めることで、はみ出さずY軸の数値も隠れない。
  function toX(i: number): number {
    const n = points.value.length
    const inner = W.value - padL - padR
    if (n <= 1) return padL + inner / 2
    const slot = inner / n
    return padL + slot * (i + 0.5)
  }
  function toY(v: number): number {
    const span = yHi.value - yLo.value || 1
    return padT + (1 - (v - yLo.value) / span) * (H - padT - padB)
  }

  const barWidth = computed(() => {
    const n = points.value.length
    if (!n) return 0
    const inner = W.value - padL - padR
    const slot = n > 1 ? inner / n : inner
    return Math.max(2, slot * 0.6)
  })
  const bars = computed(() => points.value
    .map((p, i) => {
      if (p.value == null) return null
      const base = H - padB
      const y = toY(p.value)
      return { i, x: toX(i) - barWidth.value / 2, y, width: barWidth.value, height: Math.max(0, base - y) }
    })
    .filter((b): b is BarGeometry => b != null))
  const gridYs = computed(() => {
    const lo = yLo.value, hi = yHi.value
    return [hi, (hi + lo) / 2, lo].map(v => ({ v, y: toY(v) }))
  })
  const xLabels = computed(() => {
    const n = points.value.length
    if (!n) return []
    const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
    return idxs.map(i => ({ x: toX(i), text: points.value[i].label }))
  })

  // ホバー
  const hovered = computed(() => (hover.value >= 0 ? points.value[hover.value] : null))
  const hoverX = computed(() => (hover.value >= 0 ? toX(hover.value) : null))
  const tooltipStyle = computed(() => {
    if (hover.value < 0) return {}
    const xPct = (toX(hover.value) / W.value) * 100
    const v = hovered.value?.value
    const yPx = v != null ? toY(v) : padT
    return { left: `${xPct}%`, top: `${Math.max(0, yPx - 46)}px` }
  })

  function onMove(e: PointerEvent) {
    const el = wrap.value
    if (!el || points.value.length < 2) return
    const rect = el.getBoundingClientRect()
    const px = e.clientX - rect.left
    const n = points.value.length
    const inner = W.value - padL - padR
    const frac = Math.min(1, Math.max(0, ((px / rect.width) * W.value - padL) / inner))
    // バンド配置に合わせ、カーソル位置のスロット（棒）を選ぶ
    hover.value = Math.min(n - 1, Math.floor(frac * n))
  }

  let ro: ResizeObserver | null = null
  function measure() { if (wrap.value) W.value = wrap.value.clientWidth || 320 }

  onMounted(() => {
    measure()
    ro = new ResizeObserver(measure)
    if (wrap.value) ro.observe(wrap.value)
  })
  onBeforeUnmount(() => ro?.disconnect())

  return {
    wrap, W, H, padL, padR, padT, padB, labelStyle,
    hasData, min, max, avg,
    bars, gridYs, xLabels,
    hover, hovered, hoverX, tooltipStyle,
    onMove, measure,
  }
}
