import { describe, expect, it } from 'vitest'
import { normalizeUserSettings } from '~/utils/userSettings'
import { splitPrintBudget } from '~/utils/printBudget'
import { DEFAULT_PDF_MAX_CHARS, PDF_MAX_CHARS_MAX, PDF_MAX_CHARS_MIN } from '~/types/settings'

describe('normalizeUserSettings', () => {
  it('何も無ければ2000字', () => {
    expect(normalizeUserSettings(undefined)).toEqual({ pdfMaxChars: DEFAULT_PDF_MAX_CHARS })
    expect(DEFAULT_PDF_MAX_CHARS).toBe(2000)
  })

  it('PDFの目安文字数は500〜4000に丸め、数値でない・空欄なら既定値にする', () => {
    expect(normalizeUserSettings({ pdfMaxChars: 10 }).pdfMaxChars).toBe(PDF_MAX_CHARS_MIN)
    expect(normalizeUserSettings({ pdfMaxChars: 99999 }).pdfMaxChars).toBe(PDF_MAX_CHARS_MAX)
    expect(normalizeUserSettings({ pdfMaxChars: 'たくさん' }).pdfMaxChars).toBe(DEFAULT_PDF_MAX_CHARS)
    // 画面で数字欄を空にしたまま保存したとき（Number('') は 0 なので、そのまま丸めると最小値になってしまう）
    expect(normalizeUserSettings({ pdfMaxChars: '' }).pdfMaxChars).toBe(DEFAULT_PDF_MAX_CHARS)
    expect(normalizeUserSettings({ pdfMaxChars: '3000' }).pdfMaxChars).toBe(3000)
  })
})

describe('splitPrintBudget', () => {
  it('全体に収まっていれば、どちらも要約しない（そのままの文字数を返す）', () => {
    expect(splitPrintBudget(900, 800, 2000)).toEqual({ left: 900, right: 800 })
  })

  it('片方が半分に届かなければ、余りをもう片方に回す', () => {
    expect(splitPrintBudget(600, 2500, 2000)).toEqual({ left: 600, right: 1400 })
    expect(splitPrintBudget(3000, 300, 2000)).toEqual({ left: 1700, right: 300 })
  })

  it('両方とも半分を超えていれば、半分ずつ', () => {
    expect(splitPrintBudget(1500, 1500, 2000)).toEqual({ left: 1000, right: 1000 })
    expect(splitPrintBudget(1500, 1500, 999)).toEqual({ left: 499, right: 500 })
  })
})
