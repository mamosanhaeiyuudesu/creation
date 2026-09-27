// 第0弾の試合進行。ボタン1つ（どれでも面）・間合いは自動で近づいたり離れたりする。
// stepMatch を1回呼ぶと1フレーム進む。乱数は rules.seed から決まるので、同じ入力なら必ず同じ結果になる。
//
//   ready ─(READY_FRAMES)→ fight ─(面が当たった)→ ippon ─(IPPON_FRAMES)→ ready …
//                                                    └(規定本数)→ end ─(スタート)→ 新しい試合
//   プレイヤー: idle ─(ボタン)→ windup（年齢で長さが違う）→ active ─(当たらなかった)→ whiff → idle
import { nextRandom } from '../kendo-shared/rng'
import {
  ACTIVE_FRAMES,
  AUTO_WALK,
  DEFAULT_POINTS_TO_WIN,
  FAR_GAP,
  GAP_HOLD,
  HIT_DISTANCE,
  IPPON_FRAMES,
  NEAR_GAP,
  READY_FRAMES,
  START_GAP,
  WHIFF_FRAMES,
  WINDUP_BY_AGE,
} from './constants'
import type { ActionSet, Age, Fighter, FighterPhase, MatchEvent, MatchPhase, MatchRules, MatchState, PlayerId, PlayerInput } from './types'

export const NO_ACTIONS: ActionSet = { strike: false, start: false }
export const NO_INPUT: PlayerInput = { held: NO_ACTIONS, pressed: NO_ACTIONS }

export const DEFAULT_RULES: MatchRules = { pointsToWin: DEFAULT_POINTS_TO_WIN, ages: ['elementary', 'elementary'], seed: 1 }

export function createFighter(id: PlayerId, x: number, age: Age): Fighter {
  return { id, x, facing: id === 0 ? 1 : -1, age, phase: 'idle', phaseFrame: 0, hasHit: false }
}

function startingFighters(rules: MatchRules): [Fighter, Fighter] {
  return [createFighter(0, -START_GAP / 2, rules.ages[0]), createFighter(1, START_GAP / 2, rules.ages[1])]
}

export function createMatch(rules: MatchRules = DEFAULT_RULES): MatchState {
  return {
    rules,
    frame: 0,
    phase: 'ready',
    phaseFrame: 0,
    fighters: startingFighters(rules),
    targetGap: START_GAP,
    gapTimer: GAP_HOLD[0],
    rng: rules.seed >>> 0,
    scores: [0, 0],
    points: [],
    winner: null,
    events: [],
  }
}

export function distanceBetween(s: { fighters: readonly [Fighter, Fighter] }): number {
  return Math.abs(s.fighters[1].x - s.fighters[0].x)
}

/** 面が届く距離か（＝床が光って「いまだ！」） */
export function inZone(s: { fighters: readonly [Fighter, Fighter] }): boolean {
  return distanceBetween(s) <= HIT_DISTANCE
}

function enter(f: Fighter, phase: FighterPhase): Fighter {
  return { ...f, phase, phaseFrame: 0 }
}

export function stepFighter(f: Fighter, input: PlayerInput): Fighter {
  const next = f.phaseFrame + 1
  switch (f.phase) {
    case 'idle':
      return input.pressed.strike ? { ...enter(f, 'windup'), hasHit: false } : { ...f, phaseFrame: next }
    case 'windup':
      return next >= WINDUP_BY_AGE[f.age] ? enter(f, 'active') : { ...f, phaseFrame: next }
    case 'active':
      // 判定中に当たらなければ空振り（当たったときは試合進行側が hasHit を立てる）
      return next >= ACTIVE_FRAMES ? enter(f, f.hasHit ? 'idle' : 'whiff') : { ...f, phaseFrame: next }
    case 'whiff':
      return next >= WHIFF_FRAMES ? enter(f, 'idle') : { ...f, phaseFrame: next }
    case 'hit':
      return { ...f, phaseFrame: next }
  }
}

