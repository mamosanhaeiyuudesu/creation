// 第2弾のCOM。相手の動きを reaction フレーム遅れて見る（入力の先読みはしない）。
// 相手の振りかぶりが見えたら、確率で正しい防御を選び、防げたら確率で返し技を打つ。
// 攻めるときは（強いほど）相手の構えに入る技を選ぶ。
import { Rng } from '../kendo-shared/rng'
import { CHIKAMA_DISTANCE, ISSOKU_DISTANCE, OPENINGS, PART_OFFSET, STRIKES } from './constants'
import { effectiveGuard } from './fighter'
import { NO_ACTIONS, NO_INPUT } from './match'
import type { Action, Guard, MatchState, PlayerId, PlayerInput, Technique } from './types'

export interface Com2Params {
  reaction: number
  jitter: number
  /** 相手の振りかぶりを見て、正しい防御を選ぶ確率 */
  guardAccuracy: number
  /** 防げたときに返し技を打つ確率 */
  kaeshi: number
  /** 届く距離にいるとき打つ確率（考えるたび） */
  aggression: number
  /** 相手の構え（防御）を見て、入る技を選ぶ */
  readStance: boolean
  /** 遠間から打ってしまう確率（考えるたび） */
  farAttack: number
  /** 届く距離で、読みで先に守る確率（考えるたび）。見てからでは間に合わない打突も防げることがある */
  anticipate: number
  think: number
}

export const COM2_LEVELS: readonly Com2Params[] = [
  { reaction: 27, jitter: 6, guardAccuracy: 0.2, kaeshi: 0.1, aggression: 0.2, readStance: false, farAttack: 0.3, anticipate: 0.08, think: 12 }, // ★1 0.45秒
  { reaction: 24, jitter: 5, guardAccuracy: 0.4, kaeshi: 0.3, aggression: 0.3, readStance: false, farAttack: 0.2, anticipate: 0.12, think: 10 },
  { reaction: 18, jitter: 4, guardAccuracy: 0.6, kaeshi: 0.6, aggression: 0.4, readStance: true, farAttack: 0.1, anticipate: 0.16, think: 8 }, // ★3 0.3秒
  { reaction: 15, jitter: 3, guardAccuracy: 0.75, kaeshi: 0.8, aggression: 0.5, readStance: true, farAttack: 0.03, anticipate: 0.2, think: 6 },
  { reaction: 12, jitter: 2, guardAccuracy: 0.9, kaeshi: 0.95, aggression: 0.6, readStance: true, farAttack: 0, anticipate: 0.24, think: 4 }, // ★5 0.2秒
]

const TECHNIQUES: readonly Technique[] = ['men', 'kote', 'do', 'tsuki']
const FAR_ATTACK_MARGIN = 0.6
/** 読みで守るとき、防御を続ける長さ */
const ANTICIPATE_FRAMES = 30
/** 相手の技に対する正しい防御（胴は構えのままでも外れるが、小手の防御で止めれば返し技を狙える） */
const RIGHT_GUARD: Readonly<Record<Technique, Guard>> = { men: 'men', tsuki: 'men', kote: 'kote', do: 'kote' }
const GUARD_ACTION: Readonly<Record<Guard, Action>> = { men: 'guardMen', kote: 'guardKote' }

export function maxReach(t: Technique): number {
  return STRIKES[t].reach + STRIKES[t].lunge + PART_OFFSET[t]
}

export class Kendo2Com {
  private readonly params: Com2Params
  private readonly id: PlayerId
  private readonly rng: Rng
  private history: MatchState[] = []
  private walk: -1 | 0 | 1 = 0
  private nextThink = 0
  /** 防御を押し続けている間の種類 */
  private guard: Guard | null = null
  private guardPressedAt = -1
  /** 読みで守っているときの終わり（-1 ＝ 見てから守っている） */
  private guardUntil = -1
  /** 反応済みの相手の打突（振りかぶりを始めたフレーム） */
  private reactedStrikeAt = -1
  /** 返し技を打つと決めたフレーム（防げた瞬間に決める） */
  private kaeshiAt = -1
  private kaeshiDecidedFor = -1

