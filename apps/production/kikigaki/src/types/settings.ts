// 利用者ごとの設定（アカウント全体）。サーバー／クライアント共用。

/**
 * PDFの目安文字数（A4横1枚の全体）。超えたときだけ、PDFをつくるときにAIが文字数内に要約し直す。
 * 左右の列への振り分けは PDF をつくるときに自動で決める（utils/printBudget.ts）。
 * 2026-10-18 までは左右別々に設定していたが、ややこしいので1つにした（本人の指示）。
 */
export interface UserSettings {
  pdfMaxChars: number
}

export const DEFAULT_PDF_MAX_CHARS = 2000
export const PDF_MAX_CHARS_MIN = 500
export const PDF_MAX_CHARS_MAX = 4000
