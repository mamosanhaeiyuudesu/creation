// 第2弾のプレイヤー状態機械。1回呼ぶと1フレーム進む。
//
//   idle / move / guard ─(打突ボタン)→ windup → active → recovery → idle
//        │  └(横ボタンを押した瞬間)→ step（送り足）→ idle
//        └(防御ボタンを押している間)→ guard
//   打突を防がれた → kuzure（試合進行側が入れる） → idle
//
// 攻撃と防御は同時にできない。同じフレームで押したら防御を優先する。
// 防御を押し続けたまま攻撃ボタンを押したら、防御を解いて打つ（防いだ直後なら返し技）。
import {
  ATTACK_COOLDOWN,
  GUARD_STARTUP,
  GUARD_WALK_RATE,
  KAESHI_WINDOW,
  KAESHI_RECOVERY,
  KAESHI_WINDUP,
  KUZURE_FRAMES,
  STEP_DISTANCE,
  STEP_FRAMES,
  STEP_INTERVAL,
  STRIKES,
  WALK_BACK,
  WALK_FORWARD,
} from './constants'
import { clampToStage } from './maai'
import type { Facing, Fighter, FighterPhase, Guard, PlayerId, PlayerInput, Technique } from './types'

export function createFighter(id: PlayerId, x: number, facing: Facing): Fighter {
  return {
    id,
    x,
    facing,
    phase: 'idle',
    phaseFrame: 0,
    technique: null,
    hasHit: false,
    guard: null,
    stepDir: 0,
    stepCooldown: 0,
    attackCooldown: 0,
    kaeshiWindow: 0,
    kaeshiFrom: null,
    strikeKaeshiFrom: null,
  }
}

function enter(f: Fighter, phase: FighterPhase, patch: Partial<Fighter> = {}): Fighter {
  return { ...f, guard: null, stepDir: 0, ...patch, phase, phaseFrame: 0 }
}

const next = (f: Fighter): Fighter => ({ ...f, phaseFrame: f.phaseFrame + 1 })

/** 押された打突ボタン。同時押しは 面 > 小手 > 胴 > 突き の順で1つだけ採る */
export function pressedTechnique(input: PlayerInput): Technique | null {
  if (input.pressed.men) return 'men'
  if (input.pressed.kote) return 'kote'
  if (input.pressed.do) return 'do'
  if (input.pressed.tsuki) return 'tsuki'
  return null
}

/** 押している防御。両方押していたら面の防御 */
export function heldGuard(input: PlayerInput): Guard | null {
  if (input.held.guardMen) return 'men'
  if (input.held.guardKote) return 'kote'
  return null
}

/** 十字キーの左右を、自分の向きから見た前後にする（held＝歩き、pressed＝送り足） */
export function directionOf(set: { left: boolean; right: boolean }, facing: Facing): -1 | 0 | 1 {
  const screen = (set.right ? 1 : 0) - (set.left ? 1 : 0)
  if (screen === 0) return 0
  return screen === facing ? 1 : -1
}

/** 防御が効いているか（押してから GUARD_STARTUP フレームは効かない） */
export function effectiveGuard(f: Fighter): Guard | null {
  return f.phase === 'guard' && f.phaseFrame >= GUARD_STARTUP ? f.guard : null
}

export function strikeWindup(f: Fighter): number {
  return f.strikeKaeshiFrom ? KAESHI_WINDUP : STRIKES[f.technique!].windup
}

export function strikeRecovery(f: Fighter): number {
  return f.strikeKaeshiFrom ? KAESHI_RECOVERY : STRIKES[f.technique!].recovery
}

/** 毎フレーム減るカウンター */
function tick(f: Fighter): Fighter {
  const kaeshiWindow = Math.max(0, f.kaeshiWindow - 1)
  return {
    ...f,
    attackCooldown: Math.max(0, f.attackCooldown - 1),
    stepCooldown: Math.max(0, f.stepCooldown - 1),
    kaeshiWindow,
    kaeshiFrom: kaeshiWindow > 0 ? f.kaeshiFrom : null,
  }
}

