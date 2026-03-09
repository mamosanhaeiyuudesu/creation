<template>
  <div class="page">
    <div class="container">
      <header class="header">
        <h1>Whisper</h1>
        <p class="subtitle">音声を文字に変換</p>
      </header>

      <div class="recorder">
        <button 
          :class="['record-button', { recording: isRecording, processing: isProcessing }]"
          @click="toggleRecording"
          :disabled="isProcessing"
        >
          <span class="button-icon">{{ buttonIcon }}</span>
          <span class="button-text">{{ buttonText }}</span>
        </button>

        <div v-if="isRecording || duration > 0" class="timer">
          {{ formatTime(duration) }}
        </div>
      </div>

      <div v-if="transcript" class="result">
        <h2>文字起こし結果</h2>
        <p class="transcript-text">{{ transcript }}</p>
        <button @click="resetRecording" class="reset-button">新しく録音</button>
      </div>

      <div v-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="error = ''" class="reset-button">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const isRecording = ref(false)
const isProcessing = ref(false)
const duration = ref(0)
const transcript = ref('')
const error = ref('')

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let timerInterval: NodeJS.Timeout | null = null

const buttonIcon = computed(() => {
  if (isProcessing.value) return '⏳'
  return isRecording.value ? '⏹️' : '🎙️'
})

const buttonText = computed(() => {
  if (isProcessing.value) return '処理中...'
  return isRecording.value ? '文字起こしする' : '録音開始'
})

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const toggleRecording = async () => {
  if (isRecording.value) {
    await stopRecording()
  } else {
    await startRecording()
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    mediaRecorder.start()
    isRecording.value = true
    duration.value = 0

    timerInterval = setInterval(() => {
      duration.value++
    }, 1000)
  } catch (err) {
    error.value = 'マイクへのアクセスが許可されていません'
    console.error('Recording error:', err)
  }
}

const stopRecording = async () => {
  if (!mediaRecorder) return

  mediaRecorder.stop()
  isRecording.value = false

  if (timerInterval) {
    clearInterval(timerInterval)
  }

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    isProcessing.value = true

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/whisper/index', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '文字起こしに失敗しました')
      }

      const data = await response.json()
      transcript.value = data.text
    } catch (err) {
      error.value = err instanceof Error ? err.message : '予期しないエラーが発生しました'
      console.error('Transcription error:', err)
    } finally {
      isProcessing.value = false
      mediaRecorder!.stream.getTracks().forEach(track => track.stop())
    }
  }
}

const resetRecording = () => {
  transcript.value = ''
  duration.value = 0
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.container {
  width: 100%;
  max-width: 600px;
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #38bdf8;
  text-decoration: none;
  font-size: 14px;
  margin-bottom: 16px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #0ea5e9;
}

.header h1 {
  margin: 0;
  font-size: 48px;
  color: #f8fafc;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 16px;
}

.recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-bottom: 48px;
}

.record-button {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 3px solid #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  color: #f8fafc;
  font-size: 48px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.record-button:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: #0ea5e9;
  transform: scale(1.05);
}

.record-button.recording {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.record-button.recording:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: #dc2626;
}

.record-button.processing {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.record-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  display: block;
  line-height: 1;
}

.button-text {
  font-size: 14px;
  font-weight: 500;
}

.timer {
  font-size: 24px;
  color: #ef4444;
  font-family: 'Monaco', monospace;
  font-weight: 600;
}

.result {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
}

.result h2 {
  margin: 0 0 16px;
  font-size: 20px;
  color: #f8fafc;
}

.transcript-text {
  margin: 0 0 24px;
  font-size: 16px;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.reset-button {
  width: 100%;
  padding: 12px 24px;
  border: none;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  color: #f8fafc;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.reset-button:hover {
  opacity: 0.9;
}

.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 24px;
}

.error p {
  margin: 0 0 16px;
  color: #fca5a5;
  font-size: 14px;
}
</style>
