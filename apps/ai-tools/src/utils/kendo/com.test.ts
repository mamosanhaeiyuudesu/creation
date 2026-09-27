import { describe, expect, it } from 'vitest'
import { createKendo1Com, Kendo1Com } from './com'
import { createMatch, stepMatch } from './match'

/** COM 同士で試合をして、赤（id 0）の勝率と決着した割合を返す */
function winRate(make0: (seed: number) => Kendo1Com, make1: (seed: number) => Kendo1Com, games = 30) {
  let wins = 0
  let finished = 0
  for (let g = 0; g < games; g++) {
    const c0 = make0(g * 2 + 1)
    const c1 = make1(g * 2 + 2)
    let s = createMatch()
    for (let i = 0; i < 60 * 180 && s.phase !== 'end'; i++) s = stepMatch(s, [c0.decide(s), c1.decide(s)])
    if (s.winner !== null) finished++
    if (s.winner === 0) wins++
  }
  return { rate: wins / games, finished: finished / games }
}

describe('第1弾のCOM', () => {
  it('試合がちゃんと決着する（打ち合いが止まらない）', () => {
    const { finished } = winRate((s) => createKendo1Com(3, s, 0), (s) => createKendo1Com(3, s, 1))
    expect(finished).toBeGreaterThan(0.9)
  })

  it('★5 は ★1 に大きく勝ち越す', () => {
    expect(winRate((s) => createKendo1Com(5, s, 0), (s) => createKendo1Com(1, s, 1)).rate).toBeGreaterThan(0.8)
  })

  it('★が1つ上なら勝ち越す（★4 対 ★3）', () => {
    expect(winRate((s) => createKendo1Com(4, s, 0), (s) => createKendo1Com(3, s, 1)).rate).toBeGreaterThan(0.5)
  })

  it('ずるをしない: 同じ強さなら赤でも白でも五分に近い', () => {
    const { rate } = winRate((s) => createKendo1Com(3, s, 0), (s) => createKendo1Com(3, s, 1), 40)
    expect(rate).toBeGreaterThan(0.25)
    expect(rate).toBeLessThan(0.75)
  })
})
