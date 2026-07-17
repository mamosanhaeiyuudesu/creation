import type { SleepStage } from '~/types/fitbit'

/** 睡眠ステージの表示順（覚醒→レム→浅い→深い）と日本語ラベル */
export const SLEEP_STAGE_LEVELS: { stage: SleepStage; jp: string }[] = [
  { stage: 'wake', jp: '覚醒' },
  { stage: 'rem', jp: 'レム' },
  { stage: 'light', jp: '浅い' },
  { stage: 'deep', jp: '深い' },
]

export const SLEEP_STAGE_COLORS: Record<SleepStage, string> = {
  deep: '#4338ca',
  light: '#7dd3fc',
  rem: '#22d3ee',
  wake: '#fb923c',
}

/**
 * 各ステージの目安時間（分）。7時間睡眠を基準に、深い13〜23%・レム20〜25%・
 * 浅いは残りの約半分という一般的な配分から置いた値。
 * 覚醒は「少ないほど良い」ため目安を持たない（null）。
 */
export const SLEEP_STAGE_GOAL_MIN: Record<SleepStage, number | null> = {
  deep: 72,
  light: 210,
  rem: 90,
  wake: null,
}

export function sleepStageColor(s: SleepStage): string {
  return SLEEP_STAGE_COLORS[s]
}

export function sleepStageJp(s: SleepStage): string {
  return SLEEP_STAGE_LEVELS.find(l => l.stage === s)?.jp ?? s
}
