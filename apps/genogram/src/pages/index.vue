<template>
  <div class="genogram-page">
    <header class="genogram-header">
      <h1>ジェノグラム作成ツール</h1>
      <p>家族構成や感情的な関係性を文章で伝えるとAIがJSONを作成・更新し、家系図(ジェノグラム)をその場に描画します。文章やJSONは保存されず、AIへの一時的な問い合わせのみ行います。</p>
    </header>

    <div class="genogram-layout">
      <section class="genogram-input">
        <section class="genogram-ai">
          <label class="genogram-ai-label" for="genogram-ai-text">家族構成をAIに伝える</label>
          <textarea
            id="genogram-ai-text"
            v-model="aiText"
            class="genogram-ai-textarea"
            rows="4"
            :disabled="aiLoading"
            placeholder="例: 父の太郎(1950年生まれ、農業、糖尿病持ち)と母の恵子は1978年に結婚していて仲が悪い。娘の花子は母とべったり。"
            @keydown.meta.enter="submitAiText"
            @keydown.ctrl.enter="submitAiText"
          />
          <div class="genogram-ai-actions">
            <button type="button" :disabled="aiLoading || !aiText.trim()" @click="submitAiText">
              {{ aiLoading ? '解釈中…' : '送信' }}
            </button>
            <span class="genogram-ai-hint">Cmd/Ctrl+Enterでも送信できます</span>
          </div>
          <p v-if="aiError" class="genogram-ai-error">{{ aiError }}</p>
        </section>

        <div class="genogram-toolbar">
          <button type="button" @click="copyShareLink">共有リンクをコピー</button>
          <button type="button" class="genogram-clear-btn" @click="clearAll">クリア</button>
        </div>
        <p v-if="shareMessage" class="genogram-share-message">{{ shareMessage }}</p>

        <textarea
          v-model="jsonText"
          class="genogram-textarea"
          spellcheck="false"
          placeholder='{"people": [...], "unions": [...], "relations": [...]}'
        />

        <ul v-if="errors.length > 0" class="genogram-errors">
          <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
        </ul>
      </section>

      <section class="genogram-preview">
        <div class="genogram-toolbar">
          <button type="button" :disabled="!parsedData" @click="downloadSvg">SVGをダウンロード</button>
          <button type="button" :disabled="!parsedData" @click="downloadPng">PNGをダウンロード</button>
        </div>

        <div class="genogram-canvas">
          <GenogramSvg v-if="parsedData" ref="genogramRef" :data="parsedData" />
          <p v-else class="genogram-empty">左上でAIに家族構成を伝えるか、下のJSONを直接入力すると、ここにジェノグラムが表示されます。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { GenogramData } from '~/types/genogram'
import { validateGenogramData } from '~/utils/validateGenogram'
import { computeGenogramLayout } from '~/composables/useGenogramLayout'
import GenogramSvg from '~/components/GenogramSvg.vue'

useHead({
  title: 'ジェノグラム作成ツール',
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧬</text></svg>`,
    },
  ],
})

const STORAGE_KEY = 'genogram-json'

const jsonText = ref('')
const errors = ref<string[]>([])
const parsedData = ref<GenogramData | null>(null)
const shareMessage = ref('')
const genogramRef = ref<InstanceType<typeof GenogramSvg> | null>(null)

const aiText = ref('')
const aiLoading = ref(false)
const aiError = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function processJson(value: string) {
  errors.value = []
  parsedData.value = null

  if (!value.trim()) return

  let raw: unknown
  try {
    raw = JSON.parse(value)
  } catch (e) {
    errors.value = [`JSONの構文エラー: ${(e as Error).message}`]
    return
  }

  const { data, errors: validationErrors } = validateGenogramData(raw)
  if (validationErrors.length > 0 || !data) {
    errors.value = validationErrors
    return
  }

  const layoutCheck = computeGenogramLayout(data)
  if (layoutCheck.errors.length > 0) {
    errors.value = layoutCheck.errors
    return
  }

  parsedData.value = data

  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorageが使えない環境では自動保存を諦める
  }
}

watch(jsonText, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => processJson(value), 300)
})

async function submitAiText() {
  const text = aiText.value.trim()
  if (!text || aiLoading.value) return

  aiLoading.value = true
  aiError.value = ''
  try {
    const res = await $fetch('/api/interpret', {
      method: 'POST',
      body: { text, currentData: parsedData.value },
    })
    jsonText.value = JSON.stringify(res.data, null, 2)
    aiText.value = ''
  } catch (e: any) {
    aiError.value = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || 'AIの呼び出しに失敗しました。'
  } finally {
    aiLoading.value = false
  }
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  return b64
}

async function copyShareLink() {
  try {
    const encoded = toBase64Url(encodeBase64Utf8(jsonText.value))
    history.replaceState(null, '', `#d=${encoded}`)
    const url = `${location.origin}${location.pathname}#d=${encoded}`
    await navigator.clipboard.writeText(url)
    shareMessage.value = '共有リンクをコピーしました'
  } catch {
    shareMessage.value = '共有リンクのコピーに失敗しました(このブラウザではクリップボードにアクセスできない可能性があります)'
  }
  setTimeout(() => {
    shareMessage.value = ''
  }, 3000)
}

function clearAll() {
  if (!window.confirm('入力したテキストとJSONをすべて消去します。よろしいですか?')) return

  jsonText.value = ''
  aiText.value = ''
  aiError.value = ''
  errors.value = []
  parsedData.value = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorageが使えない環境では何もしない
  }
  if (location.hash) {
    history.replaceState(null, '', location.pathname)
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function serializeSvg(): string | null {
  const svg = genogramRef.value?.svgEl
  if (!svg) return null
  const serializer = new XMLSerializer()
  let source = serializer.serializeToString(svg)
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  return source
}

function downloadSvg() {
  const source = serializeSvg()
  if (!source) return
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, 'genogram.svg')
}

function downloadPng() {
  const source = serializeSvg()
  const layoutData = genogramRef.value?.layout
  if (!source || !layoutData) return

  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = layoutData.width * scale
    canvas.height = layoutData.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'genogram.png')
    }, 'image/png')
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

onMounted(() => {
  const hashMatch = location.hash.match(/^#d=(.+)$/)
  const hashPayload = hashMatch?.[1]
  if (hashPayload) {
    try {
      const json = decodeBase64Utf8(fromBase64Url(hashPayload))
      jsonText.value = json
      processJson(json)
      return
    } catch {
      // 不正なハッシュの場合はフォールバックへ進む
    }
  }

  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  if (saved) {
    jsonText.value = saved
    processJson(saved)
  }
})
</script>
