// 文字起こし結果の後始末。
//
// Whisper系のモデル（whisper-1 / gpt-4o-transcribe）は、無音・雑音・複数人の声の重なりで
// 同じ語や同じ文の並びを延々と繰り返す「ループ」に入ることがある（既知の failure mode）。
// 実際の会議録音で「飛行機が飛行機が飛行機が…」が100回以上、長い段落がまるごと8回、といった
// 出力が出た。放っておくと議事録の材料として使いものにならないうえ、AIへ渡すトークンも無駄になる。
//
// あわせて、gpt-4o-transcribe は prompt を「文脈」として扱うため、文章の形で渡すと
// その続きとして本文に書き起こしてしまう（プロンプト漏れ）。それもここで落とす。

/**
 * プロンプトが本文へ漏れたぶんを取り除く。
 * echoes には「プロンプトの文章そのもの」と「そこに含まれる語の羅列だけの形」の両方を渡す
 * （モデルはどちらの形でも書き出してくる）。
 */
export function stripPromptEcho(text: string, echoes: string[]): string {
  let out = text

  // gpt-4o-transcribe が付ける "context: ### ... ###" のブロックごと落とす
  out = out.replace(/^\s*context:\s*#{2,}[\s\S]*?#{2,}\s*/i, '')

  // プロンプトの写しがそのまま行として出ているぶんを落とす。
  // 会話の途中に同じ並びが自然に現れることはまず無いので、行まるごと一致に限って消す。
  const needles = echoes
    .flatMap((e) => [e.trim(), e.replace(/[。.]\s*$/, '').trim()])
    .filter(Boolean)
  out = out
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return true
      return !needles.some((n) => t === n || t === `${n}。`)
    })
    .join('\n')

  return out.trim()
}

/**
 * 1行の中で同じ短い断片が3回以上続くのを1回に畳む（「飛行機が飛行機が飛行機が…」対策）。
 * 長さを固定した `(.{n})\1{2,}` を n ごとに回すので、可変長の後方参照のような
 * 破滅的バックトラックは起きない。
 */
function collapseInlineRepeats(line: string): string {
  let out = line
  for (let unit = 1; unit <= 24; unit++) {
    out = out.replace(new RegExp(`(.{${unit}})\\1{2,}`, 'g'), '$1')
  }
  return out
}

/** items[a..a+len) と items[b..b+len) が同じか */
function sameBlock(items: string[], a: number, b: number, len: number): boolean {
  for (let i = 0; i < len; i++) {
    if (items[a + i] !== items[b + i]) return false
  }
  return true
}

/**
 * 並びの繰り返しを1回分に畳む。
 * 「A A A」だけでなく「A B C A B C A B C」のような**塊ごとの**繰り返しも畳むのが要点で、
 * 実際のループはこの形（同じ段落が丸ごと何度も出る）で現れる。
 *
 * 1文だけの繰り返しは3回以上のときに畳む（相づちの言い直しなど、2回続くのは自然な会話にあるため）。
 * 2文以上の塊は2回続いた時点でループとみなす。
 */
function collapseSequenceRepeats(items: string[], maxUnit = 30): string[] {
  const out: string[] = []
  let i = 0
  while (i < items.length) {
    let collapsed = false
    for (let unit = 1; unit <= maxUnit && i + unit * 2 <= items.length; unit++) {
      let reps = 1
      while (i + unit * (reps + 1) <= items.length && sameBlock(items, i, i + unit * reps, unit)) reps++
      const threshold = unit === 1 ? 3 : 2
      if (reps >= threshold) {
        for (let j = 0; j < unit; j++) out.push(items[i + j]!)
        i += unit * reps
        collapsed = true
        break
      }
    }
    if (!collapsed) {
      out.push(items[i]!)
      i++
    }
  }
  return out
}

/** 「。」と改行で区切って文の配列にする（区切り文字は残す） */
function toSentences(text: string): string[] {
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=。)/))
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 文字起こし結果を読める形に整える。
 * echoes を渡すと、プロンプトが本文へ漏れたぶんも取り除く。
 */
export function cleanTranscript(text: string, echoes: string[] = []): string {
  let out = echoes.length ? stripPromptEcho(text, echoes) : text.trim()
  out = out.split('\n').map(collapseInlineRepeats).join('\n')
  out = collapseSequenceRepeats(toSentences(out)).join('\n')
  return out.trim()
}
