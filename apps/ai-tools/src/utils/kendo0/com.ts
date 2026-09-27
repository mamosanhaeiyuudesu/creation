// 第0弾のCOM。人と同じく「見てから少し遅れて反応する」＝光ってから reaction（±jitter）フレーム後に押す。
// ずるい読み（相手の入力を先に見る）はしない。乱数は種から決まるので、テストで結果を再現できる。
import { Rng } from '../kendo-shared/rng'
import { HIT_DISTANCE } from './constants'
import { distanceBetween, inZone, NO_INPUT } from './match'
import type { MatchState, PlayerId, PlayerInput } from './types'

export interface Com0Params {
  /** 見てから押すまでのフレーム数（平均） */
  reaction: number
  /** 反応のばらつき（±フレーム）。人と同じく毎回少しずつ違う */
  jitter: number
  /** 光る前に早押しして空振りする確率（近づいてくるたびに1回だけ判定） */
  early: number
}

/** 強さ★1〜5 */
export const COM0_LEVELS: readonly Com0Params[] = [
  { reaction: 42, jitter: 8, early: 0.3 }, // ★1 0.7秒
  { reaction: 33, jitter: 7, early: 0.2 },
  { reaction: 24, jitter: 6, early: 0.1 }, // ★3 0.4秒
  { reaction: 18, jitter: 4, early: 0.05 },
  { reaction: 12, jitter: 2, early: 0 }, // ★5 0.2秒
]

/**
 * 早押し（あわてて押す）をする距離。振りかぶりの間に近づいても届かない遠さにしておく
 * （光る直前に押すと振りかぶり中に届く距離へ入って先に当たってしまい、早押しが得になるため）。
 */
const EARLY_DISTANCE = HIT_DISTANCE + 0.8
/** ここまで離れたら、次に近づいてきたときにまた早押しを判定する */
const EARLY_RESET_DISTANCE = HIT_DISTANCE + 0.9

export class Kendo0Com {
  private readonly params: Com0Params
  private readonly id: PlayerId
  private readonly rng: Rng
  private earlyRolled = false
  /** 今回の反応の遅さ（届く距離に入るたびに、ばらつきを入れて選び直す） */
  private delay: number
  private zoneSeenAt = -1

  constructor(params: Com0Params, seed: number, id: PlayerId = 1) {
    this.params = params
    this.rng = new Rng(seed)
    this.id = id
    this.delay = this.rollDelay()
  }

  private rollDelay() {
    const { reaction, jitter } = this.params
    return Math.max(1, reaction + Math.round((this.rng.next() * 2 - 1) * jitter))
  }

  /** 毎フレーム呼ぶ。このフレームの COM の入力を返す */
  decide(s: MatchState): PlayerInput {
    const me = s.fighters[this.id]
    if (s.phase !== 'fight') {
      this.zoneSeenAt = -1
      return NO_INPUT
    }
    // 光った瞬間（届く距離に入った瞬間）を覚えておき、delay フレーム後に押す＝見てから反応する
    if (inZone(s)) {
      if (this.zoneSeenAt < 0) this.zoneSeenAt = s.frame
    } else if (this.zoneSeenAt >= 0) {
      this.zoneSeenAt = -1
      this.delay = this.rollDelay()
    }
    if (me.phase !== 'idle') return NO_INPUT

    const d = distanceBetween(s)
    if (d > EARLY_RESET_DISTANCE) this.earlyRolled = false
    if (this.zoneSeenAt >= 0 && s.frame - this.zoneSeenAt >= this.delay) return press()
    if (!this.earlyRolled && d <= EARLY_DISTANCE) {
      this.earlyRolled = true
      if (this.rng.chance(this.params.early)) return press()
    }
    return NO_INPUT
  }
}

function press(): PlayerInput {
  return { held: { strike: true, start: false }, pressed: { strike: true, start: false } }
}

export function createKendo0Com(level: number, seed: number, id: PlayerId = 1) {
  return new Kendo0Com(COM0_LEVELS[Math.min(5, Math.max(1, level)) - 1]!, seed, id)
}
