// 部位ごとの当たり判定。
import { PART_OFFSET, STRIKES, TECHNIQUE_PART } from './constants'
import type { Fighter, Part, PlayerId, Technique } from './types'

/**
 * 今打てる（空いている）部位。ステップ1では被打突中以外すべて空いている。
 * ステップ2で「振りかぶると胴が空く」「抜き技の最中は当たらない」などをここで表す。
 */
export function openParts(defender: Fighter): Readonly<Record<Part, boolean>> {
  const open = defender.phase !== 'hit'
  return { men: open, kote: open, do: open }
}

/** 部位の x 座標 */
export function partX(defender: Fighter, part: Part): number {
  return defender.x + defender.facing * PART_OFFSET[part]
}

/** attacker の打突がこのフレームで defender に当たるか */
export function strikeLands(attacker: Fighter, defender: Fighter): boolean {
  if (attacker.phase !== 'active' || attacker.technique === null || attacker.hasHit) return false
  const part = TECHNIQUE_PART[attacker.technique]
  if (!openParts(defender)[part]) return false
  // 自分の向きに沿って測った、部位までの距離（相手が後ろにいるなら負になって当たらない）
  const d = (partX(defender, part) - attacker.x) * attacker.facing
  return d >= 0 && d <= STRIKES[attacker.technique].reach
}

export type HitResult =
  | { kind: 'none' }
  | { kind: 'ippon'; by: PlayerId; technique: Technique }
  | { kind: 'aiuchi' }

/** 同じフレームで両方当たったら相打ち（一本にしない） */
export function resolveHits(a: Fighter, b: Fighter): HitResult {
  const aLands = strikeLands(a, b)
  const bLands = strikeLands(b, a)
  if (aLands && bLands) return { kind: 'aiuchi' }
  if (aLands) return { kind: 'ippon', by: a.id, technique: a.technique! }
  if (bLands) return { kind: 'ippon', by: b.id, technique: b.technique! }
  return { kind: 'none' }
}
