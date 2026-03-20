import { ref } from 'vue'

export interface DictEntry {
  input: string
  output: string
}

interface AudioRecorderOptions {
  onTranscribed: (text: string) => Promise<void> | void
  onError: (message: string) => void
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
    mediaRecorder.stop()
    isPaused.value = false
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      isProcessing.value = true
      try {
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        const data = await $fetch<{ text: string }>('/api/whisper', { method: 'POST', body: formData })
        await onTranscribed(data.text)
      } catch (err) {
        onError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      } finally {
        isProcessing.value = false
        duration.value = 0
        mediaRecorder!.stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  return { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording }
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

export const proofreadInBackground = async (
  id: string,
  text: string,
  dictionary: DictEntry[],
  updateHistory: (id: string, text: string) => void,
): Promise<void> => {
  const entries = dictionary.filter((d) => d.input)
  if (!entries.length) return
  try {
    const res = await $fetch<{ text: string }>('/api/whisper/proofread', {
      method: 'POST',
      body: { text, dictionary: entries },
    })
    if (res.text && res.text !== text) updateHistory(id, res.text)
  } catch {
    // 校正失敗は無視
  }
}
