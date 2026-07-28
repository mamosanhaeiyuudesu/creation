<template>
  <div class="max-w-[760px] lg:max-w-[1040px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🏡</span>
        <div>
          <h1 class="gh-display text-[22px] sm:text-[26px] font-bold leading-none flex items-center gap-2">
            ゲストハウス案内（管理）
            <HelpTip label="このページの説明">
              お客様への返信・確認をおこなう管理ページです。左（スマホは上）が<b>対応待ちの相談</b>、右（スマホは下）が<b>傾向</b>です。上のボタンから宿の情報・旅の情報の登録に進めます。
            </HelpTip>
          </h1>
        </div>
      </div>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--gh-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
    </div>

    <div v-if="notAdmin" class="mt-6 rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
      <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed">
        このページはゲストハウス運営者（管理者）のみが利用できます。<br />
        お客様は、お渡しした共有リンク・QRコードからチャットをご利用ください。
      </p>
    </div>

    <template v-else>
      <!-- 登録系のボタン -->
      <div class="flex flex-wrap items-center gap-2 mt-4 mb-6">
        <NuxtLink to="/guesthouse/houses" class="gh-btn-ghost inline-flex items-center">🏠 宿の情報</NuxtLink>
        <NuxtLink to="/guesthouse/tips" class="gh-btn-ghost inline-flex items-center">🗺 旅の情報</NuxtLink>
        <NuxtLink to="/guesthouse/reviews" class="gh-btn-ghost inline-flex items-center">📝 レビュー・意見</NuxtLink>
        <button type="button" class="gh-btn-ghost inline-flex items-center" @click="issueOpen = true">✉️ 会話を発行</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <!-- 左（スマホは上）：進行中のチャット → 対応待ちの相談 -->
        <div class="space-y-8">
        <!-- 進行中のチャット -->
        <section>
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="gh-display text-[16px] font-bold flex items-center gap-2">
              進行中のチャット
              <span v-if="activeSessions.length" class="inline-grid place-items-center min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--gh-forest)] text-white text-[11px]">{{ activeSessions.length }}</span>
              <HelpTip label="進行中のチャットとは">
                お客様とやりとり中のチャットです。行をタップで会話を開けます。「すべて見る」から、クローズ済みも含めて宿・状態で絞り込み表示できます。
              </HelpTip>
            </h2>
            <NuxtLink to="/guesthouse/sessions" class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] shrink-0 inline-flex items-center">すべて見る</NuxtLink>
          </div>
          <div v-if="loading" class="h-20 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
          <p v-else-if="!activeSessions.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13.5px]">
            進行中のチャットはありません。
          </p>
          <ul v-else class="space-y-2">
            <li v-for="s in activeSessions" :key="s.id">
              <NuxtLink :to="`/guesthouse/session/${s.id}`" class="block rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3 transition hover:border-[var(--gh-forest-soft)]">
                <div class="flex items-center gap-2">
                  <span class="gh-chip !py-0.5 !px-2 !text-[11px]">{{ s.houseName }}</span>
                  <p class="font-bold text-[14px] truncate">{{ s.guestName || '名前未設定のお客様' }}</p>
                  <span v-if="s.pendingConsults" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-warn)] !border-[color-mix(in_srgb,var(--gh-warn)_40%,transparent)]">相談 {{ s.pendingConsults }}</span>
                  <span v-if="s.hasDiary" class="gh-chip !py-0.5 !px-2 !text-[10.5px]">日記あり</span>
                  <span class="ml-auto text-[11px] text-[var(--gh-ink-faint)] shrink-0">{{ s.messageCount }}件 ・ {{ formatDate(s.updatedAt) }}</span>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- 対応待ちの相談 -->
        <section>
          <h2 class="gh-display text-[16px] font-bold mb-3 flex items-center gap-2">
            対応待ちの相談
            <span v-if="consults.length" class="inline-grid place-items-center min-w-[20px] h-[20px] px-1 rounded-full bg-[var(--gh-warn)] text-white text-[11px]">{{ consults.length }}</span>
            <HelpTip label="対応待ちの相談とは">
              AIでは答えられない・対応してはいけない緊急や重要な相談です（例：鍵が開かない、トラブルなど）。AIの下書きを確認・修正して送ると、お客様に<b>「阪中さん」</b>として届きます。
            </HelpTip>
          </h2>

          <div v-if="loading" class="h-32 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
          <p v-else-if="!consults.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13.5px]">
            対応待ちの相談はありません。
          </p>
          <ul v-else class="space-y-3">
            <li v-for="c in consults" :key="c.id" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 gh-rise">
              <div class="flex items-center gap-2 mb-2 text-[12px] text-[var(--gh-ink-soft)]">
                <span class="gh-chip !py-0.5 !px-2">{{ c.houseName }}</span>
                <span v-if="c.guestName">{{ c.guestName }} さん</span>
                <NuxtLink :to="`/guesthouse/session/${c.sessionId}`" class="ml-auto text-[var(--gh-forest-deep)] underline underline-offset-2">会話を見る</NuxtLink>
              </div>
              <div class="rounded-xl bg-[#fbf3e4] border border-[color-mix(in_srgb,var(--gh-warn)_30%,transparent)] px-3 py-2 mb-3">
                <p class="text-[11px] font-bold text-[var(--gh-warn)] mb-0.5">お客様の相談</p>
                <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ c.question }}</p>
              </div>
              <label class="text-[12px] font-bold block mb-1">AIの下書き（編集できます）</label>
              <textarea v-model="c.draft" rows="5" class="gh-input text-[13.5px]" placeholder="返信内容…" />
              <div v-if="c.error" class="mt-2 text-[12.5px] text-[var(--gh-warn)]">{{ c.error }}</div>
              <div class="flex gap-2 mt-3">
                <button class="gh-btn-ghost" :disabled="c.busy" @click="dismiss(c)">見送る</button>
                <button class="gh-btn flex-1" :disabled="c.busy || !c.draft.trim()" @click="answer(c)">
                  {{ c.busy ? '送信中…' : '承認して送信' }}
                </button>
              </div>
            </li>
          </ul>
        </section>
        </div>

        <!-- 右（スマホは下）：傾向 -->
        <section>
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="gh-display text-[16px] font-bold flex items-center gap-2">
              傾向
              <span v-if="trends?.stale" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-forest-deep)]">新しいデータあり</span>
              <HelpTip label="傾向とは">
                お客さん日記と「レビュー・意見」から、次の一手に活きる傾向をAIが見つけます（合わせて2件以上で有効）。「更新」で最新の日記・レビューをもとに再計算します（変化がなければ再計算しません）。
              </HelpTip>
            </h2>
            <button class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] shrink-0" :disabled="trendsBusy || loading" @click="refreshTrends">
              {{ trendsBusy ? '分析中…' : '更新' }}
            </button>
          </div>

          <div v-if="loading" class="h-32 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
          <template v-else-if="trends">
            <p v-if="!trends.items.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13.5px]">
              まだ傾向はありません。「更新」で分析できます（日記＋レビューが2件以上必要・現在 日記{{ trends.basedOn }}件＋レビュー{{ trends.reviewsBasedOn }}件）。
            </p>
            <ul v-else class="space-y-2.5">
              <li v-for="(t, i) in trends.items" :key="i" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
                <p class="gh-display font-bold text-[14.5px] text-[var(--gh-forest-deep)] mb-1">{{ t.title }}</p>
                <p class="text-[13px] leading-relaxed">{{ t.detail }}</p>
              </li>
            </ul>
            <p v-if="trends.computedAt" class="text-[11px] text-[var(--gh-ink-faint)] mt-2">
              最終更新：{{ formatDate(trends.computedAt) }} ・ 日記 {{ trends.basedOn }} 件＋レビュー {{ trends.reviewsBasedOn }} 件
            </p>
          </template>
          <p v-if="trendsError" class="text-[12.5px] text-[var(--gh-warn)] mt-2">{{ trendsError }}</p>
        </section>
      </div>
    </template>

    <IssueSessionModal :open="issueOpen" @close="issueOpen = false" @issued="loadActiveSessions" />
    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import HelpTip from '~/components/guesthouse/HelpTip.vue'
