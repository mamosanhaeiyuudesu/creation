// 剣道ゲーム共通の、種（シード）から決まる乱数（mulberry32）。
// 状態を数値1つで持てるので、MatchState に入れても「同じ入力なら同じ結果」が保てる（テストで再現できる）。

/** 0以上1未満の乱数と、次の状態を返す */
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** 状態を中に持つ版（COM のように、自分の中だけで使うとき） */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    const [v, s] = nextRandom(this.state)
    this.state = s
    return v
  }

  /** 確率 p で true */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]!
  }
}
