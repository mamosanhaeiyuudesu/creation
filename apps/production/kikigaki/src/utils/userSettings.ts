// 利用者ごとの設定の正規化。サーバー／クライアント共用の純粋関数（テストしやすいようにここへ切り出す）。

import { DEFAULT_PDF_MAX_CHARS, PDF_MAX_CHARS_MAX, PDF_MAX_CHARS_MIN } from '~/types/settings'
import type { UserSettings } from '~/types/settings'

/** 500〜4000の整数に丸める。数値でなければ既定値（PDFの要約が延々と走らないための保険） */
function clampMaxChars(v: unknown, fallback: number): number {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(PDF_MAX_CHARS_MAX, Math.max(PDF_MAX_CHARS_MIN, Math.round(n)))
}

export function defaultUserSettings(): UserSettings {
  return { pdfMaxChars: DEFAULT_PDF_MAX_CHARS }
}

/** 画面やDBから来た値を、そのまま信じず範囲内に揃える */
export function normalizeUserSettings(raw: unknown): UserSettings {
  const src = raw && typeof raw === 'object' ? (raw as any) : {}
  return { pdfMaxChars: clampMaxChars(src.pdfMaxChars, DEFAULT_PDF_MAX_CHARS) }
}
