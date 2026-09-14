<template>
  <div class="max-w-[820px] mx-auto px-4 sm:px-6 pt-5 pb-32">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/farm-manager" class="text-[13px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-in-deep)] no-underline">‹ 経営の画面</NuxtLink>
    </div>

    <header class="flex items-center gap-2.5 mb-4">
      <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🗂️</span>
      <div>
        <h1 class="text-[21px] font-bold leading-none">仮置き一覧</h1>
        <p class="text-[12px] text-[var(--fm-ink-soft)] mt-1">分類を後回しにした明細。まとめて振り替えられます</p>
      </div>
    </header>

    <!-- 絞り込み -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button class="fm-chip" :class="{ 'fm-chip--on': !month }" @click="month = ''">すべての月</button>
      <input v-model="month" type="month" class="fm-input !w-auto !py-1.5 text-[13px]" />
      <span class="text-[12px] text-[var(--fm-ink-soft)] ml-auto fm-num">{{ items.length }}件 / {{ formatYen(totalAmount) }}</span>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-[var(--fm-paper-2)]/70 animate-pulse" />
    </div>
    <div v-else-if="loadError" class="fm-card p-6 text-center">
      <p class="text-[14px] mb-3">読み込めませんでした。</p>
      <button class="fm-btn" @click="load">読み込み直す</button>
    </div>

    <div v-else-if="!items.length" class="fm-card p-10 text-center">
      <p class="text-[15px] font-bold mb-1">仮置きはありません</p>
      <p class="text-[13px] text-[var(--fm-ink-soft)]">分類の決まっていない明細が出ると、ここに集まります。</p>
    </div>

    <template v-else>
      <!-- 選択して一括振替（実装優先度3）。1件ずつ直させない -->
      <div class="flex items-center gap-2 mb-2 px-1">
        <button class="text-[12.5px] font-bold text-[var(--fm-in-deep)]" @click="toggleAll">
          {{ allSelected ? 'すべて外す' : 'すべて選ぶ' }}
        </button>
        <span v-if="selected.size" class="text-[12.5px] text-[var(--fm-ink-soft)] fm-num">{{ selected.size }}件を選択中</span>
      </div>

      <ul class="space-y-2">
        <li
          v-for="item in items"
          :key="item.id"
          class="fm-card p-3 flex items-start gap-3 cursor-pointer"
          :class="{ 'ring-2 ring-[var(--fm-in)]': selected.has(item.id) }"
          @click="toggle(item.id)"
        >
          <input type="checkbox" class="mt-1 w-5 h-5 accent-[var(--fm-in)]" :checked="selected.has(item.id)" @click.stop="toggle(item.id)" />
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-[15px] font-bold truncate">{{ item.itemName || '（品目不明）' }}</p>
              <p class="fm-num text-[15px] font-bold shrink-0">{{ formatYen(item.amount) }}</p>
            </div>
            <p class="text-[12px] text-[var(--fm-ink-soft)] truncate mt-0.5">
              {{ formatDate(item.occurredAt) }} ・ {{ item.vendorName || '取引先なし' }}
            </p>
            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span class="fm-tag" :class="item.isProvisional ? 'fm-tag--warn' : item.costType === 'FIXED' ? 'fm-tag--out' : 'fm-tag--in'">
                {{ item.accountName }}
              </span>
              <span v-if="!item.isProvisional" class="fm-tag fm-tag--warn">要確認</span>
              <span class="text-[11.5px] text-[var(--fm-ink-soft)] truncate">{{ item.reason }}</span>
            </div>
          </div>
          <NuxtLink :to="`/farm-manager/${item.transactionId}`" class="text-[12px] text-[var(--fm-ink-soft)] shrink-0 no-underline hover:text-[var(--fm-in-deep)]" @click.stop>伝票 ›</NuxtLink>
        </li>
      </ul>
    </template>

    <!-- 振替バー。選んだらここから一発で移す -->
    <div v-if="selected.size" class="fixed bottom-0 inset-x-0 z-[150] border-t border-[var(--fm-line)] bg-[var(--fm-card)] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div class="max-w-[820px] mx-auto flex flex-wrap items-center gap-2">
        <p class="text-[13px] font-bold fm-num">{{ selected.size }}件を</p>
        <select v-model="targetCode" class="fm-input !w-auto flex-1 min-w-[180px] text-[14px]">
          <option value="">振替先の科目を選ぶ</option>
          <optgroup v-for="group in grouped" :key="group.category" :label="group.label">
            <option v-for="a in group.accounts" :key="a.code" :value="a.code">{{ a.name }}</option>
          </optgroup>
        </select>
        <button class="fm-btn" :disabled="!targetCode || moving" @click="moveSelected">
          <span v-if="moving" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
          振り替える
        </button>
      </div>
      <p class="max-w-[820px] mx-auto text-[11px] text-[var(--fm-ink-soft)] mt-1.5">
        振り替えた「取引先 × 品目」は覚えて、次回から自動で同じ分類にします。
      </p>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { CATEGORY_LABEL } from '~/types/farm-manager'
import type { AccountCategory, AccountMaster, ProvisionalItem } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '仮置き一覧 | farm-manager' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const route = useRoute()

const items = ref<ProvisionalItem[]>([])
const accounts = ref<AccountMaster[]>([])
const loading = ref(true)
const loadError = ref(false)
const moving = ref(false)
const month = ref(/^\d{4}-\d{2}$/.test(String(route.query.month ?? '')) ? String(route.query.month) : '')
const selected = ref(new Set<string>())
const targetCode = ref('')

const ORDER: AccountCategory[] = ['B_VARIABLE', 'D_FIXED', 'F_NON_OPERATING', 'A_REVENUE', 'H_FINANCE']
const grouped = computed(() =>
  ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    accounts: accounts.value.filter((a) => a.category === category && !a.isProvisionalBucket),
  })).filter((g) => g.accounts.length)
)

const totalAmount = computed(() => items.value.reduce((sum, i) => sum + i.amount, 0))
const allSelected = computed(() => items.value.length > 0 && selected.value.size === items.value.length)

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(items.value.map((i) => i.id))
}

function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}
const WD = ['日', '月', '火', '水', '木', '金', '土']
function formatDate(d: string): string {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return d || ''
  return `${Number(m[2])}月${Number(m[3])}日(${WD[new Date(`${d}T00:00:00`).getDay()]})`
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [list, a] = await Promise.all([
      $fetch<ProvisionalItem[]>('/api/farm-manager/provisional', { query: month.value ? { month: month.value } : {} }),
      $fetch<AccountMaster[]>('/api/farm-manager/accounts'),
    ])
    items.value = list
    accounts.value = a
    selected.value = new Set()
  } catch (e: any) {
    if (e?.statusCode !== 401) loadError.value = true
    items.value = []
  } finally {
    loading.value = false
  }
}

async function moveSelected() {
  if (!targetCode.value || moving.value) return
  moving.value = true
  try {
    await $fetch('/api/farm-manager/items/bulk', {
      method: 'POST',
      body: { itemIds: [...selected.value], accountCode: targetCode.value },
    })
    targetCode.value = ''
    await load()
  } catch (e: any) {
    alert(e?.data?.message || '振り替えに失敗しました')
  } finally {
    moving.value = false
  }
}

watch(month, load)
watch(isLoggedIn, (v) => { if (v) load() })

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>
