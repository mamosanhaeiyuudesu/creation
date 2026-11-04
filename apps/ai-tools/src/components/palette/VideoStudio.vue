<template>
  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-start">
    <!-- 左: 記事・設定・シーン -->
    <div class="space-y-4">
      <section class="pl-card">
        <ParamField label="記事" for-id="pl-article" help="動画にしたい記事を貼り付けます。AI が耳で聞いてわかる長さにまとめ直し、絵とナレーションのシーンに分けます（シーンの数は記事に合わせて 3〜20。ふつうは 3〜6）。">
          <textarea id="pl-article" v-model="video.article" rows="7" class="pl-input" placeholder="ここに記事を貼り付け" />
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <select v-model="sceneCount" class="pl-input !w-auto" aria-label="シーンの数">
              <option :value="null">シーンの数: AI におまかせ</option>
              <option v-for="n in sceneCountOptions" :key="n" :value="n">{{ n }} シーン</option>
            </select>
            <button class="pl-btn-ghost" :disabled="planning || running || !video.article.trim()" @click="plan">
              {{ planning ? 'シーンに分けています…' : video.scenes.length ? '✨ シーンを分け直す' : '✨ シーンに分ける' }}
            </button>
            <span class="pl-note">{{ video.article.length.toLocaleString() }} 字</span>
          </div>
        </ParamField>
      </section>

      <template v-if="video.scenes.length">
        <section class="pl-card space-y-4">
          <ParamField label="タイトル" for-id="pl-vtitle" help="下書きの一覧に出す名前です（動画には入りません）。">
            <input id="pl-vtitle" v-model="video.title" class="pl-input" maxlength="120" />
          </ParamField>
          <ParamField label="全シーン共通の設定" for-id="pl-style" help="画風・色・何度も出てくる人物の外見など、どのシーンの絵にも効かせたいことです。各シーンの絵の説明の前に付けて描きます。変えると、全シーンの絵が作り直しの対象になります。">
            <textarea id="pl-style" v-model="video.style" rows="3" class="pl-input" />
          </ParamField>
          <LoraPicker :loras="loras" :selected="selected" help="全シーンに同じ LoRA を使います。変えると、全シーンの絵が作り直しの対象になります。" />
          <div class="grid gap-4 sm:grid-cols-2">
            <ParamField label="読み上げの声" for-id="pl-voice" help="変えると、全シーンの読み上げが作り直しの対象になります。">
              <div class="flex items-center gap-2">
                <select id="pl-voice" v-model="video.voice" class="pl-input">
                  <option v-for="v in PALETTE_VOICES" :key="v" :value="v">{{ v }}</option>
                </select>
                <button class="pl-btn-ghost flex-none" :disabled="sampling" @click="playSample">{{ sampling ? '…' : '▶ 試聴' }}</button>
              </div>
            </ParamField>
            <ParamField label="絵の大きさ" for-id="pl-quality" help="どちらも縦長 9:16。動画は 1080×1920 で書き出します。高画質は 1 枚あたりの料金が約 1.8 倍です。">
              <select id="pl-quality" v-model="video.quality" class="pl-input">
                <option value="standard">標準（864×1536）</option>
                <option value="high">高画質（1152×2048）</option>
              </select>
            </ParamField>
          </div>
        </section>

        <!-- シーン -->
        <section>
          <div class="flex items-center justify-between gap-2 mb-2">
            <h2 class="pl-h2">シーン（{{ video.scenes.length }}）</h2>
            <span class="pl-note">合計 約 {{ Math.round(duration) }} 秒</span>
          </div>
          <ol class="space-y-3">
            <li v-for="(s, i) in video.scenes" :key="s.id" class="pl-card !p-3">
              <div class="flex gap-3">
                <div class="w-[84px] flex-none">
                  <div class="pl-vthumb">
                    <img v-if="s.image" :src="s.image.url" alt="" class="w-full h-full object-cover" />
                    <span v-else class="text-[11px] text-[var(--pl-ink-faint)]">絵なし</span>
                    <span v-if="busyImage[s.id]" class="pl-vthumb-busy pl-pulse">描いています</span>
                  </div>
                  <p class="text-[11px] font-bold text-center mt-1">シーン {{ i + 1 }}</p>
                </div>
                <div class="flex-1 min-w-0 space-y-2">
                  <div>
                    <label class="pl-label" :for="`pl-n-${s.id}`">ナレーション（字幕にもなります）</label>
                    <textarea :id="`pl-n-${s.id}`" v-model="s.narration" rows="2" class="pl-input mt-1" :maxlength="PALETTE_VIDEO_LIMITS.narrationChars" />
                  </div>
                  <div>
                    <label class="pl-label" :for="`pl-s-${s.id}`">絵の説明</label>
                    <textarea :id="`pl-s-${s.id}`" v-model="s.sceneJa" rows="2" class="pl-input mt-1" />
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="pl-chip" :class="{ 'pl-chip--todo': needsImage(s) }">{{ s.image ? (needsImage(s) ? '絵: 古い' : '絵: できた') : '絵: まだ' }}</span>
                    <span class="pl-chip" :class="{ 'pl-chip--todo': needsAudio(s) }">{{ s.audio ? (needsAudio(s) ? '声: 古い' : `声: ${s.audio.duration.toFixed(1)}秒`) : '声: まだ' }}</span>
                    <span class="flex-1" />
                    <button class="pl-btn-text !min-h-[28px] !text-[12px]" :disabled="running || busyImage[s.id]" @click="regenImage(s)">絵を作り直す</button>
                    <button class="pl-btn-text !min-h-[28px] !text-[12px]" :disabled="running || busyAudio[s.id]" @click="regenAudio(s)">声を作り直す</button>
                  </div>
                  <div class="flex items-center gap-1">
                    <button class="pl-btn-text !min-h-[28px] !text-[12px]" :disabled="i === 0" aria-label="上へ" @click="move(i, -1)">↑</button>
                    <button class="pl-btn-text !min-h-[28px] !text-[12px]" :disabled="i === video.scenes.length - 1" aria-label="下へ" @click="move(i, 1)">↓</button>
                    <button class="pl-btn-text !min-h-[28px] !text-[12px]" :disabled="video.scenes.length >= PALETTE_VIDEO_LIMITS.scenes.max" @click="addScene(i)">＋ 下にシーンを足す</button>
                    <span class="flex-1" />
                    <button class="pl-btn-text !min-h-[28px] !text-[12px] !text-[var(--pl-danger)]" :disabled="video.scenes.length <= 1" @click="removeScene(i)">削除</button>
                  </div>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <div class="flex flex-wrap items-center gap-3">
          <button class="pl-btn" :disabled="running || !todoCount" @click="runAll">
            {{ running ? progressText || '作っています…' : todoCount ? `まとめて作る（残り ${todoCount}）` : 'すべてできています' }}
          </button>
          <p class="pl-note flex-1 min-w-[180px]">絵が無い・古いシーンの絵と、読み上げが無い・古いシーンの声だけを作ります。{{ costText }}</p>
        </div>
      </template>
      <p v-if="errorMsg" class="pl-notice pl-notice--error" role="alert">{{ errorMsg }}</p>
    </div>

    <!-- 右: プレビュー・書き出し・下書き -->
    <div class="space-y-6 lg:sticky lg:top-4">
      <section>
        <h2 class="pl-h2 mb-2">プレビュー</h2>
        <div class="pl-card !p-2">
          <canvas ref="previewCanvas" :width="VIDEO_WIDTH" :height="VIDEO_HEIGHT" class="pl-vcanvas" />
          <div class="mt-2 flex items-center gap-2">
            <button class="pl-btn-ghost flex-none !w-[64px]" :disabled="!video.scenes.length || exporting" @click="togglePlay">{{ playing ? '❚❚' : '▶' }}</button>
            <input v-model.number="currentTime" type="range" min="0" :max="duration" step="0.05" class="flex-1 accent-[var(--pl-teal)]" aria-label="再生位置" @input="seek" />
            <span class="pl-note tabular-nums flex-none">{{ fmtTime(currentTime) }} / {{ fmtTime(duration) }}</span>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button class="pl-btn-ghost" :disabled="!video.scenes.length || exporting || running" @click="exportVideo">
            {{ exporting ? `書き出し中… ${Math.round(exportProgress * 100)}%` : '🎬 MP4 に書き出す' }}
          </button>
          <template v-if="exported">
            <a :href="exported.url" :download="exported.name" class="pl-btn-ghost">保存する</a>
            <button v-if="canShare" class="pl-btn-ghost" @click="shareVideo">共有（インスタへ）</button>
          </template>
          <button class="pl-btn-ghost" :disabled="!video.scenes.some((s) => s.image)" @click="downloadImages">絵をまとめて保存</button>
        </div>
        <p class="pl-note mt-2">
          縦 1080×1920・30fps の MP4（H.264＋AAC）で、そのままリールに上げられます。BGM は、投稿するときにインスタのアプリで足してください（インスタの音楽なら著作権の心配がありません）。絵をまとめて保存すれば、カルーセル投稿（20 枚まで）にも使えます。
        </p>
      </section>

      <section>
        <div class="flex items-center justify-between gap-2 mb-2">
          <h2 class="pl-h2">下書き</h2>
          <button class="pl-btn-ghost" :disabled="running || exporting" @click="newVideo">＋ 新しい動画</button>
        </div>
        <p v-if="!drafts.length" class="pl-note">まだ下書きがありません。シーンに分けると、ここに自動で保存されます。</p>
        <ul v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          <li v-for="d in drafts" :key="d.id" class="pl-card !p-1.5" :class="{ '!border-[var(--pl-teal)]': d.id === video.id }">
            <button class="block w-full text-left" :disabled="running || exporting" @click="openDraft(d.id)">
              <div class="pl-vthumb">
                <img v-if="d.thumbUrl" :src="d.thumbUrl" alt="" loading="lazy" class="w-full h-full object-cover" />
              </div>
              <p class="text-[11.5px] mt-1.5 line-clamp-2 text-[var(--pl-ink-soft)]">{{ d.title || '（無題）' }}</p>
            </button>
            <div class="flex items-center justify-between mt-1">
              <span class="pl-chip !text-[10.5px] !py-0">{{ d.sceneCount }} シーン</span>
              <button class="text-[11px] text-[var(--pl-ink-soft)] underline" :disabled="running || exporting" @click="removeDraft(d)">削除</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ParamField from '~/components/palette/ParamField.vue'
