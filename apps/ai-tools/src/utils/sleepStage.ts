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

export function sleepStageColor(s: SleepStage): string {
  return SLEEP_STAGE_COLORS[s]
}

export function sleepStageJp(s: SleepStage): string {
  return SLEEP_STAGE_LEVELS.find(l => l.stage === s)?.jp ?? s
}
