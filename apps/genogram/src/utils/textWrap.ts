/** 婚姻線・感情関係線のラベル/注記を折り返す文字数。GenogramSvg(描画)とuseGenogramLayout(必要な余白の見積もり)の両方で使うため、ここを唯一の情報源にする */
export const LABEL_WRAP_MAX_CHARS = 12

/**
 * 指定文字数ごとに改行する簡易ラッパー。日本語は文字幅がほぼ均一なので、
 * 単語境界を気にせず文字数ベースで折り返せば十分(禁則処理はしない)。
 */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (text.length <= maxCharsPerLine) return [text]
  const lines: string[] = []
  for (let i = 0; i < text.length; i += maxCharsPerLine) {
    lines.push(text.slice(i, i + maxCharsPerLine))
  }
  return lines
}

/** 指定文字数を超える場合は末尾を「…」に置き換える(グラフ上には要点だけを出し、全文はクリックで見る想定) */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}…`
}