import LoraPicker from '~/components/palette/LoraPicker.vue'
import { PALETTE_VIDEO_LIMITS, PALETTE_VIDEO_SIZES, PALETTE_VOICES } from '~/types/palette'
import { buildTimeline, estimateSpeechSec, splitSubtitle, VIDEO_HEIGHT, VIDEO_WIDTH } from '~/utils/palette-video'
import type {
  PaletteGenerateRequest,
  PaletteLora,
  PaletteStatusResponse,
  PaletteVideo,
  PaletteVideoPlan,
  PaletteVideoScene,
  PaletteVideoSummary,
} from '~/types/palette'
import type { RenderScene } from '~/utils/palette-video-render'

const props = defineProps<{
  loras: PaletteLora[]
  selected: Record<string, { on: boolean; scale: number }>
}>()
const emit = defineEmits<{ (e: 'generated'): void }>()

// 描画・書き出しはブラウザ専用（mediabunny も中で動的 import する）
const render = () => import('~/utils/palette-video-render')

const blank = (): PaletteVideo => ({
  id: crypto.randomUUID(),
  title: '',
  article: '',
  style: '',
  voice: 'coral',
  quality: 'standard',
  loras: [],
  scenes: [],
  createdAt: '',
  updatedAt: '',
})
const video = reactive<PaletteVideo>(blank())
/** 一度でも保存した（＝D1 に行がある）か。読み上げの保存より先に行が要る */
const saved = ref(false)
const drafts = ref<PaletteVideoSummary[]>([])
const errorMsg = ref('')

