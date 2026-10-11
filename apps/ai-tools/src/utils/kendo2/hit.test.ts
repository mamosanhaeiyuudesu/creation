import { describe, expect, it } from 'vitest'
import { GUARD_STARTUP, ISSOKU_DISTANCE, PART_OFFSET, STRIKES } from './constants'
import { createFighter } from './fighter'
import { inReach, judgeStrike } from './hit'
import type { Fighter, Guard, Technique } from './types'

type DefenderKind = 'normal' | 'idle' | Guard | 'kuzure' | 'hit'

function defender(kind: DefenderKind, x = 1): Fighter {
  const base = createFighter(1, x, -1)
  if (kind === 'normal') return { ...base, phase: 'move' } // 動いている（構えのままではない）
  if (kind === 'idle') return base // 何もしていない構え＝どの技も自動で防ぐ
  if (kind === 'kuzure') return { ...base, phase: 'kuzure' }
  if (kind === 'hit') return { ...base, phase: 'hit' }
  return { ...base, phase: 'guard', guard: kind, phaseFrame: GUARD_STARTUP }
}

function attacker(technique: Technique): Fighter {
  return { ...createFighter(0, 0, 1), phase: 'active', technique }
}

describe('相手の構えで入るかどうか', () => {
  // 行＝打つ技、列＝相手の状態
  const table: Record<Technique, Record<'normal' | Guard, string>> = {
    men: { normal: 'hit', men: 'blocked', kote: 'hit' },
    kote: { normal: 'miss', men: 'hit', kote: 'blocked' },
    do: { normal: 'miss', men: 'hit', kote: 'blocked' },
    tsuki: { normal: 'miss', men: 'blocked', kote: 'blocked' }, // 突きは無し（ボタン無効）
  }
  for (const t of Object.keys(table) as Technique[]) {
    for (const d of ['normal', 'men', 'kote'] as const) {
      it(`${t} → 相手が ${d}: ${table[t][d]}`, () => {
        expect(judgeStrike(attacker(t), defender(d))).toBe(table[t][d])
      })
    }
  }

  it('崩れている相手には、どの技でも入る', () => {
    for (const t of ['men', 'kote', 'do', 'tsuki'] as Technique[]) {
      expect(judgeStrike(attacker(t), defender('kuzure'))).toBe('hit')
    }
  })

  it('防御は押してすぐには効かない（通常と同じ扱い）', () => {
    const early: Fighter = { ...defender('men'), phaseFrame: GUARD_STARTUP - 1 }
    expect(judgeStrike(attacker('men'), early)).toBe('hit')
  })

  it('一本を取られた直後の相手は判定しない', () => {
    expect(judgeStrike(attacker('men'), defender('hit'))).toBe('none')
  })

  it('結果が決まった打突はもう判定しない', () => {
    expect(judgeStrike({ ...attacker('men'), hasHit: true }, defender('normal'))).toBe('none')
  })
})

describe('届く距離', () => {
  /** 踏み込み込みで届く、体の中心どうしの最大距離 */
  const maxDistance = (t: Technique) => STRIKES[t].reach + STRIKES[t].lunge + PART_OFFSET[t]

  it('遠くから届く順に 小手 > 突き > 面 > 胴', () => {
    expect(maxDistance('kote')).toBeGreaterThan(maxDistance('tsuki'))
    expect(maxDistance('tsuki')).toBeGreaterThan(maxDistance('men'))
    expect(maxDistance('men')).toBeGreaterThan(maxDistance('do'))
    expect(ISSOKU_DISTANCE).toBeCloseTo(maxDistance('kote'))
  })

  it('届かなければ判定しない', () => {
    const d = defender('normal', STRIKES.men.reach + 0.01)
    expect(inReach(attacker('men'), d, 'men')).toBe(false)
    expect(judgeStrike(attacker('men'), d)).toBe('none')
  })

  it('小手は部位が前にあるぶん、体の中心から遠くても届く', () => {
    const d = defender('men', STRIKES.kote.reach + PART_OFFSET.kote - 0.01)
    expect(judgeStrike(attacker('kote'), d)).toBe('hit')
  })
})

describe('構えのまま何もしていない相手', () => {
  for (const t of ['men', 'kote', 'do'] as Technique[]) {
    it(`${t} は自動で防がれる`, () => {
      expect(judgeStrike(attacker(t), defender('idle'))).toBe('blocked')
    })
  }
})

describe('抜き胴', () => {
  const striking = { ...defender('normal'), phase: 'windup' as const, technique: 'men' as const }
  it('相手が面を打ってくる最中に、当たりの回の胴は入る', () => {
    expect(judgeStrike({ ...attacker('do'), nukiOk: true }, striking)).toBe('hit')
  })
  it('外れの回の胴は入らない', () => {
    expect(judgeStrike({ ...attacker('do'), nukiOk: false }, striking)).toBe('miss')
  })
  it('相手が面を打ってきていなければ、当たりの回でも入らない', () => {
    expect(judgeStrike({ ...attacker('do'), nukiOk: true }, defender('normal'))).toBe('miss')
  })
})
