// 記録テキストを単語に分割する。
//
// ブラウザ内蔵の Intl.Segmenter（ICU の辞書ベース分割）を使う。追加の辞書ダウンロードが不要で、
// 従来の正規表現方式（漢字2字以上の連続を拾う）より明確に精度が高い:
//   「面白い話聞いた」 正規表現 → 面白 / 話聞（"話聞" というゴミが出る）
//                     ICU      → 面白い / 話 / 聞
//   「残業続きで」     正規表現 → 残業続      ICU → 残業 / 続き
//   「帰り道で」       正規表現 → （取り逃す）ICU → 帰り道
//
// ただし ICU は形態素解析器ではなく辞書引きなので、活用した用言は文字単位に砕ける
// （「つらかった」→ つ/ら/か/っ/た）。原形に戻す手段がないため用言は採らず、
// 名詞・複合名詞を骨格にする方針とする。断片は下の表記ルールで落とす。
//
// 非対応環境では従来の正規表現にフォールバックする。

const RE_KANJI = /[㐀-䶿一-鿿豈-﫿]/
const RE_KANJI_G = /[㐀-䶿一-鿿豈-﫿]/g
const RE_KATAKANA_ONLY = /^[ァ-ヺーヽヾ]+$/
const RE_HIRAGANA_ONLY = /^[ぁ-ゟ]+$/
const RE_LATIN_ONLY = /^[A-Za-z][A-Za-z0-9]*$/
const RE_TRIM = /^[\s、。，．・…「」『』（）()｢｣"'’”~〜ー\-—:：;；!！?？]+|[\s、。，．・…「」『』（）()｢｣"'’”~〜:：;；!！?？]+$/g

// 漢字1字は原則ゴミ（「事」「的」「中」など語の断片）だが、日々の記録では
// これ自体が主題になる語もあるため、明示した語だけ通す。
const SINGLE_KANJI_ALLOW = new Set([
  '母', '父', '妻', '夫', '娘', '兄', '姉', '弟', '妹', '親', '子', '友', '祖母', '祖父',
  '朝', '昼', '夜', '春', '夏', '秋', '冬',
  '夢', '涙', '声', '心', '体', '頭', '顔', '肩', '腰', '胃', '熱', '薬', '汗',
  '家', '寮', '庭', '駅', '街', '海', '山', '空', '雨', '雪', '風', '花', '星',
  '犬', '猫', '本', '車', '金', '酒', '恋', '愛', '罪', '嘘', '癖',
])

// 用言の断片や助詞まわりで頻出する、単体では意味を持たないひらがな語。
// ユーザーが編集する stoplist とは別に、常に落とす組み込みの除外。
const BUILTIN_REJECT = new Set([
  'こと', 'もの', 'とき', 'ところ', 'ため', 'よう', 'そう', 'これ', 'それ', 'あれ', 'どれ',
  'ここ', 'そこ', 'あそこ', 'どこ', 'わたし', 'あなた', 'じぶん', 'みんな', 'ひと',
  'ずっと', 'もっと', 'ちょっと', 'やっぱり', 'やはり', 'たぶん', 'きっと', 'すごく',
  'いつも', 'いつか', 'いちばん', 'いっぱい', 'たくさん', 'すこし', 'あまり', 'なんか',
  'という', 'そして', 'でも', 'けれど', 'しかし', 'だから', 'ながら', 'について',
  'した', 'して', 'される', 'すること', 'できる', 'なって', 'いる', 'ある', 'なる',
])

function countKanji(s: string): number {
  const m = s.match(RE_KANJI_G)
  return m ? m.length : 0
}

/**
 * 分割された1トークンを単語として採用するか判定する。
 *
 * 用言が文字単位に砕けた断片（「っ」「い」「しか」など）と、語の一部でしかない
 * 漢字1字を落とすのが主目的。判定は表記種別と長さだけで行う（品詞情報は得られないため）。
 */
export function isMeaningfulToken(token: string): boolean {
  const t = token
  if (!t) return false
  if (BUILTIN_REJECT.has(t)) return false

  const kanji = countKanji(t)

  if (kanji > 0) {
    // 「行っ」「思っ」のような促音で切れた動詞の断片
    if (t.endsWith('っ')) return false
    // 漢字2字以上を含めば複合語・熟語とみなす（仕事 / 帰り道 / 気持ち）
    if (kanji >= 2) return true
    // 漢字1字＋送りがな。「面白い」「久しぶり」は採り、「考え」「続き」は採らない。
    // 送りがな1字だけのものは動詞・形容詞の連用形であることが多く、単語として弱い。
    if (t.length >= 3) return true
    return SINGLE_KANJI_ALLOW.has(t)
  }

  if (RE_KATAKANA_ONLY.test(t)) return t.length >= 2
  // ひらがなのみは助詞・用言断片がほとんどで、拾える実語がごく少ない。採らない。
  if (RE_HIRAGANA_ONLY.test(t)) return false
  if (RE_LATIN_ONLY.test(t)) return t.length >= 2

  return false
}

let segmenter: Intl.Segmenter | null | undefined

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter !== undefined) return segmenter
  try {
    segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter('ja', { granularity: 'word' })
      : null
  } catch {
    segmenter = null
  }
  return segmenter
}

// Intl.Segmenter が無い環境向けのフォールバック（従来と同じ挙動）
function fallbackSplit(text: string): string[] {
  const words: string[] = []
  const kanjiRe = /[㐀-䶿一-鿿]{2,}/g
  const katakanaRe = /[゠-ヿ]{2,}/g
  let m: RegExpExecArray | null
  while ((m = kanjiRe.exec(text)) !== null) words.push(m[0])
  while ((m = katakanaRe.exec(text)) !== null) words.push(m[0])
  return words
}

/**
 * テキストを単語配列に分割する（出現順・重複あり）。
 * @param stoplist ユーザーが編集する除外単語。渡されたものは結果から除く。
 */
export function tokenize(text: string, stoplist?: Set<string>): string[] {
  if (!text) return []

  const seg = getSegmenter()
  const raw: string[] = []

  if (seg) {
    for (const part of seg.segment(text)) {
      if (!part.isWordLike) continue
      const t = part.segment.replace(RE_TRIM, '')
      if (t) raw.push(t)
    }
  } else {
    raw.push(...fallbackSplit(text))
  }

  const out: string[] = []
  for (const t of raw) {
    if (!isMeaningfulToken(t)) continue
    if (stoplist?.has(t)) continue
    out.push(t)
  }
  return out
}

/** 1つのテキストに含まれる語の集合（同一テキスト内の重複は1回として数えたいとき用） */
export function tokenizeUnique(text: string, stoplist?: Set<string>): string[] {
  return [...new Set(tokenize(text, stoplist))]
}
