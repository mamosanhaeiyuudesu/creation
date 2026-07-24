<template>
  <div class="max-w-[1080px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-5">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl">📐</span>
        <div>
          <h1 class="ippon-display text-[22px] sm:text-[26px] font-bold leading-none">ippon</h1>
          <p class="text-[12px] text-[var(--ip-ink-soft)] mt-1">スケッチ → 顧客に見せる3Dイメージ</p>
        </div>
      </div>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--ip-ink-soft)] px-3 py-1.5 rounded-full hover:bg-white/[0.05]" @click="doLogout">ログアウト</button>
    </div>

    <NuxtLink to="/ippon/new" class="block ip-card p-5 mb-6 hover:border-[var(--ip-accent)] transition-colors group">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--ip-accent)_18%,transparent)] border border-[var(--ip-line)] group-hover:border-[var(--ip-accent)] transition-colors">
          <span class="text-xl text-[var(--ip-accent-soft)]">＋</span>
        </div>
        <div>
          <p class="text-[15px] font-bold">新しいスケッチから作る</p>
          <p class="text-[12px] text-[var(--ip-ink-soft)]">撮って送るだけ。1〜2分で3Dビュー。</p>
        </div>
      </div>
    </NuxtLink>

    <div v-if="isLoggedIn">
      <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] tracking-wide mb-3">案件一覧</p>

      <div v-if="pending" class="py-16 text-center text-[var(--ip-ink-soft)] text-[13px]">読み込み中…</div>
      <div v-else-if="!projects?.length" class="ip-card py-16 text-center text-[var(--ip-ink-soft)] text-[13px]">
        まだ案件がありません。上のボタンから作ってみてください。
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <NuxtLink
          v-for="p in projects"
          :key="p.id"
          :to="`/ippon/${p.id}`"
          class="ip-card overflow-hidden hover:border-[var(--ip-accent)] transition-colors ip-rise"
        >
          <div class="aspect-[4/3] bg-black/30 grid place-items-center overflow-hidden">
            <img v-if="p.thumbSketchUrl" :src="p.thumbSketchUrl" alt="" class="w-full h-full object-cover" />
            <span v-else class="text-[var(--ip-ink-faint)] text-2xl">📐</span>
          </div>
          <div class="p-3">
            <p class="text-[13px] font-bold leading-snug line-clamp-2">{{ p.title }}</p>
            <div class="flex items-center justify-between mt-1.5 text-[11px] text-[var(--ip-ink-faint)]">
              <span>{{ styleLabel(p.style) }}</span>
              <span>{{ fmtDate(p.updatedAt) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { STYLE_PRESETS } from '~/types/ippon'
import type { ProjectSummary, StylePreset } from '~/types/ippon'

definePageMeta({ layout: 'ippon' })
useHead({ title: 'ippon — スケッチから3D' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const { data: projects, pending, refresh } = await useFetch<ProjectSummary[]>('/api/ippon/projects', {
  key: 'ippon-projects',
  immediate: false,
  default: () => [],
})

// ログイン確定後に一覧を取得する（未ログインだと401になるため）。
watch(isLoggedIn, (v) => { if (v) refresh() })

function styleLabel(s: StylePreset): string {
  return STYLE_PRESETS.find((x) => x.value === s)?.label ?? s
}
function fmtDate(iso: string): string {
  return iso ? iso.slice(0, 10).replace(/-/g, '/') : ''
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) refresh()
})
</script>
