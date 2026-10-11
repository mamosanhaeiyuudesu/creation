// 第2弾の当たり判定。届く距離（部位ごと）と、相手の構えで入るかどうか（OPENINGS）の2段で決める。
import { EVADE_SLACK, OPENINGS, PART_OFFSET, STRIKES } from './constants'
import type { Stance } from './constants'
import { effectiveGuard } from './fighter'
import type { Fighter, Technique } from './types'

/** 打たれる側の状態。open＝崩れていてどこでも入る / none＝一本を取られた直後で判定しない */
export type DefenderState = Stance | 'open' | 'none'

export function defenderState(d: Fighter): DefenderState {
  if (d.phase === 'hit') return 'none'
  if (d.phase === 'kuzure') return 'open'
  return effectiveGuard(d) ?? 'normal'
}

/** 部位の x 座標 */
export function partX(defender: Fighter, technique: Technique): number {
  return defender.x + defender.facing * PART_OFFSET[technique]
}

export function inReach(attacker: Fighter, defender: Fighter, technique: Technique): boolean {
  const d = (partX(defender, technique) - attacker.x) * attacker.facing
  return d >= 0 && d <= STRIKES[technique].reach
}

/**
 * このフレームの打突の結果。
 * hit＝一本 / blocked＝相手の防御に止められた（打った側が崩れる） / miss＝構えている相手に外された / none＝まだ決まらない
 */
export type StrikeOutcome = 'none' | 'hit' | 'blocked' | 'miss' | 'evaded'

/** 抜き胴が決まる場面か: 相手が面を打ちにきている最中に、当たりの回の胴を打った */
export function isNuki(attacker: Fighter, defender: Fighter): boolean {
  return (
    attacker.technique === 'do' &&
    attacker.nukiOk &&
    attacker.strikeKaeshiFrom === null &&
    defender.technique === 'men' &&
    (defender.phase === 'windup' || defender.phase === 'active') &&
    defenderState(defender) === 'normal'
  )
}

/** 打突の瞬間に相手が下がって届かなくなった（下がらなければ届いていた）＝抜かれた */
function isEvaded(attacker: Fighter, defender: Fighter, technique: Technique): boolean {
  if (defender.backFrames <= 0) return false
  if (defender.phase !== 'idle' && defender.phase !== 'move' && defender.phase !== 'step' && defender.phase !== 'guard') return false
  const d = (partX(defender, technique) - attacker.x) * attacker.facing
  return d > 0 && d <= STRIKES[technique].reach + EVADE_SLACK
}

export function judgeStrike(attacker: Fighter, defender: Fighter): StrikeOutcome {
  const t = attacker.technique
  if (attacker.phase !== 'active' || t === null || attacker.hasHit) return 'none'
  if (!inReach(attacker, defender, t)) return isEvaded(attacker, defender, t) ? 'evaded' : 'none'
  const state = defenderState(defender)
  if (state === 'none') return 'none'
  if (state === 'open') return 'hit'
  // 何もしていない（構えのまま）の選手は、どの技も自動で防ぐ。一本は返し技か、動いている相手への打突で取る
  if (defender.phase === 'idle') return 'blocked'
  if (isNuki(attacker, defender)) return 'hit'
  if (OPENINGS[state][t]) return 'hit'
  return state === 'normal' ? 'miss' : 'blocked'
}
