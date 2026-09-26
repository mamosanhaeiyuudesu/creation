import { describe, expect, it } from 'vitest'
import {
  ATTACK_COOLDOWN,
  GUARD_STARTUP,
  GUARD_WALK_RATE,
  KAESHI_WINDUP,
  STEP_DISTANCE,
  STEP_FRAMES,
  STEP_INTERVAL,
  STRIKES,
  WALK_FORWARD,
} from './constants'
import { createFighter, effectiveGuard, stepFighter } from './fighter'
import { NO_INPUT } from './match'
import { hold, input, press } from './test-helpers'
import type { Fighter, FighterPhase, PlayerInput, Technique } from './types'

function run(f: Fighter, frames: number, inp: PlayerInput = NO_INPUT): Fighter {
  for (let i = 0; i < frames; i++) f = stepFighter(f, inp)
  return f
}

function phases(f: Fighter, first: PlayerInput, n: number): FighterPhase[] {
  const out: FighterPhase[] = []
  let cur = stepFighter(f, first)
  out.push(cur.phase)
  for (let i = 1; i < n; i++) {
    cur = stepFighter(cur, NO_INPUT)
    out.push(cur.phase)
  }
  return out
}

const p1 = () => createFighter(0, 0, 1)

describe('打突のフレーム進行', () => {
  for (const t of ['men', 'kote', 'do', 'tsuki'] as Technique[]) {
    it(`${t}: windup → active → recovery → idle がフレームデータどおり`, () => {
      const d = STRIKES[t]
      const list = phases(p1(), press(t), d.windup + d.active + d.recovery + 1)
      expect(list.filter((p) => p === 'windup')).toHaveLength(d.windup)
      expect(list.filter((p) => p === 'active')).toHaveLength(d.active)
      expect(list.filter((p) => p === 'recovery')).toHaveLength(d.recovery)
      expect(list.at(-1)).toBe('idle')
    })
  }
})

describe('打ったあと打てない時間', () => {
  it('打突を始めてから ATTACK_COOLDOWN の間は、次の打突を受け付けない', () => {
    let f = stepFighter(p1(), press('men'))
    f = run(f, ATTACK_COOLDOWN - 2)
    expect(f.phase).toBe('idle')
    expect(stepFighter(f, press('men')).phase).toBe('idle')
    f = run(f, 1)
    expect(stepFighter(f, press('men')).phase).toBe('windup')
  })

  it('返し技の受付中なら、打てない時間でも打てる（返し技になる）', () => {
    const f: Fighter = { ...p1(), phase: 'guard', guard: 'men', attackCooldown: 50, kaeshiWindow: 10, kaeshiFrom: 'men' }
    const next = stepFighter(f, input({ held: ['guardMen'], pressed: ['do'] }))
    expect(next.phase).toBe('windup')
    expect(next.strikeKaeshiFrom).toBe('men')
    expect(next.attackCooldown).toBe(ATTACK_COOLDOWN)
  })

  it('返し技は振りかぶりが短い', () => {
    const f: Fighter = { ...p1(), kaeshiWindow: 10, kaeshiFrom: 'men' }
    const list = phases(f, press('do'), KAESHI_WINDUP + 1)
    expect(list.filter((p) => p === 'windup')).toHaveLength(KAESHI_WINDUP)
    expect(list.at(-1)).toBe('active')
  })
})

describe('防御', () => {
  it('押している間は防御。押してから GUARD_STARTUP フレームで効き始める', () => {
    let f = stepFighter(p1(), input({ held: ['guardMen'], pressed: ['guardMen'] }))
    expect(f.phase).toBe('guard')
    expect(effectiveGuard(f)).toBeNull()
    f = run(f, GUARD_STARTUP, hold('guardMen'))
    expect(effectiveGuard(f)).toBe('men')
    f = stepFighter(f, NO_INPUT)
    expect(f.phase).toBe('idle')
  })

  it('L は小手の防御、両方押すと面の防御', () => {
    expect(stepFighter(p1(), hold('guardKote')).guard).toBe('kote')
    expect(stepFighter(p1(), hold('guardKote', 'guardMen')).guard).toBe('men')
  })

  it('攻撃と防御を同じフレームで押したら防御が優先', () => {
    const f = stepFighter(p1(), input({ held: ['guardKote'], pressed: ['guardKote', 'men'] }))
    expect(f.phase).toBe('guard')
  })

  it('防御を押し続けたまま攻撃を押すと、防御を解いて打つ', () => {
    let f = run(p1(), 5, hold('guardMen'))
    f = stepFighter(f, input({ held: ['guardMen'], pressed: ['kote'] }))
    expect(f.phase).toBe('windup')
    expect(f.guard).toBeNull()
  })

  it('打っている間は防御できない', () => {
    let f = stepFighter(p1(), press('men'))
    f = stepFighter(f, input({ held: ['guardMen'], pressed: ['guardMen'] }))
    expect(f.phase).toBe('windup')
  })

  it('防御中の歩きは半分の速さ', () => {
    const f = run(p1(), 1, hold('guardMen', 'right'))
    expect(f.x).toBeCloseTo(WALK_FORWARD * GUARD_WALK_RATE)
  })
})

describe('送り足（横ボタンの連打）', () => {
  it('押した瞬間に STEP_FRAMES で STEP_DISTANCE 進む', () => {
    let f = stepFighter(p1(), input({ held: ['right'], pressed: ['right'] }))
    expect(f.phase).toBe('step')
    f = run(f, STEP_FRAMES)
    expect(f.phase).toBe('idle')
    expect(f.x).toBeCloseTo(STEP_DISTANCE)
  })

  it('左向きの白は左で前へ踏み出す', () => {
    const f = run(stepFighter(createFighter(1, 0, -1), press('left')), STEP_FRAMES)
    expect(f.x).toBeCloseTo(-STEP_DISTANCE)
  })

  it('連打すると歩くより速い', () => {
    const frames = STEP_INTERVAL * 5
    let mashed = p1()
    for (let i = 0; i < frames; i++) mashed = stepFighter(mashed, i % STEP_INTERVAL === 0 ? press('right') : NO_INPUT)
    const walked = run(p1(), frames, hold('right'))
    expect(mashed.x).toBeGreaterThan(walked.x * 1.3)
  })

  it('間隔より速く押しても、次の一歩は出ない', () => {
    let f = stepFighter(p1(), press('right'))
    f = run(f, STEP_FRAMES - 1)
    f = stepFighter(f, press('right'))
    expect(f.phase).not.toBe('step')
  })
})
