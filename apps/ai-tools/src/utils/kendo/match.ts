// 試合進行。stepMatch を1回呼ぶと1フレーム進む。同じ入力なら必ず同じ結果になる（乱数・時刻を使わない）。
//
//   ready ─(READY_FRAMES)→ fight ─(有効打突)→ ippon ─(IPPON_FRAMES)→ ready …
//                                                   └(規定本数に達した)→ end ─(スタート)→ 新しい試合
import { DEFAULT_POINTS_TO_WIN, IPPON_FRAMES, READY_FRAMES, START_X } from './constants'
import { createFighter, markHit, stepFighter } from './fighter'
import { resolveHits } from './hit'
import { separate } from './maai'
import type { Action, ActionSet, Fighter, MatchEvent, MatchPhase, MatchRules, MatchState, PlayerInput } from './types'

export const ACTIONS: readonly Action[] = ['left', 'right', 'men', 'kote', 'do', 'start']

export const NO_ACTIONS: ActionSet = { left: false, right: false, men: false, kote: false, do: false, start: false }

export const NO_INPUT: PlayerInput = { held: NO_ACTIONS, pressed: NO_ACTIONS }

function startingFighters(): [Fighter, Fighter] {
  return [createFighter(0, -START_X, 1), createFighter(1, START_X, -1)]
}

export function createMatch(rules: MatchRules = { pointsToWin: DEFAULT_POINTS_TO_WIN }): MatchState {
  return {
    rules,
    frame: 0,
    phase: 'ready',
    phaseFrame: 0,
    fighters: startingFighters(),
    scores: [0, 0],
    points: [],
    winner: null,
    events: [],
  }
}

function toPhase(s: MatchState, phase: MatchPhase): MatchState {
  return { ...s, phase, phaseFrame: 0 }
}

/** 入力なしで体だけ進める（一本後の残心など） */
function coast(s: MatchState): MatchState {
  const fighters = separate(stepFighter(s.fighters[0], NO_INPUT), stepFighter(s.fighters[1], NO_INPUT))
  return { ...s, fighters }
}

export function stepMatch(prev: MatchState, inputs: readonly [PlayerInput, PlayerInput]): MatchState {
  const events: MatchEvent[] = []
  let s: MatchState = { ...prev, frame: prev.frame + 1, phaseFrame: prev.phaseFrame + 1, events }

  switch (s.phase) {
    case 'ready': {
      if (s.phaseFrame >= READY_FRAMES) {
        s = toPhase(s, 'fight')
        events.push({ type: 'hajime' })
      }
      break
    }

    case 'fight': {
      const stepped = [stepFighter(s.fighters[0], inputs[0]), stepFighter(s.fighters[1], inputs[1])] as const
      for (const f of stepped) {
        const before = s.fighters[f.id]
        if (f.phase === 'windup' && before.phase !== 'windup') events.push({ type: 'strike', by: f.id, technique: f.technique! })
      }
      let fighters = separate(stepped[0], stepped[1])
      const hit = resolveHits(fighters[0], fighters[1])

      if (hit.kind === 'aiuchi') {
        fighters = [{ ...fighters[0], hasHit: true }, { ...fighters[1], hasHit: true }]
        events.push({ type: 'aiuchi' })
        s = { ...s, fighters }
      } else if (hit.kind === 'ippon') {
        const loser = hit.by === 0 ? 1 : 0
        const next: [Fighter, Fighter] = [fighters[0], fighters[1]]
        next[hit.by] = { ...next[hit.by], hasHit: true }
        next[loser] = markHit(next[loser])
        const scores: [number, number] = [s.scores[0], s.scores[1]]
        scores[hit.by] += 1
        const winner = scores[hit.by] >= s.rules.pointsToWin ? hit.by : null
        events.push({ type: 'ippon', by: hit.by, technique: hit.technique })
        s = toPhase(
          { ...s, fighters: next, scores, winner, points: [...s.points, { by: hit.by, technique: hit.technique, frame: s.frame }] },
          'ippon',
        )
      } else {
        s = { ...s, fighters }
      }
      break
    }

    case 'ippon': {
      s = coast(s)
      if (s.phaseFrame >= IPPON_FRAMES) {
        const winner = s.winner
        if (winner !== null) {
          s = toPhase(s, 'end')
          events.push({ type: 'shobuari', winner })
        } else {
          s = toPhase({ ...s, fighters: startingFighters() }, 'ready')
        }
      }
      break
    }

    case 'end': {
      if (inputs[0].pressed.start || inputs[1].pressed.start) return createMatch(s.rules)
      s = coast(s)
      break
    }
  }
  return s
}
