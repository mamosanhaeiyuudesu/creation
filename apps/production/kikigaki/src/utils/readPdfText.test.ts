import { describe, expect, it } from 'vitest'
import { normalizeRadicals } from './readPdfText'

describe('normalizeRadicals', () => {
  it('部首用の文字（PDFでよく混ざる）をふつうの漢字に直す', () => {
    expect(normalizeRadicals('⼭本：今⽇は⽥中さん')).toBe('山本：今日は田中さん')
  })

  it('ほかの字は変えない（丸数字・全角英数・半角カナ）', () => {
    expect(normalizeRadicals('①ＡＢＣｱｲｳ')).toBe('①ＡＢＣｱｲｳ')
  })
})
