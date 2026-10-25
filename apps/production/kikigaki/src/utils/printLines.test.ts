import { describe, expect, it } from 'vitest'
import { buildPrintBlocks, paginateBlocks } from '~/utils/printLines'
import type { BlockSize, PrintBlock } from '~/utils/printLines'
import { emptyMinutes } from '~/types/minutes'

const headings = (blocks: PrintBlock[]) => blocks.filter((b) => b.type === 'heading').map((b) => (b as any).text)

describe('buildPrintBlocks', () => {
  it('新しい会議: 右は 決まったこと・やること（次の予定・決まっていないことの欄は無い）', () => {
    const { left, right } = buildPrintBlocks(emptyMinutes())
    expect(headings(left)).toEqual(['概要'])
    expect(headings(right)).toEqual(['決まったこと', 'やること'])
  })

  it('左は 概要＋話し合ったこと（あるときだけ見出しを出す）。概要は行ごとに分ける', () => {
    const m = emptyMinutes()
    m.summary = '【背景】\nいろいろあった\n\n【結論】\nこうなった'
    m.topics = [{ content: '予算', note: '割れた' }]
    const { left } = buildPrintBlocks(m)
    expect(left.filter((b) => b.type === 'para')).toHaveLength(4)
    expect(headings(left)).toEqual(['概要', '話し合ったこと'])
    expect(left.find((b) => b.type === 'item')).toEqual({ type: 'item', n: 1, main: '予算', note: '割れた' })
  })

  it('古い会議: 左に決まっていないこと、右は 決まったこと・次の予定・やること', () => {
    const m = emptyMinutes()
    m.layout = 1
    m.discussions = [{ content: '日程', note: '' }]
    m.topics = [{ content: '数えない', note: '' }]
    const { left, right } = buildPrintBlocks(m)
    expect(left.some((b) => b.type === 'item' && b.main === '日程')).toBe(true)
    expect(left.some((b) => b.type === 'item' && b.main === '数えない')).toBe(false)
    expect(headings(right)).toEqual(['決まったこと', '次の予定', 'やること'])
  })

  it('聞き取り: 新しい並びは 伝えたかったこと・やること、古い記録は伝えたかったことだけ', () => {
    const m = emptyMinutes()
    m.mode = 'talk'
    expect(headings(buildPrintBlocks(m).right)).toEqual(['伝えたかったこと', 'やること'])
    expect(headings(buildPrintBlocks(m).left)).toEqual(['概要'])
    m.layout = 1
    expect(headings(buildPrintBlocks(m).right)).toEqual(['伝えたかったこと'])
  })

  it('中身が空の欄は「（なし）」を出す', () => {
    const { right } = buildPrintBlocks(emptyMinutes())
    expect(right.filter((b) => b.type === 'empty')).toHaveLength(2)
  })
})

const size = (height: number, extra: Partial<BlockSize> = {}): BlockSize => ({ heading: false, top: 0, height, bottom: 0, ...extra })

describe('paginateBlocks', () => {
  it('1ページに収まればそのまま1ページ', () => {
    expect(paginateBlocks([size(100), size(100)], 300)).toEqual([[0, 1]])
  })

  it('入りきらないブロックから次のページへ送る', () => {
    expect(paginateBlocks([size(100), size(100), size(100)], 250)).toEqual([[0, 1], [2]])
  })

  it('ブロックの間の余白も数える。ページの先頭の上の余白は数えない', () => {
    const s = [size(100, { bottom: 10 }), size(100, { top: 10, bottom: 10 }), size(100, { top: 10 })]
    // 100+10 → +10+100+10 = 230 → 次は 230+10+100 = 340 > 300
    expect(paginateBlocks(s, 300)).toEqual([[0, 1], [2]])
  })

  it('見出しだけがページの末尾に残るときは、見出しも次のページへ送る', () => {
    const s = [size(100), size(100), size(20, { heading: true }), size(100)]
    expect(paginateBlocks(s, 250)).toEqual([[0, 1], [2, 3]])
  })

  it('1ブロックでページを超えるものは、単独で1ページに置く', () => {
    expect(paginateBlocks([size(100), size(500), size(100)], 300)).toEqual([[0], [1], [2]])
  })

  it('ブロックが無くても1ページ（空）を返す', () => {
    expect(paginateBlocks([], 300)).toEqual([[]])
  })
})
