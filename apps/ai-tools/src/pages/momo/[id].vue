<template>
  <div class="max-w-[1100px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/momo" class="text-[13px] text-[var(--momo-ink-soft)] hover:text-[var(--momo-peach-deep)]">‹ 注文一覧</NuxtLink>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--momo-ink-soft)] px-3 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-8 w-40 rounded bg-[var(--momo-paper-2)]/70 animate-pulse" />
      <div class="h-64 rounded-2xl bg-[var(--momo-paper-2)]/70 animate-pulse" />
    </div>

    <p v-else-if="notFound" class="text-center text-[var(--momo-ink-soft)] py-20">注文が見つかりませんでした。</p>

    <template v-else>
      <header class="flex items-center gap-2.5 mb-5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🍑</span>
        <div>
          <h1 class="momo-display text-[20px] sm:text-[24px] font-bold leading-none">{{ form.customerName || '（顧客名なし）' }}</h1>
          <p class="text-[12px] text-[var(--momo-ink-soft)] mt-1">注文の確認・修正</p>
        </div>
      </header>

      <div class="grid lg:grid-cols-2 gap-5 items-start">
        <!-- 左: 会話ログ原文 -->
        <div class="rounded-2xl border border-[var(--momo-line)] bg-[var(--momo-card)] p-4 order-2 lg:order-1">
          <div class="flex items-center justify-between mb-2.5">
            <h2 class="font-bold text-[15px]">会話ログ原文</h2>
            <span v-if="order?.message" class="momo-chip !py-0.5 !px-2 !text-[11px]">{{ sourceLabel(order.message.source) }}</span>
          </div>
          <pre v-if="order?.message?.rawText" class="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-[var(--momo-ink)] bg-[var(--momo-paper-2)]/50 rounded-xl p-3 max-h-[420px] overflow-y-auto">{{ order.message.rawText }}</pre>
          <p v-else class="text-[13px] text-[var(--momo-ink-soft)] py-8 text-center">原文はありません。</p>
        </div>

        <!-- 右: 編集フォーム -->
        <div class="rounded-2xl border border-[var(--momo-line)] bg-[var(--momo-card)] p-4 order-1 lg:order-2">
          <h2 class="font-bold text-[15px] mb-3">注文内容</h2>
          <OrderEditor :form="form" :show-source="true" />

          <div class="flex gap-2 mt-4">
            <button class="momo-btn flex-1" :disabled="saving" @click="save">
              <span v-if="saving" class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin align-middle mr-1.5" />
              保存する
            </button>
            <button class="momo-btn-ghost" :disabled="deleting" @click="remove">削除</button>
          </div>
          <p v-if="savedMsg" class="mt-2 text-[12.5px] text-[#2e7d4f]">{{ savedMsg }}</p>
          <p v-if="errorMsg" class="mt-2 text-[12.5px] text-[#b4223a]">{{ errorMsg }}</p>
        </div>
      </div>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import OrderEditor from '~/components/momo/OrderEditor.vue'
import type { Order, EditorForm, Source } from '~/types/momo'

definePageMeta({ layout: 'momo' })
useHead({ title: '注文の詳細 | momo 桃の注文管理' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const order = ref<Order | null>(null)
const loading = ref(true)
const notFound = ref(false)
const saving = ref(false)
const deleting = ref(false)
const savedMsg = ref('')
const errorMsg = ref('')

const form = reactive<EditorForm>({
  customerName: '',
  deliveryDate: '',
  timeSlot: '',
  status: 'confirmed',
  source: 'LINE',
  items: [],
})

function normalizeSize(raw: string | null): string {
  if (!raw) return ''
  const v = raw.trim().toUpperCase()
  return ['2L', '3L', '4L', '5L'].includes(v) ? v : ''
}

function populate(o: Order) {
  form.customerName = o.customerName
  form.deliveryDate = o.deliveryDate ?? ''
  form.timeSlot = o.timeSlot ?? ''
  form.status = o.status
  form.source = o.message?.source ?? 'LINE'
  form.items = (o.items.length ? o.items : [{ variety: '', size: null, quantity: 1, unit: '箱', ripeness: '', notes: '' }]).map((it) => ({
    variety: it.variety,
    size: normalizeSize(it.size),
    quantity: it.quantity,
    unit: it.unit,
    ripeness: it.ripeness ?? '',
    notes: it.notes,
  }))
}

async function load() {
  loading.value = true
  try {
    const o = await $fetch<Order>(`/api/momo/orders/${id}`)
    order.value = o
    populate(o)
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.response?.status === 404) notFound.value = true
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  savedMsg.value = ''
  errorMsg.value = ''
  try {
    const o = await $fetch<Order>(`/api/momo/orders/${id}`, {
      method: 'PATCH',
      body: {
        customerName: form.customerName,
        deliveryDate: form.deliveryDate || null,
        timeSlot: form.timeSlot || null,
        status: form.status,
        items: form.items,
      },
    })
    order.value = o
    savedMsg.value = '保存しました'
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (deleting.value) return
  if (!confirm('この注文を削除しますか？')) return
  deleting.value = true
  try {
    await $fetch(`/api/momo/orders/${id}`, { method: 'DELETE' })
    await router.push('/momo')
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '削除に失敗しました'
    deleting.value = false
  }
}

function sourceLabel(s: Source): string {
  return s === 'other' ? 'その他' : s
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>
