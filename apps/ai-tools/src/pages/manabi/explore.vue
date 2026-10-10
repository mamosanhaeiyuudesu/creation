<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="shrink-0 flex items-center gap-2 px-3 sm:px-5 h-14">
      <NuxtLink to="/manabi" class="mb-icon-btn" aria-label="まなびのトップへ">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </NuxtLink>
      <span class="flex-1 min-w-0 truncate mb-display text-[14px] font-bold text-[var(--mb-accent-deep)]">みんなの問題</span>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-10">
      <p class="text-[13px] text-[var(--mb-ink-soft)] px-1">
        公開された問題です。気になるものを選ぶと、そのまま解けます。
      </p>

      <div class="mt-4 mb-bar">
        <input
          v-model="q"
          type="search"
          enterkeyhint="search"
          placeholder="テーマで探す"
          aria-label="テーマで探す"
          autocomplete="off"
          @keydown.enter="onEnter"
        />
      </div>

      <div v-if="pending && !items.length" class="mt-16 grid place-items-center">
        <div class="mb-dots" aria-label="読み込み中"><span /><span /><span /></div>
      </div>

      <p v-else-if="error" class="mt-12 text-center text-[13.5px] text-[var(--mb-bad)]">問題の一覧を読み込めませんでした</p>

      <p v-else-if="!items.length" class="mt-12 text-center text-[14px] text-[var(--mb-ink-soft)]">
        {{ applied ? '見つかりませんでした' : 'まだ公開された問題はありません' }}
      </p>

      <ul v-else class="mt-5 flex flex-col gap-2.5">
        <li v-for="it in items" :key="it.id">
          <NuxtLink :to="`/manabi/${it.id}`" class="mb-card mb-deepen !items-start">
            <span class="flex-1 min-w-0">
              <span class="block text-[15px] font-bold leading-snug">{{ it.title }}</span>
              <span class="mt-1 block text-[12.5px] leading-relaxed text-[var(--mb-ink-soft)] line-clamp-2">{{ it.theme }}</span>
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
  title: 'みんなの問題｜まなび',
  meta: [
    { name: 'theme-color', content: '#f7f6f1', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#141715', media: '(prefers-color-scheme: dark)' },
  ],
})

// 検索語は Enter で確定したものだけを送る（打つたびに D1 を引かない）
const q = ref('')
const applied = ref('')
const { data, pending, error } = await useFetch<ManabiListItem[]>('/api/manabi/sets', {
  key: 'manabi-explore',
  query: computed(() => ({ limit: 50, q: applied.value })),
  default: () => [],
})
const items = computed(() => data.value ?? [])

const onEnter = (e: KeyboardEvent) => {
  // 日本語入力の変換確定の Enter では検索しない
  if (e.isComposing || e.keyCode === 229) return
  applied.value = q.value.trim()
}

// created_at は D1 では "YYYY-MM-DD HH:MM:SS"（UTC）、dev では ISO8601。どちらも UTC として読む
const dateLabel = (v: string) => {
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' })
}
</script>
