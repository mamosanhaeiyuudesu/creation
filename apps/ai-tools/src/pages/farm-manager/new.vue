<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-6 pt-5 pb-28">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/farm-manager" class="text-[13px] text-[var(--fm-ink-soft)] hover:text-[var(--fm-in-deep)] no-underline">‹ 経営の画面</NuxtLink>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--fm-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
    </div>

    <header class="flex items-center gap-2.5 mb-4">
      <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">📷</span>
      <div>
        <h1 class="text-[21px] font-bold leading-none">納品書を読み取る</h1>
        <p class="text-[12px] text-[var(--fm-ink-soft)] mt-1">撮って、確かめて、保存。分からない項目は後回しでかまいません</p>
      </div>
    </header>

    <!-- ① 撮る。初回から3タップ以内で1枚目を仕訳できるよう、最初の画面はこのボタンだけ（仕様§8） -->
    <div v-if="!image" class="fm-card p-6 text-center">
      <p class="text-[14px] mb-1 font-bold">納品書・レシートを撮ってください</p>
      <p class="text-[12px] text-[var(--fm-ink-soft)] mb-5">掛け（ツケ）の納品書もそのまま読み取れます</p>

      <label class="fm-btn inline-flex items-center gap-2 cursor-pointer !h-14 !px-7 !text-[16px]">
        <span style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">📷</span>
        カメラで撮る
        <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPick" />
      </label>
      <div class="mt-3">
        <label class="text-[13px] text-[var(--fm-ink-soft)] underline cursor-pointer">
          スキャン済みの画像を選ぶ
          <input type="file" accept="image/*" class="hidden" @change="onPick" />
        </label>
      </div>
      <p v-if="errorMsg" class="mt-4 text-[13px] text-[var(--fm-minus)]">{{ errorMsg }}</p>
    </div>

    <!-- ② 読み取り中 / 確認 -->
    <template v-else>
      <div class="fm-card p-3 mb-3 flex gap-3 items-start">
        <img :src="image" alt="読み取った伝票" class="w-24 h-32 object-cover rounded-lg border border-[var(--fm-line)]" />
        <div class="flex-1 min-w-0">
          <p v-if="extraction?.document_type" class="fm-tag fm-tag--in mb-1.5">{{ extraction.document_type }}</p>
          <p class="text-[13px] text-[var(--fm-ink-soft)] mb-2">{{ extracting ? 'AIが読んでいます…' : '写真の内容を確認してください' }}</p>
          <div class="flex gap-2">
            <label class="fm-btn-ghost !h-8 !text-[12px] inline-flex items-center cursor-pointer">
              撮り直す
              <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPick" />
            </label>
            <button v-if="!extracting && extraction" class="fm-btn-ghost !h-8 !text-[12px]" @click="runExtract">もう一度読み取る</button>
          </div>
        </div>
      </div>

      <div v-if="extracting" class="fm-card p-8 text-center">
        <div class="inline-block w-8 h-8 rounded-full border-[3px] border-[var(--fm-in-soft)] border-t-[var(--fm-in)] animate-spin" />
        <p class="text-[14px] mt-3">品目を読み取って、畑の中／畑の外に振り分けています…</p>
      </div>

      <p v-else-if="errorMsg" class="fm-card p-5 text-center text-[14px] text-[var(--fm-minus)]">
        {{ errorMsg }}
        <button class="fm-btn mt-3 block mx-auto" @click="runExtract">もう一度試す</button>
      </p>

      <template v-else-if="extraction">
        <!-- 読み取れなかった点。止めずに、気づけるようにだけする -->
        <ul v-if="extraction.warnings.length" class="mb-3 rounded-xl border border-[var(--fm-warn)] bg-[#fffbef] px-4 py-3 space-y-1">
          <li v-for="(w, i) in extraction.warnings" :key="i" class="text-[12.5px] text-[#96620b] leading-relaxed">・{{ w }}</li>
        </ul>

        <!-- 伝票の基本情報。発生日と支払日を分けて持つのが掛け払い対応の肝（仕様§4-2） -->
        <div class="fm-card p-4 mb-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="fm-label">取引先</label>
              <input v-model="form.vendorName" class="fm-input" placeholder="◯◯農機店" />
            </div>
            <div>
              <label class="fm-label">発生日（納品日）</label>
              <input v-model="form.occurredAt" type="date" class="fm-input" :class="{ 'fm-input--warn': !form.occurredAt }" />
              <p class="text-[11px] text-[var(--fm-ink-soft)] mt-1">集計はこの日付で行います</p>
            </div>
            <div>
              <label class="fm-label">支払日</label>
              <input v-model="form.paidAt" type="date" class="fm-input" />
              <p class="text-[11px] text-[var(--fm-ink-soft)] mt-1">後日精算なら空のままで</p>
            </div>
            <div class="col-span-2">
              <label class="fm-label">支払い方</label>
              <div class="flex gap-1.5">
                <button class="fm-chip" :class="{ 'fm-chip--on': form.paymentType === 'CREDIT' }" @click="form.paymentType = 'CREDIT'">掛け（ツケ）</button>
                <button class="fm-chip" :class="{ 'fm-chip--on': form.paymentType === 'CASH' }" @click="form.paymentType = 'CASH'">その場で支払い</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 明細 -->
        <div class="flex items-center justify-between mb-2 px-1">
          <h2 class="text-[15px] font-bold">明細（{{ form.items.length }}件）</h2>
          <p class="fm-num text-[15px] font-bold">{{ formatYen(itemTotal) }}</p>
        </div>
        <FmItemRows :items="form.items" :accounts="accounts" :workers="workers" @add="addItem" @remove="removeItem" />

        <div class="rounded-xl bg-[var(--fm-paper-2)]/70 border border-[var(--fm-line)] p-3 my-4 text-[12px] text-[var(--fm-ink-soft)] leading-relaxed">
          分からない項目は「あとで決める」で仮置きしたまま保存できます。分類を決めないと保存できない、という作りにはしていません。
        </div>

        <button class="fm-btn w-full !h-13 !text-[16px]" :disabled="saving" @click="save">
          <span v-if="saving" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
          保存する
        </button>
        <p v-if="saveError" class="mt-2 text-[13px] text-[var(--fm-minus)] text-center">{{ saveError }}</p>
      </template>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useFarmManagerImage } from '~/composables/useFarmManagerImage'
