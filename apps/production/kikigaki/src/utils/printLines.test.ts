import { describe, expect, it } from 'vitest'
import { buildPrintBlocks, findFitScale, flowSlots, MIN_FIT_SCALE, paginateBlocks, printKind } from '~/utils/printLines'
import type { BlockSize, PrintBlock } from '~/utils/printLines'
import { emptyMinutes } from '~/types/minutes'

const headings = (blocks: PrintBlock[]) => blocks.filter((b) => b.type === 'heading').map((b) => (b as any).text)

/** 1つ前の版（layout 2）の議事録 */
const v2 = () => {
  const m = emptyMinutes()
  m.layout = 2
  return m
}

describe('buildPrintBlocks（今の版）', () => {
  it('話し合い: 左に 概要・決まったこと・やること、右に 話し合ったこと', () => {
    const m = emptyMinutes()
    m.summary = '予算を決めた'
    m.decisions = [{ content: '予算は10万円', note: '' }]
    m.taskCandidates = [{ assignee: '田中さん', task: '見積もり', due: '来週', dueDate: '' }]
    m.topics = [{ content: '予算', note: '割れたが決まった' }]
    const { left, right } = buildPrintBlocks(m)
    expect(left[0]).toEqual({ type: 'header' })
    expect(headings(left)).toEqual(['概要', '決まったこと', 'やること'])
    expect(headings(right)).toEqual(['話し合ったこと'])
  })

  it('話し合い: 中身が空の欄は見出しごと出さない（「（なし）」も出さない）', () => {
    const { left, right } = buildPrintBlocks(emptyMinutes())
    expect(left).toEqual([{ type: 'header' }])
    expect(right).toEqual([])
  })

  it('聞き取り: 1列。話の内容は 見出し＝要点の一文、中身は段落ごとに分ける', () => {
    const m = emptyMinutes()
    m.mode = 'talk'
    m.summary = '担い手の話'
    m.topics = [{ content: '担い手は地元で育てる', note: '最初の段落\n\n次の段落' }]
    const { left, right } = buildPrintBlocks(m)
    expect(right).toEqual([])
    expect(headings(left)).toEqual(['概要', '話の内容'])
    expect(left.filter((b) => b.type === 'topic')).toEqual([{ type: 'topic', n: 1, text: '担い手は地元で育てる' }])
    expect(left.filter((b) => b.type === 'topicPara')).toHaveLength(2)
  })

  it('聞き取り: やることは概要のすぐ下（話し合いとそろえる）', () => {
    const m = emptyMinutes()
    m.mode = 'talk'
    m.summary = '担い手の話'
    m.taskCandidates = [{ assignee: '田中さん', task: '次回の準備', due: '', dueDate: '' }]
    m.topics = [{ content: '担い手は地元で育てる', note: '中身' }]
    expect(headings(buildPrintBlocks(m).left)).toEqual(['概要', 'やること', '話の内容'])
  })

  it('PDFの形: 今の版は 話し合い＝1枚に収める横、聞き取り＝縦。古い版は横', () => {
    expect(printKind({ mode: 'meeting', layout: 3 })).toBe('fit')
    expect(printKind({ mode: 'talk', layout: 3 })).toBe('portrait')
    expect(printKind({ mode: 'talk', layout: 2 })).toBe('landscape')
    expect(printKind({ mode: 'meeting', layout: 1 })).toBe('landscape')
  })
})

describe('buildPrintBlocks（古い版）', () => {
  it('layout 2 の会議: 右は 決まったこと・やること（次の予定・決まっていないことの欄は無い）', () => {
    const { left, right } = buildPrintBlocks(v2())
    expect(headings(left)).toEqual(['概要'])
    expect(headings(right)).toEqual(['決まったこと', 'やること'])
  })

  it('左は 概要＋話し合ったこと（あるときだけ見出しを出す）。概要は行ごとに分ける', () => {
    const m = v2()
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

  it('聞き取り: layout 2 は 伝えたかったこと・やること、古い記録は伝えたかったことだけ', () => {
    const m = v2()
    m.mode = 'talk'
    expect(headings(buildPrintBlocks(m).right)).toEqual(['伝えたかったこと', 'やること'])
    expect(headings(buildPrintBlocks(m).left)).toEqual(['概要'])
    m.layout = 1
    expect(headings(buildPrintBlocks(m).right)).toEqual(['伝えたかったこと'])
  })

  it('中身が空の欄は「（なし）」を出す', () => {
    const { right } = buildPrintBlocks(v2())
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

describe('findFitScale', () => {
  // 高さが倍率の2乗に比例する（字が小さいと行数も減る）列のつもり
  const column = (base: number) => async (s: number) => base * s * s

  it('そのままで入れば縮めない', async () => {
    expect(await findFitScale(column(500), 600)).toBe(1)
  })

  it('入らなければ、入るいちばん大きな倍率まで縮める', async () => {
    const s = await findFitScale(column(1000), 600)
    expect(1000 * s * s).toBeLessThanOrEqual(600)
    // 二分探索の刻み（約0.005）の範囲で、入る限界に近い
    expect(1000 * (s + 0.01) ** 2).toBeGreaterThan(600)
  })

  it('下限まで縮めても入らなければ下限を返す（2枚目に続ける）', async () => {
    expect(await findFitScale(column(5000), 600)).toBe(MIN_FIT_SCALE)
  })
})

describe('話し合いを複数枚にまとめる（onePage=false）', () => {
  const multi = () => {
    const m = emptyMinutes()
    m.onePage = false
    m.summary = '概要'
    m.decisions = [{ content: '決定', note: '' }]
    m.topics = [{ content: '予算の話', note: '一段落目\n二段落目' }]
    return m
  }

  it('PDFの形は multi。聞き取りは onePage に関わらず縦、1枚にまとめるは fit のまま', () => {
    expect(printKind({ mode: 'meeting', layout: 3, onePage: false })).toBe('multi')
    expect(printKind({ mode: 'meeting', layout: 3, onePage: true })).toBe('fit')
    expect(printKind({ mode: 'talk', layout: 3, onePage: false })).toBe('portrait')
    expect(printKind({ mode: 'meeting', layout: 2, onePage: false })).toBe('landscape')
  })

  it('左は今までどおり、右の話し合ったことは聞き取りと同じ形（見出し＝話題、中身は段落）', () => {
    const { left, right } = buildPrintBlocks(multi())
    expect(headings(left)).toEqual(['概要', '決まったこと'])
    expect(headings(right)).toEqual(['話し合ったこと'])
    expect(right.filter((b) => b.type === 'topic')).toHaveLength(1)
    expect(right.filter((b) => b.type === 'topicPara')).toHaveLength(2)
  })

  it('flowSlots: 話し合ったことは1枚目の右から始まり、2枚目は左→右の順に続く', () => {
    expect(flowSlots([['a']], [['t1'], ['t2'], ['t3']])).toEqual([
      { left: ['a'], right: ['t1'] },
      { left: ['t2'], right: ['t3'] },
    ])
    expect(flowSlots([['a']], [['t1']])).toEqual([{ left: ['a'], right: ['t1'] }])
    expect(flowSlots([['a']], [])).toEqual([{ left: ['a'], right: [] }])
  })

  it('flowSlots: 左が1枠に入りきらないときは、話し合ったことはその次の枠から', () => {
    expect(flowSlots([['a1'], ['a2']], [['t1']])).toEqual([
      { left: ['a1'], right: ['a2'] },
      { left: ['t1'], right: [] },
    ])
  })
})
