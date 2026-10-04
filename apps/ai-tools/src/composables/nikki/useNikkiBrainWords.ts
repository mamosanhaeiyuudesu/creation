// nikki の日記トピック見出しを形態素解析して出現頻度を集計する。
// tokenize.ts（hagemashi 共用）の `tokenize` をそのまま使う。
// 単語は5文字以内に限定する（脳内ビジュアライゼーション用）。

import { tokenize } from '~/utils/hagemashi/tokenize'
import type { NikkiDay } from '~/types/nikki'

export interface BrainWord {
  word: string
  count: number
}

const MAX_WORD_LEN = 5

export function useNikkiBrainWords(days: Ref<NikkiDay[]>) {
  const words = computed<BrainWord[]>(() => {
    const freq = new Map<string, number>()
    for (const day of days.value) {
      for (const topic of day.topics) {
        const tokens = tokenize(topic.headline)
        for (const t of tokens) {
          if ([...t].length > MAX_WORD_LEN) continue
          freq.set(t, (freq.get(t) ?? 0) + 1)
        }
      }
    }
    return [...freq.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 150)
  })

  return { words }
}