const sceneCount = ref<number | null>(null)
const sceneCountOptions = Array.from(
  { length: PALETTE_VIDEO_LIMITS.scenes.max - PALETTE_VIDEO_LIMITS.scenes.min + 1 },
  (_, i) => PALETTE_VIDEO_LIMITS.scenes.min + i
)

function errText(e: any): string {
  return e?.data?.message || e?.data?.statusMessage || e?.statusMessage || e?.message || '不明なエラー'
}

// ── LoRA（ページと共有の選択）──────────────────────────────
const activeLoras = computed(() =>
  props.loras
    .filter((l) => props.selected[l.id]?.on)
    .map((l) => ({ lora: l, scale: Number(props.selected[l.id]!.scale) }))
)
const loraUses = computed(() => activeLoras.value.map((a) => ({ path: a.lora.url, scale: a.scale, name: a.lora.name })))

/** 下書きを開いたとき、その動画で使った LoRA を選び直す */
function applyLoraSelection(uses: PaletteVideo['loras']) {
  for (const id of Object.keys(props.selected)) props.selected[id]!.on = false
  for (const u of uses) {
    const l = props.loras.find((x) => x.url === u.path)
    if (l && props.selected[l.id]) Object.assign(props.selected[l.id]!, { on: true, scale: u.scale })
  }
}

