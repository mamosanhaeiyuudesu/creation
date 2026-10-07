import { describe, expect, it } from 'vitest'
import { normalizeMinutes } from '~/server/utils/minutes'
import { DEFAULT_SUMMARY_MAX_CHARS, PRINT_MAX_CHARS_MAX, PRINT_MAX_CHARS_MIN } from '~/types/minutes'

// AIの出力も画面からの編集も、必ずこの関数を通してから保存する。
// 「変な値が静かに入って、あとで日付欄やPDFが壊れる」のを防ぐのが役目。

describe('normalizeMinutes', () => {
  it('オブジェクトでなければ空の議事録を返す', () => {
    expect(normalizeMinutes(null).title).toBe('')
    expect(normalizeMinutes('こわれた応答').decisions).toEqual([])
  })

  it('AIのスネークケースと画面のキャメルケースの両方を読む', () => {
    const fromAi = normalizeMinutes({
      task_candidates: [{ assignee: '田中さん', task: '会場を押さえる', due: '来週中', due_date: '2026-10-14' }],
      event_candidates: [{ title: '秋祭り', start: '2026-10-20T09:00' }],
      unclear_points: ['予算の金額'],
    })
    expect(fromAi.taskCandidates[0]).toEqual({
      assignee: '田中さん',
      task: '会場を押さえる',
      due: '来週中',
      dueDate: '2026-10-14',
    })
    expect(fromAi.eventCandidates[0]?.start).toBe('2026-10-20T09:00')
    expect(fromAi.unclearPoints).toEqual(['予算の金額'])
  })

  it('YYYY-MM-DD 以外の日付は空にする', () => {
    expect(normalizeMinutes({ date: '2026-10-07' }).date).toBe('2026-10-07')
    expect(normalizeMinutes({ date: '来月の上旬' }).date).toBe('')
    expect(normalizeMinutes({ date: '2026/10/07' }).date).toBe('')
  })

  it('日時は YYYY-MM-DDTHH:mm に揃え、形が違えば空にする', () => {
    const ok = normalizeMinutes({ event_candidates: [{ title: '会合', start: '2026-10-20 19:30:00' }] })
    expect(ok.eventCandidates[0]?.start).toBe('2026-10-20T19:30')

    const ng = normalizeMinutes({ event_candidates: [{ title: '会合', start: '夜7時半' }] })
    expect(ng.eventCandidates[0]?.start).toBe('')
    // 原文の表現は消さない（確定できなくても何と言っていたかは残す）
    const raw = normalizeMinutes({ event_candidates: [{ title: '会合', datetime: '来週の火曜の夜' }] })
    expect(raw.eventCandidates[0]?.datetime).toBe('来週の火曜の夜')
  })

  it('中身が空の行は落とす（空欄だけの項目がPDFに並ぶのを防ぐ）', () => {
    const m = normalizeMinutes({
      decisions: [{ content: '', note: '補足だけ' }, { content: '予算を10万円にする' }],
      task_candidates: [{ assignee: '田中さん', task: '' }],
    })
    expect(m.decisions).toHaveLength(1)
    expect(m.taskCandidates).toHaveLength(0)
  })

  it('PDFの目安文字数は範囲内に丸め、数値でなければ既定値にする', () => {
    expect(normalizeMinutes({ printSettings: { summaryMaxChars: 10 } }).printSettings.summaryMaxChars).toBe(
      PRINT_MAX_CHARS_MIN
    )
    expect(normalizeMinutes({ printSettings: { summaryMaxChars: 99999 } }).printSettings.summaryMaxChars).toBe(
      PRINT_MAX_CHARS_MAX
    )
    expect(normalizeMinutes({ printSettings: { summaryMaxChars: 'たくさん' } }).printSettings.summaryMaxChars).toBe(
      DEFAULT_SUMMARY_MAX_CHARS
    )
  })

  it('配列でないものが来ても落ちない', () => {
    const m = normalizeMinutes({ decisions: 'なし', unclear_points: 42 })
    expect(m.decisions).toEqual([])
    expect(m.unclearPoints).toEqual([])
  })
})
