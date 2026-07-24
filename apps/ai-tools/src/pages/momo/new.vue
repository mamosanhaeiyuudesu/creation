<template>
  <div class="max-w-[1100px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/momo" class="text-[13px] text-[var(--momo-ink-soft)] hover:text-[var(--momo-peach-deep)]">‹ 注文一覧</NuxtLink>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--momo-ink-soft)] px-3 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
    </div>

    <header class="flex items-center gap-2.5 mb-5">
      <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🍑</span>
      <div>
        <h1 class="momo-display text-[22px] sm:text-[26px] font-bold leading-none">注文を追加</h1>
        <p class="text-[12px] text-[var(--momo-ink-soft)] mt-1">会話を貼り付けて、AIの下書きを確認・修正して保存します</p>
      </div>
    </header>

    <div class="grid lg:grid-cols-2 gap-5 items-start">
      <!-- 左: 会話ログ -->
      <div class="rounded-2xl border border-[var(--momo-line)] bg-[var(--momo-card)] p-4">
        <div class="flex items-center justify-between mb-2.5">
          <h2 class="font-bold text-[15px]">会話ログ</h2>
          <div class="flex gap-1.5">
            <button
              v-for="s in SOURCES"
              :key="s.value"
              class="momo-chip"
              :class="{ 'momo-chip--on': source === s.value }"
              @click="source = s.value"
            >{{ s.label }}</button>
          </div>
        </div>
        <textarea
          v-model="rawText"
          rows="14"
          class="momo-input !rounded-xl resize-y font-mono text-[13px] leading-relaxed"
          placeholder="SNSの会話をそのまま貼り付けてください。&#10;例:&#10;「7月24日に桃を2箱ほしいです」&#10;「24日はいっぱいなので25日でお願いできますか」&#10;「大丈夫です。固めがいいです」"
        />
        <button class="momo-btn w-full mt-3" :disabled="extracting || !rawText.trim()" @click="extract">
          <span v-if="extracting" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
          {{ extracting ? 'AIが読み取り中…' : 'AIで注文情報を抽出' }}
        </button>
        <p v-if="errorMsg" class="mt-2 text-[12.5px] text-[#b4223a]">{{ errorMsg }}</p>
      </div>

      <!-- 右: 抽出結果フォーム -->
      <div class="rounded-2xl border border-[var(--momo-line)] bg-[var(--momo-card)] p-4">
        <h2 class="font-bold text-[15px] mb-3">抽出結果（確認・修正）</h2>

        <div v-if="!extracted" class="text-center text-[var(--momo-ink-soft)] py-16 text-[13px]">
          左に会話を貼り付けて「抽出」を押すと、ここに下書きが表示されます。
        </div>

        <template v-else>
          <OrderEditor :form="form" :confidence="confidence" :ambiguities="ambiguities" :show-source="false" />

          <div class="mt-4 rounded-xl bg-[var(--momo-paper-2)]/60 border border-[var(--momo-line)] p-2.5 text-[11.5px] text-[var(--momo-ink-soft)] leading-relaxed">
            ⚠️ AIは下書きを作るだけです。誤発送を防ぐため、内容を必ず目で確認してから保存してください。
          </div>

          <div class="flex gap-2 mt-4">
            <button class="momo-btn flex-1" :disabled="saving" @click="save">
              <span v-if="saving" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
              保存する
            </button>
          </div>
        </template>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import OrderEditor from '~/components/momo/OrderEditor.vue'
import type { Extraction, EditorForm, Source, Confidence } from '~/types/momo'

definePageMeta({ layout: 'momo' })
useHead({ title: '注文を追加 | momo 桃の注文管理' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const router = useRouter()

const SOURCES: { value: Source; label: string }[] = [
  { value: 'LINE', label: 'LINE' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'other', label: 'その他' },
]

const rawText = ref('')
const source = ref<Source>('LINE')
const extracting = ref(false)
const extracted = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const confidence = ref<Record<string, Confidence>>({})
const ambiguities = ref<string[]>([])

const form = reactive<EditorForm>({
  customerName: '',
  deliveryDate: '',
  timeSlot: '',
  status: 'confirmed',
  source: 'LINE',
  items: [{ variety: '', size: '', quantity: 1, unit: '箱', ripeness: '', notes: '' }],
})

function todayJst(): string {
  // sv-SE ロケールは YYYY-MM-DD 形式。JSTの当日を基準日にする。
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

function normalizeSize(raw: string | null): string {
  if (!raw) return ''
  const v = raw.trim().toUpperCase().replace('Ｌ', 'L')
  return ['2L', '3L', '4L', '5L'].includes(v) ? v : ''
}

function applyExtraction(ex: Extraction) {
  form.customerName = ex.customer_name ?? ''
  form.deliveryDate = ex.delivery_date && /^\d{4}-\d{2}-\d{2}$/.test(ex.delivery_date) ? ex.delivery_date : ''
  form.timeSlot = ['午前', '午後', '夕方', '夜'].includes(ex.delivery_time_slot ?? '') ? ex.delivery_time_slot! : ''
  form.status = 'confirmed'
  form.source = source.value
  const items = ex.items?.length ? ex.items : [{}]
  form.items = items.map((it: any) => ({
    variety: it?.variety ?? '',
    size: normalizeSize(it?.size ?? null),
    quantity: it?.quantity && it.quantity > 0 ? Math.round(it.quantity) : 1,
    unit: it?.unit ?? '箱',
    ripeness: it?.ripeness ?? '',
    notes: it?.notes ?? '',
  }))
  confidence.value = ex.confidence ?? {}
  ambiguities.value = Array.isArray(ex.ambiguities) ? ex.ambiguities : []
}

async function extract() {
  if (extracting.value || !rawText.value.trim()) return
  extracting.value = true
  errorMsg.value = ''
  try {
    const ex = await $fetch<Extraction>('/api/momo/extract', {
      method: 'POST',
      body: { rawText: rawText.value, referenceDate: todayJst() },
    })
    applyExtraction(ex)
    extracted.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'AI抽出に失敗しました'
  } finally {
    extracting.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const order = await $fetch<{ id: string }>('/api/momo/orders', {
      method: 'POST',
      body: {
        customerName: form.customerName,
        deliveryDate: form.deliveryDate || null,
        timeSlot: form.timeSlot || null,
        status: form.status,
        items: form.items,
        message: { rawText: rawText.value, source: source.value },
      },
    })
    await router.push(`/momo/${order.id}`)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(checkAuth)
</script>