// ── 作り直しの判定 ──────────────────────────────
function imageKey(s: PaletteVideoScene): string {
  return JSON.stringify([video.style, s.sceneJa, video.quality, loraUses.value.map((l) => [l.path, l.scale])])
}
const needsImage = (s: PaletteVideoScene) => !!s.sceneJa.trim() && (!s.image || s.image.key !== imageKey(s))
const needsAudio = (s: PaletteVideoScene) =>
  !!s.narration.trim() && (!s.audio || s.audio.text !== s.narration || s.audio.voice !== video.voice)
const todoCount = computed(() => video.scenes.reduce((n, s) => n + (needsImage(s) ? 1 : 0) + (needsAudio(s) ? 1 : 0), 0))
const costText = computed(() => {
  const imgs = video.scenes.filter(needsImage).length
  if (!imgs) return ''
  const { width, height } = PALETTE_VIDEO_SIZES[video.quality]
  // fal の flux-lora は 1 メガピクセルあたり約 $0.035（目安。正確な単価は fal の料金ページ）
  const usd = imgs * ((width * height) / 1_000_000) * 0.035
  return `絵 ${imgs} 枚で約 $${usd.toFixed(2)}（目安）。`
})

// ── 保存（変更から少し待って、1本ずつ順に送る）──────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
let saveChain: Promise<unknown> = Promise.resolve()
let suppressWatch = false

function payload() {
  return {
    title: video.title,
    article: video.article,
    style: video.style,
    voice: video.voice,
    quality: video.quality,
    loras: video.loras,
    scenes: video.scenes,
  }
}

function saveNow(): Promise<unknown> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const id = video.id
  const body = JSON.parse(JSON.stringify(payload()))
  saveChain = saveChain
    .catch(() => {})
    .then(async () => {
      await $fetch(`/api/palette/videos/${id}`, { method: 'PUT', body })
      saved.value = true
      loadDrafts()
    })
  return saveChain
}

watch(
  () => JSON.stringify(payload()),
  () => {
    if (suppressWatch || !video.scenes.length) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveNow().catch((e) => (errorMsg.value = '保存できませんでした: ' + errText(e))), 1200)
  }
)

async function loadDrafts() {
  try {
    drafts.value = await $fetch<PaletteVideoSummary[]>('/api/palette/videos')
  } catch {
    drafts.value = []
  }
}

function replaceVideo(v: PaletteVideo, isSaved: boolean) {
  suppressWatch = true
  Object.assign(video, v)
  saved.value = isSaved
  exported.value = null
  stop()
  // watch の発火（次の tick）が済んでから戻す
  setTimeout(() => (suppressWatch = false), 0)
  refreshAssets()
}

async function openDraft(id: string) {
  errorMsg.value = ''
  if (saveTimer) await saveNow().catch(() => {})
  try {
    const v = await $fetch<PaletteVideo>(`/api/palette/videos/${id}`)
    replaceVideo(v, true)
    applyLoraSelection(v.loras)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    errorMsg.value = '開けませんでした: ' + errText(e)
  }
}

async function newVideo() {
  if (saveTimer) await saveNow().catch(() => {})
  replaceVideo(blank(), false)
}

async function removeDraft(d: PaletteVideoSummary) {
  if (!confirm(`「${d.title || '（無題）'}」を削除しますか？`)) return
  await $fetch(`/api/palette/videos/${d.id}`, { method: 'DELETE' }).catch(() => {})
  if (d.id === video.id) replaceVideo(blank(), false)
  await loadDrafts()
}

// ── シーンに分ける ──────────────────────────────
const planning = ref(false)

