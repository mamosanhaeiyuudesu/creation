// エナジースコア（旧 Daily Readiness）・睡眠スコアの近似算出。
//
// ⚠️ これらのスコアは Fitbit / Google の公式 Web API では公開されていない（プレミアムの
//    独自算出値）。本モジュールは取得可能な生メトリクスから、本家の重み付けを踏襲した
//    近似値を算出する。数値は本家と完全一致しないため、傾向を見る用途と割り切る。
//    係数は実データでキャリブレーションする前提の初期値。

import type { RawDay, ScoreDetail } from '~/types/fitbit'

/** 睡眠時間の目標（分）。8時間 */
const SLEEP_TARGET_MIN = 8 * 60
/** 熟睡（深い睡眠＋レム）の理想割合（対 実睡眠時間）。公式に合わせ本家は満点しにくい水準 */
const IDEAL_DEEP_REM_PCT = 0.5
/** これ未満の総睡眠時間はメイン睡眠とみなさずスコア対象外（本家も「なし」表示） */
const MIN_SLEEP_MIN = 120
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
  if (score == null) return kind === 'sleep' ? 'データなし' : 'データ蓄積中'
  if (kind === 'sleep') {
    // 公式の睡眠スコア区分に準拠: 90-100 非常に良い / 80-89 良い / 60-79 普通 / 60未満 悪い
    if (score >= 90) return '非常に良い'
    if (score >= 80) return '良い'
    if (score >= 60) return '普通'
    return '悪い'
  }
  // 公式のエナジースコア区分に準拠: 65以上 高い / 30-64 良好 / 29以下 低い
  if (score >= 65) return '高い'
  if (score >= 30) return '良好'
  return '低い'
}

/**
 * 睡眠スコア（0-100）＝ 睡眠時間(40) ＋ 熟睡(30) ＋ 連続性(30)
 *
 * 公式は「睡眠時間・熟睡（深い睡眠＋レム）・覚醒/中断（連続性）」を軸に、年齢・性別で
 * 調整した目標と比較する。平均は72〜83で満点は出にくい。安静時心拍(RHR)は睡眠スコアの
 * 定義に含まれないためエナジースコア側に移し、ここでは分断された夜（低効率・多覚醒）を
 * しっかり減点する。総睡眠が極端に短い日は本家同様スコア対象外（null）とする。
 */
export function computeSleepScore(day: RawDay, baseline: Baseline): ScoreDetail {
  const s = day.sleep
  const provisional = baseline.days < MIN_BASELINE_DAYS

  // メイン睡眠が成立していない日はスコアを出さない（本家も「なし」）
  if (!s || s.totalMinutes < MIN_SLEEP_MIN) {
    return {
      score: null,
      label: scoreLabel(null, 'sleep'),
      provisional,
      contributions: [
        { key: 'duration', label: '睡眠時間', value: 0, max: 40 },
        { key: 'sound', label: '熟睡', value: 0, max: 30 },
        { key: 'continuity', label: '連続性', value: 0, max: 30 },
      ],
    }
  }

  const asleep = s.totalMinutes - s.wakeMin

  // 睡眠時間点(0-40): 8時間目標に対して線形、超過は飽和
  const durationPts = clamp((asleep / SLEEP_TARGET_MIN) * 40, 0, 40)

  // 熟睡点(0-30): (deep+rem)/asleep を理想割合と比較。本家は満点しにくい
  const deepRemPct = asleep > 0 ? (s.deepMin + s.remMin) / asleep : 0
  const soundPts = clamp(deepRemPct / IDEAL_DEEP_REM_PCT, 0, 1) * 30

  // 連続性点(0-30): 睡眠効率を主軸に、分断された夜を強く減点。効率72%→0、95%→満点。
  // さらに完全な覚醒（5分以上を想定）が3回を超える分を軽く減点。
  const effPts = clamp((s.efficiency - 72) / (95 - 72), 0, 1) * 30
  const awakePenalty = Math.max(0, s.awakeCount - 3) * 2
  const continuityPts = clamp(effPts - awakePenalty, 0, 30)

  const total = clamp100(durationPts + soundPts + continuityPts)

  return {
    score: total,
    label: scoreLabel(total, 'sleep'),
    provisional,
    contributions: [
      { key: 'duration', label: '睡眠時間', value: Math.round(durationPts), max: 40 },
      { key: 'sound', label: '熟睡', value: Math.round(soundPts), max: 30 },
      { key: 'continuity', label: '連続性', value: Math.round(continuityPts), max: 30 },
    ],
  }
}

