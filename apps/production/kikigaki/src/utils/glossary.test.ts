import { describe, expect, it } from 'vitest'
import {
  GLOSSARY_MAX_TERMS,
  glossaryEchoNeedles,
  glossaryForPrompt,
  glossaryPromptHint,
  parseGlossary,
} from './glossary'

describe('parseGlossary', () => {
  it('1行1語で読み、空行と前後の空白を落とす', () => {
    expect(parseGlossary('阪中さん\n\n  葛城町  \n青年部')).toEqual(['阪中さん', '葛城町', '青年部'])
  })

  it('同じ語は1つにまとめる', () => {
    expect(parseGlossary('阪中さん\n阪中さん')).toEqual(['阪中さん'])
  })

  it('長すぎる行は捨てる（切り詰めると別の語になるため）', () => {
    const long = 'あ'.repeat(31)
    expect(parseGlossary(`阪中さん\n${long}`)).toEqual(['阪中さん'])
  })

  it('語数の上限で打ち切る', () => {
    const body = Array.from({ length: GLOSSARY_MAX_TERMS + 10 }, (_, i) => `語${i}`).join('\n')
    expect(parseGlossary(body)).toHaveLength(GLOSSARY_MAX_TERMS)
  })

  it('空の入力は空配列（辞書なしでも動く）', () => {
    expect(parseGlossary('')).toEqual([])
    expect(parseGlossary('\n \n')).toEqual([])
  })
})

describe('glossaryPromptHint', () => {
  // ここが文章の形でなくなると辞書がまったく効かなくなる（ai-tools で実測済み）。
  // 「語の羅列だけにする」改変を防ぐためのテスト。
  it('文章の形で返す', () => {
    expect(glossaryPromptHint(['阪中さん', '葛城町'])).toBe('次の固有名詞が出てきます: 阪中さん、葛城町。')
  })

  it('語が無ければ空文字（promptパラメータを付けない）', () => {
    expect(glossaryPromptHint([])).toBe('')
  })
})

describe('glossaryEchoNeedles', () => {
  it('文章の形と羅列の形の両方を返す（どちらの形でも本文へ漏れるため）', () => {
    expect(glossaryEchoNeedles(['阪中さん', '葛城町'])).toEqual([
      '次の固有名詞が出てきます: 阪中さん、葛城町。',
      '阪中さん、葛城町',
    ])
  })

  it('語が無ければ空配列', () => {
    expect(glossaryEchoNeedles([])).toEqual([])
  })
})

describe('glossaryForPrompt', () => {
  it('箇条書きにする', () => {
    expect(glossaryForPrompt(['阪中さん', '葛城町'])).toBe('- 阪中さん\n- 葛城町')
  })

  it('語が無ければ空文字（用語集の節ごと省くため）', () => {
    expect(glossaryForPrompt([])).toBe('')
  })
})