async function plan() {
  errorMsg.value = ''
  if (video.scenes.length && !confirm('今のシーン（作った絵と声も）を置き換えます。よろしいですか？')) return
  planning.value = true
  try {
    const r = await $fetch<PaletteVideoPlan>('/api/palette/video/plan', {
      method: 'POST',
      body: { article: video.article, sceneCount: sceneCount.value },
    })
    video.title = r.title || video.title
    video.style = r.style
    video.scenes = r.scenes.map((s) => ({ id: crypto.randomUUID(), narration: s.narration, sceneJa: s.sceneJa, image: null, audio: null }))
    await saveNow()
    refreshAssets()
  } catch (e) {
    errorMsg.value = 'シーンに分けられませんでした: ' + errText(e)
  } finally {
    planning.value = false
  }
}

// ── シーンの操作 ──────────────────────────────
function move(i: number, d: number) {
  const s = video.scenes.splice(i, 1)[0]!
  video.scenes.splice(i + d, 0, s)
  refreshAssets()
}
function addScene(i: number) {
  video.scenes.splice(i + 1, 0, { id: crypto.randomUUID(), narration: '', sceneJa: '', image: null, audio: null })
  refreshAssets()
}
function removeScene(i: number) {
  if (!confirm(`シーン ${i + 1} を削除しますか？`)) return
  video.scenes.splice(i, 1)
  refreshAssets()
}

// ── 生成 ──────────────────────────────
const running = ref(false)
const progressText = ref('')
const busyImage = reactive<Record<string, boolean>>({})
const busyAudio = reactive<Record<string, boolean>>({})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const POLL_MS = 2500
const POLL_TIMEOUT_MS = 8 * 60 * 1000

function withTriggers(p: string): string {
  const lower = p.toLowerCase()
  const missing = activeLoras.value.map((a) => a.lora.triggerWord.trim()).filter((t) => t && !lower.includes(t.toLowerCase()))
  return missing.length ? `${missing.join(', ')}, ${p}` : p
}

async function makeImage(s: PaletteVideoScene) {
  busyImage[s.id] = true
  try {
    const key = imageKey(s)
    const triggers = activeLoras.value.map((a) => a.lora.triggerWord.trim()).filter(Boolean)
    const text = [video.style, s.sceneJa].filter(Boolean).join('\n').slice(0, 2000)
    const { prompt } = await $fetch<{ prompt: string }>('/api/palette/translate', { method: 'POST', body: { text, triggers } })
    const { width, height } = PALETTE_VIDEO_SIZES[video.quality]
    const body: PaletteGenerateRequest = {
      mode: 't2i',
      promptJa: text,
      prompt: withTriggers(prompt),
      loras: loraUses.value,
      params: {
        imageSize: 'custom',
        width,
        height,
        steps: 28,
        guidance: 3.5,
        numImages: 1,
        seed: null,
        format: 'jpeg',
        safety: true,
        acceleration: 'none',
        strength: 0.85,
      },
      videoId: video.id,
    }
    const { id } = await $fetch<{ id: string }>('/api/palette/generate', { method: 'POST', body })
    const started = Date.now()
    while (true) {
      await sleep(POLL_MS)
      const st = await $fetch<PaletteStatusResponse>('/api/palette/status', { query: { id } })
      if (st.status === 'COMPLETED' && st.generation?.images[0]) {
        const img = st.generation.images[0]
        s.image = { generationId: id, url: img.url, seed: st.generation.seed, key }
        video.loras = loraUses.value
        break
      }
      if (st.status === 'FAILED') throw new Error(st.error || '絵を作れませんでした')
      if (Date.now() - started > POLL_TIMEOUT_MS) throw new Error('時間がかかりすぎています')
    }
  } finally {
    busyImage[s.id] = false
  }
}

async function makeAudio(s: PaletteVideoScene) {
  busyAudio[s.id] = true
  try {
    if (!saved.value) await saveNow()
    const text = s.narration
    const voice = video.voice
    const { id } = await $fetch<{ id: string }>('/api/palette/video/speech', { method: 'POST', body: { text, voice, videoId: video.id } })
    const { loadAudio } = await render()
    const buf = await loadAudio(id)
    s.audio = { id, text, voice, duration: Math.round(buf.duration * 100) / 100 }
  } finally {
    busyAudio[s.id] = false
  }
}

/** 仕事を同時に n 本ずつ流す。1本が失敗しても他は続け、最後に失敗の理由の一覧を返す。 */
async function pool(jobs: (() => Promise<void>)[], n: number, onDone: () => void): Promise<string[]> {
  const errors: string[] = []
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!
      try {
        await job()
      } catch (e) {
        errors.push(errText(e))
      }
      onDone()
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, worker))
  return errors
}

