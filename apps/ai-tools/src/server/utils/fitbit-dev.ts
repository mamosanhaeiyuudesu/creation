// ローカル開発用スタブ。macOS では D1 が使えず、また Fitbit OAuth も本番のみのため、
// dev では日付シードで決定的な擬似メトリクスを生成してダッシュボードを描画確認できるようにする。
// mlb-dev.ts と同じ「静的/決定的フォールバック」思想。

import type { RawDay, SleepStage } from '~/types/fitbit'

/** 文字列 → 32bit ハッシュ（決定的シード用） */
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 PRNG（0-1） */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** min-max 範囲の乱数（丸めなし） */
const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)

/** 睡眠タイムラインを生成（就寝〜起床を stage 帯で埋める） */
function buildSleepTimeline(
  r: () => number,
  totalMinutes: number
): { timeline: { stage: SleepStage; start: number; duration: number }[]; deepMin: number; remMin: number; lightMin: number; wakeMin: number } {
  const timeline: { stage: SleepStage; start: number; duration: number }[] = []
  let cursor = 0
  let deepMin = 0
  let remMin = 0
  let lightMin = 0
  let wakeMin = 0

  // 90分前後の睡眠サイクルを繰り返す。前半は深い睡眠が多く、後半はレムが増える。
  let cycle = 0
  while (cursor < totalMinutes) {
    const progress = cursor / totalMinutes
    // 各サイクル: 浅い → 深い(前半多め) → 浅い → レム(後半多め) → 稀に覚醒
    const segments: { stage: SleepStage; dur: number }[] = []
    segments.push({ stage: 'light', dur: between(r, 15, 30) })
    const deepDur = between(r, 10, 35) * (1 - progress * 0.7) // 後半は減る
    if (deepDur > 5) segments.push({ stage: 'deep', dur: deepDur })
    segments.push({ stage: 'light', dur: between(r, 20, 40) })
    const remDur = between(r, 10, 30) * (0.4 + progress) // 後半は増える
    if (remDur > 5) segments.push({ stage: 'rem', dur: remDur })
    if (r() < 0.35) segments.push({ stage: 'wake', dur: between(r, 2, 8) })

    for (const seg of segments) {
      if (cursor >= totalMinutes) break
      const dur = Math.min(Math.round(seg.dur), totalMinutes - cursor)
      if (dur <= 0) continue
      timeline.push({ stage: seg.stage, start: Math.round(cursor), duration: dur })
      if (seg.stage === 'deep') deepMin += dur
      else if (seg.stage === 'rem') remMin += dur
      else if (seg.stage === 'wake') wakeMin += dur
      else lightMin += dur
      cursor += dur
    }
    cycle++
    if (cycle > 12) break
  }
  return { timeline, deepMin, remMin, lightMin, wakeMin }
}

/** 指定日の生メトリクスを決定的に生成 */
export function devRawDay(date: string): RawDay {
  const r = rng(hashSeed(date))

  // 睡眠（22:40〜00:10 就寝、6.5〜8h）
  const totalMinutes = Math.round(between(r, 6.4 * 60, 8.1 * 60))
  const bedStartMin = Math.round(between(r, 22 * 60 + 30, 24 * 60 + 30)) % (24 * 60)
  const { timeline, deepMin, remMin, lightMin, wakeMin } = buildSleepTimeline(r, totalMinutes)
  const efficiency = Math.round(between(r, 88, 97))
  const awakeCount = Math.round(between(r, 1, 5))
  const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const bedtime = fmt(bedStartMin)
  const waketime = fmt(bedStartMin + totalMinutes)

  // 夜間 SpO2 / 呼吸数の推移（15分刻み）
  const spo2Series = []
  const brSeries = []
  const spo2Base = between(r, 95.5, 97.5)
  const brBase = between(r, 13, 16)
  for (let t = 0; t <= totalMinutes; t += 15) {
    spo2Series.push({ t, v: Math.round(clampN(spo2Base + between(r, -2.5, 1.5), 90, 100) * 10) / 10 })
    brSeries.push({ t, v: Math.round((brBase + between(r, -1.2, 1.2)) * 10) / 10 })
  }
  const spo2Vals = spo2Series.map(p => p.v)

  // 日中心拍（1時間刻み、朝低め・日中高め）
  const restingHeartRate = Math.round(between(r, 54, 64))
  const heartRateSeries = []
  for (let h = 0; h < 24; h++) {
    const daytime = h >= 8 && h <= 22
    const base = daytime ? between(r, 70, 95) : between(r, 55, 68)
    heartRateSeries.push({ t: h * 60, v: Math.round(base) })
  }

  return {
    date,
    steps: Math.round(between(r, 3200, 13500)),
    distanceKm: Math.round(between(r, 2.2, 9.6) * 10) / 10,
    restingHeartRate,
    heartRateSeries,
    hrv: Math.round(between(r, 32, 58)),
    spo2: {
      avg: Math.round((spo2Vals.reduce((a, b) => a + b, 0) / spo2Vals.length) * 10) / 10,
      min: Math.min(...spo2Vals),
      max: Math.max(...spo2Vals),
      series: spo2Series,
    },
    breathingRate: Math.round(brBase * 10) / 10,
    breathingRateSeries: brSeries,
    skinTempDelta: Math.round(between(r, -0.6, 0.7) * 10) / 10,
    sleep: {
      totalMinutes,
      deepMin,
      remMin,
      lightMin,
      wakeMin,
      efficiency,
      awakeCount,
      bedtime,
      waketime,
      timeline,
    },
  }
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** 指定日から遡って n 日分の生メトリクス（新しい順ではなく古い順） */
export function devHistory(endDate: string, days: number): RawDay[] {
  const out: RawDay[] = []
  const end = new Date(`${endDate}T00:00:00Z`)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000)
    out.push(devRawDay(d.toISOString().slice(0, 10)))
  }
  return out
}
