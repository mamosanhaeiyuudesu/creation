import { describe, expect, it } from 'vitest'
import { CHIKAMA_DISTANCE, ISSOKU_DISTANCE, MIN_GAP, STAGE_HALF, START_X } from './constants'
import { createFighter } from './fighter'
import { resolveHits, strikeLands } from './hit'
import { classifyMaai, separate } from './maai'
import type { Fighter, Technique } from './types'

/** 距離 d で向かい合い、P1 が technique の判定を出している状態 */
function striking(technique: Technique, d: number): [Fighter, Fighter] {
  const a: Fighter = { ...createFighter(0, 0, 1), phase: 'active', technique }
  return [a, createFighter(1, d, -1)]
}

describe('間合い', () => {
  it('開始位置は遠間', () => {
    expect(classifyMaai(START_X * 2)).toBe('toma')
  })

  it('3段階に分かれる', () => {
    expect(classifyMaai(ISSOKU_DISTANCE + 0.01)).toBe('toma')
    expect(classifyMaai(ISSOKU_DISTANCE)).toBe('issoku')
    expect(classifyMaai(CHIKAMA_DISTANCE)).toBe('issoku')
    expect(classifyMaai(CHIKAMA_DISTANCE - 0.01)).toBe('chikama')
  })

  it('近すぎると押し戻して重ならない', () => {
    const [a, b] = separate(createFighter(0, 0, 1), createFighter(1, 0.2, -1))
    expect(b.x - a.x).toBeCloseTo(MIN_GAP)
    expect((a.x + b.x) / 2).toBeCloseTo(0.1)
  })

  it('場の端では反対側だけが押される', () => {
    const [a, b] = separate(createFighter(0, -STAGE_HALF, 1), createFighter(1, -STAGE_HALF + 0.1, -1))
    expect(a.x).toBe(-STAGE_HALF)
    expect(b.x).toBeCloseTo(-STAGE_HALF + MIN_GAP)
  })
})

describe('部位ごとの当たり判定', () => {
  it('面は届く距離なら当たり、遠いと外れる', () => {
    expect(strikeLands(...striking('men', 1.8))).toBe(true)
    expect(strikeLands(...striking('men', 1.81))).toBe(false)
  })

  it('小手は部位が前にあるぶん、竹刀の届く距離＋0.3まで当たる', () => {
    expect(strikeLands(...striking('kote', 1.84))).toBe(true)
    expect(strikeLands(...striking('kote', 1.86))).toBe(false)
  })

  it('同じ距離でも、面は届いて胴は届かない', () => {
    expect(strikeLands(...striking('men', 1.75))).toBe(true)
    expect(strikeLands(...striking('do', 1.75))).toBe(false)
  })

  it('判定中(active)以外では当たらない', () => {
    const [a, b] = striking('men', 1)
    expect(strikeLands({ ...a, phase: 'windup' }, b)).toBe(false)
    expect(strikeLands({ ...a, phase: 'recovery' }, b)).toBe(false)
  })

  it('1回の打突で当たるのは1度だけ', () => {
    const [a, b] = striking('men', 1)
    expect(strikeLands({ ...a, hasHit: true }, b)).toBe(false)
  })

  it('後ろにいる相手には当たらない', () => {
    const [a, b] = striking('men', -1)
    expect(strikeLands(a, b)).toBe(false)
  })

  it('被打突中の相手には当たらない', () => {
    const [a, b] = striking('men', 1)
    expect(strikeLands(a, { ...b, phase: 'hit' })).toBe(false)
  })
})

describe('resolveHits', () => {
  it('片方だけ当たれば一本', () => {
    const [a, b] = striking('kote', 1.5)
    expect(resolveHits(a, b)).toEqual({ kind: 'ippon', by: 0, technique: 'kote' })
  })

  it('同じフレームで両方当たれば相打ち', () => {
    const [a, b] = striking('men', 1.5)
    expect(resolveHits(a, { ...b, phase: 'active', technique: 'men' })).toEqual({ kind: 'aiuchi' })
  })

  it('どちらも当たらなければ none', () => {
    expect(resolveHits(createFighter(0, 0, 1), createFighter(1, 1, -1))).toEqual({ kind: 'none' })
  })
})