  constructor(params: Com2Params, seed: number, id: PlayerId = 1) {
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

    if (s.phase !== 'fight' || seen.phase !== 'fight') {
      this.reset()
      return NO_INPUT
    }
    const neutral = me.phase === 'idle' || me.phase === 'move' || me.phase === 'guard'
    if (!neutral) {
      this.guard = null
      this.walk = 0
      return NO_INPUT
    }
    const d = Math.abs(me.x - opp.x)
    const reachable = TECHNIQUES.filter((t) => maxReach(t) >= d)

    // 返し技: 防げた瞬間に打つか決め、少し（反応の半分）遅れて打つ
    if (me.kaeshiWindow > 0) {
      const blockedAt = s.frame - (30 - me.kaeshiWindow)
      if (this.kaeshiDecidedFor !== blockedAt) {
        this.kaeshiDecidedFor = blockedAt
        this.kaeshiAt = this.rng.chance(this.params.kaeshi) ? s.frame + Math.round(this.params.reaction / 2) : -1
      }
      if (this.kaeshiAt >= 0 && s.frame >= this.kaeshiAt && reachable.length > 0) {
        this.kaeshiAt = -1
        // 相手は崩れているのでどれでも入る。届くもののうち、いちばん速い振りかぶりの返し技は同じなので面を優先
        return this.strike(reachable.includes('men') ? 'men' : reachable[0]!)
      }
    }

    // 防御: 相手の振りかぶりが見えたら、その打突につき1回だけ防御を選ぶ
    if (opp.phase === 'windup' && opp.technique) {
      const strikeAt = seen.frame - opp.phaseFrame
      if (strikeAt !== this.reactedStrikeAt) {
        this.reactedStrikeAt = strikeAt
        const before = this.guard
        if (this.rng.chance(this.params.guardAccuracy)) this.guard = RIGHT_GUARD[opp.technique]
        else this.guard = this.rng.chance(0.5) ? before : RIGHT_GUARD[opp.technique] === 'men' ? 'kote' : 'men'
        if (this.guard !== before) this.guardPressedAt = s.frame
        this.guardUntil = -1
      }
    } else if (this.guardUntil >= 0) {
      if (s.frame >= this.guardUntil && me.kaeshiWindow === 0) {
        this.guard = null
        this.guardUntil = -1
      }
    } else if (this.guard && opp.phase !== 'active' && me.kaeshiWindow === 0 && s.frame - this.guardPressedAt > 10) {
      // 相手の打突が終わったら防御を解く
      this.guard = null
    }
    if (this.guard) return this.guardInput()

    if (s.frame < this.nextThink) return this.walkInput(me.facing)
    this.nextThink = s.frame + this.params.think

    if (me.attackCooldown === 0 && reachable.length > 0 && this.rng.chance(this.params.aggression)) {
      const choice = this.choose(reachable, effectiveGuard(opp) ?? 'normal')
      if (choice) return this.strike(choice)
    }
    if (reachable.length > 0 && this.rng.chance(this.params.anticipate)) {
      this.guard = this.rng.pick(['men', 'kote'] as const)
      this.guardPressedAt = s.frame
      this.guardUntil = s.frame + ANTICIPATE_FRAMES
      return this.guardInput()
    }
    if (d > ISSOKU_DISTANCE) {
      if (me.attackCooldown === 0 && d > ISSOKU_DISTANCE + FAR_ATTACK_MARGIN && this.rng.chance(this.params.farAttack)) {
        return this.strike(this.rng.pick(TECHNIQUES))
      }
      this.walk = 1
    } else if (d < CHIKAMA_DISTANCE || me.attackCooldown > 0) {
      // 打てない間は下がって間合いを切る
      this.walk = d < ISSOKU_DISTANCE ? -1 : 0
    } else {
      this.walk = this.rng.pick([-1, 0, 0, 1] as const)
    }
    return this.walkInput(me.facing)
  }

  /** 相手の構えに入る技を選ぶ。入る技が届かなければ打たない（readStance が無ければ当てずっぽう） */
  private choose(reachable: Technique[], stance: 'normal' | Guard): Technique | null {
    if (!this.params.readStance) return this.rng.pick(reachable)
    const open = reachable.filter((t) => OPENINGS[stance][t])
    return open.length > 0 ? this.rng.pick(open) : null
  }

  private reset() {
    this.guard = null
    this.guardUntil = -1
    this.walk = 0
    this.kaeshiAt = -1
  }

  private strike(t: Technique): PlayerInput {
    this.walk = 0
    this.guard = null
    this.guardUntil = -1
    const pressed: Record<Action, boolean> = { ...NO_ACTIONS, [t]: true }
    return { held: pressed, pressed }
  }

  private guardInput(): PlayerInput {
    const action = GUARD_ACTION[this.guard!]
    const held = { ...NO_ACTIONS, [action]: true }
    return { held, pressed: this.guardPressedAt === this.history.at(-1)!.frame ? held : NO_ACTIONS }
  }

  private walkInput(facing: 1 | -1): PlayerInput {
    if (this.walk === 0) return NO_INPUT
    const screenRight = this.walk * facing > 0
    return { held: { ...NO_ACTIONS, right: screenRight, left: !screenRight }, pressed: NO_ACTIONS }
  }
}

export function createKendo2Com(level: number, seed: number, id: PlayerId = 1) {
  return new Kendo2Com(COM2_LEVELS[Math.min(5, Math.max(1, level)) - 1]!, seed, id)
}
