// 第2弾の調整用の数値。単位は 距離=m、時間=フレーム（60fps）。コメントの秒数は目安。
// 子供の反応時間（約0.35秒）・大人（約0.25秒）を基準に、第1弾より全体を遅くしている。
import type { Guard, Technique } from './types'

export const FPS = 60

export interface StrikeData {
  windup: number
  active: number
  recovery: number
  /** 自分の位置から、狙う部位までの距離がこれ以下なら届く */
  reach: number
  /** 振りかぶりの間に前へ踏み込む距離 */
  lunge: number
}

// 届く距離（体の中心どうし＝reach + lunge + 部位の前寄り）は 小手 2.5 > 突き 2.4 > 面 2.3 > 胴 2.0
export const STRIKES: Readonly<Record<Technique, StrikeData>> = {
  kote: { windup: 15, active: 4, recovery: 18, reach: 1.8, lunge: 0.4 },  // 0.25秒 / 0.30秒
  tsuki: { windup: 17, active: 4, recovery: 30, reach: 1.9, lunge: 0.5 }, // 0.28秒 / 0.50秒（外すと隙が大きい）
  men: { windup: 18, active: 4, recovery: 21, reach: 1.8, lunge: 0.5 },   // 0.30秒 / 0.35秒
  do: { windup: 21, active: 5, recovery: 24, reach: 1.55, lunge: 0.45 },  // 0.35秒 / 0.40秒
}

/** 返し技: 振りかぶりが速い（届く距離・判定は元の技のまま） */
export const KAESHI_WINDUP = 9 // 0.15秒
export const KAESHI_RECOVERY = 21 // 0.35秒

/** 部位が体の中心からどれだけ前（相手側）にあるか */
export const PART_OFFSET: Readonly<Record<Technique, number>> = {
  men: 0,
  kote: 0.3,
  do: 0,
  tsuki: 0,
}

/**
 * 相手の構え（通常・面を防御・小手を防御）ごとに、どの技が入るか。
 * 崩れている相手には、どの技でも入る（hit.ts）。
 */
export type Stance = 'normal' | Guard
export const OPENINGS: Readonly<Record<Stance, Readonly<Record<Technique, boolean>>>> = {
  normal: { men: true, kote: false, do: false, tsuki: true },
  men: { men: false, kote: true, do: true, tsuki: false },
  kote: { men: true, kote: false, do: false, tsuki: false },
}

/** 防御ボタンを押してから効き始めるまで */
export const GUARD_STARTUP = 3 // 0.05秒
/** 防がれた側が崩れている時間（返し技の受付＋返し技の振りかぶりより長くする） */
export const KUZURE_FRAMES = 45 // 0.75秒
/** 防いだ瞬間から返し技を出せる時間 */
export const KAESHI_WINDOW = 30 // 0.5秒
/** 打突を始めてから次に打てるまで（返し技はこの間でも打てる） */
export const ATTACK_COOLDOWN = 90 // 1.5秒

/** 歩き（m/フレーム） */
export const WALK_FORWARD = 0.025 // 1.5m/秒
export const WALK_BACK = 0.0217 // 1.3m/秒
/** 防御中の歩きの倍率 */
export const GUARD_WALK_RATE = 0.5

/** 送り足: 横ボタンを押すたびに STEP_FRAMES で STEP_DISTANCE 進む。連打の間隔は STEP_INTERVAL 以上 */
export const STEP_DISTANCE = 0.3
export const STEP_FRAMES = 6 // 0.1秒
export const STEP_INTERVAL = 8 // 0.13秒 → 連打で約2.3m/秒

export const STAGE_HALF = 5
export const START_X = 1.7
export const MIN_GAP = 0.8
export const CHIKAMA_DISTANCE = 1.3

/** 一足一刀の間合い。どれか1つの技が踏み込んで届く最大距離（フレームデータから計算） */
export const ISSOKU_DISTANCE = Math.max(
  ...(Object.keys(STRIKES) as Technique[]).map((t) => STRIKES[t].reach + STRIKES[t].lunge + PART_OFFSET[t]),
)

export const READY_FRAMES = 60
export const IPPON_FRAMES = 150
export const DEFAULT_POINTS_TO_WIN = 2
