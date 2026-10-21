import { ref } from 'vue'

/**
 * 問題ごとのイイね。ログインが無いので、この端末が作ったランダムID（voter）を「1人」とみなす。
 * 別端末・データ消去で押し直せてしまうのは、ログインが無い以上の限界。
 */
const VOTER_KEY = 'manabi-voter-v1'

export function voterId(): string {
  try {
    let v = localStorage.getItem(VOTER_KEY)
    if (!v || !/^[a-zA-Z0-9-]{16,64}$/.test(v)) {
      v = crypto.randomUUID()
      localStorage.setItem(VOTER_KEY, v)
    }
    return v
  } catch {
    // localStorage が使えない環境では、このページを開いている間だけの ID にする
    return (memoryVoter ??= crypto.randomUUID())
  }
}
let memoryVoter: string | null = null

export function useManabiLikes(setId: string) {
  /** 問題の添字 → イイね数 */
  const counts = ref<Record<number, number>>({})
  /** この端末で押した問題の添字 */
  const mine = ref<Set<number>>(new Set())

  const load = async () => {
    try {
      const res = await $fetch<{ counts: Record<number, number>; mine: number[] }>(`/api/sets/${setId}/likes`, {
        query: { voter: voterId() },
      })
      counts.value = res.counts
      mine.value = new Set(res.mine)
    } catch {
      /* 取れなくても解ける */
    }
  }

  /** 押す。成功したら true。押した直後に反映し、失敗したら戻す */
  const like = async (q: number): Promise<boolean> => {
    if (mine.value.has(q)) return false
    const prevCount = counts.value[q] ?? 0
    mine.value = new Set(mine.value).add(q)
    counts.value = { ...counts.value, [q]: prevCount + 1 }
    try {
      const res = await $fetch<{ count: number }>(`/api/sets/${setId}/likes`, { method: 'POST', body: { q, voter: voterId() } })
      counts.value = { ...counts.value, [q]: res.count }
      return true
    } catch {
      const rolled = new Set(mine.value)
      rolled.delete(q)
      mine.value = rolled
      counts.value = { ...counts.value, [q]: prevCount }
      return false
    }
  }

  return { counts, mine, load, like }
}
