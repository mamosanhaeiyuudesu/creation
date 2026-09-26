// 間合いの判定と、近間での押し戻し。
import { CHIKAMA_DISTANCE, ISSOKU_DISTANCE, MIN_GAP, STAGE_HALF } from './constants'
import type { Fighter, Maai } from './types'

export function distanceBetween(a: Fighter, b: Fighter): number {
  return Math.abs(a.x - b.x)
}

/** 遠間＝どの技も届かない / 一足一刀＝踏み込めば届く / 近間＝体が詰まっている */
export function classifyMaai(distance: number): Maai {
  if (distance > ISSOKU_DISTANCE) return 'toma'
  if (distance < CHIKAMA_DISTANCE) return 'chikama'
  return 'issoku'
}

export function clampToStage(x: number): number {
  return Math.max(-STAGE_HALF, Math.min(STAGE_HALF, x))
}

/**
 * 2人が MIN_GAP より近づいていたら、同じだけ押し戻して重ならないようにする。
 * 片方が場外の端にいるときは、もう片方だけが下がる。
 * ステップ1では左の人（x が小さい方）は常に左にいる前提（すり抜けない）。
 * ステップ2の鍔迫り合いはここで押し戻さずに状態遷移させる想定。
 */
export function separate(a: Fighter, b: Fighter): [Fighter, Fighter] {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a]
  const gap = right.x - left.x
  if (gap >= MIN_GAP) return [a, b]

  const push = (MIN_GAP - gap) / 2
  let lx = clampToStage(left.x - push)
  let rx = clampToStage(right.x + push)
  if (rx - lx < MIN_GAP) {
    // 端に当たった側のぶんを、反対側に押し付ける
    if (lx === -STAGE_HALF) rx = lx + MIN_GAP
    else lx = rx - MIN_GAP
  }
  const newLeft = { ...left, x: lx }
  const newRight = { ...right, x: rx }
  return a.x <= b.x ? [newLeft, newRight] : [newRight, newLeft]
}
