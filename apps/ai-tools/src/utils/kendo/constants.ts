// 調整用の数値はすべてここに集める。単位は 距離=m、時間=フレーム（60fps）。
import type { Part, Technique } from './types'

export const FPS = 60

export interface StrikeData {
  /** 振りかぶり（判定なし） */
  windup: number
  /** 打突判定が出ているフレーム数 */
  active: number
  /** 戻り（この間は動けない＝打たれやすい） */
  recovery: number
  /** 自分の位置から、狙う部位までの距離がこれ以下なら届く */
  reach: number
  /** 振りかぶりの間に前へ踏み込む距離 */
  lunge: number
}

export const STRIKES: Readonly<Record<Technique, StrikeData>> = {
  men: { windup: 10, active: 4, recovery: 18, reach: 1.8, lunge: 0.5 },
  // 小手は竹刀の届く距離が短いが、部位（手元）が相手の体より前にあるぶん近い
  kote: { windup: 7, active: 4, recovery: 14, reach: 1.55, lunge: 0.35 },
  do: { windup: 12, active: 5, recovery: 20, reach: 1.7, lunge: 0.45 },
}

/** 技ごとに狙う部位。ステップ2で応じ技を足すときも部位はここで引く */
export const TECHNIQUE_PART: Readonly<Record<Technique, Part>> = {
  men: 'men',
  kote: 'kote',
  do: 'do',
}

/** 部位が体の中心からどれだけ前（相手側）にあるか */
export const PART_OFFSET: Readonly<Record<Part, number>> = {
  men: 0,
  kote: 0.3,
  do: 0,
}

/** 前進・後退の速さ（m/フレーム） */
export const WALK_FORWARD = 0.045
export const WALK_BACK = 0.04

/** 試合場の端（中心からの距離）。ここより外には出られない */
export const STAGE_HALF = 5

/** 開始位置（中心からの距離）。遠間から始まるようにしている */
export const START_X = 1.6

/** 体どうしがこれ以上近づかないように押し戻す距離（近間の下限） */
export const MIN_GAP = 0.8

/** これ未満の距離を近間と呼ぶ */
export const CHIKAMA_DISTANCE = 1.3

/**
 * 一足一刀の間合い（中心どうしの距離）。どれか1つの技が踏み込んで届く最大距離。
 * フレームデータから計算するので、STRIKES を変えれば自動で追従する。
 */
export const ISSOKU_DISTANCE = Math.max(
  ...(Object.keys(STRIKES) as Technique[]).map(
    (t) => STRIKES[t].reach + STRIKES[t].lunge + PART_OFFSET[TECHNIQUE_PART[t]],
  ),
)

/** 「はじめ」までの待ち */
export const READY_FRAMES = 60
/** 一本の旗を上げている時間 */
export const IPPON_FRAMES = 120

export const DEFAULT_POINTS_TO_WIN = 2
