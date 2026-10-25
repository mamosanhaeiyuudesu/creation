import { describe, expect, it } from 'vitest'
import { minutesLabel, type LabelKey } from '~/config/minutesLabels'

describe('minutesLabel', () => {
  it('話し合いの名前は、画面・PDF・AIへの指示で同じ表から取る', () => {
    expect(minutesLabel('decisions')).toBe('決まったこと')
    expect(minutesLabel('taskCandidates')).toBe('やること')
    expect(minutesLabel('eventCandidates')).toBe('次の予定')
    expect(minutesLabel('participants', 'meeting')).toBe('参加者')
  })

  it('聞き取りで意味が変わる項目だけ、別の名前になる', () => {
    expect(minutesLabel('participants', 'talk')).toBe('話し手')
    expect(minutesLabel('topics', 'talk')).toBe('話の内容')
    expect(minutesLabel('topics', 'meeting')).toBe('話し合ったこと')
    // 聞き取りに別名が無い項目は、話し合いと同じ名前
    expect(minutesLabel('summary', 'talk')).toBe(minutesLabel('summary', 'meeting'))
    expect(minutesLabel('taskCandidates', 'talk')).toBe('やること')
  })

  it('全部の項目に名前があり、空でない', () => {
    const keys: LabelKey[] = ['title', 'date', 'participants', 'summary', 'topics', 'decisions', 'discussions', 'keyMessages', 'taskCandidates', 'eventCandidates', 'unclearPoints', 'tags']
    for (const k of keys) {
      expect(minutesLabel(k, 'meeting')).not.toBe('')
      expect(minutesLabel(k, 'talk')).not.toBe('')
    }
  })
})
