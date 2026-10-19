<template>
  <div class="min-h-[100dvh] flex flex-col">
    <ManabiHeader>
      <span class="flex-1 min-w-0 truncate mb-display text-[14px] font-bold text-[var(--mb-accent-deep)]">みんなの問題</span>
    </ManabiHeader>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10">
      <p class="text-[13px] text-[var(--mb-ink-soft)] px-1">
        公開された問題です。気になるものを選ぶと、そのまま解けます。
      </p>

      <div class="mt-4 mb-bar">
        <input
          v-model="q"
          type="search"
          enterkeyhint="search"
          placeholder="題名で探す"
          aria-label="題名で探す"
          autocomplete="off"
        />
      </div>

      <div v-if="pending && !items.length" class="mt-16 grid place-items-center">
        <div class="mb-dots" aria-label="読み込み中"><span /><span /><span /></div>
      </div>

      <p v-else-if="error" class="mt-12 text-center text-[13.5px] text-[var(--mb-bad)]">問題の一覧を読み込めませんでした</p>

      <p v-else-if="!shown.length" class="mt-12 text-center text-[14px] text-[var(--mb-ink-soft)]">
        {{ keyword ? '見つかりませんでした' : 'まだ公開された問題はありません' }}
      </p>

      <ul v-else class="mt-5 flex flex-col gap-2.5">
        <li v-for="it in shown" :key="it.id">
          <NuxtLink :to="`/${it.id}`" class="mb-card mb-deepen !items-start">
            <span class="flex-1 min-w-0">
              <span class="flex items-baseline gap-2">
                <span class="min-w-0 text-[15px] font-bold leading-snug">{{ it.title }}</span>
                <span v-if="it.creatorName" class="shrink-0 max-w-[40%] truncate text-[11.5px] text-[var(--mb-ink-faint)]">{{ it.creatorName }}</span>
              </span>
              <span class="mt-1.5 block text-[11.5px] text-[var(--mb-ink-faint)]">
                {{ it.count }}問<template v-if="it.level"> ・ {{ it.level }}</template> ・ {{ dateLabel(it.createdAt) }}
              </span>
            </span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-1 text-[var(--mb-accent)]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </NuxtLink>
        </li>
      </ul>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ManabiListItem } from '~/types/manabi'

definePageMeta({ layout: 'manabi' })
useHead({
  title: 'みんなの問題｜マナビー',
  meta: [
    { name: 'theme-color', content: '#f7f5ef' },
  ],
})

// 公開された問題を全件読み込み、打つたびにその場で絞り込む（空なら全部出す）。
// 一覧は題・テーマ等の表示用の文字だけで問題の中身は含まないので、全件でも軽い
const q = ref('')
const { data, pending, error } = await useFetch<ManabiListItem[]>('/api/sets', {
  key: 'manabi-explore',
  query: { limit: 1000 },
  default: () => [],
})
const items = computed(() => data.value ?? [])

// 全角・半角や大文字小文字の違いで取りこぼさないよう正規化する。空白区切りは AND
const norm = (v: string) => v.normalize('NFKC').toLowerCase()
const keyword = computed(() => q.value.trim())
const shown = computed(() => {
  const words = norm(keyword.value).split(/\s+/).filter(Boolean)
  if (!words.length) return items.value
  return items.value.filter((it) => {
    const hay = norm(`${it.title} ${it.level ?? ''}`)
    return words.every((w) => hay.includes(w))
  })
})

// created_at は D1 では "YYYY-MM-DD HH:MM:SS"（UTC）、dev では ISO8601。どちらも UTC として読む
const dateLabel = (v: string) => {
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' })
}
</script>
