import { ref, computed, toValue, onMounted, onBeforeUnmount, type ComputedRef, type MaybeRefOrGetter } from 'vue'

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

/** 「切りの良い」桁数（1/2/5×10^n）に丸める。round=false は切り上げ、true は最寄り */
function niceNum(range: number, round: boolean): number {
  if (!(range > 0) || !isFinite(range)) return 1
  const exp = Math.floor(Math.log10(range))
  const f = range / Math.pow(10, exp)
  let nf: number
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * Math.pow(10, exp)
}

/** [lo, hi] 間を「切りの良い」等間隔で刻んだ目盛り（両端含む）。40/50/60… のような値。 */
function makeTicks(lo: number, hi: number): number[] {
  const step = niceNum((hi - lo) / 4, true) // 目安5本（広いレンジでも粗くなりすぎない）
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  const ticks: number[] = []
  for (let v = lo; v <= hi + step * 0.5; v += step) {
    ticks.push(Number(v.toFixed(decimals + 2)))
  }
  return ticks
}

/**
 * データ範囲を覆う「切りの良い」軸の下限・上限・目盛りを返す。
 * - range 指定時: その固定レンジをそのまま軸に使う（血中酸素90-100 等）
 * - zeroBased 時: 下限を0に固定し、上限のみ切りの良い数値に丸める
 * - それ以外: 下限・上限とも切りの良い数値に丸める
 */
export function niceAxis(
  dataMin: number,
  dataMax: number,
  opts?: { zeroBased?: boolean; range?: readonly [number, number] },
): { lo: number; hi: number; ticks: number[] } {
  if (opts?.range) {
    const [lo, hi] = opts.range
    return { lo, hi, ticks: makeTicks(lo, hi) }
  }
  const zeroBased = opts?.zeroBased ?? false
  const effLo = zeroBased ? 0 : dataMin
  // 有効な範囲が作れない（1点のみ / 全て同値 / 上限が下限以下）ときはフォールバック
  if (!isFinite(effLo) || !isFinite(dataMax) || dataMax <= effLo) {
    const base = isFinite(dataMax) ? dataMax : 0
    const pad = Math.abs(base) * 0.1 || 1
    const lo = zeroBased ? 0 : base - pad
    const hi = base + pad
    return { lo, hi, ticks: [lo, hi] }
  }
  const step = niceNum((dataMax - effLo) / 4, true)
  const lo = zeroBased ? 0 : Math.floor(dataMin / step) * step
  const hi = Math.ceil(dataMax / step) * step
  return { lo, hi, ticks: makeTicks(lo, hi) }
}

/**
 * SVG縦棒グラフの座標計算・ホバー処理を切り出したコンポーザブル。
 * TrendPanel（長期推移・期間トグル＋$fetch）とIntradayPanel（当日内訳・propそのまま）の
 * 両方が同じ描画ロジックを使うための共通部分のみを担う。統計行や期間トグルは呼び出し側の責務。
 */
export function useBarChart(
  points: ComputedRef<BarChartPoint[]>,
  // goal は呼び出し側で切り替わりうる（睡眠シートのステージ別セレクト等）ため getter/ref も受ける
  options?: { height?: number; zeroBased?: boolean; range?: readonly [number, number]; goal?: MaybeRefOrGetter<number | undefined>; zeroLine?: boolean },
) {
  const H = options?.height ?? 180
  const zeroBased = options?.zeroBased ?? false
  const range = options?.range
  const goal = computed(() => toValue(options?.goal))
  const zeroLine = options?.zeroLine ?? false
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

  // 軸は「切りの良い」下限・上限・目盛りに丸める（40/50/60… のような等間隔）。
  // range 指定時は固定レンジ、zeroBased 時は下限を0に固定。goal はチャート内に必ず収まるよう上限計算に含める。
  const effMax = computed(() => (goal.value != null ? Math.max(max.value, goal.value) : max.value))
  const axis = computed(() => niceAxis(min.value, effMax.value, { zeroBased, range }))
  const yLo = computed(() => axis.value.lo)
  const yHi = computed(() => axis.value.hi)
  const goalY = computed(() => (goal.value != null ? toY(goal.value) : null))
  // 基準線（0）。皮膚温の変動など「差」を見せる指標で、正負の境目をはっきり示すために使う。
  const zeroY = computed(() => (zeroLine && yLo.value <= 0 && yHi.value >= 0 ? toY(0) : null))

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
  // 棒の基準線は0（軸内にクランプ）。0が軸内にあれば、負値は0から下・正値は0から上に伸びる。
  const baseY = computed(() => toY(Math.min(yHi.value, Math.max(yLo.value, 0))))
  const bars = computed(() => points.value
    .map((p, i) => {
      if (p.value == null) return null
      const y0 = baseY.value
      const yv = toY(p.value)
      return { i, x: toX(i) - barWidth.value / 2, y: Math.min(y0, yv), width: barWidth.value, height: Math.max(0, Math.abs(yv - y0)) }
    })
    .filter((b): b is BarGeometry => b != null))
  const gridYs = computed(() => axis.value.ticks.map(v => ({ v, y: toY(v) })))
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

  function pick(e: PointerEvent) {
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
  // マウスはホバー追従。タッチは移動では反応させず、タップした棒だけを選ぶ（スクロール中に出ないように）。
  function onMove(e: PointerEvent) { if (e.pointerType === 'touch') return; pick(e) }
  function onDown(e: PointerEvent) { pick(e) }
  // マウスは離脱で消す。タッチは指を離しても読めるよう残し、グラフ外タップで消す（onDocDown）。
  function onLeave(e: PointerEvent) { if (e.pointerType !== 'touch') hover.value = -1 }
  // ブラウザがスクロール操作として引き取ったとき（縦ドラッグ）はタップ扱いにしない
  function onCancel() { hover.value = -1 }
  // タッチで出したツールチップは、グラフ以外をタップしたら閉じる
  function onDocDown(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    if (!wrap.value?.contains(e.target as Node)) hover.value = -1
  }

  let ro: ResizeObserver | null = null
  function measure() { if (wrap.value) W.value = wrap.value.clientWidth || 320 }

  onMounted(() => {
    measure()
    ro = new ResizeObserver(measure)
    if (wrap.value) ro.observe(wrap.value)
    document.addEventListener('pointerdown', onDocDown as EventListener)
  })
  onBeforeUnmount(() => {
    ro?.disconnect()
    document.removeEventListener('pointerdown', onDocDown as EventListener)
  })

  return {
    wrap, W, H, padL, padR, padT, padB, labelStyle,
    hasData, min, max, avg,
    bars, gridYs, xLabels, goalY, zeroY,
    hover, hovered, hoverX, tooltipStyle,
    onMove, onDown, onLeave, onCancel, measure,
  }
}
