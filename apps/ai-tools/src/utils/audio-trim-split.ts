import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } from 'mediabunny'

/**
 * 圧縮音声（m4a / mp4 など）を、展開（デコード）せずに時間で切り分ける。
 *
 * 60分の m4a を decodeAudioData で PCM に展開すると 600MB 以上になり、iPhone の Safari では
 * タブがメモリ不足で落ちる（エラーも出ない）。AAC のパケットはそのまま写せるので、
 * 再エンコードなしで 10〜20分ごとの小さな m4a に切れば、メモリも音質も心配しなくてよい。
 * 読むのは必要な部分だけ（BlobSource は遅延読み）。
 */

export interface TrimmedSplit {
  /** 元の音声の長さ（秒） */
  duration: number
  /** 切り分けた数 */
  count: number
  /** idx 番目の部分を m4a の Blob として作る */
  makePart: (idx: number) => Promise<Blob>
}

// 1部分のサイズの目安。OpenAI の25MB・Gemini の約20MBのどちらにも余裕で収まる。
const TARGET_PART_BYTES = 12 * 1024 * 1024
const MIN_PART_SECONDS = 60
const MAX_PART_SECONDS = 20 * 60

/**
 * 切り分けの準備をする。この方法で扱えない形式（mp3・wav・webm など、mp4 に写せないもの）は null を返す。
 * 呼び出し側は null のとき、従来の「展開して分割」へ戻ること。
 */
export async function prepareTrimmedSplit(blob: Blob): Promise<TrimmedSplit | null> {
  try {
    const probe = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
    const track = await probe.getPrimaryAudioTrack()
    if (!track) return null
    // mp4 コンテナへそのまま写せる音声だけ対象（AAC。m4a / ボイスメモはこれ）
    if (track.codec !== 'aac') return null
    const duration = await probe.computeDuration()
    if (!(duration > 0)) return null

    const bytesPerSec = blob.size / duration
    const partSec = Math.min(
      MAX_PART_SECONDS,
      Math.max(MIN_PART_SECONDS, Math.floor(TARGET_PART_BYTES / bytesPerSec)),
    )
    const count = Math.ceil(duration / partSec)

    const makePart = async (idx: number): Promise<Blob> => {
      const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
      const target = new BufferTarget()
      const output = new Output({ format: new Mp4OutputFormat(), target })
      const start = idx * partSec
      const end = Math.min((idx + 1) * partSec, duration)
      const conversion = await Conversion.init({
        input,
        output,
        trim: { start, end },
        // 再エンコードはしない。写せないなら失敗させて、呼び出し側で別の方法に戻る。
        audio: { forceTranscode: false },
        video: { discard: true },
      })
      if (!conversion.isValid) throw new Error('この音声は切り分けできませんでした')
      await conversion.execute()
      const buf = target.buffer
      if (!buf || buf.byteLength === 0) throw new Error('切り分けた音声が空でした')
      return new Blob([buf], { type: 'audio/mp4' })
    }

    // 最初の1部分で本当に切れるか確かめてから返す（失敗するなら今のうちに null で戻る）
    await makePart(0)
    return { duration, count, makePart }
  } catch {
    return null
  }
}
