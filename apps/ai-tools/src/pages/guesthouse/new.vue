<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center gap-2 mb-4">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 宿一覧</NuxtLink>
    </div>
    <h1 class="gh-display text-[22px] font-bold mb-5">宿を追加</h1>

    <HouseForm v-model="form" />

    <div v-if="errorMsg" class="mt-4 text-[13px] text-[var(--gh-warn)]">{{ errorMsg }}</div>

    <div class="flex gap-2 mt-6">
      <NuxtLink to="/guesthouse" class="gh-btn-ghost flex-1 inline-flex items-center justify-center">キャンセル</NuxtLink>
      <button class="gh-btn flex-1" :disabled="saving || !form.name.trim()" @click="save">
        {{ saving ? '保存中…' : '保存して共有リンクを作る' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import HouseForm from '~/components/guesthouse/HouseForm.vue'
import type { House, HouseInput } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '宿を追加 | ゲストハウス案内' })

const form = ref<HouseInput>({ name: '', welcome: '', facts: [] })
const saving = ref(false)
const errorMsg = ref('')

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  errorMsg.value = ''
  try {
    const house = await $fetch<House>('/api/guesthouse/houses', { method: 'POST', body: form.value })
    await navigateTo(`/guesthouse/${house.id}`)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}
</script>
