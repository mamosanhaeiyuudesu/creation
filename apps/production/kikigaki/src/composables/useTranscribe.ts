// 音声ファイルを文字起こしする。
// apps/ai-tools/src/composables/useAudioRecorder.ts の splitAndTranscribeBlob を移植したもので、
// 変えたのは2点だけ:
//   ① 送信を authedFetch（ID トークン付き）にした
//   ② 利用量を数えるために、1件ごとの長さ（durationSec）を一緒に送る
//
// ここの作りには、ai-tools で実際に事故を出して直した経緯がそのまま入っている。
// **数字（10分・16kHz・20字/分など）を軽い気持ちで変えないこと。**

// そのまま送れる長さの上限。ここに収まるなら再エンコードせず元の音質のまま送る。
const DIRECT_MAX_DURATION_SECONDS = 20 * 60
// 分割するときの1チャンクの長さ。16kHz モノラル WAV: 10分 ≈ 19.2MB（OpenAI の 25MB 制限以内）
const CHUNK_DURATION_SECONDS = 10 * 60
// Whisper系モデルは16kHzで学習されている。8kHz（電話並み）まで落とすと、
// 会議室のように複数人の声が重なる録音で同じ語を延々と繰り返す幻覚が出やすくなる。
// 1チャンクを20分→10分に縮めることで、ファイルサイズを変えずに帯域を倍にしている。
const WAV_SAMPLE_RATE = 16000
// 分割せずそのまま送れるサイズの上限。
const DIRECT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024
// 同時に処理するチャンク数。1〜2時間の会議で全チャンクを同時に展開すると
// デコード済みの音声データでタブのメモリを使い切るため絞る。
const CHUNK_CONCURRENCY = 3

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }
  write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true)
  write(8, 'WAVE'); write(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true)
  view.setUint16(34, 16, true); write(36, 'data')
  view.setUint32(40, dataSize, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return new Blob([ab], { type: 'audio/wav' })
}

/**
 * 指定区間をモノラル化しつつ toRate へ落とす。
 *
 * 以前は OfflineAudioContext にリサンプリングさせていたが、サンプルレートの違う AudioBuffer を
 * 食わせる形はブラウザ依存が大きく、実際に「1時間の会議の文字起こしが2行になる」不具合を出した。
 * ここは自前で計算する。出力1サンプルぶんの元サンプルを**平均する**（単純な間引きではなく
 * 箱型のローパス）ので、48kHz→16kHz でも折り返し雑音が乗らない。
 *
 * 純粋関数にしてあるのは、壊れたときに数値で検証できるようにするため。安易に closure へ戻さないこと。
 */
export function downmixToMono(
  channels: Float32Array[],
  start: number,
  end: number,
  fromRate: number,
  toRate: number
): Float32Array {
  const numChannels = channels.length
  const ratio = fromRate / toRate
  const outLen = Math.max(1, Math.floor((end - start) / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const from = start + Math.floor(i * ratio)
    // ratio < 1（元のほうが低いサンプルレート）のとき from と to が同じ値になり、
    // 平均する元サンプルが1つも無い＝0 が書き込まれる。1サンプルおきに 0 が挟まると
    // 音が櫛状に欠けるので、最低1サンプルは必ず含める。
    const to = Math.max(from + 1, Math.min(start + Math.floor((i + 1) * ratio), end))
    let sum = 0
    let n = 0
    for (let j = from; j < Math.min(to, end); j++) {
      for (let ch = 0; ch < numChannels; ch++) {
        sum += channels[ch]![j]!
        n++
      }
    }
    out[i] = n ? sum / n : 0
  }
  return out
}

/**
 * ファイルのメタデータ上の再生時間（秒）。読めなければ 0。
 * `decodeAudioData` の結果と突き合わせて「最後まで展開できているか」を確かめるために使う。
 */
export async function probeAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const el = new Audio()
    const finish = (v: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(v) && v > 0 ? v : 0)
    }
    el.preload = 'metadata'
    el.onloadedmetadata = () => finish(el.duration)
    el.onerror = () => finish(0)
    el.src = url
  })
}

/** 実質無音か（変換に失敗したのを「話していない」と取り違えないための検知） */
export function isSilent(samples: Float32Array): boolean {
  let peak = 0
  // 全部見る必要はないので間引いて最大振幅を見る
  const step = Math.max(1, Math.floor(samples.length / 20000))
  for (let i = 0; i < samples.length; i += step) {
    const v = Math.abs(samples[i]!)
    if (v > peak) peak = v
  }
  return peak < 0.0005
}

export interface TranscribeOptions {
  /** 分割したときの進み具合（完了チャンク数, 全チャンク数）。長い会議は数分かかるので画面に出す用 */
  onProgress?: (done: number, total: number) => void
}

