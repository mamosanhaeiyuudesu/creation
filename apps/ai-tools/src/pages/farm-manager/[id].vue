<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-6 pt-5 pb-28">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/farm-manager/list" class="text-[13px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-in-deep)] no-underline">‹ 明細一覧</NuxtLink>
      <button v-if="tx" class="text-[13px] text-[var(--fm-ink-soft)] px-2.5 py-1.5 rounded-full hover:text-[var(--fm-minus)]" @click="remove">この取引を削除</button>
    </div>

    <div v-if="loading" class="h-64 rounded-2xl bg-[var(--fm-paper-2)]/70 animate-pulse" />
    <div v-else-if="loadError" class="fm-card p-6 text-center">
      <p class="text-[14px] mb-3">取引を読み込めませんでした。</p>
      <button class="fm-btn" @click="load">読み込み直す</button>
    </div>

    <template v-else-if="tx">
      <div class="fm-card p-3 mb-3 flex gap-3 items-start">
        <button v-if="tx.imageUrl" class="shrink-0" @click="zoom = true">
          <img :src="tx.imageUrl" alt="伝票の写真" class="w-24 h-32 object-cover rounded-lg border border-[var(--fm-line)]" />
        </button>
        <div v-else class="w-24 h-32 rounded-lg border border-dashed border-[var(--fm-line)] flex items-center justify-center text-[11px] text-[var(--fm-ink-soft)] shrink-0 text-center px-1">
          写真なし
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-[18px] font-bold truncate">{{ tx.vendorName || '（取引先なし）' }}</h1>
          <p class="fm-num text-[22px] font-bold mt-0.5">{{ formatYen(itemTotal) }}</p>
          <p class="text-[12px] text-[var(--fm-ink-soft)] mt-1">
            <span v-if="tx.paymentType === 'CREDIT' && !form.paidAt" class="fm-tag fm-tag--warn mr-1">未払い</span>
            {{ form.paymentType === 'CREDIT' ? '掛け（ツケ）' : 'その場で支払い' }}
          </p>
        </div>
      </div>

      <div class="fm-card p-4 mb-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="fm-label">取引先</label>
            <input v-model="form.vendorName" class="fm-input" />
          </div>
          <div>
            <label class="fm-label">発生日（納品日）</label>
            <input v-model="form.occurredAt" type="date" class="fm-input" />
          </div>
          <div>
            <label class="fm-label">支払日</label>
            <input v-model="form.paidAt" type="date" class="fm-input" />
            <button v-if="!form.paidAt" class="text-[11.5px] text-[var(--fm-in-deep)] mt-1" @click="form.paidAt = todayJst()">今日支払った</button>
          </div>
          <div class="col-span-2">
            <label class="fm-label">支払い方</label>
            <div class="flex gap-1.5">
              <button class="fm-chip" :class="{ 'fm-chip--on': form.paymentType === 'CREDIT' }" @click="form.paymentType = 'CREDIT'">掛け（ツケ）</button>
              <button class="fm-chip" :class="{ 'fm-chip--on': form.paymentType === 'CASH' }" @click="form.paymentType = 'CASH'">その場で支払い</button>
            </div>
          </div>
          <div class="col-span-2">
            <label class="fm-label">メモ</label>
            <input v-model="form.note" class="fm-input" placeholder="覚えておきたいことがあれば" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-2 px-1">
        <h2 class="text-[15px] font-bold">明細（{{ form.items.length }}件）</h2>
        <p class="fm-num text-[15px] font-bold">{{ formatYen(itemTotal) }}</p>
      </div>
      <FmItemRows :items="form.items" :accounts="accounts" :workers="workers" @add="addItem" @remove="removeItem" />

      <button class="fm-btn w-full mt-4 !h-13 !text-[16px]" :disabled="saving" @click="save">
        <span v-if="saving" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
        保存する
      </button>
      <p v-if="saveError" class="mt-2 text-[13px] text-[var(--fm-minus)] text-center">{{ saveError }}</p>
      <p v-if="savedAt" class="mt-2 text-[13px] text-[var(--fm-in-deep)] text-center">保存しました</p>

      <!-- 写真の拡大。伝票の文字を目で確かめたい場面が必ずある -->
      <div v-if="zoom" class="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4" @click="zoom = false">
        <img :src="tx.imageUrl" alt="伝票の写真" class="max-w-full max-h-full object-contain rounded-lg" />
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import FmItemRows from '~/components/farm-manager/FmItemRows.vue'
import { PROVISIONAL_VARIABLE } from '~/types/farm-manager'
import type { AccountMaster, EditableItem, PaymentType, Transaction, Worker } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '取引の詳細 | farm-manager' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const route = useRoute()
const router = useRouter()
const id = String(route.params.id ?? '')

