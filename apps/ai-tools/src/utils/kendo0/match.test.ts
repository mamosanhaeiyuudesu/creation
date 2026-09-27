import { describe, expect, it } from 'vitest'
import { Kendo0Com, createKendo0Com } from './com'
import { HIT_DISTANCE, IPPON_FRAMES, READY_FRAMES, WHIFF_FRAMES, WINDUP_BY_AGE } from './constants'
import { createFighter, createMatch, DEFAULT_RULES, inZone, NO_INPUT, stepFighter, stepMatch } from './match'
import type { Age, MatchRules, MatchState, PlayerId, PlayerInput } from './types'

const press: PlayerInput = { held: { strike: true, start: false }, pressed: { strike: true, start: false } }
const start: PlayerInput = { held: { strike: false, start: true }, pressed: { strike: false, start: true } }
const idle: [PlayerInput, PlayerInput] = [NO_INPUT, NO_INPUT]

function run(s: MatchState, frames: number, inputs: [PlayerInput, PlayerInput] = idle): MatchState {
  for (let i = 0; i < frames; i++) s = stepMatch(s, inputs)
  return s
}

/** 「はじめ」まで進めてから、2人を距離 d に置き直す */
function fightingAt(d: number, ages: [Age, Age] = ['elementary', 'elementary']): MatchState {
  const s = run(createMatch({ ...DEFAULT_RULES, ages }), READY_FRAMES)
  return { ...s, fighters: [createFighter(0, -d / 2, ages[0]), createFighter(1, d / 2, ages[1])], targetGap: d, gapTimer: 1000 }
}

describe('プレイヤー', () => {
  for (const age of ['kinder', 'elementary', 'adult'] as Age[]) {
    it(`${age}: 押してから WINDUP_BY_AGE（${WINDUP_BY_AGE[age]}f）で判定が出る`, () => {
      let f = stepFighter(createFighter(0, 0, age), press)
      for (let i = 0; i < WINDUP_BY_AGE[age] - 1; i++) f = stepFighter(f, NO_INPUT)
      expect(f.phase).toBe('windup')
      expect(stepFighter(f, NO_INPUT).phase).toBe('active')
    })
  }

  it('空振りすると WHIFF_FRAMES の間は押しても打てない', () => {
    let s = fightingAt(HIT_DISTANCE + 0.5)
    s = stepMatch(s, [press, NO_INPUT])
    s = run(s, WINDUP_BY_AGE.elementary + 4)
    expect(s.fighters[0].phase).toBe('whiff')
    expect(s.events.some((e) => e.type === 'whiff') || s.fighters[0].phaseFrame > 0).toBe(true)
    s = stepMatch(s, [press, NO_INPUT])
    expect(s.fighters[0].phase).toBe('whiff')
    s = run(s, WHIFF_FRAMES)
    expect(s.fighters[0].phase).toBe('idle')
  })
})

describe('一本', () => {
  it('届く距離で打てば一本', () => {
    let s = fightingAt(1.8)
    s = stepMatch(s, [press, NO_INPUT])
    s = run(s, WINDUP_BY_AGE.elementary)
    expect(s.phase).toBe('ippon')
    expect(s.scores).toEqual([1, 0])
  })

  it('同時に押すと、振りかぶりの短い幼稚園児が先に当たる（年齢のハンデ）', () => {
    let s = fightingAt(1.8, ['adult', 'kinder'])
    s = stepMatch(s, [press, press])
    s = run(s, WINDUP_BY_AGE.kinder)
    expect(s.phase).toBe('ippon')
    expect(s.points[0]!.by).toBe(1)
  })

  it('同じ年齢で同時に押すと相打ち', () => {
    let s = fightingAt(1.8)
    s = stepMatch(s, [press, press])
    s = run(s, WINDUP_BY_AGE.elementary)
    expect(s.events).toContainEqual({ type: 'aiuchi' })
    expect(s.phase).toBe('fight')
  })

  it('二本先取で勝負あり、スタートで再戦（間合いの動きは変わる）', () => {
    const take = (s: MatchState) => {
      s = { ...s, fighters: [createFighter(0, -0.9, 'elementary'), createFighter(1, 0.9, 'elementary')], targetGap: 1.8, gapTimer: 1000 }
      s = stepMatch(s, [press, NO_INPUT])
      return run(s, WINDUP_BY_AGE.elementary)
    }
    let s = run(take(run(createMatch(), READY_FRAMES)), IPPON_FRAMES)
    expect(s.phase).toBe('ready')
    s = run(take(run(s, READY_FRAMES)), IPPON_FRAMES)
    expect(s.phase).toBe('end')
    expect(s.winner).toBe(0)
    const seed = s.rules.seed
    s = stepMatch(s, [start, NO_INPUT])
    expect(s.phase).toBe('ready')
    expect(s.scores).toEqual([0, 0])
    expect(s.rules.seed).not.toBe(seed)
  })
})

