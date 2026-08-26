// キキガキの用語辞書。人名・地名・専門用語の表記ゆれを補正するために使う。
//
// 使いどころは2つ:
//   1. OpenAI の文字起こし（prompt パラメータに正しい表記を並べて渡し、認識精度を上げる）
//   2. Claude の構造化（システムプロンプトに JSON を埋め込み、表記ゆれを補正させる）
//
// 【意図的に全ユーザー共通】
// ai-tools の他のツール（task_profiles / momo_settings / guesthouse_tips / keiko_items）は
// どれも user_id スコープなので、辞書だけ共通なのは一見すると不整合に見える。が、これは選択の結果。
//
// キキガキを使うのは同じ地域の身内（同じ消防団・青年部）で、「阪中さん」「葛城町」「先行細菌病」は
// 全員に効いてほしい語彙だから。ユーザーごとに分けると、同じ地域の語彙を各自が登録し直すことになり、
// 新しく入った人ほど精度が出ない。共通にしておけば誰が使っても最初から精度が出る。
//
// なので運用は「このファイルを手で編集して再デプロイ」。これは仮の姿ではなく決めた形。
// ユーザーごとに分けたくなるのは、地域の違う人が使い始めたとき（共通のベース＋各自の追加分を
// マージする形が素直）。それまでは分けないこと。

export interface GlossaryEntry {
  /** 正しい表記 */
  correct: string
  /**
   * 文字起こしで出がちな誤り・ゆれ。ひらがな読みと誤変換の**両方**を入れてよい。
   *   例: { correct: '祥子', variants: ['しょうこ', '翔子', '尚子'] }
   *
   * 優先度が高いのは**誤変換した漢字**のほう。ひらがな読みは correct が文字起こしAPIの
   * prompt に渡っている時点である程度防げるが、誤変換はプロンプトでは防ぎきれないため、
   * ここに書かないと直る見込みがない。レビュー画面の文字起こし全文を見て、実際に化けていた
   * 文字列をそのままコピーするのが一番効く。
   *
   * ※ hagemashi の辞書（`{yomi, word}` を replaceAll する）とは仕組みが違う点に注意。
   *   あちらは機械的な文字列置換なので完全一致が要り、「しょうこ→祥子」が
   *   「証拠がある」を「祥子がある」に壊す事故が起きうる。こちらは Claude が文脈で
   *   判断するので、同音異義語でそこまで誤爆しないし、完全一致でなくても拾える。
   */
  variants: string[]
}

export interface Glossary {
  people: GlossaryEntry[]
  places: GlossaryEntry[]
  terms: GlossaryEntry[]
}

export const KIKIGAKI_GLOSSARY: Glossary = {
  people: [
    { correct: '阪中さん', variants: ['さかなかさん', 'さかちゅうさん'] },
  ],
  places: [
    { correct: '葛城町', variants: ['かつらぎちょう', 'かづらぎ町'] },
  ],
  terms: [
    { correct: '先行細菌病', variants: ['せんこうさいきんびょう', '先行菌病'] },
    { correct: '消防団', variants: ['しょうぼうだん'] },
    { correct: '青年部', variants: ['せいねんぶ'] },
  ],
}

/** 全カテゴリの「正しい表記」を平らに並べる */
export function glossaryTerms(glossary: Glossary = KIKIGAKI_GLOSSARY): string[] {
  return [...glossary.people, ...glossary.places, ...glossary.terms].map((e) => e.correct)
}

/**
 * 文字起こしAPIの prompt パラメータへ渡すヒント。
 *
 * **固有名詞を並べるだけにして、文章の形にしないこと。**
 * gpt-4o-transcribe は prompt を文脈として扱うため、「次の固有名詞が出てきます: 〜」のような
 * 文にすると、その続きとして prompt 自体を本文へ書き起こしてしまう（実際に会議の
 * 文字起こしの冒頭へ丸ごと漏れた）。OpenAI が想定しているのも固有名詞の羅列の形。
 *
 * また、このパラメータは長すぎると後ろが切り捨てられる（Whisper系は約224トークン）ので、
 * variants は入れずに「正しい表記」だけを並べる。
 */
export function glossaryPromptHint(glossary: Glossary = KIKIGAKI_GLOSSARY): string {
  return glossaryTerms(glossary).join('、')
}

/** Claude のシステムプロンプトへ埋め込む用の JSON 文字列 */
export function glossaryJson(glossary: Glossary = KIKIGAKI_GLOSSARY): string {
  return JSON.stringify(glossary, null, 2)
}
