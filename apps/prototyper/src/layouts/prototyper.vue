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
      type: 'image/png',
      href: '/images/prototyper-icon.png'
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
