import { describe, expect, it } from 'vitest'
import { STAGE_HALF, STRIKES, WALK_BACK, WALK_FORWARD } from './constants'
import { createFighter, moveIntent, stepFighter } from './fighter'
import { NO_INPUT } from './match'
import { hold, press } from './test-helpers'
import type { Fighter, FighterPhase, PlayerInput } from './types'

/** 最初のフレームに first を入れ、あとは入力なしで n フレーム進めた各フレームの phase */
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

function count(list: FighterPhase[], p: FighterPhase) {
  return list.filter((x) => x === p).length
}

describe('打突のフレーム進行', () => {
  for (const t of ['men', 'kote', 'do'] as const) {
    it(`${t}: windup → active → recovery → idle がフレームデータどおりの長さ`, () => {
      const d = STRIKES[t]
      const total = d.windup + d.active + d.recovery
      const list = phases(createFighter(0, 0, 1), press(t), total + 1)
      expect(count(list, 'windup')).toBe(d.windup)
      expect(count(list, 'active')).toBe(d.active)
      expect(count(list, 'recovery')).toBe(d.recovery)
      expect(list[d.windup]).toBe('active')
      expect(list[total]).toBe('idle')
    })
  }

  it('振りかぶり中に別の打突ボタンを押しても受け付けない', () => {
    let f = stepFighter(createFighter(0, 0, 1), press('men'))
    f = stepFighter(f, press('kote'))
    expect(f.phase).toBe('windup')
    expect(f.technique).toBe('men')
  })

  it('振りかぶりの間に lunge ぶん前へ踏み込む', () => {
    let f = stepFighter(createFighter(1, 0, -1), press('men'))
    for (let i = 0; i < STRIKES.men.windup; i++) f = stepFighter(f, NO_INPUT)
    expect(f.phase).toBe('active')
    expect(f.x).toBeCloseTo(-STRIKES.men.lunge)
  })

  it('同時押しは 面 > 小手 > 胴 の順で1つ', () => {
    expect(stepFighter(createFighter(0, 0, 1), press('do', 'kote')).technique).toBe('kote')
  })
})

describe('移動', () => {
  it('右向き(P1)は右で前進、左で後退', () => {
    const f = createFighter(0, 0, 1)
    expect(stepFighter(f, hold('right')).x).toBeCloseTo(WALK_FORWARD)
    expect(stepFighter(f, hold('left')).x).toBeCloseTo(-WALK_BACK)
  })

  it('左向き(P2)は左で前進', () => {
    const f = createFighter(1, 0, -1)
    expect(moveIntent(hold('left'), -1)).toBe(1)
    expect(stepFighter(f, hold('left')).x).toBeCloseTo(-WALK_FORWARD)
  })

  it('左右同時押しは動かない', () => {
    const f = stepFighter(createFighter(0, 0, 1), hold('left', 'right'))
    expect(f.x).toBe(0)
    expect(f.phase).toBe('idle')
  })

  it('場外へは出ない', () => {
    const f = stepFighter(createFighter(0, -STAGE_HALF, 1), hold('left'))
    expect(f.x).toBe(-STAGE_HALF)
  })

  it('被打突中は動けない', () => {
    const f: Fighter = { ...createFighter(0, 0, 1), phase: 'hit' }
    const next = stepFighter(f, press('men'))
    expect(next.phase).toBe('hit')
    expect(next.x).toBe(0)
  })
})
