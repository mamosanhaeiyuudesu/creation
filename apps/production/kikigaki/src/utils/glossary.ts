// 「よく出る名前」（用語辞書）。1行1語のテキストを、文字起こしとAIの両方に効かせる形へ変える。
// サーバー／クライアント共用の純粋関数（テストもここに対して書く）。
//
// 【ai-tools の /kikigaki との違い】
// あちらは全ユーザー共通のハードコード辞書（ファイルを手で編集して再デプロイ）で、
// 同じ地域の身内だけで使う前提だから成り立っていた。本番版は他人同士が使うので、
// 利用者ごとに自分の関係者の名前を書いてもらう形にしている。
//
// 【辞書の渡し方で踏んだ罠（ai-tools の実測）】
// 文字起こしAPI（gpt-4o-transcribe）の prompt は **文章の形のまま**渡すこと。
// 「語を並べるだけにすればプロンプト漏れが減る」と考えて羅列形式に変えたところ、
// 辞書がまったく効かなくなった（「阪中さん」が「初中さん」のまま＝promptなしと同じ）。
// 漏れ対策は prompt をいじるのではなく、transcript-clean.ts の stripPromptEcho() で
// 結果から取り除く側で行う。

/** 登録できる語の数。prompt は長すぎると後ろが切り捨てられる（Whisper系は約224トークン） */
export const GLOSSARY_MAX_TERMS = 40
/** 1語の長さ。長い文を貼られると prompt を食い潰すため */
export const GLOSSARY_MAX_TERM_LENGTH = 30

/**
 * 入力欄のテキスト（1行1語）を語の配列にする。
 * 空行・前後の空白・重複を落とし、長すぎる語は捨てる（切り詰めると別の語になってしまうため）。
 */
export function parseGlossary(body: string): string[] {
  const seen = new Set<string>()
  const terms: string[] = []
  for (const raw of (body ?? '').split(/\r?\n/)) {
    const term = raw.trim()
    if (!term) continue
    if ([...term].length > GLOSSARY_MAX_TERM_LENGTH) continue
    if (seen.has(term)) continue
    seen.add(term)
    terms.push(term)
    if (terms.length >= GLOSSARY_MAX_TERMS) break
  }
  return terms
}

/**
 * 文字起こしAPIの prompt パラメータへ渡すヒント。
 * **文章の形のままにすること**（上のコメントの理由）。
 */
export function glossaryPromptHint(terms: string[]): string {
  if (!terms.length) return ''
  return `次の固有名詞が出てきます: ${terms.join('、')}。`
}

/** 文字起こし結果から取り除きたい「プロンプトの写し」の候補（文章の形と、語の羅列だけの形） */
export function glossaryEchoNeedles(terms: string[]): string[] {
  if (!terms.length) return []
  return [glossaryPromptHint(terms), terms.join('、')]
}

/** Claude のシステムプロンプトへ埋め込む用の文字列。語が無ければ空文字 */
export function glossaryForPrompt(terms: string[]): string {
  if (!terms.length) return ''
  return terms.map((t) => `- ${t}`).join('\n')
}
