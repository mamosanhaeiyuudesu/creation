import { describe, expect, it } from 'vitest'
import { PDF_MAX_CHARS, printCharCounts, splitPrintBudget } from '~/utils/printBudget'
import { emptyMinutes } from '~/types/minutes'

describe('PDF_MAX_CHARS', () => {
  it('PDFの目安は2000字で固定', () => {
    expect(PDF_MAX_CHARS).toBe(2000)
  })
})

describe('printCharCounts（確認画面の文字数表示。PDFを作るときの数え方と同じ）', () => {
  it('新しい会議: 左＝概要＋話し合ったこと、右＝決まったこと・決まっていないこと・やること', () => {
    const m = emptyMinutes()
    m.summary = 'あいうえお' // 5
    m.topics = [{ content: '予算', note: '10万円で割れた' }] // 2 + 8
    m.decisions = [{ content: '会場は公民館', note: '' }] // 6
    m.discussions = [{ content: '日程', note: '' }] // 2
    m.taskCandidates = [{ assignee: '田中', task: '会場予約', due: '', dueDate: '' }]
    const c = printCharCounts(m)
    expect(c.left).toBe(5 + 2 + 8)
    // やることは「会場予約」＋「担当: 田中」
    expect(c.right).toBe(6 + 2 + 4 + '担当: 田中'.length)
    expect(c.total).toBe(c.left + c.right)
  })

  it('古い会議: 左＝概要＋決まっていないこと、右の予定は別欄から数える', () => {
    const m = emptyMinutes()
    m.layout = 1
    m.summary = 'まとめ' // 3
    m.discussions = [{ content: '日程', note: '' }] // 2
    m.eventCandidates = [{ datetime: '来月', title: '祭り', location: '', start: '', end: '' }]
    m.topics = [{ content: '数えない', note: '' }]
    const c = printCharCounts(m)
    expect(c.left).toBe(3 + 2)
    expect(c.right).toBe('祭り'.length + '来月'.length)
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