import IssueSessionModal from '~/components/guesthouse/IssueSessionModal.vue'
import type { Consult, SessionListItem, Trends, TrendsRefreshResult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: 'ゲストハウス案内（管理）' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

interface ConsultRow extends Consult {
  busy: boolean
  error: string
}
const consults = ref<ConsultRow[]>([])
const activeSessions = ref<SessionListItem[]>([])
const trends = ref<Trends | null>(null)
const trendsBusy = ref(false)
const trendsError = ref('')
const loading = ref(true)
const notAdmin = ref(false)
const issueOpen = ref(false)

// 進行中（active）のチャット。発行しただけ（未開封）も作った時点で出す。
async function loadActiveSessions() {
  activeSessions.value = await $fetch<SessionListItem[]>('/api/guesthouse/sessions', {
    query: { status: 'active', limit: 8 },
  })
}

async function load() {
  loading.value = true
  try {
    const [c, , t] = await Promise.all([
      $fetch<Consult[]>('/api/guesthouse/consults'),
      loadActiveSessions(),
      $fetch<Trends>('/api/guesthouse/trends'),
    ])
    consults.value = c.map((x) => ({ ...x, busy: false, error: '' }))
    trends.value = t
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    consults.value = []
    activeSessions.value = []
    trends.value = null
  } finally {
    loading.value = false
  }
}

async function refreshTrends() {
  trendsBusy.value = true
  trendsError.value = ''
  try {
    trends.value = await $fetch<TrendsRefreshResult>('/api/guesthouse/trends/refresh', { method: 'POST' })
  } catch (e: any) {
    trendsError.value = e?.data?.message || '更新に失敗しました。'
  } finally {
    trendsBusy.value = false
  }
}

async function answer(c: ConsultRow) {
  if (!c.draft.trim()) return
  c.busy = true
  c.error = ''
  try {
    await $fetch(`/api/guesthouse/consults/${c.id}/answer`, { method: 'POST', body: { answer: c.draft } })
    consults.value = consults.value.filter((x) => x.id !== c.id)
  } catch (e: any) {
    c.error = e?.data?.message || '送信に失敗しました。'
    c.busy = false
  }
}

async function dismiss(c: ConsultRow) {
  c.busy = true
  try {
    await $fetch(`/api/guesthouse/consults/${c.id}/dismiss`, { method: 'POST' })
    consults.value = consults.value.filter((x) => x.id !== c.id)
  } catch (e: any) {
    c.error = e?.data?.message || '操作に失敗しました。'
    c.busy = false
  }
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