async function runJobs(jobs: (() => Promise<void>)[]) {
  errorMsg.value = ''
  running.value = true
  exported.value = null
  let done = 0
  progressText.value = `作っています… 0 / ${jobs.length}`
  try {
    if (!saved.value) await saveNow()
    const errors = await pool(jobs, 3, () => {
      done++
      progressText.value = `作っています… ${done} / ${jobs.length}`
    })
    await saveNow()
    if (errors.length) errorMsg.value = `${errors.length} 件作れませんでした: ${[...new Set(errors)].join(' / ')}`
  } catch (e) {
    errorMsg.value = '作れませんでした: ' + errText(e)
  } finally {
    running.value = false
    progressText.value = ''
    emit('generated')
    refreshAssets()
  }
}

function runAll() {
  const jobs: (() => Promise<void>)[] = []
  for (const s of video.scenes) {
    if (needsImage(s)) jobs.push(() => makeImage(s))
    if (needsAudio(s)) jobs.push(() => makeAudio(s))
  }
  if (jobs.length) runJobs(jobs)
}
const regenImage = (s: PaletteVideoScene) => runJobs([() => makeImage(s)])
const regenAudio = (s: PaletteVideoScene) => runJobs([() => makeAudio(s)])

// ── 声の試聴 ──────────────────────────────
const sampling = ref(false)
async function playSample() {
  const { getAudioContext } = await render()
  const ctx = getAudioContext() // iOS はクリックの直後に作る
  sampling.value = true
  try {
    const mp3 = await $fetch<ArrayBuffer>('/api/palette/video/speech', {
      method: 'POST',
      body: { voice: video.voice },
      responseType: 'arrayBuffer',
    })
    const buf = await ctx.decodeAudioData(mp3)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  } catch (e) {
    errorMsg.value = '試聴できませんでした: ' + errText(e)
  } finally {
    sampling.value = false
  }
}

// ── プレビュー ──────────────────────────────
const previewCanvas = ref<HTMLCanvasElement | null>(null)
// shallowRef にすること。ref だと中の HTMLImageElement / AudioBuffer が Vue のプロキシに包まれ、
// drawImage や AudioBufferSourceNode.buffer が受け付けない
const images = shallowRef<(HTMLImageElement | null)[]>([])
const buffers = shallowRef<(AudioBuffer | null)[]>([])

/** シーンの長さ＝作った読み上げの長さ（まだ無い・古いときは字数からの見積もり） */
const timelineData = computed(() =>
  buildTimeline(
    video.scenes.map((s) => (s.audio && !needsAudio(s) ? s.audio.duration : estimateSpeechSec(s.narration)))
  )
)
const duration = computed(() => timelineData.value.duration)
/** 絵と声を読み込んでいる途中か（そのあいだは「絵がまだありません」ではなく読み込み中と描く） */
const assetsLoading = ref(false)
const renderScenes = computed<RenderScene[]>(() =>
  video.scenes.map((s, i) => ({
    image: images.value[i] ?? null,
    loading: !!s.image && !images.value[i] && assetsLoading.value,
    subtitles: splitSubtitle(s.narration),
  }))
)

let refreshSeq = 0
/** シーンの絵と声を読み込み直す（並べ替え・作り直しのあと）。読み込めたものから描き直す。 */
async function refreshAssets() {
  const seq = ++refreshSeq
  assetsLoading.value = true
  const { loadImage, loadAudio, loadSubtitleFont } = await render()
  const scenes = [...video.scenes]
  const [imgs, auds] = await Promise.all([
    Promise.all(scenes.map((s) => (s.image ? loadImage(s.image.url).catch(() => null) : null))),
    Promise.all(scenes.map((s) => (s.audio && !needsAudio(s) ? loadAudio(s.audio.id).catch(() => null) : null))),
    loadSubtitleFont(scenes.map((s) => s.narration).join('')),
  ])
  if (seq !== refreshSeq) return
  images.value = imgs
  buffers.value = auds
  assetsLoading.value = false
  draw()
}

const currentTime = ref(0)
const playing = ref(false)
let raf = 0
let source: AudioBufferSourceNode | null = null
let startedAt = 0
let startOffset = 0

