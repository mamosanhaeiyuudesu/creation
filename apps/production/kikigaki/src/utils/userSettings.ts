// 利用者ごとの設定の正規化。サーバー／クライアント共用の純粋関数（テストしやすいようにここへ切り出す）。

import {
  DEFAULT_PDF_LEFT_MAX_CHARS,
  DEFAULT_PDF_RIGHT_MAX_CHARS,
  PRINT_MAX_CHARS_MAX,
  PRINT_MAX_CHARS_MIN,
} from '~/types/settings'
import type { UserSettings } from '~/types/settings'

/** 100〜3000の整数に丸める。数値でなければ既定値（PDFの要約が延々と走らないための保険） */
function clampMaxChars(v: unknown, fallback: number): number {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(PRINT_MAX_CHARS_MAX, Math.max(PRINT_MAX_CHARS_MIN, Math.round(n)))
}

export function defaultUserSettings(): UserSettings {
  return { pdfLeftMaxChars: DEFAULT_PDF_LEFT_MAX_CHARS, pdfRightMaxChars: DEFAULT_PDF_RIGHT_MAX_CHARS }
}

/** 画面やDBから来た値を、そのまま信じず範囲内に揃える */
export function normalizeUserSettings(raw: unknown): UserSettings {
  const src = raw && typeof raw === 'object' ? (raw as any) : {}
  return {
    pdfLeftMaxChars: clampMaxChars(src.pdfLeftMaxChars, DEFAULT_PDF_LEFT_MAX_CHARS),
    pdfRightMaxChars: clampMaxChars(src.pdfRightMaxChars, DEFAULT_PDF_RIGHT_MAX_CHARS),
  }
}
