<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-5 pt-5 pb-24">
    <div class="flex items-center justify-between pb-3">
      <NuxtLink to="/kaki/admin" class="text-[13px] font-bold text-[var(--kaki-ink-soft)] hover:text-[var(--kaki-ink)]">‹ 一覧に戻る</NuxtLink>
      <NuxtLink v-if="detail" :to="`/kaki/${detail.tree.id}`" class="text-[13px] font-bold text-[var(--kaki-persimmon-deep)]">里親ページを見る →</NuxtLink>
    </div>

    <div v-if="loading" class="h-64 rounded-2xl bg-[var(--kaki-paper-2)]/70 animate-pulse" />
    <p v-else-if="error" class="text-center text-[var(--kaki-clay)] py-16">{{ error }}</p>

    <div v-else-if="detail" class="space-y-6">
      <h1 class="kaki-display text-[24px] font-bold">No.{{ form.number }} {{ form.nickname || '（愛称なし）' }} を編集</h1>

      <!-- ── 基本情報 ── -->
      <section class="card">
        <p class="eyebrow"><span>🌳</span> きほん情報</p>
        <div class="grid grid-cols-2 gap-3">
          <label class="field"><span>番号</span><input v-model.number="form.number" type="number" class="inp" /></label>
          <label class="field"><span>愛称</span><input v-model="form.nickname" type="text" class="inp" /></label>
          <label class="field"><span>植えた年</span><input v-model.number="form.plantedYear" type="number" placeholder="2015" class="inp" /></label>
          <label class="field"><span>状態</span>
            <select v-model="form.status" class="inp">
              <option value="healthy">元気</option>
              <option value="watching">見守り中</option>
              <option value="sick">療養中</option>
            </select>
          </label>
          <label class="field col-span-2"><span>畑の場所メモ（里親には非表示）</span><input v-model="form.locationNote" type="text" class="inp" /></label>
          <label class="field col-span-2"><span>里親</span>
            <select v-model="form.fosterUserId" class="inp">
              <option :value="null">未割当</option>
              <option v-for="f in fosters" :key="f.id" :value="f.id">{{ f.username }}</option>
            </select>
          </label>
        </div>
      </section>

      <!-- ── いいところ / 困ったところ ── -->
      <section class="card">
        <p class="eyebrow"><span>🫶</span> いいところ・困ったところ</p>
        <div class="grid sm:grid-cols-2 gap-4">
          <ChipEditor v-model="form.strengths" label="いいところ" tone="leaf" placeholder="日当たりが良い" />
          <ChipEditor v-model="form.weaknesses" label="困ったところ" tone="persimmon" placeholder="毎年病気になる" />
        </div>
      </section>

      <!-- ── 紹介文 ── -->
      <section class="card">
        <div class="flex items-center justify-between mb-2">
          <p class="eyebrow !mb-0"><span>📖</span> この子の紹介文</p>
          <button class="ai-btn" :disabled="aiBusy.personality" @click="genPersonality">{{ aiBusy.personality ? '生成中…' : '✨ AIで生成' }}</button>
        </div>
        <textarea v-model="form.personality" rows="4" class="inp w-full" placeholder="いいところ・困ったところを入れてからAI生成すると、愛嬌ある紹介文になります。" />
      </section>

      <div class="flex items-center gap-3">
        <button class="save-btn" :disabled="saving" @click="saveTree">{{ saving ? '保存中…' : '基本情報を保存' }}</button>
        <span v-if="savedMsg" class="text-[13px] text-[var(--kaki-leaf)] font-bold">{{ savedMsg }}</span>
      </div>

      <!-- ── 観察記録の投稿 ── -->
      <section class="card !bg-[color-mix(in_srgb,var(--kaki-persimmon)_6%,var(--kaki-card))]">
        <p class="eyebrow"><span>📷</span> 観察記録を投稿</p>

        <!-- 写真 -->
        <div class="mb-3">
          <div v-if="obs.photoUrl" class="relative rounded-xl overflow-hidden mb-2">
            <img :src="obs.photoUrl" alt="プレビュー" class="w-full max-h-72 object-cover" />
            <button class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-sm" @click="obs.photoUrl = null">×</button>
          </div>
          <label class="inline-flex items-center gap-2 text-[13px] font-bold text-[var(--kaki-persimmon-deep)] cursor-pointer">
            <span class="px-3 py-2 rounded-full border border-[var(--kaki-line)] bg-[var(--kaki-card)]">🖼️ 写真を選ぶ</span>
            <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPhoto" />
          </label>
          <span v-if="photoBusy" class="ml-2 text-[12px] text-[var(--kaki-ink-soft)]">読み込み中…</span>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="field"><span>観察日</span><input v-model="obs.observedAt" type="date" class="inp" /></label>
          <label class="field"><span>実のサイズ (mm)</span><input v-model.number="obs.fruitSizeMm" type="number" placeholder="任意" class="inp" /></label>
        </div>

        <!-- メモ（音声/文字） -->
        <div class="field mb-3">
          <div class="flex items-center justify-between">
            <span>メモ（専門用語のままでOK）</span>
            <button v-if="speechSupported" class="ai-btn" :class="{ '!bg-[var(--kaki-clay)]': listening }" @click="toggleVoice">{{ listening ? '● 録音中' : '🎤 音声入力' }}</button>
          </div>
          <textarea v-model="obs.rawNote" rows="3" class="inp w-full" placeholder="例: 落葉病が出はじめた。実は順調。" />
        </div>

        <button class="ai-btn !w-full !py-2.5 mb-3" :disabled="aiBusy.obs || !obs.rawNote.trim()" @click="transformObs">
          {{ aiBusy.obs ? 'AI変換中…' : '✨ AIで里親向けに変換' }}
        </button>

        <div v-if="obs.aiStory || obs.aiTreeVoice" class="rounded-xl bg-[var(--kaki-card)] border border-[var(--kaki-line)] p-3 mb-3 space-y-2">
          <div>
            <p class="text-[11px] font-bold text-[var(--kaki-ink-soft)] mb-1">観察日記（ai_story）</p>
            <textarea v-model="obs.aiStory" rows="3" class="inp w-full text-[13px]" />
          </div>
          <div>
            <p class="text-[11px] font-bold text-[var(--kaki-ink-soft)] mb-1">今日のひとこと（ai_tree_voice）</p>
            <input v-model="obs.aiTreeVoice" type="text" class="inp w-full text-[13px]" />
          </div>
        </div>

        <button class="save-btn !w-full" :disabled="savingObs || (!obs.photoUrl && !obs.rawNote.trim())" @click="saveObs">
          {{ savingObs ? '投稿中…' : '記録を投稿する' }}
        </button>
      </section>

      <!-- 既存の観察記録 -->
      <section v-if="detail.observations.length" class="card">
        <p class="eyebrow"><span>🗂️</span> これまでの記録（{{ detail.observations.length }}件）</p>
        <ul class="space-y-2">
          <li v-for="o in [...detail.observations].reverse()" :key="o.id" class="flex gap-3 items-start text-[13px]">
            <img v-if="o.photoUrl" :src="o.photoUrl" alt="" class="w-12 h-12 rounded-lg object-cover shrink-0" />
            <div v-else class="w-12 h-12 rounded-lg bg-[var(--kaki-paper-2)] shrink-0 flex items-center justify-center">📝</div>
            <div class="min-w-0">
              <p class="font-bold text-[var(--kaki-ink-soft)]">{{ formatDate(o.observedAt) }}</p>
              <p class="text-[var(--kaki-ink)] line-clamp-2">{{ o.aiStory || o.rawNote || '（写真のみ）' }}</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- ── 病歴・できごと ── -->
      <section class="card">
        <p class="eyebrow"><span>🗒️</span> 病歴・できごと</p>
        <ul v-if="detail.healthEvents.length" class="space-y-2 mb-4">
          <li v-for="h in detail.healthEvents" :key="h.id" class="flex gap-2.5 text-[13px]">
            <span class="font-bold text-[var(--kaki-persimmon-deep)] w-12 shrink-0">{{ h.year }}年</span>
            <span class="text-[var(--kaki-ink)]">{{ h.aiLabel || h.rawLabel }}</span>
          </li>
        </ul>
        <div class="grid grid-cols-[80px_1fr] gap-2 mb-2">
          <input v-model.number="hev.year" type="number" placeholder="2025" class="inp" />
          <select v-model="hev.eventType" class="inp">
            <option value="disease">病気</option>
            <option value="pest">虫</option>
            <option value="weather">天気</option>
            <option value="recovery">回復</option>
            <option value="harvest">収穫</option>
          </select>
        </div>
        <input v-model="hev.rawLabel" type="text" placeholder="病名・できごと（例: 落葉病）" class="inp w-full mb-2" />
        <div class="flex gap-2 mb-2">
          <button class="ai-btn flex-1" :disabled="aiBusy.health || !hev.rawLabel.trim()" @click="transformHealth">{{ aiBusy.health ? '変換中…' : '✨ AI変換' }}</button>
          <button class="save-btn flex-1" :disabled="savingHev || !hev.rawLabel.trim()" @click="saveHev">{{ savingHev ? '追加中…' : '追加' }}</button>
        </div>
        <div v-if="hev.aiLabel" class="rounded-xl bg-[var(--kaki-card)] border border-[var(--kaki-line)] p-2.5 text-[13px]">
          <p class="font-bold">{{ hev.aiLabel }}</p>
          <p class="text-[var(--kaki-ink-soft)]">{{ hev.aiDescription }}</p>
        </div>
      </section>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useKakiImage } from '~/composables/useKakiImage'