async function draw() {
  const ctx = previewCanvas.value?.getContext('2d')
  if (!ctx) return
  const { drawFrame } = await render()
  drawFrame(ctx, renderScenes.value, timelineData.value.scenes, currentTime.value)
}

function stop() {
  if (source) {
    source.onended = null
    source.stop()
    source.disconnect()
    source = null
  }
  cancelAnimationFrame(raf)
  playing.value = false
}

async function togglePlay() {
  if (playing.value) return stop()
  const { getAudioContext, mixAudio, drawFrame } = await render()
  const ctx = getAudioContext()
  if (currentTime.value >= duration.value - 0.05) currentTime.value = 0
  const mixed = await mixAudio(timelineData.value.scenes, buffers.value, duration.value)
  source = ctx.createBufferSource()
  source.buffer = mixed
  source.connect(ctx.destination)
  startOffset = currentTime.value
  startedAt = ctx.currentTime
  source.start(0, startOffset)
  source.onended = () => stop()
  playing.value = true
  const canvasCtx = previewCanvas.value?.getContext('2d')
  const tick = () => {
    currentTime.value = Math.min(duration.value, startOffset + (ctx.currentTime - startedAt))
    if (canvasCtx) drawFrame(canvasCtx, renderScenes.value, timelineData.value.scenes, currentTime.value)
    if (playing.value) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

function seek() {
  if (playing.value) stop()
  draw()
}

// 文の書き換えなどで字幕・長さが変わったら止まっている絵を描き直す
watch([renderScenes, timelineData], () => {
  if (!playing.value) draw()
})

const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

// ── 書き出し ──────────────────────────────
const exporting = ref(false)
const exportProgress = ref(0)
const exported = ref<{ url: string; name: string; blob: Blob } | null>(null)
const canShare = ref(false)

watch(exported, (_, old) => {
  if (old) URL.revokeObjectURL(old.url)
})

async function exportVideo() {
  errorMsg.value = ''
  stop()
  const missing = video.scenes.filter((s) => !s.image || needsImage(s) || !s.audio || needsAudio(s)).length
  if (missing && !confirm(`${missing} シーンの絵か声が、まだ無いか古いままです。このまま書き出しますか？`)) return
  exporting.value = true
  exportProgress.value = 0
  try {
    await refreshAssets()
    const { mixAudio, exportMp4 } = await render()
    const mixed = await mixAudio(timelineData.value.scenes, buffers.value, duration.value)
    const blob = await exportMp4(renderScenes.value, timelineData.value.scenes, duration.value, mixed, (p) => (exportProgress.value = p))
    const name = `${(video.title || 'palette-video').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40)}.mp4`
    exported.value = { url: URL.createObjectURL(blob), name, blob }
    canShare.value = !!navigator.canShare?.({ files: [new File([blob], name, { type: 'video/mp4' })] })
  } catch (e) {
    errorMsg.value = '書き出せませんでした: ' + errText(e)
  } finally {
    exporting.value = false
  }
}

async function shareVideo() {
  if (!exported.value) return
  const file = new File([exported.value.blob], exported.value.name, { type: 'video/mp4' })
  await navigator.share({ files: [file], title: video.title }).catch(() => {})
}

async function downloadImages() {
  for (const [i, s] of video.scenes.entries()) {
    if (!s.image) continue
    try {
      const blob = await (await fetch(s.image.url)).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(video.title || 'palette-video').slice(0, 30)}-${String(i + 1).padStart(2, '0')}.jpg`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      await sleep(300) // まとめてダウンロードするとブラウザに止められることがあるので少し間をあける
    } catch {
      window.open(s.image.url, '_blank', 'noopener')
    }
  }
}

onMounted(() => {
  loadDrafts()
  draw()
})
onBeforeUnmount(() => {
  stop()
  if (saveTimer) saveNow().catch(() => {})
  if (exported.value) URL.revokeObjectURL(exported.value.url)
})
</script>

<style scoped>
.pl-vthumb {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  border-radius: 6px;
  overflow: hidden;
  background: var(--pl-paper-2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pl-vthumb-busy {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(42, 39, 35, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.pl-vcanvas {
  display: block;
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
  aspect-ratio: 9 / 16;
  height: auto;
  border-radius: 8px;
  background: #000;
}
.pl-chip--todo {
  border-color: var(--pl-mustard);
  background: #fdf6e3;
  color: #7a5a00;
}
</style>
