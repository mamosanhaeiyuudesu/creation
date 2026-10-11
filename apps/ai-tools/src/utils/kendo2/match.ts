// 第2弾の試合進行。stepMatch を1回呼ぶと1フレーム進む（乱数・時刻を使わない）。
//
//   ready ─(READY_FRAMES)→ fight ─(有効打突)→ ippon ─(IPPON_FRAMES)→ ready …
//                                                   └(規定本数に達した)→ end ─(スタート)→ 新しい試合
import { DEFAULT_POINTS_TO_WIN, IPPON_FRAMES, NUKI_DO_RATE, READY_FRAMES, START_X } from './constants'
import { createFighter, EVADE_KUZURE_FRAMES, markBlocked, markEvaded, markHit, markKuzure, stepFighter } from './fighter'
import { isNuki, judgeStrike } from './hit'
import type { StrikeOutcome } from './hit'
import { separate } from './maai'
import type { Action, ActionSet, Fighter, MatchEvent, MatchPhase, MatchRules, MatchState, PlayerInput } from './types'

export const ACTIONS: readonly Action[] = ['left', 'right', 'men', 'kote', 'do', 'tsuki', 'guardKote', 'guardMen', 'start']

export const NO_ACTIONS: ActionSet = {
  left: false,
  right: false,
  men: false,
  kote: false,
  do: false,
  tsuki: false,
  guardKote: false,
  guardMen: false,
  start: false,
}

export const NO_INPUT: PlayerInput = { held: NO_ACTIONS, pressed: NO_ACTIONS }

/** 抜き胴の当たり回か。フレーム番号と選手から決まる擬似乱数（同じ試合なら同じ結果） */
function nukiRoll(frame: number, id: number): boolean {
  let h = (Math.imul(frame + 1, 2654435761) ^ Math.imul(id + 7, 40503)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 < NUKI_DO_RATE
}

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

function coast(s: MatchState): MatchState {
  const fighters = separate(stepFighter(s.fighters[0], NO_INPUT), stepFighter(s.fighters[1], NO_INPUT))
  return { ...s, fighters }
}

/** 防がれた・外れた打突を反映する（一本が出なかったとき） */
function applyNonHit(
  fighters: [Fighter, Fighter],
  by: 0 | 1,
  outcome: StrikeOutcome,
  events: MatchEvent[],
): [Fighter, Fighter] {
  const other = by === 0 ? 1 : 0
  const attacker = fighters[by]
  const technique = attacker.technique!
  const out: [Fighter, Fighter] = [fighters[0], fighters[1]]
  if (outcome === 'blocked') {
    out[by] = markKuzure(attacker)
    out[other] = markBlocked(fighters[other], technique)
    events.push({ type: 'blocked', by: fighters[other].id, technique })
  } else if (outcome === 'evaded') {
    out[by] = markKuzure(attacker, EVADE_KUZURE_FRAMES)
    out[other] = markEvaded(fighters[other], technique)
    events.push({ type: 'evaded', by: fighters[other].id, technique })
  } else if (outcome === 'miss') {
    out[by] = { ...attacker, hasHit: true }
    events.push({ type: 'miss', by: attacker.id, technique })
  }
  return out
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
      const stepped: [Fighter, Fighter] = [stepFighter(s.fighters[0], inputs[0]), stepFighter(s.fighters[1], inputs[1])]
      for (const f of stepped) {
        const before = s.fighters[f.id]
        if (f.phase === 'windup' && before.phase !== 'windup') {
          // 抜き胴の当たり外れは打ち始めの1回だけ決める（フレーム番号から決まるので乱数は使わない）
          stepped[f.id] = { ...f, nukiOk: f.technique === 'do' && nukiRoll(s.frame, f.id) }
          events.push({ type: 'strike', by: f.id, technique: f.technique!, kaeshi: f.strikeKaeshiFrom !== null })
        }
      }
      let fighters = separate(stepped[0], stepped[1])
      let outcomes: [StrikeOutcome, StrikeOutcome] = [judgeStrike(fighters[0], fighters[1]), judgeStrike(fighters[1], fighters[0])]

      // 相打ちでも、抜き胴が決まった側が一本（面は抜かれている）
      const nuki0 = outcomes[0] === 'hit' && isNuki(fighters[0], fighters[1])
      const nuki1 = outcomes[1] === 'hit' && isNuki(fighters[1], fighters[0])
      if (nuki0) outcomes = ['hit', 'none']
      else if (nuki1) outcomes = ['none', 'hit']

      if (outcomes[0] === 'hit' && outcomes[1] === 'hit') {
        fighters = [{ ...fighters[0], hasHit: true }, { ...fighters[1], hasHit: true }]
        events.push({ type: 'aiuchi' })
        s = { ...s, fighters }
        break
      }

      const scorer = outcomes[0] === 'hit' ? 0 : outcomes[1] === 'hit' ? 1 : null
      if (scorer !== null) {
        const loser = scorer === 0 ? 1 : 0
        const attacker = fighters[scorer]
        const technique = attacker.technique!
        const kaeshiFrom = attacker.strikeKaeshiFrom
        const nuki = scorer === 0 ? nuki0 : nuki1
        const evade = attacker.strikeEvade
        const next: [Fighter, Fighter] = [fighters[0], fighters[1]]
        next[scorer] = { ...attacker, hasHit: true }
        next[loser] = markHit(next[loser])
        const scores: [number, number] = [s.scores[0], s.scores[1]]
        scores[scorer] += 1
        const winner = scores[scorer] >= s.rules.pointsToWin ? scorer : null
        events.push({ type: 'ippon', by: scorer, technique, kaeshiFrom, nuki, evade })
        s = toPhase(
          {
            ...s,
            fighters: next,
            scores,
            winner,
            points: [...s.points, { by: scorer, technique, kaeshiFrom, nuki, evade, frame: s.frame }],
          },
          'ippon',
        )
        break
      }

      fighters = applyNonHit(fighters, 0, outcomes[0], events)
      fighters = applyNonHit(fighters, 1, outcomes[1], events)
      s = { ...s, fighters }
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