describe('間合いの自動変化', () => {
  it('何もしなくても、数秒のうちに届く距離に入る', () => {
    let s = run(createMatch(), READY_FRAMES)
    let zoneFrames = 0
    for (let i = 0; i < 60 * 10; i++) {
      s = stepMatch(s, idle)
      if (inZone(s)) zoneFrames++
    }
    expect(zoneFrames).toBeGreaterThan(60)
    expect(zoneFrames).toBeLessThan(60 * 8) // ずっと光りっぱなしではない
  })

  it('同じ種なら同じ動き、違う種なら違う動き', () => {
    const xs = (seed: number) => {
      let s = run(createMatch({ ...DEFAULT_RULES, seed }), READY_FRAMES)
      const out: number[] = []
      for (let i = 0; i < 600; i++) {
        s = stepMatch(s, idle)
        out.push(s.fighters[0].x)
      }
      return out
    }
    expect(xs(7)).toEqual(xs(7))
    expect(xs(7)).not.toEqual(xs(8))
  })
})

/** COM 同士で1試合。決着しなければ null */
function playOut(rules: MatchRules, com0: Kendo0Com, com1: Kendo0Com): PlayerId | null {
  let s = createMatch(rules)
  for (let i = 0; i < 60 * 180 && s.phase !== 'end'; i++) s = stepMatch(s, [com0.decide(s), com1.decide(s)])
  return s.winner
}

function winRate(make0: (seed: number) => Kendo0Com, make1: (seed: number) => Kendo0Com, ages: [Age, Age], games = 30) {
  let wins = 0
  for (let g = 0; g < games; g++) {
    const w = playOut({ ...DEFAULT_RULES, ages, seed: 100 + g }, make0(g * 2 + 1), make1(g * 2 + 2))
    if (w === 0) wins++
  }
  return wins / games
}

/** 人の反応のモデル（幼稚園児 約0.55秒・小学4年生 約0.3秒、早押しのしやすさも違う） */
const KINDER_HUMAN = { reaction: 33, jitter: 9, early: 0.25 }
const ELEMENTARY_HUMAN = { reaction: 18, jitter: 5, early: 0.08 }

describe('COM', () => {
  it('強さ★5 は ★1 に大きく勝ち越す', () => {
    const rate = winRate((s) => createKendo0Com(5, s, 0), (s) => createKendo0Com(1, s, 1), ['elementary', 'elementary'])
    expect(rate).toBeGreaterThan(0.8)
  })

  it('★が上がるほど強い（★3 は ★2 に勝ち越す）', () => {
    const rate = winRate((s) => createKendo0Com(3, s, 0), (s) => createKendo0Com(2, s, 1), ['elementary', 'elementary'])
    expect(rate).toBeGreaterThan(0.5)
  })

  it('ハンデが効いている: 幼稚園児の反応(0.55秒)でも、小学生の反応(0.3秒)と互角に戦える', () => {
    const kinder = (s: number) => new Kendo0Com(KINDER_HUMAN, s, 0)
    const elementary = (s: number) => new Kendo0Com(ELEMENTARY_HUMAN, s, 1)
    const rate = winRate(kinder, elementary, ['kinder', 'elementary'], 40)
    expect(rate).toBeGreaterThan(0.25)
    expect(rate).toBeLessThan(0.75)
  })

  it('ハンデなし（どちらも小学生の竹刀）だと、幼稚園児の反応では勝ちにくい', () => {
    const kinder = (s: number) => new Kendo0Com(KINDER_HUMAN, s, 0)
    const elementary = (s: number) => new Kendo0Com(ELEMENTARY_HUMAN, s, 1)
    const rate = winRate(kinder, elementary, ['elementary', 'elementary'], 40)
    expect(rate).toBeLessThan(0.25)
  })
})
