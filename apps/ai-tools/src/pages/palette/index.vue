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
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--pl-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.05]" @click="showPasswordModal = true">パスワード変更</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--pl-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.05]" @click="logout">ログアウト</button>
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
          <ParamField label="入力画像" help="この画像をもとに、プロンプトと LoRA で描き直します。長い辺は 1536px に縮めて送ります。">
            <div
              class="pl-drop"
              :class="{ 'pl-drop--over': dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              @click="fileInput?.click()"
            >
              <img v-if="inputImage" :src="inputImage" alt="入力画像" class="max-h-[240px] mx-auto rounded-lg" />
              <p v-else class="text-[13px] text-[var(--pl-ink-soft)]">ここに画像をドロップ、またはクリックして選ぶ</p>
            </div>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
            <div v-if="inputImage" class="mt-2 flex items-center gap-2">
              <span class="text-[12px] text-[var(--pl-ink-soft)]">{{ inputInfo }}</span>
              <button class="pl-btn-ghost" @click="clearInput">外す</button>
            </div>
          </ParamField>
        </section>

        <!-- プロンプト -->
        <section class="pl-card space-y-3">
          <ParamField label="日本語で書く" help="描きたい絵を日本語で書くと、英語のプロンプトに変換します。FLUX は英語のプロンプトのほうが意図どおりに描きやすいため、この欄から英語欄に自動で入れます。" for-id="pl-ja">
            <textarea id="pl-ja" v-model="promptJa" rows="3" class="pl-input" placeholder="例: 夕焼けの海辺で犬と遊ぶ少女、水彩画風、やわらかい光" />
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <button class="pl-btn-ghost" :disabled="translating || busy || !promptJa.trim()" @click="translate">
                {{ translating ? '変換中…' : '英語にする ↓' }}
              </button>
              <label class="flex items-center gap-1.5 text-[12.5px] text-[var(--pl-ink-soft)]">
                <input v-model="autoTranslate" type="checkbox" class="accent-[var(--pl-teal)]" />
                日本語を直したら、生成時に自動で英語にする
              </label>
            </div>
          </ParamField>
          <ParamField label="英語のプロンプト（生成に使う）" help="実際に FLUX へ送る文です。変換結果を自由に直せます。日本語欄を使わず、ここに直接英語を書いても構いません。選んだ LoRA のトリガーワードは、入っていなければ生成時に先頭へ足します。" for-id="pl-en">
            <textarea id="pl-en" v-model="prompt" rows="4" class="pl-input" placeholder="A girl playing with a dog on a beach at sunset, watercolor style, soft light" />
          </ParamField>
        </section>

        <!-- LoRA -->
        <section class="pl-card">
          <div class="flex items-center justify-between mb-2">
            <ParamField label="LoRA" help="絵柄や特定の人物・物を覚えさせた追加の学習データです。使うものにチェックを入れ、強さを決めます。強さは高いほど LoRA の特徴が強く出ます。出すぎて絵が崩れるときは 0.6〜0.8 に下げます。複数を重ねがけもできます。" />
            <button class="pl-btn-ghost" @click="showLoras = true">管理</button>
          </div>
          <p v-if="!loras.length" class="text-[13px] text-[var(--pl-ink-soft)]">LoRA なしで生成します。「管理」から URL に名前をつけて保存すると、ここで選べます。</p>
          <ul v-else class="space-y-2">
            <li v-for="l in loras" :key="l.id" class="rounded-lg border p-2.5" :class="selected[l.id]?.on ? 'border-[var(--pl-teal)] bg-[var(--pl-teal-soft)]' : 'border-[var(--pl-line)] bg-white'">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="selected[l.id]!.on" type="checkbox" class="accent-[var(--pl-teal)] w-4 h-4" />
                <span class="font-bold text-[14px] truncate">{{ l.name }}</span>
                <span v-if="l.triggerWord" class="pl-chip !py-0.5">{{ l.triggerWord }}</span>
              </label>
              <div v-if="selected[l.id]?.on" class="mt-2 flex items-center gap-3">
                <input v-model.number="selected[l.id]!.scale" type="range" min="0" max="4" step="0.05" class="flex-1 accent-[var(--pl-teal)]" :aria-label="`${l.name}の強さ`" />
                <input v-model.number="selected[l.id]!.scale" type="number" min="0" max="4" step="0.05" class="pl-input !w-[72px] !py-1 text-center" />
              </div>
            </li>
          </ul>
        </section>

        <!-- パラメータ -->
        <section class="pl-card">
          <h2 class="pl-h2 mb-3">パラメータ</h2>
          <div class="grid sm:grid-cols-2 gap-x-4 gap-y-4">
            <ParamField label="画像サイズ" for-id="pl-size" :help="tab === 'i2i' ? '生成する絵の縦横の大きさ。「元画像と同じ」は入力画像の大きさのまま描き直します。大きいほど細部が出ますが、時間と料金が増えます。' : '生成する絵の縦横の大きさ。square は正方形、portrait は縦長、landscape は横長です。大きいほど細部が出ますが、時間と料金が増えます。'">
              <select id="pl-size" v-model="params.imageSize" class="pl-input">
                <option v-if="tab === 'i2i'" value="auto">元画像と同じ</option>
                <option value="square_hd">正方形 HD（1024×1024）</option>
                <option value="square">正方形（512×512）</option>
                <option value="portrait_4_3">縦長 3:4</option>
                <option value="portrait_16_9">縦長 9:16</option>
                <option value="landscape_4_3">横長 4:3</option>
                <option value="landscape_16_9">横長 16:9</option>
                <option value="custom">幅×高さを指定</option>
              </select>
              <div v-if="params.imageSize === 'custom'" class="mt-2 flex items-center gap-2">
                <input v-model.number="params.width" type="number" min="256" max="2048" step="64" class="pl-input" aria-label="幅" />
                <span class="text-[var(--pl-ink-soft)]">×</span>
                <input v-model.number="params.height" type="number" min="256" max="2048" step="64" class="pl-input" aria-label="高さ" />
              </div>
            </ParamField>

            <ParamField label="枚数（1〜4）" for-id="pl-num" help="一度に作る枚数です。料金は枚数に比例して増えます。構図や雰囲気を探りたいときは複数枚、仕上げるときは 1 枚が向いています。">
              <input id="pl-num" v-model.number="params.numImages" type="number" min="1" max="4" step="1" class="pl-input" />
            </ParamField>

            <ParamField label="ステップ数（1〜50）" for-id="pl-steps" help="絵をどれだけ丁寧に描き込むか（ノイズを取り除く回数）です。多いほど細部が整いますが、遅くなり料金も増えます。28 前後で十分で、増やしても変化は小さくなります。">
              <input id="pl-steps" v-model.number="params.steps" type="number" min="1" max="50" step="1" class="pl-input" />
            </ParamField>

            <ParamField label="ガイダンス（CFG・0〜35）" for-id="pl-guid" help="プロンプトにどれだけ忠実に従うかです。低いと自由で自然な絵に、高いと指示には忠実ですが不自然で派手な絵になりやすくなります。FLUX では 3〜4 が目安です。">
              <input id="pl-guid" v-model.number="params.guidance" type="number" min="0" max="35" step="0.5" class="pl-input" />
            </ParamField>

            <ParamField v-if="tab === 'i2i'" label="変化の強さ（0.01〜1）" for-id="pl-str" help="元画像をどれだけ作り変えるかです。小さいほど元画像に近く、1 に近いほど元画像から離れて自由に描き直します。0.5〜0.8 あたりから試すと調整しやすいです。">
              <div class="flex items-center gap-3">
                <input v-model.number="params.strength" type="range" min="0.01" max="1" step="0.01" class="flex-1 accent-[var(--pl-teal)]" aria-label="変化の強さ" />
                <input id="pl-str" v-model.number="params.strength" type="number" min="0.01" max="1" step="0.01" class="pl-input !w-[80px] !py-1 text-center" />
              </div>
            </ParamField>

            <ParamField label="シード" for-id="pl-seed" help="乱数の種です。空欄なら毎回ランダム。同じシード・同じ設定なら同じ絵になるので、気に入った構図のまま、プロンプトや LoRA の強さだけを少し変えて比べたいときに固定します。">
              <input id="pl-seed" v-model="seedText" inputmode="numeric" class="pl-input" placeholder="空欄 = ランダム" />
            </ParamField>

            <ParamField label="出力形式" for-id="pl-fmt" help="jpeg は軽く、png は劣化がない代わりに大きなファイルになります。普段は jpeg で十分です。">
              <select id="pl-fmt" v-model="params.format" class="pl-input">
                <option value="jpeg">jpeg</option>
                <option value="png">png</option>
              </select>
            </ParamField>

            <ParamField label="高速化" for-id="pl-acc" help="regular にすると少し速く生成できます。画質がわずかに変わることがあります。普段は none（しない）のままで構いません。">
              <select id="pl-acc" v-model="params.acceleration" class="pl-input">
                <option value="none">none（しない）</option>
                <option value="regular">regular</option>
              </select>
            </ParamField>

            <ParamField label="セーフティチェッカー" help="不適切な画像を検出して、黒塗りにする機能です。オフにすると、誤検知で黒い画像になるのを避けられます。">
              <label class="flex items-center gap-2 text-[13.5px] mt-1">
                <input v-model="params.safety" type="checkbox" class="accent-[var(--pl-teal)] w-4 h-4" />
                有効にする
              </label>
            </ParamField>
          </div>
        </section>

        <!-- 生成 -->
        <div class="flex flex-wrap items-center gap-3">
          <button class="pl-btn" :disabled="busy || translating" @click="generate">
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
            <p class="text-[12px] text-[var(--pl-ink-soft)] mt-2">通常は数秒〜1分ほどです。このまま待てます。</p>
          </div>
          <div v-else-if="results.length" class="space-y-3">
            <div class="grid gap-3" :class="results.length > 1 ? 'sm:grid-cols-2' : ''">
              <figure v-for="(img, i) in results" :key="img.url" class="pl-card !p-2">
                <img :src="img.url" :width="img.width" :height="img.height" alt="生成された画像" class="w-full rounded-lg" />
                <figcaption class="flex flex-wrap gap-1.5 mt-2">
                  <button class="pl-btn-ghost" @click="download(img, i)">保存</button>
                  <button class="pl-btn-ghost" @click="useAsInput(img)">画像→画像の入力にする</button>
                  <a :href="img.url" target="_blank" rel="noopener" class="pl-btn-ghost inline-flex items-center">開く</a>
                </figcaption>
              </figure>
            </div>
            <p v-if="resultSeed !== null" class="text-[12.5px] text-[var(--pl-ink-soft)]">
              シード: <b class="text-[var(--pl-ink)]">{{ resultSeed }}</b>
              <button class="underline ml-2" @click="seedText = String(resultSeed)">このシードを使う</button>
            </p>
          </div>
          <p v-else class="pl-card text-center text-[13px] text-[var(--pl-ink-soft)] py-14">ここに生成した絵が出ます。</p>
        </section>

        <section>
          <h2 class="pl-h2 mb-2">履歴</h2>
          <p v-if="!history.length" class="text-[13px] text-[var(--pl-ink-soft)]">まだ履歴がありません。</p>
          <ul v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <li v-for="h in history" :key="h.id" class="pl-card !p-1.5">
              <button class="block w-full text-left" :aria-label="`この設定を復元（${h.prompt.slice(0, 30)}）`" @click="restore(h)">
                <img v-if="h.images[0]" :src="h.images[0].url" alt="" loading="lazy" class="w-full aspect-square object-cover rounded-md bg-[var(--pl-paper-2)]" />
                <div v-else class="w-full aspect-square rounded-md bg-[var(--pl-paper-2)] flex items-center justify-center text-[12px] text-[var(--pl-vermilion-deep)] p-2 text-center">失敗</div>
                <p class="text-[11.5px] mt-1.5 line-clamp-2 text-[var(--pl-ink-soft)]">{{ h.promptJa || h.prompt }}</p>
              </button>
              <div class="flex items-center justify-between mt-1">
                <span class="pl-chip !py-0 !text-[10.5px]">{{ h.mode === 'i2i' ? '画像→画像' : 'テキスト→画像' }}</span>
                <button class="text-[11px] text-[var(--pl-ink-soft)] underline" @click="removeHistory(h)">削除</button>
              </div>
            </li>
          </ul>
          <p v-if="history.length" class="text-[11.5px] text-[var(--pl-ink-soft)] mt-2">タップで設定を復元します。画像は fal.ai 側に置かれていて、しばらくすると消えることがあるので、残したい絵は「保存」してください。</p>
        </section>
      </div>
    </div>

    <LoraManager v-if="showLoras" :loras="loras" @close="showLoras = false" @changed="loadLoras" />
    <AuthModal v-if="showAuthModal" accent="orange" />
    <PasswordModal v-model:show="showPasswordModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import ParamField from '~/components/palette/ParamField.vue'
