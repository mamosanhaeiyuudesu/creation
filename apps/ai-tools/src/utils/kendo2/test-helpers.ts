// テスト用の入力ヘルパー（本番コードからは使わない）
import { NO_ACTIONS } from './match'
import type { Action, PlayerInput } from './types'

export function input(opts: { held?: Action[]; pressed?: Action[] } = {}): PlayerInput {
  const held = { ...NO_ACTIONS }
  const pressed = { ...NO_ACTIONS }
  for (const a of opts.held ?? []) held[a] = true
  for (const a of opts.pressed ?? []) pressed[a] = true
  return { held, pressed }
}

export const press = (...actions: Action[]) => input({ pressed: actions })
export const hold = (...actions: Action[]) => input({ held: actions })
