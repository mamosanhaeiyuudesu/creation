// プレイヤー1人ぶんの状態機械。1回呼ぶと1フレーム進む。
//
//   idle ⇄ move ─(打突ボタン)→ windup → active → recovery → idle
//   （被打突は試合進行側が hit にする）
//
// ステップ2で足す想定の状態: 応じ技の受け、抜き（無敵）、鍔迫り合い、引き技、攻め。
import { STRIKES, WALK_BACK, WALK_FORWARD } from './constants'
import { clampToStage } from './maai'
import type { Facing, Fighter, FighterPhase, PlayerId, PlayerInput, Technique } from './types'

export function createFighter(id: PlayerId, x: number, facing: Facing): Fighter {
  return { id, x, facing, phase: 'idle', phaseFrame: 0, technique: null, hasHit: false }
}

function enter(f: Fighter, phase: FighterPhase, technique: Technique | null = f.technique): Fighter {
  return { ...f, phase, phaseFrame: 0, technique, hasHit: phase === 'windup' ? false : f.hasHit }
}

/** 押された打突ボタン。同時押しは 面 > 小手 > 胴 の順で1つだけ採る */
export function pressedTechnique(input: PlayerInput): Technique | null {
  if (input.pressed.men) return 'men'
  if (input.pressed.kote) return 'kote'
  if (input.pressed.do) return 'do'
  return null
}

/** 十字キーの左右を、自分の向きから見た前後（+1 前進 / -1 後退 / 0）にする */
export function moveIntent(input: PlayerInput, facing: Facing): -1 | 0 | 1 {
  const screen = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0)
  if (screen === 0) return 0
  return screen === facing ? 1 : -1
}

export function stepFighter(f: Fighter, input: PlayerInput): Fighter {
  switch (f.phase) {
    case 'idle':
    case 'move': {
      const technique = pressedTechnique(input)
      if (technique) return enter(f, 'windup', technique)
      const dir = moveIntent(input, f.facing)
      if (dir === 0) return f.phase === 'idle' ? { ...f, phaseFrame: f.phaseFrame + 1 } : enter(f, 'idle', null)
      const speed = dir > 0 ? WALK_FORWARD : WALK_BACK
      const moved = { ...f, x: clampToStage(f.x + dir * f.facing * speed) }
      return f.phase === 'move' ? { ...moved, phaseFrame: f.phaseFrame + 1 } : enter(moved, 'move', null)
    }
    case 'windup': {
      const data = STRIKES[f.technique!]
      const stepped = { ...f, x: clampToStage(f.x + f.facing * (data.lunge / data.windup)), phaseFrame: f.phaseFrame + 1 }
      return stepped.phaseFrame >= data.windup ? enter(stepped, 'active') : stepped
    }
    case 'active': {
      const next = f.phaseFrame + 1
      return next >= STRIKES[f.technique!].active ? enter(f, 'recovery') : { ...f, phaseFrame: next }
    }
    case 'recovery': {
      const next = f.phaseFrame + 1
      return next >= STRIKES[f.technique!].recovery ? enter(f, 'idle', null) : { ...f, phaseFrame: next }
    }
    case 'hit':
      // 被打突中は動けない（試合進行側が開始位置へ戻すまで）
      return { ...f, phaseFrame: f.phaseFrame + 1 }
  }
}

export function markHit(f: Fighter): Fighter {
  return enter(f, 'hit', null)
}
