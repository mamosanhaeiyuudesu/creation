// 第0弾の調整用の数値。単位は 距離=m、時間=フレーム（60fps）。
import type { Age } from './types'

export const FPS = 60

/**
 * 押してから当たるまで（振りかぶり）。反応の速さ（幼稚園児 約0.55秒・小学生 約0.3秒・大人 約0.25秒）の差を埋めるハンデ。
 * 反応のばらつきと早押しの空振りまで入れた人のモデル同士を200試合ずつ戦わせて決めた（2026-09-27、match.test.ts の COM の節）:
 * 幼稚園児 対 小学生 0.56 / 幼稚園児 対 大人 0.47 / 小学生 対 大人 0.54（左側の勝率）。
 */
export const WINDUP_BY_AGE: Readonly<Record<Age, number>> = {
  kinder: 3, // 0.05秒
  elementary: 17, // 0.28秒
  adult: 19, // 0.32秒
}

export const AGE_LABEL: Readonly<Record<Age, string>> = {
  kinder: 'ようちえん',
  elementary: 'しょうがくせい',
  adult: 'おとな',
}

export const ACTIVE_FRAMES = 4
/** 空振りのあと打てない時間（連打で当たらないように） */
export const WHIFF_FRAMES = 48 // 0.8秒

/** この距離（体の中心どうし）以下なら面が届く＝床が光って「いまだ！」 */
export const HIT_DISTANCE = 2.0

/** 自動で動く間合い: 遠いとき・近いときに選ぶ距離の範囲 */
export const FAR_GAP: readonly [number, number] = [2.5, 2.9]
export const NEAR_GAP: readonly [number, number] = [1.5, 1.9]
/** 同じ目標距離を保つ時間（1.5〜3秒の不規則な間隔） */
export const GAP_HOLD: readonly [number, number] = [90, 180]
/** 自動で歩く速さ（1人あたり m/フレーム） */
export const AUTO_WALK = 0.02

export const START_GAP = 2.8
export const STAGE_HALF = 5

export const READY_FRAMES = 60
export const IPPON_FRAMES = 120
export const DEFAULT_POINTS_TO_WIN = 2
