<template>
  <div class="max-w-[1080px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/ippon" class="text-[13px] text-[var(--ip-ink-soft)] hover:text-[var(--ip-accent-soft)]">‹ 案件一覧</NuxtLink>
      <div class="flex items-center gap-1">
        <button class="text-[13px] text-rose-400/80 px-3 py-1.5 rounded-full hover:bg-rose-500/10" @click="remove">削除</button>
      </div>
    </div>

    <div v-if="pending" class="py-24 text-center text-[var(--ip-ink-soft)] text-[13px]">読み込み中…</div>
    <div v-else-if="!project" class="py-24 text-center text-[var(--ip-ink-soft)] text-[13px]">案件が見つかりません</div>

    <template v-else>
      <header class="mb-5">
        <h1 class="ippon-display text-[22px] sm:text-[26px] font-bold leading-tight">{{ project.title }}</h1>
        <p v-if="project.note" class="text-[12.5px] text-[var(--ip-ink-soft)] mt-1">{{ project.note }}</p>
      </header>

      <div class="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <!-- 3Dビュー -->
        <div class="ip-rise">
          <ModelViewer :src="version.modelUrl" :alt="project.title" height="480px" />
          <div class="flex flex-wrap gap-2 mt-3">
            <button class="ip-btn-ghost" @click="download">GLBをダウンロード</button>
            <a :href="version.sketchUrl" :download="`${project.title}-sketch.jpg`" class="ip-btn-ghost grid place-items-center">元スケッチ</a>
            <span class="ip-btn-ghost grid place-items-center !cursor-default">生成: {{ version.provider }}</span>
          </div>
        </div>

        <!-- 情報 + 共有 -->
        <div class="space-y-4 ip-rise">
          <!-- 共有リンク（主力機能）-->
          <div class="ip-card p-4">
            <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] tracking-wide mb-2">共有リンク（ログイン不要で開けます）</p>
            <div class="flex gap-2">
              <input :value="shareUrl" readonly class="ip-input text-[12px] font-mono" @focus="selectAll" />
              <button class="ip-btn shrink-0" @click="copyShare">{{ copied ? 'コピー済' : 'コピー' }}</button>
            </div>
            <a :href="shareUrl" target="_blank" class="inline-block mt-2 text-[12px] text-[var(--ip-accent-soft)] hover:underline">別タブで開いて確認 →</a>
          </div>

          <!-- 読み取り結果 -->
          <div class="ip-card p-4">
            <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] tracking-wide mb-2">読み取り結果</p>
            <p v-if="it.summary" class="text-[13px] mb-3 leading-relaxed">{{ it.summary }}</p>
            <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
              <div class="col-span-2 flex justify-between"><dt class="text-[var(--ip-ink-faint)]">種別</dt><dd>{{ it.category || '—' }}</dd></div>
              <div class="flex justify-between"><dt class="text-[var(--ip-ink-faint)]">幅</dt><dd>{{ mm(it.width_mm) }}</dd></div>
              <div class="flex justify-between"><dt class="text-[var(--ip-ink-faint)]">奥行</dt><dd>{{ mm(it.depth_mm) }}</dd></div>
              <div class="flex justify-between"><dt class="text-[var(--ip-ink-faint)]">高さ</dt><dd>{{ mm(it.height_mm) }}</dd></div>
              <div class="flex justify-between"><dt class="text-[var(--ip-ink-faint)]">棚段数</dt><dd>{{ it.shelves ?? '—' }}</dd></div>
              <div class="col-span-2 flex justify-between"><dt class="text-[var(--ip-ink-faint)]">材質</dt><dd class="text-right">{{ it.material || '—' }}</dd></div>
            </dl>
          </div>

          <!-- メッセージを反映した点 -->
          <div v-if="it.applied_requests?.length" class="rounded-2xl border border-[var(--ip-accent)] bg-[color-mix(in_srgb,var(--ip-accent)_12%,transparent)] p-4">
            <p class="text-[12px] font-bold text-[var(--ip-accent-soft)] mb-1.5">メッセージを反映した点</p>
            <ul class="space-y-1">
              <li v-for="(c, i) in it.applied_requests" :key="i" class="text-[12.5px] leading-relaxed flex gap-1.5">
                <span class="text-[var(--ip-accent-soft)] shrink-0">✓</span><span>{{ c }}</span>
              </li>
            </ul>
          </div>

          <!-- AIが補った点 -->
          <div v-if="it.completions?.length" class="rounded-2xl border border-[var(--ip-line)] bg-[color-mix(in_srgb,var(--ip-amber)_10%,transparent)] p-4">
            <p class="text-[12px] font-bold text-[var(--ip-amber)] mb-1.5">AIが補った点</p>
            <ul class="space-y-1">
              <li v-for="(c, i) in it.completions" :key="i" class="text-[12.5px] leading-relaxed flex gap-1.5">
                <span class="text-[var(--ip-amber)] shrink-0">・</span><span>{{ c }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import ModelViewer from '~/components/ippon/ModelViewer.vue'
import type { Project } from '~/types/ippon'

definePageMeta({ layout: 'ippon' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data: project, pending } = await useFetch<Project>(`/api/ippon/projects/${id}`, { key: `ippon-${id}` })
useHead(() => ({ title: `${project.value?.title ?? '案件'} | ippon` }))

// MVP は最新（＝末尾）のバージョンを表示する。
const version = computed(() => project.value!.versions[project.value!.versions.length - 1])
const it = computed(() => version.value.interpretation)

// window は SSR で未定義のため onMounted で埋める（computed を SSR 中に評価しても落ちないように）。
const origin = ref('')
onMounted(() => { origin.value = window.location.origin })
const shareUrl = computed(() =>
  project.value ? `${origin.value}/ippon/view/${project.value.shareToken}` : ''
)
const copied = ref(false)

function mm(v: number | null): string {
  return v ? `${v.toLocaleString()} mm` : '—'
}

function selectAll(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
}

async function copyShare() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* noop */
  }
}

function download() {
  const a = document.createElement('a')
  a.href = version.value.modelUrl
  a.download = `${project.value!.title || 'model'}.glb`
  a.click()
}

async function remove() {
  if (!confirm('この案件を削除します。よろしいですか？')) return
  await $fetch(`/api/ippon/projects/${id}`, { method: 'DELETE' })
  await router.push('/ippon')
}
</script>
