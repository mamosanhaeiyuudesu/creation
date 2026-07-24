<template>
  <div>
    <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onFile" />

    <div v-if="!preview" class="ip-card p-6 sm:p-8 text-center">
      <div class="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-white/[0.04] border border-[var(--ip-line)] mb-4">
        <span class="text-2xl">✏️</span>
      </div>
      <p class="text-[15px] font-bold mb-1">スケッチを撮影 / 選択</p>
      <p class="text-[12.5px] text-[var(--ip-ink-soft)] mb-5 leading-relaxed">
        紙のラフをそのまま撮ってください。<br class="sm:hidden" />罫線・影は自動で薄くして線を強調します。
      </p>
      <button class="ip-btn" @click="fileInput?.click()">画像を選ぶ</button>
    </div>

    <div v-else class="ip-card p-3">
      <div class="relative rounded-xl overflow-hidden bg-black/30">
        <img :src="preview" alt="スケッチ" class="w-full max-h-[420px] object-contain" />
        <button
          class="absolute top-2 right-2 text-[12px] font-bold px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-[var(--ip-ink)] border border-[var(--ip-line)]"
          @click="clear"
        >撮り直す</button>
      </div>
      <label class="flex items-center gap-2 mt-3 px-1 text-[12.5px] text-[var(--ip-ink-soft)] cursor-pointer select-none">
        <input type="checkbox" v-model="enhance" class="accent-[var(--ip-accent)]" @change="reprocess" />
        線画を強調する（背景の罫線・影を薄くする）
      </label>
    </div>

    <p v-if="error" class="mt-2 text-[12.5px] text-rose-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// クライアント側の前処理（Cloudflare Workers ではサーバー画像処理ができないため kaki と同方針）。
// 台形補正までは行わず、縮小＋グレースケール＋コントラスト強調で線画を見やすくする。
const emit = defineEmits<{ (e: 'captured', dataUrl: string): void; (e: 'cleared'): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref('')
const enhance = ref(true)
const error = ref('')
let lastFileDataUrl = '' // 生の縮小画像（強調ON/OFF切替の元）

const MAX_DIM = 1600

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像を開けませんでした'))
    img.src = url
  })
}

/** 縮小してJPEGに。強調ONならグレースケール＋コントラストで線を立たせる。 */
async function process(rawDataUrl: string): Promise<string> {
  const img = await loadImage(rawDataUrl)
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  if (enhance.value) {
    const imgData = ctx.getImageData(0, 0, w, h)
    const d = imgData.data
    const contrast = 1.6 // >1 でコントラストを上げる
    const mid = 128
    for (let i = 0; i < d.length; i += 4) {
      // グレースケール（知覚輝度）
      let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      // コントラスト強調（明るい紙は白へ、濃い線は黒へ）
      v = (v - mid) * contrast + mid
      v = Math.max(0, Math.min(255, v))
      d[i] = d[i + 1] = d[i + 2] = v
    }
    ctx.putImageData(imgData, 0, 0)
  }
  return canvas.toDataURL('image/jpeg', 0.85)
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  try {
    lastFileDataUrl = await readFile(file)
    const out = await process(lastFileDataUrl)
    preview.value = out
    emit('captured', out)
  } catch (err: any) {
    error.value = err?.message || '画像の処理に失敗しました'
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function reprocess() {
  if (!lastFileDataUrl) return
  try {
    const out = await process(lastFileDataUrl)
    preview.value = out
    emit('captured', out)
  } catch {
    /* noop */
  }
}

function clear() {
  preview.value = ''
  lastFileDataUrl = ''
  emit('cleared')
}
</script>
