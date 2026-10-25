<template>
  <div class="max-w-[1180px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between gap-2 mb-5">
      <div class="pl-logo">
        <span class="pl-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.4-1.1.2-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></svg>
        </span>
        <h1 class="pl-h1 !text-[17px]">palette</h1>
        <span class="pl-note font-normal hidden sm:inline">FLUX × LoRA の画像生成</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="pl-btn-ghost" @click="showLoras = true">LoRA を管理</button>
        <button v-if="isLoggedIn" class="pl-btn-text" @click="showPasswordModal = true">パスワード変更</button>
        <button v-if="isLoggedIn" class="pl-btn-text" @click="logout">ログアウト</button>
      </div>
    </div>

    <!-- タブ -->
    <div class="flex gap-1.5 mb-4" role="tablist">
      <button class="pl-tab" :class="{ 'pl-tab--on': tab === 't2i' }" role="tab" :aria-selected="tab === 't2i'" @click="setTab('t2i')">テキスト → 画像</button>
      <button class="pl-tab" :class="{ 'pl-tab--on': tab === 'i2i' }" role="tab" :aria-selected="tab === 'i2i'" @click="setTab('i2i')">画像 → 画像</button>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
      <!-- 左: 入力 -->
      <div class="space-y-4">
        <!-- i2i: 入力画像 -->
        <section v-if="tab === 'i2i'" class="pl-card">
          <ParamField label="入力画像" help="この画像をもとに、プロンプトと LoRA で描き直します。ドロップ・選択のほか、画面を切り取ってコピーした画像は ⌘V（Windows は Ctrl+V）でそのまま貼り付けられます。">
            <div
              class="pl-drop"
              :class="{ 'pl-drop--over': dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              @click="fileInput?.click()"
            >
              <img v-if="inputImage" :src="inputImage" alt="入力画像" class="max-h-[240px] mx-auto rounded-lg" />
              <p v-else class="text-[13px] text-[var(--pl-ink-soft)]">ここに画像をドロップ、クリックして選ぶ、または ⌘V で貼り付け</p>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
            <div v-if="inputImage" class="mt-2 flex items-center gap-2">
              <span class="pl-note">{{ inputInfo }}（長い辺は 1536px まで縮めて送ります）</span>
              <button class="pl-btn-ghost" @click="clearInput">外す</button>
            </div>
          </ParamField>
        </section>

        <!-- プロンプト（日本語だけ。英語への変換は生成するときに裏で行う） -->
        <section class="pl-card">
          <ParamField label="描きたい絵" for-id="pl-ja" help="日本語で書いてください。生成するときに、FLUX 向けの英語に自動で変換して使います（英語で書いても構いません）。">
            <textarea id="pl-ja" v-model="promptJa" rows="4" class="pl-input" placeholder="例: 夕焼けの海辺で犬と遊ぶ少女、水彩画風、やわらかい光" />
          </ParamField>
        </section>

        <!-- LoRA（右上の「LoRA を管理」で登録したものから選ぶ） -->
        <section class="pl-card">
          <ParamField label="LoRA" help="絵柄や特定の人物・物を覚えさせた追加の学習データです。使うものにチェックを入れ、強さを決めます。強さは高いほど LoRA の特徴が強く出ます。出すぎて絵が崩れるときは 0.6〜0.8 に下げます。複数の重ねがけもできます。">
            <p v-if="!loras.length" class="text-[13px] text-[var(--pl-ink-soft)]">LoRA なしで生成します。使うときは、右上の「LoRA を管理」で登録してください。</p>
            <ul v-else class="space-y-2">
              <li v-for="l in loras" :key="l.id" class="rounded-lg border p-2.5" :class="selected[l.id]?.on ? 'border-[var(--pl-teal)] bg-[var(--pl-teal-soft)]' : 'border-[var(--pl-line)] bg-white'">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="selected[l.id]!.on" type="checkbox" class="accent-[var(--pl-teal)] w-4 h-4" />
                  <span class="font-bold text-[14px] truncate">{{ l.name }}</span>
                  <span v-if="l.triggerWord" class="pl-chip">{{ l.triggerWord }}</span>
                </label>
                <div v-if="selected[l.id]?.on" class="mt-2 flex items-center gap-3">
                  <input v-model.number="selected[l.id]!.scale" type="range" min="0" max="4" step="0.05" class="flex-1 accent-[var(--pl-teal)]" :aria-label="`${l.name}の強さ`" />
                  <input v-model.number="selected[l.id]!.scale" type="number" min="0" max="4" step="0.05" class="pl-input !w-[72px] text-center" />
                </div>
              </li>
            </ul>
          </ParamField>
        </section>

        <!-- オプション + 生成 -->
        <div class="pl-card flex flex-wrap items-center gap-x-4 gap-y-3">
          <button class="pl-btn-ghost" @click="showOptions = true">⚙ オプション</button>
          <p class="pl-note flex-1 min-w-[160px]">{{ optionsSummary }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button class="pl-btn" :disabled="busy" @click="generate">
            {{ busy ? '生成中…' : '生成する' }}
          </button>
          <p v-if="errorMsg" class="pl-notice pl-notice--error" role="alert">{{ errorMsg }}</p>
        </div>
      </div>

      <!-- 右: 結果と履歴 -->
      <div class="space-y-6 lg:sticky lg:top-4">
        <section>
          <h2 class="pl-h2 mb-2">できた絵</h2>
          <div v-if="busy" class="pl-card text-center py-14">
            <p class="pl-pulse font-bold text-[15px]">{{ progressText }}</p>
            <p class="pl-note mt-2">通常は数秒〜1分ほどです。このまま待てます。</p>
          </div>
          <div v-else-if="results.length" class="space-y-3">
            <div class="grid gap-3" :class="results.length > 1 ? 'sm:grid-cols-2' : ''">
              <figure v-for="(img, i) in results" :key="img.url" class="pl-card !p-2">
                <img :src="img.url" :width="img.width" :height="img.height" alt="生成された画像" class="w-full rounded-lg" />
                <figcaption class="flex flex-wrap gap-1.5 mt-2">
                  <button class="pl-btn-ghost" @click="download(img, i)">保存</button>
                  <button class="pl-btn-ghost" @click="useAsInput(img)">画像→画像の入力にする</button>
                  <a :href="img.url" target="_blank" rel="noopener" class="pl-btn-ghost">開く</a>
                </figcaption>
              </figure>
            </div>
            <p v-if="resultSeed !== null" class="pl-note">
              シード: <b class="text-[var(--pl-ink)]">{{ resultSeed }}</b>
              <button class="pl-btn-text !min-h-0 !px-2" @click="seedText = resultSeed">このシードを使う</button>
            </p>
          </div>
          <p v-else class="pl-card text-center pl-note py-14">ここに生成した絵が出ます。</p>
        </section>

        <section>
          <h2 class="pl-h2 mb-2">履歴</h2>
          <p v-if="!history.length" class="pl-note">まだ履歴がありません。</p>
          <ul v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <li v-for="h in history" :key="h.id" class="pl-card !p-1.5">
              <button class="block w-full text-left" :aria-label="`この設定を復元（${(h.promptJa || h.prompt).slice(0, 30)}）`" @click="restore(h)">
                <img v-if="h.images[0]" :src="h.images[0].url" alt="" loading="lazy" class="w-full aspect-square object-cover rounded-md bg-[var(--pl-paper-2)]" />
                <div v-else class="w-full aspect-square rounded-md bg-[var(--pl-paper-2)] flex items-center justify-center text-[12px] text-[var(--pl-danger)] p-2 text-center">失敗</div>
                <p class="text-[11.5px] mt-1.5 line-clamp-2 text-[var(--pl-ink-soft)]">{{ h.promptJa || h.prompt }}</p>
              </button>
              <div class="flex items-center justify-between mt-1">
                <span class="pl-chip !text-[10.5px] !py-0">{{ h.mode === 'i2i' ? '画像→画像' : 'テキスト→画像' }}</span>
                <button class="text-[11px] text-[var(--pl-ink-soft)] underline" @click="removeHistory(h)">削除</button>
              </div>
            </li>
          </ul>
          <p v-if="history.length" class="pl-note mt-2">タップで設定を復元します。画像は fal.ai 側に置かれていて、しばらくすると消えることがあるので、残したい絵は「保存」してください。</p>
        </section>
      </div>
    </div>

    <OptionsSheet
      v-if="showOptions"
      v-model:seed-text="seedText"
      :params="params"
      :mode="tab"
      @close="showOptions = false"
      @reset="resetOptions"
    />
    <LoraManager v-if="showLoras" :loras="loras" @close="showLoras = false" @changed="loadLoras" />
    <AuthModal v-if="showAuthModal" accent="orange" />
    <PasswordModal v-model:show="showPasswordModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { SEED_PATTERN } from '~/utils/palette-fal'
import AuthModal from '~/components/AuthModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import ParamField from '~/components/palette/ParamField.vue'
import LoraManager from '~/components/palette/LoraManager.vue'
import OptionsSheet from '~/components/palette/OptionsSheet.vue'
import type {
  PaletteGeneration,
  PaletteGenerateRequest,
  PaletteImage,
  PaletteImageSize,
  PaletteLora,
  PaletteMode,
  PaletteParams,
  PaletteStatusResponse,
} from '~/types/palette'

definePageMeta({ layout: 'palette' })
useHead({ title: 'palette | 画像生成' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)
const showLoras = ref(false)
const showOptions = ref(false)

// ── 状態 ──────────────────────────────
const tab = ref<PaletteMode>('t2i')
const promptJa = ref('')
/** 英語に変換した結果。画面には出さない。同じ日本語・同じトリガーなら使い回して、変換をやり直さない */
const prompt = ref('')
const translatedKey = ref('')

const defaults = (): PaletteParams => ({
  imageSize: 'landscape_4_3',
  width: 1024,
  height: 1024,
  steps: 28,
  guidance: 3.5,
  numImages: 1,
  seed: null,
  format: 'jpeg',
  safety: true,
  acceleration: 'none',
  strength: 0.85,
})
const params = reactive<PaletteParams>(defaults())
const seedText = ref('')
/** 画像サイズはタブごとに覚える（画像→画像は「元画像と同じ」が既定） */
const sizeByMode = reactive<Record<PaletteMode, PaletteImageSize>>({ t2i: 'landscape_4_3', i2i: 'auto' })

const loras = ref<PaletteLora[]>([])
const selected = reactive<Record<string, { on: boolean; scale: number }>>({})

const inputImage = ref('')
const inputInfo = ref('')
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const busy = ref(false)
const progressText = ref('')
const errorMsg = ref('')
const results = ref<PaletteImage[]>([])
const resultSeed = ref<string | null>(null)
const history = ref<PaletteGeneration[]>([])

// ── オプションの保存（localStorage）──────────────────────────────
// 保存するのはオプションと LoRA の選択。シードは毎回ランダムが基本なので保存しない。
const STORAGE_KEY = 'palette:options:v1'
const optionsLoaded = ref(false)
let savedSelected: Record<string, { on: boolean; scale: number }> = {}

const SIZES: PaletteImageSize[] = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9', 'auto', 'custom']
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function loadOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    const d = defaults()
    if (SIZES.includes(s?.sizes?.t2i) && s.sizes.t2i !== 'auto') sizeByMode.t2i = s.sizes.t2i
    if (SIZES.includes(s?.sizes?.i2i)) sizeByMode.i2i = s.sizes.i2i
    const p = s?.params ?? {}
    Object.assign(params, {
      width: num(p.width, 256, 2048, d.width),
      height: num(p.height, 256, 2048, d.height),
      steps: num(p.steps, 1, 50, d.steps),
      guidance: num(p.guidance, 0, 35, d.guidance),
      numImages: num(p.numImages, 1, 4, d.numImages),
      strength: num(p.strength, 0.01, 1, d.strength),
      format: p.format === 'png' ? 'png' : 'jpeg',
      safety: p.safety !== false,
      acceleration: p.acceleration === 'regular' ? 'regular' : 'none',
    })
    params.imageSize = sizeByMode[tab.value]
    if (s?.selected && typeof s.selected === 'object') savedSelected = s.selected
  } catch {
    // 壊れた保存値は無視して既定値で始める
  }
}