import LoraManager from '~/components/palette/LoraManager.vue'
import type {
  PaletteGeneration,
  PaletteGenerateRequest,
  PaletteImage,
  PaletteLora,
  PaletteMode,
  PaletteParams,
  PaletteStatusResponse,
} from '~/types/palette'

definePageMeta({ layout: 'palette' })
useHead({ title: 'palette FLUX LoRA 画像生成' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const showPasswordModal = ref(false)
const showLoras = ref(false)

// ── 状態 ──────────────────────────────
const tab = ref<PaletteMode>('t2i')
const promptJa = ref('')
const prompt = ref('')
const autoTranslate = ref(true)
const lastTranslatedJa = ref('')
const translating = ref(false)

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
const resultSeed = ref<number | null>(null)
const history = ref<PaletteGeneration[]>([])

// ── タブ ──────────────────────────────
function setTab(t: PaletteMode) {
  tab.value = t
  // 「元画像と同じ」は画像→画像だけの選択肢
  if (t === 't2i' && params.imageSize === 'auto') params.imageSize = 'landscape_4_3'
  if (t === 'i2i' && params.imageSize === 'landscape_4_3') params.imageSize = 'auto'
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
    for (const l of list) if (!selected[l.id]) selected[l.id] = { on: false, scale: l.scale }
    for (const id of Object.keys(selected)) if (!ids.has(id)) delete selected[id]
  },
  { immediate: true }
)
const activeLoras = computed(() =>
  loras.value.filter((l) => selected[l.id]?.on).map((l) => ({ lora: l, scale: Number(selected[l.id]!.scale) }))
)

// ── 日本語 → 英語 ──────────────────────────────
async function translate(): Promise<boolean> {
  errorMsg.value = ''
  translating.value = true
  try {
    const r = await $fetch<{ prompt: string }>('/api/palette/translate', {
      method: 'POST',
      body: { text: promptJa.value, triggers: activeLoras.value.map((a) => a.lora.triggerWord).filter(Boolean) },
    })
    prompt.value = r.prompt
    lastTranslatedJa.value = promptJa.value
    return true
  } catch (e: any) {
    errorMsg.value = '英語への変換に失敗しました: ' + errText(e)
    return false
  } finally {
    translating.value = false
  }
}

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

// ── 生成 ──────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POLL_MS = 2000
const POLL_TIMEOUT_MS = 6 * 60 * 1000

async function generate() {
  errorMsg.value = ''
  if (tab.value === 'i2i' && !inputImage.value) {
    errorMsg.value = '入力画像を選んでください'
    return
  }
  // 日本語を直したあとに英語へ反映し忘れていたら、ここで変換する
  if (autoTranslate.value && promptJa.value.trim() && promptJa.value !== lastTranslatedJa.value) {
    if (!(await translate())) return
  }
  if (!prompt.value.trim()) {
    errorMsg.value = '英語のプロンプトが空です。日本語を書いて「英語にする」を押すか、英語欄に直接書いてください。'
    return
  }
  prompt.value = withTriggers(prompt.value.trim())

  const seedStr = seedText.value.trim()
  if (seedStr && !/^\d+$/.test(seedStr)) {
    errorMsg.value = 'シードは数字だけで入力してください（空欄ならランダム）'
    return
  }
  params.seed = seedStr ? Number(seedStr) : null

  const body: PaletteGenerateRequest = {
    mode: tab.value,
    promptJa: promptJa.value,
    prompt: prompt.value,
    loras: activeLoras.value.map((a) => ({ path: a.lora.url, scale: a.scale, name: a.lora.name })),
    params: { ...params },
    imageDataUrl: tab.value === 'i2i' ? inputImage.value : undefined,
  }

  busy.value = true
  progressText.value = '送信しています…'
  results.value = []
  resultSeed.value = null
  try {
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
  promptJa.value = h.promptJa
  prompt.value = h.prompt
  lastTranslatedJa.value = h.promptJa // 復元しただけで再翻訳して上書きしない
  const { loras: usedLoras, ...p } = h.params
  Object.assign(params, defaults(), p)
  if (h.mode === 't2i' && params.imageSize === 'auto') params.imageSize = 'landscape_4_3'
  seedText.value = h.seed !== null ? String(h.seed) : ''
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
  await checkAuth()
  if (isLoggedIn.value) await Promise.all([loadLoras(), loadHistory()])
})
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
  border: 2px dashed var(--pl-line);
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
