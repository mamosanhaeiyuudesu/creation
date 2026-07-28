<template>
  <div class="max-w-[760px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <Breadcrumb class="mb-2" :items="[{ label: '管理トップ', to: '/guesthouse' }, { label: 'チャット一覧' }]" />
    <h1 class="gh-display text-[22px] font-bold mb-4 flex items-center gap-2">
      チャット一覧
      <HelpTip label="このページの説明">
        お客様とのチャットを一覧します。<b>進行中</b>／<b>クローズ済み</b>や<b>宿</b>で絞り込めます。各行の「クローズする／再開する」で状態を切り替えられます（クローズ済みでも、お客様が新しく発言すると自動で進行中に戻ります）。
      </HelpTip>
    </h1>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <!-- 絞り込み -->
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <div class="flex gap-1.5">
          <button
            v-for="f in STATUS_FILTERS"
            :key="f.key"
            class="gh-chip"
            :class="{ 'gh-chip--on': statusFilter === f.key }"
            @click="statusFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <select v-model="houseFilter" class="gh-input !py-1.5 !w-auto text-[13px] ml-auto">
          <option value="">すべての宿</option>
          <option v-for="h in houses" :key="h.id" :value="h.id">{{ h.name }}</option>
        </select>
      </div>

      <div v-if="loading" class="space-y-2">
        <div v-for="i in 4" :key="i" class="h-16 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>
      <p v-else-if="!sessions.length" class="text-center text-[var(--gh-ink-soft)] py-16 text-[14px]">
        該当するチャットはありません。
      </p>
      <ul v-else class="space-y-2.5">
        <li v-for="s in sessions" :key="s.id" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] overflow-hidden transition hover:border-[var(--gh-forest-soft)]">
          <NuxtLink :to="`/guesthouse/session/${s.id}`" class="block px-4 pt-3 pb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="gh-chip !py-0.5 !px-2 !text-[11px]">{{ s.houseName }}</span>
              <p class="font-bold text-[14.5px] truncate">{{ s.guestName || '名前未設定のお客様' }}</p>
              <span v-if="s.status === 'closed'" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-ink-faint)]">クローズ済み</span>
              <span v-if="s.pendingConsults" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-warn)] !border-[color-mix(in_srgb,var(--gh-warn)_40%,transparent)]">相談 {{ s.pendingConsults }}</span>
              <span v-if="s.hasDiary" class="gh-chip !py-0.5 !px-2 !text-[10.5px]">日記あり</span>
              <span v-if="!s.messageCount" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-ink-faint)]">未開封</span>
              <span class="ml-auto text-[11px] text-[var(--gh-ink-faint)] shrink-0">{{ s.messageCount }}件 ・ {{ formatDate(s.updatedAt) }}</span>
            </div>
          </NuxtLink>
          <div class="flex items-center gap-3 px-4 pb-2.5 border-t border-[var(--gh-line)] pt-2">
            <button
              v-if="s.status === 'active'"
              class="text-[12px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]"
              :disabled="busyId === s.id"
              @click="setStatus(s, 'closed')"
            >
              {{ busyId === s.id ? '…' : 'クローズする' }}
            </button>
            <button
              v-else
              class="text-[12px] text-[var(--gh-forest-deep)] hover:underline underline-offset-2"
              :disabled="busyId === s.id"
              @click="setStatus(s, 'active')"
            >
              {{ busyId === s.id ? '…' : '再開する' }}
            </button>
          </div>
        </li>
      </ul>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import HelpTip from '~/components/guesthouse/HelpTip.vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import type { HouseSummary, SessionListItem, SessionStatus } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: 'チャット一覧 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

type StatusFilter = 'all' | 'active' | 'closed'
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'active', label: '進行中' },
  { key: 'closed', label: 'クローズ済み' },
]

const houses = ref<HouseSummary[]>([])
const sessions = ref<SessionListItem[]>([])
const statusFilter = ref<StatusFilter>('all')
const houseFilter = ref('')
const loading = ref(true)
const notAdmin = ref(false)
const busyId = ref('')

async function loadSessions() {
  loading.value = true
  try {
    sessions.value = await $fetch<SessionListItem[]>('/api/guesthouse/sessions', {
      query: { status: statusFilter.value, houseId: houseFilter.value || undefined },
    })
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    sessions.value = []
  } finally {
    loading.value = false
  }
}

async function setStatus(s: SessionListItem, status: SessionStatus) {
  busyId.value = s.id
  try {
    await $fetch(`/api/guesthouse/sessions/${s.id}/status`, { method: 'POST', body: { status } })
    // 状態で絞り込み中なら消える可能性があるので、一覧を取り直す。
    await loadSessions()
  } catch {
    /* noop */
  } finally {
    busyId.value = ''
  }
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

watch([statusFilter, houseFilter], loadSessions)

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) {
    loading.value = false
    return
  }
  try {
    houses.value = await $fetch<HouseSummary[]>('/api/guesthouse/houses')
  } catch {
    /* 宿の取得失敗は絞り込みが使えないだけなので握りつぶす */
  }
  await loadSessions()
})
</script>
