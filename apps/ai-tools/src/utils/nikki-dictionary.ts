// nikki の文字起こし辞書。純粋関数だけ置く（ブラウザ・テストの両方から使う）。

export interface NikkiDictionaryEntry {
  id: string
  word: string
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
