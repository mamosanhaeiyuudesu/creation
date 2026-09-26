import { describe, expect, it } from 'vitest'
import { IPPON_FRAMES, KAESHI_WINDOW, KAESHI_WINDUP, READY_FRAMES, STRIKES } from './constants'
import { createFighter } from './fighter'
import { createMatch, NO_INPUT, stepMatch } from './match'
import { hold, input, press } from './test-helpers'
import type { MatchState, PlayerInput, Technique } from './types'

type Inputs = [PlayerInput, PlayerInput]
const idle: Inputs = [NO_INPUT, NO_INPUT]

function run(s: MatchState, frames: number, inputs: Inputs = idle): MatchState {
  for (let i = 0; i < frames; i++) s = stepMatch(s, inputs)
  return s
}

/** 「はじめ」まで進めてから、2人を距離 d に置き直す */
function fightingAt(d: number, s: MatchState = createMatch()): MatchState {
  s = run(s, READY_FRAMES)
  return { ...s, fighters: [createFighter(0, -d / 2, 1), createFighter(1, d / 2, -1)] }
}

/** P1(赤) が面の防御を構えている状態で、P2(白) が technique を打ち、判定が出るまで進める */
function whiteStrikesGuardedRed(technique: Technique): MatchState {
  let s = fightingAt(1.6)
  s = run(s, 5, [hold('guardMen'), NO_INPUT])
  s = stepMatch(s, [hold('guardMen'), press(technique)])
  return run(s, STRIKES[technique].windup, [hold('guardMen'), NO_INPUT])
}

describe('防御と返し技', () => {
  it('面を面の防御で防ぐと、打った側が崩れ、防いだ側に返し技の受付が開く', () => {
    const s = whiteStrikesGuardedRed('men')
    expect(s.phase).toBe('fight')
    expect(s.events).toContainEqual({ type: 'blocked', by: 0, technique: 'men' })
    expect(s.fighters[1].phase).toBe('kuzure')
    expect(s.fighters[0].kaeshiWindow).toBe(KAESHI_WINDOW)
    expect(s.fighters[0].kaeshiFrom).toBe('men')
  })

  it('受付の間に打つと返し技になり、崩れた相手に入る（面返し胴）', () => {
    let s = whiteStrikesGuardedRed('men')
    s = run(s, 10, [hold('guardMen'), NO_INPUT])
    s = stepMatch(s, [input({ held: ['guardMen'], pressed: ['do'] }), NO_INPUT])
    s = run(s, KAESHI_WINDUP)
    expect(s.phase).toBe('ippon')
    expect(s.points[0]).toMatchObject({ by: 0, technique: 'do', kaeshiFrom: 'men' })
  })

  it('受付を過ぎてから打つと返し技にならない（相手の崩れも解けて、胴は外れる）', () => {
    let s = whiteStrikesGuardedRed('men')
    s = run(s, KAESHI_WINDOW, [hold('guardMen'), NO_INPUT])
    s = stepMatch(s, [press('do'), NO_INPUT])
    expect(s.fighters[0].strikeKaeshiFrom).toBeNull()
    s = run(s, STRIKES.do.windup)
    expect(s.phase).toBe('fight')
    expect(s.events).toContainEqual({ type: 'miss', by: 0, technique: 'do' })
  })

  it('面の防御をしている相手には小手が入る', () => {
    const s = whiteStrikesGuardedRed('kote')
    expect(s.phase).toBe('ippon')
    expect(s.points[0]).toMatchObject({ by: 1, technique: 'kote', kaeshiFrom: null })
  })

  it('構えている相手に胴を打つと外れる（崩れない・点も入らない）', () => {
    let s = fightingAt(1.6)
    s = stepMatch(s, [NO_INPUT, press('do')])
    s = run(s, STRIKES.do.windup)
    expect(s.events).toContainEqual({ type: 'miss', by: 1, technique: 'do' })
    expect(s.fighters[1].phase).toBe('active')
    expect(s.scores).toEqual([0, 0])
  })

  it('小手の防御をしている相手には面が入る', () => {
    let s = fightingAt(1.6)
    s = run(s, 5, [hold('guardKote'), NO_INPUT])
    s = stepMatch(s, [hold('guardKote'), press('men')])
    s = run(s, STRIKES.men.windup, [hold('guardKote'), NO_INPUT])
    expect(s.points[0]).toMatchObject({ by: 1, technique: 'men' })
  })
})

describe('試合進行', () => {
  it('面を同時に打つと相打ちで試合は続く', () => {
    let s = fightingAt(1.6)
    s = stepMatch(s, [press('men'), press('men')])
    s = run(s, STRIKES.men.windup)
    expect(s.events).toContainEqual({ type: 'aiuchi' })
    expect(s.phase).toBe('fight')
  })

  it('二本先取で勝負あり、スタートで再戦', () => {
    const takeMen = (s: MatchState) => {
      s = fightingAt(1.6, s)
      s = stepMatch(s, [press('men'), NO_INPUT])
      return run(s, STRIKES.men.windup)
    }
    let s = run(takeMen(createMatch()), IPPON_FRAMES)
    expect(s.phase).toBe('ready')
    s = run(takeMen(s), IPPON_FRAMES)
    expect(s.phase).toBe('end')
    expect(s.winner).toBe(0)
    s = stepMatch(s, [press('start'), NO_INPUT])
    expect(s.phase).toBe('ready')
    expect(s.scores).toEqual([0, 0])
  })
})