import AuthModal from '~/components/AuthModal.vue'
import ChipEditor from '~/components/kaki/ChipEditor.vue'
import type { KakiMe, TreeDetail, Foster, TreeStatus, Observation, HealthEvent, HealthEventType } from '~/types/kaki'

definePageMeta({ layout: 'kaki' })
useHead({ title: '木の編集 | 柿の木のいえ' })

const isDev = import.meta.dev
const route = useRoute()
const router = useRouter()
const { isLoggedIn, checked, checkAuth } = useAuth()
const { fileToDataUrl } = useKakiImage()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)

const detail = ref<TreeDetail | null>(null)
const fosters = ref<Foster[]>([])
const loading = ref(true)
const error = ref('')

const form = reactive({
  number: 0,
  nickname: '',
  plantedYear: null as number | null,
  status: 'healthy' as TreeStatus,
  locationNote: '',
  fosterUserId: null as string | null,
  strengths: [] as string[],
  weaknesses: [] as string[],
  personality: '',
})

function todayStr(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

const obs = reactive({
  observedAt: todayStr(),
  photoUrl: null as string | null,
  rawNote: '',
  aiStory: '',
  aiTreeVoice: '',
  fruitSizeMm: null as number | null,
})

const hev = reactive({
  year: new Date().getFullYear(),
  eventType: 'disease' as HealthEventType,
  rawLabel: '',
  aiLabel: '',
  aiDescription: '',
})

const aiBusy = reactive({ personality: false, obs: false, health: false })
const saving = ref(false)
const savingObs = ref(false)
const savingHev = ref(false)
const photoBusy = ref(false)
const savedMsg = ref('')

function fillForm(d: TreeDetail) {
  const t = d.tree
  form.number = t.number
  form.nickname = t.nickname
  form.plantedYear = t.plantedYear
  form.status = t.status
  form.locationNote = t.locationNote
  form.fosterUserId = t.fosterUserId
  form.strengths = [...t.strengths]
  form.weaknesses = [...t.weaknesses]
  form.personality = t.personality
}

async function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  photoBusy.value = true
  try {
    obs.photoUrl = await fileToDataUrl(file)
  } catch (err: any) {
    alert(err?.message || '画像の読み込みに失敗しました')
  } finally {
    photoBusy.value = false
  }
}

