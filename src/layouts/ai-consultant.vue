<template>
  <div class="ai-consultant-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>`
    }
  ]
})
</script>

<style>
/* Vuetify のグローバルスタイルをリセット */
.ai-consultant-layout,
.ai-consultant-layout ~ * {
  all: initial;
}

body:has(.ai-consultant-layout) {
  background: initial !important;
  color: initial !important;
  font-family: initial !important;
}

.v-application:has(.ai-consultant-layout) {
  background: transparent !important;
}
</style>
