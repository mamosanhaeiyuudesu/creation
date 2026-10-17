import { describe, expect, it } from 'vitest'
import { MAX_TAG_LENGTH, MAX_TAGS_PER_RECORD, countTags, normalizeTag, normalizeTags, renameTagIn } from './tags'

describe('normalizeTags', () => {
  it('空白を整え、空と重複を落とす', () => {
    expect(normalizeTags([' 定例会 ', '定例会', '', '  ', '青年部'])).toEqual(['定例会', '青年部'])
    expect(normalizeTag('秋  祭り')).toBe('秋 祭り')
  })

  it('長すぎるタグは切り、数の上限を超えた分は捨てる', () => {
    expect(normalizeTag('あ'.repeat(30))).toHaveLength(MAX_TAG_LENGTH)
    expect(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS_PER_RECORD)
  })

  it('配列でなければ空（タグを足す前の議事録）', () => {
    expect(normalizeTags(undefined)).toEqual([])
  })
})

describe('renameTagIn', () => {
  it('名前を変える。変えた先が既にあれば1つにまとまる', () => {
    expect(renameTagIn(['定例', '青年部'], '定例', '定例会')).toEqual(['定例会', '青年部'])
    expect(renameTagIn(['定例', '定例会'], '定例', '定例会')).toEqual(['定例会'])
  })

  it('変えた先が空なら外れる（削除）', () => {
    expect(renameTagIn(['定例', '青年部'], '定例', '')).toEqual(['青年部'])
  })
})

describe('countTags', () => {
  it('多い順に数え、同数なら名前順', () => {
    expect(countTags([{ tags: ['b', 'a'] }, { tags: ['b'] }, { tags: [] }])).toEqual([
      { tag: 'b', count: 2 },
      { tag: 'a', count: 1 },
    ])
  })
})