import AuthModal from '~/components/AuthModal.vue'
import FmItemRows from '~/components/farm-manager/FmItemRows.vue'
import { PROVISIONAL_VARIABLE } from '~/types/farm-manager'
import type { AccountMaster, EditableItem, Extraction, PaymentType, Transaction, Worker } from '~/types/farm-manager'

definePageMeta({ layout: 'farm-manager' })
useHead({ title: '納品書を読み取る | farm-manager' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const router = useRouter()
const { fileToDataUrl } = useFarmManagerImage()

const image = ref('')
const extracting = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const saveError = ref('')
const extraction = ref<Extraction | null>(null)
const accounts = ref<AccountMaster[]>([])
const workers = ref<Worker[]>([])

const form = reactive<{ vendorName: string; occurredAt: string; paidAt: string; paymentType: PaymentType; items: EditableItem[] }>({
  vendorName: '',
  occurredAt: '',
  paidAt: '',
  paymentType: 'CREDIT',
  items: [],
})

const itemTotal = computed(() => form.items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))

function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMsg.value = ''
  try {
    image.value = await fileToDataUrl(file)
    extraction.value = null
    await runExtract()
  } catch (err: any) {
    errorMsg.value = err?.message || '画像を読み込めませんでした'
  } finally {
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function runExtract() {
  if (!image.value || extracting.value) return
  extracting.value = true
  errorMsg.value = ''
  try {
    const ex = await $fetch<Extraction>('/api/farm-manager/extract', {
      method: 'POST',
      body: { image: image.value, referenceDate: todayJst() },
    })
    extraction.value = ex
    form.vendorName = ex.vendor_name
    form.occurredAt = ex.occurred_at ?? todayJst()
    form.paidAt = ex.paid_at ?? ''
    form.paymentType = ex.payment_type
    form.items = ex.items.map((it) => ({
      itemName: it.item_name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      amount: it.amount,
      accountCode: it.account_code,
      costType: it.cost_type,
      confidenceScore: it.confidence,
      needsConfirmation: it.needs_confirmation,
      isProvisional: it.is_provisional,
      // 学習ルールが当たったものは人が前に確定した分類なので、確認済みとして扱う
      confirmedByUser: it.matched_rule,
      workerId: null,
      reason: it.reason,
    }))
    if (!form.items.length) addItem()
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '読み取りに失敗しました'
  } finally {
    extracting.value = false
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
  try {
    const tx = await $fetch<Transaction>('/api/farm-manager/transactions', {
      method: 'POST',
      body: {
        imageUrl: image.value,
        vendorName: form.vendorName,
        occurredAt: form.occurredAt || todayJst(),
        paidAt: form.paidAt || null,
        paymentType: form.paymentType,
        items: form.items,
      },
    })
    await router.push(`/farm-manager/${tx.id}`)
  } catch (e: any) {
    saveError.value = e?.data?.message || '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

async function loadMasters() {
  try {
    const [a, w] = await Promise.all([
      $fetch<AccountMaster[]>('/api/farm-manager/accounts'),
      $fetch<Worker[]>('/api/farm-manager/workers'),
    ])
    accounts.value = a
    workers.value = w.filter((x) => x.active)
  } catch { /* 未ログインならモーダルが出る */ }
}

watch(isLoggedIn, (v) => { if (v) loadMasters() })

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  await loadMasters()
})
</script>
