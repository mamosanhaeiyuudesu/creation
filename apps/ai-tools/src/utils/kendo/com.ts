// 第1弾のCOM。人と同じく「相手の動きを reaction フレーム遅れて見る」＝ずるい読み（入力の先読み）はしない。
// 強さで変わるのは、反応の遅さ・届かない所から打ってしまう確率・相手の空振りを打つ確率・技の選び方。
import { Rng } from '../kendo-shared/rng'
import { CHIKAMA_DISTANCE, ISSOKU_DISTANCE, PART_OFFSET, STRIKES, TECHNIQUE_PART } from './constants'
import { NO_ACTIONS, NO_INPUT } from './match'
import type { Action, MatchState, PlayerId, PlayerInput, Technique } from './types'

export interface Com1Params {
  reaction: number
  jitter: number
  /** 遠間から打ってしまう確率（考えるたび） */
  farAttack: number
  /** 相手の空振り（戻りの隙）を打つ確率 */
  punish: number
  /** 届く距離にいるとき打つ確率（考えるたび） */
  aggression: number
  /** 技を選ぶとき、速い小手・遠くまで届く面を使い分ける */
  smart: boolean
  /** 何フレームごとに次の行動を考えるか（小さいほど、届いた瞬間に打てる） */
  think: number
}

export const COM1_LEVELS: readonly Com1Params[] = [
  { reaction: 30, jitter: 6, farAttack: 0.3, punish: 0, aggression: 0.2, smart: false, think: 12 }, // ★1 0.5秒
  { reaction: 24, jitter: 5, farAttack: 0.2, punish: 0.25, aggression: 0.35, smart: false, think: 10 },
  { reaction: 18, jitter: 4, farAttack: 0.1, punish: 0.5, aggression: 0.5, smart: false, think: 8 }, // ★3 0.3秒
  { reaction: 13, jitter: 3, farAttack: 0.03, punish: 0.8, aggression: 0.75, smart: true, think: 5 },
  { reaction: 9, jitter: 2, farAttack: 0, punish: 1, aggression: 0.95, smart: true, think: 3 }, // ★5 0.15秒
]

/** 「遠くから打ってしまう」のは、振りかぶりの間に相手が近づいても届かない遠さのときだけ */
const FAR_ATTACK_MARGIN = 0.6
const TECHNIQUES: readonly Technique[] = ['men', 'kote', 'do']

/** 踏み込み込みで届く、体の中心どうしの最大距離 */
export function maxReach(t: Technique): number {
  return STRIKES[t].reach + STRIKES[t].lunge + PART_OFFSET[TECHNIQUE_PART[t]]
}

export class Kendo1Com {
  private readonly params: Com1Params
  private readonly id: PlayerId
  private readonly rng: Rng
  private history: MatchState[] = []
  /** 前後の歩き（+1 前 / -1 後ろ / 0）。次に考えるまで続ける */
  private walk: -1 | 0 | 1 = 0
  private nextThink = 0
  private punishedStrikeAt = -1

  constructor(params: Com1Params, seed: number, id: PlayerId = 1) {
    this.params = params
    this.rng = new Rng(seed)
    this.id = id
  }

  decide(s: MatchState): PlayerInput {
    this.history.push(s)
    const delay = this.params.reaction + Math.round((this.rng.next() * 2 - 1) * this.params.jitter)
    while (this.history.length > this.params.reaction + this.params.jitter + 1) this.history.shift()
    const seen = this.history[Math.max(0, this.history.length - 1 - delay)]!
    const me = s.fighters[this.id]
    const opp = seen.fighters[this.id === 0 ? 1 : 0]

    if (s.phase !== 'fight' || seen.phase !== 'fight' || (me.phase !== 'idle' && me.phase !== 'move')) {
      this.walk = 0
      return NO_INPUT
    }
    const d = Math.abs(me.x - opp.x)
    const reachable = TECHNIQUES.filter((t) => maxReach(t) >= d)

    // 相手の空振りの隙（戻り）を見たら、その打突につき1回だけ打つか決める
    if (opp.phase === 'recovery' && reachable.length > 0) {
      const strikeAt = seen.frame - opp.phaseFrame
      if (strikeAt !== this.punishedStrikeAt) {
        this.punishedStrikeAt = strikeAt
        if (this.rng.chance(this.params.punish)) return this.strike(this.choose(reachable, d))
      }
    }

    if (s.frame < this.nextThink) return this.walkInput(me.facing)
    this.nextThink = s.frame + this.params.think

    if (reachable.length > 0 && this.rng.chance(this.params.aggression)) return this.strike(this.choose(reachable, d))
    if (d > ISSOKU_DISTANCE) {
      if (d > ISSOKU_DISTANCE + FAR_ATTACK_MARGIN && this.rng.chance(this.params.farAttack)) {
        return this.strike(this.rng.pick(TECHNIQUES))
      }
      this.walk = 1
    } else if (d < CHIKAMA_DISTANCE) {
      this.walk = -1
    } else {
      this.walk = this.rng.pick([-1, 0, 0, 1] as const)
    }
    return this.walkInput(me.facing)
  }

  /** smart: 届くなら速い小手、次に面。そうでなければ届くものから適当に */
  private choose(reachable: Technique[], d: number): Technique {
    if (!this.params.smart) return this.rng.pick(reachable)
    if (maxReach('kote') >= d) return 'kote'
    return reachable.includes('men') ? 'men' : reachable[0]!
  }

  private strike(t: Technique): PlayerInput {
    this.walk = 0
    const pressed: Record<Action, boolean> = { ...NO_ACTIONS, [t]: true }
    return { held: pressed, pressed }
  }

  private walkInput(facing: 1 | -1): PlayerInput {
    if (this.walk === 0) return NO_INPUT
    const screenRight = this.walk * facing > 0
    return { held: { ...NO_ACTIONS, right: screenRight, left: !screenRight }, pressed: NO_ACTIONS }
  }
}

export function createKendo1Com(level: number, seed: number, id: PlayerId = 1) {
  return new Kendo1Com(COM1_LEVELS[Math.min(5, Math.max(1, level)) - 1]!, seed, id)
}
