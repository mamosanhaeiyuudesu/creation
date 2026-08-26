import { ref } from 'vue'
import type { TranscriptionModel } from './useTranscriptionModel'

interface AudioRecorderOptions {
  onTranscribed: (text: string) => Promise<void> | void
  onError: (message: string) => void
  getPrompt?: () => string
  getModel?: () => TranscriptionModel
}

// そのまま送れる長さの上限。ここに収まるなら再エンコードせず元の音質のまま送る。
const DIRECT_MAX_DURATION_SECONDS = 20 * 60
// 分割するときの1チャンクの長さ。
// 16kHz モノラル WAV: 10分 ≈ 19.2MB（OpenAI の 25MB 制限以内）
const CHUNK_DURATION_SECONDS = 10 * 60
// Whisper系モデルは16kHzで学習されている。8kHz（電話並み）まで落とすと、
// 会議室のように複数人の声が重なる録音で同じ語を延々と繰り返す幻覚が出やすくなる。
// 1チャンクを20分→10分に縮めることで、ファイルサイズを変えずに帯域を倍にしている。
const WAV_SAMPLE_RATE = 16000
// 分割せずそのまま送れるサイズの上限。OpenAI の上限は25MBだが、20分以内でも
// 非圧縮WAVなら簡単に超えるので、超えたら分割（＝8kHzモノラル化）の側へ倒す。
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
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    off += 2
  }
  return new Blob([ab], { type: 'audio/wav' })
}

export interface SplitTranscribeOptions {
  /** 文字起こしAPIに渡す固有名詞のヒント（辞書の「正しい表記」を並べたもの） */
  prompt?: string
  model?: TranscriptionModel
  /**
   * 送信先エンドポイント。既定は /api/whisper。
   * kikigaki のようにサーバー側で独自のプロンプト（用語辞書）やモデルを付ける口を持つ場合は、
   * そのエンドポイントを指定する。分割・リサンプリングの処理はここで共通に使える。
   */
  endpoint?: string
}

/**
 * 音声Blobを文字起こしする。長い/大きい場合は20分ごとに分割し、
 * 8kHzモノラルWAVへ落としてから並列に投げて結合する。
 */
export async function splitAndTranscribeBlob(
  blob: Blob,
  filename: string,
  options: SplitTranscribeOptions = {}
): Promise<string> {
  const { prompt, model = 'whisper', endpoint = '/api/whisper' } = options

  const post = async (part: Blob, name: string): Promise<string> => {
    const fd = new FormData()
    fd.append('audio', part, name)
    fd.append('model', model)
    if (prompt) fd.append('prompt', prompt)
    const res = await $fetch<{ text: string }>(endpoint, { method: 'POST', body: fd })
    return res.text
  }

  const arrayBuf = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuf).catch(() => null)
  audioCtx.close()
  if (!audioBuffer) {
    throw new Error('音声ファイルを読み込めませんでした。mp3 / wav / m4a のいずれかで、壊れていないファイルをお試しください。')
  }

  // 短くて軽いものはそのまま送る（余計な再エンコードで音質を落とさない）
  if (audioBuffer.duration <= DIRECT_MAX_DURATION_SECONDS && blob.size <= DIRECT_UPLOAD_MAX_BYTES) {
    return await post(blob, filename)
  }

  const origSampleRate = audioBuffer.sampleRate
  const origLength = audioBuffer.length
  const numChannels = audioBuffer.numberOfChannels
  const chunkSamples = Math.floor(CHUNK_DURATION_SECONDS * origSampleRate)
  const numChunks = Math.ceil(origLength / chunkSamples)

  const transcribeChunk = async (idx: number): Promise<string> => {
    const start = idx * chunkSamples
    const end = Math.min(start + chunkSamples, origLength)
    const chunkLen = end - start
    const targetLen = Math.ceil(chunkLen * WAV_SAMPLE_RATE / origSampleRate)

    // このチャンクぶんだけステレオ→モノラルに混ぜる。
    // 全長ぶんのモノラル配列を先に作ると、1時間の録音で数百MBを余分に抱えることになる。
    const mono = new Float32Array(chunkLen)
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch)
      for (let i = 0; i < chunkLen; i++) mono[i] += channelData[start + i] / numChannels
    }

    // OfflineAudioContextでWAV_SAMPLE_RATEにリサンプリング
    const offCtx = new OfflineAudioContext(1, targetLen, WAV_SAMPLE_RATE)
    const srcBuf = offCtx.createBuffer(1, chunkLen, origSampleRate)
    srcBuf.copyToChannel(mono, 0)
    const src = offCtx.createBufferSource()
    src.buffer = srcBuf
    src.connect(offCtx.destination)
    src.start()
    const rendered = await offCtx.startRendering()

    return await post(encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE), `chunk_${idx}.wav`)
  }

  // 同時実行数を絞って処理する（全部同時だと長い会議でタブがメモリを使い切る）。
  // 結果は必ず元の順番どおりに並べること＝会議の話の順序が入れ替わると議事録が崩れる。
  const results: string[] = new Array(numChunks)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(CHUNK_CONCURRENCY, numChunks) }, async () => {
    for (let idx = nextIndex++; idx < numChunks; idx = nextIndex++) {
      results[idx] = await transcribeChunk(idx)
    }
  })
  await Promise.all(workers)
  return results.join('\n')
}

export const useAudioRecorder = ({ onTranscribed, onError, getPrompt, getModel }: AudioRecorderOptions) => {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const isProcessing = ref(false)
  const duration = ref(0)

  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  let timerInterval: ReturnType<typeof setInterval> | null = null

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      audioChunks = []
      mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data) }
      mediaRecorder.start()
      isRecording.value = true
      isPaused.value = false
      duration.value = 0
      timerInterval = setInterval(() => { duration.value++ }, 1000)
    } catch {
      onError('マイクへのアクセスが許可されていません')
    }
  }

  const pauseRecording = () => {
    if (!mediaRecorder) return
    mediaRecorder.pause()
    isRecording.value = false
    isPaused.value = true
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  }

  const resumeRecording = () => {
    if (!mediaRecorder) return
    mediaRecorder.resume()
    isRecording.value = true
    isPaused.value = false
    timerInterval = setInterval(() => { duration.value++ }, 1000)
  }

  const transcribeRecording = () => {
    if (!mediaRecorder) return
    isPaused.value = false
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      isProcessing.value = true
      try {
        const text = await splitAndTranscribeBlob(audioBlob, 'recording.webm', { prompt: getPrompt?.(), model: getModel?.() })
        await onTranscribed(text)
      } catch (err) {
        onError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      } finally {
        isProcessing.value = false
        duration.value = 0
        mediaRecorder!.stream.getTracks().forEach(track => track.stop())
      }
    }
    mediaRecorder.stop()
  }

  const cancelRecording = () => {
    if (!mediaRecorder) return
    isPaused.value = false
    isRecording.value = false
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    mediaRecorder.onstop = () => {
      duration.value = 0
      audioChunks = []
      mediaRecorder!.stream.getTracks().forEach(track => track.stop())
    }
    mediaRecorder.stop()
  }

  return { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording }
}

export const fetchTitle = async (text: string): Promise<string> => {
  try {
    const response = await $fetch<{ title: string }>('/api/snapreader/title', {
      method: 'POST',
      body: { transcript: text },
    })
    return response.title
  } catch {
    return ''
  }
}

