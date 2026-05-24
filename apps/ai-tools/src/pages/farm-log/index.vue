<script setup lang="ts">
import type { FarmLogData, FarmLogSession } from '~/types/farm-log'

definePageMeta({ ssr: false, layout: 'farm-log' })
useHead({ title: '農作業ログ' })

const sessions = ref<FarmLogSession[]>([])
const selectedLabel = ref<string>('')
const data = ref<FarmLogData | null>(null)
const loading = ref(true)
const highlightT = ref<number | null>(null)

async function loadSessions() {
  const index = await $fetch<FarmLogSession[]>('/data/farm-log/index.json')
  sessions.value = index
  if (index.length > 0) {
    selectedLabel.value = index[0].label
    await loadSession(index[0].label)
  }
  loading.value = false
}

async function loadSession(label: string) {
  loading.value = true
  selectedLabel.value = label
  data.value = await $fetch<FarmLogData>(`/data/farm-log/${label}.json`)
  loading.value = false
}

onMounted(() => loadSessions())
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <!-- Header -->
    <header class="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
      <span class="text-lg font-semibold">🌿 農作業ログ</span>
      <div class="ml-auto">
        <FarmLogSessionPicker
          v-if="sessions.length > 0"
          :sessions="sessions"
          :selected-label="selectedLabel"
          @select="loadSession"
        />
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-64 text-gray-500">
      読み込み中...
    </div>

    <!-- Content -->
    <div v-else-if="data" class="p-4 max-w-6xl mx-auto space-y-4">
      <!-- Activity label -->
      <div v-if="data.meta.activity" class="flex items-center gap-2">
        <span class="text-xs bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded-full font-medium">
          {{ data.meta.activity }}
        </span>
      </div>

      <!-- Activity bar -->
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="text-xs text-gray-500 mb-2">活動内訳</div>
        <FarmLogActivityBar :meta="data.meta" />
      </div>

      <!-- Map + Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-gray-900 rounded-xl p-2">
          <ClientOnly>
            <FarmLogMap
              :track="data.track"
              :bounding-box="data.meta.boundingBox"
              :highlight-t="highlightT"
            />
            <template #fallback>
              <div class="h-96 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
                地図を読み込み中...
              </div>
            </template>
          </ClientOnly>
        </div>
        <div class="bg-gray-900 rounded-xl p-4">
          <div class="text-xs text-gray-500 mb-3">サマリー</div>
          <FarmLogStatsGrid :data="data" />
        </div>
      </div>

      <!-- Timeline -->
      <div class="bg-gray-900 rounded-xl p-4">
        <FarmLogTimeline
          :data="data"
          :highlight-t="highlightT"
          @hover-time="(t) => highlightT = t"
        />
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-gray-500">
      データが見つかりません
    </div>
  </div>
</template>