function saveOptions() {
  if (!optionsLoaded.value) return
  try {
    const { seed, imageSize, ...rest } = params
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ params: rest, sizes: { ...sizeByMode, [tab.value]: imageSize }, selected })
    )
  } catch {
    // 保存できなくても（プライベートモードなど）使うぶんには困らない
  }
}
watch([params, selected], saveOptions, { deep: true })

function resetOptions() {
  const d = defaults()
  Object.assign(params, d)
  sizeByMode.t2i = 'landscape_4_3'
  sizeByMode.i2i = 'auto'
  params.imageSize = sizeByMode[tab.value]
  seedText.value = ''
}

const SIZE_LABELS: Record<string, string> = {
  square_hd: '正方形 HD',
  square: '正方形',
  portrait_4_3: '縦長 3:4',
  portrait_16_9: '縦長 9:16',
  landscape_4_3: '横長 4:3',
  landscape_16_9: '横長 16:9',
  auto: '元画像と同じ',
}
const optionsSummary = computed(() => {
  const size = params.imageSize === 'custom' ? `${params.width}×${params.height}` : SIZE_LABELS[params.imageSize]
  const parts = [size, `${params.steps}ステップ`, `ガイダンス ${params.guidance}`, `${params.numImages}枚`]
  if (tab.value === 'i2i') parts.push(`変化の強さ ${params.strength}`)
  if (seedText.value.trim()) parts.push(`シード ${seedText.value.trim()}`)
  return parts.join(' ・ ')
})

