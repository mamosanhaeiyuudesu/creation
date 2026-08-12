import { ref, watch, onMounted } from 'vue'

export type TranscriptionModel = 'whisper' | 'gemini'

const STORAGE_KEY = 'transcription-model'

export function useTranscriptionModel() {
  const transcriptionModel = ref<TranscriptionModel>('whisper')

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'whisper' || stored === 'gemini') transcriptionModel.value = stored
  })

  watch(transcriptionModel, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
  })

  return { transcriptionModel }
}
