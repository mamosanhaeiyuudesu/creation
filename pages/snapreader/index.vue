<template>
  <div class="page">
    <div class="container">
      <header class="header">
        <h1>SnapReader</h1>
        <p class="subtitle">画像を送って、文字起こし</p>
      </header>

      <div class="uploader">
        <div class="buttons-row">
          <button class="record-button camera-button" @click="fileInput?.click()" :disabled="loading">
            <span class="button-icon">{{ loading ? '⏳' : '📷' }}</span>
            <span class="button-text">{{ loading ? '解析中' : '画像を送る' }}</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="file-input-hidden"
            @change="onFileChange"
          />
        </div>
      </div>

      <div v-if="error" class="status status--error">
        <p>{{ error }}</p>
      </div>

      <HistoryTable :history="history" :copiedId="copiedHistoryId" @copy="copyHistory" @delete="deleteHistory" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHistory } from '~/composables/useHistory'

const fileInput = ref<HTMLInputElement | null>(null)
const imageBase64 = ref<string>('')
const error = ref<string>('')
const loading = ref(false)

const { history, copiedHistoryId, addHistory, deleteHistory, copyHistory } = useHistory('snapreader-history')

const formatText = (text: string) => {
  const withoutBlocks = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```/g, '')
  )
  const withoutMarkdown = withoutBlocks
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[`*_~]/g, '')
  return withoutMarkdown.replace(/。/g, '。\n').trim()
}

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  error.value = ''

  if (!file.type.startsWith('image/')) {
    error.value = '画像ファイルを選択してください。'
    return
  }

  try {
    imageBase64.value = await toDataUrl(file)
  } catch (err) {
    error.value = (err as Error).message
    return
  }

  loading.value = true
  try {
    const transcriptRes = await $fetch<{ transcript: string }>('/api/snapreader/transcript', {
      method: 'POST',
      body: { imageBase64: imageBase64.value },
    })
    const text = formatText(transcriptRes.transcript)
    const titleRes = await $fetch<{ title: string }>('/api/snapreader/title', {
      method: 'POST',
      body: { transcript: text },
    })
    addHistory(text, titleRes.title)
  } catch (err: any) {
    error.value = err?.data?.message || err?.statusMessage || err?.message || '解析に失敗しました。'
  } finally {
    loading.value = false
    if (fileInput.value) fileInput.value.value = ''
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
  margin-bottom: 8px;
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

.uploader {
  display: grid;
  gap: 12px;
}

.buttons-row {
  display: flex;
  justify-content: center;
  gap: 16px;
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

.record-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.camera-button {
  border-color: #a78bfa;
  background: rgba(167, 139, 250, 0.1);
}

.camera-button:hover:not(:disabled) {
  background: rgba(167, 139, 250, 0.2);
  border-color: #8b5cf6;
  transform: scale(1.05);
}

.button-icon {
  display: block;
  line-height: 1;
}

.button-text {
  font-size: 10px;
  font-weight: 500;
}

.status {
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status p {
  margin: 0;
}

.status--error {
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
  font-size: 14px;
}
</style>
