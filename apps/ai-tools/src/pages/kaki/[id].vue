<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-5 pb-20">
    <!-- パンくず -->
    <div class="flex items-center justify-between gap-2 pt-5 pb-3">
      <Breadcrumb :items="crumbs" />
      <NuxtLink v-if="me?.role === 'admin' && detail" :to="`/kaki/admin/${detail.tree.id}`" class="shrink-0 text-[13px] font-bold text-[var(--kaki-persimmon-deep)]">編集する</NuxtLink>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="rounded-[28px] aspect-[4/3] bg-[var(--kaki-paper-2)]/70" />
      <div class="h-24 rounded-2xl bg-[var(--kaki-paper-2)]/70" />
    </div>

    <p v-else-if="error" class="text-center text-[var(--kaki-clay)] py-20">{{ error }}</p>

    <div v-else-if="detail" class="space-y-8">
      <!-- 1. ヒーロー -->
      <section class="kaki-rise">
        <div class="relative rounded-[28px] overflow-hidden border border-[var(--kaki-line)] bg-[var(--kaki-paper-2)] shadow-[0_22px_50px_-24px_rgba(120,80,40,0.5)] aspect-[4/3]">
          <img v-if="heroPhoto" :src="heroPhoto" :alt="`${tree.nickname}の写真`" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-6xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🌳</div>
          <span class="absolute top-4 left-4"><StatusBadge :status="tree.status" /></span>
        </div>
        <div class="flex items-end justify-between gap-3 mt-4 px-1">
          <div>
            <h1 class="kaki-display text-[30px] sm:text-[34px] font-bold leading-none">{{ tree.nickname || '（愛称なし）' }}</h1>
            <p class="text-[13px] text-[var(--kaki-ink-soft)] mt-2">No.{{ tree.number }}<span v-if="ageText"> ・ {{ ageText }}</span></p>
          </div>
        </div>
      </section>

      <!-- 2. この子の紹介 -->
      <section v-if="tree.personality" class="kaki-panel kaki-rise">
        <p class="kaki-eyebrow"><span>📖</span> この子のこと</p>
        <p class="text-[15px] leading-[1.9] text-[var(--kaki-ink)]">{{ tree.personality }}</p>
      </section>

      <!-- 3. いいところ / 困ったところ -->
      <section v-if="tree.strengths.length || tree.weaknesses.length" class="grid sm:grid-cols-2 gap-3 kaki-rise">
        <div class="kaki-panel !p-4">
          <p class="kaki-eyebrow" style="color:var(--kaki-leaf)"><span>🌿</span> いいところ</p>
          <ul class="space-y-2">
            <li v-for="s in tree.strengths" :key="s" class="flex items-start gap-2 text-[14px] text-[var(--kaki-ink)]">
              <span class="mt-0.5" style="color:var(--kaki-leaf)">●</span><span>{{ s }}</span>
            </li>
            <li v-if="!tree.strengths.length" class="text-[13px] text-[var(--kaki-ink-soft)]">これから見つけていきます。</li>
          </ul>
        </div>
        <div class="kaki-panel !p-4" style="background:color-mix(in srgb, var(--kaki-persimmon) 7%, var(--kaki-card))">
          <p class="kaki-eyebrow" style="color:var(--kaki-persimmon-deep)"><span>🫶</span> ちょっと困りごと <span class="font-normal text-[var(--kaki-ink-soft)]">— それも愛嬌</span></p>
          <ul class="space-y-2">
            <li v-for="w in tree.weaknesses" :key="w" class="flex items-start gap-2 text-[14px] text-[var(--kaki-ink)]">
              <span class="mt-0.5" style="color:var(--kaki-persimmon)">◍</span><span>{{ w }}</span>
            </li>
            <li v-if="!tree.weaknesses.length" class="text-[13px] text-[var(--kaki-ink-soft)]">今のところ、のびのび元気です。</li>
          </ul>
        </div>
      </section>

      <!-- 5. 今日のひとこと -->
      <section v-if="todayVoice" class="kaki-rise">
        <div class="relative rounded-[24px] px-5 py-5 text-center" style="background:linear-gradient(135deg, color-mix(in srgb, var(--kaki-persimmon) 16%, white), color-mix(in srgb, var(--kaki-amber) 14%, white))">
          <p class="kaki-eyebrow justify-center !mb-2"><span>💬</span> 今日のひとこと</p>
          <p class="kaki-display text-[19px] leading-relaxed text-[var(--kaki-persimmon-deep)]">「{{ todayVoice }}」</p>
        </div>
      </section>

      <!-- 4. 成長の記録 -->
      <section class="kaki-panel kaki-rise">
        <p class="kaki-eyebrow"><span>📷</span> 成長の記録</p>
        <PhotoTimeline :observations="detail.observations" />
      </section>

      <!-- 6. 観察日記 -->
      <section v-if="diary.length" class="kaki-rise">
        <p class="kaki-eyebrow px-1"><span>🖊️</span> 観察日記</p>
        <ol class="relative border-l-2 border-dashed border-[var(--kaki-line)] ml-2 space-y-5 pt-1">
          <li v-for="o in diary" :key="o.id" class="relative pl-5">
            <span class="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[var(--kaki-persimmon)] ring-4 ring-[var(--kaki-paper)]" />
            <p class="text-[12px] font-bold text-[var(--kaki-ink-soft)] mb-1.5">{{ formatDate(o.observedAt) }}</p>
            <div class="kaki-panel !p-4">
              <img v-if="o.photoUrl" :src="o.photoUrl" :alt="`${formatDate(o.observedAt)}の写真`" class="w-full rounded-xl mb-3 object-cover max-h-72" />
              <p v-if="o.aiStory" class="text-[14px] leading-[1.85] text-[var(--kaki-ink)]">{{ o.aiStory }}</p>
              <p v-else class="text-[13px] text-[var(--kaki-ink-soft)]">写真を記録しました。</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- 7. 病歴・できごと -->
      <section v-if="detail.healthEvents.length" class="kaki-panel kaki-rise">
        <p class="kaki-eyebrow"><span>🗒️</span> これまでのできごと</p>
        <ol class="space-y-3">
          <li v-for="h in detail.healthEvents" :key="h.id" class="flex gap-3">
            <span class="shrink-0 w-14 text-right text-[13px] font-bold text-[var(--kaki-persimmon-deep)] pt-0.5">{{ h.year }}年</span>
            <span class="shrink-0 text-lg leading-none pt-0.5" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">{{ eventEmoji(h.eventType) }}</span>
            <div class="min-w-0">
              <p class="text-[14px] font-bold text-[var(--kaki-ink)]">{{ h.aiLabel || h.rawLabel }}</p>
              <p v-if="h.aiDescription" class="text-[13px] leading-relaxed text-[var(--kaki-ink-soft)] mt-0.5">{{ h.aiDescription }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- 8. 応援コメント -->
      <section class="kaki-panel kaki-rise">
        <p class="kaki-eyebrow"><span>🧺</span> 応援メッセージ</p>
        <CommentSection :comments="detail.comments" :tree-id="tree.id" @added="onComment" />
      </section>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import StatusBadge from '~/components/kaki/StatusBadge.vue'
import PhotoTimeline from '~/components/kaki/PhotoTimeline.vue'
import CommentSection from '~/components/kaki/CommentSection.vue'
import Breadcrumb, { type Crumb } from '~/components/kaki/Breadcrumb.vue'
import type { KakiMe, TreeDetail, Comment, HealthEventType } from '~/types/kaki'

definePageMeta({ layout: 'kaki' })

const isDev = import.meta.dev
const route = useRoute()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)

