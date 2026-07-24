<template>
  <div class="max-w-[960px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🍑</span>
        <div>
          <h1 class="momo-display text-[22px] sm:text-[26px] font-bold leading-none">桃の注文管理</h1>
          <p class="text-[12px] text-[var(--momo-ink-soft)] mt-1">納品日順に一覧・佐川CSV出力</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="momo-btn-ghost !h-9" @click="openSettings">依頼主設定</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--momo-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </div>

    <!-- アクション -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <NuxtLink to="/momo/new" class="momo-btn !h-10 inline-flex items-center">＋ 注文を追加</NuxtLink>
      <button class="momo-btn-ghost !h-10" @click="exportSagawa()">佐川CSV</button>
      <button class="momo-btn-ghost !h-10" @click="exportCustomers">顧客名一覧</button>
    </div>

    <!-- ビュー切替 -->
    <div class="flex gap-1.5 mb-3">
      <button class="momo-chip" :class="{ 'momo-chip--on': view === 'list' }" @click="view = 'list'">一覧</button>
      <button class="momo-chip" :class="{ 'momo-chip--on': view === 'tomorrow' }" @click="view = 'tomorrow'">明日出荷分</button>
      <button class="momo-chip" :class="{ 'momo-chip--on': view === 'summary' }" @click="view = 'summary'">選果集計</button>
    </div>

    <!-- 絞り込み・並び -->
    <div v-if="view !== 'summary'" class="flex flex-wrap items-center gap-2 mb-4">
      <div class="flex gap-1.5">
        <button v-for="s in STATUSES" :key="s.value" class="momo-chip" :class="{ 'momo-chip--on': statusFilter === s.value }" @click="toggleStatus(s.value)">{{ s.label }}</button>
      </div>
      <div v-if="view === 'list'" class="flex items-center gap-1.5 ml-auto">
        <span class="text-[12px] text-[var(--momo-ink-soft)]">まとめ</span>
        <select v-model="groupBy" class="momo-input !w-auto !py-1.5 text-[13px]">
          <option value="date">納品日</option>
          <option value="customer">顧客</option>
          <option value="slot">時間帯</option>
        </select>
      </div>
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-16 rounded-2xl bg-[var(--momo-paper-2)]/70 animate-pulse" />
    </div>

    <!-- 明日出荷分 -->
    <template v-else-if="view === 'tomorrow'">
      <div class="flex items-center justify-between mb-3">
        <p class="text-[13px] text-[var(--momo-ink-soft)]">{{ formatFull(tomorrow) }} 納品</p>
        <button v-if="tomorrowOrders.length" class="momo-btn-ghost !h-9" @click="exportSagawa(tomorrow)">この日分を佐川CSV</button>
      </div>
      <p v-if="!tomorrowOrders.length" class="text-center text-[var(--momo-ink-soft)] py-16 text-[14px]">明日納品の注文はありません。</p>
      <ul v-else class="space-y-2">
        <li v-for="o in tomorrowOrders" :key="o.id"><OrderCard :order="o" /></li>
      </ul>
    </template>

    <!-- 選果集計（品種 × サイズ × 納品日）-->
    <template v-else-if="view === 'summary'">
      <p v-if="!summary.length" class="text-center text-[var(--momo-ink-soft)] py-16 text-[14px]">集計対象の注文がありません。</p>
      <div v-for="grp in summary" :key="grp.date" class="mb-4">
        <h3 class="momo-display font-bold text-[15px] mb-1.5 flex items-center gap-2">
          <span class="text-[var(--momo-peach-deep)]">{{ formatFull(grp.date) }}</span>
        </h3>
        <div class="rounded-2xl border border-[var(--momo-line)] bg-[var(--momo-card)] overflow-hidden">
          <div v-for="(row, i) in grp.rows" :key="i" class="flex items-center justify-between px-4 py-2.5 border-b border-[var(--momo-line)] last:border-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-[14px]">{{ row.variety || '（品種未定）' }}</span>
              <span class="momo-chip !py-0.5 !px-2 !text-[11px]">{{ row.size || 'サイズ未定' }}</span>
            </div>
            <span class="font-bold text-[15px] text-[var(--momo-peach-deep)]">{{ row.quantity }}<span class="text-[12px] font-normal text-[var(--momo-ink-soft)] ml-0.5">{{ row.unit }}</span></span>
          </div>
        </div>
      </div>
    </template>

    <!-- 一覧（グループ表示）-->
    <template v-else>
      <p v-if="!filtered.length" class="text-center text-[var(--momo-ink-soft)] py-16 text-[14px]">注文がありません。「＋ 注文を追加」から会話を貼り付けて登録できます。</p>
      <div v-for="grp in groups" :key="grp.key" class="mb-4">
        <h3 class="text-[13px] font-bold text-[var(--momo-ink-soft)] mb-1.5 px-1">{{ grp.label }}<span class="ml-1.5 text-[11px] font-normal">({{ grp.orders.length }}件)</span></h3>
        <ul class="space-y-2">
          <li v-for="o in grp.orders" :key="o.id"><OrderCard :order="o" /></li>
        </ul>
      </div>
    </template>

    <!-- 依頼主設定モーダル -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[200]" @click.self="settingsOpen = false">
      <div class="w-full max-w-[420px] bg-[var(--momo-card)] rounded-2xl p-5 momo-rise">
        <h2 class="momo-display font-bold text-[17px] mb-1">ご依頼主（自分）の情報</h2>
        <p class="text-[12px] text-[var(--momo-ink-soft)] mb-4">佐川CSVの依頼主欄に固定出力されます。</p>
        <div class="space-y-3">
          <div><label class="momo-mlabel">名称</label><input v-model="settings.senderName" class="momo-input" placeholder="桃山農園" /></div>
          <div><label class="momo-mlabel">電話番号</label><input v-model="settings.senderTel" class="momo-input" placeholder="09012345678" /></div>
          <div><label class="momo-mlabel">郵便番号</label><input v-model="settings.senderPostal" class="momo-input" placeholder="6300000" /></div>
          <div><label class="momo-mlabel">住所</label><input v-model="settings.senderAddress" class="momo-input" placeholder="奈良県..." /></div>
        </div>
        <div class="flex gap-2 mt-5">
          <button class="momo-btn-ghost flex-1" @click="settingsOpen = false">閉じる</button>
          <button class="momo-btn flex-1" :disabled="savingSettings" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import OrderCard from '~/components/momo/OrderCard.vue'
