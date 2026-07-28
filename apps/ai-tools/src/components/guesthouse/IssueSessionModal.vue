<template>
  <!-- 宿を選んでお客様の会話URLを発行するモーダル（管理トップから起動）。 -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]"
    @click.self="close"
  >
    <div class="w-full max-w-[480px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
      <div class="flex items-center justify-between mb-1">
        <h2 class="gh-display font-bold text-[17px]">お客様の会話を発行</h2>
        <button class="text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)] text-[22px] leading-none px-1" aria-label="閉じる" @click="close">×</button>
      </div>
      <p class="text-[12px] text-[var(--gh-ink-soft)] leading-relaxed mb-4">
        宿を選び、お客様1人ぶんの会話URLを発行します。予約が確定したお客様にお渡しください（1人＝1リンク＝1会話・日記）。
      </p>

      <template v-if="!issuedToken">
        <label class="gh-dlabel">宿</label>
        <select v-model="houseId" class="gh-input text-[13.5px] mb-3">
          <option value="" disabled>宿を選択してください</option>
          <option v-for="h in houses" :key="h.id" :value="h.id">{{ h.name }}</option>
        </select>

        <label class="gh-dlabel">お客様のお名前（任意・後からでもOK）</label>
        <input v-model="guestName" class="gh-input text-[13.5px] mb-3" placeholder="山田さま など" @keydown.enter.prevent="issue" />

        <p v-if="!houses.length && loaded" class="text-[12.5px] text-[var(--gh-ink-soft)] mb-3">
          先に「宿の情報」から宿を登録してください。
        </p>
        <p v-if="error" class="text-[12.5px] text-[var(--gh-warn)] mb-2">{{ error }}</p>
        <button class="gh-btn w-full" :disabled="issuing || !houseId" @click="issue">
          {{ issuing ? '発行中…' : '会話URLを発行' }}
        </button>
      </template>

      <template v-else>
        <SharePanel :token="issuedToken" />
        <div class="flex gap-2 mt-4">
          <button class="gh-btn-ghost flex-1" @click="reset">続けて別のリンクを発行</button>
          <NuxtLink :to="`/guesthouse/session/${issuedToken}`" class="gh-btn flex-1 inline-flex items-center justify-center">会話を開く</NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SharePanel from '~/components/guesthouse/SharePanel.vue'
import type { HouseSummary, SessionSummary } from '~/types/guesthouse'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'issued'): void }>()

const houses = ref<HouseSummary[]>([])
const loaded = ref(false)
const houseId = ref('')
const guestName = ref('')
const issuing = ref(false)
const issuedToken = ref('')
const error = ref('')

async function loadHouses() {
  try {
    houses.value = await $fetch<HouseSummary[]>('/api/guesthouse/houses')
    if (houses.value.length === 1) houseId.value = houses.value[0].id
  } catch (e: any) {
    error.value = e?.data?.message || '宿の取得に失敗しました。'
  } finally {
    loaded.value = true
  }
}

function reset() {
  issuedToken.value = ''
  guestName.value = ''
  error.value = ''
}

function close() {
  emit('close')
}

async function issue() {
  if (!houseId.value || issuing.value) return
  issuing.value = true
  error.value = ''
  try {
    const s = await $fetch<SessionSummary>(`/api/guesthouse/houses/${houseId.value}/sessions`, {
      method: 'POST',
      body: { guestName: guestName.value || undefined },
    })
    issuedToken.value = s.id
    emit('issued')
  } catch (e: any) {
    error.value = e?.data?.message || 'リンクの発行に失敗しました。'
  } finally {
    issuing.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    reset()
    if (!loaded.value) loadHouses()
    else if (houses.value.length === 1) houseId.value = houses.value[0].id
  }
)
</script>

<style scoped>
.gh-dlabel {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--gh-ink-soft);
  margin-bottom: 0.25rem;
}
</style>
