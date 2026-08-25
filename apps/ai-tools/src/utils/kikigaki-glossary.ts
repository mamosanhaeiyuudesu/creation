// キキガキの用語辞書。人名・地名・専門用語の表記ゆれを補正するために使う。
//
// 使いどころは2つ:
//   1. OpenAI の文字起こし（prompt パラメータに正しい表記を並べて渡し、認識精度を上げる）
//   2. Claude の構造化（システムプロンプトに JSON を埋め込み、表記ゆれを補正させる）
//
// MVPでは「このファイルを手で編集して再デプロイ」する運用。
// レビュー画面から辞書に追加できるUI（＝D1へ移す）は後回しの改善タスク。

export interface GlossaryEntry {
  /** 正しい表記 */
  correct: string
  /** 文字起こしで出がちな誤り・ゆれ */
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
 * 文字起こしAPIの prompt パラメータ用のヒント文。
 * このパラメータは長すぎると後ろが切り捨てられる（Whisper系は約224トークン）ので、
 * variants は入れずに「正しい表記」だけを短く並べる。
 */
export function glossaryPromptHint(glossary: Glossary = KIKIGAKI_GLOSSARY): string {
  const terms = glossaryTerms(glossary)
  if (!terms.length) return ''
  return `次の固有名詞が出てきます: ${terms.join('、')}。`
}

/** Claude のシステムプロンプトへ埋め込む用の JSON 文字列 */
export function glossaryJson(glossary: Glossary = KIKIGAKI_GLOSSARY): string {
  return JSON.stringify(glossary, null, 2)
}