// ── タブ ──────────────────────────────
function setTab(t: PaletteMode) {
  if (t === tab.value) return
  sizeByMode[tab.value] = params.imageSize
  tab.value = t
  params.imageSize = sizeByMode[t]
}

// ── LoRA ──────────────────────────────
async function loadLoras() {
  try {
    loras.value = await $fetch<PaletteLora[]>('/api/palette/loras')
  } catch {
    loras.value = []
  }
}
watch(
  loras,
  (list) => {
    const ids = new Set(list.map((l) => l.id))
    for (const l of list) {
      if (selected[l.id]) continue
      const s = savedSelected[l.id]
      selected[l.id] = s ? { on: s.on === true, scale: num(s.scale, 0, 4, l.scale) } : { on: false, scale: l.scale }
    }
    for (const id of Object.keys(selected)) if (!ids.has(id)) delete selected[id]
  },
  { immediate: true }
)
const activeLoras = computed(() =>
  loras.value.filter((l) => selected[l.id]?.on).map((l) => ({ lora: l, scale: Number(selected[l.id]!.scale) }))
)

function errText(e: any): string {
  return e?.data?.message || e?.data?.statusMessage || e?.statusMessage || e?.message || '不明なエラー'
}

/** 選んだ LoRA のトリガーワードで、プロンプトに入っていないものを先頭へ足す。 */
function withTriggers(p: string): string {
  const lower = p.toLowerCase()
  const missing = activeLoras.value
    .map((a) => a.lora.triggerWord.trim())
    .filter((t) => t && !lower.includes(t.toLowerCase()))
  return missing.length ? `${missing.join(', ')}, ${p}` : p
}