import type { Order, OrderStatus, MomoSettings } from '~/types/momo'

definePageMeta({ layout: 'momo' })
useHead({ title: 'momo 桃の注文管理' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'draft', label: '下書き' },
  { value: 'confirmed', label: '確定' },
  { value: 'shipped', label: '出荷済' },
]

const orders = ref<Order[]>([])
const loading = ref(true)
const view = ref<'list' | 'tomorrow' | 'summary'>('list')
const statusFilter = ref<OrderStatus | ''>('')
const groupBy = ref<'date' | 'customer' | 'slot'>('date')

function tomorrowJst(): string {
  const now = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const d = new Date(now + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('sv-SE')
}
const tomorrow = tomorrowJst()

async function load() {
  loading.value = true
  try {
    orders.value = await $fetch<Order[]>('/api/momo/orders')
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

function toggleStatus(v: OrderStatus) {
  statusFilter.value = statusFilter.value === v ? '' : v
}

const filtered = computed(() =>
  statusFilter.value ? orders.value.filter((o) => o.status === statusFilter.value) : orders.value
)

const tomorrowOrders = computed(() => filtered.value.filter((o) => o.deliveryDate === tomorrow))

// グループ表示（一覧ビュー）
const groups = computed(() => {
  const map = new Map<string, { key: string; label: string; orders: Order[] }>()
  for (const o of filtered.value) {
    let key: string
    let label: string
    if (groupBy.value === 'customer') {
      key = o.customerName || '（顧客名なし）'
      label = key
    } else if (groupBy.value === 'slot') {
      key = o.timeSlot || '時間指定なし'
      label = key
    } else {
      key = o.deliveryDate || 'zzz'
      label = o.deliveryDate ? formatFull(o.deliveryDate) : '納品日未定'
    }
    if (!map.has(key)) map.set(key, { key, label, orders: [] })
    map.get(key)!.orders.push(o)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
})

// 選果集計（納品日 → 品種×サイズ×単位 の数量合計）
const summary = computed(() => {
  const byDate = new Map<string, Map<string, { variety: string; size: string; unit: string; quantity: number }>>()
  for (const o of filtered.value) {
    if (o.status === 'draft') continue // 下書きは選果対象に含めない
    const date = o.deliveryDate || 'zzz'
    if (!byDate.has(date)) byDate.set(date, new Map())
    const rows = byDate.get(date)!
    for (const it of o.items) {
      const size = it.size || ''
      const unit = it.unit || '箱'
      const rk = `${it.variety}|${size}|${unit}`
      if (!rows.has(rk)) rows.set(rk, { variety: it.variety, size, unit, quantity: 0 })
      rows.get(rk)!.quantity += it.quantity
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => ({
      date: date === 'zzz' ? '' : date,
      rows: [...rows.values()].sort((a, b) => a.variety.localeCompare(b.variety, 'ja') || a.size.localeCompare(b.size)),
    }))
})

// ── CSV出力（GET・Cookie認証なのでブラウザ遷移でDL）──
function exportSagawa(date?: string) {
  const url = date ? `/api/momo/export/sagawa?date=${date}` : '/api/momo/export/sagawa'
  window.location.href = url
}
function exportCustomers() {
  window.location.href = '/api/momo/export/customers'
}

// ── 依頼主設定 ──
const settingsOpen = ref(false)
const savingSettings = ref(false)
const settings = reactive<MomoSettings>({ senderName: '', senderTel: '', senderPostal: '', senderAddress: '' })

async function openSettings() {
  settingsOpen.value = true
  try {
    const s = await $fetch<MomoSettings>('/api/momo/settings')
    Object.assign(settings, s)
  } catch { /* 未ログイン等は無視 */ }
}
async function saveSettings() {
  savingSettings.value = true
  try {
    await $fetch('/api/momo/settings', { method: 'PUT', body: settings })
    settingsOpen.value = false
  } catch (e: any) {
    alert(e?.data?.message || '保存に失敗しました')
  } finally {
    savingSettings.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

// ── 日付整形 ──
const WD = ['日', '月', '火', '水', '木', '金', '土']
function formatFull(d: string): string {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return d || '納品日未定'
  const wd = WD[new Date(`${d}T00:00:00`).getDay()]
  return `${Number(m[2])}月${Number(m[3])}日(${wd})`
}

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>

<style scoped>
.momo-mlabel {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--momo-ink-soft);
  margin-bottom: 0.3rem;
}
</style>
