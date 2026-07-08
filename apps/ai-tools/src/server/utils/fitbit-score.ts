// エナジースコア（旧 Daily Readiness）・睡眠スコアの近似算出。
//
// ⚠️ これらのスコアは Fitbit / Google の公式 Web API では公開されていない（プレミアムの
//    独自算出値）。本モジュールは取得可能な生メトリクスから、本家の重み付けを踏襲した
//    近似値を算出する。数値は本家と完全一致しないため、傾向を見る用途と割り切る。
//    係数は実データでキャリブレーションする前提の初期値。

import type { RawDay, ScoreDetail } from '~/types/fitbit'

/** 睡眠時間の目標（分）。7.5時間 */
const SLEEP_TARGET_MIN = 7.5 * 60
/** 深い睡眠＋レムの理想割合（合計） */
const IDEAL_DEEP_REM_PCT = 0.42
/** ベースライン確立に必要な最低日数 */
const MIN_BASELINE_DAYS = 3

/** 個人ベースライン（直近履歴から算出） */
export interface Baseline {
  hrv: number | null
  restingHeartRate: number | null
  days: number
}

/** 0-100 にクランプ */
const clamp100 = (v: number): number => Math.max(0, Math.min(100, Math.round(v)))
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** 直近履歴から HRV・安静時心拍のベースラインを算出（当日は含めない想定で呼ぶ） */
export function computeBaseline(history: RawDay[]): Baseline {
  const hrvs = history.map(d => d.hrv).filter(v => v > 0)
  const rhrs = history.map(d => d.restingHeartRate).filter(v => v > 0)
  const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  return {
    hrv: avg(hrvs),
    restingHeartRate: avg(rhrs),
    days: Math.min(hrvs.length, rhrs.length),
  }
}

function scoreLabel(score: number | null, kind: 'sleep' | 'energy'): string {
  if (score == null) return 'データ蓄積中'
  if (score >= 80) return kind === 'sleep' ? '快眠' : '絶好調'
  if (score >= 60) return '良好'
  if (score >= 40) return '普通'
  return kind === 'sleep' ? '睡眠不足' : '要休養'
}

/**
 * 睡眠スコア（0-100）＝ 睡眠時間(50) ＋ 深睡眠・レム(25) ＋ 回復(25)
 */
export function computeSleepScore(day: RawDay, baseline: Baseline): ScoreDetail {
  const s = day.sleep
  const asleep = s.totalMinutes - s.wakeMin

  // 時間点(0-50): 目標に対して線形、超過は飽和
  const durationPts = clamp((asleep / SLEEP_TARGET_MIN) * 50, 0, 50)

  // 深睡眠・レム点(0-25): (deep+rem)/asleep を理想割合と比較
  const deepRemPct = asleep > 0 ? (s.deepMin + s.remMin) / asleep : 0
  const deepRemRatio = clamp(deepRemPct / IDEAL_DEEP_REM_PCT, 0, 1)
  const deepRemPts = deepRemRatio * 25

  // 回復点(0-25): 安静時心拍がベースラインより低い＋覚醒回数が少ないほど高得点
  let restingPts = 12.5 // ベースライン未確立時は中央値
  if (baseline.restingHeartRate) {
    // ベースライン比 -5bpm で満点側、+5bpm で0側
    const delta = baseline.restingHeartRate - day.restingHeartRate
    restingPts = clamp(12.5 + (delta / 5) * 12.5, 0, 25) * 0.6
  } else {
    restingPts = 12.5 * 0.6
  }
  // 覚醒ペナルティ（0-10点分）: 効率と覚醒回数から
  const wakePts = clamp((s.efficiency / 100) * 10 - Math.max(0, s.awakeCount - 2) * 1.5, 0, 10)
  const restorationPts = clamp(restingPts + wakePts, 0, 25)

  const provisional = baseline.days < MIN_BASELINE_DAYS
  const total = clamp100(durationPts + deepRemPts + restorationPts)

  return {
    score: total,
    label: scoreLabel(total, 'sleep'),
    provisional,
    contributions: [
      { key: 'duration', label: '睡眠時間', value: Math.round(durationPts), max: 50 },
      { key: 'deepRem', label: '深い睡眠・レム', value: Math.round(deepRemPts), max: 25 },
      { key: 'restoration', label: '回復', value: Math.round(restorationPts), max: 25 },
    ],
  }
}

/**
 * エナジースコア（0-100）＝ HRV(40) ＋ 睡眠(35) ＋ 活動負荷(25)
 * @param sleepScore 前夜の睡眠スコア（computeSleepScore の結果）
 * @param yesterday 前日の活動（疲労評価用）。無ければ当日で代用
 */
export function computeEnergyScore(
  day: RawDay,
  sleepScore: ScoreDetail,
  baseline: Baseline,
  yesterday: RawDay | null
): ScoreDetail {
  // HRV点(0-40): ベースライン比。高いほど回復している。
  let hrvPts = 24 // 未確立時は中央やや上
  if (baseline.hrv && baseline.hrv > 0) {
    const ratio = day.hrv / baseline.hrv // 1.0 で標準
    // 0.8→下限, 1.2→上限 にマップ
    hrvPts = clamp(((ratio - 0.8) / 0.4) * 40, 0, 40)
  }

  // 睡眠点(0-35): 前夜の睡眠スコアを 0-35 にスケール
  const sleepPts = ((sleepScore.score ?? 55) / 100) * 35

  // 活動負荷点(0-25): 前日の歩数が「適度」だと満点、過少・過多で減点。
  const ref = yesterday ?? day
  const steps = ref.steps
  // 8000歩を最適、0 or 18000歩で0点になる山形
  const optimal = 8000
  const loadPts = clamp(25 - (Math.abs(steps - optimal) / optimal) * 25, 0, 25)

  const provisional = baseline.days < MIN_BASELINE_DAYS
  const total = clamp100(hrvPts + sleepPts + loadPts)

  return {
    score: total,
    label: scoreLabel(total, 'energy'),
    provisional,
    contributions: [
      { key: 'hrv', label: '心拍変動', value: Math.round(hrvPts), max: 40 },
      { key: 'sleep', label: '睡眠', value: Math.round(sleepPts), max: 35 },
      { key: 'load', label: '活動負荷', value: Math.round(loadPts), max: 25 },
    ],
  }
}

/**
 * 履歴各日のエナジー／睡眠スコアを算出（トレンド用）。
 * ベースラインは各日の直前7日から動的算出（rolling）。
 */
export function computeScoreSeries(history: RawDay[]): { date: string; energy: number | null; sleep: number | null }[] {
  return history.map((day, i) => {
    const baseline = computeBaseline(history.slice(Math.max(0, i - 7), i))
    const sleep = computeSleepScore(day, baseline)
    const energy = computeEnergyScore(day, sleep, baseline, i > 0 ? history[i - 1] : null)
    return { date: day.date, energy: energy.score, sleep: sleep.score }
  })
}