// ── 入力画像（画像→画像）──────────────────────────────
const MAX_EDGE = 1536

async function loadImageFile(file: File) {
  errorMsg.value = ''
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '画像ファイルを選んでください'
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#ffffff' // 透過 PNG の背景が黒く抜けないように
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    inputImage.value = canvas.toDataURL('image/jpeg', 0.92)
    inputInfo.value = `${w}×${h}px`
  } catch {
    errorMsg.value = '画像を読み込めませんでした'
  }
}
function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) loadImageFile(f)
  ;(e.target as HTMLInputElement).value = ''
}
function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) loadImageFile(f)
}
function clearInput() {
  inputImage.value = ''
  inputInfo.value = ''
}

/** 画面を切り取ってコピーした画像（Mac の ⌘+Ctrl+Shift+4 など）を貼り付ける。画像が無い貼り付け（文字）は邪魔しない。 */
function onPaste(e: ClipboardEvent) {
  if (showOptions.value || showLoras.value) return
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue
      e.preventDefault()
      setTab('i2i') // どのタブで貼っても、画像→画像の入力として扱う
      loadImageFile(file)
      return
    }
  }
}

// ── 生成 ──────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POLL_MS = 2000
const POLL_TIMEOUT_MS = 6 * 60 * 1000

async function generate() {
  errorMsg.value = ''
  if (!promptJa.value.trim()) {
    errorMsg.value = '描きたい絵を書いてください'
    return
  }
  if (tab.value === 'i2i' && !inputImage.value) {
    errorMsg.value = '入力画像を選んでください'
    return
  }
  const seedStr = seedText.value.trim()
  if (seedStr && !SEED_PATTERN.test(seedStr)) {
    errorMsg.value = 'シードは数字だけ（20桁まで）で入力してください（空欄ならランダム）。オプションから直せます。'
    return
  }
  params.seed = seedStr || null

  busy.value = true
  results.value = []
  resultSeed.value = null
  try {
    // 英語への変換は裏で行う。日本語もトリガーワードも前回と同じなら、前回の結果を使い回す
    const triggers = activeLoras.value.map((a) => a.lora.triggerWord.trim()).filter(Boolean)
    const key = `${promptJa.value}\u0000${triggers.join(',')}`
    if (key !== translatedKey.value || !prompt.value) {
      progressText.value = 'プロンプトを整えています…'
      const r = await $fetch<{ prompt: string }>('/api/palette/translate', {
        method: 'POST',
        body: { text: promptJa.value, triggers },
      })
      prompt.value = r.prompt
      translatedKey.value = key
    }
    const finalPrompt = withTriggers(prompt.value)

    progressText.value = '送信しています…'
    const body: PaletteGenerateRequest = {
      mode: tab.value,
      promptJa: promptJa.value,
      prompt: finalPrompt,
      loras: activeLoras.value.map((a) => ({ path: a.lora.url, scale: a.scale, name: a.lora.name })),
      params: { ...params },
      imageDataUrl: tab.value === 'i2i' ? inputImage.value : undefined,
    }
    const { id } = await $fetch<{ id: string }>('/api/palette/generate', { method: 'POST', body })
    const started = Date.now()
    while (true) {
      await sleep(POLL_MS)
      const s = await $fetch<PaletteStatusResponse>('/api/palette/status', { query: { id } })
      if (s.status === 'COMPLETED' && s.generation) {
        results.value = s.generation.images
        resultSeed.value = s.generation.seed
        break
      }
      if (s.status === 'FAILED') throw new Error(s.error || '生成に失敗しました')
      progressText.value =
        s.status === 'IN_QUEUE'
          ? `順番待ち${s.queuePosition !== undefined ? `（あと ${s.queuePosition} 件）` : ''}…`
          : '描いています…'
      if (Date.now() - started > POLL_TIMEOUT_MS) {
        throw new Error('時間がかかっています。あとで履歴を見てください。')
      }
    }
    await loadHistory()
  } catch (e: any) {
    errorMsg.value = '生成できませんでした: ' + errText(e)
    await loadHistory()
  } finally {
    busy.value = false
  }
}

