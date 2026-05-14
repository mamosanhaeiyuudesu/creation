import { ref } from 'vue'

interface AudioRecorderOptions {
  onTranscribed: (text: string) => Promise<void> | void
  onError: (message: string) => void
}

// 20分以上の音声は分割して並列文字起こし
const CHUNK_DURATION_SECONDS = 20 * 60
// 8kHz モノラル WAV: 20分 ≈ 19.2MB (whisper API 25MB制限以内)
const WAV_SAMPLE_RATE = 8000

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

/**
 * 音声Blobを文字起こしする。20分以上の場合は20分ごとに分割して並列処理する。
 */
export async function splitAndTranscribeBlob(blob: Blob, filename: string): Promise<string> {
  const arrayBuf = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuf)
  audioCtx.close()

  // 20分以内はそのまま送信
  if (audioBuffer.duration <= CHUNK_DURATION_SECONDS) {
    const fd = new FormData()
    fd.append('audio', blob, filename)
    const res = await $fetch<{ text: string }>('/api/whisper', { method: 'POST', body: fd })
    return res.text
  }

  const origSampleRate = audioBuffer.sampleRate
  const origLength = audioBuffer.length
  const numChannels = audioBuffer.numberOfChannels
  const chunkSamples = Math.floor(CHUNK_DURATION_SECONDS * origSampleRate)
  const numChunks = Math.ceil(origLength / chunkSamples)

  // ステレオ→モノラルにミックス
  const monoData = new Float32Array(origLength)
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch)
    for (let i = 0; i < origLength; i++) monoData[i] += channelData[i] / numChannels
  }

  const transcribeChunk = async (idx: number): Promise<string> => {
    const start = idx * chunkSamples
    const end = Math.min(start + chunkSamples, origLength)
    const chunkLen = end - start
    const targetLen = Math.ceil(chunkLen * WAV_SAMPLE_RATE / origSampleRate)

    // OfflineAudioContextでWAV_SAMPLE_RATEにリサンプリング
    const offCtx = new OfflineAudioContext(1, targetLen, WAV_SAMPLE_RATE)
    const srcBuf = offCtx.createBuffer(1, chunkLen, origSampleRate)
    srcBuf.copyToChannel(monoData.slice(start, end), 0)
    const src = offCtx.createBufferSource()
    src.buffer = srcBuf
    src.connect(offCtx.destination)
    src.start()
    const rendered = await offCtx.startRendering()

    const wavBlob = encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE)
    const fd = new FormData()
    fd.append('audio', wavBlob, `chunk_${idx}.wav`)
    const res = await $fetch<{ text: string }>('/api/whisper', { method: 'POST', body: fd })
    return res.text
  }

  // 全チャンクを並列処理して結合
  const results = await Promise.all(
    Array.from({ length: numChunks }, (_, i) => transcribeChunk(i))
  )
  return results.join('\n')
}

export const useAudioRecorder = ({ onTranscribed, onError }: AudioRecorderOptions) => {
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
        const text = await splitAndTranscribeBlob(audioBlob, 'recording.webm')
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