const tx = ref<Transaction | null>(null)
const accounts = ref<AccountMaster[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const loadError = ref(false)
const saving = ref(false)
const saveError = ref('')
const savedAt = ref(false)
const zoom = ref(false)

const form = reactive<{ vendorName: string; occurredAt: string; paidAt: string; paymentType: PaymentType; note: string; items: EditableItem[] }>({
  vendorName: '',
  occurredAt: '',
  paidAt: '',
  paymentType: 'CREDIT',
  note: '',
  items: [],
})

const itemTotal = computed(() => form.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))

function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [t, a, w] = await Promise.all([
      $fetch<Transaction>(`/api/farm-manager/transactions/${id}`),
      $fetch<AccountMaster[]>('/api/farm-manager/accounts'),
      $fetch<Worker[]>('/api/farm-manager/workers'),
    ])
    tx.value = t
    accounts.value = a
    workers.value = w.filter((x) => x.active)
    form.vendorName = t.vendorName
    form.occurredAt = t.occurredAt
    form.paidAt = t.paidAt ?? ''
    form.paymentType = t.paymentType
    form.note = t.note
    form.items = t.items.map((it) => ({
      itemName: it.itemName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      accountCode: it.accountCode,
      costType: it.costType,
      confidenceScore: it.confidenceScore,
      needsConfirmation: it.needsConfirmation,
      isProvisional: it.isProvisional,
      confirmedByUser: it.confirmedByUser,
      workerId: it.workerId,
      reason: it.reason,
    }))
  } catch (e: any) {
    if (e?.statusCode !== 401) loadError.value = true
    tx.value = null
  } finally {
    loading.value = false
  }
}

function addItem() {
  form.items.push({
    itemName: '',
    quantity: null,
    unitPrice: null,
    amount: 0,
    accountCode: PROVISIONAL_VARIABLE,
    costType: 'VARIABLE',
    confidenceScore: 0,
    needsConfirmation: true,
    isProvisional: true,
    confirmedByUser: false,
    workerId: null,
    reason: '手で追加した明細',
  })
}
function removeItem(i: number) {
  form.items.splice(i, 1)
}

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  savedAt.value = false
  try {
    const updated = await $fetch<Transaction>(`/api/farm-manager/transactions/${id}`, {
      method: 'PATCH',
      body: {
        vendorName: form.vendorName,
        occurredAt: form.occurredAt,
        paidAt: form.paidAt || null,
        paymentType: form.paymentType,
        note: form.note,
        items: form.items,
      },
    })
    tx.value = updated
    savedAt.value = true
  } catch (e: any) {
    saveError.value = e?.data?.message || '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('この取引を削除します。よろしいですか？')) return
  try {
    await $fetch(`/api/farm-manager/transactions/${id}`, { method: 'DELETE' })
    await router.push('/farm-manager/list')
  } catch (e: any) {
    saveError.value = e?.data?.message || '削除に失敗しました'
  }
}

watch(isLoggedIn, (v) => { if (v) load() })

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>
