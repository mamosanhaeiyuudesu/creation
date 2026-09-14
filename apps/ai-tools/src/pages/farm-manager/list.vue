<template>
  <div class="max-w-[880px] mx-auto px-4 sm:px-6 pt-5 pb-28">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/farm-manager" class="text-[13px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-in-deep)] no-underline">‹ 経営の画面</NuxtLink>
      <NuxtLink to="/farm-manager/settings" class="text-[13px] text-[var(--fm-ink-soft)] no-underline">設定</NuxtLink>
    </div>

    <div class="flex items-center justify-center gap-3 mb-4">
      <button class="fm-btn-ghost !h-9 !px-3.5" aria-label="前の月" @click="shiftMonth(-1)">‹</button>
      <p class="text-[18px] font-bold fm-num min-w-[120px] text-center">{{ monthLabel }}</p>
      <button class="fm-btn-ghost !h-9 !px-3.5" :disabled="month >= currentMonth" aria-label="次の月" @click="shiftMonth(1)">›</button>
    </div>

    <div class="flex gap-1.5 mb-4">
      <button class="fm-chip" :class="{ 'fm-chip--on': view === 'tx' }" @click="view = 'tx'">伝票</button>
      <button class="fm-chip" :class="{ 'fm-chip--on': view === 'account' }" @click="view = 'account'">科目別</button>
      <button class="fm-chip" :class="{ 'fm-chip--on': view === 'vendor' }" @click="view = 'vendor'">取引先別</button>
      <button class="fm-btn-ghost !h-9 ml-auto" @click="exportCsv">CSV</button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 rounded-xl bg-[var(--fm-paper-2)]/70 animate-pulse" />
    </div>
    <div v-else-if="loadError" class="fm-card p-6 text-center">
      <p class="text-[14px] mb-3">読み込めませんでした。</p>
      <button class="fm-btn" @click="load">読み込み直す</button>
    </div>

    <!-- 伝票の一覧 -->
    <template v-else-if="view === 'tx'">
      <p v-if="!transactions.length" class="fm-card p-10 text-center text-[14px] text-[var(--fm-ink-soft)]">
        この月の記録はまだありません。
      </p>
      <ul v-else class="space-y-2">
        <li v-for="t in transactions" :key="t.id">
          <NuxtLink :to="`/farm-manager/${t.id}`" class="fm-card p-3.5 flex items-center gap-3 no-underline text-[var(--fm-ink)]">
            <div class="text-center shrink-0 w-11">
              <p class="fm-num text-[18px] font-bold leading-none">{{ Number(t.occurredAt.slice(8)) }}</p>
              <p class="text-[10.5px] text-[var(--fm-ink-soft)]">{{ Number(t.occurredAt.slice(5, 7)) }}月</p>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold truncate">{{ t.vendorName || '（取引先なし）' }}</p>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                <span class="text-[11.5px] text-[var(--fm-ink-soft)]">{{ t.items.length }}件</span>
                <span v-if="t.paymentType === 'CREDIT' && !t.paidAt" class="fm-tag fm-tag--warn">未払い</span>
                <span v-if="countPending(t) > 0" class="fm-tag fm-tag--warn">要確認{{ countPending(t) }}</span>
                <span v-for="tag in costTags(t)" :key="tag.label" class="fm-tag" :class="tag.cls">{{ tag.label }}</span>
              </div>
            </div>
            <p class="fm-num text-[16px] font-bold shrink-0">{{ formatYen(t.totalAmount) }}</p>
          </NuxtLink>
        </li>
      </ul>
    </template>

    <!-- 科目別 -->
    <template v-else-if="view === 'account'">
      <div v-for="group in accountGroups" :key="group.key" class="mb-4">
        <h3 class="text-[13px] font-bold mb-1.5 px-1 flex items-center gap-1.5" :style="{ color: group.color }">
          <span class="w-3 h-3 rounded-sm" :style="{ background: group.color }" />{{ group.label }}
          <span class="fm-num ml-auto">{{ formatYen(group.total) }}</span>
        </h3>
        <div class="fm-card overflow-hidden">
          <p v-if="!group.rows.length" class="px-4 py-4 text-[13px] text-[var(--fm-ink-soft)]">記録がありません。</p>
          <div v-for="row in group.rows" :key="row.accountCode" class="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--fm-line)] last:border-0">
            <span class="text-[14px] flex-1 truncate">{{ row.accountName }}</span>
            <span class="fm-num text-[12px] text-[var(--fm-ink-soft)] w-10 text-right">{{ Math.round(row.ratio * 100) }}%</span>
            <span class="fm-num text-[15px] font-bold w-[100px] text-right">{{ formatYen(row.amount) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 取引先別 -->
    <template v-else>
      <div class="fm-card overflow-hidden">
        <p v-if="!summary?.vendors.length" class="px-4 py-6 text-[13px] text-[var(--fm-ink-soft)] text-center">記録がありません。</p>
        <div v-for="v in summary?.vendors ?? []" :key="v.vendorName" class="flex items-center gap-3 px-4 py-3 border-b border-[var(--fm-line)] last:border-0">
          <span class="text-[14px] flex-1 truncate">{{ v.vendorName }}</span>
          <span class="fm-num text-[15px] font-bold">{{ formatYen(v.amount) }}</span>
        </div>
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import type { MonthlySummary, Transaction } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '明細 | farm-manager' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const currentMonth = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7)
const month = ref(currentMonth)
const view = ref<'tx' | 'account' | 'vendor'>('tx')
const transactions = ref<Transaction[]>([])
const summary = ref<MonthlySummary | null>(null)
const loading = ref(true)
const loadError = ref(false)

const monthLabel = computed(() => `${month.value.slice(0, 4)}年${Number(month.value.slice(5))}月`)

const accountGroups = computed(() => {
  const b = summary.value?.breakdown
  return [
    { key: 'variable', label: 'B. 変動費（畑の中）', color: 'var(--fm-in-deep)', rows: b?.variable ?? [], total: summary.value?.totals.variable ?? 0 },
    { key: 'fixed', label: 'D. 固定費（畑の外）', color: 'var(--fm-out-deep)', rows: b?.fixed ?? [], total: summary.value?.totals.fixed ?? 0 },
    { key: 'revenue', label: 'A. 売上高', color: 'var(--fm-rev-deep)', rows: b?.revenue ?? [], total: summary.value?.totals.revenue ?? 0 },
  ]
})

function countPending(t: Transaction): number {
  return t.items.filter((i) => i.isProvisional || (i.needsConfirmation && !i.confirmedByUser)).length
}

function costTags(t: Transaction) {
  const tags: { label: string; cls: string }[] = []
  if (t.items.some((i) => i.costType === 'VARIABLE')) tags.push({ label: '畑の中', cls: 'fm-tag--in' })
  if (t.items.some((i) => i.costType === 'FIXED')) tags.push({ label: '畑の外', cls: 'fm-tag--out' })
  if (t.items.some((i) => i.costType === 'REVENUE')) tags.push({ label: '売上', cls: 'fm-tag--rev' })
  return tags
}

function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

function shiftMonth(delta: number) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
  const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  if (next > currentMonth) return
  month.value = next
}

// GET・Cookie認証なのでブラウザ遷移でそのままダウンロードできる
function exportCsv() {
  window.location.href = `/api/farm-manager/export/csv?type=items&month=${month.value}`
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [list, s] = await Promise.all([
      $fetch<Transaction[]>('/api/farm-manager/transactions', { query: { month: month.value } }),
      $fetch<MonthlySummary>('/api/farm-manager/summary', { query: { month: month.value } }),
    ])
    transactions.value = list
    summary.value = s
  } catch (e: any) {
    if (e?.statusCode !== 401) loadError.value = true
    transactions.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

watch(month, load)
watch(isLoggedIn, (v) => { if (v) load() })

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>
