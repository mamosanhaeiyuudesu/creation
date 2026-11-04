import { describe, expect, it } from 'vitest'
import {
  addCandidate,
  buildTimeline,
  normalizeVideo,
  sceneAt,
  splitSubtitle,
  subtitleAt,
  FIRST_LEAD_SEC,
  LAST_TAIL_SEC,
  LEAD_SEC,
  SUBTITLE_MAX_CHARS,
  TAIL_SEC,
} from './palette-video'

describe('buildTimeline', () => {
  it('シーンの長さ＝前の間＋読み上げ＋後の間で、隙間なく並ぶ', () => {
    const { scenes, duration } = buildTimeline([3, 4, 5])
    expect(scenes[0]!.start).toBe(0)
    expect(scenes[0]!.speechStart).toBe(FIRST_LEAD_SEC)
    expect(scenes[0]!.end).toBeCloseTo(FIRST_LEAD_SEC + 3 + TAIL_SEC)
    expect(scenes[1]!.start).toBe(scenes[0]!.end)
    expect(scenes[1]!.speechStart).toBeCloseTo(scenes[1]!.start + LEAD_SEC)
    expect(scenes[2]!.end).toBeCloseTo(duration)
    expect(duration).toBeCloseTo(FIRST_LEAD_SEC + 3 + TAIL_SEC + LEAD_SEC + 4 + TAIL_SEC + LEAD_SEC + 5 + LAST_TAIL_SEC)
  })

  it('sceneAt は時刻からシーンを引き、範囲外は端に寄せる', () => {
    const { scenes, duration } = buildTimeline([2, 2])
    expect(sceneAt(scenes, 0)).toBe(0)
    expect(sceneAt(scenes, scenes[1]!.start + 0.01)).toBe(1)
    expect(sceneAt(scenes, duration + 10)).toBe(1)
  })
})

describe('splitSubtitle', () => {
  it('文末で区切る', () => {
    expect(splitSubtitle('春が来た。桜が咲いた！')).toEqual(['春が来た。', '桜が咲いた！'])
  })

  it('長い文は真ん中に近い読点で割り、1枚が上限を超えない', () => {
    const long = 'きのうの夕方、町内会の集まりがあって、来月の祭りの段取りと、子ども神輿の担ぎ手の割り振りを決めました。'
    const chunks = splitSubtitle(long)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(long)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(SUBTITLE_MAX_CHARS)
  })

  it('読点の無い長い文も字数で割る', () => {
    const long = 'あ'.repeat(70)
    const chunks = splitSubtitle(long)
    expect(chunks.join('')).toBe(long)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(SUBTITLE_MAX_CHARS)
  })

  it('subtitleAt は字数に比例した時間で切り替える', () => {
    const chunks = ['ああ', 'いいいいいい'] // 2字と6字 → 8秒なら 0〜2秒が1枚目
    expect(subtitleAt(chunks, 8, 1.9)).toBe('ああ')
    expect(subtitleAt(chunks, 8, 2.1)).toBe('いいいいいい')
    expect(subtitleAt(chunks, 8, 99)).toBe('いいいいいい')
    expect(subtitleAt([], 8, 1)).toBe('')
  })
})

describe('normalizeVideo', () => {
  it('不正な値を落とし、上限で丸める', () => {
    const v = normalizeVideo({
      title: 't',
      voice: 'unknown',
      quality: 'x',
      loras: [{ path: 'http://insecure', scale: 1 }, { path: 'https://ok/a.safetensors', scale: 9 }],
      scenes: [
        { id: 's1', narration: 'あ'.repeat(500), image: { url: 'javascript:alert(1)' }, audio: { id: 'a', voice: 'coral', duration: 3, text: 'x' } },
        { narration: 'id が無い' },
      ],
    })
    expect(v.voice).toBe('coral')
    expect(v.quality).toBe('standard')
    expect(v.loras).toEqual([{ path: 'https://ok/a.safetensors', scale: 4, name: '' }])
    expect(v.scenes).toHaveLength(1)
    expect(v.scenes[0]!.narration.length).toBe(200)
    expect(v.scenes[0]!.image).toBeNull()
    expect(v.scenes[0]!.audio).toEqual({ id: 'a', voice: 'coral', duration: 3, text: 'x' })
  })

  it('シーンは20個まで', () => {
    const scenes = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}` }))
    expect(normalizeVideo({ scenes }).scenes).toHaveLength(20)
  })

  it('候補が無い古い下書きは、今の絵を候補にする', () => {
    const image = { generationId: 'g', url: 'https://x/a.jpg', seed: '1', key: 'k' }
    const v = normalizeVideo({ scenes: [{ id: 's1', image }] })
    expect(v.scenes[0]!.candidates).toEqual([image])
  })

  it('候補は https だけ・重複なし・上限まで', () => {
    const c = (n: number) => ({ generationId: `g${n}`, url: `https://x/${n}.jpg`, seed: null, key: '' })
    const candidates = [c(1), c(1), { url: 'http://x/bad.jpg' }, ...Array.from({ length: 12 }, (_, i) => c(i + 2))]
    const v = normalizeVideo({ scenes: [{ id: 's1', candidates }] })
    expect(v.scenes[0]!.candidates).toHaveLength(8)
    expect(v.scenes[0]!.candidates[0]!.url).toBe('https://x/1.jpg')
    expect(v.scenes[0]!.candidates[1]!.url).toBe('https://x/2.jpg')
  })
})

describe('addCandidate', () => {
  it('新しい絵を先頭に足し、上限を超えた古いものを捨てる', () => {
    const c = (n: number) => ({ generationId: `g${n}`, url: `https://x/${n}.jpg`, seed: null, key: '' })
    const list = Array.from({ length: 8 }, (_, i) => c(i))
    const next = addCandidate(list, c(99))
    expect(next).toHaveLength(8)
    expect(next[0]!.url).toBe('https://x/99.jpg')
    expect(next.at(-1)!.url).toBe('https://x/6.jpg')
  })
})