const me = ref<KakiMe | null>(null)
const detail = ref<TreeDetail | null>(null)
const loading = ref(true)
const error = ref('')

const tree = computed(() => detail.value!.tree)
useHead(() => ({ title: detail.value ? `${detail.value.tree.nickname} | 柿の木のいえ` : '柿の木のいえ' }))

const crumbs = computed<Crumb[]>(() => [
  { label: '柿の木のいえ', to: '/kaki' },
  ...(detail.value ? [{ label: detail.value.tree.nickname || `No.${detail.value.tree.number}` }] : []),
])

const heroPhoto = computed(() => {
  const withPhoto = (detail.value?.observations ?? []).filter((o) => o.photoUrl)
  return withPhoto.length ? withPhoto[withPhoto.length - 1].photoUrl : null
})
const todayVoice = computed(() => {
  const voices = (detail.value?.observations ?? []).filter((o) => o.aiTreeVoice)
  return voices.length ? voices[voices.length - 1].aiTreeVoice : ''
})
const diary = computed(() => [...(detail.value?.observations ?? [])].reverse())
const ageText = computed(() => (tree.value?.plantedYear ? `樹齢 ${new Date().getFullYear() - tree.value.plantedYear} 歳` : ''))

function onComment(c: Comment) {
  detail.value?.comments.push(c)
}

const EVENT_EMOJI: Record<HealthEventType, string> = {
  disease: '🤒', pest: '🐛', weather: '⛅', recovery: '🌤️', harvest: '🧡',
}
function eventEmoji(t: string): string {
  return EVENT_EMOJI[(t as HealthEventType)] ?? '🗒️'
}
function formatDate(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : d
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    me.value = await $fetch<KakiMe>('/api/kaki/me').catch(() => null)
    detail.value = await $fetch<TreeDetail>(`/api/kaki/trees/${route.params.id}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || 'この木を表示できませんでした'
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
.kaki-panel {
  background: var(--kaki-card);
  border: 1px solid var(--kaki-line);
  border-radius: 22px;
  padding: 1.25rem;
  box-shadow: 0 16px 38px -26px rgba(120, 80, 40, 0.4);
}
.kaki-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--kaki-ink-soft);
  margin-bottom: 0.85rem;
}
.kaki-eyebrow span:first-child {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
}
</style>
