// 剣道ゲームの型。ロジック（utils/kendo/）は Three.js・Vue・DOM のどれにも依存させない。
// 描画やUIはここにある状態を毎フレーム受け取って反映するだけにする。

export type PlayerId = 0 | 1

/** 打突の種類。ステップ2で応じ技・引き技を足すときはここに追加する */
export type Technique = 'men' | 'kote' | 'do'

/** 打突部位。ステップ1では技と部位が1対1（面→面 など） */
export type Part = 'men' | 'kote' | 'do'

/** 画面上の向き。+1 = 右向き（赤・P1）、-1 = 左向き（白・P2） */
export type Facing = 1 | -1

/**
 * ゲーム内アクション。コントローラーやキーボードの割り当てはこの名前に変換してから渡す。
 * ステップ2で kiai（気合）・seme（攻め）などを足す想定。
 */
export type Action = 'left' | 'right' | 'men' | 'kote' | 'do' | 'start'

export type ActionSet = Readonly<Record<Action, boolean>>

export interface PlayerInput {
  /** 押し続けている */
  held: ActionSet
  /** このフレームで押した瞬間 */
  pressed: ActionSet
}

export type FighterPhase =
  | 'idle'     // 構え
  | 'move'     // 前進・後退中
  | 'windup'   // 振りかぶり
  | 'active'   // 打突判定中
  | 'recovery' // 戻り（残心）
  | 'hit'      // 被打突（一本を取られた）

export interface Fighter {
  id: PlayerId
  /** 床の上の位置（m）。移動は x 軸の1軸のみ */
  x: number
  facing: Facing
  phase: FighterPhase
  /** 今の phase に入ってからのフレーム数（入った瞬間が 0） */
  phaseFrame: number
  /** windup/active/recovery 中の技。それ以外は null */
  technique: Technique | null
  /** この打突がすでに当たった（1回の打突で当たるのは1度だけ） */
  hasHit: boolean
}

export type Maai = 'toma' | 'issoku' | 'chikama'

export type MatchPhase =
  | 'ready'  // 開始位置で「はじめ」待ち
  | 'fight'  // 勝負中
  | 'ippon'  // 一本の旗を上げている
  | 'end'    // 勝負あり（再戦待ち）

export interface Point {
  by: PlayerId
  technique: Technique
  /** 試合開始からのフレーム数 */
  frame: number
}

export type MatchEvent =
  | { type: 'strike'; by: PlayerId; technique: Technique }
  | { type: 'ippon'; by: PlayerId; technique: Technique }
  | { type: 'aiuchi' }
  | { type: 'hajime' }
  | { type: 'shobuari'; winner: PlayerId }

export interface MatchRules {
  /** 何本先取で勝ちか（三本勝負なら 2） */
  pointsToWin: number
}

export interface MatchState {
  rules: MatchRules
  /** 試合開始からのフレーム数 */
  frame: number
  phase: MatchPhase
  phaseFrame: number
  fighters: readonly [Fighter, Fighter]
  scores: readonly [number, number]
  points: readonly Point[]
  winner: PlayerId | null
  /** このフレームで起きた出来事（効果音・演出用）。毎フレーム作り直す */
  events: readonly MatchEvent[]
}
