// 剣道ゲーム第0弾（幼稚園児と小学生が互角に遊べる、ボタン1つの剣道）の型。
// ロジックは Three.js・Vue・DOM のどれにも依存させない。

export type PlayerId = 0 | 1

export type Facing = 1 | -1

/** 年齢。竹刀の速さ（押してから当たるまで）が変わる＝反応の速さの差を埋めるハンデ */
export type Age = 'kinder' | 'elementary' | 'adult'

/** A/B/X/Y のどれでも strike（面） */
export type Action = 'strike' | 'start'

export type ActionSet = Readonly<Record<Action, boolean>>

export interface PlayerInput {
  held: ActionSet
  pressed: ActionSet
}

export type FighterPhase =
  | 'idle'     // 構え（間合いは自動で動く）
  | 'windup'   // 振りかぶり（年齢で長さが違う）
  | 'active'   // 打突判定中
  | 'whiff'    // 空振りのあとの休み（連打で当たらないように）
  | 'hit'      // 一本を取られた

export interface Fighter {
  id: PlayerId
  x: number
  facing: Facing
  age: Age
  phase: FighterPhase
  phaseFrame: number
  hasHit: boolean
}

export type MatchPhase = 'ready' | 'fight' | 'ippon' | 'end'

export interface Point {
  by: PlayerId
  frame: number
}

export type MatchEvent =
  | { type: 'strike'; by: PlayerId }
  | { type: 'ippon'; by: PlayerId }
  | { type: 'whiff'; by: PlayerId }
  | { type: 'aiuchi' }
  | { type: 'hajime' }
  | { type: 'shobuari'; winner: PlayerId }

export interface MatchRules {
  pointsToWin: number
  /** 赤・白それぞれの年齢 */
  ages: readonly [Age, Age]
  /** 間合いの動きを決める乱数の種 */
  seed: number
}

export interface MatchState {
  rules: MatchRules
  frame: number
  phase: MatchPhase
  phaseFrame: number
  fighters: readonly [Fighter, Fighter]
  /** 2人が今めざしている距離（自動で近づいたり離れたりする） */
  targetGap: number
  /** targetGap を次に選び直すまでの残りフレーム */
  gapTimer: number
  /** 乱数の状態 */
  rng: number
  scores: readonly [number, number]
  points: readonly Point[]
  winner: PlayerId | null
  events: readonly MatchEvent[]
}