function startStrike(f: Fighter, technique: Technique): Fighter {
  const kaeshi = f.kaeshiWindow > 0
  return enter(f, 'windup', {
    technique,
    hasHit: false,
    attackCooldown: ATTACK_COOLDOWN,
    strikeKaeshiFrom: kaeshi ? f.kaeshiFrom : null,
    kaeshiWindow: 0,
    kaeshiFrom: null,
  })
}

function walk(f: Fighter, dir: -1 | 0 | 1, rate: number): Fighter {
  if (dir === 0) return f
  const speed = (dir > 0 ? WALK_FORWARD : WALK_BACK) * rate
  return { ...f, x: clampToStage(f.x + dir * f.facing * speed) }
}

/** 構え・歩き・防御（自由に動ける状態）での1フレーム */
function stepNeutral(f: Fighter, input: PlayerInput): Fighter {
  const guard = heldGuard(input)
  const technique = pressedTechnique(input)
  const guardJustPressed = input.pressed.guardMen || input.pressed.guardKote

  // 攻撃: 同じフレームで防御も押していたら防御を優先。打てない時間中は返し技だけ出せる
  if (technique && !(guard && guardJustPressed) && (f.kaeshiWindow > 0 || f.attackCooldown === 0)) {
    return startStrike(f, technique)
  }

  if (guard) {
    const guarding = f.phase === 'guard' && f.guard === guard ? next(f) : enter(f, 'guard', { guard })
    return walk(guarding, directionOf(input.held, f.facing), GUARD_WALK_RATE)
  }

  const tap = directionOf(input.pressed, f.facing)
  if (tap !== 0 && f.stepCooldown === 0) {
    return enter(f, 'step', { stepDir: tap, stepCooldown: STEP_INTERVAL })
  }

  const dir = directionOf(input.held, f.facing)
  if (dir === 0) return f.phase === 'idle' ? next(f) : enter(f, 'idle')
  const moved = walk(f, dir, 1)
  return f.phase === 'move' ? next(moved) : enter(moved, 'move')
}

export function stepFighter(prev: Fighter, input: PlayerInput): Fighter {
  const f = tick(prev)
  switch (f.phase) {
    case 'idle':
    case 'move':
    case 'guard':
      return stepNeutral(f, input)
    case 'step': {
      const moved = { ...f, x: clampToStage(f.x + f.stepDir * f.facing * (STEP_DISTANCE / STEP_FRAMES)) }
      return moved.phaseFrame + 1 >= STEP_FRAMES ? enter(moved, 'idle') : next(moved)
    }
    case 'windup': {
      const duration = strikeWindup(f)
      const lunged = { ...f, x: clampToStage(f.x + f.facing * (STRIKES[f.technique!].lunge / duration)) }
      return lunged.phaseFrame + 1 >= duration ? enter(lunged, 'active', { guard: null }) : next(lunged)
    }
    case 'active':
      return f.phaseFrame + 1 >= STRIKES[f.technique!].active ? enter(f, 'recovery') : next(f)
    case 'recovery':
      return f.phaseFrame + 1 >= strikeRecovery(f) ? enter(f, 'idle', { technique: null, strikeKaeshiFrom: null }) : next(f)
    case 'kuzure':
      return f.phaseFrame + 1 >= KUZURE_FRAMES ? enter(f, 'idle', { technique: null, strikeKaeshiFrom: null }) : next(f)
    case 'hit':
      return next(f)
  }
}

/** 打突を防がれて崩れる */
export function markKuzure(f: Fighter): Fighter {
  return enter(f, 'kuzure', { hasHit: true })
}

/** 相手の打突を防いだ。返し技の受付を開く */
export function markBlocked(f: Fighter, from: Technique): Fighter {
  return { ...f, kaeshiWindow: KAESHI_WINDOW, kaeshiFrom: from }
}

export function markHit(f: Fighter): Fighter {
  return enter(f, 'hit', { technique: null, strikeKaeshiFrom: null, kaeshiWindow: 0, kaeshiFrom: null })
}
