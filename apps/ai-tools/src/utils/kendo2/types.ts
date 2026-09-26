// 剣道ゲーム第2弾の型。第1弾（utils/kendo/）はそのまま残し、こちらは独立して拡張している。
// ロジックは Three.js・Vue・DOM のどれにも依存させない。

export type PlayerId = 0 | 1

export type Technique = 'men' | 'kote' | 'do' | 'tsuki'

/** 防御の種類。L＝小手を守る / R＝面を守る */
export type Guard = 'kote' | 'men'

/** 画面上の向き。+1 = 右向き（赤・P1）、-1 = 左向き（白・P2） */
export type Facing = 1 | -1

export type Action =
  | 'left'
  | 'right'
  | 'men'
  | 'kote'
  | 'do'
  | 'tsuki'
  | 'guardKote'
  | 'guardMen'
  | 'start'

export type ActionSet = Readonly<Record<Action, boolean>>

export interface PlayerInput {
  /** 押し続けている */
  held: ActionSet
  /** このフレームで押した瞬間 */
  pressed: ActionSet
}

export type FighterPhase =
  | 'idle'     // 構え
  | 'move'     // 歩いて前進・後退中
  | 'step'     // 送り足（横ボタンを押した瞬間の素早い一歩）
  | 'guard'    // 防御中（小手 or 面）
  | 'windup'   // 振りかぶり
  | 'active'   // 打突判定中
  | 'recovery' // 戻り
  | 'kuzure'   // 打突を防がれて崩れている（どこでも打たれる）
  | 'hit'      // 被打突（一本を取られた）

export interface Fighter {
  id: PlayerId
  x: number
  facing: Facing
  phase: FighterPhase
  /** 今の phase に入ってからのフレーム数（入った瞬間が 0） */
  phaseFrame: number
  /** windup/active/recovery 中の技。それ以外は null */
  technique: Technique | null
  /** この打突の結果がもう決まった（当たった・防がれた・外れた） */
  hasHit: boolean
  /** phase が guard のときの防御の種類 */
  guard: Guard | null
  /** step のときの向き（自分から見て +1 前 / -1 後ろ） */
  stepDir: -1 | 0 | 1
  /** 次に送り足を踏めるまでの残りフレーム */
  stepCooldown: number
  /** 次に打てるまでの残りフレーム（返し技はこれを無視できる） */
  attackCooldown: number
  /** 返し技を出せる残りフレーム（相手の打突を防いだ瞬間から） */
  kaeshiWindow: number
  /** 防いだ相手の技（「面返し胴」の「面」） */
  kaeshiFrom: Technique | null
  /** 今出している打突が返し技なら、その元になった技 */
  strikeKaeshiFrom: Technique | null
}

export type Maai = 'toma' | 'issoku' | 'chikama'

export type MatchPhase = 'ready' | 'fight' | 'ippon' | 'end'

export interface Point {
  by: PlayerId
  technique: Technique
  /** 返し技なら元になった技 */
  kaeshiFrom: Technique | null
  frame: number
}

export type MatchEvent =
  | { type: 'strike'; by: PlayerId; technique: Technique; kaeshi: boolean }
  | { type: 'ippon'; by: PlayerId; technique: Technique; kaeshiFrom: Technique | null }
  | { type: 'blocked'; by: PlayerId; technique: Technique }
  | { type: 'miss'; by: PlayerId; technique: Technique }
  | { type: 'aiuchi' }
  | { type: 'hajime' }
  | { type: 'shobuari'; winner: PlayerId }

export interface MatchRules {
  pointsToWin: number
}

export interface MatchState {
  rules: MatchRules
  frame: number
  phase: MatchPhase
  phaseFrame: number
  fighters: readonly [Fighter, Fighter]
  scores: readonly [number, number]
  points: readonly Point[]
  winner: PlayerId | null
  events: readonly MatchEvent[]
}
