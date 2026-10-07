import { describe, expect, it } from 'vitest'
import { DIRECT_UPLOAD_MAX_SECONDS, chargeableSeconds, compressedSeconds, wavSeconds } from './audioLength'

/** useTranscribe.ts の encodeWav と同じ形のヘッダーを作る（16bit モノラル） */
function wavHeader(sampleRate: number, channels = 1, bits = 16): ArrayBuffer {
  const ab = new ArrayBuffer(64)
  const view = new DataView(ab)
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }
  write(0, 'RIFF')
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint16(34, bits, true)
  write(36, 'data')
  return ab
}

describe('wavSeconds', () => {
  it('16kHz モノラル 16bit は 1秒 = 32,000バイト', () => {
    // 10分ぶん（分割したチャンク1つの想定）
    const bytes = 44 + 16000 * 2 * 600
    expect(wavSeconds(wavHeader(16000), bytes)).toBe(600)
  })

  it('サンプルレートが違っても計算できる', () => {
    const bytes = 44 + 48000 * 2 * 2 * 30 // 48kHz ステレオ 30秒
    expect(wavSeconds(wavHeader(48000, 2), bytes)).toBe(30)
  })

  it('WAV でなければ null', () => {
    expect(wavSeconds(new ArrayBuffer(64), 1000)).toBeNull()
  })

  it('ヘッダーが短すぎれば null', () => {
    expect(wavSeconds(new ArrayBuffer(10), 1000)).toBeNull()
  })
})

describe('compressedSeconds', () => {
  it('申告された長さを使う', () => {
    expect(compressedSeconds(1_000_000, 300)).toBe(300)
  })

  it('ファイルサイズから見てありえない短さは下限へ丸める（320kbps 相当が上限）', () => {
    // 4MB を 1秒と申告してきたケース。4,000,000 / 40,000 = 100秒が下限
    expect(compressedSeconds(4_000_000, 1)).toBe(100)
  })

  it('申告が無ければサイズからの下限を使う（0秒として数えない）', () => {
    expect(compressedSeconds(4_000_000, 0)).toBe(100)
  })

  it('そのまま送られる上限（20分）を超えない', () => {
    expect(compressedSeconds(999_999_999, 99_999)).toBe(DIRECT_UPLOAD_MAX_SECONDS)
  })
})

describe('chargeableSeconds', () => {
  it('WAV のときは申告値を無視してヘッダーから数える', () => {
    const bytes = 44 + 16000 * 2 * 120
    expect(
      chargeableSeconds({ byteLength: bytes, header: wavHeader(16000), reportedSeconds: 1 })
    ).toBe(120)
  })

  it('圧縮音声のときは申告値とサイズから数える', () => {
    expect(
      chargeableSeconds({ byteLength: 1_000_000, header: new ArrayBuffer(64), reportedSeconds: 240 })
    ).toBe(240)
  })
})
