<template>
  <!-- 見出し横に置く「?」アイコン。クリックで説明をポップアップ表示する（里山トーン共通）。 -->
  <span class="relative inline-flex items-center align-middle">
    <button
      type="button"
      class="inline-grid place-items-center w-[18px] h-[18px] rounded-full border border-[var(--gh-line)] text-[11px] font-bold leading-none text-[var(--gh-ink-soft)] hover:bg-black/[0.04] hover:text-[var(--gh-ink)] transition"
      :aria-label="label"
      :aria-expanded="open"
      @click.stop="open = !open"
    >
      ?
    </button>

    <!-- 外側クリックで閉じるための透明バックドロップ -->
    <span v-if="open" class="fixed inset-0 z-[190]" @click="open = false" />

    <div
      v-if="open"
      role="dialog"
      class="absolute top-full left-0 mt-1.5 w-[min(300px,78vw)] rounded-xl border border-[var(--gh-line)] bg-[var(--gh-card)] shadow-lg px-3.5 py-3 text-[12px] font-normal leading-relaxed text-left text-[var(--gh-ink-soft)] z-[200] gh-rise"
    >
      <slot />
    </div>
  </span>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

withDefaults(defineProps<{ label?: string }>(), { label: '説明を見る' })

const open = ref(false)
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>
