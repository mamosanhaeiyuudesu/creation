// nikki の文字起こし辞書。純粋関数だけ置く（ブラウザ・テストの両方から使う）。

export interface NikkiDictionaryEntry {
  id: string
  word: string
  /** 聞き間違えられやすい表記（読点区切り）。空でもよい */
  wrong: string
}

/** Whisper の prompt は約224トークンまでしか効かないので、手前で文字数を切る */
const PROMPT_MAX_CHARS = 200

/**
 * 文字起こしのヒント文。固有名詞を並べるだけだと効かないので文章の形にする（kikigaki の辞書で実測済み）。
 * 後ろに登録した語ほど効きやすいので、新しく足した語が切られないよう末尾から詰める。
 */
export function buildDictionaryPrompt(items: NikkiDictionaryEntry[], maxChars = PROMPT_MAX_CHARS): string {
  const words: string[] = []
  let used = 0
  for (const it of [...items].reverse()) {
    if (words.includes(it.word)) continue
    if (used + it.word.length + 1 > maxChars) break
    words.unshift(it.word)
    used += it.word.length + 1
  }
  return words.length ? `次の言葉が出てきます: ${words.join('、')}。` : ''
}

/** 「聞き間違えられやすい表記」を正しい表記へ置き換える。長い表記から先に置き換える（部分一致の取りこぼし防止）。 */
export function applyDictionary(text: string, items: NikkiDictionaryEntry[]): string {
  const pairs: Array<[string, string]> = []
  for (const it of items) {
    for (const w of it.wrong.split('、')) {
      const wrong = w.trim()
      if (wrong && wrong !== it.word) pairs.push([wrong, it.word])
    }
  }
  pairs.sort((a, b) => b[0].length - a[0].length)
  return pairs.reduce((acc, [wrong, word]) => acc.split(wrong).join(word), text)
}