export function useTranscribe() {
  const { authedFetch } = useAuth()

  const post = async (part: Blob, name: string, durationSec: number): Promise<string> => {
    const fd = new FormData()
    fd.append('audio', part, name)
    // 利用量（月間の上限）を数えるための長さ。サーバー側は WAV ならヘッダーから正確に計算し、
    // 圧縮音声のときだけこの値を使う（src/utils/audioLength.ts）
    fd.append('durationSec', String(Math.max(0, Math.round(durationSec))))
    const res = await authedFetch<{ text: string }>('/api/transcribe', { method: 'POST', body: fd })
    return res.text
  }

  /**
   * 音声Blobを文字起こしする。長い／大きい場合は10分ごとに分割し、
   * 16kHzモノラルWAVへ落としてから並列に投げて、**元の順番どおりに**結合する。
   */
  const transcribe = async (blob: Blob, filename: string, options: TranscribeOptions = {}): Promise<string> => {
    const { onProgress } = options

    // 展開する前に、ファイルが本来何分あるのかをメタデータから読んでおく
    const probedDuration = await probeAudioDuration(blob)

    const arrayBuf = await blob.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuf).catch(() => null)
    audioCtx.close()
    if (!audioBuffer) {
      throw new Error(
        'この音声ファイルは読み込めませんでした。mp3・wav・m4a のいずれかの、壊れていないファイルをお試しください。'
      )
    }

    // decodeAudioData が途中までしか展開できていないと、以降の分割数も長さも全部その短い値で
    // 計算されるため、「1時間の会議の文字起こしが10文字」という形で静かに壊れる。
    // メタデータ上の長さと突き合わせて、食い違ったらここで止める。
    const fmt = (sec: number) => `${Math.floor(sec / 60)}分${Math.round(sec % 60)}秒`
    if (probedDuration > 60 && audioBuffer.duration < probedDuration * 0.9) {
      throw new Error(
        `音声を最後まで読み込めませんでした（${fmt(probedDuration)}のうち${fmt(audioBuffer.duration)}ぶんだけ）。` +
          'mp3 か wav に変換してから、もう一度お試しください。'
      )
    }

    // 短くて軽いものはそのまま送る（余計な再エンコードで音質を落とさない）
    if (audioBuffer.duration <= DIRECT_MAX_DURATION_SECONDS && blob.size <= DIRECT_UPLOAD_MAX_BYTES) {
      onProgress?.(0, 1)
      const text = await post(blob, filename, audioBuffer.duration)
      onProgress?.(1, 1)
      return text
    }

    const origSampleRate = audioBuffer.sampleRate
    // 元が16kHz以下（ICレコーダー等）なら、わざわざ上げない。
    // 情報は増えないうえ、水増しした音を送るとファイルだけ大きくなる。
    const outRate = Math.min(WAV_SAMPLE_RATE, origSampleRate)
    const origLength = audioBuffer.length
    const numChannels = audioBuffer.numberOfChannels
    const chunkSamples = Math.floor(CHUNK_DURATION_SECONDS * origSampleRate)
    const numChunks = Math.ceil(origLength / chunkSamples)

    const channels: Float32Array[] = []
    for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch))

    const transcribeChunk = async (idx: number): Promise<string> => {
      const start = idx * chunkSamples
      const end = Math.min(start + chunkSamples, origLength)

      const samples = downmixToMono(channels, start, end, origSampleRate, outRate)
      if (isSilent(samples)) {
        // 音が入っていないのか、変換に失敗したのか、ここで分けられるようにしておく。
        // 黙って空の文字起こしを返すと「1時間の会議が2行」になって原因が追えなくなる。
        console.warn(`[transcribe] chunk ${idx + 1}/${numChunks} は無音でした`)
        return ''
      }

      return await post(encodeWav(samples, outRate), `chunk_${idx}.wav`, samples.length / outRate)
    }

    // 同時実行数を絞って処理する（全部同時だと長い会議でタブがメモリを使い切る）。
    // 結果は必ず元の順番どおりに並べること＝会議の話の順序が入れ替わると議事録が崩れる。
    const results: string[] = new Array(numChunks)
    let nextIndex = 0
    let done = 0
    onProgress?.(0, numChunks)
    const workers = Array.from({ length: Math.min(CHUNK_CONCURRENCY, numChunks) }, async () => {
      for (let idx = nextIndex++; idx < numChunks; idx = nextIndex++) {
        results[idx] = await transcribeChunk(idx)
        onProgress?.(++done, numChunks)
      }
    })
    await Promise.all(workers)

    const text = results.filter(Boolean).join('\n').trim()

    // 音の長さに対して文字数が明らかに少なければ、変換か認識のどこかが壊れている。
    // そのまま返すと「1時間の会議が2行」の議事録が出来てしまい、原因にも気づけない。
    // 普通の会話は1分あたり300字前後なので、20字/分を下回るのは異常とみなす。
    // 基準にするのは「ファイル本来の長さ」。展開結果の長さを使うと、展開が壊れていた場合に
    // 短い値どうしで比べることになり、10文字でも正常と判定されてしまう。
    const minutes = Math.max(probedDuration, audioBuffer.duration) / 60
    if (minutes >= 3 && text.length < minutes * 20) {
      throw new Error(
        `声がほとんど聞き取れませんでした（約${Math.round(minutes)}分の録音で${text.length}文字）。` +
          '録音の音が小さすぎないかご確認のうえ、話す人の近くに置いて録り直してください。'
      )
    }

    return text
  }

  return { transcribe }
}