/** 直近ウィンドウ（当日を末尾に含む）でメトリクスを平滑化した値。正の値のみ平均する。 */
function smooth(recent: RawDay[], pick: (d: RawDay) => number, fallback: number): number {
  const vals = recent.map(pick).filter(v => v > 0)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : fallback
}

/**
 * エナジースコア（0-100）＝ HRV(35) ＋ 睡眠(35) ＋ 安静時心拍(30)
 *
 * 公式のエナジースコアは「睡眠・HRV・安静時心拍(RHR)」の3要素のみで決まり、歩数などの
 * 活動量は含まれない。また公式は「過去1週間」「数日間にわたって」と複数日の傾向を重視し、
 * 単日の乱れではスコアが大きく動かない。そのため HRV・RHR は直近数日で平滑化した値を
 * 個人ベースラインと比較する。ベースライン付近では各要素とも満点の6割を基準点とする。
 *
 * @param sleepScore 前夜の睡眠スコア（computeSleepScore の結果）
 * @param recent 当日を末尾に含む直近ウィンドウ（HRV・RHRの平滑化に使用）
 */
export function computeEnergyScore(
  day: RawDay,
  sleepScore: ScoreDetail,
  baseline: Baseline,
  recent: RawDay[]
): ScoreDetail {
  // HRV点(0-35): 平滑化HRV / ベースライン比。ベースライン(比1.0)で6割、±25%で0/満点。
  let hrvPts = 21 // 未確立時は6割
  if (baseline.hrv && baseline.hrv > 0) {
    const smoothedHrv = smooth(recent, d => d.hrv, baseline.hrv)
    const ratio = smoothedHrv / baseline.hrv // 1.0 で標準
    hrvPts = clamp(((ratio - 0.7) / 0.5) * 35, 0, 35)
  }

  // 睡眠点(0-35): 前夜の睡眠スコアを 0-35 にスケール
  const sleepPts = ((sleepScore.score ?? 55) / 100) * 35

  // 安静時心拍点(0-30): 平滑化RHRがベースラインより低いほど回復している。
  // ベースライン付近で6割、-5bpm(下)で満点側、+5bpm(上)で0側。
  let rhrPts = 18 // 未確立時は6割
  if (baseline.restingHeartRate && baseline.restingHeartRate > 0) {
    const smoothedRhr = smooth(recent, d => d.restingHeartRate, baseline.restingHeartRate)
    const delta = baseline.restingHeartRate - smoothedRhr // 正=ベースラインより低い=良好
    rhrPts = clamp((0.6 + (delta / 5) * 0.4) * 30, 0, 30)
  }

  const provisional = baseline.days < MIN_BASELINE_DAYS
  const total = clamp100(hrvPts + sleepPts + rhrPts)

  return {
    score: total,
    label: scoreLabel(total, 'energy'),
    provisional,
    contributions: [
      { key: 'hrv', label: '心拍変動', value: Math.round(hrvPts), max: 35 },
      { key: 'sleep', label: '睡眠', value: Math.round(sleepPts), max: 35 },
      { key: 'rhr', label: '安静時心拍', value: Math.round(rhrPts), max: 30 },
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
    const energy = computeEnergyScore(day, sleep, baseline, history.slice(Math.max(0, i - 2), i + 1))
    return { date: day.date, energy: energy.score, sleep: sleep.score }
  })
}