/** 間合いの自動変化: 目標距離に向かって歩き、時間が来たら「遠い↔近い」を入れ替えて選び直す */
function stepGap(s: MatchState): MatchState {
  let { targetGap, gapTimer, rng } = s
  gapTimer -= 1
  if (gapTimer <= 0) {
    const [r1, s1] = nextRandom(rng)
    const [r2, s2] = nextRandom(s1)
    const range = targetGap > HIT_DISTANCE ? NEAR_GAP : FAR_GAP
    targetGap = range[0] + (range[1] - range[0]) * r1
    gapTimer = Math.round(GAP_HOLD[0] + (GAP_HOLD[1] - GAP_HOLD[0]) * r2)
    rng = s2
  }
  // 打っている人は立ち止まり、構えている人だけが歩く
  const center = (s.fighters[0].x + s.fighters[1].x) / 2
  const fighters = s.fighters.map((f) => {
    if (f.phase !== 'idle') return f
    const goal = center - (f.facing * targetGap) / 2
    const dx = goal - f.x
    return { ...f, x: f.x + Math.sign(dx) * Math.min(AUTO_WALK, Math.abs(dx)) }
  }) as [Fighter, Fighter]
  return { ...s, targetGap, gapTimer, rng, fighters }
}

/** このフレームで当たるか（判定中・まだ当たっていない・届く距離・相手が一本を取られていない） */
export function strikeLands(attacker: Fighter, defender: Fighter): boolean {
  return (
    attacker.phase === 'active' &&
    !attacker.hasHit &&
    defender.phase !== 'hit' &&
    Math.abs(attacker.x - defender.x) <= HIT_DISTANCE
  )
}

function toPhase(s: MatchState, phase: MatchPhase): MatchState {
  return { ...s, phase, phaseFrame: 0 }
}

export function stepMatch(prev: MatchState, inputs: readonly [PlayerInput, PlayerInput]): MatchState {
  const events: MatchEvent[] = []
  let s: MatchState = { ...prev, frame: prev.frame + 1, phaseFrame: prev.phaseFrame + 1, events }

  switch (s.phase) {
    case 'ready':
      if (s.phaseFrame >= READY_FRAMES) {
        s = toPhase(s, 'fight')
        events.push({ type: 'hajime' })
      }
      break

    case 'fight': {
      const stepped = [stepFighter(s.fighters[0], inputs[0]), stepFighter(s.fighters[1], inputs[1])] as [Fighter, Fighter]
      for (const f of stepped) {
        const before = s.fighters[f.id]
        if (f.phase === 'windup' && before.phase !== 'windup') events.push({ type: 'strike', by: f.id })
        if (f.phase === 'whiff' && before.phase !== 'whiff') events.push({ type: 'whiff', by: f.id })
      }
      s = stepGap({ ...s, fighters: stepped })
      const [a, b] = s.fighters
      const aLands = strikeLands(a, b)
      const bLands = strikeLands(b, a)
      if (aLands && bLands) {
        events.push({ type: 'aiuchi' })
        s = { ...s, fighters: [{ ...a, hasHit: true }, { ...b, hasHit: true }] }
      } else if (aLands || bLands) {
        const by: PlayerId = aLands ? 0 : 1
        const loser: PlayerId = by === 0 ? 1 : 0
        const fighters: [Fighter, Fighter] = [a, b]
        fighters[by] = { ...fighters[by], hasHit: true }
        fighters[loser] = enter(fighters[loser], 'hit')
        const scores: [number, number] = [s.scores[0], s.scores[1]]
        scores[by] += 1
        const winner = scores[by] >= s.rules.pointsToWin ? by : null
        events.push({ type: 'ippon', by })
        s = toPhase({ ...s, fighters, scores, winner, points: [...s.points, { by, frame: s.frame }] }, 'ippon')
      }
      break
    }

    case 'ippon': {
      const fighters = s.fighters.map((f) => stepFighter(f, NO_INPUT)) as [Fighter, Fighter]
      s = { ...s, fighters }
      if (s.phaseFrame >= IPPON_FRAMES) {
        const winner = s.winner
        if (winner !== null) {
          s = toPhase(s, 'end')
          events.push({ type: 'shobuari', winner })
        } else {
          s = toPhase(
            { ...s, fighters: startingFighters(s.rules), targetGap: START_GAP, gapTimer: GAP_HOLD[0] },
            'ready',
          )
        }
      }
      break
    }

    case 'end':
      if (inputs[0].pressed.start || inputs[1].pressed.start) {
        // 再戦は間合いの動きが前の試合と同じにならないよう、種をずらす
        return createMatch({ ...s.rules, seed: (s.rules.seed + 1) >>> 0 })
      }
      break
  }
  return s
}
