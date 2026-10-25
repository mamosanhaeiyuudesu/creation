import { describe, expect, it } from 'vitest'
import { normalizeMinutes } from '~/server/utils/minutes'

// AIの出力も画面からの編集も、必ずこの関数を通してから保存する。
// 「変な値が静かに入って、あとで日付欄やPDFが壊れる」のを防ぐのが役目。

describe('normalizeMinutes', () => {
  it('オブジェクトでなければ空の議事録を返す', () => {
    expect(normalizeMinutes(null).title).toBe('')
    expect(normalizeMinutes('こわれた応答').decisions).toEqual([])
  })

  it('参加者は1人1要素の配列で持ち、空欄は落とす', () => {
    expect(normalizeMinutes({ participants: ['田中さん', ' ', '佐藤さん '] }).participants).toEqual(['田中さん', '佐藤さん'])
    // AIが1行で返してきたとき
    expect(normalizeMinutes({ participants: '田中さん、佐藤さん' }).participants).toEqual(['田中さん', '佐藤さん'])
    // 参加者を足す前に作った議事録
    expect(normalizeMinutes({ title: '会合' }).participants).toEqual([])
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

    // 時刻が決まっていない予定は日付だけで残す（00:00 などで埋めない）
    const dateOnly = normalizeMinutes({ event_candidates: [{ title: '会合', start: '2026-10-20' }] })
    expect(dateOnly.eventCandidates[0]?.start).toBe('2026-10-20')

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

  it('配列でないものが来ても落ちない', () => {
    const m = normalizeMinutes({ decisions: 'なし', unclear_points: 42 })
    expect(m.decisions).toEqual([])
    expect(m.unclearPoints).toEqual([])
  })
})

describe('normalizeMinutes のまとめ方', () => {
  it('mode が無い（talk を足す前の）議事録は会議として読む', () => {
    expect(normalizeMinutes({ title: '定例会' }).mode).toBe('meeting')
    expect(normalizeMinutes({ mode: 'へんな値' }).mode).toBe('meeting')
  })

  it('1人の話の項目（伝えたかったこと・話の内容）を読み、空の行は落とす', () => {
    const m = normalizeMinutes({
      mode: 'talk',
      key_messages: [{ content: '失敗を恐れなくていい', note: '若いころの転職の話' }, { content: '' }],
      topics: [{ content: '生い立ち', note: '漁師の家に生まれた' }],
    })
    expect(m.mode).toBe('talk')
    expect(m.keyMessages).toEqual([{ content: '失敗を恐れなくていい', note: '若いころの転職の話' }])
    expect(m.topics).toHaveLength(1)
    // 画面から保存し直したとき（キャメルケース）も読める
    expect(normalizeMinutes({ keyMessages: m.keyMessages }).keyMessages).toHaveLength(1)
  })
})

describe('normalizeMinutes の並べ方の版（layout）', () => {
  it('版が無い議事録は 1（古い並べ方）として読む', () => {
    expect(normalizeMinutes({ title: '定例会', discussions: [{ content: '予算' }] }).layout).toBe(1)
    expect(normalizeMinutes({ layout: 'へんな値' }).layout).toBe(1)
  })

  it('layout 2 はそのまま残り、空の議事録は最新の版で始まる', () => {
    expect(normalizeMinutes({ layout: 2 }).layout).toBe(2)
    expect(normalizeMinutes(null).layout).toBe(2)
  })

  it('古い議事録の予定は消さずに読む（layout 1 の画面が使う）', () => {
    const m = normalizeMinutes({ event_candidates: [{ title: '秋祭り', datetime: '10月20日' }] })
    expect(m.layout).toBe(1)
    expect(m.eventCandidates).toHaveLength(1)
  })
})
