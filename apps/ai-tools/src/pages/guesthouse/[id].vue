<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 宿一覧</NuxtLink>
      <button v-if="house" class="text-[12.5px] text-[var(--gh-ink-faint)] hover:text-[var(--gh-warn)]" @click="remove">この宿を削除</button>
    </div>

    <div v-if="loading" class="py-24 text-center text-[var(--gh-ink-soft)] text-[13px]">読み込み中…</div>
    <div v-else-if="!house" class="py-24 text-center text-[var(--gh-ink-soft)] text-[14px]">宿が見つかりませんでした。</div>

    <template v-else>
      <h1 class="gh-display text-[22px] font-bold mb-5">宿の編集</h1>

      <HouseForm v-model="form" />

      <div v-if="errorMsg" class="mt-4 text-[13px] text-[var(--gh-warn)]">{{ errorMsg }}</div>

      <div class="flex gap-2 mt-6 mb-8">
        <button class="gh-btn flex-1" :disabled="saving || !form.name.trim()" @click="save">
          {{ saving ? '保存中…' : saved ? '保存しました' : '保存する' }}
        </button>
      </div>

      <SharePanel :share-token="house.shareToken" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HouseForm from '~/components/guesthouse/HouseForm.vue'
import SharePanel from '~/components/guesthouse/SharePanel.vue'
import type { House, HouseInput } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })

const route = useRoute()
const id = route.params.id as string

const house = ref<House | null>(null)
const form = ref<HouseInput>({ name: '', welcome: '', facts: [] })
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const errorMsg = ref('')

useHead(() => ({ title: `${house.value?.name ?? '宿'} | ゲストハウス案内` }))

async function load() {
  loading.value = true
  try {
    const h = await $fetch<House>(`/api/guesthouse/houses/${id}`)
    house.value = h
    form.value = {
      name: h.name,
      welcome: h.welcome,
      facts: h.facts.map((f) => ({ category: f.category, title: f.title, body: f.body })),
    }
  } catch {
    house.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  saved.value = false
  errorMsg.value = ''
  try {
    const h = await $fetch<House>(`/api/guesthouse/houses/${id}`, { method: 'PUT', body: form.value })
    house.value = h
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('この宿と案内情報を削除します。よろしいですか？')) return
  try {
    await $fetch(`/api/guesthouse/houses/${id}`, { method: 'DELETE' })
    await navigateTo('/guesthouse')
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '削除に失敗しました。'
  }
}

onMounted(load)
</script>
