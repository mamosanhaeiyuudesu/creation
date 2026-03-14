<template>
  <div class="page">
    <div class="container">
      <header class="header">
        <h1>Whisper</h1>
        <p class="subtitle">音声を文字に変換</p>
      </header>

      <div class="recorder">
        <div class="buttons-row">
          <!-- 録音中: 一時停止ボタンのみ -->
          <template v-if="isRecording">
            <button class="record-button recording" @click="pauseRecording">
              <span class="button-icon">⏸️</span>
              <span class="button-text">一時停止</span>
            </button>
          </template>

          <!-- 一時停止中: 再開 + 文字起こし -->
          <template v-else-if="isPaused">
            <div class="split-button">
              <button class="split-half resume-half" @click="resumeRecording">
                <span class="button-icon">▶</span>
                <span class="button-text">再開</span>
              </button>
              <div class="split-divider" />
              <button class="split-half transcribe-half" @click="transcribeRecording">
                <span class="button-icon">✍️</span>
                <span class="button-text">文字起こし</span>
              </button>
            </div>
          </template>

          <!-- 解析中 -->
          <template v-else-if="isProcessing || isUploading">
            <button class="record-button" disabled>
              <span class="button-icon">⏳</span>
              <span class="button-text">解析中</span>
            </button>
          </template>

          <!-- 初期状態: 録音 + ファイル -->
          <template v-else>
            <button class="record-button" @click="startRecording">
              <span class="button-icon">🎙️</span>
              <span class="button-text">録音</span>
            </button>

            <button class="record-button upload-button" @click="triggerUpload">
              <span class="button-icon">📂</span>
              <span class="button-text">音声ファイル</span>
            </button>
          </template>

          <input
            ref="fileInput"
            type="file"
            accept="audio/*,video/*"
            class="file-input-hidden"
            @change="onFileSelected"
          />
        </div>

        <div v-if="isRecording || duration > 0" class="timer">
          {{ formatTime(duration) }}
        </div>
      </div>

      <div v-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="error = ''" class="reset-button">閉じる</button>
      </div>

      <HistoryTable :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHistory } from '~/composables/useHistory'

const isRecording = ref(false)
const isPaused = ref(false)
const isProcessing = ref(false)
const isUploading = ref(false)
const duration = ref(0)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const { history, copiedHistoryId, addHistory, deleteHistory, copyHistory } = useHistory('whisper-history')

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let timerInterval: NodeJS.Timeout | null = null

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const fetchTitle = async (text: string): Promise<string> => {
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
  } catch (err) {
    error.value = 'マイクへのアクセスが許可されていません'
    console.error('Recording error:', err)
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
      const response = await fetch('/api/whisper', { method: 'POST', body: formData })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '文字起こしに失敗しました')
      }
      const data = await response.json()
      const title = await fetchTitle(data.text)
      addHistory(data.text, title)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '予期しないエラーが発生しました'
      console.error('Transcription error:', err)
    } finally {
      isProcessing.value = false
      duration.value = 0
      mediaRecorder!.stream.getTracks().forEach(track => track.stop())
    }
  }
}

const triggerUpload = () => { fileInput.value?.click() }

const onFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('audio', file, file.name)
    const response = await fetch('/api/whisper', { method: 'POST', body: formData })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '文字起こしに失敗しました')
    }
    const data = await response.json()
    const title = await fetchTitle(data.text)
    addHistory(data.text, title)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '予期しないエラーが発生しました'
    console.error('Upload transcription error:', err)
  } finally {
    isUploading.value = false
  }
}
</script>

<style scoped>
.page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 100vh;
}

@media (max-width: 1023px) {
  .page {
    padding: 12px 16px;
    align-items: flex-start;
    padding-top: 16px;
  }
}

.container {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  display: grid;
  gap: 16px;
}

@media (max-width: 1023px) {
  .container {
    padding: 20px;
    gap: 12px;
  }
}

.header {
  text-align: center;
}

.header h1 {
  margin: 0;
  font-size: clamp(24px, 4vw, 32px);
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
  gap: 12px;
}

.buttons-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.file-input-hidden {
  display: none;
}

.record-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  color: #f8fafc;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

@media (max-width: 1023px) {
  .record-button {
    width: 70px;
    height: 70px;
    font-size: 20px;
  }
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

.upload-button {
  border-color: #a78bfa;
  background: rgba(167, 139, 250, 0.1);
}

.upload-button:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.2);
  border-color: #8b5cf6;
  transform: scale(1.05);
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
  font-size: 10px;
  font-weight: 500;
}

.split-button {
  display: flex;
  border-radius: 50px;
  overflow: hidden;
  border: 2px solid #38bdf8;
  height: 80px;
}

.split-half {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 80px;
  background: none;
  border: none;
  color: #f8fafc;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}

.split-half .button-icon {
  font-size: 20px;
}

.split-half .button-text {
  font-size: 10px;
  font-weight: 500;
}

.resume-half {
  background: rgba(56, 189, 248, 0.1);
}

.resume-half:hover {
  background: rgba(56, 189, 248, 0.25);
}

.split-divider {
  width: 1px;
  background: rgba(56, 189, 248, 0.4);
  align-self: stretch;
}

.transcribe-half {
  background: rgba(74, 222, 128, 0.1);
}

.transcribe-half:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.25);
}

.transcribe-half:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.timer {
  font-size: 20px;
  color: #ef4444;
  font-family: 'Monaco', monospace;
  font-weight: 600;
}

.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 16px;
}

.error p {
  margin: 0 0 12px;
  color: #fca5a5;
  font-size: 14px;
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
</style>
