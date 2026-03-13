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
              <button class="split-half transcribe-half" @click="transcribeRecording" :disabled="isProcessing">
                <span class="button-icon">{{ isProcessing ? '⏳' : '✍️' }}</span>
                <span class="button-text">{{ isProcessing ? '処理中...' : '文字起こし' }}</span>
              </button>
            </div>
          </template>

          <!-- 初期状態: 録音 + ファイル -->
          <template v-else>
            <button
              class="record-button"
              @click="startRecording"
              :disabled="isProcessing || isUploading"
            >
              <span class="button-icon">🎙️</span>
              <span class="button-text">録音開始</span>
            </button>

            <button
              class="record-button upload-button"
              @click="triggerUpload"
              :disabled="isProcessing || isUploading"
            >
              <span class="button-icon">{{ isUploading ? '⏳' : '📂' }}</span>
              <span class="button-text">{{ isUploading ? '処理中...' : 'ファイル' }}</span>
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

      <div v-if="history.length > 0" class="history">
        <h2>履歴</h2>
        <div class="history-table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th class="col-date">日時</th>
                <th class="col-copy">コピー</th>
                <th class="col-delete">削除</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in history" :key="item.id">
                <td class="col-date">{{ formatDate(item.timestamp) }}</td>
                <td class="col-copy">
                  <button @click="copyHistory(item)" class="action-button copy" :title="item.id === copiedHistoryId ? 'コピーしました!' : 'コピー'">
                    {{ item.id === copiedHistoryId ? '✓' : '📋' }}
                  </button>
                </td>
                <td class="col-delete">
                  <button @click="deleteHistory(item.id)" class="action-button delete" title="削除">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface HistoryItem {
  id: string
  timestamp: string
  text: string
}

const STORAGE_KEY = 'whisper-history'

const isRecording = ref(false)
const isPaused = ref(false)
const isProcessing = ref(false)
const isUploading = ref(false)
const duration = ref(0)
const error = ref('')
const copiedHistoryId = ref<string | null>(null)
const history = ref<HistoryItem[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let timerInterval: NodeJS.Timeout | null = null

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      history.value = JSON.parse(stored)
    } catch {
      history.value = []
    }
  }
})

const saveHistory = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
}

const addHistory = (text: string) => {
  const item: HistoryItem = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    text,
  }
  history.value.unshift(item)
  saveHistory()
}

const deleteHistory = (id: string) => {
  history.value = history.value.filter(item => item.id !== id)
  saveHistory()
}

const copyHistory = async (item: HistoryItem) => {
  try {
    await navigator.clipboard.writeText(item.text)
    copiedHistoryId.value = item.id
    setTimeout(() => {
      copiedHistoryId.value = null
    }, 2000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const y = String(d.getFullYear()).slice(-2)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${mi}`
}

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

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    mediaRecorder.start()
    isRecording.value = true
    isPaused.value = false
    duration.value = 0

    timerInterval = setInterval(() => {
      duration.value++
    }, 1000)
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
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const resumeRecording = () => {
  if (!mediaRecorder) return
  mediaRecorder.resume()
  isRecording.value = true
  isPaused.value = false
  timerInterval = setInterval(() => {
    duration.value++
  }, 1000)
}

const transcribeRecording = () => {
  if (!mediaRecorder) return

  mediaRecorder.stop()
  isPaused.value = false

  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    isProcessing.value = true

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '文字起こしに失敗しました')
      }

      const data = await response.json()
      addHistory(data.text)
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

const triggerUpload = () => {
  fileInput.value?.click()
}

const onFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('audio', file, file.name)

    const response = await fetch('/api/whisper', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '文字起こしに失敗しました')
    }

    const data = await response.json()
    addHistory(data.text)
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
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

@media (max-width: 1023px) {
  .header {
    margin-bottom: 16px;
  }
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
  margin-bottom: 24px;
}

.buttons-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.file-input-hidden {
  display: none;
}

@media (max-width: 1023px) {
  .recorder {
    margin-bottom: 16px;
  }
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

.record-button.processing {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
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

.timer {
  font-size: 20px;
  color: #ef4444;
  font-family: 'Monaco', monospace;
  font-weight: 600;
}

.result {
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.result h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #f8fafc;
}

.transcript-text {
  margin: 0 0 16px;
  font-size: 16px;
  line-height: 1.6;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.transcript-section {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.copy-button {
  background: none;
  border: 1px solid rgba(74, 222, 128, 0.5);
  color: #4ade80;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
  margin-top: 2px;
}

.copy-button:hover {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.8);
  color: #86efac;
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
  padding: 16px;
  margin-bottom: 16px;
}

.error p {
  margin: 0 0 12px;
  color: #fca5a5;
  font-size: 14px;
}

.history {
  margin-top: 8px;
}

.history h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #94a3b8;
  font-weight: 500;
}

.history-table-wrapper {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.history-table-wrapper::-webkit-scrollbar {
  width: 4px;
}

.history-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.history-table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.history-table thead {
  position: sticky;
  top: 0;
  background: rgba(15, 23, 42, 0.95);
  z-index: 1;
}

.history-table th {
  padding: 8px 12px;
  text-align: left;
  color: #64748b;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.history-table td {
  padding: 8px 12px;
  color: #cbd5e1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.history-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

.col-date {
  white-space: nowrap;
  width: 130px;
}

.col-copy,
.col-delete {
  white-space: nowrap;
  width: 48px;
  text-align: center;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  transition: background 0.15s;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.08);
}

.action-button.delete:hover {
  background: rgba(239, 68, 68, 0.15);
}
</style>
