<template>
  <div class="max-w-[900px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div v-if="pending" class="py-24 text-center text-[var(--ip-ink-soft)] text-[13px]">読み込み中…</div>
    <div v-else-if="!project" class="py-24 text-center">
      <p class="text-[15px] font-bold mb-1">リンクが無効です</p>
      <p class="text-[13px] text-[var(--ip-ink-soft)]">この共有リンクは削除されたか、期限切れの可能性があります。</p>
    </div>

    <template v-else>
      <header class="mb-4">
        <p class="text-[11px] text-[var(--ip-ink-faint)] tracking-wide mb-1">ippon · イメージ提案</p>
        <h1 class="ippon-display text-[22px] sm:text-[26px] font-bold leading-tight">{{ project.title }}</h1>
        <p v-if="project.note" class="text-[12.5px] text-[var(--ip-ink-soft)] mt-1">{{ project.note }}</p>
      </header>

      <ModelViewer :src="version.modelUrl" :alt="project.title" height="min(70vh, 560px)" />

      <p class="text-center text-[12px] text-[var(--ip-ink-soft)] mt-3 leading-relaxed">
        ドラッグで回転・ピンチでズームできます。<br class="sm:hidden" />
        これは完成イメージ図です（寸法は目安、製作精度は保証しません）。
      </p>

      <div v-if="it.completions?.length" class="mt-5 rounded-2xl border border-[var(--ip-line)] bg-white/[0.03] p-4">
        <p class="text-[12px] font-bold text-[var(--ip-ink-soft)] mb-1.5">この提案でAIが補った点</p>
        <ul class="space-y-1">
          <li v-for="(c, i) in it.completions" :key="i" class="text-[12.5px] leading-relaxed flex gap-1.5">
            <span class="text-[var(--ip-accent-soft)] shrink-0">・</span><span>{{ c }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ModelViewer from '~/components/ippon/ModelViewer.vue'
import type { Project } from '~/types/ippon'

// 共有リンク先。ログイン不要で誰でも閲覧できる（仕様§4.4）。
definePageMeta({ layout: 'ippon' })

const route = useRoute()
const token = route.params.token as string

const { data: project, pending } = await useFetch<Project>(`/api/ippon/share/${token}`, { key: `ippon-share-${token}` })
useHead(() => ({ title: `${project.value?.title ?? 'イメージ提案'} | ippon` }))

const version = computed(() => project.value!.versions[project.value!.versions.length - 1])
const it = computed(() => version.value.interpretation)
</script>
