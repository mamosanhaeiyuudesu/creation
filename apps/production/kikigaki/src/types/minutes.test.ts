import { describe, expect, it } from 'vitest'
import { TALK_MAX_CHARS, talkMaxTopics, talkTargetChars } from './minutes'

describe('talkTargetChars', () => {
  it('約1時間（20,000字）までは元のテキストの2割にする', () => {
    expect(talkTargetChars(5000)).toBe(1000)
    expect(talkTargetChars(10000)).toBe(2000)
    expect(talkTargetChars(20000)).toBe(4000)
  })

  it('そこから先はゆるやかに増やし、50,000字で6000字にする', () => {
    expect(talkTargetChars(35000)).toBe(5000)
    expect(talkTargetChars(50000)).toBe(TALK_MAX_CHARS)
  })

  it('短い話でも500字は確保する', () => {
    expect(talkTargetChars(400)).toBe(500)
  })
})

describe('talkMaxTopics', () => {
  it('400字に1個（端数は繰り上げ）', () => {
    expect(talkMaxTopics(1000)).toBe(3)
    expect(talkMaxTopics(2000)).toBe(5)
    expect(talkMaxTopics(4000)).toBe(10)
    expect(talkMaxTopics(5000)).toBe(13)
    expect(talkMaxTopics(6000)).toBe(15)
  })
})
