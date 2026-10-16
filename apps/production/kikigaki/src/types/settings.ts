// 利用者ごとの設定（アカウント全体）。サーバー／クライアント共用。

/** PDFの目安文字数。超えた列だけ、PDFをつくるときにAIが文字数内に要約し直す */
export interface UserSettings {
  /** PDF左の列（まとめ＋話し合ったこと）の目安文字数 */
  pdfLeftMaxChars: number
  /** PDF右の列（決まったこと・つぎの予定・やること）を合計した目安文字数 */
  pdfRightMaxChars: number
}

// 左右あわせて2000字。概要（summary）自体をAIが最大1000文字・章立てで書く仕様に合わせている。
export const DEFAULT_PDF_LEFT_MAX_CHARS = 1000
export const DEFAULT_PDF_RIGHT_MAX_CHARS = 1000
export const PRINT_MAX_CHARS_MIN = 100
export const PRINT_MAX_CHARS_MAX = 3000