// ── 結果の操作 ──────────────────────────────
async function download(img: PaletteImage, i: number) {
  const ext = img.contentType.includes('png') ? 'png' : 'jpg'
  try {
    const blob = await (await fetch(img.url)).blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `palette-${Date.now()}-${i + 1}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch {
    // 取り込めない場合は別タブで開く（そこから保存できる）
    window.open(img.url, '_blank', 'noopener')
  }
}

async function useAsInput(img: PaletteImage) {
  errorMsg.value = ''
  try {
    const blob = await (await fetch(img.url)).blob()
    setTab('i2i')
    await loadImageFile(new File([blob], 'input', { type: blob.type || 'image/jpeg' }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    errorMsg.value = '画像を取り込めませんでした。「保存」してから、画像→画像で選んでください。'
  }
}

// ── 履歴 ──────────────────────────────
async function loadHistory() {
  try {
    history.value = await $fetch<PaletteGeneration[]>('/api/palette/history')
  } catch {
    history.value = []
  }
}

function restore(h: PaletteGeneration) {
  setTab(h.mode)
  promptJa.value = h.promptJa || h.prompt
  // 履歴の英語はトリガーワードを足したあとの文なので、そのまま使い回す（再変換しない）
  prompt.value = h.prompt
  translatedKey.value = `${promptJa.value}\u0000${(h.params.loras ?? [])
    .map((u) => loras.value.find((x) => x.url === u.path)?.triggerWord.trim() ?? '')
    .filter(Boolean)
    .join(',')}`
  const { loras: usedLoras, imageSize, ...p } = h.params
  Object.assign(params, { ...defaults(), ...p })
  const size = imageSize && SIZES.includes(imageSize) ? imageSize : defaults().imageSize
  params.imageSize = h.mode === 't2i' && size === 'auto' ? 'landscape_4_3' : size
  seedText.value = h.seed ?? ''
  for (const id of Object.keys(selected)) selected[id]!.on = false
  for (const u of usedLoras ?? []) {
    const l = loras.value.find((x) => x.url === u.path)
    if (l) selected[l.id] = { on: true, scale: u.scale }
  }
  if (h.images.length) {
    results.value = h.images
    resultSeed.value = h.seed
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function removeHistory(h: PaletteGeneration) {
  if (!confirm('この履歴を削除しますか？')) return
  await $fetch(`/api/palette/history/${h.id}`, { method: 'DELETE' }).catch(() => {})
  await loadHistory()
}

onMounted(async () => {
  loadOptions()
  optionsLoaded.value = true
  document.addEventListener('paste', onPaste)
  await checkAuth()
  if (isLoggedIn.value) await Promise.all([loadLoras(), loadHistory()])
})
onBeforeUnmount(() => document.removeEventListener('paste', onPaste))
// ログイン直後は読み込み直す（AuthModal はリロードしない）
watch(isLoggedIn, (v) => {
  if (v) {
    loadLoras()
    loadHistory()
  }
})
</script>

<style scoped>
.pl-drop {
  border: 2px dashed var(--pl-line-strong);
  border-radius: 10px;
  padding: 1.1rem;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.15s, background 0.15s;
}
.pl-drop:hover,
.pl-drop--over {
  border-color: var(--pl-teal);
  background: var(--pl-teal-soft);
}
</style>
