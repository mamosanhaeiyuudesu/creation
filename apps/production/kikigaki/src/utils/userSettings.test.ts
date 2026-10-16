import { describe, expect, it } from 'vitest'
import { normalizeUserSettings } from '~/utils/userSettings'
import {
  DEFAULT_PDF_LEFT_MAX_CHARS,
  DEFAULT_PDF_RIGHT_MAX_CHARS,
  PRINT_MAX_CHARS_MAX,
  PRINT_MAX_CHARS_MIN,
} from '~/types/settings'

describe('normalizeUserSettings', () => {
  it('何も無ければ左右1000字（合計2000字）', () => {
    expect(normalizeUserSettings(undefined)).toEqual({
      pdfLeftMaxChars: DEFAULT_PDF_LEFT_MAX_CHARS,
      pdfRightMaxChars: DEFAULT_PDF_RIGHT_MAX_CHARS,
    })
    expect(DEFAULT_PDF_LEFT_MAX_CHARS + DEFAULT_PDF_RIGHT_MAX_CHARS).toBe(2000)
  })

  it('PDFの目安文字数は範囲内に丸め、数値でない・空欄なら既定値にする', () => {
    expect(normalizeUserSettings({ pdfLeftMaxChars: 10 }).pdfLeftMaxChars).toBe(PRINT_MAX_CHARS_MIN)
    expect(normalizeUserSettings({ pdfLeftMaxChars: 99999 }).pdfLeftMaxChars).toBe(PRINT_MAX_CHARS_MAX)
    expect(normalizeUserSettings({ pdfLeftMaxChars: 'たくさん' }).pdfLeftMaxChars).toBe(DEFAULT_PDF_LEFT_MAX_CHARS)
    // 画面で数字欄を空にしたまま保存したとき（Number('') は 0 なので、そのまま丸めると100字になってしまう）
    expect(normalizeUserSettings({ pdfRightMaxChars: '' }).pdfRightMaxChars).toBe(DEFAULT_PDF_RIGHT_MAX_CHARS)
    expect(normalizeUserSettings({ pdfRightMaxChars: '1500' }).pdfRightMaxChars).toBe(1500)
  })
})
