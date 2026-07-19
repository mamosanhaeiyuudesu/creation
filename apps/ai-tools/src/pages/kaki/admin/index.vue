<template>
  <div class="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-20">
    <header class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🧑‍🌾</span>
        <div>
          <h1 class="kaki-display text-[22px] sm:text-[26px] font-bold leading-none">木の管理</h1>
          <p class="text-[12px] text-[var(--kaki-ink-soft)] mt-1">農家用ダッシュボード</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/kaki" class="text-[13px] font-bold text-[var(--kaki-persimmon-deep)] px-3 py-1.5 rounded-full border border-[var(--kaki-line)] bg-[var(--kaki-card)] hover:bg-[var(--kaki-paper-2)] transition-colors">🍂 里親トップ</NuxtLink>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--kaki-ink-soft)] px-3 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </header>

    <!-- 新規登録 -->
    <div class="mb-5 rounded-2xl border border-dashed border-[var(--kaki-persimmon-soft)] bg-[var(--kaki-card)] p-3.5">
      <form class="flex flex-wrap items-end gap-2.5" @submit.prevent="createTree">
        <div>
          <label class="block text-[11px] font-bold text-[var(--kaki-ink-soft)] mb-1">番号</label>
          <input v-model.number="newNumber" type="number" min="0" class="kaki-input w-24" placeholder="12" />
        </div>
        <div class="flex-1 min-w-[140px]">
          <label class="block text-[11px] font-bold text-[var(--kaki-ink-soft)] mb-1">愛称</label>
          <input v-model="newNickname" type="text" class="kaki-input w-full" placeholder="やんちゃ太郎" />
        </div>
        <button type="submit" :disabled="creating" class="h-10 px-4 rounded-full font-bold text-white text-sm bg-[var(--kaki-persimmon)] hover:bg-[var(--kaki-persimmon-deep)] disabled:opacity-40">＋ 木を登録</button>
      </form>
    </div>

    <!-- 検索・絞り込み -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <input v-model="q" type="search" placeholder="番号・愛称で検索" class="kaki-input flex-1 min-w-[180px]" @input="debouncedLoad" />
      <div class="flex gap-1.5">
        <button v-for="f in statusFilters" :key="f.value" class="filter-chip" :class="{ 'filter-chip--on': status === f.value }" @click="toggleStatus(f.value)">{{ f.label }}</button>
      </div>
      <div class="flex gap-1.5">
        <button class="filter-chip" :class="{ 'filter-chip--on': foster === 'unassigned' }" @click="toggleFoster('unassigned')">里親なし</button>
        <button class="filter-chip" :class="{ 'filter-chip--on': foster === 'assigned' }" @click="toggleFoster('assigned')">里親あり</button>
      </div>
    </div>

    <!-- 一覧 -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-16 rounded-2xl bg-[var(--kaki-paper-2)]/70 animate-pulse" />
    </div>
    <p v-else-if="!trees.length" class="text-center text-[var(--kaki-ink-soft)] py-16">該当する木がありません。</p>
    <ul v-else class="space-y-2">
      <li v-for="t in trees" :key="t.id">
        <NuxtLink :to="`/kaki/admin/${t.id}`" class="flex items-center gap-3.5 rounded-2xl bg-[var(--kaki-card)] border border-[var(--kaki-line)] p-2.5 hover:border-[var(--kaki-persimmon-soft)] transition-colors">
          <div class="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[var(--kaki-paper-2)] flex items-center justify-center">
            <img v-if="t.lastPhoto" :src="t.lastPhoto" alt="" class="w-full h-full object-cover" />
            <span v-else class="text-xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🌳</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[12px] font-bold text-[var(--kaki-persimmon-deep)]">No.{{ t.number }}</span>
              <span class="kaki-display font-bold text-[16px] truncate">{{ t.nickname || '（愛称なし）' }}</span>
            </div>
            <p class="text-[12px] text-[var(--kaki-ink-soft)] mt-0.5 truncate">
              {{ t.fosterUsername ? `里親: ${t.fosterUsername}` : '里親未割当' }}<span v-if="t.lastObservedAt"> ・ {{ formatShort(t.lastObservedAt) }}更新</span>
            </p>
          </div>
          <StatusBadge :status="t.status" size="sm" />
          <span class="text-[var(--kaki-ink-soft)] pr-1">›</span>
        </NuxtLink>
      </li>
    </ul>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import StatusBadge from '~/components/kaki/StatusBadge.vue'
import type { KakiMe, TreeSummary, TreeStatus, Tree } from '~/types/kaki'

definePageMeta({ layout: 'kaki' })
useHead({ title: '木の管理 | 柿の木のいえ' })

const isDev = import.meta.dev
const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)
const router = useRouter()

const trees = ref<TreeSummary[]>([])
const loading = ref(true)
const q = ref('')
const status = ref<TreeStatus | ''>('')
const foster = ref<'' | 'assigned' | 'unassigned'>('')

const statusFilters: { label: string; value: TreeStatus }[] = [
  { label: '元気', value: 'healthy' },
  { label: '見守り中', value: 'watching' },
  { label: '療養中', value: 'sick' },
]

const newNumber = ref<number | null>(null)
const newNickname = ref('')
const creating = ref(false)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (q.value.trim()) params.set('q', q.value.trim())
    if (status.value) params.set('status', status.value)
    if (foster.value) params.set('foster', foster.value)
    trees.value = await $fetch<TreeSummary[]>(`/api/kaki/trees?${params.toString()}`)
  } catch {
    trees.value = []
  } finally {
    loading.value = false
  }
}

let debounceTimer: any
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}
function toggleStatus(v: TreeStatus) {
  status.value = status.value === v ? '' : v
  load()
}
function toggleFoster(v: 'assigned' | 'unassigned') {
  foster.value = foster.value === v ? '' : v
  load()
}

async function createTree() {
  if (creating.value) return
  creating.value = true
  try {
    const t = await $fetch<Tree>('/api/kaki/trees', {
      method: 'POST',
      body: { number: newNumber.value ?? 0, nickname: newNickname.value.trim() },
    })
    await router.push(`/kaki/admin/${t.id}`)
  } catch (e: any) {
    alert(e?.data?.message || '登録に失敗しました')
  } finally {
    creating.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

function formatShort(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : d
}

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value && !isDev) { loading.value = false; return }
  try {
    const me = await $fetch<KakiMe>('/api/kaki/me')
    if (me.role !== 'admin') { await router.replace('/kaki'); return }
  } catch {
    if (!isDev) { loading.value = false; return }
  }
  await load()
})
</script>

<style scoped>
.kaki-input {
  background: var(--kaki-card);
  border: 1px solid var(--kaki-line);
  border-radius: 12px;
  padding: 0.5rem 0.85rem;
  font-size: 14px;
  color: var(--kaki-ink);
}
.kaki-input::placeholder { color: color-mix(in srgb, var(--kaki-ink-soft) 70%, transparent); }
.kaki-input:focus { outline: none; border-color: var(--kaki-persimmon); }
.filter-chip {
  font-size: 12.5px;
  font-weight: 700;
  padding: 0.42rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--kaki-line);
  background: var(--kaki-card);
  color: var(--kaki-ink-soft);
  transition: all 0.15s;
}
.filter-chip--on {
  background: var(--kaki-persimmon);
  border-color: var(--kaki-persimmon);
  color: #fff;
}
</style>