async function saveTree() {
  saving.value = true
  savedMsg.value = ''
  try {
    await $fetch(`/api/kaki/trees/${route.params.id}`, { method: 'PATCH', body: { ...form } })
    savedMsg.value = '保存しました'
    setTimeout(() => (savedMsg.value = ''), 2500)
  } catch (e: any) {
    alert(e?.data?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

async function genPersonality() {
  aiBusy.personality = true
  try {
    const r = await $fetch<{ personality: string }>('/api/kaki/ai-transform', {
      method: 'POST',
      body: { type: 'personality', nickname: form.nickname, strengths: form.strengths, weaknesses: form.weaknesses, plantedYear: form.plantedYear },
    })
    form.personality = r.personality
  } catch (e: any) {
    alert(e?.data?.message || 'AI生成に失敗しました')
  } finally {
    aiBusy.personality = false
  }
}

async function transformObs() {
  aiBusy.obs = true
  try {
    const r = await $fetch<{ aiStory: string; aiTreeVoice: string }>('/api/kaki/ai-transform', {
      method: 'POST',
      body: { type: 'observation', rawNote: obs.rawNote },
    })
    obs.aiStory = r.aiStory
    obs.aiTreeVoice = r.aiTreeVoice
  } catch (e: any) {
    alert(e?.data?.message || 'AI変換に失敗しました')
  } finally {
    aiBusy.obs = false
  }
}

async function saveObs() {
  savingObs.value = true
  try {
    const created = await $fetch<Observation>('/api/kaki/observations', {
      method: 'POST',
      body: {
        treeId: route.params.id,
        observedAt: obs.observedAt,
        photoUrl: obs.photoUrl,
        rawNote: obs.rawNote,
        aiStory: obs.aiStory,
        aiTreeVoice: obs.aiTreeVoice,
        fruitSizeMm: obs.fruitSizeMm,
      },
    })
    detail.value?.observations.push({ ...created, rawNote: obs.rawNote })
    Object.assign(obs, { observedAt: todayStr(), photoUrl: null, rawNote: '', aiStory: '', aiTreeVoice: '', fruitSizeMm: null })
  } catch (e: any) {
    alert(e?.data?.message || '投稿に失敗しました')
  } finally {
    savingObs.value = false
  }
}

async function transformHealth() {
  aiBusy.health = true
  try {
    const r = await $fetch<{ aiLabel: string; aiDescription: string }>('/api/kaki/ai-transform', {
      method: 'POST',
      body: { type: 'health', rawLabel: hev.rawLabel },
    })
    hev.aiLabel = r.aiLabel
    hev.aiDescription = r.aiDescription
  } catch (e: any) {
    alert(e?.data?.message || 'AI変換に失敗しました')
  } finally {
    aiBusy.health = false
  }
}

async function saveHev() {
  savingHev.value = true
  try {
    const created = await $fetch<HealthEvent>('/api/kaki/health-events', {
      method: 'POST',
      body: { treeId: route.params.id, year: hev.year, eventType: hev.eventType, rawLabel: hev.rawLabel, aiLabel: hev.aiLabel, aiDescription: hev.aiDescription },
    })
    detail.value?.healthEvents.push(created)
    detail.value?.healthEvents.sort((a, b) => a.year - b.year)
    Object.assign(hev, { rawLabel: '', aiLabel: '', aiDescription: '' })
  } catch (e: any) {
    alert(e?.data?.message || '追加に失敗しました')
  } finally {
    savingHev.value = false
  }
}

// ── 音声入力（Web Speech API・対応ブラウザのみ） ──
const listening = ref(false)
let recognition: any = null
const speechSupported = computed(() => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
function toggleVoice() {
  if (listening.value) { recognition?.stop(); return }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return
  recognition = new SR()
  recognition.lang = 'ja-JP'
  recognition.interimResults = false
  recognition.continuous = true
  recognition.onresult = (ev: any) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) obs.rawNote += (obs.rawNote ? ' ' : '') + ev.results[i][0].transcript
    }
  }
  recognition.onend = () => (listening.value = false)
  recognition.onerror = () => (listening.value = false)
  recognition.start()
  listening.value = true
}
onBeforeUnmount(() => recognition?.stop())

function formatDate(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}月${Number(m[3])}日` : d
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [d, f] = await Promise.all([
      $fetch<TreeDetail>(`/api/kaki/trees/${route.params.id}`),
      $fetch<Foster[]>('/api/kaki/fosters').catch(() => []),
    ])
    detail.value = d
    fosters.value = f
    fillForm(d)
  } catch (e: any) {
    if (e?.statusCode === 403) { await router.replace('/kaki'); return }
    error.value = e?.data?.message || e?.statusMessage || '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value || isDev) await load()
  else loading.value = false
})
</script>

<style scoped>
.card {
  background: var(--kaki-card);
  border: 1px solid var(--kaki-line);
  border-radius: 22px;
  padding: 1.15rem;
  box-shadow: 0 16px 38px -28px rgba(120, 80, 40, 0.4);
}
.eyebrow {
  display: flex; align-items: center; gap: 0.4rem;
  font-size: 12.5px; font-weight: 700; color: var(--kaki-ink-soft); margin-bottom: 0.9rem;
}
.eyebrow span:first-child { font-family: 'Apple Color Emoji','Segoe UI Emoji',sans-serif; }
.field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 11.5px; font-weight: 700; color: var(--kaki-ink-soft); }
.inp {
  background: var(--kaki-paper); border: 1px solid var(--kaki-line); border-radius: 12px;
  padding: 0.5rem 0.75rem; font-size: 14px; font-weight: 400; color: var(--kaki-ink); font-family: inherit;
}
.inp:focus { outline: none; border-color: var(--kaki-persimmon); }
.ai-btn {
  font-size: 12.5px; font-weight: 700; padding: 0.42rem 0.85rem; border-radius: 999px;
  background: var(--kaki-amber); color: #fff; transition: opacity 0.15s;
}
.ai-btn:disabled { opacity: 0.45; }
.save-btn {
  padding: 0.6rem 1.4rem; border-radius: 999px; font-weight: 700; font-size: 14px;
  background: var(--kaki-persimmon); color: #fff; transition: background 0.15s;
}
.save-btn:hover { background: var(--kaki-persimmon-deep); }
.save-btn:disabled { opacity: 0.45; }
</style>
