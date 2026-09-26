import { describe, expect, it } from 'vitest'
import { IPPON_FRAMES, READY_FRAMES, START_X, STRIKES } from './constants'
import { createFighter } from './fighter'
import { createMatch, NO_INPUT, stepMatch } from './match'
import { press } from './test-helpers'
import type { MatchState, PlayerInput } from './types'

const idle: [PlayerInput, PlayerInput] = [NO_INPUT, NO_INPUT]

function run(s: MatchState, frames: number, inputs: [PlayerInput, PlayerInput] = idle): MatchState {
  for (let i = 0; i < frames; i++) s = stepMatch(s, inputs)
  return s
}

/** 「はじめ」まで進めてから、2人を距離 d に置き直す */
function fightingAt(d: number, s: MatchState = createMatch()): MatchState {
  s = run(s, READY_FRAMES)
  return { ...s, fighters: [createFighter(0, -d / 2, 1), createFighter(1, d / 2, -1)] }
}

/** P1 が technique を打って、一本になるまで進める */
function takePoint(s: MatchState, technique: 'men' | 'kote' | 'do', by: 0 | 1 = 0): MatchState {
  s = fightingAt(1.5, s)
  s = stepMatch(s, by === 0 ? [press(technique), NO_INPUT] : [NO_INPUT, press(technique)])
  return run(s, STRIKES[technique].windup)
}

describe('試合の開始', () => {
  it('ready から READY_FRAMES で fight になる', () => {
    let s = run(createMatch(), READY_FRAMES - 1)
    expect(s.phase).toBe('ready')
    s = stepMatch(s, idle)
    expect(s.phase).toBe('fight')
    expect(s.events).toContainEqual({ type: 'hajime' })
  })

  it('ready 中は打突も移動も受け付けない', () => {
    const s = stepMatch(createMatch(), [press('men'), NO_INPUT])
    expect(s.fighters[0].phase).toBe('idle')
    expect(s.fighters[0].x).toBe(-START_X)
  })
})

describe('一本', () => {
  it('打突が届くと一本になり、スコアと被打突が記録される', () => {
    const s = takePoint(createMatch(), 'men')
    expect(s.phase).toBe('ippon')
    expect(s.scores).toEqual([1, 0])
    expect(s.fighters[1].phase).toBe('hit')
    expect(s.points).toHaveLength(1)
    expect(s.points[0]).toMatchObject({ by: 0, technique: 'men' })
    expect(s.events).toContainEqual({ type: 'ippon', by: 0, technique: 'men' })
  })

  it('一本は active の最初のフレームで入る（windup ぶん遅れる）', () => {
    let s = fightingAt(1.5)
    s = stepMatch(s, [press('men'), NO_INPUT])
    s = run(s, STRIKES.men.windup - 1)
    expect(s.phase).toBe('fight')
    s = stepMatch(s, idle)
    expect(s.phase).toBe('ippon')
  })

  it('同時に打つと、振りかぶりの短い小手が先に入る', () => {
    let s = fightingAt(1.5)
    s = stepMatch(s, [press('men'), press('kote')])
    s = run(s, STRIKES.kote.windup)
    expect(s.phase).toBe('ippon')
    expect(s.points[0]).toMatchObject({ by: 1, technique: 'kote' })
  })

  it('同じ技を同時に打つと相打ちで、試合は続く', () => {
    let s = fightingAt(1.5)
    s = stepMatch(s, [press('men'), press('men')])
    s = run(s, STRIKES.men.windup)
    expect(s.events).toContainEqual({ type: 'aiuchi' })
    expect(s.phase).toBe('fight')
    expect(s.scores).toEqual([0, 0])
    // 相打ちになった打突で、次のフレームにもう一度当たったりしない
    s = run(s, STRIKES.men.active)
    expect(s.phase).toBe('fight')
  })

  it('遠間で打っても当たらない', () => {
    let s = fightingAt(START_X * 2)
    s = stepMatch(s, [press('men'), NO_INPUT])
    s = run(s, STRIKES.men.windup + STRIKES.men.active + STRIKES.men.recovery)
    expect(s.phase).toBe('fight')
    expect(s.fighters[0].phase).toBe('idle')
  })

  it('旗を IPPON_FRAMES 見せたあと、開始位置に戻って ready になる', () => {
    let s = takePoint(createMatch(), 'do')
    s = run(s, IPPON_FRAMES)
    expect(s.phase).toBe('ready')
    expect(s.fighters[0]).toMatchObject({ x: -START_X, phase: 'idle' })
    expect(s.fighters[1]).toMatchObject({ x: START_X, phase: 'idle' })
    expect(s.scores).toEqual([1, 0])
  })
})

describe('三本勝負', () => {
  function afterFlags(s: MatchState) {
    return run(s, IPPON_FRAMES)
  }

  it('二本先取で勝負あり、スタートで再戦できる', () => {
    let s = afterFlags(takePoint(createMatch(), 'men', 0))
    s = takePoint(s, 'kote', 0)
    expect(s.winner).toBe(0)
    expect(s.phase).toBe('ippon')

    s = afterFlags(s)
    expect(s.phase).toBe('end')
    expect(s.events).toContainEqual({ type: 'shobuari', winner: 0 })

    // 勝負あり後は打突しても何も起きない
    s = run(s, 30, [press('men'), press('men')])
    expect(s.phase).toBe('end')
    expect(s.scores).toEqual([2, 0])

    s = stepMatch(s, [NO_INPUT, press('start')])
    expect(s.phase).toBe('ready')
    expect(s.scores).toEqual([0, 0])
    expect(s.points).toEqual([])
    expect(s.winner).toBeNull()
  })

  it('一本ずつ取り合ったら決着せず続く', () => {
    let s = afterFlags(takePoint(createMatch(), 'men', 0))
    s = afterFlags(takePoint(s, 'do', 1))
    expect(s.scores).toEqual([1, 1])
    expect(s.phase).toBe('ready')
    s = afterFlags(takePoint(s, 'men', 1))
    expect(s.phase).toBe('end')
    expect(s.winner).toBe(1)
  })

  it('本数は rules で変えられる', () => {
    let s = takePoint(createMatch({ pointsToWin: 1 }), 'men')
    s = afterFlags(s)
    expect(s.phase).toBe('end')
  })
})
